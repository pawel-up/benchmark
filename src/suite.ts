import { Benchmarker, type BenchmarkFunction } from './benchmark.js'
import type { ReportBenchmarkInit, Reporter } from './reporters/reporter.js'
import type { BenchmarkOptions, BenchmarkReport, SuiteReport, SuiteInit } from './types.js'
import type { Logger, ILogObj } from 'tslog'
import { SuiteConfig } from './suite_config.js'

interface BenchmarkSuiteEventMap {
  'before-run': CustomEvent<{ name: string }>
  'after-run': CustomEvent<{ name: string; report: BenchmarkReport }>
  'error': CustomEvent<{ name: string; error: Error }>
}

interface BenchmarkSuiteEntry {
  /**
   * The type of the function to run:
   *
   * - `benchmark`: A benchmark function that will be executed
   * - `setup`: A setup function that will be executed before the benchmark
   */
  type: 'benchmark'
  /**
   * Optional group name for the benchmark.
   */
  group?: string
  /**
   * The name of the benchmark function.
   */
  name: string
  /**
   * The function to run.
   */
  fn: BenchmarkFunction
  /**
   * Optional benchmark options applied to this benchmark only.
   * When set it overrides the options set in the constructor.
   */
  options?: BenchmarkOptions
  /**
   * The benchmark setup function to execute before the benchmark.
   */
  setup?: BenchmarkFunction
}

/**
 * Defines when a reporter should be executed.
 */
export type ReporterExecutionTiming = 'after-each' | 'after-all'

interface SuiteReporterEntry {
  reporter: Reporter
}

/**
 * Represents a suite of benchmarks.
 *
 * ## Execution flow
 *
 * When the `run()` method is called, the following steps are executed:
 *
 * 1. The reporters are initialized.
 * 1. The `before-run` event is dispatched.
 * 1. The group suite setup function is executed (if any, only for the first benchmark).
 * 1. The group benchmark setup function is executed (if any).
 * 1. The benchmark's own setup function is executed (if any).
 * 1. The benchmark function is executed.
 * 1. The report is generated.
 * 1. The benchmark teardown function is executed (if any).
 * 1. The group benchmark teardown function is executed (if any).
 * 1. The group suite teardown function is executed (if any, only for the last benchmark).
 * 1. The `after-each` reporters are called.
 *
 * @fires BenchmarkSuite#before-run - Dispatched before each benchmark is run.
 * @fires BenchmarkSuite#after-run - Dispatched after each benchmark has completed.
 * @fires BenchmarkSuite#error - Dispatched if an error occurs during a benchmark run.
 */
export class Suite extends EventTarget {
  /**
   * The benchmark execution queue.
   */
  protected benchmarks: BenchmarkSuiteEntry[] = []
  protected reports: BenchmarkReport[] = []
  protected options: SuiteConfig
  /**
   * Registered reporters for the suite.
   */
  protected reporters: Map<ReporterExecutionTiming, SuiteReporterEntry[]> = new Map<
    ReporterExecutionTiming,
    SuiteReporterEntry[]
  >()
  /**
   * The global setup function to be queued in the execution queue.
   * The author has to call the `setup()` method to add it to the execution queue.
   */
  protected benchmarkSetup: BenchmarkFunction | null = null
  /**
   * A list of groups and their corresponding benchmark setup functions.
   * Keys are group names, values are setup functions.
   */
  protected groupBenchmarkSetup = new Map<string, BenchmarkFunction>()
  /**
   * A list of groups and their corresponding benchmark teardown functions.
   * Keys are group names, values are teardown functions.
   */
  protected groupBenchmarkTeardown = new Map<string, BenchmarkFunction>()
  /**
   * A list of groups and their corresponding suite setup functions.
   * Keys are group names, values are setup functions.
   */
  protected groupSuiteSetup = new Map<string, BenchmarkFunction>()
  /**
   * A list of groups and their corresponding suite teardown functions.
   * Keys are group names, values are teardown functions.
   */
  protected groupSuiteTeardown = new Map<string, BenchmarkFunction>()
  /**
   * The name of the benchmark suite.
   * This is used for logging and reporting purposes.
   */
  protected name: string

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
   * Keeps track of the first and last benchmark index for each group.
   */
  protected groupIndex: Map<string, { first: BenchmarkSuiteEntry; last: BenchmarkSuiteEntry }> = new Map<
    string,
    { first: BenchmarkSuiteEntry; last: BenchmarkSuiteEntry }
  >()

