import {ShellRunner} from "./shell-runner";

describe('Shell Runner', () => {
  let runner: ShellRunner;

  beforeEach(() => {
    runner = new ShellRunner('.');
  });

  test('run', () => {
    return expect(runner.run('echo test'))
      .resolves
      .toStrictEqual({
        stdout: 'test\n',
        stderr: '',
      });
  });

  test('run stderr', () => {
    return expect(runner.run('bash -c "echo test 1>&2"'))
      .resolves
      .toStrictEqual({
        stdout: '',
        stderr: 'test\n',
      });
  });

  test('run error', done => {
    runner.run('bash -c "exit 1"')
      .then(() => {
          done('unexpected success')
        },
        error => {
          expect(error.code).toStrictEqual(1);
          expect(error.message).toStrictEqual('Command failed: bash -c "exit 1"\n');
          done();
        });
  });

  test('runSync', () => {
    expect(runner.runSync('echo test'))
      .toBe('test\n');
  });

  test('runSync error', () => {
    expect(() => runner.runSync('bash -c "exit 1"'))
      .toThrow();
  });
});
