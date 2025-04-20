# Increasing Sample Size in Benchmarks

A larger sample size generally leads to more reliable and accurate benchmark results. When you have more samples, the impact of individual variations or outliers is reduced, and the statistical metrics (like the mean, standard deviation, and margin of error) become more precise.

This document explains how to increase the sample size in your benchmarks using the available configuration options.

## Configuration Options for Increasing Sample Size

The `BenchmarkOptions` interface provides several options that directly or indirectly affect the sample size. Here's how you can use them:

```typescript
interface BenchmarkOptions {
  maxExecutionTime?: number;
  warmupIterations?: number;
  innerIterations?: number;
  maxInnerIterations?: number;
  timeThreshold?: number;
  minSamples?: number;
  maxIterations?: number;
  debug?: boolean;
  logLevel?: number;
}
```

### maxIterations

- **What it is**: The `maxExecutionTime` option sets a limit on the total time the benchmark will run (in milliseconds).
- **How it affects sample size**: If the benchmark is hitting the `maxExecutionTime` limit before completing `maxIterations`, increasing `maxExecutionTime` will allow more iterations to complete, thus increasing the sample size.
- **When to use it**: Use this option if you're observing that the benchmark is stopping prematurely due to the time limit.

```typescript
const options = {
  maxIterations: 100, // Try to run for 100 iterations
  maxExecutionTime: 30000, // Allow up to 30 seconds to complete
}
```

### minSamples

- **What it is**: The `minSamples` option determines the minimum number of samples to keep after removing outliers.
- **How it affects sample size**: If the outliers removal process removes too many samples, the number of samples might be too low. Decreasing the **minSamples** option will keep more samples.
- **When to use it**: Use this option if you're observing that the benchmark is removing too many samples.

```typescript
const options = {
  minSamples: 5, // Keep at least 5 samples after removing outliers
}
```

### `innerIterations` and `timeThreshold` (Indirectly)

- **What they are**:
  - `innerIterations`: The number of times the benchmarked function is run within a single measurement.
  - `timeThreshold`: The target minimum time for the inner loop to execute.
- **How they affect sample size**: These options primarily affect the accuracy of individual measurements, but they can indirectly affect the sample size. If the inner loop is too fast, the benchmark might complete more quickly, potentially leading to fewer samples within `maxExecutionTime`.
- **When to adjust them:**
  - If your function is very fast, increasing `timeThreshold` or `innerIterations` can make each measurement take longer, which might lead to fewer samples within `maxExecutionTime`. However, it will also improve the accuracy of each measurement.

```typescript
const options = {
  innerIterations: 50, // Run the function 50 times in each measurement
  timeThreshold: 5, // Aim for each inner loop to take at least 5 milliseconds
}
```

## General Guidelines

- **Start with `maxIterations`**: This is the most direct way to increase the sample size.
- **Monitor `maxExecutionTime`**: If you're increasing `maxIterations`, make sure `maxExecutionTime` is long enough to allow the benchmark to complete.
- **Monitor the logs** Check the logs to see if there are any warnings about outliers removal. User the `debug: true` configuration option for logs.
- **Monitor the RME** If the RME is too high, the results might not be reliable.
- **Balance Accuracy and Time**: Increasing the sample size improves accuracy but also increases the benchmark's execution time. Find a balance that works for your needs.
- **Check the benchmark function** If the benchmark function performs asynchronous operations, the timing of these operations can vary, leading to inconsistent results. Try to reduce the number of asynchronous operations in the benchmark function.

By carefully adjusting these configuration options, you can significantly increase the sample size in your benchmarks and obtain more reliable and accurate results.