  /**
   * It is a map of group names and their corresponding values created by the group setup function.
   * The values are passed to the benchmark setup function as the only argument.
   */
  protected groupGlobalSetupValues: Map<string, unknown> = new Map<string, unknown>()

  /**
   * When the `setup()` method is called, the setup function is hold in here.
   * After the next benchmark is added, the setup function is then added as a property to the benchmark.
   */
  protected pendingSetup?: BenchmarkFunction

  /**
   * A flag to indicate if the configuration has been loaded.
   * This is used to prevent loading the configuration multiple times.
   */
  protected configLoaded = false

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
  constructor(name: string, options?: SuiteInit | SuiteConfig)

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
  constructor(options?: SuiteInit | SuiteConfig)

  /**
   * Creates a new benchmark suite.
   *
   * @param nameOrOptions - The name of the benchmark suite or options for the benchmark suite.
   * @param options - Options for the benchmark suite.
   */
  constructor(nameOrOptions?: SuiteInit | SuiteConfig | string, options?: SuiteInit | SuiteConfig) {
    super()
    if (typeof nameOrOptions === 'string') {
      this.name = nameOrOptions
      this.options = new SuiteConfig(options || {})
    } else {
      this.name = 'Benchmark Suite'
      this.options = new SuiteConfig(nameOrOptions || {})
    }
    this.debug = this.options.debug || false
    this.logger = this.options.logger
    this.logger.info(`Benchmarker "${this.name}" created with options:`, this.options)
  }

  /**
   * Initializes the configuration of the suite.
   * This step is optional and called automatically when the suite is run.
   * However, if not called, the debug mode will not be enabled until the suite is run.
   *
   * @example
   * ```typescript
   * const suite = new Suite('My Suite', { maxExecutionTime: 5000 });
   * await suite.load();
   * ```
   * @returns A promise that resolves when the configuration is loaded.
   */
  async load(): Promise<void> {
    if (this.configLoaded) {
      this.logger.debug(`Configuration for suite "${this.name}" already loaded`)
      return
    }
    this.configLoaded = true
    this.logger.debug(`Loading configuration for suite "${this.name}"`)
    await this.options.load()
  }

  /**
   * Adds a benchmark to the suite.
   *
   * @param name - The name of the benchmark.
   * @param fn - The function to benchmark.
   * @param options - Optional benchmark options applied to this benchmark only.
   * When set it overrides the options set in the constructor.
   */
  add(name: string, fn: BenchmarkFunction, options?: BenchmarkOptions): this {
    this.logger.debug(`Adding benchmark "${name}" to suite "${this.name}"`)
    if (this.benchmarks.some((b) => b.name === name)) {
      this.logger.error(`Benchmark with name "${name}" already exists in suite "${this.name}".`)
      throw new Error(`Benchmark with name "${name}" already exists.`)
    }
    const entry: BenchmarkSuiteEntry = { name, fn, type: 'benchmark', options }
    if (this.pendingSetup) {
      entry.setup = this.pendingSetup
      this.pendingSetup = undefined
      this.logger.debug(`Setup function added to benchmark "${name}" in suite "${this.name}"`)
    }
    this.benchmarks.push(entry)
    this.logger.silly(`Benchmark "${name}" added to suite "${this.name}"`)
    return this
  }

  /**
   * Adds a benchmark to a specific group within the suite.
   * @param groupName - The name of the group.
   * @param name - The name of the benchmark.
   * @param fn - The function to benchmark.
   * @param options - Optional benchmark options applied to this benchmark only.
   * When set it overrides the options set in the constructor.
   */
  group(groupName: string, name: string, fn: BenchmarkFunction, options?: BenchmarkOptions): this {
    this.logger.debug(`Adding benchmark "${name}" to group "${groupName}" in suite "${this.name}"`)
    if (this.benchmarks.some((b) => b.name === name && b.group === groupName)) {
      this.logger.error(`Benchmark with name "${name}" already exists in group "${groupName}" of suite "${this.name}".`)
      throw new Error(`Benchmark with name "${name}" already exists in group "${groupName}".`)
    }
    const entry: BenchmarkSuiteEntry = { name, fn, group: groupName, type: 'benchmark', options }
    if (this.pendingSetup) {
      entry.setup = this.pendingSetup
      this.pendingSetup = undefined
      this.logger.debug(`Setup function added to benchmark "${name}" in suite "${this.name}"`)
    }
    this.benchmarks.push(entry)
    const indexEntry = this.groupIndex.get(groupName) || { first: entry, last: entry }
    indexEntry.last = entry
    this.groupIndex.set(groupName, indexEntry)
    this.logger.silly(`Benchmark "${name}" added to group "${groupName}" in suite "${this.name}"`)
    return this
  }

