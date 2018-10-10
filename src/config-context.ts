/**
 * Configuration context that provides variables and functions to the config script
 */
import {NickelProject} from "./nickel-project";

export class ConfigContext {
  static separators: number[] = [];
  static projects: NickelProject[] = [];
  static root: string = '';
  static defaultBranch: string = 'master';
  static safeBranches: (string | RegExp)[] = [];

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
    let defaultBranch: string = (c && c.defaultBranch) || ConfigContext.defaultBranch;
    ConfigContext.projects.push(new NickelProject({
      name: name,
      path: ConfigContext.root,
      defaultBranch: defaultBranch,
      safeBranches: ConfigContext.safeBranches,
      build: (c && c.build) || undefined,
    }));
  }

  separator() {
    ConfigContext.separators.push(ConfigContext.projects.length);
  }
}
