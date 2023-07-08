import * as fs from "fs";
import * as tmp from "tmp";

import { BranchReportLine, BranchReportStatus } from "./branch-reports";

import { MergedBranchesReportAction } from "./merged-branches";
import { NickelProject } from "../nickel-project";

describe("Merged Branche Report", () => {
  let project: NickelProject;
  let action: MergedBranchesReportAction;
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
    action = new MergedBranchesReportAction(testOutputFile);
  });

  afterEach(() => {
    if (fs.existsSync(testOutputFile)) fs.unlinkSync(testOutputFile);
  });

  test("No updated branches", () => {
    project.repository.fetch = jest.fn(() =>
      Promise.resolve({
        updatedBranches: [],
      }),
    );

    project.repository.remoteMergedBranches = jest.fn(() =>
      Promise.resolve([]),
    );

    return expect(action.act(project)).resolves.toStrictEqual(
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

  test("One updated branch", () => {
    project.repository.fetch = jest.fn(() =>
      Promise.resolve({
        updatedBranches: [],
      }),
    );

    project.repository.remoteMergedBranches = jest.fn(() =>
      Promise.resolve(["origin/master", "origin/merged"]),
    );

    return expect(action.act(project)).resolves.toStrictEqual(
      new BranchReportLine(
        {
          Project: "test",
          Status: BranchReportStatus.Success,
          "# Candidates": "1",
        },
        ["origin/merged"],
      ),
    );
  });

  test("Write the report", () => {
    action.post([
      new BranchReportLine(
        {
          Project: "test",
          Status: BranchReportStatus.Success,
          "# Candidates": "1",
        },
        ["origin/merged"],
      ),
    ]);

    const branchReportContent: string = fs.readFileSync(testOutputFile, {
      encoding: "utf8",
    });
    const branchReport = JSON.parse(branchReportContent);

    expect(branchReport).toStrictEqual([
      { project: "test", branch: "origin/merged", keep: false },
    ]);
  });
});
