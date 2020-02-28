#!/usr/bin/env node

import * as program from 'commander';
import * as vm from 'vm';
import {ConfigContext} from "./config-context";
import * as fs from "fs";
import {NickelInstigator} from "./nickel-instigator";
import {ALL_ACTIONS} from "./actions/nickel-action";
import * as winston from "winston";
import {NickelProject} from "./nickel-project";

const pkg = require('../package.json');

/*
Global controls
 command          - the selected command
 commandArgs      - command arguments
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
    .action((...args) => {
      command = nickelAction.command;
      commandArgs = args;
      logger.debug(`cmd=${nickelAction.command} args=${commandArgs}`);
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

const reportItems = ConfigContext.reportItems;

if (selectedProjects.length > 0) {
  selectedProjects.forEach(selected => {
    const project = reportItems.find(p => (p instanceof NickelProject) && (p.name === selected)) as NickelProject;
    if (project) {
      project.selected = true;
    } else {
      logger.error(`No such project: ${selected}`);
      process.exit(1);
    }
  });
} else {
  // If no projects are selected, then implicitly, all projects are selected
  reportItems.forEach(item => item.selected = true);
}

const action = ALL_ACTIONS.find(nickelAction => nickelAction.command === command);
if (action === undefined) {
  logger.error('this never happens');
} else {
  const instigator = new NickelInstigator(reportItems);
  instigator.doIt(action, commandArgs);
}
