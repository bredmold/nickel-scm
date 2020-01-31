import {RepositorySync, SyncResult} from "./actions/sync";
import {GitRepository} from "./scm/git/git-repository";
import {ReportResult, RepositoryReport} from "./actions/report";
import {BuildResult} from "./actions/build";
import {CleanupResult, RepositoryCleaner} from "./actions/cleanup";
import {actionBuild} from "./actions/build-action";
import {GuidedBranchRemoval, GuidedBranchRemovalResult} from "./actions/guided-remove";
import {OldBranchesReport} from "./actions/old-branches";
import {BranchReportResult} from "./actions/branch-reports";
import {MergedBranchesReport} from "./actions/merged-branches";
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

  report: () => Promise<ReportResult> = () => new RepositoryReport(this).report();
  sync: () => Promise<SyncResult> = () => new RepositorySync(this).sync();
  build: () => Promise<BuildResult> = () => actionBuild(this);
  cleanup: () => Promise<CleanupResult> = () => new RepositoryCleaner(this).cleanup();
  mergedBranchesReport: () => Promise<BranchReportResult> = () => new MergedBranchesReport(this).report();
  oldBranchesReport: (args: any) => Promise<BranchReportResult> = args => new OldBranchesReport(this, args).report();
  guidedBranchRemoval: (instructions: string) => Promise<GuidedBranchRemovalResult> = instructions => new GuidedBranchRemoval(this, instructions).prune();
}

export const EMPTY_PROJECT: NickelProject = new NickelProject({
  name: 'empty',
  path: 'empty',
  defaultBranch: 'master',
  safeBranches: ['master'],
  build: false,
});
