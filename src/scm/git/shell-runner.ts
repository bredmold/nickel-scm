import * as child_process from "child_process";
import { logger } from "../../logger";

export interface ProcessResult {
  stdout: string;
  stderr: string;
}

export class ShellRunner {
  constructor(private readonly path: string) {}

  run(command: string): Promise<ProcessResult> {
    logger.debug(`${command} [${this.path}]`);
    return new Promise<any>((resolve, reject) => {
      child_process.exec(
        command,
        { cwd: this.path, encoding: "utf8" },
        (error, stdout, stderr) => {
          if (error) {
            logger.warn(`${this.path}: ${error.message}`);
            reject(error);
          } else {
            resolve({ stdout: stdout, stderr: stderr });
          }
        }
      );
    });
  }
}
