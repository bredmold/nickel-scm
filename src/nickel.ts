#!/usr/bin/env node

import * as program from 'commander';
import * as vm from 'vm';
import {ConfigContext} from "./config-context";
import * as fs from "fs";
import {NickelProject} from "./nickel-project";
import {SyncResult} from "./actions/sync";
import {NickelReport} from "./nickel-report";
import {NickelTimer} from "./nickel-timer";
import {ReportResult} from "./actions/report";
import {BuildResult} from "./actions/build";
import {CleanupResult} from "./actions/cleanup";
import {NickelInstigator} from "./nickel-instigator";
import {BUILD_ACTION, CLEANUP_ACTION, REPORT_ACTION, SYNC_ACTION} from "./actions/nickel-action";
import * as winston from "winston";

const ALL_ACTIONS = [
    SYNC_ACTION,
    REPORT_ACTION,
    BUILD_ACTION,
    CLEANUP_ACTION,
];

/*
Global controls
 actions      - list of actions to perform on this run
 configScript - Location of the configuration script
 */
let actions: string[] = [];
let configScript: string = `${process.env['HOME']}/nickel.js`;
let selectedProjects: string[] = [];

/*
Command-line parsing
 */
program
    .option('--config <config>', 'Configuration file')
    .option('--projects <projects>', 'List of projects')
    .option('--level <level>', 'Log level')
    .arguments('<cmd...>')
    .action(commands => {
        if (Array.isArray(commands)) {
            commands.forEach(cmd => actions.push(cmd));
        } else {
            actions.push(commands);
        }
    })
    .parse(process.argv);

let logLevel = 'info';
if (program.level) {
    logLevel = program.level;
}

export const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console(),
    ],
});
logger.info(`logLevel = ${logLevel}`);

if (program.config) {
    configScript = program.config;
}

if (program.projects) {
    selectedProjects = program.projects.replace(/\s+/, '').split(',');
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

let instigator = new NickelInstigator(projects, separators, actions, selectedProjects);
Promise.resolve()
    .then(() => instigator.doIt(REPORT_ACTION))
    .then(() => instigator.doIt(CLEANUP_ACTION))
    .then(() => instigator.doIt(SYNC_ACTION))
    .then(() => instigator.doIt(BUILD_ACTION));
