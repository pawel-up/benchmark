/* eslint-disable no-restricted-globals */
import { type ILogObj, Logger } from 'tslog'
import { createLogger } from './logger.js'
import type { BenchmarkOptions, SuiteInit } from './types.js'

interface ImportType {
  pattern: string
  type: 'esm' | 'json'
}

interface ResolvedImport extends ImportType {
  path: string
}

/**
 * The SuiteConfig class is responsible for loading the benchmark configuration
 * from a file or using the provided options.
 * It also provides default values for various configuration options.
 */
export class SuiteConfig {
  readonly kind = 'config'
  /**
   * The override options for the benchmark.
   */
  protected initOptions!: SuiteInit
  /**
   * The list of files to look for.
   */
  protected readonly files: ImportType[] = [
    {
      pattern: 'benchmark.config.js',
      type: 'esm',
    },
    {
      pattern: 'benchmark.config.json',
      type: 'json',
    },
  ]

  /**
   * The final options for the benchmark.
   * This includes the options loaded from the configuration file and the constructor options.
   * @example
   * ```typescript
   * const config = new SuiteConfig({
   *   maxExecutionTime: 1000,
   * })
   * await config.load();
   * console.log(config.maxExecutionTime); // 1000
   * ```
   */
  protected options!: SuiteInit
  /**
   * Logger instance for logging messages.
   * This is used to log warnings and errors during the benchmark process.
   */
  logger!: Logger<ILogObj>

  /**
   * The maximum execution time in milliseconds.
   * The benchmark will stop after this time has elapsed.
   * @default 10000 (10 seconds)
   */
  get maxExecutionTime(): number {
    return this.options.maxExecutionTime || 10000
  }

  /**
   * The number of warmup iterations.
   * Warmup iterations are run before the actual measurements to allow the JavaScript engine to optimize the code.
   * @default 10
   */
  get warmupIterations(): number {
    return this.options.warmupIterations || 10
  }
  /**
   * The initial number of inner iterations to run per benchmark iteration.
   * The actual number of inner iterations might be adjusted adaptively based on the `timeThreshold`.
   * @default 10
   */
  get innerIterations(): number {
    return this.options.innerIterations || 10
  }
  /**
   * The maximum value that the adaptive innerIterations can reach.
   * This prevents the inner loop from becoming too large for very fast functions.
   * @default 10000
   */
  get maxInnerIterations(): number {
    return this.options.maxInnerIterations || 10000
  }
  /**
   * The target minimum time (in milliseconds) for the inner loop to execute.
   * If the inner loop completes faster than this threshold, the number of inner iterations
   * is doubled, up to `maxInnerIterations`, to improve measurement accuracy.
   * @default 1
   */
  get timeThreshold(): number {
    return this.options.timeThreshold || 1
  }
  /**
   * The minimum number of samples to keep after removing outliers.
   * This ensures that there are enough samples for statistical analysis.
   * @default 10
   */
  get minSamples(): number {
    return this.options.minSamples || 10
  }
  /**
   * The maximum number of iterations to run.
   * This is used to accurately measure the performance of the function.
   * The benchmark will try to run the function for this number of iterations.
   * If the function is too slow, the `maxExecutionTime` will end the benchmark after the set time.
   * @default 100
   */
  get maxIterations(): number {
    return this.options.maxIterations || 100
  }
  /**
   * When set to true, the benchmark will run in debug mode.
   * This mode is useful for debugging and development purposes.
   * It may slow down the benchmark execution.
   * @default false
   */
  get debug(): boolean {
    return this.options.debug || false
  }
  /**
   * The log level used by the `tslog` logger.
   * This can be set to `0` (silly), `1` (trace), `2` (debug), `3` (info), `4` (warn), `5` (error), or `6` (fatal)
   * It is set to 5 if `debug` is false.
   * @default 5
   */
  get logLevel(): number {
    if (typeof this.options.logLevel === 'number') {
      return this.options.logLevel
    }
    return 5
  }

  /**
   * Creates a new instance of the SuiteConfig class.
   * This class is responsible for loading the benchmark configuration from a file or using the provided options.
   *
   * @param options The options for the benchmark. These options take precedence over the loaded configuration file.
   * @example
   * ```typescript
   * const config = new SuiteConfig({
   *   maxExecutionTime: 1000,
   *   warmupIterations: 5,
   * })
   * await config.load();
   * console.log(config.maxExecutionTime); // 1000
   * console.log(config.warmupIterations); // 5
   * ```
   */
  constructor(options: SuiteConfig | SuiteInit = {}) {
    if ((options as SuiteConfig).kind === 'config') {
      return options as SuiteConfig
    }
    this.initOptions = options
    this.options = { ...options } as SuiteInit
    this.logger = createLogger(this.options)
  }

