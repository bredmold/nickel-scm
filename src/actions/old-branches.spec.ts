import * as fs from "fs";
import * as tmp from "tmp";

import { BranchReportLine, BranchReportStatus } from "./branch-reports";

import { NickelProject } from "../nickel-project";
import { OldBranchesReportAction } from "./old-branches";

describe("Old Branches Report", () => {
  let project: NickelProject;
  let action: OldBranchesReportAction;

  beforeEach(() => {
    project = new NickelProject({
      name: "test",
      path: "/application/path",
      defaultBranch: "master",
      safeBranches: [],
      commitPrefix: -1,
      marks: [],
    });
    action = new OldBranchesReportAction();
  });

  test("No old branches", () => {
    project.repository.fetch = jest.fn(() =>
      Promise.resolve({
        updatedBranches: [],
      })
    );

    project.repository.remoteBranches = jest.fn(() =>
      Promise.resolve(["origin/master"])
    );

    project.repository.committerDate = jest.fn((branch) => {
      const now = new Date();
      const commitTs = now.getTime() - 1000 * 3600 * 24;
      return Promise.resolve(new Date(commitTs));
    });

    return expect(action.act(project)).resolves.toStrictEqual(
      new BranchReportLine(
        {
          Project: "test",
          Status: BranchReportStatus.Success,
          "# Candidates": "0",
        },
        []
      )
    );
  });

  test("One old branch", () => {
    project.repository.fetch = jest.fn(() =>
      Promise.resolve({
        updatedBranches: [],
      })
    );

    project.repository.remoteBranches = jest.fn(() =>
      Promise.resolve(["origin/master", "origin/old"])
    );

    project.repository.committerDate = jest.fn((branch) => {
      const ageInDays = branch === "origin/old" ? 30 : 1;
      const now = new Date();
      const commitTs = now.getTime() - 1000 * 3600 * 24 * ageInDays;
      return Promise.resolve(new Date(commitTs));
    });

    return expect(
      action.act(project, ["foo.json", "25"])
    ).resolves.toStrictEqual(
      new BranchReportLine(
        {
          Project: "test",
          Status: BranchReportStatus.Success,
          "# Candidates": "1",
        },
        ["origin/old"]
      )
    );
  });

  test("Report writer", (done) => {
    const testOutputFile = tmp.tmpNameSync();

    try {
      action.post(
        [
          new BranchReportLine(
            {
              Project: "test",
              Status: BranchReportStatus.Success,
              "# Candidates": "1",
            },
            ["origin/old"]
          ),
        ],
        [testOutputFile]
      );

      const branchReportContent: string = fs.readFileSync(testOutputFile, {
        encoding: "UTF8",
      });
      const branchReport = JSON.parse(branchReportContent);

      expect(branchReport).toStrictEqual([
        { project: "test", branch: "origin/old", keep: false },
      ]);
    } finally {
      fs.unlink(testOutputFile, () => done());
    }
  });
});
