import {table, TableUserConfig} from "table";
import {SyncStatus} from "./sync";
import {BuildStatus} from "./build";
import chalk, {Level} from "chalk";

/**
 * Build a report after running some task on each project
 *
 * Header structure:
 *   keys = field names
 *   values = Printable header value
 */
export class NickelReport {
    constructor(private header: any) {
        chalk.enabled = true;
        chalk.level = Level.Basic;
    }

    /**
     * Generate a report string, based on the header structure
     *
     * @param {any[]} rows Report rows, structure determined by the header
     */
    buildReport(rows: any[]): string {
        let dataCount = rows.length + 1;
        let options: TableUserConfig = {
            drawHorizontalLine: (index: number, size: number) => {
                return index === 0 || index === 1 || index === dataCount;
            }
        };

        let data: any[] = [];

        let headerRow = [];
        let idx = 0;
        for (let key in this.header) {
            let value = this.header[key];
            if ((typeof value) === 'string') {
                headerRow.push(chalk.bold(value));
            } else {
                headerRow.push(chalk.bold(value.header));
                if ((typeof value.width) === 'number') {
                    if (options.columns === undefined) {
                        options.columns = {};
                    }
                    options.columns[idx] = {width: value.width};
                }
            }
            ++idx;
        }
        data.push(headerRow);

        rows.forEach(row => this.processRow(row, data));

        return table(data, options);
    }

    /**
     * Process a single data row, generating an appropriate report value
     *
     * @param row Data row in object form
     * @param {any[]} data table data to buildSystem
     */
    private processRow(row: any, data: any[]) {
        let dataRow = [];
        for (let key in this.header) {
            let value = row;
            key.split(/\./).forEach(keySegment => {
                value = value[keySegment];
            });

            // Value transformations
            if (value === SyncStatus.Success || value === BuildStatus.Success) {
                value = chalk.green(value);
            } else if (value === SyncStatus.Failure || value === BuildStatus.Failure) {
                value = chalk.red(value);
            } else if (value === SyncStatus.Dirty) {
                value = chalk.bgYellow.black(value);
            }

            dataRow.push(value);
        }

        data.push(dataRow);
    }
}