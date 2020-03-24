import { EMPTY_PROJECT, NickelProject } from "../nickel-project";
import { ReportLine } from "../nickel-report";
import { NickelAction } from "./nickel-action";
import { TableColumn } from "../nickel-table";

export enum SyncStatus {
  New = "sync-new",
  Success = "sync-success",
  Failure = "sync-fail",
  Dirty = "sync-dirty",
  Skipped = "sync-skipped",
}

export class RepositorySyncAction implements NickelAction {
  readonly command = "sync";
  readonly description = "Sync all projects";
  readonly skipReport = new ReportLine(
    {
      Project: EMPTY_PROJECT.name,
      Updated: "0",
      Branch: "",
      Status: SyncStatus.Skipped,
    },
    false
  );
  readonly columns = [
    new TableColumn("Project"),
    new TableColumn("Branch"),
    new TableColumn("Updated"),
    new TableColumn("Status"),
  ];

  act(project: NickelProject, args?: any): Promise<ReportLine> {
    return new Promise<ReportLine>((resolve) => {
      let updatedFiles = [];
      let branch = "";

      let finish = (e: any, status: SyncStatus) => {
        resolve(
          new ReportLine({
            Project: project.name,
            Branch: branch,
            Updated: updatedFiles.length.toString(),
            Status: status,
          })
        );
      };

      project.repository.status().then(
        (status) => {
          branch = status.branch;
          if (status.modifiedFiles.length > 0) {
            finish(null, SyncStatus.Dirty);
          } else {
            project.repository.pull().then(
              (pullResult) => {
                updatedFiles = pullResult.updatedFiles;
                finish(null, SyncStatus.Success);
              },
              (e) => finish(e, SyncStatus.Failure)
            );
          }
        },
        (e) => finish(e, SyncStatus.Failure)
      );
    });
  }

  post(reports: ReportLine[], args?: any): any {
    // Empty
  }
}
