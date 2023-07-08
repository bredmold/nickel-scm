import * as child_process from "child_process";
import * as winston from "winston";

import { logger } from "../../logger";

export interface ProcessResult {
  stdout: string;
  stderr: string;
}

export class ShellRunner {
  constructor(
    private readonly path: string,
    private readonly log: winston.Logger = logger,
  ) {}

  run(command: string): Promise<ProcessResult> {
    this.log.debug(`${command} [${this.path}]`);
    return new Promise<ProcessResult>((resolve, reject) => {
      child_process.exec(
        command,
        { cwd: this.path, encoding: "utf8" },
        (error, stdout, stderr) => {
          this.logOutput(command, "STDOUT", stdout);
          this.logOutput(command, "STDERR", stderr);
          if (error) {
            this.log.warn(`${command} [${this.path}]: ${error.message}`);
            reject(error);
          } else {
            resolve({ stdout: stdout, stderr: stderr });
          }
        },
      );
    });
  }

  private logOutput(command: string, label: string, out: string) {
    const level: string = this.log.level;
    const priority: number = this.log.levels[level];
    const debugPriority: number = this.log.levels["debug"];

    if (priority >= debugPriority) {
      let msg = `${command} [${this.path}] ${label}: `;

      const normalized: string = out.trim();
      if (normalized.length <= 0) {
        msg += "<EMPTY>";
      } else {
        const newlineMatch = normalized.match(/\n/);
        if (newlineMatch) {
          msg += "\n";
          msg += normalized;
        } else {
          msg += normalized;
        }
      }

      this.log.debug(msg);
    }
  }
}
