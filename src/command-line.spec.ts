import { CommanderError } from "commander";
import { GuidedBranchRemovalAction } from "./actions/guided-remove";
import { MergedBranchesReportAction } from "./actions/merged-branches";
import { OldBranchesReportAction } from "./actions/old-branches";
import { RepositoryCleanupAction } from "./actions/cleanup";
import { RepositoryReportAction } from "./actions/report";
import { RepositorySyncAction } from "./actions/sync";
import { parseCommandLine } from "./command-line";

describe("parseCommandLine", () => {
  test("report action", () => {
    const options = parseCommandLine([
      "nickel",
      "command-line.spec.ts",
      "report",
    ]);
    expect(options.action).toBeInstanceOf(RepositoryReportAction);
    expect(options.configScript).toBeUndefined();
    expect(options.logLevel).toStrictEqual("info");
    expect(options.selectors).toStrictEqual({
      projects: [],
      paths: [],
      branch: "",
      mark: "",
    });
  });

  test("sync action", () => {
    const options = parseCommandLine([
      "nickel",
      "command-line.spec.ts",
      "sync",
    ]);
    expect(options.action).toBeInstanceOf(RepositorySyncAction);
  });

  test("cleanup action", () => {
    const options = parseCommandLine([
      "nickel",
      "command-line.spec.ts",
      "cleanup",
    ]);
    expect(options.action).toBeInstanceOf(RepositoryCleanupAction);
  });

  test("mergedReport action", () => {
    const options = parseCommandLine([
      "nickel",
      "command-line.spec.ts",
      "mergedReport",
      "report.json",
    ]);
    expect(options.action).toBeInstanceOf(MergedBranchesReportAction);
    expect(options.action).toHaveProperty("reportFile", "report.json");
  });

  test("guidedRemove action", () => {
    const options = parseCommandLine([
      "nickel",
      "command-line.spec.ts",
      "guidedRemove",
      "report.json",
    ]);
    expect(options.action).toBeInstanceOf(GuidedBranchRemovalAction);
    expect(options.action).toHaveProperty("reportFile", "report.json");
  });

  test("oldBranches action", () => {
    const options = parseCommandLine([
      "nickel",
      "command-line.spec.ts",
      "oldBranches",
      "report.json",
    ]);
    expect(options.action).toBeInstanceOf(OldBranchesReportAction);
    expect(options.action).toHaveProperty("reportFile", "report.json");
    expect(options.action).toHaveProperty("age", 60);
  });

  test("oldBranches action with age", () => {
    const options = parseCommandLine([
      "nickel",
      "command-line.spec.ts",
      "oldBranches",
      "report.json",
      "34",
    ]);
    expect(options.action).toBeInstanceOf(OldBranchesReportAction);
    expect(options.action).toHaveProperty("reportFile", "report.json");
    expect(options.action).toHaveProperty("age", 34);
  });

  test("oldBranches action with invalid age", () => {
    expect(() =>
      parseCommandLine([
        "nickel",
        "command-line.spec.ts",
        "oldBranches",
        "report.json",
        "nope",
      ])
    ).toThrow("Invalid age");
  });

  test("config script", () => {
    const options = parseCommandLine([
      "nickel",
      "command-line.spec.ts",
      "--config",
      "foo.js",
      "sync",
    ]);

    expect(options.configScript).toStrictEqual("foo.js");
  });

  test("log level", () => {
    const options = parseCommandLine([
      "nickel",
      "command-line.spec.ts",
      "--level=debug",
      "sync",
    ]);
    expect(options.logLevel).toStrictEqual("debug");
  });

  test("Invalid log level", () => {
    expect(() =>
      parseCommandLine([
        "nickel",
        "command-line.spec.ts",
        "--level=nope",
        "sync",
      ])
    ).toThrow(CommanderError);
  });

  test("select projects by name", () => {
    const options = parseCommandLine([
      "nickel",
      "command-line.spec.ts",
      "sync",
      "--project",
      "a",
      "b",
    ]);
    expect(options.selectors.projects).toStrictEqual(["a", "b"]);
  });

  test("project directory", () => {
    const options = parseCommandLine([
      "nickel",
      "command-line.spec.ts",
      "sync",
      "--project-dir",
      "a",
      "b",
    ]);
    expect(options.selectors.paths).toStrictEqual(["a", "b"]);
  });

  test("select by branch", () => {
    const options = parseCommandLine([
      "nickel",
      "command-line.spec.ts",
      "--active-branch=branch",
      "sync",
    ]);
    expect(options.selectors.branch).toStrictEqual("branch");
  });

  test("select by mark", () => {
    const options = parseCommandLine([
      "nickel",
      "command-line.spec.ts",
      "sync",
      "--mark",
      "m",
    ]);
    expect(options.selectors.mark).toStrictEqual("m");
  });
});
