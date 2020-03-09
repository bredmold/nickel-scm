import {NickelProject} from "./nickel-project";
import {nickelSelector} from "./nickel-selector";
import {ReportSeparator} from "./nickel-report";

describe('Nickel Selector', () => {
  let project: NickelProject;
  let separator: ReportSeparator;

  beforeEach(() => {
    project = new NickelProject({
      name: 'test',
      path: '/application/path',
      defaultBranch: 'master',
      safeBranches: [],
      commitPrefix: -1,
    });

    separator = new ReportSeparator('test');
  });

  test('No selector => all projects selected', () => {
    const selector = nickelSelector([], '');

    expect(selector).toHaveProperty('criteria', 'All projects');
    return expect(selector(project))
      .resolves
      .toStrictEqual({item: project, selected: true});
  });

  test('project list selector positive match', () => {
    const selector = nickelSelector(['test'], '');

    expect(selector).toHaveProperty('criteria', 'in list: test');
    return expect(selector(project))
      .resolves
      .toStrictEqual({item: project, selected: true});
  });

  test('project list selector negative match', () => {
    const selector = nickelSelector(['nope'], '');

    return expect(selector(project))
      .resolves
      .toStrictEqual({item: project, selected: false});
  });

  test('project list separator', () => {
    const selector = nickelSelector(['test'], '');

    return expect(selector(separator))
      .resolves
      .toStrictEqual({item: separator, selected: false});
  });

  test('active branch selector positive match', () => {
    project.repository.branch = jest.fn(() => Promise.resolve('master'));

    const selector = nickelSelector([], 'master');

    expect(selector).toHaveProperty('criteria', 'active branch = master');
    return expect(selector(project))
      .resolves
      .toStrictEqual({item: project, selected: true});
  });

  test('active branch selector negative match', () => {
    project.repository.branch = jest.fn(() => Promise.resolve('not-master'));

    const selector = nickelSelector([], 'master');

    return expect(selector(project))
      .resolves
      .toStrictEqual({item: project, selected: false});
  });

  test('active branch separator', () => {
    const selector = nickelSelector([], 'master');

    return expect(selector(separator))
      .resolves
      .toStrictEqual({item: separator, selected: false});
  });

  test('invalid matcher spec', () => {
    expect(() => nickelSelector(['project'], 'master'))
      .toThrow();
  });
});
