import {NickelProject} from "../nickel-project";

export enum SyncStatus {
  New = 'sync-new',
  Success = 'sync-success',
  Failure = 'sync-fail',
  Dirty = 'sync-dirty',
  Skipped = 'sync-skipped',
}

export interface SyncResult {
  /** Sync operation status */
  status: SyncStatus;

  /** Sync project */
  project: NickelProject;

  /** Number of files that were updated */
  updateCount: number;

  /** Current branch for the repository */
  branch: string;
}

export class RepositorySync implements SyncResult {
  status: SyncStatus;
  updateCount: number;
  branch: string;

  constructor(public project: NickelProject) {
    this.status = SyncStatus.New;
    this.updateCount = 0;
    this.branch = '';
  }

  sync(): Promise<SyncResult> {
    return new Promise<SyncResult>(resolve => {
      let finish = (e: any, status: SyncStatus) => {
        this.status = status;
        resolve(this);
      };

      this.project.repository.status().then(
        status => {
          this.branch = status.branch;
          if (status.modifiedFiles.length > 0) {
            finish(null, SyncStatus.Dirty);
          } else {
            this.project.repository.pull().then(
              pullResult => {
                this.updateCount = pullResult.updatedFiles.length;
                finish(null, SyncStatus.Success);
              },
              e => finish(e, SyncStatus.Failure)
            );
          }
        },
        e => finish(e, SyncStatus.Failure)
      );
    });
  }
}