  /**
   * Adds a reporter to the suite.
   * @param reporter - The reporter to add.
   * @param timing - When the reporter should be executed.
   */
  addReporter(reporter: Reporter, timing: ReporterExecutionTiming): this {
    this.logger.debug(`Adding reporter "${reporter.constructor.name}" to suite "${this.name}" with timing "${timing}"`)
    if (timing !== 'after-each' && timing !== 'after-all') {
      this.logger.error(
        `Invalid timing "${timing}" for reporter "${reporter.constructor.name}" in suite "${this.name}".`
      )
      throw new Error(`Invalid timing "${timing}" for reporter "${reporter.constructor.name}".`)
    }
    const current = this.reporters.get(timing) || []
    current.push({ reporter })
    this.reporters.set(timing, current)
    this.logger.silly(`Reporter "${reporter.constructor.name}" added to suite "${this.name}" with timing "${timing}"`)
    return this
  }

  /**
   * Sets the setup function for the suite.
   * The setup function is then called when adding the `setup()` to the execution queue.
   *
   * @example
   * ```typescript
   * suite.setSetup(() => {
   *   // Setup code here
   * });
   * suite
   *   .setup()
   *   .add('My Benchmark', () => {
   *     // Benchmark code here
   *   })
   *   .setup()
   *   .add('My Benchmark', () => {
   *     // Benchmark code here
   *   })
   *   .run();
   * ```
   * @param fn - The setup function.
   */
  setSetup(fn: BenchmarkFunction): this {
    this.logger.debug(`Setting up the setup function for suite "${this.name}"`)
    this.benchmarkSetup = fn
    this.logger.silly(`Setup the setup function set for suite "${this.name}"`)
    return this
  }

  /**
   * Adds the setup function to the execution queue.
   * The setup function will be executed before any benchmark.
   *
   * @param fn - Optional setup function to add to the execution queue.
   * If not provided, the previously set setup function will be used.
   * @returns The current instance of the suite for chaining.
   * @throws Error if no setup function is defined.
   * @example
   * ```typescript
   * suite
   *   .setSetup(() => {
   *     // Setup code here
   *   })
   *   .setup()
   *   .add('My Benchmark', () => {
   *     // Benchmark code here
   *   })
   *   .setup(() => {
   *      // Setup for the next benchmark only
   *    })
   *   .add('My Benchmark', () => {
   *     // Benchmark code here
   *   })
   *   .run();
   * ```
   */
  setup(fn?: BenchmarkFunction | null): this {
    this.logger.debug(`Adding setup function to the next scheduled benchmark for suite "${this.name}"`)
    const callable = fn || this.benchmarkSetup
    if (!callable) {
      this.logger.error(`Setup function not defined for suite "${this.name}". Use setSetup() first.`)
      throw new Error('Setup function not defined. Use setSetup() first.')
    }
    this.pendingSetup = callable
    this.logger.silly(`Setup function added to the next scheduled benchmark for suite "${this.name}"`)
    return this
  }
  /**
   * Sets the suite setup function for a specific group.
   *
   * This function is executed only once before the first benchmark in the group.
   * It is useful for setting up resources or configurations that are shared across all benchmarks in the group.
   *
   * The value returned by this function is passed to the benchmark's group setup function as the only argument.
   * If the  benchmark's group setup function is not defined, the value is passed to the benchmark's setup function
   * as the only argument.
   * If none of the functions are defined, the value is passed to the benchmark function as the only argument.
   *
   * @param groupName - The name of the group.
   * @param fn - The suite setup function.
   * @returns The current instance of the suite for chaining.
   * @throws Error if a suite setup function for the group already exists.
   */
  setGroupSuiteSetup(groupName: string, fn: BenchmarkFunction): this {
    this.logger.debug(`Setting up the suite setup function for group "${groupName}" in suite "${this.name}"`)
    if (this.groupSuiteSetup.has(groupName)) {
      this.logger.error(`Group suite setup function for group "${groupName}" already defined in suite "${this.name}".`)
      throw new Error(`Group suite setup function for group "${groupName}" already defined.`)
    }
    this.groupSuiteSetup.set(groupName, fn)
    this.logger.silly(`Group suite setup function set for group "${groupName}" in suite "${this.name}"`)
    return this
  }

