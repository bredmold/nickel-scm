import { EMPTY_PROJECT, NickelProject } from "../nickel-project";
import { ReportLine } from "../nickel-report";
import { NickelAction } from "./nickel-action";
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
    return new Promise<ReportLine>((resolve) => {
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

      project.repository.status().then(
        (status) => {
          branch = status.branch;
          if (project.defaultBranch === status.branch) {
            finish(null, CleanupStatus.Skipped);
          } else if (status.modifiedFiles.length > 0) {
            finish(null, CleanupStatus.Dirty);
          } else {
            project.repository.selectBranch(project.defaultBranch).then(
              () => {
                project.repository.pull().then(
                  () => {
                    project.repository.deleteLocalBranch(status.branch).then(
                      () => {
                        project.repository.prune("origin").then(
                          () => {
                            finish(null, CleanupStatus.Success);
                          },
                          (e) => finish(e, CleanupStatus.Failure)
                        );
                      },
                      (e) => finish(e, CleanupStatus.Failure)
                    );
                  },
                  (e) => finish(e, CleanupStatus.Failure)
                );
              },
              (e) => finish(e, CleanupStatus.Failure)
            );
          }
        },
        (e) => finish(e, CleanupStatus.Failure)
      );
    });
  }

  post(reports: ReportLine[], args?: any): any {
    // Empty
  }
}
