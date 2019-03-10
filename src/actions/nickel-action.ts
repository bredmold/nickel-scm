import {NickelProject} from "../nickel-project";
import {ReportResult} from "./report";
import {CleanupResult} from "./cleanup";
import {SyncResult} from "./sync";
import {BuildResult} from "./build";
import {GuidedBranchRemovalResult, MergedBranchesInstructions, MergedBranchesResult} from "./merged-branches";

type ReportConfigEntry = string | { [index: string]: string | number };
type ReportConfig = { [index: string]: ReportConfigEntry };

export interface NickelAction<ResponseType> {
  /**
   * Command string template
   */
  readonly command: string;

  /**
   * Return a brief description of the action
   */
  readonly description: string;

  /**
   * Perform the action, generating a response
   *
   * @param project The project on which to act
   * @param args List of command arguments
   */
  act(project: NickelProject, args?: any): Promise<ResponseType>;

  /**
   * Perform an action after all other actions have completed
   *
   * @param reports List of all reports generated
   * @param args List of command arguments
   */
  post(reports: ResponseType[], args?: any): any;

  /**
   * Build the report description that tells the reporter how to assemble a report
   */
  readonly reportHeader: ReportConfig;
}

export const REPORT_ACTION: NickelAction<ReportResult> = {
  command: 'report',
  description: 'Local repository report',
  act: project => project.report(),
  post: () => {
  },
  reportHeader: {
    'project.name': 'Project',
    'branch': 'Branch',
    'modified': '# Mod',
    'commit': 'Commit',
  }
};

export const CLEANUP_ACTION: NickelAction<CleanupResult> = {
  command: 'cleanup',
  description: 'Retire unused branches',
  act: project => project.cleanup(),
  post: () => {
  },
  reportHeader: {
    'project.name': 'Project',
    'branch': 'Branch',
    'status': 'Status',
  }
};

export const SYNC_ACTION: NickelAction<SyncResult> = {
  command: 'sync',
  description: 'Sync all projects',
  act: project => project.sync(),
  post: () => {
  },
  reportHeader: {
    'project.name': 'Project',
    'branch': 'Branch',
    'updateCount': 'Updated',
    'status': 'Status'
  }
};

export const BUILD_ACTION: NickelAction<BuildResult> = {
  command: 'build',
  description: 'Build all projects',
  act: project => project.build(),
  post: () => {
  },
  reportHeader: {
    'project.name': 'Project',
    'type': 'Type',
    'branch': 'Branch',
    'commit': 'Commit',
    'status': 'Status',
    'error': {header: 'Message', width: 120},
  }
};

export const MERGED_BRANCHES_REPORT_ACTION: NickelAction<MergedBranchesResult> = {
  command: 'mergeReport <reportFile>',
  description: 'Generate a merged branches report',
  act: project => project.mergedBranchesReport(),
  post: (reports, args) => new MergedBranchesInstructions(reports, args).writeReport(),
  reportHeader: {
    'project.name': 'Project',
    'status': 'Status',
    'candidateBranches.length': '# Candidates',
  }
};

export const GUIDED_BRANCH_REMOVAL_ACTION: NickelAction<GuidedBranchRemovalResult> = {
  command: 'guidedRemove <reportFile>',
  description: 'Remove branches based on a merged branches report',
  act: (project, args) => project.guidedBranchRemoval(args),
  post: () => {
  },
  reportHeader: {
    'project.name': 'Project',
    'branch': 'Branch',
    'status': 'Status',
    'branchesKept.length': '# Kept',
    'removedBranches.length': '# Removed',
  }
};
