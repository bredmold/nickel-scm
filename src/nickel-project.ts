import {GitRepository} from "./scm/git/git-repository";
import {ReportingItem} from "./nickel-report";

/** Configuration values that can be passed in for a project */
export interface NickelProjectConfig {
  /** Project name */
  name: string;

  /** Filesystem path for the project */
  path?: string;

  /** Build system to use - if none is specified, the project is skipped during builds */
  build: string | boolean;

  /** Name of the default branch (used during cleanup) */
  defaultBranch: string;

  /** List of branches or branch name regular expressions that will not be evaluated for deletion */
  safeBranches: (string | RegExp)[];
}

export class NickelProject implements ReportingItem {
  name: string;
  path: string;
  defaultBranch: string;
  safeBranches: (string | RegExp)[];
  buildSystem: string | boolean;
  repository: GitRepository;
  selected: boolean = false;

  constructor(c: NickelProjectConfig) {
    this.name = c.name;
    this.path = c.path ? `${c.path}/${c.name}` : c.name;
    this.defaultBranch = c.defaultBranch;
    this.safeBranches = c.safeBranches;
    this.repository = new GitRepository(this.path);
    this.buildSystem = c.build;

    // Make sure the default branch is always "safe"
    this.safeBranches.push(this.defaultBranch);
  }
}

export const EMPTY_PROJECT: NickelProject = new NickelProject({
  name: 'empty',
  path: 'empty',
  defaultBranch: 'master',
  safeBranches: ['master'],
  build: false,
});
