import * as path from "path";
import * as process from "process";

import { ConfigContext, DirectoryContext } from "./config-context";

import { NickelProject } from "./nickel-project";
import { ReportSeparator } from "./nickel-report";

describe("DirectoryContext", () => {
  let context: DirectoryContext;

  beforeEach(() => {
    // This root is presumed to refer to the project root
    const root = process.cwd();
    context = new DirectoryContext(root);
  });

  test("name", () => {
    expect(context.name()).toStrictEqual("nickel-scm");
  });

  test("default label", () => {
    expect(context.label()).toStrictEqual("nickel-scm");
  });

  test("explicit label", () => {
    expect(context.label("foo")).toStrictEqual("foo");
    expect(context.label()).toStrictEqual("foo");
  });

  test("default commit prefix", () => {
    expect(context.commitPrefix()).toStrictEqual(12);
  });

  test("explicit commit prefix", () => {
    expect(context.commitPrefix(10)).toStrictEqual(10);
    expect(context.commitPrefix()).toStrictEqual(10);
  });

  test("parent commit prefix", () => {
    context.commitPrefix(14);
    context.projects("src", (childContext) => {
      expect(childContext.commitPrefix()).toStrictEqual(14);
    });
  });

  test("default safe branches", () => {
    expect(context.safeBranches()).toStrictEqual([]);
  });

  test("explicit safe branches", () => {
    expect(context.safeBranches(["uat"])).toStrictEqual(["uat"]);
    expect(context.safeBranches()).toStrictEqual(["uat"]);
  });

  test("parent safe branches", () => {
    context.safeBranches(["prod"]);
    context.projects("src", (childContext) => {
      expect(childContext.safeBranches()).toStrictEqual(["prod"]);
    });
  });

  test("default branch", () => {
    expect(context.defaultBranch()).toStrictEqual("master");
  });

  test("explicit default branch", () => {
    expect(context.defaultBranch("develop")).toStrictEqual("develop");
    expect(context.defaultBranch()).toStrictEqual("develop");
  });

  test("parent default branch", () => {
    context.defaultBranch("develop");
    context.projects("src", (childContext) => {
      expect(childContext.defaultBranch()).toStrictEqual("develop");
    });
  });

  test("default pruneOnFetch", () => {
    expect(context.pruneOnFetch()).toStrictEqual(false);
  });

  test("explicit pruneOnFetch", () => {
    expect(context.pruneOnFetch(true)).toStrictEqual(true);
    expect(context.pruneOnFetch()).toStrictEqual(true);
  });

  test("parent pruneOnFetch", () => {
    context.projects("src", (childContext) => {
      expect(childContext.pruneOnFetch()).toStrictEqual(false);
      context.pruneOnFetch(true);
      expect(childContext.pruneOnFetch()).toStrictEqual(true);
    });
  });
});

describe("RepositoryContext", () => {
  let parent: DirectoryContext;

  beforeEach(() => {
    const cwd = process.cwd();
    const parentPath = path.dirname(cwd);
    parent = new DirectoryContext(parentPath);
  });

  test("toNickelProjectConfig", () => {
    parent.git("nickel-scm", (nickel) => {
      expect(nickel.toNickelProjectConfig()).toStrictEqual({
        name: "nickel-scm",
        path: parent.root,
        defaultBranch: "master",
        safeBranches: [],
        commitPrefix: 12,
        marks: [path.basename(parent.root)],
        pruneOnFetch: false,
      });
    });
  });
});

describe("ConfigContext", () => {
  let context: ConfigContext;

  beforeEach(() => {
    ConfigContext.reportItems = [];
    ConfigContext.root = "";
    ConfigContext.defaultBranch = "master";
    ConfigContext.safeBranches = [];
    ConfigContext.commitPrefix = 12;

    context = new ConfigContext();
  });

  test("set root", () => {
    context.root = "foo";
    expect(ConfigContext.root).toStrictEqual("foo");
  });

  test("set defaultBranch", () => {
    context.defaultBranch = "develop";
    expect(ConfigContext.defaultBranch).toStrictEqual("develop");
  });

  test("set safeBranches", () => {
    context.safeBranches = ["uat"];
    expect(ConfigContext.safeBranches).toStrictEqual(["uat"]);
  });

  test("set pruneOnFetch", () => {
    context.pruneOnFetch = true;
    expect(ConfigContext.pruneOnFetch).toStrictEqual(true);
  });

  test("separator", () => {
    context.separator("sep");
    expect(ConfigContext.reportItems).toHaveLength(1);
    expect(ConfigContext.reportItems[0]).toBeInstanceOf(ReportSeparator);

    const sep: ReportSeparator = ConfigContext
      .reportItems[0] as ReportSeparator;
    expect(sep).toHaveProperty("name", "sep");
  });

  test("project", () => {
    const cwd = process.cwd();
    const parent = path.dirname(cwd);
    context.root = parent;
    context.project("nickel-scm", {
      defaultBranch: "develop",
      marks: ["test"],
    });

    expect(ConfigContext.reportItems).toHaveLength(1);
    expect(ConfigContext.reportItems[0]).toBeInstanceOf(NickelProject);

    const project: NickelProject = ConfigContext
      .reportItems[0] as NickelProject;
    expect(project.name).toStrictEqual("nickel-scm");
    expect(project.defaultBranch).toStrictEqual("develop");
    expect(project.marks).toStrictEqual(["test"]);
  });

  test("projectRoot", () => {
    const cwd = process.cwd();
    const parent = path.dirname(cwd);

    context.projectRoot(parent, (context) => {
      expect(context).toBeInstanceOf(DirectoryContext);

      context.projects("nickel-scm", (childContext) => {
        childContext.label("child");
        childContext.separator(true);
      });

      context.git("nickel-scm", (repoContext) => {
        repoContext.label("repository");
      });
    });

    expect(ConfigContext.reportItems).toHaveLength(1);
    expect(ConfigContext.reportItems[0]).toBeInstanceOf(ReportSeparator);
  });
});
