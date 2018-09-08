import {table, TableUserConfig} from "table";
import {SyncStatus} from "./actions/sync";
import {BuildStatus} from "./actions/build";
import chalk, {Level} from "chalk";
import {CleanupStatus} from "./actions/cleanup";

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
    private separators: number[] = [0, 1];

    constructor(header: any, separators: number[]) {
        chalk.enabled = true;
        chalk.level = Level.Basic;

        separators.forEach(idx => this.separators.push(idx + 1));

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
                let sepIdx = this.separators.findIndex(sIdx => sIdx === index);
                return (sepIdx >= 0) || (index === dataCount);
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
                if (value === undefined) {
                    value = ' ';
                }
            });

            // Value transformations
            if (value === SyncStatus.Success || value === BuildStatus.Success || value === CleanupStatus.Success) {
                value = chalk.green(value);
            } else if (value === SyncStatus.Failure || value === BuildStatus.Failure || value == CleanupStatus.Failure) {
                value = chalk.red(value);
            } else if (value === SyncStatus.Dirty || value === CleanupStatus.Dirty) {
                value = chalk.bgYellow.black(value);
            }

            dataRow.push(value);
        }

        data.push(dataRow);
    }
}