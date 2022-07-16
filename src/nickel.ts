#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";

import { SelectedItem, nickelSelector } from "./nickel-selector";

import { ALL_ACTIONS } from "./actions/nickel-action";
import { Command } from "commander";
import { ConfigContext } from "./config-context";
import { NickelInstigator } from "./nickel-instigator";
import { ReportingItem } from "./nickel-report";
import { logger } from "./logger";

import pkg = require("../package.json");

/*
Global controls
 command          - the selected command
 commandArgs      - command arguments
 configScript     - Location of the configuration script
 selectedProjects - List of projects to select
 */
let command = "";
let commandArgs: string[] = [];

/*
Command-line parsing
 */
const program = new Command();
program
  .description("nickel-scm: Manage local Git repositories")
  .version(pkg.version)
  .option("--config <config>", "Configuration file")
  .option("--projects <projects...>", "List of projects")
  .option(
    "--active-branch <activeBranch>",
    "Select projects with this active branch"
  )
  .option("--level <level>", "Log level", "info")
  .option("--mark <mark>", "Select projects with this mark");

ALL_ACTIONS.forEach((nickelAction) => {
  program
    .command(nickelAction.command)
    .action((...args) => {
      command = nickelAction.command;
      commandArgs = args;
      logger.debug(`cmd=${nickelAction.command} args=${commandArgs}`);
    })
    .description(nickelAction.description);
});

program.parse(process.argv);
const opts = program.opts();

const selectedProjects: string[] = opts.projects || [];
const configScript: string | undefined = opts.config;
const activeBranch: string = opts.activeBranch || "";
const selectedMark: string = opts.mark || "";

logger.level = opts.level;
logger.info(`Log level is ${logger.level}`);

if (command === "") {
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

try {
  const configScriptPath = findConfigScript(configScript);
  const configScriptContent = fs.readFileSync(configScriptPath, {
    encoding: "utf-8",
  });

  const configContext = new ConfigContext();
  vm.createContext(configContext);
  vm.runInContext(configScriptContent, configContext, {
    filename: configScriptPath,
  });
} catch (e: any) {
  logger.error(`message - ${e.message}, stack trace - ${e.stack}`);
  process.exit(1);
}

/*
Do the things!
 */

/**
 * Filter the list of projects based on selection criteria
 *
 * @param items List of configured reporting items
 * @return A promise containing projects merged with selection criteria
 */
async function selectItems(items: ReportingItem[]): Promise<SelectedItem[]> {
  try {
    const selector = nickelSelector({
      projects: selectedProjects,
      branch: activeBranch,
      mark: selectedMark,
    });

    const selectorPromises = items.map((item) => selector(item));
    const selectedItems = await Promise.all(selectorPromises);
    const selected: number = selectedItems.reduce(
      (sum, item_2) => sum + (item_2.selected ? 1 : 0),
      0
    );
    logger.debug(`Selected ${selected} projects`);

    if (selected === 0) {
      logger.error(`No projects meet selection criteria: ${selector.criteria}`);
      process.exit(1);
    }

    return selectedItems;
  } catch (e: any) {
    logger.error(e);
    process.exit(1);
  }
}

selectItems(ConfigContext.reportItems).then((selectedItems: SelectedItem[]) => {
  const action = ALL_ACTIONS.find(
    (nickelAction) => nickelAction.command === command
  );
  if (action === undefined) {
    logger.error("this never happens");
  } else {
    const instigator = new NickelInstigator(selectedItems);
    instigator.doIt(action, commandArgs);
  }
});
