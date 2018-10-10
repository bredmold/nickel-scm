#!/usr/bin/env node

import * as program from 'commander';
import * as vm from 'vm';
import {ConfigContext} from "./config-context";
import * as fs from "fs";
import {NickelInstigator} from "./nickel-instigator";
import {BUILD_ACTION, CLEANUP_ACTION, REPORT_ACTION, SYNC_ACTION, MERGED_ACTION} from "./actions/nickel-action";
import * as winston from "winston";

const pkg = require('../package.json');

const ALL_ACTIONS = [
  SYNC_ACTION,
  REPORT_ACTION,
  BUILD_ACTION,
  CLEANUP_ACTION,
  MERGED_ACTION,
];

/*
Global controls
 actions          - list of actions to perform on this run
 configScript     - Location of the configuration script
 selectedProjects - List of projects to select
 dryRun           - If true, only output commands that *would* run, but don't run them
 */
let actions: string[] = [];
let configScript: string = `${process.env['HOME']}/nickel.js`;
let selectedProjects: string[] = [];
let dryRun = false;

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
  .option('--dryRun <dryRun>', 'Dry-run only (no destructive commands will be run)')
  .arguments('<cmd...>')
  .action(commands => {
    if (Array.isArray(commands)) {
      commands.forEach(cmd => actions.push(cmd));
    } else {
      actions.push(commands);
    }
  })
  .on('option:level', () => logger.level = program.level)
  .on('option:config', () => configScript = program.config)
  .on('option:projects', () => selectedProjects = program.projects.replace(/\s+/, '').split(','))
  .on('option:dryRun', () => dryRun = (program.dryRun === 'true'))
  .parse(process.argv);

logger.info(`Log level is ${logger.level}`);

if (dryRun) {
  logger.info('Dry-run only - will not execute destructive commands');
}

if (actions.length < 1) {
  logger.error('No actions were specified');
  process.exit(1);
}

actions.forEach(action => {
  let na = action.trim().toLowerCase();
  const idx = ALL_ACTIONS.findIndex(a => a.token() === na);
  if (idx < 0) {
    logger.error(`Invalid command: ${action}`);
    process.exit(1);
  }
});

/*
Parse the configuration file
 */

let configScriptBytes = fs.readFileSync(configScript, {encoding: 'utf-8'});
if (!configScriptBytes) {
  logger.warn(`Unable to read config script at ${configScript}`);
}

let configContext = new ConfigContext();
vm.createContext(configContext);
vm.runInContext(configScriptBytes, configContext);

/*
Initialize the project list
 */

let projects = ConfigContext.projects;
let separators = ConfigContext.separators;

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

let instigator = new NickelInstigator(projects, separators, actions, selectedProjects, dryRun);
Promise.resolve()
  .then(() => instigator.doIt(REPORT_ACTION))
  .then(() => instigator.doIt(CLEANUP_ACTION))
  .then(() => instigator.doIt(MERGED_ACTION))
  .then(() => instigator.doIt(SYNC_ACTION))
  .then(() => instigator.doIt(BUILD_ACTION));
