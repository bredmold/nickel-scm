import { EMPTY_PROJECT, NickelProject } from "../nickel-project";

import { NickelAction } from "./nickel-action";
import { ReportLine } from "../nickel-report";
import { TableColumn } from "../nickel-table";

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
  readonly skipReport = new ReportLine(
    {
      Project: EMPTY_PROJECT.name,
      Branch: "",
      Status: CleanupStatus.Skipped,
    },
    false
  );
  readonly columns = [
    new TableColumn("Project"),
    new TableColumn("Branch"),
    new TableColumn("Status"),
  ];

  act(project: NickelProject, args?: any): Promise<ReportLine> {
    return new Promise<ReportLine>(async (resolve) => {
      let branch = "";

      const finish = (e: any, status: CleanupStatus) => {
        // TODO log e?
        resolve(
          new ReportLine({
            Project: project.name,
            Branch: branch,
            Status: status,
          })
        );
      };

      try {
        const status = await project.repository.status();
        branch = status.branch;
        if (project.defaultBranch === status.branch) {
          finish(null, CleanupStatus.Skipped);
        } else if (status.modifiedFiles.length > 0) {
          finish(null, CleanupStatus.Dirty);
        } else {
          await project.repository.selectBranch(project.defaultBranch);
          await project.repository.pull();
          await project.repository.deleteLocalBranch(status.branch);
          await project.repository.prune("origin");
          finish(null, CleanupStatus.Success);
        }
      } catch (e) {
        finish(e, CleanupStatus.Failure);
      }
    });
  }

  post(reports: ReportLine[], args?: any): any {
    // Empty
  }
}
