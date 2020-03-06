import {RepositoryCleanupAction} from "./cleanup";
import {NickelProject} from "../nickel-project";
import {ReportLine} from "../nickel-report";

describe('Cleanup Action', () => {
  let project: NickelProject;
  let action: RepositoryCleanupAction;

  beforeEach(() => {
    project = new NickelProject({
      name: 'test',
      path: '/application/path',
      defaultBranch: 'master',
      safeBranches: [],
      commitPrefix: -1,
    });
    action = new RepositoryCleanupAction();
  });

  test('act', done => {
    project.repository.status = jest.fn(() => Promise.resolve({
      modifiedFiles: [],
      branch: 'test',
      remoteBranch: 'origin/test',
      commit: '123456789012',
      ahead: 0,
      behind: 0,
    }));

    let selectedBranch: string = '';
    project.repository.selectBranch = jest.fn(branch => {
      selectedBranch = branch;
      return Promise.resolve()
    });

    project.repository.pull = jest.fn(() => Promise.resolve({
      updatedFiles: [],
    }));

    let deletedBranch: string = '';
    project.repository.deleteLocalBranch = jest.fn(branch => {
      deletedBranch = branch;
      return Promise.resolve();
    });

    let pruned: string = '';
    project.repository.prune = jest.fn(origin => {
      pruned = origin;
      return Promise.resolve([]);
    });

    action
      .act(project)
      .then(line => {
        expect(selectedBranch).toStrictEqual('master');
        expect(deletedBranch).toStrictEqual('test');
        expect(pruned).toStrictEqual('origin');
        expect(line).toStrictEqual(new ReportLine({
          'Project': 'test',
          'Branch': 'test',
          'Status': 'clean-success',
        }));
        done();
      }, e => done(e));
  });

  test('skipped', () => {
    project.repository.status = jest.fn(() => Promise.resolve({
      modifiedFiles: [],
      branch: 'master',
      remoteBranch: 'origin/master',
      commit: '123456789012',
      ahead: 0,
      behind: 0,
    }));

    return expect(action.act(project))
      .resolves
      .toStrictEqual(new ReportLine({
        'Project': 'test',
        'Branch': 'master',
        'Status': 'clean-skip',
      }));
  });

  test('dirty', () => {
    project.repository.status = jest.fn(() => Promise.resolve({
      modifiedFiles: ['a'],
      branch: 'test',
      remoteBranch: 'origin/test',
      commit: '123456789012',
      ahead: 0,
      behind: 0,
    }));

    return expect(action.act(project))
      .resolves
      .toStrictEqual(new ReportLine({
        'Project': 'test',
        'Branch': 'test',
        'Status': 'clean-dirty',
      }));
  });
});
