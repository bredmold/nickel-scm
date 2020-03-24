/**
 * Configuration context that provides variables and functions to the config script
 */
import { NickelProject } from "./nickel-project";
import { ReportingItem, ReportSeparator } from "./nickel-report";

export class ConfigContext {
  static reportItems: ReportingItem[] = [];
  static root: string = "";
  static defaultBranch: string = "master";
  static safeBranches: (string | RegExp)[] = [];
  static commitPrefix: number = 12;

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
  project(name: string, c: any) {
    let defaultBranch: string =
      (c && c.defaultBranch) || ConfigContext.defaultBranch;
    ConfigContext.reportItems.push(
      new NickelProject({
        name: name,
        path: ConfigContext.root,
        defaultBranch: defaultBranch,
        safeBranches: ConfigContext.safeBranches,
        commitPrefix: ConfigContext.commitPrefix,
      })
    );
  }

  separator(name: string = "") {
    ConfigContext.reportItems.push(new ReportSeparator(name));
  }
}
