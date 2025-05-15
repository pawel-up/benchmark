import type { BenchmarkReport, BenchmarkOptions } from './types.js'
import * as Statistics from './statistics.js'
import type { Logger, ILogObj } from 'tslog'
import { createLogger } from './logger.js'

export type BenchmarkFunction = (arg?: unknown) => unknown | Promise<unknown>

/**
 * A simple benchmarking library for JavaScript.
 *
 * The `Benchmarker` class is responsible for running a benchmark on a given function and collecting
 * statistical data about its performance. It handles warm-up iterations, adaptive inner iterations,
 * outlier removal, and provides methods to calculate various performance metrics.
 */
export class Benchmarker {
  /**
   * The name of the benchmark.
   * This is used to identify the benchmark in reports and logs.
   */
  protected name: string
  /**
   * Holds the timing results of the benchmark.
   * Each value in this array represents the average time (in milliseconds) taken for one iteration
   * of the benchmarked function during a single measurement.
   */
  protected results: number[] = []
  /**
   * The function to be benchmarked.
   * This can be either a synchronous function (`() => void`) or an asynchronous function
   * (`() => Promise<void>`).
   */
  protected fn: BenchmarkFunction
  /**
   * The maximum execution time for the benchmark in milliseconds.
   * The benchmark will stop after this time has elapsed, even if the maximum number of
   * iterations (`maxIterations`) has not been reached.
   */
  protected maxExecutionTime: number
  /**
   * The number of warmup iterations.
   * Warmup iterations are run before the actual measurements to allow the JavaScript engine to
   * optimize the code. These iterations are not included in the final results.
   */
  protected warmupIterations: number
  /**
   * The initial number of inner iterations to run per benchmark iteration.
   * The actual number of inner iterations might be adjusted adaptively based on the `timeThreshold`.
   */
  protected innerIterations: number
  /**
   * The maximum value that the adaptive innerIterations can reach.
   * This prevents the inner loop from becoming too large for very fast functions.
   */
  protected maxInnerIterations: number
  /**
   * The target minimum time (in milliseconds) for the inner loop to execute.
   * If the inner loop completes faster than this threshold, the number of inner iterations
   * is doubled, up to `maxInnerIterations`, to improve measurement accuracy.
   */
  protected timeThreshold: number
  /**
   * The minimum number of samples to keep after removing outliers.
   * This ensures that there are enough samples for statistical analysis.
   */
  protected minSamples: number
  /**
   * The maximum number of iterations to run.
   * This is used to accurately measure the performance of the function.
   * The benchmark will try to run the function for this number of iterations.
   * If the function is too slow, the `maxExecutionTime` will end the benchmark after the set time.
   */
  protected maxIterations: number

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
   * Creates a new Benchmarker instance.
   *
   * @param name - The name of the benchmark.
   * @param fn - The function to benchmark.
   * @param opts - The benchmark run options.
   * @param logger - The logger to use.
   */
  constructor(
    name: string,
    fn: () => unknown | Promise<unknown>,
    opts: BenchmarkOptions = {},
    logger?: Logger<ILogObj>
  ) {
    this.name = name
    this.fn = fn
    const {
      maxExecutionTime = 10000, // 10 seconds
      warmupIterations = 10,
      innerIterations = 10,
      maxInnerIterations = 10000,
      timeThreshold = 1,
      minSamples = 10,
      maxIterations = 100,
      debug = false,
    } = opts
    this.maxExecutionTime = maxExecutionTime
    this.warmupIterations = warmupIterations
    this.innerIterations = innerIterations
    this.maxInnerIterations = maxInnerIterations
    this.timeThreshold = timeThreshold
    this.minSamples = minSamples
    this.maxIterations = maxIterations
    this.debug = debug
    this.logger = logger || createLogger(opts)
    this.logger.info(`Benchmarker "${this.name}" created with options:`, opts)
  }

