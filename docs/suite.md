# The `Suite` Class: Benchmarking Functions Over Time

The `Suite` class is a core component of `@pawel-up/benchmark`, designed to help you benchmark multiple functions within your library and track their performance over time. It provides a structured way to organize and run benchmarks, collect results, and compare performance across different versions or code changes.

## Design Philosophy

The `Suite` class is built with a specific design philosophy in mind:

* **Benchmarking Functions Within a Library:** The primary purpose is to benchmark functions that are part of a single library or project. This allows you to measure the performance of your library's core components.
* **Time-Series Analysis:** The `Suite` class is designed to be used repeatedly over time. You can run a suite of benchmarks, store the results, and then run the same suite again later to compare performance. This enables you to track performance regressions or improvements as you develop your library.
* **Focus on Core Functionality:** The `Suite` class itself focuses on running benchmarks and collecting results. It does not include built-in reporters for file output or other external operations. This keeps the core library lean and flexible, allowing you to build custom integrations on top of it.
* **Setup function:** The `Suite` class allows you to add a setup function that will be executed before any benchmark. This is useful to prepare the environment before running the benchmarks.

## Key Concepts

* **Benchmarks:** Individual performance tests for specific functions.
* **Suite:** A collection of related benchmarks.
* **Reports:** Data structures (`BenchmarkReport` and `SuiteReport`) that contain the results of the benchmarks.
* **Reporters:** Components that process and output the benchmark results (e.g., to the console, to a file, etc.).
* **Setup function:** A function that is executed before any benchmark.

## How to Use the `Suite` Class

### 1. Create a `Suite` Instance

First, you need to create an instance of the `Suite` class, providing a name for your suite and optional `BenchmarkOptions`:

```typescript
import { Suite } from '@pawel-up/benchmark';

const suite = new Suite('My Library Benchmarks', { maxExecutionTime: 5000 });
// or
const suite = new Suite({ maxExecutionTime: 5000 });
```

* **name (optional)**: A human-readable name for your suite. This is useful for identifying the suite in reports and logs. If not provided, the name will be Benchmark Suite.
* **options (optional)**: An object of type BenchmarkOptions to configure the benchmark run. See the BenchmarkOptions documentation for details.

### 2. Add Benchmarks

Use the `add()` method to add benchmarks to your suite:

```typescript
function myFunction1() {
  // ... your code ...
}

function myFunction2() {
  // ... your code ...
}

suite.add('Function 1', myFunction1);
suite.add('Function 2', myFunction2);
```

* **name**: A name for the benchmark. This should be descriptive and unique within the suite.
* **fn**: The function you want to benchmark. This can be a synchronous or asynchronous function.

### 3. Add a setup function (optional)

Use the `setSetup()` method to add a setup function to your suite:

```typescript
suite.setSetup(async () => {
  console.log('Running setup function...');
  // Do some setup work here...
  await new Promise(resolve => setTimeout(resolve, 1000)); // Example async setup
  console.log('Setup function completed.');
});
suite.setup();
```

* `fn`: The setup function. This can be a synchronous or asynchronous function.

### 4. Add Reporters (Optional)

If you want to output the results in a specific format or to a specific destination, you can add reporters to the suite using the `addReporter()` method.

```typescript
import { CliReporter, FileReporter } from '@pawel-up/benchmark';

const cliReporter = new CliReporter({ format: 'long' });
const fileReporter = new FileReporter({ fileNamePattern: 'benchmark-results-{date}.json' });

suite.addReporter(cliReporter, 'after-each'); // Run the reporter after each benchmark has completed
suite.addReporter(fileReporter, 'after-all'); // Run the reporter after all benchmarks have completed
```

* **reporter**: An instance of a class that implements the `Reporter` interface.
* **timing**: When the reporter should be executed.
  * `'after-each'`: The reporter will be executed after each benchmark.
  * `'after-all'`: The reporter will be executed after all benchmarks have completed.

**Important**: The core library only include basic built-in reporters for CLI output and saving the ouput as file. You need to create your own reporters or use reporters from external libraries.

### 5. Run the Suite

Use the `run()` method to execute all benchmarks in the suite:

