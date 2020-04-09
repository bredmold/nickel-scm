import { NickelProject } from "./nickel-project";
import { ReportSeparator } from "./nickel-report";
import { nickelSelector } from "./nickel-selector";

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
    });

    separator = new ReportSeparator("test");
  });

  test("No selector => all projects selected", () => {
    const selector = nickelSelector({ projects: [], branch: "", mark: "" });

    expect(selector).toHaveProperty("criteria", "All projects");
    return expect(selector(project)).resolves.toStrictEqual({
      item: project,
      selected: true,
    });
  });

  test("project list selector positive match", () => {
    const selector = nickelSelector({
      projects: ["test"],
      branch: "",
      mark: "",
    });

    expect(selector).toHaveProperty("criteria", "in list: test");
    return expect(selector(project)).resolves.toStrictEqual({
      item: project,
      selected: true,
    });
  });

  test("project list selector negative match", () => {
    const selector = nickelSelector({
      projects: ["nope"],
      branch: "",
      mark: "",
    });

    return expect(selector(project)).resolves.toStrictEqual({
      item: project,
      selected: false,
    });
  });

  test("project list separator", () => {
    const selector = nickelSelector({
      projects: ["test"],
      branch: "",
      mark: "",
    });

    return expect(selector(separator)).resolves.toStrictEqual({
      item: separator,
      selected: false,
    });
  });

  test("active branch selector positive match", () => {
    project.repository.branch = jest.fn(() => Promise.resolve("master"));

    const selector = nickelSelector({
      projects: [],
      branch: "master",
      mark: "",
    });

    expect(selector).toHaveProperty("criteria", "active branch = master");
    return expect(selector(project)).resolves.toStrictEqual({
      item: project,
      selected: true,
    });
  });

  test("active branch selector negative match", () => {
    project.repository.branch = jest.fn(() => Promise.resolve("not-master"));

    const selector = nickelSelector({
      projects: [],
      branch: "master",
      mark: "",
    });

    return expect(selector(project)).resolves.toStrictEqual({
      item: project,
      selected: false,
    });
  });

  test("active branch separator", () => {
    const selector = nickelSelector({
      projects: [],
      branch: "master",
      mark: "",
    });

    return expect(selector(separator)).resolves.toStrictEqual({
      item: separator,
      selected: false,
    });
  });

  test("mark positive", () => {
    const selector = nickelSelector({ projects: [], branch: "", mark: "a" });

    return expect(selector(project)).resolves.toStrictEqual({
      item: project,
      selected: true,
    });
  });

  test("mark negative", () => {
    const selector = nickelSelector({ projects: [], branch: "", mark: "no" });

    return expect(selector(project)).resolves.toStrictEqual({
      item: project,
      selected: false,
    });
  });

  test("mark separator", () => {
    const selector = nickelSelector({ projects: [], branch: "", mark: "a" });

    return expect(selector(separator)).resolves.toStrictEqual({
      item: separator,
      selected: false,
    });
  });

  test("invalid matcher spec", () => {
    expect(() =>
      nickelSelector({ projects: ["project"], branch: "master", mark: "" })
    ).toThrow();
  });
});
