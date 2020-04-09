import { EMPTY_PROJECT, NickelProject } from "../nickel-project";
import { RepositorySyncAction, SyncStatus } from "./sync";

import { ReportLine } from "../nickel-report";
import { TableColumn } from "../nickel-table";

describe("Sync Action", () => {
  let project: NickelProject;
  let action: RepositorySyncAction;

  beforeEach(() => {
    project = new NickelProject({
      name: "test",
      path: "/application/path",
      defaultBranch: "master",
      safeBranches: [],
      commitPrefix: -1,
      marks: [],
    });
    action = new RepositorySyncAction();
  });

  test("basics", () => {
    expect(action.command).toStrictEqual("sync");
    expect(action.description).toStrictEqual("Sync all projects");
    expect(action.skipReport).toStrictEqual(
      new ReportLine(
        {
          Project: EMPTY_PROJECT.name,
          Updated: "0",
          Branch: "",
          Status: SyncStatus.Skipped,
        },
        false
      )
    );
    expect(action.columns).toStrictEqual([
      new TableColumn("Project"),
      new TableColumn("Branch"),
      new TableColumn("Updated"),
      new TableColumn("Status"),
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

    project.repository.pull = jest.fn(() =>
      Promise.resolve({
        updatedFiles: [],
      })
    );

    return expect(action.act(project)).resolves.toStrictEqual(
      new ReportLine({
        Project: "test",
        Branch: "master",
        Updated: "0",
        Status: "sync-success",
      })
    );
  });

  test("dirty", () => {
    project.repository.status = jest.fn(() =>
      Promise.resolve({
        modifiedFiles: ["a"],
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
        Updated: "0",
        Status: "sync-dirty",
      })
    );
  });
});
