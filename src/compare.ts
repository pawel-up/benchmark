/* eslint-disable no-console */
import chalk from 'chalk'
import type { BenchmarkReport, CompareOptions, ComparisonResult, OutputFormat, SuiteReport } from './types.js'
import {
  calculateTStatistic,
  calculateDegreesOfFreedom,
  calculatePValue,
  marginOfError,
  calculateCohensD,
} from './statistics.js'
import { createLogger } from './logger.js'
import { validateBenchmarkReport, validateSuiteReport } from './validators.js'
import { SuiteValidationException } from './exceptions/suite_validation_exception.js'
import { ReportValidationException } from './exceptions/report_validation_exception.js'

/**
 * Represents a function that handles the output of the comparison results.
 */
export type OutputHandler = (results: ComparisonResult[]) => void

/**
 * Compares two benchmark reports and returns the comparison result.
 *
 * The function compares benchmark reports primarily using the independent two-sample t-test (Welch's t-test).
 * This is a good choice because:
 *
 * - **Compares Means**: It focuses on comparing the means (average execution times) of the two benchmark runs.
 * - **Considers Variability**: It takes into account the variability (standard deviation) within
 *   each benchmark's results.
 * - **Handles Unequal Variances**: Welch's t-test handles situations where the variances of the two samples
 *   are different.
 * - **Statistical Significance**: It provides a p-value, which helps determine if the observed difference between
 *   the means is likely due to a real difference in performance or just random chance.
 *
 * @param a The first benchmark report to compare.
 * @param b The second benchmark report to compare.
 * @returns The comparison result.
 */
export function compare(a: BenchmarkReport, b: BenchmarkReport): ComparisonResult {
  const mean1 = a.mean
  const mean2 = b.mean
  const s1 = a.stddev
  const s2 = b.stddev
  const n1 = a.size
  const n2 = b.size
  const ops1 = a.ops
  const ops2 = b.ops
  const median1 = a.median
  const median2 = b.median

  const tStarts = calculateTStatistic(mean1, mean2, s1, s2, n1, n2)
  const df = calculateDegreesOfFreedom(s1, s2, n1, n2)
  const pValue = calculatePValue(tStarts, df)

  const alpha = 0.05
  const isSignificantlyDifferent = pValue <= alpha
  const isReportAFaster = mean1 < mean2
  const diff = mean2 - mean1
  const diffPercent = (diff / mean1) * 100
  const diffOps = ops2 - ops1
  const diffOpsPercent = (diffOps / ops1) * 100

  const moe1 = marginOfError(s1, n1)
  const moe2 = marginOfError(s2, n2)
  const confidenceIntervalLower = diff - (moe1 + moe2)
  const confidenceIntervalUpper = diff + (moe1 + moe2)
  const cohensd = calculateCohensD(mean1, mean2, s1, s2, n1, n2)
  const standardErrorOfTheDifference = Math.sqrt(s1 ** 2 / n1 + s2 ** 2 / n2)
  const medianDifference = median2 - median1
  const medianDifferencePercent = (medianDifference / median1) * 100

  return {
    a,
    b,
    ts: tStarts,
    df,
    p: pValue,
    different: isSignificantlyDifferent,
    aWins: isReportAFaster,
    dmean: diff,
    pmean: diffPercent,
    dops: diffOps,
    pops: diffOpsPercent,
    lci: confidenceIntervalLower,
    uci: confidenceIntervalUpper,
    cohensd,
    sed: standardErrorOfTheDifference,
    dmedian: medianDifference,
    pmedian: medianDifferencePercent,
  }
}

