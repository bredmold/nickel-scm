import { describe, expect, test, beforeEach } from "vitest";
import Transport from "winston-transport";
import * as winston from "winston";

import { ShellRunner } from "./shell-runner.js";

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

  test("run", async () => {
    const result = await runner.run("echo test");
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
  });

  test("run stderr", () => {
    return expect(
      runner.run('bash -c "echo test 1>&2"'),
    ).resolves.toStrictEqual({
      stdout: "",
      stderr: "test\n",
    });
  });

  test("run error", async () => {
    await expect(runner.run('bash -c "exit 1"')).rejects.toMatchObject({
      code: 1,
      message: 'Command failed: bash -c "exit 1"\n',
    });
  });

  test("multiline output", async () => {
    const result = await runner.run('bash -c "echo line 1 && echo line 2"');
    expect(result.stdout).toStrictEqual("line 1\nline 2\n");

    const messages = testTransport.events.map((event) => event.message);
    expect(messages).toStrictEqual([
      'bash -c "echo line 1 && echo line 2" [.]',
      'bash -c "echo line 1 && echo line 2" [.] STDOUT: \nline 1\nline 2',
      'bash -c "echo line 1 && echo line 2" [.] STDERR: <EMPTY>',
    ]);
  });
});
