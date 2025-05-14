import type { BenchmarkReport, SuiteReport } from '../types.js'

export interface ReporterInit {
  /**
   * The list of benchmark names used to construct a suite.
   * This is used to identify the benchmarks that are part of the suite.
   * @example ['benchmark1', 'benchmark2']
   */
  names: string[]
}

/**
 * A base class for all reporters.
 * Reporters are responsible for handling the benchmark results in a specific format or transport.
 */
export abstract class Reporter {
  /**
   * Runs the reporter and processes the benchmark report.
   */
  abstract run(report: BenchmarkReport | SuiteReport): Promise<void>

  /**
   * Initializes the reporter.
   *
   * This method is called automatically by the Suite class before running the benchmarks.
   * If the reporter needs to perform any setup or initialization tasks, it can be done here.
   */
  initialize?(init: ReporterInit): Promise<void>
}
