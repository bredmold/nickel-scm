import {table} from "table";
import * as c from 'ansi-colors';
import {SyncResult, SyncStatus} from "./sync";
import {BuildStatus} from "./build";

/**
 * Build a report after running some task on each project
 *
 * Header structure:
 *   keys = field names
 *   values = Printable header value
 */
export class NickelReport {
    constructor(private header: any) {}

    /**
     * Generate a report string, based on the header structure
     *
     * @param {any[]} rows Report rows, structure determined by the header
     */
    buildReport(rows: any[]): string {
        let data: any[] = [];

        let headerRow = [];
        for (let key in this.header) {
            let value = this.header[key];
            headerRow.push(c.bold(value));
        }
        data.push(headerRow);

        rows.forEach(row => this.processRow(row, data));

        let options = {
            drawHorizontalLine: (index: number, size: number) => {
                return index === 0 || index === 1 || index === size;
            }
        };
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
                value = c.green(value);
            } else if (value === SyncStatus.Failure || value === BuildStatus.Failure) {
                value = c.red(value);
            }

            dataRow.push(value);
        }

        data.push(dataRow);
    }
}