import { GitRepository, RemoteBranch } from "./git-repository";

import { ShellRunner } from "./shell-runner";

describe("Git Repository", () => {
  let runner: ShellRunner;
  let repository: GitRepository;

  beforeEach(() => {
    const path = "/application/path";
    runner = new ShellRunner(path);
    repository = new GitRepository(path, runner, 12, false);
  });

  test("pull", () => {
    runner.run = jest.fn(() => {
      return Promise.resolve({
        stdout: [
          "Updating 5c575bb..0ac6634",
          "Fast-forward",
          " src/main/scala/com/example/Main.scala     | 5 +++++",
          " src/main/scala/com/example/cli/info.scala | 5 +++++",
          " 2 files changed, 10 insertions(+)",
        ].join("\n"),
        stderr: "",
      });
    });

    return expect(repository.pull()).resolves.toStrictEqual({
      updatedFiles: [
        "src/main/scala/com/example/Main.scala",
        "src/main/scala/com/example/cli/info.scala",
      ],
    });
  });

  test("pull with prune", () => {
    runner.run = jest.fn((cmd: string) => {
      expect(cmd).toMatch(/ --prune/);

      return Promise.resolve({
        stdout: [
          "From github.com:bredmold/census",
          " - [deleted]         (none)     -> origin/foo",
          "Already up to date.",
        ].join("\n"),
        stderr: "",
      });
    });

    return expect(
      repository.withPruneOnFetch(true).pull(),
    ).resolves.toStrictEqual({
      updatedFiles: [],
    });
  });

  test("status", () => {
    runner.run = jest.fn(() =>
      Promise.resolve({
        stdout: [
          "# branch.oid bdb09a93b8fcc5ce559287304f9e904f6464fcd5",
          "# branch.head master",
          "# branch.upstream origin/master",
          "# branch.ab +1 -0",
          "1 .M N... 100644 100644 100644 91a2d2c0d311017438880c27890ec8d34e60d25f 91a2d2c0d311017438880c27890ec8d34e60d25f jest.config.js",
          "1 AM N... 000000 100644 100644 0000000000000000000000000000000000000000 e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 src/logger.ts",
        ].join("\n"),
        stderr: "",
      }),
    );

    return expect(repository.status()).resolves.toStrictEqual({
      modifiedFiles: ["jest.config.js", "src/logger.ts"],
      branch: "master",
      remoteBranch: "origin/master",
      commit: "bdb09a93b8fc",
      ahead: 1,
      behind: 0,
    });
  });

  test("selectBranch", (done) => {
    let actualCommand = "";
    runner.run = jest.fn((command) => {
      actualCommand = command;
      return Promise.resolve({
        stdout: [
          "Switched to branch 'master'",
          "Your branch is up to date with 'origin/master'.",
        ].join("\n"),
        stderr: "",
      });
    });

    repository.selectBranch("testBranch").then(
      () => {
        expect(actualCommand).toBe("git checkout testBranch");
        done();
      },
      (e) => done(e),
    );
  });

  test("deleteLocalBranch", (done) => {
    let actualCommand = "";
    runner.run = jest.fn((command) => {
      actualCommand = command;
      return Promise.resolve({
        stdout: [
          "warning: deleting branch 'fix-beta' that has been merged to",
          "         'refs/remotes/origin/fix-beta', but not yet merged to HEAD.",
          "Deleted branch fix-beta (was 24cfe66c).",
        ].join("\n"),
        stderr: "",
      });
    });

    repository.deleteLocalBranch("testBranch").then(
      () => {
        expect(actualCommand).toBe("git branch -d testBranch");
        done();
      },
      (e) => done(e),
    );
  });

  test("prune", () => {
    runner.run = jest.fn(() =>
      Promise.resolve({
        stdout: [
          "Pruning origin",
          "URL: https://github.com/bredmold/nickel-scm.git",
          " * [pruned] origin/test-branch",
        ].join("\n"),
        stderr: "",
      }),
    );

    return expect(repository.prune("origin")).resolves.toStrictEqual([
      "origin/test-branch",
    ]);
  });

  test("branch", () => {
    runner.run = jest.fn(() =>
      Promise.resolve({
        stdout: "test-branch\n",
        stderr: "",
      }),
    );

    return expect(repository.branch()).resolves.toStrictEqual("test-branch");
  });

  test("commit", () => {
    runner.run = jest.fn(() =>
      Promise.resolve({
        stdout: "15be9b216cbaaeb16706bcf3d6eb2031b325c5f4\n",
        stderr: "",
      }),
    );

    return expect(repository.commit()).resolves.toStrictEqual("15be9b216cba");
  });

  test("remoteMergedBranch", () => {
    runner.run = jest.fn(() =>
      Promise.resolve({
        stdout: ["  origin/HEAD -> origin/master", "  origin/test-branch"].join(
          "\n",
        ),
        stderr: "",
      }),
    );

    return expect(repository.remoteMergedBranches()).resolves.toStrictEqual([
      "origin/test-branch",
    ]);
  });

  test("committerDate", () => {
    runner.run = jest.fn(() =>
      Promise.resolve({
        stdout: "2020-03-11T20:25:07+00:00\n",
        stderr: "",
      }),
    );

    const expectedDate = new Date();
    expectedDate.setUTCFullYear(2020);
    expectedDate.setUTCMonth(2);
    expectedDate.setUTCDate(11);
    expectedDate.setUTCHours(20);
    expectedDate.setUTCMinutes(25);
    expectedDate.setUTCSeconds(7);
    expectedDate.setUTCMilliseconds(0);

    return expect(repository.committerDate("master")).resolves.toStrictEqual(
      expectedDate,
    );
  });

  test("allBranches", () => {
    runner.run = jest.fn(() =>
      Promise.resolve({
        stdout: [
          "  master",
          "  remotes/origin/HEAD -> origin/master",
          "  remotes/origin/master",
        ].join("\n"),
        stderr: "",
      }),
    );

    return expect(repository.allBranches()).resolves.toStrictEqual({
      local: ["master"],
      remote: [new RemoteBranch("origin", "master")],
    });
  });

  test("fetch", () => {
    runner.run = jest.fn(() =>
      Promise.resolve({
        stdout: "",
        stderr: [
          "From ssh://github.com/bredmold/nickel-scm",
          " - [deleted]         (none) -> origin/test",
          " * [new branch]      test2  -> origin/test2",
        ].join("\n"),
      }),
    );

    return expect(repository.fetch()).resolves.toStrictEqual({
      updatedBranches: [
        {
          flag: "pruned",
          action: "[deleted]",
          remoteBranch: "(none)",
          trackingBranch: "origin/test",
        },
        {
          flag: "new ref",
          action: "[new branch]",
          remoteBranch: "test2",
          trackingBranch: "origin/test2",
        },
      ],
    });
  });

  test("removeRemoteBranch", (done) => {
    runner.run = jest.fn(() =>
      Promise.resolve({
        stdout: "",
        stderr: "",
      }),
    );

    repository.removeRemoteBranch("origin", "test").then(
      () => {
        expect(runner.run).toHaveBeenCalledWith(
          "git push --delete origin test",
        );
        done();
      },
      (e) => done.fail(e),
    );
  });
});

describe("Remote Branch", () => {
  test("fromBranchName", () => {
    const remoteBranch = RemoteBranch.fromBranchName("remotes/origin/master");
    expect(remoteBranch.remote).toStrictEqual("origin");
    expect(remoteBranch.branch).toStrictEqual("master");
  });

  test("toString", () => {
    const remoteBranch = new RemoteBranch("origin", "test");
    expect(remoteBranch.toString()).toStrictEqual("origin/test");
  });
});
