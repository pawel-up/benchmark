import { Table } from 'console-table-printer'
import chalk from 'chalk'
import type { BenchmarkReport, SuiteReport } from '../types.js'
import { Reporter, ReporterInit } from './reporter.js'
import type { Logger, ILogObj } from 'tslog'
import { createLogger } from '../logger.js'
import { validateBenchmarkReport } from '../validators.js'

/**
 * Options for configuring the CliReporter.
 */
export interface CliReporterOptions {
  /**
   * The output format for the benchmark report.
   * The `short` format is better suitable for reporting in a Suite.
   * The `long` format provides more detailed information.
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

export interface ColorThresholds {
  /**
   * The threshold for yellow color-coding.
   *
   * The default value depends on the context its used.
   */
  yellow: number
  /**
   * The threshold for red color-coding.
   *
   * The default value depends on the context its used.
   */
  red: number
}

/**
 * A reporter that prints benchmark results to the console.
 * It supports two output formats: 'short' and 'long'.
 */
export class CliReporter extends Reporter {
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

  /**
   * Thresholds for color-coding the relative margin of error.
   * @default { yellow: 0.05, red: 0.1 }
   */
  protected rmeColorThresholds: ColorThresholds

  /**
   * Thresholds for color-coding the sample standard deviation and margin of error.
   * @default { yellow: 0.01, red: 0.05 }
   */
  protected stdDevAndMoeColorThresholds: ColorThresholds

  /**
   * Logger instance for logging messages.
   * This is used to log warnings and errors during the benchmark process.
   */
  protected logger: Logger<ILogObj>

  /**
   * The padding for the name column in the output.
   * @default 25
   */
  protected namePadding = 25

  /**
   * A flag indicating whether the reporter has groups.
   */
  protected hasGroups = false

  constructor(
    protected options: CliReporterOptions = {},
    logger?: Logger<ILogObj>
  ) {
    super()
    this.rmeColorThresholds = options.rmeColorThresholds || { yellow: 0.05, red: 0.1 }
    this.stdDevAndMoeColorThresholds = options.stdDevAndMoeColorThresholds || { yellow: 0.01, red: 0.05 }
    this.logger = logger || createLogger({ debug: false, logLevel: 5 })
    this.logger.info(`CLI reporter created with options:`, options)
  }

  override async initialize(init: ReporterInit): Promise<void> {
    if (!init.benchmarks || init.benchmarks.length === 0) {
      return
    }
    const max = init.benchmarks.reduce((max, item) => {
      const displayName = this.formatName(item.name, item.group)
      if (!this.hasGroups && item.group) {
        this.hasGroups = true
      }
      return Math.max(max, displayName.length)
    }, 0)
    this.namePadding = Math.max(this.namePadding, max + 4)
  }

  /**
   * Creates a formatted name for the benchmark.
   *
   * @param name The name of the benchmark.
   * @param group Optional group name for the benchmark.
   * @returns The formatted name of the benchmark.
   */
  protected formatName(name: string, group?: string): string {
    return group ? `${name} (${group})` : name
  }

  /**
   * Prints the benchmark report(s) to the console.
   * @returns A promise that resolves when the report has been printed.
   *
   * @example
   * ```typescript
   * const cliReporter = new CliReporter({ format: 'long' });
   * await cliReporter.run(reports);
   * ```
   */
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

  /**
   * Prints a short summary of the benchmark report to the console.
   * @param report - The benchmark report to print.
   */
  protected reportShort(report: BenchmarkReport): void {
    if (!this.isValidReport(report)) {
      throw new Error('Invalid benchmark report data.')
    }
    const { name, ops, size, rme, group } = report
    const displayName = this.formatName(name, group)
    let str = `${displayName.padStart(this.namePadding, ' ')}: `
    str += `${this.decFormat0.format(ops).padStart(13, ' ')} ops/sec `

    // Color-code the relative margin of error
    const rmeStr = this.perFormat.format(rme)
    str += this.colorCode(`\xb1 ${rmeStr}`.padStart(8, ' '), rme, this.rmeColorThresholds) + ' '

    str += `(${this.decFormat0.format(size)} run(s) sampled)`
    // eslint-disable-next-line no-console
    console.log(str)
  }

  /**
   * Prints a detailed table of the benchmark report to the console.
   * @param report - The benchmark report to print.
   */
  protected reportLong(report: BenchmarkReport): void {
    if (!this.isValidReport(report)) {
      throw new Error('Invalid benchmark report data.')
    }
    const displayName = this.formatName(report.name, report.group)
    const table = new Table({
      title: `Benchmark: ${displayName}`,
    })
    table.addRow({ Measure: 'Sample size', Result: `${this.decFormat0.format(report.size)}` })
    table.addRow({
      Measure: 'Operations per second',
      Result: `${this.decFormat0.format(report.ops)} ops/sec`,
    })
    table.addRow({
      Measure: 'Relative margin of error (RME)',
      Result: this.colorCode(this.perFormat.format(report.rme), report.rme, this.rmeColorThresholds),
    })
    table.addRow({
      Measure: 'Sample standard deviation',
      Result: this.colorCode(
        `${this.decFormat4.format(report.stddev)} ms`,
        report.stddev,
        this.stdDevAndMoeColorThresholds
      ),
    })
    table.addRow({
      Measure: 'Margin of error',
      Result: this.colorCode(`${this.decFormat4.format(report.me)} ms`, report.me, this.stdDevAndMoeColorThresholds),
    })
    table.addRow({
      Measure: 'Sample arithmetic mean',
      Result: `${this.decFormat4.format(report.mean * 1000)} ms`,
    })
    table.addRow({
      Measure: 'Execution Time Variance',
      Result: `${this.decFormat4.format(report.variance)} (ms)^2`,
    })
    table.addRow({
      Measure: 'Date run',
      Result: report.date,
    })
    table.printTable()
  }

  /**
   * Color-codes a string based on a value and thresholds.
   * @param str - The string to color-code.
   * @param value - The value to compare against the thresholds.
   * @param thresholds - The thresholds for color-coding.
   * @returns The color-coded string.
   */
  protected colorCode(str: string, value: number, thresholds: ColorThresholds): string {
    if (value > thresholds.red) {
      return chalk.red(str)
    } else if (value > thresholds.yellow) {
      return chalk.yellow(str)
    } else {
      return chalk.green(str)
    }
  }

  /**
   * Validates the benchmark report data.
   * @param report - The benchmark report to validate.
   * @returns True if the report is valid, false otherwise.
   */
  isValidReport(report: BenchmarkReport): boolean {
    const issues = validateBenchmarkReport(report)

    if (issues.length > 0) {
      this.logger.error('Invalid report:', issues.map((i) => i.message).join(' '))
      return false
    }

    return true
  }
}
