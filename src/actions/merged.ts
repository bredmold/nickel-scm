import {NickelProject} from '../nickel-project'

export enum RemovedMergedBranchesStatus {
  Success = 'merged-success',
  Failure = 'merged-failure',
  Skipped = 'merged-skip',
  Dirty = 'merged-dirty',
  Working = 'merged-working'
}

export interface RemoveMergedBranchesResult {
  /** The project whose branches were pruned */
  project: NickelProject;

  /** Current branch for the project */
  branch: string;

  /** List of branches identified for removal */
  candidateBranches: string[];

  /** List of merged branches that were removed */
  removedBranches: string[];

  /** Status from merging branches */
  status: RemovedMergedBranchesStatus;
}
