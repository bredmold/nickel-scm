import * as Transport from "winston-transport";
import * as winston from "winston";

import { ShellRunner } from "./shell-runner";

interface LogEvent {
  message: string;
  level: string;
}
class TestTransport extends Transport {
  public readonly events: LogEvent[] = [];

  constructor(opts: Transport.TransportStreamOptions) {
    super(opts);
  }

  log(info: LogEvent, next: () => void) {
    this.events.push(info);
    next();
  }
}

describe("Shell Runner", () => {
  let runner: ShellRunner;
  let testTransport: TestTransport;
  let testLogger: winston.Logger;

  beforeEach(() => {
    testTransport = new TestTransport({});
    testTransport.level = "debug";

    testLogger = winston.createLogger({
      level: "debug",
      format: winston.format.combine(
        winston.format.splat(),
        winston.format.simple(),
      ),

      transports: [new winston.transports.Console(), testTransport],
    });

    runner = new ShellRunner(".", testLogger);
  });

  test("run", (done) => {
    runner.run("echo test").then((result) => {
      expect(result).toStrictEqual({
        stdout: "test\n",
        stderr: "",
      });

      const events = testTransport.events.map((e) => {
        return { message: e.message, level: e.level };
      });
      expect(events).toStrictEqual([
        {
          message: "echo test [.]",
          level: "debug",
        },
        {
          message: "echo test [.] STDOUT: test",
          level: "debug",
        },
        {
          message: "echo test [.] STDERR: <EMPTY>",
          level: "debug",
        },
      ]);
      done();
    });
  });

  test("run stderr", () => {
    return expect(
      runner.run('bash -c "echo test 1>&2"'),
    ).resolves.toStrictEqual({
      stdout: "",
      stderr: "test\n",
    });
  });

  test("run error", (done) => {
    runner.run('bash -c "exit 1"').then(
      () => {
        done("unexpected success");
      },
      (error) => {
        expect(error.code).toStrictEqual(1);
        expect(error.message).toStrictEqual(
          'Command failed: bash -c "exit 1"\n',
        );
        done();
      },
    );
  });

  test("multiline output", (done) => {
    runner.run('bash -c "echo line 1 && echo line 2"').then(
      (result) => {
        expect(result.stdout).toStrictEqual("line 1\nline 2\n");

        const messages = testTransport.events.map((event) => event.message);
        expect(messages).toStrictEqual([
          'bash -c "echo line 1 && echo line 2" [.]',
          'bash -c "echo line 1 && echo line 2" [.] STDOUT: \nline 1\nline 2',
          'bash -c "echo line 1 && echo line 2" [.] STDERR: <EMPTY>',
        ]);
        done();
      },
      (error) => done.fail(error),
    );
  });
});