  setGroupSuiteTeardown(groupName: string, fn: BenchmarkFunction): this {
    this.logger.debug(`Setting up the suite teardown function for group "${groupName}" in suite "${this.name}"`)
    if (this.groupSuiteTeardown.has(groupName)) {
      this.logger.error(
        `Group suite teardown function for group "${groupName}" already defined in suite "${this.name}".`
      )
      throw new Error(`Group suite teardown function for group "${groupName}" already defined.`)
    }
    this.groupSuiteTeardown.set(groupName, fn)
    this.logger.silly(`Group suite teardown function set for group "${groupName}" in suite "${this.name}"`)
    return this
  }
  /**
   * Sets the benchmark setup function for a specific group.
   *
   * The setup function will be executed before each benchmark in the group starts and before
   * the benchmark's `setup()` function.
   *
   * @param groupName - The name of the group.
   * @param fn - The teardown function.
   */
  setGroupBenchmarkSetup(groupName: string, fn: BenchmarkFunction): this {
    this.logger.debug(`Setting up the benchmark setup function for group "${groupName}" in suite "${this.name}"`)
    if (this.groupBenchmarkSetup.has(groupName)) {
      this.logger.error(
        `Group benchmark setup function for group "${groupName}" already defined in suite "${this.name}".`
      )
      throw new Error(`Group benchmark setup function for group "${groupName}" already defined.`)
    }
    this.groupBenchmarkSetup.set(groupName, fn)
    this.logger.silly(`Group benchmark setup function set for group "${groupName}" in suite "${this.name}"`)
    return this
  }
  /**
   * Sets the benchmark teardown function for a specific group.
   *
   * The teardown function will be executed after each benchmark in the group have completed.
   *
   * @param groupName - The name of the group.
   * @param fn - The teardown function.
   */
  setGroupBenchmarkTeardown(groupName: string, fn: BenchmarkFunction): this {
    this.logger.debug(`Setting up the benchmark teardown function for group "${groupName}" in suite "${this.name}"`)
    if (this.groupBenchmarkTeardown.has(groupName)) {
      this.logger.error(
        `Group benchmark teardown function for group "${groupName}" already defined in suite "${this.name}".`
      )
      throw new Error(`Group benchmark teardown function for group "${groupName}" already defined.`)
    }
    this.groupBenchmarkTeardown.set(groupName, fn)
    this.logger.silly(`Group benchmark teardown function set for group "${groupName}" in suite "${this.name}"`)
    return this
  }

