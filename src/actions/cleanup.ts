import { EMPTY_PROJECT, NickelProject } from "../nickel-project";

import { NickelAction } from "./nickel-action";
import { ReportLine } from "../nickel-report";
import { TableColumn } from "../nickel-table";
import { logger } from "../logger";

export enum CleanupStatus {
  New = "clean-new",
  Skipped = "clean-skip",
  Dirty = "clean-dirty",
  Success = "clean-success",
  Failure = "clean-failure",
}

export class RepositoryCleanupAction implements NickelAction {
  readonly command = "cleanup";
  readonly description = "Retire unused branches";
  skipReport(project: NickelProject): ReportLine {
    return new ReportLine(
      {
        Project: project.name,
        Branch: "",
        Status: CleanupStatus.Skipped,
      },
      false
    );
  }
  readonly columns = [
    new TableColumn("Project"),
    new TableColumn("Branch"),
    new TableColumn("Status"),
  ];

  async act(project: NickelProject): Promise<ReportLine> {
    function line(branch: string, status: CleanupStatus) {
      return new ReportLine({
        Project: project.name,
        Branch: branch,
        Status: status,
      });
    }

    try {
      const status = await project.repository.status();
      const branch = status.branch;

      try {
        if (project.defaultBranch === status.branch) {
          return line(branch, CleanupStatus.Skipped);
        } else if (status.modifiedFiles.length > 0) {
          return line(branch, CleanupStatus.Dirty);
        } else {
          await project.repository.selectBranch(project.defaultBranch);
          await project.repository.pull();
          await project.repository.deleteLocalBranch(status.branch);
          await project.repository.prune("origin");
          return line(branch, CleanupStatus.Success);
        }
      } catch (e) {
        logger.error(e);
        return line(branch, CleanupStatus.Failure);
      }
    } catch (e) {
      logger.error(e);
      return line("", CleanupStatus.Failure);
    }
  }

  post(): void {
    // Empty
  }
}
