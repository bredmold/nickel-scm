#!/usr/bin/env node

import * as fs from "fs";
import * as program from "commander";
import * as vm from "vm";

import { SelectedItem, nickelSelector } from "./nickel-selector";

import { ALL_ACTIONS } from "./actions/nickel-action";
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
let command: string = "";
let commandArgs: any = null;
let configScript: string = `${process.env["HOME"]}/nickel.js`;
let selectedProjects: string[] = [];
let activeBranch: string = "";
let selectedMark: string = "";

/*
Command-line parsing
 */
program
  .description("nickel-scm: Manage local Git repositories")
  .version(pkg.version)
  .option("--config <config>", "Configuration file")
  .option("--projects <projects>", "List of projects")
  .option(
    "--active-branch <activeBranch>",
    "Select projects with this active branch"
  )
  .option("--level <level>", "Log level")
  .option("--mark <mark>", "Select projects with this mark")
  .on("option:level", () => (logger.level = program.level))
  .on("option:config", () => (configScript = program.config))
  .on("option:active-branch", () => (activeBranch = program.activeBranch))
  .on(
    "option:projects",
    () => (selectedProjects = program.projects.replace(/\s+/, "").split("s*s*"))
  )
  .on("option:mark", () => (selectedMark = program.mark));

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

logger.info(`Log level is ${logger.level}`);

if (command === "") {
  logger.error("No actions were specified");
  process.exit(1);
}

/*
Parse the configuration file
 */

const configScriptBytes = fs.readFileSync(configScript, { encoding: "utf-8" });
if (!configScriptBytes) {
  logger.warn(`Unable to read config script at ${configScript}`);
}

let configContext = new ConfigContext();
vm.createContext(configContext);
vm.runInContext(configScriptBytes, configContext);

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
  } catch (e) {
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
