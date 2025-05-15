import type { Logger, ILogObj } from 'tslog'

export interface SuiteReport {
  kind: 'suite'
  /**
   * The name of the benchmark suite.
   * This is a human-readable name for the suite.
   * It is used for reporting and logging purposes.
   * @example 'My Benchmark Suite'
   */
  name: string
  /**
   * The date when the benchmark suite was run.
   * This is a string representation of the date and time.
   */
  date: string
  /**
   * The result of each individual benchmark run in the suite.
   */
  results: BenchmarkReport[]
}

/**
 * Represents a benchmark report.
 */
export interface BenchmarkReport {
  kind: 'benchmark'
  /**
   * The name of the benchmark.
   * This is a human-readable name for the benchmark.
   * It is used for reporting and logging purposes.
   * @example 'My Benchmark'
   */
  name: string
  /**
   * Optional group name for the benchmark.
   * This can be used to categorize benchmarks into groups.
   * It is useful for organizing benchmarks in a suite.
   */
  group?: string
  /**
   * The number of operations per second.
   * This is a measure of how many times the benchmarked function can be executed per second.
   * **Higher values indicate better performance.**
   * @example 1000000 (1 million operations per second)
   */
  ops: number
  /**
   * The relative margin of error (RME).
   *
   * This value indicates the precision of the benchmark results.
   *
   * **Lower values indicate more precise results.**
   *
   * It is expressed as an absolute value (not a percentage).
   * @see {@link https://en.wikipedia.org/wiki/Relative_margin_of_error}
   * @example 0.01 (1% relative margin of error)
   */
  rme: number
  /**
   * The sample standard deviation of the execution times.
   *
   * This is a measure of the spread or dispersion of the execution times.
   *
   * **Lower values indicate more consistent performance.**
   * @example 0.001 (1 millisecond standard deviation)
   */
  stddev: number
  /**
   * The sample arithmetic mean of the execution times in seconds.
   *
   * This is the average execution time of the benchmarked function.
   *
   * **Lower values indicate better performance.**
   * @example 0.0001 (0.1 milliseconds average execution time)
   */
  mean: number
  /**
   * The margin of error.
   *
   * This is a measure of the uncertainty in the benchmark results.
   *
   * **Lower values indicate more reliable results.**
   * @example 0.0002 (0.2 milliseconds margin of error)
   */
  me: number
  /**
   * An array of the individual execution times in milliseconds.
   *
   * Each value represents the time taken for one iteration of the benchmarked function.
   * This array can be used for more in-depth analysis of the benchmark results.
   *
   * Note, the Benchmarker produces an ordered array of execution times.
   * The first element is the fastest execution time, and the last element is the slowest.
   * @example [0.1, 0.12, 0.09, 0.11, 0.1]
   */
  sample: number[]
  /**
   * The standard error of the mean.
   *
   * This is a measure of the precision of the sample mean.
   *
   * **Lower values indicate a more precise estimate of the true mean.**
   * @example 0.00005 (0.05 milliseconds standard error of the mean)
   */
  sem: number
  /**
   * The sample variance of the execution times.
   *
   * This is a measure of the spread or dispersion of the execution times.
   *
   * **Lower values indicate more consistent performance.**
   * @example 0.000001 (0.001 milliseconds squared variance)
   */
  variance: number
  /**
   * The number of samples used in the benchmark.
   *
   * This is the number of all function executions.
   *
   * **Higher values generally indicate more reliable results.**
   * @example 100 (100 samples)
   */
  size: number
  /**
   * The date when the benchmark was run.
   *
   * This is a string representation of the date and time.
   */
  date: string
  /**
   * The median of the execution times in seconds.
   *
   * This is the middle execution time of the benchmarked function.
   *
   * **Lower values indicate better performance.**
   * @example 0.0001 (0.1 milliseconds median execution time)
   */
  median: number
}

/**
 * Options for configuring a benchmark run.
 */
