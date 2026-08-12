import { describe, beforeEach, afterEach, test, expect, vitest } from "vitest";
import * as fs from "fs";
import * as tmp from "tmp";

import { BranchReportLine, BranchReportStatus } from "./branch-reports.js";

import { NickelProject } from "../nickel-project.js";
import { OldBranchesReportAction } from "./old-branches.js";

describe("Old Branches Report", () => {
  let project: NickelProject;
  let action: OldBranchesReportAction;
  let testOutputFile: string;

  beforeEach(() => {
    testOutputFile = tmp.tmpNameSync();
    project = new NickelProject({
      name: "test",
      path: "/application/path",
      defaultBranch: "master",
      safeBranches: [],
      commitPrefix: -1,
      marks: [],
      pruneOnFetch: false,
    });
    action = new OldBranchesReportAction(testOutputFile, 25);
  });

  afterEach(() => {
    if (fs.existsSync(testOutputFile)) fs.unlinkSync(testOutputFile);
  });

  test("No old branches", async () => {
    project.repository.fetch = vitest.fn(() =>
      Promise.resolve({
        updatedBranches: [],
      }),
    );

    project.repository.remoteBranches = vitest.fn(() =>
      Promise.resolve(["origin/master"]),
    );

    project.repository.committerDate = vitest.fn(() => {
      const now = new Date();
      const commitTs = now.getTime() - 1000 * 3600 * 24;
      return Promise.resolve(new Date(commitTs));
    });

    const reportLine = await action.act(project);
    expect(reportLine).toStrictEqual(
      new BranchReportLine(
        {
          Project: "test",
          Status: BranchReportStatus.Success,
          "# Candidates": "0",
        },
        [],
      ),
    );
  });

  test("One old branch", () => {
    project.repository.fetch = vitest.fn(() =>
      Promise.resolve({
        updatedBranches: [],
      }),
    );

    project.repository.remoteBranches = vitest.fn(() =>
      Promise.resolve(["origin/master", "origin/old"]),
    );

    project.repository.committerDate = vitest.fn((branch) => {
      const ageInDays = branch === "origin/old" ? 30 : 1;
      const now = new Date();
      const commitTs = now.getTime() - 1000 * 3600 * 24 * ageInDays;
      return Promise.resolve(new Date(commitTs));
    });

    return expect(action.act(project)).resolves.toStrictEqual(
      new BranchReportLine(
        {
          Project: "test",
          Status: BranchReportStatus.Success,
          "# Candidates": "1",
        },
        ["origin/old"],
      ),
    );
  });

  test("Report writer", async () => {
    await action.post([
      new BranchReportLine(
        {
          Project: "test",
          Status: BranchReportStatus.Success,
          "# Candidates": "1",
        },
        ["origin/old"],
      ),
    ]);

    const branchReportContent: string = fs.readFileSync(testOutputFile, {
      encoding: "utf8",
    });
    const branchReport = JSON.parse(branchReportContent);

    expect(branchReport).toStrictEqual([
      { project: "test", branch: "origin/old", keep: false },
    ]);
  });
});
