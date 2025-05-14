import { compareSuites } from '../compare.js'
import type { SuiteReport } from '../types.js'

/**
 * Options for configuring the FileStore.
 */
export interface FileStoreOptions {
  /**
   * The directory where the benchmark report file will be saved.
   * @default './benchmarks/history'
   */
  basePath?: string
  /**
   * The filesystem module to use for file operations.
   * This is primarily used for testing purposes. However, it can also be used to
   * provide a custom implementation of the filesystem module (in a browser, for example).
   * @default 'fs/promises'
   */
  fs?: {
    mkdir: (path: string, options: { recursive: boolean }) => Promise<void>
    readdir: (path: string) => Promise<string[]>
    readFile: (path: string, encoding: string) => Promise<string>
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
 * A class to manage the file storage of benchmark history.
 *
 * It allows you to store benchmark result as files in a specific directory.
 * The `T` type parameter is used to specify the type of the benchmark result,
 * which is also used as a suffix for the base path of the storage.
 *
 * @example
 * const fileStore = new FileStore<'Suite1' | 'Suite2' | 'Suite3'>();
 * const historyPath = fileStore.getHistoryPath('Suite1');
 * console.log(historyPath); // './benchmarks/history/Suite1'
 *
 * @example
 * const fileStore = new FileStore();
 * const historyPath = fileStore.getHistoryPath();
 * console.log(historyPath); // './benchmarks/history'
 *
 * @example
 * // Integrating with the `FileReporter` class:
 * const fileStore = new FileStore<'Suite1' | 'Suite2' | 'Suite3'>();
 * const file = new FileReporter({ outputDir: fileStore.getHistoryPath('Suite2') })
 * await fileStore.loadLatestBenchmark('Suite2')
 * // run the suite
 * const result = await suite.addReporter(file, 'after-all').run()
 * fileStore.compareLatest(result)
 */
export class FileStore<T = undefined> {
  /**
   * The base path where the history of executions is stored.
   * This path is relative to the current working directory.
   */
  basePath = './benchmarks/history'
  /**
   * The passed configuration options.
   */
  protected options: FileStoreOptions

  /**
   * The latest benchmark result file.
   * This property is set when the `loadLatestBenchmark()` method is called.
   */
  latest?: SuiteReport

  constructor(options: FileStoreOptions = {}) {
    this.options = options
    if (options.basePath) {
      this.basePath = options.basePath
    }
  }

  /**
   * Computes the file path to the history of executions.
   *
   * @param type - The type of the benchmark result.
   * If provided, it will be used to create a specific path for the benchmark result.
   * If not provided, the base path will be used.
   */
  getHistoryPath(type?: T): string {
    if (typeof type === 'string') {
      return `${this.basePath}/${type}`
    }
    return this.basePath
  }

  /**
   * Lists all the benchmark result files in the specified directory.
   * When the type is not provided, it lists all files in the base path.
   * When the type is provided, it lists files in the specific directory for that type.
   *
   * @param type The type of the benchmark result.
   * @returns The list of files in the specified directory. Files are sorted in ascending order.
   */
  async list(type: T): Promise<string[]> {
    const basePath = this.getHistoryPath(type)

    // Dynamically load fs
    const fs = this.options.fs || (await import('fs/promises'))

    await fs.mkdir(basePath, { recursive: true })
    const files = await fs.readdir(basePath)
    const filteredFiles = files.filter((file) => file.endsWith(`.json`))
    return filteredFiles.sort()
  }

  /**
   * Retrieves the latest benchmark result file from the specified directory.
   * When the type is not provided, it retrieves the latest file from the base path.
   * When the type is provided, it retrieves the latest file from the specific directory for that type.
   *
   * @param type The type of the benchmark result.
   * @returns The latest benchmark result file as a JSON object.
   */
  async loadLatestBenchmark(type: T): Promise<SuiteReport | undefined> {
    const files = await this.list(type)
    const file = files.pop()
    if (!file) {
      return
    }
    // Dynamically load fs and path
    const fs = this.options.fs || (await import('fs/promises'))
    const path = this.options.path || (await import('path'))
    try {
      const data = await fs.readFile(path.join(this.getHistoryPath(type), file), 'utf-8')
      const result = JSON.parse(data)
      this.latest = result
      return result
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error reading benchmark file:', error)
    }
  }

  /**
   * Compares the latest benchmark result with the current benchmark result.
   * If no previous benchmark result is found, it logs a message to the console.
   *
   * @param result The current benchmark result to compare with the latest one.
   * @param latest The latest benchmark result to compare with.
   * If not provided, the method will use the latest benchmark result loaded by `loadLatestBenchmark()`.
   */
  compareLatest(result: SuiteReport, latest: SuiteReport | undefined = this.latest): void {
    if (!latest) {
      // eslint-disable-next-line no-console
      console.log('No previous benchmark found to compare with.')
      return
    }
    compareSuites(result, latest)
  }
}
