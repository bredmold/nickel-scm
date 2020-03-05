import {GitRepository} from "./git-repository";
import {ShellRunner} from "./shell-runner";

describe('Git Repository', () => {
  let runner: ShellRunner;
  let repository: GitRepository;

  beforeEach(() => {
    const path = '/application/path';
    runner = new ShellRunner(path);
    repository = new GitRepository(path, runner, 12);
  });

  test('pull', () => {
    runner.run = jest.fn(() => {
      return Promise.resolve({
        stdout: [
          'Updating 5c575bb..0ac6634',
          'Fast-forward',
          ' src/main/scala/com/example/Main.scala     | 5 +++++',
          ' src/main/scala/com/example/cli/info.scala | 5 +++++',
          ' 2 files changed, 10 insertions(+)',
        ].join('\n'),
        stderr: '',
      })
    });

    return expect(repository.pull())
      .resolves
      .toStrictEqual({
        updatedFiles: [
          'src/main/scala/com/example/Main.scala',
          'src/main/scala/com/example/cli/info.scala',
        ]
      });
  });

  test('status', () => {
    runner.run = jest.fn(() => Promise.resolve({
      stdout: [
        '# branch.oid bdb09a93b8fcc5ce559287304f9e904f6464fcd5',
        '# branch.head master',
        '# branch.upstream origin/master',
        '# branch.ab +1 -0',
        '1 .M N... 100644 100644 100644 91a2d2c0d311017438880c27890ec8d34e60d25f 91a2d2c0d311017438880c27890ec8d34e60d25f jest.config.js',
        '1 AM N... 000000 100644 100644 0000000000000000000000000000000000000000 e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 src/logger.ts',
      ].join('\n'),
      stderr: '',
    }));

    return expect(repository.status())
      .resolves
      .toStrictEqual({
        modifiedFiles: ['jest.config.js', 'src/logger.ts'],
        branch: 'master',
        remoteBranch: 'origin/master',
        commit: 'bdb09a93b8fc',
        ahead: 1,
        behind: 0
      });
  });

  test('selectBranch', done => {
    let actualCommand: string = '';
    runner.run = jest.fn(command => {
      actualCommand = command;
      return Promise.resolve({
        stdout: [
          'Switched to branch \'master\'',
          'Your branch is up to date with \'origin/master\'.',
        ].join('\n'),
        stderr: ''
      });
    });

    repository
      .selectBranch('testBranch')
      .then(() => {
        expect(actualCommand).toBe('git checkout testBranch');
        done();
      }, e => done(e));
  });

  test('deleteLocalBranch', done => {
    let actualCommand: string = '';
    runner.run = jest.fn(command => {
      actualCommand = command;
      return Promise.resolve({
        stdout: [
          'warning: deleting branch \'fix-beta\' that has been merged to',
          '         \'refs/remotes/origin/fix-beta\', but not yet merged to HEAD.',
          'Deleted branch fix-beta (was 24cfe66c).'
        ].join('\n'),
        stderr: ''
      });
    });

    repository
      .deleteLocalBranch('testBranch')
      .then(() => {
        expect(actualCommand).toBe('git branch -d testBranch');
        done();
      }, e => done(e));
  });

  test('prune', () => {
    runner.run = jest.fn(() => Promise.resolve({
      stdout: [
        'Pruning origin',
        'URL: https://github.com/bredmold/nickel-scm.git',
        ' * [pruned] origin/test-branch',
      ].join('\n'),
      stderr: '',
    }));

    return expect(repository.prune('origin'))
      .resolves
      .toStrictEqual(['origin/test-branch']);
  });
});
