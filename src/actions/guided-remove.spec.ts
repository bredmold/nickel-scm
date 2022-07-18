import * as fs from "fs";
import * as tmp from "tmp";

import {
  GuidedBranchRemovalAction,
  GuidedBranchRemovalStatus,
} from "./guided-remove";

import { NickelProject } from "../nickel-project";
import { ReportLine } from "../nickel-report";

describe("Guided Remove", () => {
  let project: NickelProject;
  let action: GuidedBranchRemovalAction;
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = tmp.tmpNameSync();
    project = new NickelProject({
      name: "test",
      path: "/application/path",
      defaultBranch: "master",
      safeBranches: [],
      commitPrefix: -1,
      marks: [],
      pruneOnFetch: false,
    });
    action = new GuidedBranchRemovalAction(tmpFile);
  });

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  test("Empty report", async () => {
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

    project.repository.fetch = jest.fn(() =>
      Promise.resolve({
        updatedBranches: [],
      })
    );

    fs.writeFileSync(tmpFile, "[]");

    const reportLine = await action.act(project);
    expect(reportLine).toStrictEqual(
      new ReportLine({
        Project: "test",
        Branch: "master",
        Status: GuidedBranchRemovalStatus.Skipped,
        "# Kept": "0",
        "# Removed": "0",
        "# Failed": "0",
      })
    );
  });

  test("One branch, to be kept", async () => {
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

    project.repository.fetch = jest.fn(() =>
      Promise.resolve({
        updatedBranches: [],
      })
    );

    fs.writeFileSync(
      tmpFile,
      JSON.stringify([
        {
          project: "test",
          branch: "origin/nope",
          keep: true,
        },
      ])
    );

    const reportLine = await action.act(project);
    expect(reportLine).toStrictEqual(
      new ReportLine({
        Project: "test",
        Branch: "master",
        Status: GuidedBranchRemovalStatus.Skipped,
        "# Kept": "1",
        "# Removed": "0",
        "# Failed": "0",
      })
    );
  });

  test("One branch, to delete", async () => {
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

    project.repository.fetch = jest.fn(() =>
      Promise.resolve({
        updatedBranches: [],
      })
    );

    project.repository.removeRemoteBranch = jest.fn((remote, branch) => {
      const branchName = `${remote}/${branch}`;
      if (branchName === "origin/nope") {
        return Promise.resolve({
          remote: "origin",
          branch: "origin/nope",
          deleted: true,
        });
      } else {
        return Promise.reject(`Unexpected branch: ${branchName}`);
      }
    });

    fs.writeFileSync(
      tmpFile,
      JSON.stringify([
        {
          project: "test",
          branch: "origin/nope",
          keep: false,
        },
      ])
    );

    const reportLine = await action.act(project);
    expect(reportLine).toStrictEqual(
      new ReportLine({
        Project: "test",
        Branch: "master",
        Status: GuidedBranchRemovalStatus.Success,
        "# Kept": "0",
        "# Removed": "1",
        "# Failed": "0",
      })
    );
  });

  test("Fetch result show name change", async () => {
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

    // Local and remote branch names differ on case
    // This happens commonly on client systems with case-insensitive filesystems
    project.repository.fetch = jest.fn(() =>
      Promise.resolve({
        updatedBranches: [
          {
            flag: "pruned",
            action: "[deleted]",
            remoteBranch: "feature/test",
            trackingBranch: "origin/Feature/test",
          },
          {
            flag: "new ref",
            action: "[added]",
            remoteBranch: "feature/test",
            trackingBranch: "origin/Feature/test",
          },
        ],
      })
    );

    project.repository.removeRemoteBranch = jest.fn((remote, branch) => {
      const branchName = `${remote}/${branch}`;
      if (branchName === "origin/Feature/test") {
        return Promise.resolve({
          remote: "origin",
          branch: "feature/test",
          deleted: true,
        });
      } else {
        return Promise.reject(`Unexpected branch: ${branchName}`);
      }
    });

    fs.writeFileSync(
      tmpFile,
      JSON.stringify([
        {
          project: "test",
          branch: "origin/Feature/test",
          keep: false,
        },
      ])
    );

    const reportLine = await action.act(project);
    expect(reportLine).toStrictEqual(
      new ReportLine({
        Project: "test",
        Branch: "master",
        Status: GuidedBranchRemovalStatus.Success,
        "# Kept": "0",
        "# Removed": "1",
        "# Failed": "0",
      })
    );
  });
});
