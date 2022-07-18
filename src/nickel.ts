#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";

import { Command } from "commander";
import { ConfigContext } from "./config-context";
import { GuidedBranchRemovalAction } from "./actions/guided-remove";
import { MergedBranchesReportAction } from "./actions/merged-branches";
import { NickelAction } from "./actions/nickel-action";
import { NickelInstigator } from "./nickel-instigator";
import { OldBranchesReportAction } from "./actions/old-branches";
import { RepositoryCleanupAction } from "./actions/cleanup";
import { RepositorySyncAction } from "./actions/sync";
import { logger } from "./logger";
import { selectItems } from "./nickel-selector";

import pkg = require("../package.json");

/*
The action to run for this command
 */
let action: NickelAction | undefined = undefined;

/*
Command-line parsing
 */
const program = new Command();
program
  .description("nickel-scm: Manage local Git repositories")
  .version(pkg.version)
  .option("--config <config>", "Configuration file")
  .option("--project <project...>", "Select a project by name")
  .option(
    "--project-dir <dir...>",
    "Select projects under the indicated folder"
  )
  .option(
    "--active-branch <activeBranch>",
    "Select projects with this active branch"
  )
  .option("--level <level>", "Log level", "info")
  .option("--mark <mark>", "Select projects with this mark");

program
  .command("sync")
  .description("Sync all projects")
  .action(() => {
    logger.debug("cmd=sync");
    action = new RepositorySyncAction();
  });

program
  .command("report")
  .description("Local repository report")
  .action(() => {
    logger.debug("cmd=report");
    action = new RepositorySyncAction();
  });

program
  .command("cleanup")
  .description("Retire unused branches")
  .action(() => {
    logger.debug("cmd=cleanup");
    action = new RepositoryCleanupAction();
  });

program
  .command("mergedReport")
  .argument("<reportFile>", "Branch report to generate")
  .description("Generate a merged branches report")
  .action((reportFile: string) => {
    logger.debug(`cmd=mergedBranches reportFile=${reportFile}`);
    action = new MergedBranchesReportAction(reportFile);
  });

program
  .command("guidedRemove")
  .argument("<reportFile>", "Report file to consume")
  .description("Remove branches based on a branch report")
  .action((reportFile: string) => {
    logger.debug(`cmd=guidedRemove reportFile=${reportFile}`);
    action = new GuidedBranchRemovalAction(reportFile);
  });

program
  .command("oldBranches")
  .description("Generate a list of branches older than a certain age")
  .argument("<reportFile>", "Branch report to generate")
  .argument("[age]", "Age of latest commit (in days)", 60)
  .action((reportFile: string, age: number) => {
    logger.debug(`cmd=oldBranches reportFile=${reportFile} age=${age}`);
    action = new OldBranchesReportAction(reportFile, age);
  });

program.parse(process.argv);
const opts = program.opts();

/*
Project selection options
 selectedProjects - Project names
 selectedPaths    - Filesystem paths
 activeBranch     - Branch name
 selectedMark     - Marks from configuration

Other options
 configScript     - Config script override location
 */
const selectedProjects: string[] = opts.project || [];
const selectedPaths: string[] = opts.projectDir || [];
const activeBranch: string = opts.activeBranch || "";
const selectedMark: string = opts.mark || "";
const configScript: string | undefined = opts.config;

logger.level = opts.level;
logger.info(`Log level is ${logger.level}`);

if (action === undefined) {
  logger.error("No actions were specified");
  process.exit(1);
}

/*
Parse the configuration file
 */

/**
 * This searches in three locations for the configuration script
 *
 * 1. If present, wherever the command-line option is that points to the config script
 * 2. $HOME/.nickel.js
 * 3. $HOME/nickel.js
 *
 * @param configScriptOption Command-line option indicating the configuration script
 * @returns Config script as a string
 * @throws If the configuration script can't be located
 */
function findConfigScript(configScriptOption?: string): string {
  const home = process.env["HOME"];
  const defaultSearchPath = [
    home + path.sep + ".nickel.js",
    home + path.sep + "nickel.js",
  ];
  const searchPath = configScriptOption
    ? [configScriptOption, ...defaultSearchPath]
    : defaultSearchPath;

  const configPath = searchPath.find((path) => {
    if (fs.existsSync(path)) {
      const stats = fs.statSync(path);
      return stats.isFile();
    } else {
      return false;
    }
  });

  if (configPath) {
    return configPath;
  } else {
    throw `Unable to read config script: option=${configScriptOption}`;
  }
}

async function main() {
  const configScriptPath = findConfigScript(configScript);
  const configScriptContent = fs.readFileSync(configScriptPath, {
    encoding: "utf-8",
  });

  const configContext = new ConfigContext();
  vm.createContext(configContext);
  vm.runInContext(configScriptContent, configContext, {
    filename: configScriptPath,
  });

  /*
  Do the things!
   */

  const selectedItems = await selectItems(
    {
      projects: selectedProjects,
      paths: selectedPaths,
      branch: activeBranch,
      mark: selectedMark,
    },
    ConfigContext.reportItems
  );
  const instigator = new NickelInstigator(selectedItems);
  await instigator.doIt(action as NickelAction);
}

main().then(
  () => {
    logger.debug("Done");
  },
  (e) => {
    logger.error(e);
    process.exit(1);
  }
);
