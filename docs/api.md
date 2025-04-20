# API Reference

This document provides a detailed reference for the API of the `@pawel-up/benchmark` library.

## Table of Contents

- Benchmarker Class
  - Constructor
  - Methods
    - run
    - getReport
- Suite Class
  - Constructors
    - constructor(name: string, options?: BenchmarkOptions)
    - constructor(options?: BenchmarkOptions)
  - Methods
    - add
    - addReporter
    - setSetup
    - setup
    - run
    - getReport
- Reporter Class
  - Methods
    - run
- CliReporter Class
  - Constructor
  - Methods
    - run
- FileReporter Class
  - Constructor
  - Methods
    - run
- Interfaces
  - BenchmarkOptions
  - BenchmarkReport
  - SuiteReport
  - CliReporterOptions
  - FileReporterOptions
- Types
  - ReporterExecutionTiming

## Benchmarker Class

The `Benchmarker` class is responsible for running a benchmark on a given function and collecting statistical data about its performance.

### Benchmarker Constructor

#### `new Benchmarker(name: string, fn: () => unknown | Promise<unknown>, options?: BenchmarkOptions)`

Creates a new `Benchmarker` instance.

- **`name`**: `string`
  - The name of the benchmark.
- **`fn`**: `() => unknown | Promise<unknown>`
  - The function to benchmark. It can be synchronous or asynchronous.
- **`options`**: `BenchmarkOptions` (optional)
  - An optional object to configure the benchmark. See the `BenchmarkOptions` interface for details.

### Benchmarker Methods

#### `async run(): Promise<void>`

Runs the benchmark.

- **Returns:** `Promise<void>`
  - A promise that resolves when the benchmark has completed.
- **Throws:**
  - Will throw an error if the benchmark function throws an error during any iteration.

#### `getReport(): BenchmarkReport`

Generates a `BenchmarkReport` object with the benchmark results.

- **Returns:** `BenchmarkReport`
  - A `BenchmarkReport` object containing the benchmark results. See the `BenchmarkReport` interface for details.

## Suite Class

The `Suite` class allows you to organize multiple benchmarks into a suite and run them together.

### Suite Constructors

#### `constructor(name: string, options?: BenchmarkOptions)`

Creates a new benchmark suite with a name.

- **`name`**: `string`
  - The name of the benchmark suite.
- **`options`**: `BenchmarkOptions` (optional)
  - An optional object to configure the suite. See the `BenchmarkOptions` interface for details.

#### `constructor(options?: BenchmarkOptions)`

Creates a new benchmark suite without a name.

- **`options`**: `BenchmarkOptions` (optional)
  - An optional object to configure the suite. See the `BenchmarkOptions` interface for details.

### Suite Methods

#### `add(name: string, fn: () => unknown | Promise<unknown>): this`

Adds a benchmark to the suite.

- **`name`**: `string`
  - The name of the benchmark.
- **`fn`**: `() => unknown | Promise<unknown>`
  - The function to benchmark. It can be synchronous or asynchronous.
- **Returns:** `this`
  - Returns the `Suite` instance for method chaining.
- **Throws:**
  - Will throw an error if a benchmark with the same name already exists.

#### `addReporter(reporter: Reporter, timing: ReporterExecutionTiming): this`

Adds a reporter to the suite.

- **`reporter`**: `Reporter`
  - The reporter instance.
- **`timing`**: `ReporterExecutionTiming`
  - When the reporter should be executed. See the `ReporterExecutionTiming` type for details.
- **Returns:** `this`
  - Returns the `Suite` instance for method chaining.

#### `setSetup(fn: () => unknown | Promise<unknown>): this`

Sets the setup function for the suite.

- **`fn`**: `() => unknown | Promise<unknown>`
  - The setup function. It can be synchronous or asynchronous.
- **Returns:** `this`
  - Returns the `Suite` instance for method chaining.
- **Throws:**
  - Will throw an error if a setup function has already been defined.

#### `setup(): this`

Adds the setup function to the execution queue. The setup function will be executed before any benchmark.

- **Returns:** `this`
  - Returns the `Suite` instance for method chaining.
- **Throws:**
  - Will throw an error if `setSetup()` hasn't been called yet.
  - Will throw an error if `setup()` has already been called.

#### `async run(): Promise<SuiteReport>`

Runs all benchmarks in the suite.

- **Returns:** `Promise<SuiteReport>`
  - A promise that resolves with the `SuiteReport` object.
- **Throws:**
  - Will throw an error if any benchmark function throws an error.

#### `getReport(): SuiteReport`

Generates a `SuiteReport` object with the suite results.

- **Returns:** `SuiteReport`
  - A `SuiteReport` object containing the suite results. See the `SuiteReport` interface for details.

## Reporter Class

The `Reporter` class is an abstract base class for all reporters. Reporters are responsible for handling the benchmark results in a specific format or transport.

### Reporter Methods

