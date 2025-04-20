# ⚡️ Lightning-Fast Benchmarking for JavaScript and TypeScript

[![npm version](https://badge.fury.io/js/%40pawel-up%2Fbenchmark.svg)](https://badge.fury.io/js/%40pawel-up%2Fbenchmark)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Tired of slow, inaccurate, or overly complex benchmarking tools?**  `@pawel-up/benchmark` is a modern, lightweight, and highly accurate benchmarking library designed for JavaScript and TypeScript. It provides everything you need to measure the performance of your code with confidence.

**Why Choose `@pawel-up/benchmark`?**

* **Accuracy:**  `@pawel-up/benchmark` uses advanced techniques like warm-up iterations, adaptive inner iterations, and outlier removal to ensure highly accurate and reliable results.
* **Ease of Use:**  Get started with benchmarking in minutes with our intuitive and straightforward API.
* **Flexibility:** Benchmark synchronous and asynchronous functions with ease.
* **Detailed Reporting:**  Generate comprehensive reports with key statistical metrics, including operations per second, relative margin of error, standard deviation, and more.
* **Extensibility:**  Easily extend the library with custom reporters to fit your specific needs. Note that the core library provides the foundation for creating reporters, but only includes basic file and terminal output reporters. You are free to create your own reporters for external operations.**
* **TypeScript Support:**  Built with TypeScript, providing excellent type safety and developer experience.
* **Debugging:** The library provides a debug mode and detailed logs to help you understand the benchmark process.
* **Node.js and Browser support** The library works in both Node.js and browser environments.

**This library is designed to be a lean and powerful core for benchmarking. Integrations for CLI, file output, and other features are intended to be built on top of this core.**

## Key Features

* **Warm-up Iterations:**  Automatic warm-up to allow the JavaScript engine to optimize the code before measurements.
* **Adaptive Inner Iterations:**  Dynamically adjusts the number of inner iterations to ensure accurate measurements, even for extremely fast functions.
* **Outlier Removal:**  Automatically removes outliers using the IQR method to improve the reliability of results.
* **Synchronous and Asynchronous Support:**  Benchmark both synchronous and asynchronous functions seamlessly.
* **Foundation for Custom Reporters:**  Create custom reporters to output results in various formats (e.g., JSON, CSV, HTML) or to different destinations (e.g., files, databases). **The core library provides the necessary tools for creating reporters, but does not include any built-in reporters.**
* **Suite Support:**  Organize multiple benchmarks into suites for better management and reporting. **The core library does not include any built-in reporters.**
* **Setup function** Add a setup function to the suite to prepare the environment before running the benchmarks.
* **Detailed Statistics:**  Reports include:
  * `ops` - Operations per second.
  * `rme` - Relative Margin of Error (RME).
  * `me` - Margin of error.
  * `stddev` - Sample standard deviation.
  * `mean` - Sample arithmetic mean.
  * `sample` - The sample of execution of times.
  * `sem`- The standard error of the mean.
  * `variance`- The sample variance.
  * `size` - Sample size.
  * `cohensd` - Cohen's d effect size.
  * `sed` - The standard error of the difference in means.
  * `dmedian` - The difference between the sample medians of the two benchmark runs.
  * `pmedian` - The percentage difference between the sample medians of the two benchmark runs.
* **Debug mode** The library provides a debug mode and detailed logs to help you understand the benchmark process.

## Quick Start

1. **Installation:**

    ```bash
    npm install @pawel-up/benchmark
    # or
    yarn add @pawel-up/benchmark
    ```

2. **Basic Usage (Single Benchmark):**

    ```typescript
    import { Benchmarker } from '@pawel-up/benchmark';

    // Your function to benchmark
    async function myAsyncFunction() {
      // ... your code ...
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    async function main() {
      const benchmarker = new Benchmarker('My Async Benchmark', myAsyncFunction, {
        maxIterations: 100,
        maxExecutionTime: 5000,
      });
      await benchmarker.run();
      const report = benchmarker.getReport();
      console.log(report);
    }

    main();
    // Note: This example uses `console.log` for demonstration purposes. The core library does not include any built-in reporters.
    ```

3. **Using Benchmark Suites:**

    ```typescript
    import { Suite } from '@pawel-up/benchmark';

    // Your functions to benchmark
    function myFunction1() {
      // ... your code ...
    }

    function myFunction2() {
      // ... your code ...
    }

    async function main() {
      const suite = new Suite('My Benchmark Suite', { maxExecutionTime: 10000 });
      suite.setSetup(async () => {
        console.log('Running setup function...');
        // Do some setup work here...
        await new Promise(resolve => setTimeout(resolve, 1000)); // Example async setup
        console.log('Setup function completed.');
      });
      suite.setup();
      suite.add('Function 1', myFunction1);
      suite.setup();
      suite.add('Function 2', myFunction2);

      await suite.run();
      const report = suite.getReport();
      console.log(report);
    }

    main();
    // Note: This example uses `console.log` for demonstration purposes. The core library does not include any built-in reporters.
    ```

4. **Using compareFunction:**

    ```typescript
    import { compareFunction, SuiteReport } from '@pawel-up/benchmark';
    import * as fs from 'fs/promises';

    async function main() {
      // Load suite reports from files (example)
      const suiteReport1 = JSON.parse(await fs.readFile('suite_report_1.json', 'utf-8')) as SuiteReport;
      const suiteReport2 = JSON.parse(await fs.readFile('suite_report_2.json', 'utf-8')) as SuiteReport;
      const suiteReport3 = JSON.parse(await fs.readFile('suite_report_3.json', 'utf-8')) as SuiteReport;
      const suiteReport4 = JSON.parse(await fs.readFile('suite_report_4.json', 'utf-8')) as SuiteReport;

      const suiteReports = [suiteReport1, suiteReport2, suiteReport3, suiteReport4];

      // Example 1: Compare with JSON output
      compareFunction('myFunction', suiteReports, { format: 'json' });

      // Example 2: Compare with CSV output
      compareFunction('myFunction', suiteReports, { format: 'csv' });

      // Example 3: Compare with default table output
      compareFunction('myFunction', suiteReports);
    }

    main().catch(console.error);
    // Note: This example uses `console.log` for demonstration purposes. The core library does not include any built-in reporters.
    ```

## The Power of Statistical Benchmarking

`@pawel-up/benchmark` goes beyond simple timing measurements. It leverages statistical methods to provide a more accurate and meaningful assessment of function performance. Here's why this approach is crucial:

* **Addressing Variability:**  JavaScript execution environments (like Node.js and web browsers) are complex and can introduce variability in execution times. Simple timing measurements can be misleading due to this inherent variability.
* **Statistical Significance:**  The library uses statistical tests (like the t-test) to determine if observed performance differences are likely due to real changes in the code or just random fluctuations.
* **Effect Size:**  Metrics like Cohen's d help you understand the *magnitude* of performance differences, allowing you to distinguish between statistically significant but practically insignificant changes and changes that have a real-world impact.
* **Reliable Results:** Techniques like warm-up iterations, adaptive inner iterations, and outlier removal are used to minimize the impact of external factors and produce more reliable results.
* **Confidence:** The library provides confidence intervals, which help you understand the range of plausible values for the true performance difference.

By using a statistical approach, `@pawel-up/benchmark` helps you make data-driven decisions about your code's performance, leading to more effective optimizations and a better understanding of your library's behavior.

## API Overview

### `Benchmarker` Class

* **`new Benchmarker(name: string, fn: () => unknown | Promise<unknown>, options?: BenchmarkOptions)`**
  * Creates a new `Benchmarker` instance.
  * `name`: The name of the benchmark.
  * `fn`: The function to benchmark (can be synchronous or asynchronous).
  * `options`: An optional `BenchmarkOptions` object to configure the benchmark.
* **`async run(): Promise<void>`**
  * Runs the benchmark.
* **`getReport(): BenchmarkReport`**
  * Generates a `BenchmarkReport` object with the benchmark results.

### `Suite` Class

* **`new Suite(name: string, options?: BenchmarkOptions)`**
  * Creates a new `Suite` instance.
  * `name`: The name of the suite.
  * `options`: An optional `BenchmarkOptions` object to configure the suite.
* **`add(name: string, fn: () => unknown | Promise<unknown>): this`**
  * Adds a benchmark to the suite.
  * `name`: The name of the benchmark.
  * `fn`: The function to benchmark.
* **`addReporter(reporter: Reporter, timing: ReporterExecutionTiming): this`**
  * Adds a reporter to the suite.
  * `reporter`: The reporter instance.
  * `timing`: When the reporter should be executed (`'after-each'` or `'after-all'`).
* **`setSetup(fn: () => unknown | Promise<unknown>): this`**
  * Sets the setup function for the suite.
  * `fn`: The setup function.
* **`setup(): this`**
  * Adds the setup function to the execution queue.
* **`async run(): Promise<SuiteReport>`**
  * Runs all benchmarks in the suite.
* **`getReport(): SuiteReport`**
  * Generates a `SuiteReport` object with the suite results.

### `Reporter` Class

* **`async run(report: BenchmarkReport | SuiteReport): Promise<void>`**
  * Abstract method that reporters must implement to process and output the benchmark report.

### `BenchmarkOptions` Interface

* `maxExecutionTime?: number`
* `warmupIterations?: number`
* `innerIterations?: number`
* `maxInnerIterations?: number`
* `timeThreshold?: number`
* `minsize?: number`
* `maxIterations?: number`
* `debug?: boolean`
* `logLevel?: number`

### `BenchmarkReport` Interface

* `kind: 'benchmark'`
* `name: string`
* `ops: number` - Operations per Second
* `rme: number` - Relative Margin of Error (RME)
* `stddev: number` - Sample Standard Deviation
* `mean: number` - Sample Arithmetic Mean
* `me: number` - Margin of error
* `sample: number[]` - The sample of execution of times
* `sem: number`- The standard error of the mean.
* `variance: number` - The sample variance
* `size: number` - Sample size
* `date: string`

### `SuiteReport` Interface

* `kind: 'suite'`
* `name: string`
* `date: string`
* `results: BenchmarkReport[]`

## Learn More

* Interpreting Benchmark Results
* Increasing Sample Size
* Why RME Might Be Above 5%
* Interpreting Cohen's d
* API Reference

## Contributing

Contributions are welcome! Please see the contributing guidelines for more information.

## License

This project is licensed under the MIT License.
