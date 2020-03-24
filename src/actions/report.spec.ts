import { RepositoryReportAction } from "./report";
import { EMPTY_PROJECT, NickelProject } from "../nickel-project";
import { ReportLine } from "../nickel-report";
import { TableColumn } from "../nickel-table";

describe("Report Action", () => {
  let project: NickelProject;
  let action: RepositoryReportAction;

  beforeEach(() => {
    project = new NickelProject({
      name: "test",
      path: "/application/path",
      defaultBranch: "master",
      safeBranches: [],
      commitPrefix: -1,
    });
    action = new RepositoryReportAction();
  });

  test("basics", () => {
    expect(action.command).toStrictEqual("report");
    expect(action.description).toStrictEqual("Local repository report");
    expect(action.skipReport).toStrictEqual(
      new ReportLine(
        {
          Project: EMPTY_PROJECT.name,
          "# Mod": "0",
          Branch: "",
          Commit: "",
        },
        false
      )
    );
    expect(action.columns).toStrictEqual([
      new TableColumn("Project"),
      new TableColumn("Branch"),
      new TableColumn("# Mod"),
      new TableColumn("Commit"),
    ]);
  });

  test("act", () => {
    project.repository.status = jest.fn(() =>
      Promise.resolve({
        modifiedFiles: [],
        branch: "master",
        remoteBranch: "origin/master",
        commit: "123456789012",
        ahead: 0,
        behind: 0,
      })
    );

    return expect(action.act(project)).resolves.toStrictEqual(
      new ReportLine({
        Project: "test",
        Branch: "master",
        "# Mod": "0",
        Commit: "123456789012",
      })
    );
  });
});
