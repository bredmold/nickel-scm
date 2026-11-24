import { vitest, describe, beforeEach, test, expect } from "vitest";
import { EMPTY_PROJECT, NickelProject } from "../nickel-project.js";
import { RepositorySyncAction } from "./sync.js";

import { ReportLine } from "../nickel-report.js";

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
      pruneOnFetch: false,
    });
    action = new RepositorySyncAction();
  });

  test("basics", () => {
    expect(action.skipReport(EMPTY_PROJECT)).toStrictEqual(
      new ReportLine(
        {
          Project: EMPTY_PROJECT.name,
          Updated: "0",
          Branch: "",
          Status: "sync-skipped",
        },
        false,
      ),
    );
    expect(action.columns).toStrictEqual([
      { title: "Project" },
      { title: "Branch" },
      { title: "Updated" },
      { title: "Status" },
    ]);
  });

  test("act", () => {
    project.repository.status = vitest.fn(() =>
      Promise.resolve({
        modifiedFiles: [],
        branch: "master",
        remoteBranch: "origin/master",
        commit: "123456789012",
        ahead: 0,
        behind: 0,
      }),
    );

    project.repository.pull = vitest.fn(() =>
      Promise.resolve({
        updatedFiles: [],
      }),
    );

    return expect(action.act(project)).resolves.toStrictEqual(
      new ReportLine({
        Project: "test",
        Branch: "master",
        Updated: "0",
        Status: "sync-success",
      }),
    );
  });

  test("dirty", () => {
    project.repository.status = vitest.fn(() =>
      Promise.resolve({
        modifiedFiles: ["a"],
        branch: "master",
        remoteBranch: "origin/master",
        commit: "123456789012",
        ahead: 0,
        behind: 0,
      }),
    );

    return expect(action.act(project)).resolves.toStrictEqual(
      new ReportLine({
        Project: "test",
        Branch: "master",
        Updated: "0",
        Status: "sync-dirty",
      }),
    );
  });
});