  /**
   * Runs the benchmark.
   *
   * This method performs the following steps:
   * 1. **Warm-up:** Runs the benchmark function a specified number of times (`warmupIterations`) to
   *    allow the JavaScript engine to optimize the code.
   * 2. **Adaptive Inner Iterations:** Determines a suitable number of `innerIterations` to ensure that
   *    each measurement takes at least `timeThreshold` milliseconds. This is done to reduce the
   *    impact of timer resolution and overhead.
   * 3. **Main Benchmark Loop:** Runs the benchmark for a fixed number of iterations (`maxIterations`)
   *    or until the `maxExecutionTime` is reached. In each iteration, the benchmark function is run
   *    `innerIterations` times, and the average time per iteration is recorded.
   * 4. **Outlier Removal:** Removes outliers from the collected results using the IQR method.
   *
   * @param passValue A value to be passed to the benchmark function. It is primarily used with the Suite
   * integration, were the before/before group/before group benchmark function are called and can potentially
   * prepare a value for the execute benchmark function.
   * @throws Will throw an error if the benchmark function throws an error during any iteration.
   */
  async run(passValue?: unknown): Promise<void> {
    this.results = []
    this.logger.debug(`Starting benchmark "${this.name}"`)
    const overallStartTime = performance.now()
    // Warm-up phase
    this.logger.debug(`Starting warm-up phase (${this.warmupIterations} iterations)`)
    for (let i = 0; i < this.warmupIterations; i++) {
      // To allow the JavaScript engine to optimize the code before the actual measurements begin.
      try {
        await this.fn(passValue)
        this.logger.trace(`Warm-up iteration ${i + 1} completed`)
      } catch (error) {
        this.logger.error(`Error during warmup iteration ${i + 1}:`, error)
        throw error
      }
    }
    this.logger.debug(`Warm-up phase completed`)

    // Adaptive innerIterations
    this.logger.debug(`Starting adaptive inner iterations phase`)
    let adaptiveInnerIterations = this.innerIterations
    let totalTime = 0
    do {
      const startTime = performance.now()
      for (let j = 0; j < adaptiveInnerIterations; j++) {
        try {
          await this.fn(passValue)
        } catch (error) {
          this.logger.error(`Error during adaptive inner iteration ${j + 1}:`, error)
          throw error
        }
      }
      const endTime = performance.now()
      totalTime = endTime - startTime
      if (totalTime < this.timeThreshold && adaptiveInnerIterations < this.maxInnerIterations) {
        adaptiveInnerIterations *= 2
        this.logger.trace(
          `Inner iterations doubled to ${adaptiveInnerIterations} because total time ${totalTime}ms is less than timeThreshold ${this.timeThreshold}ms`
        )
      }
    } while (totalTime < this.timeThreshold && adaptiveInnerIterations < this.maxInnerIterations)
    this.innerIterations = adaptiveInnerIterations
    this.logger.debug(`Adaptive inner iterations phase completed. innerIterations set to ${this.innerIterations}`)

    // Main Benchmark Loop
    for (let i = 0; i < this.maxIterations; i++) {
      this.logger.trace(`Starting main benchmark loop (${this.maxIterations} iterations)`)
      const startTime = performance.now()
      for (let j = 0; j < this.innerIterations; j++) {
        try {
          await this.fn(passValue)
        } catch (error) {
          this.logger.error(`Error during main iteration ${i + 1}, inner iteration ${j + 1}:`, error)
          throw error
        }
      }
      const endTime = performance.now()
      const iterationTime = (endTime - startTime) / this.innerIterations
      this.results.push(iterationTime)
      this.logger.trace(`Main iteration ${i + 1} completed. iterationTime: ${iterationTime.toFixed(4)}ms`)

      // Check if we've exceeded maxExecutionTime
      if (performance.now() - overallStartTime > this.maxExecutionTime) {
        this.logger.warn(
          `Benchmark "${this.name}" exceeded max execution time of ${this.maxExecutionTime}ms. Stopping after ${i + 1} iterations.`
        )
        break
      }
    }
    this.logger.debug(`Main benchmark loop completed. ${this.results.length} iterations completed.`)

    if (this.results.length === 0) {
      this.logger.warn(
        `Benchmark "${this.name}" did not complete any iteration within the max execution time of ${this.maxExecutionTime}ms.`
      )
    }
    this.removeOutliers()
    this.logger.debug(`Benchmark "${this.name}" completed.`)
  }

  /**
   * Removes outliers from the results using the IQR (Interquartile Range) method.
   *
   * Outliers are values that fall below Q1 - 1.5 * IQR or above Q3 + 1.5 * IQR, where Q1 and Q3
   * are the first and third quartiles, respectively, and IQR is the interquartile range (Q3 - Q1).
   *
   * This method is called automatically at the end of the `run()` method.
   */
  protected removeOutliers(): void {
    this.logger.debug(`Starting outlier removal`)
    if (this.results.length < this.minSamples) {
      this.logger.warn(`Benchmark "${this.name}" has less than ${this.minSamples} samples. Skipping outlier removal.`)
      return // Not enough data to calculate quartiles
    }

    // Sort the results
    const sortedResults = [...this.results].sort((a, b) => a - b)

    // Calculate quartiles
    const q1 = Statistics.getPercentile(sortedResults, 25)
    const q3 = Statistics.getPercentile(sortedResults, 75)
    const iqr = q3 - q1

    // Define outlier boundaries
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr

    // Filter out outliers
    const initialLength = this.results.length
    this.results = sortedResults.filter((value) => value >= lowerBound && value <= upperBound)
    const removedCount = initialLength - this.results.length
    this.logger.debug(`Removed ${removedCount} outlier(s).`)
    if (this.results.length < this.minSamples) {
      this.logger.warn(
        `Benchmark "${this.name}" has less than ${this.minSamples} samples after removing outliers. The results might be unreliable.`
      )
    }
  }

  #mean: number | undefined