#### `async Reporter.run(report: BenchmarkReport | SuiteReport): Promise<void>`

Abstract method that reporters must implement to process and output the benchmark report.

- **`report`**: `BenchmarkReport | SuiteReport`
  - The benchmark report or suite report to process.

## CliReporter Class

The `CliReporter` class is a concrete reporter that prints benchmark results to the console.

### CliReporter Constructor

#### `new CliReporter(options?: CliReporterOptions)`

Creates a new `CliReporter` instance.

- **`options`**: `CliReporterOptions` (optional)
  - An optional object to configure the reporter. See the `CliReporterOptions` interface for details.

### CliReporter Methods

#### `async CliReporter.run(report: BenchmarkReport | SuiteReport): Promise<void>`

Prints the benchmark report(s) to the console.

- **`report`**: `BenchmarkReport | SuiteReport`
  - The benchmark report or suite report to print.
- **Returns:** `Promise<void>`
  - A promise that resolves when the report has been printed.

## FileReporter Class

The `FileReporter` class is a concrete reporter that saves benchmark reports to a JSON file.

### FileReporter Constructor

#### `new FileReporter()`

Creates a new `FileReporter` instance.

### FileReporter Methods

#### `async FileReporter.run(options?: FileReporterOptions): Promise<void>`

Saves the benchmark report(s) to a JSON file.

- **`options`**: `FileReporterOptions` (optional)
  - An optional object to configure the reporter. See the `FileReporterOptions` interface for details.
- **Returns:** `Promise<void>`
  - A promise that resolves when the report has been saved.

## Interfaces

### BenchmarkOptions Interface

Options for configuring a benchmark run.

- **`maxExecutionTime`**: `number` (optional)
  - The maximum execution time in milliseconds. Default: `10000` (10 seconds).
- **`warmupIterations`**: `number` (optional)
  - The number of warmup iterations. Default: `10`.
- **`innerIterations`**: `number` (optional)
  - The initial number of inner iterations. Default: `10`.
- **`maxInnerIterations`**: `number` (optional)
  - The maximum value that the adaptive innerIterations can reach. Default: `10000`.
- **`timeThreshold`**: `number` (optional)
  - The target minimum time (in milliseconds) for the inner loop to execute. Default: `1`.
- **`minSamples`**: `number` (optional)
  - The minimum number of samples to keep after removing outliers. Default: `10`.
- **`maxIterations`**: `number` (optional)
  - The maximum number of iterations to run. Default: `100`.
- **`debug`**: `boolean` (optional)
  - When set to true, the benchmark will run in debug mode. Default: `false`.
- **`logLevel`**: `number` (optional)
  - The log level used by the `tslog` logger. Default: `5`.

### BenchmarkReport Interface

Represents a benchmark report.

- **`kind`**: `string`
  - Indicates the type of the report. In this case, it will always be `'benchmark'`.
- **`name`**: `string`
  - The name of the benchmark.
- **`ops`**: `number`
  - The number of operations per second.
- **`rme`**: `number`
  - The relative margin of error (RME).
- **`stddev`**: `number`
  - The sample standard deviation of the execution times.
- **`mean`**: `number`
  - The sample arithmetic mean of the execution times in seconds.
- **`me`**: `number`
  - The margin of error.
- **`sample`**: `number[]`
  - An array of the individual execution times in milliseconds.
- **`sem`**: `number`
  - The standard error of the mean.
- **`variance`**: `number`
  - The sample variance of the execution times.
- **`size`**: `number`
  - The number of samples used in the benchmark.
- **`date`**: `string`
  - The date when the benchmark was run.

### SuiteReport Interface

Represents a suite report.

- **`kind`**: `string`
  - Indicates the type of the report. In this case, it will always be `'suite'`.
- **`name`**: `string`
  - The name of the benchmark suite.
- **`date`**: `string`
  - The date when the benchmark suite was run.
- **`results`**: `BenchmarkReport[]`
  - The result of each individual benchmark run in the suite.

### CliReporterOptions Interface

Options for configuring the `CliReporter`.

- **`format`**: `'short' | 'long'` (optional)
  - The output format for the benchmark report. Default: `'short'`.

### FileReporterOptions Interface

Options for configuring the `FileReporter`.

- **`outputDir`**: `string` (optional)
  - The directory where the benchmark report file will be saved. Default: `'./'` (current directory).
- **`fileNamePattern`**: `string` (optional)
  - A pattern for generating the file name. Default: `'%timestamp%_benchmark.json'`.

## Types

### ReporterExecutionTiming Type

Defines when a reporter should be executed.

- `'after-each'`
  - The reporter will be executed after each benchmark.
- `'after-all'`
  - The reporter will be executed after all benchmarks in a suite have completed.

## Learn More

- [Interpreting Benchmark Results](interpreting-results.md)
- [Increasing Sample Size](increasing-sample-size.md)
- [Why RME Might Be Above 5%](high-rme.md)
- [Interpreting Cohen's d](cohensd.md)
