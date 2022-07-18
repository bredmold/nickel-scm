import { nickelSelector, selectItems } from "./nickel-selector";

import { NickelProject } from "./nickel-project";
import { ReportSeparator } from "./nickel-report";

describe("Nickel Selector", () => {
  let project: NickelProject;
  let separator: ReportSeparator;

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

    separator = new ReportSeparator("test");
  });

  describe("nickelSelector", () => {
    test("No selector => all projects selected", async () => {
      const selector = nickelSelector({
        projects: [],
        paths: [],
        branch: "",
        mark: "",
      });

      expect(selector).toHaveProperty("criteria", "All projects");
      const selection = await selector(project);
      expect(selection).toStrictEqual({
        item: project,
        selected: true,
      });
    });

    test("project list selector positive match", async () => {
      const selector = nickelSelector({
        projects: ["test"],
        paths: [],
        branch: "",
        mark: "",
      });

      expect(selector).toHaveProperty("criteria", "in list: test");
      const selection = await selector(project);
      expect(selection).toStrictEqual({
        item: project,
        selected: true,
      });
    });

    test("project list selector negative match", async () => {
      const selector = nickelSelector({
        projects: ["nope"],
        paths: [],
        branch: "",
        mark: "",
      });

      const selection = await selector(project);
      expect(selection).toStrictEqual({
        item: project,
        selected: false,
      });
    });

    test("project list separator", async () => {
      const selector = nickelSelector({
        projects: ["test"],
        paths: [],
        branch: "",
        mark: "",
      });

      const selection = await selector(separator);
      expect(selection).toStrictEqual({
        item: separator,
        selected: false,
      });
    });

    test("path list selector positive match", async () => {
      const selector = nickelSelector({
        projects: [],
        paths: ["/application"],
        branch: "",
        mark: "",
      });

      expect(selector).toHaveProperty("criteria", "in path list: /application");
      const selection = await selector(project);
      expect(selection).toStrictEqual({
        item: project,
        selected: true,
      });
    });

    test("path list selector negative match", async () => {
      const selector = nickelSelector({
        projects: [],
        paths: ["/nope"],
        branch: "",
        mark: "",
      });

      const selection = await selector(project);
      expect(selection).toStrictEqual({
        item: project,
        selected: false,
      });
    });

    test("path list separator", async () => {
      const selector = nickelSelector({
        projects: [],
        paths: ["/application"],
        branch: "",
        mark: "",
      });

      const selection = await selector(separator);
      expect(selection).toStrictEqual({
        item: separator,
        selected: false,
      });
    });

    test("active branch selector positive match", async () => {
      project.repository.branch = jest.fn(() => Promise.resolve("master"));

      const selector = nickelSelector({
        projects: [],
        paths: [],
        branch: "master",
        mark: "",
      });

      expect(selector).toHaveProperty("criteria", "active branch = master");
      const selection = await selector(project);
      expect(selection).toStrictEqual({
        item: project,
        selected: true,
      });
    });

    test("active branch selector negative match", async () => {
      project.repository.branch = jest.fn(() => Promise.resolve("not-master"));

      const selector = nickelSelector({
        projects: [],
        paths: [],
        branch: "master",
        mark: "",
      });

      const selection = await selector(project);
      expect(selection).toStrictEqual({
        item: project,
        selected: false,
      });
    });

    test("active branch separator", async () => {
      const selector = nickelSelector({
        projects: [],
        paths: [],
        branch: "master",
        mark: "",
      });

      const selection = await selector(separator);
      expect(selection).toStrictEqual({
        item: separator,
        selected: false,
      });
    });

    test("mark positive", async () => {
      const selector = nickelSelector({
        projects: [],
        paths: [],
        branch: "",
        mark: "a",
      });

      const selection = await selector(project);
      expect(selection).toStrictEqual({
        item: project,
        selected: true,
      });
    });

    test("mark negative", async () => {
      const selector = nickelSelector({
        projects: [],
        paths: [],
        branch: "",
        mark: "no",
      });

      const selection = await selector(project);
      expect(selection).toStrictEqual({
        item: project,
        selected: false,
      });
    });

    test("mark separator", async () => {
      const selector = nickelSelector({
        projects: [],
        paths: [],
        branch: "",
        mark: "a",
      });

      const selection = await selector(separator);
      expect(selection).toStrictEqual({
        item: separator,
        selected: false,
      });
    });

    test("invalid matcher spec", () => {
      expect(() =>
        nickelSelector({
          projects: ["project"],
          paths: [],
          branch: "master",
          mark: "",
        })
      ).toThrow();
    });
  });

  describe("selectItems", () => {
    test("Happy path", async () => {
      const items = await selectItems(
        { projects: [], paths: [], branch: "", mark: "" },
        [project]
      );
      expect(items).toStrictEqual([{ item: project, selected: true }]);
    });

    test("No projects selected", async () => {
      expect.assertions(1);
      try {
        await selectItems(
          { projects: ["nope"], paths: [], branch: "", mark: "" },
          [project]
        );
      } catch (e) {
        expect(e).toMatch(/^No projects meet selection criteria: /);
      }
    });
  });
});
