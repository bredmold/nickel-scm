#!/usr/bin/env node

import * as program from 'commander';
import * as vm from 'vm';
import {ConfigContext} from "./config-context";
import * as fs from "fs";
import {NickelProject} from "./nickel-project";
import {SyncResult} from "./sync";
import {NickelReport} from "./nickel-report";
import {NickelTimer} from "./nickel-timer";
import {ReportResult} from "./report";
import {BuildResult} from "./build";
import {CleanupResult} from "./cleanup";
import {NickelInstigator} from "./nickel-instigator";
import {BUILD_ACTION, CLEANUP_ACTION, REPORT_ACTION, SYNC_ACTION} from "./nickel-action";

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
    .arguments('<cmd...>')
    .action(commands => {
        if (Array.isArray(commands)) {
            commands.forEach(cmd => actions.push(cmd));
        } else {
            actions.push(commands);
        }
    })
    .parse(process.argv);

if (program.config) {
    configScript = program.config;
}

if (program.projects) {
    selectedProjects = program.projects.replace(/\s+/, '').split(',');
}

if (actions.length < 1) {
    console.log('No actions were specified');
    process.exit(1);
}

actions.forEach(action => {
    let na = action.trim().toLowerCase();
    const idx = ALL_ACTIONS.findIndex(a => a.token() === na);
    if (idx < 0) {
        console.log(`Invalid command: ${action}`);
        process.exit(1);
    }
});

/*
Parse the configuration file
 */

let configScriptBytes = fs.readFileSync(configScript, {encoding: 'utf-8'});
if (!configScriptBytes) {
    console.log(`Unable to read config script at ${configScript}`);
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
            console.error(`No such project: ${selected}`);
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