```typescript
const report = await suite.run();
```

This method returns a Promise that resolves with a `SuiteReport` object containing the results of all benchmarks.

### 6. Get the Report

Use the `getReport()` method to get the SuiteReport object:

```typescript
const report = suite.getReport();
console.log(report);
```

The `SuiteReport` object contains the results of all benchmarks in the suite. See the `SuiteReport` documentation for details.

**Note** that it is the same report as returned by the `run()` function. Each time this function is called it generates a new report with the same values.

### 7. Compare Results Over Time

The real power of the `Suite` class comes from its ability to track performance over time. Here's a typical workflow:

1. **Run the suite**: Run your suite of benchmarks and get the `SuiteReport`.
1. **Store the report**: Store the `SuiteReport` in a file (e.g., as JSON) or in a database.
1. **Make changes**: Make changes to your library's code.
1. **Run the suite again**: Run the same suite of benchmarks again.
1. **Store the new report**: Store the new `SuiteReport`.
1. **Compare reports**: Load the old and new `SuiteReport` objects and use the `compareFunction` to compare the performance of the functions over time.

```typescript
import { compareFunction, outputCompareFunction, type SuiteReport } from '@pawel-up/benchmark';
import * as fs from 'fs/promises';

async function main() {
  // Load suite reports from files (example)
  const suiteReport1 = JSON.parse(await fs.readFile('suite_report_1.json', 'utf-8')) as SuiteReport;
  const suiteReport2 = JSON.parse(await fs.readFile('suite_report_2.json', 'utf-8')) as SuiteReport;
  const suiteReport3 = JSON.parse(await fs.readFile('suite_report_3.json', 'utf-8')) as SuiteReport;
  const suiteReport4 = JSON.parse(await fs.readFile('suite_report_4.json', 'utf-8')) as SuiteReport;

  const suiteReports = [suiteReport1, suiteReport2, suiteReport3, suiteReport4];

  // Compare the performance of function 'myFunction' across the suite reports
  const results = compareFunction('myFunction', suiteReports);
  outputCompareFunction(results, 'table');
}

main().catch(console.error);
```

## Example

Here's a complete example that demonstrates how to use the Suite class:

```typescript
import { Suite } from '@pawel-up/benchmark';

// Your functions to benchmark
function myFunction1() {
  // ... your code ...
}

async function myAsyncFunction2() {
  // ... your code ...
  await new Promise(resolve => setTimeout(resolve, 10));
}

async function main() {
  const suite = new Suite('My Library Benchmarks', { maxExecutionTime: 5000 });
  const cli = new CliReporter({ format: 'short' })
  const file = new FileReporter({ outputDir: './benchmarks', fileNamePattern: '%timestamp%_benchmark_math.json' })
  const report = await suite
    .setSetup(async () => {
      console.log('Running setup function...');
      // Do some setup work here...
      await new Promise(resolve => setTimeout(resolve, 1000)); // Example async setup
      console.log('Setup function completed.');
    })
    .setup()
    .add('Function 1', myFunction1);
    .setup()
    .add('Async Function 2', myAsyncFunction2)
    .addReporter(cli, 'after-each')
    .addReporter(file, 'after-all')
    .run()

  console.log(report);
}

main().catch(console.error);
```

## Guidelines

* **Descriptive Names**: Use descriptive names for your suites and benchmarks to make it easy to understand the results.
* **Consistent Suites**: When tracking performance over time, use the same suite and benchmark names in each run. This ensures that you're comparing the same functions.
* **Store Reports**: Store your `SuiteReport` objects in a structured way (e.g., in files or a database) so you can easily load and compare them later.
* **Setup function**: Use the setup function to prepare the environment before running the benchmarks.
* **Create Custom Reporters**: If you need to output the results in a specific format or to a specific destination, create your own custom reporters.
* **Use `compareFunction`**: Use the `compareFunction` to compare the results over time.

## Conclusion

The `Suite` class is a powerful tool for benchmarking functions within your library and tracking their performance over time. By following the guidelines in this document, you can use the `Suite` class to gain valuable insights into your library's performance and make data-driven decisions about optimizations and code changes.
