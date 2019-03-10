import {NickelProject} from "../nickel-project";

export interface ReportResult {
  /* Report project */
  project: NickelProject;

  /** Current branch for the repository */
  branch: string;

  /** Number of modified files in the repository */
  modified: number;

  /** Commit ID */
  commit: string;
}

export class RepositoryReport implements ReportResult {
  branch: string;
  modified: number;
  commit: string;

  constructor(public project: NickelProject) {
    this.branch = '';
    this.modified = 0;
    this.commit = '';
  }

  report(): Promise<ReportResult> {
    return new Promise<ReportResult>(resolve => {
      this.project.repository.status().then(
        status => {
          this.branch = status.branch;
          this.modified = status.modifiedFiles.length;
          this.project.repository.commit().then(
            commitId => {
              this.commit = commitId;
              resolve(this);
            },
            () => resolve(this)
          );
        },
        () => resolve(this)
      );
    });
  }
}
