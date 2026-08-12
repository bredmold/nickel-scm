#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";

import { parseCommandLine } from "./command-line.js";

import { CommanderError } from "commander";
import { ConfigContext } from "./config-context.js";
import { NickelInstigator } from "./nickel-instigator.js";
import { logger } from "./logger.js";
import { selectItems } from "./nickel-selector.js";

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
function findConfigScript(configScriptOption: string | undefined): string {
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
      logger.debug("findConfigScript: %s is a file", path);
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
  /*
  Parse the command line and initialize logging
   */
  logger.level = "warn";

  const options = parseCommandLine(process.argv);

  logger.level = options.logLevel;
  logger.info(`Log level is ${logger.level}`);

  /*
  Read the configuration script
   */

  const configScriptPath = findConfigScript(options.configScript);
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

  logger.debug("reportItems = %j", ConfigContext.reportItems);
  const selectedItems = await selectItems(
    options.selectors,
    ConfigContext.reportItems,
  );
  const instigator = new NickelInstigator(selectedItems);
  await instigator.doIt(options.action);
}

if (import.meta.main) {
  main().then(
    () => {
      logger.debug("Done");
    },
    (e) => {
      if (e instanceof CommanderError) {
        process.exit(e.exitCode);
      } else {
        logger.error(e);
        process.exit(1);
      }
    },
  );
}
