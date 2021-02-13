import { ReportSeparator, ReportingItem } from "./nickel-report";

import { NickelProject } from "./nickel-project";
import { logger } from "./logger";

type ConfigItem = string | string[];
type OptionalConfiguration = { [index: string]: ConfigItem } | null;

/**
 * Configuration context that provides variables and functions to the config script
 */
export class ConfigContext {
  static reportItems: ReportingItem[] = [];
  static root = "";
  static defaultBranch = "master";
  static safeBranches: (string | RegExp)[] = [];
  static commitPrefix = 12;

  /**
   * Set the root for the config context
   */
  set root(root: string) {
    ConfigContext.root = root;
  }

  set defaultBranch(defaultBranch: string) {
    ConfigContext.defaultBranch = defaultBranch;
  }

  set safeBranches(safeBranches: (string | RegExp)[]) {
    ConfigContext.safeBranches = safeBranches;
  }

  /**
   * Register a project definition
   *
   * @param {string} name The name of the project, or a full path
   * @param c Configuration
   */
  project(name: string, c: OptionalConfiguration): void {
    let defaultBranch = ConfigContext.defaultBranch;
    let marks: string[] = [];

    if (c != null) {
      logger.debug("[%s]: ctxt=%j", name, c);

      if (typeof c.defaultBranch === "string") {
        defaultBranch = c.defaultBranch;
        logger.debug(`[${name}]: defaultBranch=${c.defaultBranch}`);
      }

      if (Array.isArray(c.marks)) {
        marks = c.marks.map((mark: string) => mark.toString());
        logger.debug(`[${name}]: marks=${marks}`);
      }
    }

    ConfigContext.reportItems.push(
      new NickelProject({
        name: name,
        path: ConfigContext.root,
        defaultBranch: defaultBranch,
        safeBranches: ConfigContext.safeBranches,
        commitPrefix: ConfigContext.commitPrefix,
        marks: marks,
      })
    );
  }

  separator(name = ""): void {
    ConfigContext.reportItems.push(new ReportSeparator(name));
  }
}
