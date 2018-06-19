import {table, TableUserConfig} from "table";
import {SyncStatus} from "./sync";
import {BuildStatus} from "./build";
import chalk, {Level} from "chalk";

interface ColumnConfig {
    path: string;
    title: string;
    maxWidth: number;
}

/**
 * Build a report after running some task on each project
 *
 * Header structure:
 *   keys = field names
 *   values = Printable header value
 */
export class NickelReport {
    private columns: ColumnConfig[] = [];

    constructor(header: any) {
        chalk.enabled = true;
        chalk.level = Level.Basic;

        for (let key in header) {
            let title: string;
            let maxWidth: number = -1;

            let value = header[key];
            if ((typeof value) === 'string') {
                title = value;
            } else {
                title = value.header;
                if ((typeof value.width) === 'number') {
                    maxWidth = value.width;
                }
            }

            this.columns.push({path: key, title: title, maxWidth: maxWidth});
        }
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

        data.push(this.columns.map(col => chalk.bold(col.title)));

        rows.forEach(row => this.processRow(row, data));

        for (let rowIdx in data) {
            let row = data[rowIdx];
            for (let colIdx in this.columns) {
                let cell = row[colIdx];
                let config = this.columns[colIdx];

                if (config.maxWidth > 0 && cell.length > config.maxWidth) {
                    if (options.columns === undefined) {
                        options.columns = {};
                    }
                    options.columns[colIdx] = {width: config.maxWidth};
                }

            }
        }

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
        for (let colIdx in this.columns) {
            let key = this.columns[colIdx].path;
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