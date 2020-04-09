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

  beforeEach(() => {
    project = new NickelProject({
      name: "test",
      path: "/application/path",
      defaultBranch: "master",
      safeBranches: [],
      commitPrefix: -1,
      marks: [],
    });
    action = new GuidedBranchRemovalAction();
  });

  test("Empty report", async (done) => {
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

    const tmpFile = tmp.tmpNameSync();
    try {
      fs.writeFileSync(tmpFile, "[]");

      const reportLine = await action.act(project, [tmpFile]);
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
    } finally {
      fs.unlink(tmpFile, () => done());
    }
  });

  test("One branch, to be kept", async (done) => {
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

    const tmpFile = tmp.tmpNameSync();
    try {
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

      const reportLine = await action.act(project, [tmpFile]);
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
    } finally {
      fs.unlink(tmpFile, () => done());
    }
  });

  test("One branch, to delete", async (done) => {
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

    const tmpFile = tmp.tmpNameSync();
    try {
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

      const reportLine = await action.act(project, [tmpFile]);
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
    } finally {
      fs.unlink(tmpFile, () => done());
    }
  });

  test("Fetch result show name change", async (done) => {
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

    const tmpFile = tmp.tmpNameSync();
    try {
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

      const reportLine = await action.act(project, [tmpFile]);
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
    } finally {
      fs.unlink(tmpFile, () => done());
    }
  });
});
