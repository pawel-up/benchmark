import { Benchmarker } from './benchmark.js'
import type { BenchmarkOptions } from './types.js'
import { CliReporter, type CliReporterOptions } from './reporters/cli_reporter.js'

/**
 * Runs a single benchmark and outputs the results to the console.
 * @param name - The name of the benchmark.
 * @param fn - The function to benchmark.
 * @param opts - The benchmark run options.
 */
async function runBenchmark(name: string, fn: () => unknown | Promise<unknown>, opts: BenchmarkOptions): Promise<void> {
  const benchmarker = new Benchmarker(name, fn, opts)
  await benchmarker.run()
  const report = benchmarker.getReport()
  const reporter = new CliReporter({ format: 'long' })
  await reporter.run(report)
}

export { runBenchmark, Benchmarker, CliReporter, CliReporterOptions }
export { Reporter } from './reporters/reporter.js'
export { FileReporter, type FileReporterOptions } from './reporters/file_reporter.js'
export type * from './types.js'
export { Suite } from './suite.js'
export * from './compare.js'
export { FileStore, type FileStoreOptions } from './store/file_store.js'