export interface BenchmarkOptions {
  /**
   * The maximum execution time in milliseconds.
   * The benchmark will stop after this time has elapsed.
   * @default 10000 (10 seconds)
   */
  maxExecutionTime?: number
  /**
   * The number of warmup iterations.
   * Warmup iterations are run before the actual measurements to allow the JavaScript engine to optimize the code.
   * @default 10
   */
  warmupIterations?: number
  /**
   * The initial number of inner iterations to run per benchmark iteration.
   * The actual number of inner iterations might be adjusted adaptively based on the `timeThreshold`.
   * @default 10
   */
  innerIterations?: number
  /**
   * The maximum value that the adaptive innerIterations can reach.
   * This prevents the inner loop from becoming too large for very fast functions.
   * @default 10000
   */
  maxInnerIterations?: number
  /**
   * The target minimum time (in milliseconds) for the inner loop to execute.
   * If the inner loop completes faster than this threshold, the number of inner iterations
   * is doubled, up to `maxInnerIterations`, to improve measurement accuracy.
   * @default 1
   */
  timeThreshold?: number
  /**
   * The minimum number of samples to keep after removing outliers.
   * This ensures that there are enough samples for statistical analysis.
   * @default 10
   */
  minSamples?: number
  /**
   * The maximum number of iterations to run.
   * This is used to accurately measure the performance of the function.
   * The benchmark will try to run the function for this number of iterations.
   * If the function is too slow, the `maxExecutionTime` will end the benchmark after the set time.
   * @default 100
   */
  maxIterations?: number
  /**
   * When set to true, the benchmark will run in debug mode.
   * This mode is useful for debugging and development purposes.
   * It may slow down the benchmark execution.
   * @default false
   */
  debug?: boolean
  /**
   * The log level used by the `tslog` logger.
   * This can be set to `0` (silly), `1` (trace), `2` (debug), `3` (info), `4` (warn), `5` (error), or `6` (fatal)
   * It is set to 5 if `debug` is false.
   * @default 5
   */
  logLevel?: number
}

export interface FieldValidationMessage {
  /**
   * The field that did not pass validation.
   */
  field: string
  /**
   * The error message
   */
  message: string
  /**
   * The rule that was violated.
   */
  rule: string
}

/**
 * Represents the result of a comparison between two benchmark reports.
 *
 * This interface provides a comprehensive set of statistical measures to help you understand
 * the performance difference between two benchmark runs. Each metric is carefully chosen to
 * provide insights into the magnitude, significance, and reliability of the observed difference.
 */
