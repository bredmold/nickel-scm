import { vitest, describe, beforeEach, test, expect } from "vitest";
import { NickelProject } from "../nickel-project.js";
import { ReportLine } from "../nickel-report.js";
import { RepositoryCleanupAction } from "./cleanup.js";

describe("Cleanup Action", () => {
  let project: NickelProject;
  let action: RepositoryCleanupAction;

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
    action = new RepositoryCleanupAction();
  });

  test("act", async () => {
    project.repository.status = vitest.fn(() =>
      Promise.resolve({
        modifiedFiles: [],
        branch: "test",
        remoteBranch: "origin/test",
        commit: "123456789012",
        ahead: 0,
        behind: 0,
      }),
    );

    let selectedBranch = "";
    project.repository.selectBranch = vitest.fn((branch: string) => {
      selectedBranch = branch;
      return Promise.resolve(true);
    });

    project.repository.pull = vitest.fn(() =>
      Promise.resolve({
        updatedFiles: [],
      }),
    );

    let deletedBranch = "";
    project.repository.deleteLocalBranch = vitest.fn((branch: string) => {
      deletedBranch = branch;
      return Promise.resolve(true);
    });

    let pruned = "";
    project.repository.prune = vitest.fn((origin: string) => {
      pruned = origin;
      return Promise.resolve([]);
    });

    const line = await action.act(project);
    expect(selectedBranch).toStrictEqual("master");
    expect(deletedBranch).toStrictEqual("test");
    expect(pruned).toStrictEqual("origin");
    expect(line).toStrictEqual(
      new ReportLine({
        Project: "test",
        Branch: "test",
        Status: "clean-success",
      }),
    );
  });

  test("skipped", () => {
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
        Status: "clean-skip",
      }),
    );
  });

  test("dirty", () => {
    project.repository.status = vitest.fn(() =>
      Promise.resolve({
        modifiedFiles: ["a"],
        branch: "test",
        remoteBranch: "origin/test",
        commit: "123456789012",
        ahead: 0,
        behind: 0,
      }),
    );

    return expect(action.act(project)).resolves.toStrictEqual(
      new ReportLine({
        Project: "test",
        Branch: "test",
        Status: "clean-dirty",
      }),
    );
  });
});
