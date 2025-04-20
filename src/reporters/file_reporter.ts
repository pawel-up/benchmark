import type { BenchmarkReport, SuiteReport } from '../types.js'
import { Reporter } from './reporter.js'

/**
 * Options for configuring the FileReporter.
 */
export interface FileReporterOptions {
  /**
   * The directory where the benchmark report file will be saved.
   * @default './' (current directory)
   */
  outputDir?: string
  /**
   * A pattern for generating the file name.
   * The pattern can include the `%timestamp%` placeholder, which will be replaced with the current timestamp.
   * @default '%timestamp%_benchmark.json'
   * @example 'benchmark_results_%timestamp%.json'
   * @example 'my_report.json'
   */
  fileNamePattern?: string
  /**
   * The filesystem module to use for file operations.
   * This is primarily used for testing purposes. However, it can also be used to
   * provide a custom implementation of the filesystem module (in a browser, for example).
   * @default 'fs/promises'
   */
  fs?: {
    mkdir: (path: string, options: { recursive: boolean }) => Promise<void>
    writeFile: (path: string, data: string, encoding: string) => Promise<void>
  }
  /**
   * The path module to use for path operations.
   * This is primarily used for testing purposes. However, it can also be used to
   * provide a custom implementation of the path module (in a browser, for example).
   * @default 'path'
   */
  path?: {
    join: (...paths: string[]) => string
  }
}

/**
 * A reporter that saves benchmark reports to a JSON file.
 * It supports a configurable output directory and file name pattern.
 */
export class FileReporter extends Reporter {
  constructor(protected options: FileReporterOptions = {}) {
    super()
  }

  /**
   * Saves the benchmark report to a JSON file.
   *
   * @example
   * ```typescript
   * const fileReporter = new FileReporter({
   *   outputDir: './my-reports',
   *   fileNamePattern: 'benchmark_results_%timestamp%.json',
   * });
   * await fileReporter.run(report);
   * ```
   */
  async run(report: BenchmarkReport | SuiteReport): Promise<void> {
    const { outputDir = './', fileNamePattern = '%timestamp%_benchmark.json' } = this.options

    // Dynamically load fs and path
    const fs = this.options.fs || (await import('fs/promises'))
    const path = this.options.path || (await import('path'))

    // Ensure the output directory exists
    await fs.mkdir(outputDir, { recursive: true })

    const timestamp = Date.now()
    const fileName = fileNamePattern.replace('%timestamp%', timestamp.toString())

    const filePath = path.join(outputDir, fileName)

    // Write the reports to the file
    await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8')
  }
}
