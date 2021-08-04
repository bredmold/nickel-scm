import { GitRepository } from "./scm/git/git-repository";
import { ReportingItem } from "./nickel-report";
import { ShellRunner } from "./scm/git/shell-runner";

/** Configuration values that can be passed in for a project */
export interface NickelProjectConfig {
  /** Project name */
  name: string;

  /** Filesystem path for the project */
  path?: string;

  /** Name of the default branch (used during cleanup) */
  defaultBranch: string;

  /** List of branches or branch name regular expressions that will not be evaluated for deletion */
  safeBranches: (string | RegExp)[];

  /** Controls how commit IDs are abbreviated: a value of -1 means no commit ID abbreviation */
  commitPrefix: number;

  /** Semantic tagging structure - allow projects to be chosen based on marks */
  marks: string[];

  /** If true, then fetch operations (e.g. pull) should be called with the --prune option */
  pruneOnFetch: boolean;
}

export class NickelProject implements ReportingItem {
  readonly name: string;
  readonly path: string;
  readonly defaultBranch: string;
  readonly safeBranches: (string | RegExp)[];
  readonly marks: string[];
  readonly repository: GitRepository;
  selected = false;

  constructor(c: NickelProjectConfig) {
    this.name = c.name;
    this.path = c.path ? `${c.path}/${c.name}` : c.name;
    this.defaultBranch = c.defaultBranch;
    this.safeBranches = c.safeBranches;
    this.marks = c.marks;
    this.repository = new GitRepository(
      this.path,
      new ShellRunner(this.path),
      c.commitPrefix,
      c.pruneOnFetch
    );

    // Make sure the default branch is always "safe"
    this.safeBranches.push(this.defaultBranch);
  }
}

export const EMPTY_PROJECT: NickelProject = new NickelProject({
  name: "empty",
  path: "empty",
  defaultBranch: "master",
  safeBranches: ["master"],
  commitPrefix: -1,
  marks: [],
  pruneOnFetch: false,
});
