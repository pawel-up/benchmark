import { Benchmarker } from './benchmark.js'
import type { Reporter } from './reporters/reporter.js'
import type { BenchmarkOptions, BenchmarkReport, SuiteReport } from './types.js'
import type { Logger, ILogObj } from 'tslog'
import { createLogger } from './logger.js'

const setupSymbol = Symbol('setup')

interface BenchmarkSuiteEventMap {
  'before-run': CustomEvent<{ name: string }>
  'after-run': CustomEvent<{ name: string; report: BenchmarkReport }>
  'error': CustomEvent<{ name: string; error: Error }>
}

interface BenchmarkSuiteEntry {
  name: string | typeof setupSymbol
  fn: () => unknown | Promise<unknown>
}

/**
 * Defines when a reporter should be executed.
 */
export type ReporterExecutionTiming = 'after-each' | 'after-all'

interface SuiteReporterEntry {
  reporter: Reporter
  timing: ReporterExecutionTiming
}

/**
 * Represents a suite of benchmarks.
 *
 * @fires BenchmarkSuite#before-run - Dispatched before each benchmark is run.
 * @fires BenchmarkSuite#after-run - Dispatched after each benchmark has completed.
 * @fires BenchmarkSuite#error - Dispatched if an error occurs during a benchmark run.
 */
export class Suite extends EventTarget {
  private benchmarks: BenchmarkSuiteEntry[] = []
  private reports: BenchmarkReport[] = []
  private options: BenchmarkOptions
  private reporters: SuiteReporterEntry[] = []
  private setupFn: (() => unknown | Promise<unknown>) | null = null
  private name: string

  /**
   * Logger instance for logging messages.
   * This is used to log warnings and errors during the benchmark process.
   */
  protected logger: Logger<ILogObj>

  /**
   * When set to true, the benchmark will run in debug mode.
   * This mode is useful for debugging and development purposes.
   * It may slow down the benchmark execution.
   */
  protected debug: boolean

  /**
   * Creates a new benchmark suite.
   *
   * @param name - The name of the benchmark suite.
   * @param options - Options for the benchmark suite.
   *
   * @example
   * ```typescript
   * const suite = new Suite('My Suite', { maxExecutionTime: 5000 });
   * ```
   */
  constructor(name: string, options?: BenchmarkOptions)

  /**
   * Creates a new benchmark suite.
   *
   * @param options - Options for the benchmark suite.
   *
   * @example
   * ```typescript
   * const suite = new Suite({ maxExecutionTime: 5000 });
   * ```
   */
  constructor(options?: BenchmarkOptions)

  /**
   * Creates a new benchmark suite.
   *
   * @param nameOrOptions - The name of the benchmark suite or options for the benchmark suite.
   * @param options - Options for the benchmark suite.
   */
  constructor(nameOrOptions?: BenchmarkOptions | string, options?: BenchmarkOptions) {
    super()
    if (typeof nameOrOptions === 'string') {
      this.name = nameOrOptions
      this.options = options || {}
    } else {
      this.name = 'Benchmark Suite'
      this.options = nameOrOptions || {}
    }
    this.debug = this.options.debug || false
    this.logger = createLogger(this.options)
    this.logger.info(`Benchmarker "${this.name}" created with options:`, this.options)
  }

  /**
   * Adds a benchmark to the suite.
   * @param name - The name of the benchmark.
   * @param fn - The function to benchmark.
   */
  add(name: string, fn: () => unknown | Promise<unknown>): this {
    this.logger.debug(`Adding benchmark "${name}" to suite "${this.name}"`)
    if (this.benchmarks.some((b) => b.name === name)) {
      this.logger.error(`Benchmark with name "${name}" already exists in suite "${this.name}".`)
      throw new Error(`Benchmark with name "${name}" already exists.`)
    }
    this.benchmarks.push({ name, fn })
    this.logger.silly(`Benchmark "${name}" added to suite "${this.name}"`)
    return this
  }

  /**
   * Adds a reporter to the suite.
   * @param reporter - The reporter to add.
   * @param timing - When the reporter should be executed.
   */
  addReporter(reporter: Reporter, timing: ReporterExecutionTiming): this {
    this.logger.debug(`Adding reporter "${reporter.constructor.name}" to suite "${this.name}" with timing "${timing}"`)
    this.reporters.push({ reporter, timing })
    this.logger.silly(`Reporter "${reporter.constructor.name}" added to suite "${this.name}" with timing "${timing}"`)
    return this
  }

