import { Argument, Command, Option } from "commander";

import { GuidedBranchRemovalAction } from "./actions/guided-remove";
import { MergedBranchesReportAction } from "./actions/merged-branches";
import { NickelAction } from "./actions/nickel-action";
import { OldBranchesReportAction } from "./actions/old-branches";
import { RepositoryCleanupAction } from "./actions/cleanup";
import { RepositoryReportAction } from "./actions/report";
import { RepositorySyncAction } from "./actions/sync";
import { SelectorConfig } from "./nickel-selector";
import { logger } from "./logger";

import pkg = require("../package.json");

export interface CommandLine {
  readonly action: NickelAction;
  readonly selectors: SelectorConfig;
  readonly logLevel: string;
  readonly configScript?: string;
}

export function parseCommandLine(args: string[]): CommandLine {
  let action: NickelAction | undefined = undefined;

  const program = new Command();
  program
    .description("nickel-scm: Manage local Git repositories")
    .version(pkg.version)
    .option("--project <project...>", "Select a project by name")
    .option(
      "--project-dir <dir...>",
      "Select projects under the indicated folder"
    )
    .option(
      "--active-branch <activeBranch>",
      "Select projects with this active branch"
    )
    .option("--mark <mark>", "Select projects with this mark")
    .option("--config <config>", "Configuration file")
    .addOption(
      new Option("--level <level", "Log level")
        .default("info")
        .choices(["debug", "info", "warn", "error"])
    )
    .exitOverride();

  program
    .command("sync")
    .description("Sync all projects")
    .action(() => {
      logger.debug("cmd=sync");
      action = new RepositorySyncAction();
    });

  program
    .command("report")
    .description("Local repository report (no network interaction)")
    .action(() => {
      logger.debug("cmd=report");
      action = new RepositoryReportAction();
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
    .addArgument(
      new Argument("[age]", "Age of latest commit, in days")
        .default(60)
        .argParser((age) => parseInt(age))
    )
    .action((reportFile: string, age: number) => {
      logger.debug(`cmd=oldBranches reportFile=${reportFile} age=${age}`);
      if (isNaN(age)) throw "Invalid age";
      action = new OldBranchesReportAction(reportFile, age);
    });

  program.parse(args);
  const opts = program.opts();

  if (action === undefined) {
    throw "No actions were specified";
  }

  return {
    action: action,
    selectors: {
      projects: opts.project || [],
      paths: opts.projectDir || [],
      branch: opts.activeBranch || "",
      mark: opts.mark || "",
    },
    logLevel: opts.level,
    configScript: opts.config,
  };
}
