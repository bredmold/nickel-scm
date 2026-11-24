import { describe, beforeEach, test, expect, vitest } from "vitest";
import { EMPTY_PROJECT, NickelProject } from "../nickel-project.js";

import { ReportLine } from "../nickel-report.js";
import { RepositoryReportAction } from "./report.js";

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
      marks: ["a", "b"],
      pruneOnFetch: false,
    });
    action = new RepositoryReportAction();
  });

  test("basics", () => {
    expect(action.skipReport(EMPTY_PROJECT)).toStrictEqual(
      new ReportLine(
        {
          Project: EMPTY_PROJECT.name,
          Branch: "",
          "# Mod": "0",
          Commit: "",
          Marks: "",
        },
        false,
      ),
    );
    expect(action.columns).toStrictEqual([
      { title: "Project" },
      { title: "Branch" },
      { title: "# Mod" },
      { title: "Commit" },
      { title: "Marks" },
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

    return expect(action.act(project)).resolves.toStrictEqual(
      new ReportLine({
        Project: "test",
        Branch: "master",
        "# Mod": "0",
        Commit: "123456789012",
        Marks: "a,b",
      }),
    );
  });
});
