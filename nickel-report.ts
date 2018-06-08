import {table} from "table";

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
            headerRow.push(value);
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
     * @param {any[]} data table data to build
     */
    private processRow(row: any, data: any[]) {
        let dataRow = [];
        for (let key in this.header) {
            let context = row;
            key.split(/\./).forEach(keySegment => {
                context = context[keySegment];
            });
            dataRow.push(context);
        }

        data.push(dataRow);
    }
}