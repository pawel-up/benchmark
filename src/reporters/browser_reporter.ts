import type { BenchmarkReport, SuiteReport } from '../types.js'
import { Reporter, type ReporterInit } from './reporter.js'
import { validateBenchmarkReport } from '../validators.js'

export interface BrowserReporterOptions {
  /**
   * The output format for the benchmark report.
   * - `short`: one-line summary per benchmark, suitable for suite output.
   * - `long`: expanded `console.table` view with all metrics.
   * @default 'short'
   */
  format?: 'short' | 'long'
  /**
   * Thresholds for color-coding the relative margin of error.
   * @default { yellow: 0.05, red: 0.1 }
   */
  rmeColorThresholds?: ColorThresholds
  /**
   * Thresholds for color-coding the sample standard deviation and margin of error.
   * @default { yellow: 0.01, red: 0.05 }
   */
  stdDevAndMoeColorThresholds?: ColorThresholds
}

/**
 * Thresholds that determine when a metric value transitions from green → yellow → red
 * in the browser console output. Values are compared as absolute numbers (not percentages).
 *
 * @example
 * // RME of 0.03 is green, 0.07 is yellow, 0.12 is red with the defaults below:
 * { yellow: 0.05, red: 0.1 }
 */
export interface ColorThresholds {
  /** Value at or below this is green; above this (but not above `red`) is yellow. */
  yellow: number
  /** Value above this is red. */
  red: number
}

/**
 * CSS strings passed as `%c` arguments to `console.log`.
 * Each entry is a complete inline style declaration applied to the
 * immediately following `%c` placeholder in the format string.
 */
const CSS = {
  /** Bright green — used for metrics within acceptable bounds. */
  green: 'color: #22c55e; font-weight: bold',
  /** Amber — used for metrics approaching a warning threshold. */
  yellow: 'color: #eab308; font-weight: bold',
  /** Red — used for metrics that have exceeded the error threshold. */
  red: 'color: #ef4444; font-weight: bold',
  /** Resets all styling applied by a preceding `%c` rule. */
  reset: 'color: inherit; font-weight: normal',
  /** Bold text only, no color change — used for benchmark name labels. */
  bold: 'font-weight: bold',
}

/**
 * A reporter that prints benchmark results to the browser console.
 * Uses CSS-styled `console.log` for short output and `console.group` + `console.table`
 * for the long format. Has no Node.js dependencies.
 */
export class BrowserReporter extends Reporter {
  protected decFormat0 = new Intl.NumberFormat(undefined, {
    style: 'decimal',
    maximumFractionDigits: 0,
  })

  protected decFormat4 = new Intl.NumberFormat(undefined, {
    style: 'decimal',
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  })

  protected perFormat = new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })

  protected rmeColorThresholds: ColorThresholds
  protected stdDevAndMoeColorThresholds: ColorThresholds
  protected namePadding = 25

  constructor(protected options: BrowserReporterOptions = {}) {
    super()
    this.rmeColorThresholds = options.rmeColorThresholds ?? { yellow: 0.05, red: 0.1 }
    this.stdDevAndMoeColorThresholds = options.stdDevAndMoeColorThresholds ?? { yellow: 0.01, red: 0.05 }
  }

  override async initialize(init: ReporterInit): Promise<void> {
    if (!init.benchmarks || init.benchmarks.length === 0) {
      return
    }
    const max = init.benchmarks.reduce((acc, item) => {
      return Math.max(acc, this.formatName(item.name, item.group).length)
    }, 0)
    this.namePadding = Math.max(this.namePadding, max + 4)
  }

  async run(report: BenchmarkReport | SuiteReport): Promise<void> {
    const { format = 'short' } = this.options
    if (report.kind === 'suite') {
      for (const item of report.results) {
        if (format === 'short') {
          this.reportShort(item)
        } else {
          this.reportLong(item)
        }
      }
    } else {
      if (format === 'short') {
        this.reportShort(report)
      } else {
        this.reportLong(report)
      }
    }
  }

  protected formatName(name: string, group?: string): string {
    return group ? `${name} (${group})` : name
  }

  protected cssForValue(value: number, thresholds: ColorThresholds): string {
    if (value > thresholds.red) return CSS.red
    if (value > thresholds.yellow) return CSS.yellow
    return CSS.green
  }

  /**
   * Prints a single-line summary using CSS-styled browser console output.
   * Example: `  My Benchmark:   1,234,567 ops/sec  ± 2.3%  (100 run(s) sampled)`
   */
  protected reportShort(report: BenchmarkReport): void {
    if (!this.isValidReport(report)) {
      throw new Error('Invalid benchmark report data.')
    }
    const { name, ops, size, rme, group } = report
    const displayName = this.formatName(name, group).padStart(this.namePadding, ' ')
    const opsStr = this.decFormat0.format(ops).padStart(13, ' ')
    const rmeStr = `± ${this.perFormat.format(rme)}`.padStart(8, ' ')
    const sampleStr = `(${this.decFormat0.format(size)} run(s) sampled)`
    const rmeCss = this.cssForValue(rme, this.rmeColorThresholds)

    // eslint-disable-next-line no-console
    console.log(
      `%c${displayName}%c: ${opsStr} ops/sec %c${rmeStr}%c ${sampleStr}`,
      CSS.bold,
      CSS.reset,
      rmeCss,
      CSS.reset
    )
  }

  /**
   * Prints an expanded view using `console.group` and `console.table`.
   */
  protected reportLong(report: BenchmarkReport): void {
    if (!this.isValidReport(report)) {
      throw new Error('Invalid benchmark report data.')
    }
    const displayName = this.formatName(report.name, report.group)
    const rmeCss = this.cssForValue(report.rme, this.rmeColorThresholds)
    const stddevCss = this.cssForValue(report.stddev, this.stdDevAndMoeColorThresholds)
    const moeCss = this.cssForValue(report.me, this.stdDevAndMoeColorThresholds)

    // eslint-disable-next-line no-console
    console.group(`Benchmark: ${displayName}`)
    // eslint-disable-next-line no-console
    console.table({
      'Sample size': { Result: this.decFormat0.format(report.size) },
      'Operations per second': { Result: `${this.decFormat0.format(report.ops)} ops/sec` },
      'Mean execution time': { Result: `${this.decFormat4.format(report.mean * 1000)} µs` },
      'Median execution time': { Result: `${this.decFormat4.format(report.median * 1000)} µs` },
      'Execution time variance': { Result: `${this.decFormat4.format(report.variance)} (ms)²` },
      'Date run': { Result: report.date },
    })
    // Metrics that need color coding are logged separately since console.table doesn't support CSS styling
    // eslint-disable-next-line no-console
    console.log('Relative margin of error (RME): %c%s%c', rmeCss, this.perFormat.format(report.rme), CSS.reset)
    // eslint-disable-next-line no-console
    console.log(
      'Sample standard deviation:      %c%s ms%c',
      stddevCss,
      this.decFormat4.format(report.stddev),
      CSS.reset
    )
    // eslint-disable-next-line no-console
    console.log('Margin of error:                %c%s ms%c', moeCss, this.decFormat4.format(report.me), CSS.reset)
    // eslint-disable-next-line no-console
    console.groupEnd()
  }

  protected isValidReport(report: BenchmarkReport): boolean {
    const issues = validateBenchmarkReport(report)
    if (issues.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Invalid benchmark report:', issues.map((i) => i.message).join(' '))
      return false
    }
    return true
  }
}
