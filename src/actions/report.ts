import { EMPTY_PROJECT, NickelProject } from "../nickel-project";

import { NickelAction } from "./nickel-action";
import { ReportLine } from "../nickel-report";
import { TableColumn } from "../nickel-table";

export class RepositoryReportAction implements NickelAction {
  readonly command = "report";
  readonly description = "Local repository report";
  readonly skipReport = new ReportLine(
    {
      Project: EMPTY_PROJECT.name,
      "# Mod": "0",
      Branch: "",
      Commit: "",
    },
    false
  );
  readonly columns: TableColumn[] = [
    new TableColumn("Project"),
    new TableColumn("Branch"),
    new TableColumn("# Mod"),
    new TableColumn("Commit"),
    new TableColumn("Marks"),
  ];

  act(project: NickelProject, args?: any): Promise<ReportLine> {
    return new Promise<ReportLine>(async (resolve) => {
      let branch = "";
      let modifiedFiles = [];
      let commit = "";

      const finish = function () {
        resolve(
          new ReportLine({
            Project: project.name,
            Branch: branch,
            "# Mod": modifiedFiles.length.toString(),
            Commit: commit,
            Marks: project.marks.join(","),
          })
        );
      };

      try {
        const status = await project.repository.status();
        branch = status.branch;
        modifiedFiles = status.modifiedFiles;
        commit = status.commit;
      } finally {
        finish();
      }
    });
  }

  post(reports: ReportLine[], args?: any): any {
    // Empty
  }
}
