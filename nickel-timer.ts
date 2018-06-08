/**
 * Simple timer class
 */
export class NickelTimer {
    private startTime: Date;

    constructor() {
        this.startTime = new Date();
    }

    /**
     * Elapsed milliseconds
     */
    elapsed(): number {
        let now = new Date();
        return now.valueOf() - this.startTime.valueOf();
    }
}