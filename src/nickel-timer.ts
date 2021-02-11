/**
 * Simple timer class
 */
export class NickelTimer {
  private readonly startTime: Date;

  constructor() {
    this.startTime = new Date();
  }

  /**
   * Elapsed milliseconds
   */
  elapsed(): number {
    const now = new Date();
    return now.valueOf() - this.startTime.valueOf();
  }
}