  /**
   * Sets the setup function for the suite.
   * @param fn - The setup function.
   */
  setSetup(fn: () => unknown | Promise<unknown>): this {
    this.logger.debug(`Setting up the setup function for suite "${this.name}"`)
    this.setupFn = fn
    this.logger.silly(`Setup the setup function set for suite "${this.name}"`)
    return this
  }

  /**
   * Adds the setup function to the execution queue.
   * The setup function will be executed before any benchmark.
   */
  setup(): this {
    this.logger.debug(`Adding setup function to execution queue for suite "${this.name}"`)
    if (!this.setupFn) {
      this.logger.error(`Setup function not defined for suite "${this.name}". Use setSetup() first.`)
      throw new Error('Setup function not defined. Use setSetup() first.')
    }
    this.benchmarks.push({ name: setupSymbol, fn: this.setupFn })
    this.logger.silly(`Setup function added to execution queue for suite "${this.name}"`)
    return this
  }

  /**
   * Runs all benchmarks in the suite.
   * @returns A promise that resolves when all benchmarks have completed.
   */
  async run(): Promise<SuiteReport> {
    this.reports = []
    this.logger.info(`Starting benchmark suite "${this.name}"`)
    await this.initializeReporters()
    for (const benchmark of this.benchmarks) {
      if (benchmark.name === setupSymbol) {
        this.logger.debug(`Running setup function for suite "${this.name}"`)
        await benchmark.fn()
        this.logger.debug(`Setup function completed for suite "${this.name}"`)
        continue
      }
      this.logger.debug(`Starting benchmark "${benchmark.name}" in suite "${this.name}"`)
      this.dispatchEvent(new CustomEvent('before-run', { detail: { name: benchmark.name } }))
      try {
        const benchmarker = new Benchmarker(benchmark.name, benchmark.fn, this.options, this.logger)
        await benchmarker.run()
        const report = benchmarker.getReport()
        this.reports.push(report)
        this.dispatchEvent(new CustomEvent('after-run', { detail: { name: benchmark.name, report } }))
        this.logger.debug(`Benchmark "${benchmark.name}" completed in suite "${this.name}"`)
        await this.runReporters('after-each', report)
      } catch (error) {
        this.logger.error(`Error during benchmark "${benchmark.name}" in suite "${this.name}":`, error)
        this.dispatchEvent(new CustomEvent('error', { detail: { name: benchmark.name, error } }))
        throw error // Stop execution on error
      }
    }
    this.logger.info(`All benchmarks completed in suite "${this.name}". Running after-all reporters.`)
    await this.runReporters('after-all', this.getReport())
    this.logger.info(`Benchmark suite "${this.name}" completed.`)
    return this.getReport()
  }

  private async initializeReporters(): Promise<void> {
    this.logger.debug(`Initializing reporters for suite "${this.name}"`)
    const names: string[] = []
    for (const benchmark of this.benchmarks) {
      if (benchmark.name !== setupSymbol) {
        names.push(benchmark.name)
      }
    }
    for (const { reporter } of this.reporters) {
      if (reporter.initialize) {
        this.logger.silly(`Initializing reporter "${reporter.constructor.name}" for suite "${this.name}"`)
        await reporter.initialize({ names })
        this.logger.silly(`Reporter "${reporter.constructor.name}" initialized for suite "${this.name}"`)
      }
    }
    this.logger.debug(`All reporters initialized for suite "${this.name}"`)
  }

  /**
   * Runs the reporters for the specified timing.
   * @param timing - The timing for which to run the reporters.
   * @param data - The data to pass to the reporters.
   */
  private async runReporters(timing: ReporterExecutionTiming, data: BenchmarkReport | SuiteReport): Promise<void> {
    this.logger.debug(`Running reporters with timing "${timing}" for suite "${this.name}"`)
    for (const { reporter, timing: reporterTiming } of this.reporters) {
      if (reporterTiming === timing) {
        this.logger.debug(
          `Running reporter "${reporter.constructor.name}" with timing "${timing}" for suite "${this.name}"`
        )
        await reporter.run(data)
        this.logger.silly(`Reporter "${reporter.constructor.name}" completed for suite "${this.name}"`)
      }
    }
    this.logger.debug(`All reporters with timing "${timing}" completed for suite "${this.name}"`)
  }

  /**
   * Dispatches an event to all listeners.
   * @param event - The event name.
   * @param data - The event data.
   */
  override dispatchEvent<K extends keyof BenchmarkSuiteEventMap>(event: BenchmarkSuiteEventMap[K]): boolean {
    return super.dispatchEvent(event)
  }

  /**
   * Gets all reports.
   * @returns All reports.
   */
  getReport(): SuiteReport {
    return {
      kind: 'suite',
      name: this.name,
      results: this.reports,
      date: new Date().toLocaleString(),
    }
  }
}