export interface ComparisonResult {
  /**
   * The first benchmark report being compared.
   */
  a: BenchmarkReport
  /**
   * The second benchmark report being compared.
   */
  b: BenchmarkReport
  /**
   * The t-statistic from the independent two-sample t-test (Welch's t-test).
   *
   * This value is used to determine if there is a statistically significant difference between
   * the means of the two benchmark runs.
   *
   * A larger absolute value of the t-statistic indicates a greater difference between the means.
   *
   * @see {@link https://en.wikipedia.org/wiki/Student%27s_t-test}
   */
  ts: number
  /**
   * The degrees of freedom for the t-test, calculated using the Welch-Satterthwaite equation.
   *
   * This value is used in conjunction with the t-statistic to determine the p-value.
   *
   * @see {@link https://en.wikipedia.org/wiki/Welch%27s_t-test}
   */
  df: number
  /**
   * The p-value from the t-test.
   *
   * This value represents the probability of observing a t-statistic as extreme as, or more
   * extreme than, the one calculated, assuming that there is no real difference between the
   * two groups (the null hypothesis).
   *
   * A smaller p-value (typically <= 0.05) indicates that there is a statistically significant
   * difference between the two benchmark runs.
   *
   * **Important:** Statistical significance does not necessarily imply practical significance.
   * Always consider the effect size (Cohen's d) and the context of the benchmark when
   * interpreting the p-value.
   *
   * @see {@link https://en.wikipedia.org/wiki/P-value}
   */
  p: number
  /**
   * Indicates whether the difference between the two benchmark runs is statistically significant.
   *
   * This is determined by comparing the p-value to a significance level (alpha), typically 0.05.
   *
   * `true` if `p <= alpha`, `false` otherwise.
   */
  different: boolean
  /**
   * Indicates whether `a` is faster than `b`.
   *
   * `true` if `a.mean < b.mean`, `false` otherwise.
   */
  aWins: boolean
  /**
   * The difference between the sample arithmetic means of the two benchmark runs (in seconds).
   *
   * `b.mean - a.mean`
   *
   * A positive value indicates that `b` is slower than `a`.
   * A negative value indicates that `b` is faster than `a`.
   */
  dmean: number
  /**
   * The percentage difference between the sample arithmetic means of the two benchmark runs.
   *
   * `(dmean / a.mean) * 100`
   *
   * A positive value indicates that `b` is slower than `a`.
   * A negative value indicates that `b` is faster than `a`.
   */
  pmean: number
  /**
   * The difference between the operations per second of the two benchmark runs.
   *
   * `b.ops - a.ops`
   *
   * A positive value indicates that `b` has more operations per second than `a`.
   * A negative value indicates that `b` has fewer operations per second than `a`.
   */
  dops: number
  /**
   * The percentage difference between the operations per second of the two benchmark runs.
   *
   * `(dops / a.ops) * 100`
   *
   * A positive value indicates that `b` has more operations per second than `a`.
   * A negative value indicates that `b` has fewer operations per second than `a`.
   */
  pops: number
  /**
   * The lower bound of the 95% confidence interval for the difference in means (in seconds).
   *
   * This value, along with `uci`, provides a range of plausible values for
   * the true difference in means.
   */
  lci: number
  /**
   * The upper bound of the 95% confidence interval for the difference in means (in seconds).
   *
   * This value, along with `lci`, provides a range of plausible values for
   * the true difference in means.
   */
  uci: number
  /**
   * Cohen's d effect size.
   *
   * This is a standardized measure of the magnitude of the difference between the two benchmark
   * runs. It helps determine if the observed difference is practically significant, not just
   * statistically significant.
   *
   * - Small effect: d ≈ 0.2
   * - Medium effect: d ≈ 0.5
   * - Large effect: d ≈ 0.8
   *
   * **Important:** These are general guidelines. The practical significance of a particular
   * Cohen's d value depends on the specific context of the benchmark.
   *
   * @see {@link https://en.wikipedia.org/wiki/Effect_size#Cohen's_d}
   */
  cohensd: number
  /**
   * The standard error of the difference in means.
   *
   * This value represents the precision of the estimated difference in means.
   * A smaller standard error indicates a more precise estimate.
   */
  sed: number
  /**
   * The difference between the sample medians of the two benchmark runs (in seconds).
   *
   * `b.median - a.median`
   *
   * A positive value indicates that `b` is slower than `a`.
   * A negative value indicates that `b` is faster than `a`.
   *
   * The median is more robust to outliers than the mean.
   */
  dmedian: number
  /**
   * The percentage difference between the sample medians of the two benchmark runs.
   *
   * `(dmedian / a.median) * 100`
   *
   * A positive value indicates that `b` is slower than `a`.
   * A negative value indicates that `b` is faster than `a`.
   *
   * The median is more robust to outliers than the mean.
   */
  pmedian: number
}

/**
 * Represents the different output formats supported by the compare function.
 */
export type OutputFormat = 'table' | 'json' | 'csv'

export interface CompareOptions {
  /**
   * The logger to use.
   */
  logger?: Logger<ILogObj>
  /**
   * A filter function to determine which suite reports to include in the comparison.
   * If provided, only suite reports for which this function returns `true` will be included.
   * @param report - The suite report to filter.
   * @returns `true` if the report should be included, `false` otherwise.
   */
  filter?: (report: SuiteReport) => boolean
  /**
   * A sort function to determine the order in which suite reports are compared.
   * If provided, the suite reports will be sorted according to this function before comparison.
   * @param a - The first suite report to compare.
   * @param b - The second suite report to compare.
   * @returns A negative number if `a` should come before `b`, a positive number if `a` should
   * come after `b`, or 0 if they are equal.
   */
  sort?: (a: SuiteReport, b: SuiteReport) => number
}