  /**
   * Calculates the average time per iteration.
   *
   * Each captured result is the average time taken for one iteration of the benchmarked function:
   *
   * ```typescript
   * const iterationTime = (endTime - startTime) / this.innerIterations
   * ```
   *
   * Therefore, `iterationTime` represents the average time (in milliseconds) taken to execute the benchmark function
   * once during that particular iteration of the main loop.
   *
   * The `iterationTime` is captured in the `this.results` array during the main benchmark loop.
   *
   * @returns The average time per iteration in milliseconds.
   */
  protected getAverageTime(): number {
    if (this.results.length === 0) {
      return 0
    }
    if (this.#mean) {
      // We cached the mean value to avoid recalculating it multiple times
      return this.#mean
    }
    const averageTime = Statistics.arithmeticMean(this.results)
    if (averageTime === 0) {
      this.logger.warn(
        `Benchmark "${this.name}" average time is zero. This is likely due to timer resolution limitations. Consider increasing 'timeThreshold' or 'innerIterations'.`
      )
    }
    this.#mean = averageTime
    return averageTime
  }

  /**
   * Calculates the standard deviation of the iteration times.
   *
   * @returns The standard deviation of the iteration times in milliseconds.
   */
  protected getStandardDeviation(): number {
    const { results } = this
    if (!results.length) {
      return 0
    }
    const standardDeviation = Statistics.sampleStandardDeviation(results)
    if (standardDeviation === 0) {
      this.logger.warn(
        `Benchmark "${this.name}" standard deviation is zero. This is likely due to timer resolution limitations. Consider increasing 'timeThreshold' or 'innerIterations'.`
      )
    }
    return standardDeviation
  }

  /**
   * Calculates the number of operations per second.
   *
   * @returns The number of operations per second.
   */
  protected getOperationsPerSecond(): number {
    if (this.results.length === 0) {
      return 0
    }
    // divide the 1000 milliseconds by the average time (in milliseconds) of each function run.
    // The average time is calculated in milliseconds, so we need to divide 1000 by the average time
    // to get the number of operations per second.
    return 1000 / this.getAverageTime()
  }

  /**
   * Gets the relative margin of error (RME).
   *
   * The RME is calculated as the margin of error divided by the average time.
   * This value indicates the precision of the benchmark results.
   * A lower RME indicates more precise results.
   *
   * @returns The relative margin of error (RME) as an absolute value (not a percentage).
   * @see {@link https://en.wikipedia.org/wiki/Relative_margin_of_error}
   */
  protected getRME(): number {
    if (this.results.length === 0) {
      return 0
    }
    const averageTime = this.getAverageTime()
    const rme = Statistics.relativeMarginOfError(averageTime, this.getStandardDeviation(), this.getSampleSize())
    if (averageTime === 0) {
      this.logger.warn(
        `Benchmark "${this.name}" RME is zero. This is likely due to timer resolution limitations. Consider increasing 'timeThreshold' or 'innerIterations'.`
      )
    }
    if (rme > 0.1) {
      this.logger.warn(
        `Benchmark "${this.name}" RME is high (${rme.toFixed(2)}). This indicates that the results are not very precise. Consider increasing 'maxIterations', 'timeThreshold' or 'innerIterations'.`
      )
    }
    return rme
  }

  /**
   * Gets the number of samples.
   *
   * @returns The number of samples.
   */
  protected getSampleSize(): number {
    return this.results.length
  }

  /**
   * Gets the name of the benchmark.
   *
   * @returns The name of the benchmark.
   */
  protected getName(): string {
    return this.name
  }

  /**
   * Gets the results of the benchmark.
   *
   * @returns The results of the benchmark.
   */
  protected getResults(): number[] {
    return this.results
  }

  /**
   * Gets the margin of error.
   *
   * @returns The margin of error.
   */
  protected getMarginOfError(): number {
    if (this.results.length === 0) {
      return 0
    }
    return Statistics.marginOfError(this.getStandardDeviation(), this.getSampleSize())
  }

  /**
   * Gets the standard error of the mean.
   *
   * @returns The standard error of the mean.
   */
  protected getStandardErrorOfTheMean(): number {
    if (this.results.length === 0) {
      return 0
    }
    return this.getStandardDeviation() / Math.sqrt(this.results.length)
  }

  /**
   * Gets the sample variance.
   *
   * @returns The sample variance.
   */
  protected getSampleVariance(): number {
    if (this.results.length === 0) {
      return 0
    }
    return Statistics.sampleVariance(this.results)
  }

  /**
   * Gets the median of the benchmark results.
   *
   * @returns The median of the benchmark results.
   */
  protected getMedian(): number {
    const sample = this.getResults()
    if (sample.length === 0) {
      return 0
    }
    return Statistics.median(sample)
  }

  /**
   * Generates a report with the benchmark results.
   *
   * @returns The benchmark report.
   */
  getReport(): BenchmarkReport {
    return {
      kind: 'benchmark',
      name: this.getName(),
      ops: this.getOperationsPerSecond(),
      rme: this.getRME(),
      stddev: this.getStandardDeviation(),
      mean: this.getAverageTime(),
      me: this.getMarginOfError(),
      sample: this.getResults(),
      sem: this.getStandardErrorOfTheMean(),
      variance: this.getSampleVariance(),
      size: this.getSampleSize(),
      median: this.getMedian(),
      date: new Date().toLocaleString(),
    }
  }
}