  /**
   * Runs all benchmarks in the suite.
   * @returns A promise that resolves when all benchmarks have completed.
   */
  async run(): Promise<SuiteReport> {
    this.reports = []
    this.logger.info(`Starting benchmark suite "${this.name}"`)
    await this.load()
    await this.initializeReporters()
    let passDownValue: unknown | undefined
    for (const benchmark of this.benchmarks) {
      this.dispatchEvent(new CustomEvent('before-run', { detail: { name: benchmark.name } }))
      if (benchmark.group) {
        const firstInGroup = this.groupIndex.get(benchmark.group)?.first
        if (firstInGroup === benchmark) {
          // Group setup function
          const groupSetup = this.groupSuiteSetup.get(benchmark.group)
          if (groupSetup) {
            this.logger.debug(
              `Running group suite setup function for group "${benchmark.group}" in suite "${this.name}" with value`
            )
            passDownValue = await groupSetup(passDownValue)
            // we need to cache the value for the group
            // because the group setup function is executed only once.
            this.groupGlobalSetupValues.set(benchmark.group, passDownValue)
            this.logger.debug(
              `Group suite setup function for group "${benchmark.group}" completed in suite "${this.name}" with value`
            )
          }
        }
        // Benchmark group setup function
        const benchGroupSetup = this.groupBenchmarkSetup.get(benchmark.group)
        if (benchGroupSetup) {
          this.logger.debug(
            `Running group benchmark function for group "${benchmark.group}" in suite "${this.name}" with value`
          )
          // we used the cached value because the group setup function is executed only once.
          passDownValue = await benchGroupSetup(this.groupGlobalSetupValues.get(benchmark.group))
          this.logger.debug(
            `Group benchmark function for group "${benchmark.group}" completed in suite "${this.name}" with value`
          )
        }
      }
      // Benchmark setup function
      if (benchmark.setup) {
        this.logger.debug(`Running benchmark setup function for "${benchmark.name}" in suite "${this.name}"`)
        passDownValue = await benchmark.setup(passDownValue)
        this.logger.debug(`Benchmark setup function for "${benchmark.name}" completed in suite "${this.name}"`)
      }
      this.logger.debug(`Starting benchmark "${benchmark.name}" in suite "${this.name}"`)
      try {
        const benchmarker = new Benchmarker(
          benchmark.name,
          benchmark.fn,
          benchmark.options || this.options,
          this.logger
        )
        await benchmarker.run(passDownValue)
        this.logger.debug(`Benchmark "${benchmark.name}" completed in suite "${this.name}"`)
        const report = benchmarker.getReport()
        if (benchmark.group) {
          // we set it in here because groups are a concept of the suite
          // and not of the benchmark
          report.group = benchmark.group
        }
        this.reports.push(report)
        if (benchmark.group) {
          const benchTeardown = this.groupBenchmarkTeardown.get(benchmark.group)
          if (benchTeardown) {
            this.logger.debug(`Running group benchmark teardown for group "${benchmark.group}" in suite "${this.name}"`)
            passDownValue = await benchTeardown()
            this.logger.debug(
              `Group benchmark teardown function for group "${benchmark.group}" completed in suite "${this.name}"`
            )
          }
          const lastInGroup = this.groupIndex.get(benchmark.group)?.last
          if (lastInGroup === benchmark) {
            const groupTeardown = this.groupSuiteTeardown.get(benchmark.group)
            if (groupTeardown) {
              this.logger.debug(
                `Running group suite teardown function for group "${benchmark.group}" in suite "${this.name}"`
              )
              passDownValue = await groupTeardown(passDownValue)
              this.logger.debug(
                `Group suite teardown function for group "${benchmark.group}" completed in suite "${this.name}"`
              )
            }
          }
        }
        this.dispatchEvent(new CustomEvent('after-run', { detail: { name: benchmark.name, report } }))
        await this.runReporters('after-each', report)
      } catch (error) {
        this.logger.error(`Error during benchmark "${benchmark.name}" in suite "${this.name}":`, error)
        this.dispatchEvent(new CustomEvent('error', { detail: { name: benchmark.name, error } }))
        throw error // Stop execution on error
      }
      passDownValue = undefined // Reset passDownValue for the next benchmark
    }
    this.logger.info(`All benchmarks completed in suite "${this.name}". Running after-all reporters.`)
    await this.runReporters('after-all', this.getReport())
    this.logger.info(`Benchmark suite "${this.name}" completed.`)
    return this.getReport()
  }

  protected async initializeReporters(): Promise<void> {
    this.logger.debug(`Initializing reporters for suite "${this.name}"`)
    const init: ReportBenchmarkInit[] = []
    for (const benchmark of this.benchmarks) {
      init.push({
        name: benchmark.name,
        group: benchmark.group,
      })
    }
    for (const list of this.reporters.values()) {
      for (const { reporter } of list) {
        if (reporter.initialize) {
          this.logger.silly(`Initializing reporter "${reporter.constructor.name}" for suite "${this.name}"`)
          await reporter.initialize({ benchmarks: init })
          this.logger.silly(`Reporter "${reporter.constructor.name}" initialized for suite "${this.name}"`)
        }
      }
    }
    this.logger.debug(`All reporters initialized for suite "${this.name}"`)
  }

  /**
   * Runs the reporters for the specified timing.
   * @param timing - The timing for which to run the reporters.
   * @param data - The data to pass to the reporters.
   */
  protected async runReporters(timing: ReporterExecutionTiming, data: BenchmarkReport | SuiteReport): Promise<void> {
    this.logger.debug(`Running reporters with timing "${timing}" for suite "${this.name}"`)
    const list = this.reporters.get(timing)
    if (!list) {
      this.logger.silly(`No reporters with timing "${timing}" for suite "${this.name}"`)
      return
    }
    for (const { reporter } of list) {
      this.logger.debug(
        `Running reporter "${reporter.constructor.name}" with timing "${timing}" for suite "${this.name}"`
      )
      await reporter.run(data)
      this.logger.silly(`Reporter "${reporter.constructor.name}" completed for suite "${this.name}"`)
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