  /**
   * Checks if the class has the ability to read files.
   * This is determined by checking if the environment is Node.js or if the `fs` and `path` modules are provided.
   * In a browser environment, this method will return false.
   *
   * @example
   * ```typescript
   * const isValidFilesystem = this.canReadFile();
   * console.log(isValidFilesystem); // true if running in Node.js, false otherwise
   * ```
   */
  canReadFile(): boolean {
    if (
      this.initOptions.useSyntheticNodeModules !== true &&
      typeof process !== 'undefined' &&
      !!process.versions &&
      !!process.versions.node
    ) {
      return true
    }
    if (this.initOptions.useSyntheticNodeModules) {
      this.validateSyntheticNodeModules()
    }
    if (this.initOptions.fs && this.initOptions.path) {
      return true
    }
    return false
  }

  /**
   * Validates the structure of the `path` and `fs` init options.
   */
  protected validateSyntheticNodeModules(): void {
    const { fs, path } = this.initOptions
    if (!fs) {
      throw new Error(`The "fs" synthetic module must be defined on the init options`)
    }
    if (!path) {
      throw new Error(`The "path" synthetic module must be defined on the init options`)
    }
    if (typeof fs.readFile !== 'function') {
      throw new Error(`The "fs.readFile" function must be defined on the init options`)
    }
    if (typeof fs.stat !== 'function') {
      throw new Error(`The "fs.stat" function must be defined on the init options`)
    }
    if (typeof path.dirname !== 'function') {
      throw new Error(`The "path.dirname" function must be defined on the init options`)
    }
    if (typeof path.join !== 'function') {
      throw new Error(`The "path.join" function must be defined on the init options`)
    }
  }

  /**
   * Loads the configuration from the file system.
   * This method will only be called if the environment is Node.js or if the `fs` and `path` modules are provided.
   * If no config file is found, it will use the constructor options.
   *
   * @example
   * ```typescript
   * const config = new SuiteConfig({
   *   maxExecutionTime: 1000,
   * })
   * await config.load();
   * console.log(config.maxExecutionTime); // 1000
   * ```
   */
  async load(): Promise<void> {
    if (!this.canReadFile()) {
      // Browser environment: only use constructor options
      // For testing, we allow the user to provide `fs` and `path` modules
      // to simulate a Node.js environment.
      return
    }
    const configFile = await this.findConfigFile()
    if (!configFile) {
      // No config file found: use constructor options
      return
    }
    try {
      const fileOptions = await this.loadFromFile(configFile)
      // The options acts as a proxy for the constructor options.
      // We use getters to access the options.
      this.options = { ...fileOptions, ...this.initOptions }
      this.postConfigLoad()
    } catch (error) {
      const e = error as Error
      this.logger.error('Error loading configuration file:', e.message)
    }
  }

  /**
   * Post-processing after loading the configuration file.
   */
  protected postConfigLoad(): void {
    let level: number
    if (typeof this.options.logLevel === 'number') {
      level = this.options.logLevel
    } else {
      level = this.options.debug ? 0 : 5
    }
    this.logger.settings.minLevel = level
  }

  /**
   * Finds the configuration file in the current directory or its parents.
   * @returns The resolved import object or null if not found.
   */
  protected async findConfigFile(): Promise<ResolvedImport | null> {
    if (this.initOptions.configPath) {
      const result: ResolvedImport = {
        path: this.initOptions.configPath,
        pattern: this.initOptions.configPath,
        type: this.initOptions.configPath.endsWith('.js') ? 'esm' : 'json',
      }
      return result
    }
    const path = this.initOptions.path || (await import('path'))
    const fs = this.initOptions.fs || (await import('fs/promises'))
    let currentDir = process.cwd()
    while (currentDir) {
      for (const file of this.files) {
        const filePath = path.join(currentDir, file.pattern)
        try {
          await fs.stat(filePath)
          return {
            ...file,
            path: filePath,
          }
        } catch {
          // File not found, continue searching
        }
      }
      const parentDir = path.dirname(currentDir)
      if (parentDir === currentDir) {
        break // Reached the root directory
      }
      currentDir = parentDir
    }
    return null // No config file found
  }
  /**
   * Loads the configuration from the specified file.
   * This method will only be called if the environment is Node.js or if the `fs` and `path` modules are provided.
   * @param info The resolved import object containing the file path and type.
   * @returns The loaded configuration options.
   */
  protected async loadFromFile(info: ResolvedImport): Promise<BenchmarkOptions> {
    if (info.type === 'esm') {
      const { default: config } = await import(info.path)
      return config
    }
    if (info.type === 'json') {
      const fs = this.initOptions.fs || (await import('fs/promises'))
      const data = await fs.readFile(info.path, 'utf-8')
      return JSON.parse(data)
    }
    throw new Error(`Unsupported file type: ${info.type}`)
  }
}
