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

  async act(project: NickelProject): Promise<ReportLine> {
    const status = await project.repository.status();
    return new ReportLine({
      Project: project.name,
      Branch: status.branch,
      "# Mod": status.modifiedFiles.length.toString(),
      Commit: status.commit,
      Marks: project.marks.join(","),
    });
  }

  post(): void {
    // Empty
  }
}
