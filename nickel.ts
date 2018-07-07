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

const ALL_COMMANDS = ['sync', 'report', 'build', 'cleanup'];

/*
Global controls
 actions      - list of actions to perform on this run
 configScript - Location of the configuration script
 */
let actions: string[] = [];
let configScript: string = `${process.env['HOME']}/nickel.js`;

/*
Command-line parsing
 */
program
    .option('--config <config>', 'Configuration file')
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

if (actions.length < 1) {
    console.log('No actions were specified');
    process.exit(1);
}

const commands = actions.map(action => {
    let na = action.trim().toLowerCase();
    const idx = ALL_COMMANDS.findIndex(a => a === na);
    if (idx < 0) {
        console.log(`Invalid command: ${action}`);
        process.exit(1);
    }
    return na;
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
Action implementations
 */

function reportAllProjects(actions: string[], projects: NickelProject[], separators: number[]): Promise<any> {
    let idx = actions.findIndex(a => a === 'report');
    if (idx >= 0) {
        // Report
        let timer = new NickelTimer();
        let reportPromises: Promise<ReportResult>[] = [];
        projects.forEach(project => {
            reportPromises.push(project.report());
        });
        return Promise.all(reportPromises).then(reports => {
            let report = new NickelReport({
                'project.name': 'Project',
                'branch': 'Branch',
                'modified': '# Mod',
                'commit': 'Commit',
            }, separators);
            console.log(report.buildReport(reports));
            console.log(`${timer.elapsed() / 1000}s elapsed`);
        });
    } else {
        // Do nothing
        return Promise.resolve();
    }
}

function cleanupAllProjects(actions: string[], projects: NickelProject[], separators: number[]): Promise<any> {
    let idx = actions.findIndex(a => a === 'cleanup');
    if (idx >= 0) {
        // Cleanup
        let timer = new NickelTimer();
        let cleanupPromises: Promise<CleanupResult>[] = [];
        projects.forEach(project => {
            cleanupPromises.push(project.cleanup());
        });
        return Promise.all(cleanupPromises).then(reports => {
            let report = new NickelReport({
                'project.name': 'Project',
                'branch': 'Branch',
                'status': 'Status',
            }, separators);
            console.log(report.buildReport(reports));
            console.log(`${timer.elapsed() / 1000}s elapsed`);
        });
    } else {
        // Do nothing
        return Promise.resolve();
    }
}

function syncAllProjects(actions: string[], projects: NickelProject[], separators: number[]): Promise<any> {
    let idx = actions.findIndex(a => a === 'sync');
    if (idx >= 0) {
        // Sync
        let timer = new NickelTimer();
        let syncPromises: Promise<SyncResult>[] = [];
        projects.forEach(project => {
            syncPromises.push(project.sync());
        });
        return Promise.all(syncPromises).then(syncReports => {
            let report = new NickelReport({
                'project.name': 'Project',
                'branch': 'Branch',
                'updateCount': 'Updated',
                'status': 'Status'
            }, separators);
            console.log(report.buildReport(syncReports));
            console.log(`${timer.elapsed() / 1000}s elapsed`);
        });
    } else {
        // Do nothing
        return Promise.resolve();
    }
}

function buildAllProjects(actions: string[], projects: NickelProject[], separators: number[]): Promise<any> {
    let idx = actions.findIndex(a => a === 'build');
    if (idx >= 0) {
        // Build
        let timer = new NickelTimer();
        let buildPromises: Promise<BuildResult>[] = [];
        projects.forEach(project => {
            buildPromises.push(project.build());
        });
        return Promise.all(buildPromises).then(buildReports => {
            let report = new NickelReport({
                'project.name': 'Project',
                'type': 'Type',
                'branch': 'Branch',
                'commit': 'Commit',
                'status': 'Status',
                'error': {header: 'Message', width: 120},
            }, separators);
            console.log(report.buildReport(buildReports));
            console.log(`${timer.elapsed() / 1000}s elapsed`);
        });
    } else {
        // Do nothing
        return Promise.resolve();
    }
}

/*
Initialize the project list
 */

let projects = ConfigContext.projects;
let separators = ConfigContext.separators;

Promise.resolve()
    .then(() => reportAllProjects(actions, projects, separators))
    .then(() => cleanupAllProjects(actions, projects, separators))
    .then(() => syncAllProjects(actions, projects, separators))
    .then(() => buildAllProjects(actions, projects, separators));
