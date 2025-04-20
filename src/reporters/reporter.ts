import type { BenchmarkReport, SuiteReport } from '../types.js'

/**
 * A base class for all reporters.
 * Reporters are responsible for handling the benchmark results in a specific format or transport.
 */
export abstract class Reporter {
  /**
   * Runs the reporter and processes the benchmark report.
   */
  abstract run(report: BenchmarkReport | SuiteReport): Promise<void>
}