/**
 * Compares the performance of a specific function across multiple suite reports, enabling time-series analysis.
 *
 * This function is designed to track how the performance of a single function changes over time.
 * It takes a function name and an array of `SuiteReport` objects, each representing a benchmark run at a different
 * point in time. It then extracts the benchmark results for the specified function from each suite report and
 * performs pairwise comparisons.
 *
 * **Time-Series Comparison:**
 *
 * The core idea is to treat each `SuiteReport` as a snapshot of performance at a particular time.
 * By comparing the same function across these snapshots, we can observe trends and identify performance
 * regressions or improvements.
 *
 * **Benefits:**
 *
 * - **Performance Tracking:** Easily monitor how changes to your code affect the performance of specific
 *   functions over time.
 * - **Regression Detection:** Quickly identify if a recent change has introduced a performance regression.
 * - **Improvement Validation:** Verify that optimizations have indeed improved performance.
 * - **Long-Term Analysis:** Analyze performance trends over extended periods.
 *
 * **How it Works:**
 *
 * 1.  **Function Identification:** It takes the name of the function you want to analyze.
 * 2.  **Report Extraction:** It searches each `SuiteReport` for a `BenchmarkReport` with the matching function name.
 * 3.  **Pairwise Comparison:** It performs pairwise comparisons between the extracted `BenchmarkReport` objects.
 *     Each comparison is done using the `compare` function, which uses a t-test to determine statistical significance.
 * 4.  **Trend Analysis:** By examining the results of the pairwise comparisons, you can infer whether the function's
 *     performance has improved, degraded, or remained the same over time.
 *
 * **Example:**
 *
 * Suppose you have three `SuiteReport` objects: `report_v1`, `report_v2`, and `report_v3`, representing benchmark
 * runs at different times. You want to see how the performance of the function `myFunction` has changed.
 *
 * ```typescript
 * compareFunction('myFunction', [report_v1, report_v2, report_v3]);
 * ```
 *
 * This will compare `myFunction` in `report_v1` vs. `report_v2`, `report_v1` vs. `report_v3`,
 * and `report_v2` vs. `report_v3`.
 *
 * **Further Improvements:**
 *
 * - **Visualization:** Consider adding a visualization of the comparison (e.g., a graph).
 * - **More Statistical Measures:** Consider adding more statistical measures (e.g., effect size) if needed.
 * - **CLI integration:** Add a CLI command to compare functions.
 *
 * @param functionName - The name of the function to compare.
 * @param suiteReports - An array of suite reports to compare against.
 * @param options - Options for the comparison.
 */
export function compareFunction(
  functionName: string,
  suiteReports: SuiteReport[],
  options: CompareOptions = {}
): ComparisonResult[] {
  const log = options.logger || createLogger({ debug: false, logLevel: 5 })
  log.info(`\nComparing function "${functionName}" across multiple suite reports:`)

  if (!Array.isArray(suiteReports)) {
    throw new Error(`Invalid input: suiteReports must be an array.`)
  }

  // Apply filter if provided
  const filteredReports = options.filter ? suiteReports.filter(options.filter) : suiteReports

  // Apply sort if provided
  const sortedReports = options.sort ? [...filteredReports].sort(options.sort) : filteredReports

  // Filter out reports for the specified function
  const functionReports: BenchmarkReport[] = []
  for (const suiteReport of sortedReports) {
    const suiteIssues = validateSuiteReport(suiteReport)
    if (suiteIssues.length > 0) {
      throw new SuiteValidationException(suiteIssues)
    }
    const report = suiteReport.results.find((r) => r.name === functionName)
    if (report) {
      const reportIssues = validateBenchmarkReport(report)
      if (reportIssues.length > 0) {
        throw new ReportValidationException(reportIssues)
      }
      functionReports.push(report)
    } else {
      throw new Error(`Function "${functionName}" not found in suite report "${suiteReport.name}".`)
    }
  }

  if (functionReports.length < 2) {
    throw new Error(`At least two valid reports for function "${functionName}" are required for comparison.`)
  }

  // Pairwise comparisons
  const comparisonResults: ComparisonResult[] = []
  for (let i = 0; i < functionReports.length; i++) {
    for (let j = i + 1; j < functionReports.length; j++) {
      const a = functionReports[i]
      const b = functionReports[j]
      log.info(`\n--- Comparing "${functionName}" in "${a.date}" vs "${b.date}" ---`)
      const result = compare(a, b)
      comparisonResults.push(result)
    }
  }

  return comparisonResults
}

