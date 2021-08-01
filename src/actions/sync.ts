import { EMPTY_PROJECT, NickelProject } from "../nickel-project";

import { NickelAction } from "./nickel-action";
import { ReportLine } from "../nickel-report";
import { TableColumn } from "../nickel-table";
import { logger } from "../logger";

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
  skipReport(project: NickelProject): ReportLine {
    return new ReportLine(
      {
        Project: project.name,
        Updated: "0",
        Branch: "",
        Status: SyncStatus.Skipped,
      },
      false
    );
  }
  readonly columns = [
    new TableColumn("Project"),
    new TableColumn("Branch"),
    new TableColumn("Updated"),
    new TableColumn("Status"),
  ];

  async act(project: NickelProject): Promise<ReportLine> {
    function line(
      branch: string,
      updatedFiles: string[],
      status: SyncStatus
    ): ReportLine {
      return new ReportLine({
        Project: project.name,
        Branch: branch,
        Updated: updatedFiles.length.toString(),
        Status: status,
      });
    }

    try {
      const status = await project.repository.status();
      const branch = status.branch;
      if (status.modifiedFiles.length > 0) {
        return line(branch, [], SyncStatus.Dirty);
      } else {
        try {
          const pullResult = await project.repository.pull();
          const updatedFiles = pullResult.updatedFiles;
          return line(branch, updatedFiles, SyncStatus.Success);
        } catch (e) {
          logger.error(e);
          return line(branch, [], SyncStatus.Failure);
        }
      }
    } catch (e) {
      logger.error(e);
      return line("", [], SyncStatus.Failure);
    }
  }

  post(): void {
    // Empty
  }
}
