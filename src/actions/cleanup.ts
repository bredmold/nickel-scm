import {NickelProject} from "../nickel-project";

export enum CleanupStatus {
  New = 'clean-new',
  Skipped = 'clean-skip',
  Dirty = 'clean-dirty',
  Success = 'clean-success',
  Failure = 'clean-failure',
}

export interface CleanupResult {
  /** The project that was cleaned */
  project: NickelProject;

  /** Starting branch for the project */
  branch: string;

  /** Status of the cleanup operation */
  status: CleanupStatus;
}

export class RepositoryCleaner implements CleanupResult {
  project: NickelProject;
  branch: string;
  status: CleanupStatus;

  constructor(project: NickelProject) {
    this.project = project;
    this.branch = '';
    this.status = CleanupStatus.New;
  }

  cleanup(): Promise<CleanupResult> {
    return new Promise<CleanupResult>(resolve => {
      let finish = (e: any, status: CleanupStatus) => {
        // TODO log e?
        this.status = status;
        resolve(this);
      };

      this.project.repository.status().then(
        status => {
          this.branch = status.branch;
          if (this.project.defaultBranch === status.branch) {
            finish(null, CleanupStatus.Skipped);
          } else if (status.modifiedFiles.length > 0) {
            finish(null, CleanupStatus.Dirty);
          } else {
            this.project.repository.selectBranch(this.project.defaultBranch).then(
              () => {
                this.project.repository.pull().then(
                  () => {
                    this.project.repository.deleteLocalBranch(status.branch).then(
                      () => {
                        this.project.repository.prune('origin').then(
                          () => {
                            finish(null, CleanupStatus.Success);
                          },
                          e => finish(e, CleanupStatus.Failure));
                      },
                      e => finish(e, CleanupStatus.Failure));
                  },
                  e => finish(e, CleanupStatus.Failure));
              },
              e => finish(e, CleanupStatus.Failure));
          }
        },
        e => finish(e, CleanupStatus.Failure));
    });
  }
}