/**
 * Outputs the comparison results in the specified format.
 *
 * This function takes an array of `ComparisonResult` objects, produced by the `compareFunction`,
 * and outputs them to the console in the specified format. It supports 'table', 'json', and 'csv' formats.
 *
 * The 'table' format provides a human-readable, formatted table output to the console.
 * The 'json' format outputs the results as a JSON string.
 * The 'csv' format outputs the results as a comma-separated values string.
 *
 * If an invalid format is provided, it will log an error to the console and default to the 'table' format.
 *
 * @param results - An array of `ComparisonResult` objects to output.
 * @param format - The desired output format ('table', 'json', or 'csv').
 * @throws Will throw an error if the results array is empty.
 * @throws Will log an error to the console if the format is invalid.
 *
 * @example
 * ```typescript
 * import { compareFunction, outputCompareFunction, SuiteReport, OutputFormat } from '@pawel-up/benchmark';
 * import * as fs from 'fs/promises';
 *
 * async function main() {
 *   // Load suite reports from files (example)
 *   const suiteReport1 = JSON.parse(await fs.readFile('suite_report_1.json', 'utf-8')) as SuiteReport;
 *   const suiteReport2 = JSON.parse(await fs.readFile('suite_report_2.json', 'utf-8')) as SuiteReport;
 *   const suiteReport3 = JSON.parse(await fs.readFile('suite_report_3.json', 'utf-8')) as SuiteReport;
 *   const suiteReport4 = JSON.parse(await fs.readFile('suite_report_4.json', 'utf-8')) as SuiteReport;
 *
 *   const suiteReports = [suiteReport1, suiteReport2, suiteReport3, suiteReport4];
 *
 *   // Get the comparison results
 *   const results = compareFunction('myFunction', suiteReports);
 *
 *   // Output the results in JSON format
 *   outputCompareFunction(results, 'json');
 *
 *   // Output the results in CSV format
 *   outputCompareFunction(results, 'csv');
 *
 *   // Output the results in table format (default)
 *   outputCompareFunction(results, 'table');
 *
 *   // Output the results in an invalid format (will default to table)
 *   outputCompareFunction(results, 'invalid' as OutputFormat);
 * }
 *
 * main().catch(console.error);
 * ```
 */
export function outputCompareFunction(results: ComparisonResult[], format: OutputFormat): void {
  const outputHandler = outputHandlers[format]
  if (!outputHandler) {
    // we will use the error output so it won't interfere with the regular output,
    // which will become helpful when piping CLI output to a file
    console.error(`Invalid output format: ${format}. Using default format (table).`)
    outputHandlers.table(results)
  } else {
    outputHandler(results)
  }
}

/**
 * Handles the output of the comparison results in table format.
 * @param results - The comparison results.
 * @param logger - The logger to use.
 */
const tableOutputHandler: OutputHandler = (results) => {
  for (const result of results) {
    const { a, b } = result
    console.info(`\nComparing "${a.name}" vs "${b.name}":`)

    console.info('\nStatistical Significance Test (Independent Two-Sample t-test):')
    console.info(`  t-statistic: ${result.ts.toFixed(4)}`)
    console.info(`  Degrees of freedom: ${result.df.toFixed(2)}`)
    console.info(`  p-value: ${result.p.toFixed(4)}`)

    const alpha = 0.05
    if (result.different) {
      console.info(
        `  Conclusion: There is a statistically significant difference between "${a.name}" and "${b.name}" (p-value <= ${alpha}).`
      )
      if (result.aWins) {
        console.info(`  "${a.name}" is ${chalk.green('significantly faster')} than "${b.name}".`)
      } else {
        console.info(`  "${b.name}" is ${chalk.green('significantly faster')} than "${a.name}".`)
      }
    } else {
      console.info(
        `  Conclusion: There is no statistically significant difference between "${a.name}" and "${b.name}" (p-value > ${alpha}).`
      )
    }
    console.info(`\nDifferences between runs:`)
    console.info(`  Difference in mean execution time: ${result.dmean.toFixed(4)} secs`)
    console.info(`  Percentage difference in mean execution time: ${result.pmean.toFixed(2)}%`)
    console.info(`  Difference in operations per second: ${result.dops.toFixed(2)} ops/sec`)
    console.info(`  Percentage difference in operations per second: ${result.pops.toFixed(2)}%`)

    console.info(`\nConfidence Interval (95%):`)
    console.info(`  Difference in mean execution time: [${result.lci.toFixed(4)}, ${result.uci.toFixed(4)}] secs`)
    console.info(`  Cohen's d: ${result.cohensd.toFixed(4)}`)
    console.info(`  Standard Error of the Difference: ${result.sed.toFixed(4)}`)
    console.info(`  Median difference: ${result.dmedian.toFixed(4)} secs`)
    console.info(`  Median difference percentage: ${result.pmedian.toFixed(2)}%`)
  }
}

