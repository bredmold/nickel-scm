#!/usr/bin/env node

import * as program from 'commander';
import * as vm from 'vm';
import {ConfigContext} from "./config-context";
import * as fs from "fs";
import {NickelInstigator} from "./nickel-instigator";
import {
  BUILD_ACTION,
  CLEANUP_ACTION,
  GUIDED_BRANCH_REMOVAL_ACTION,
  MERGED_BRANCHES_REPORT_ACTION,
  REPORT_ACTION,
  SYNC_ACTION
} from "./actions/nickel-action";
import * as winston from "winston";

const pkg = require('../package.json');

const ALL_ACTIONS = [
  SYNC_ACTION,
  REPORT_ACTION,
  BUILD_ACTION,
  CLEANUP_ACTION,
  MERGED_BRANCHES_REPORT_ACTION,
  GUIDED_BRANCH_REMOVAL_ACTION,
];

/*
Global controls
 command          - the selected command
 commandArgs      - command arguments
 actions          - list of actions to perform on this run
 configScript     - Location of the configuration script
 selectedProjects - List of projects to select
 */
let command: string = '';
let commandArgs: any = null;
let configScript: string = `${process.env['HOME']}/nickel.js`;
let selectedProjects: string[] = [];

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
  ],
});

/*
Command-line parsing
 */
program
  .description('nickel-scm: Manage local Git repositories')
  .version(pkg.version)
  .option('--config <config>', 'Configuration file')
  .option('--projects <projects>', 'List of projects')
  .option('--level <level>', 'Log level')
  .on('option:level', () => logger.level = program.level)
  .on('option:config', () => configScript = program.config)
  .on('option:projects', () => selectedProjects = program.projects.replace(/\s+/, '').split(','));

ALL_ACTIONS.forEach(nickelAction => {
  program.command(nickelAction.command)
    .action(args => {
      command = nickelAction.command;
      commandArgs = args;
    })
    .description(nickelAction.description);
});

program.parse(process.argv);

logger.info(`Log level is ${logger.level}`);

if (command === '') {
  logger.error('No actions were specified');
  process.exit(1);
}

/*
Parse the configuration file
 */

const configScriptBytes = fs.readFileSync(configScript, {encoding: 'utf-8'});
if (!configScriptBytes) {
  logger.warn(`Unable to read config script at ${configScript}`);
}

let configContext = new ConfigContext();
vm.createContext(configContext);
vm.runInContext(configScriptBytes, configContext);

/*
Initialize the project list
 */

const projects = ConfigContext.projects;
const separators = ConfigContext.separators;

if (selectedProjects.length > 0) {
  selectedProjects.forEach(selected => {
    const idx = projects.findIndex(p => p.name === selected);
    if (idx < 0) {
      logger.error(`No such project: ${selected}`);
      process.exit(1);
    }
  });
} else {
  // If no projects are selected, then implicitly, all projects are selected
  selectedProjects = projects.map(p => p.name);
}

const action = ALL_ACTIONS.find(nickelAction => nickelAction.command === command);
if (action === undefined) {
  logger.error('this never happens');
} else {
  const instigator = new NickelInstigator(projects, separators, selectedProjects);
  instigator.doIt(action, commandArgs);
}