/**
 * Handles the output of the comparison results in JSON format.
 * @param results - The comparison results.
 * @param logger - The logger to use.
 */
const jsonOutputHandler: OutputHandler = (results) => {
  console.info(JSON.stringify(results, null, 2))
}

/**
 * Handles the output of the comparison results in CSV format.
 * @param results - The comparison results.
 * @param logger - The logger to use.
 */
const csvOutputHandler: OutputHandler = (results) => {
  let header = 'Report A Name,Report A Date,Report B Name,Report B Date,'
  header += 't-statistic,Degrees of Freedom,p-value,Significantly Different,'
  header += 'Report A Faster,Mean Difference,Mean Difference %,Ops Difference,'
  header += "Ops Difference %,Confidence Interval Lower,Confidence Interval Upper,Cohen's d"
  header += 'Standard Error of the Difference,Median Difference,Median Difference %'

  const rows = results.map(
    (result) =>
      `${result.a.name},${result.a.date},${result.b.name},${result.b.date},${result.ts.toFixed(
        4
      )},${result.df.toFixed(2)},${result.p.toFixed(4)},${result.different},${
        result.aWins
      },${result.dmean.toFixed(4)},${result.pmean.toFixed(2)}%,${result.dops.toFixed(
        2
      )},${result.pops.toFixed(2)}%,${result.lci.toFixed(
        4
      )},${result.uci.toFixed(4)},${result.cohensd.toFixed(4)},${result.sed.toFixed(4)},${result.dmedian.toFixed(4)},${result.pmedian.toFixed(4)}%`
  )
  console.info(header)
  console.info(rows.join('\n'))
}

/**
 * An object that maps output formats to output handler functions.
 */
const outputHandlers: Record<OutputFormat, OutputHandler> = {
  table: tableOutputHandler,
  json: jsonOutputHandler,
  csv: csvOutputHandler,
}

/**
 * Compares two SuiteReport objects, comparing benchmarks with matching names.
 *
 * Outputs a single line for each comparison indicating whether there's a
 * significant difference and, if so, whether it's a regression or improvement.
 *
 * This function compares only benchmarks that have a matching name in both
 * SuiteReport objects. Benchmarks that are present in one suite but not the
 * other are skipped.
 *
 * @param suiteA - The first SuiteReport to compare (presumably the newer report).
 * @param suiteB - The second SuiteReport to compare (presumably the older report).
 * @param options - Options for the comparison (optional).
 */
export function compareSuites(suiteA: SuiteReport, suiteB: SuiteReport, options: CompareOptions = {}): void {
  const log = options.logger || createLogger({ debug: false, logLevel: 5 })

  console.info(`\nComparing suites "${suiteA.name}" vs "${suiteB.name}" (matching benchmarks only):`)

  // Create a map of benchmark names to reports in suiteB
  const suiteBMap = new Map<string, BenchmarkReport>()
  for (const report of suiteB.results) {
    suiteBMap.set(report.name, report)
  }

  for (const a of suiteA.results) {
    const b = suiteBMap.get(a.name)

    if (!b) {
      log.warn(`  ${a.name}: Missing in suite "${suiteB.name}". Skipping.`)
      continue
    }

    const result = compare(a, b)

    let output = `  ${a.name}: `

    if (result.different) {
      if (result.aWins) {
        output += chalk.green(`Improvement (${result.pmean.toFixed(2)}%)`)
      } else {
        output += chalk.red(`Regression (${result.pmean.toFixed(2)}%)`)
      }
    } else {
      output += `No significant difference`
    }

    console.log(output)
  }

  // Check for benchmarks in suiteB that are not in suiteA
  for (const b of suiteB.results) {
    if (!suiteA.results.find((report) => report.name === b.name)) {
      log.warn(`  ${b.name}: Missing in suite "${suiteA.name}". Skipping.`)
    }
  }
}
