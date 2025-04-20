# Why RME Might Be Above 5%

A Relative Margin of Error (RME) above 5% (0.05) indicates that your benchmark results have a relatively high degree of uncertainty.

## Common causes

### High Variability in Execution Times

The benchmarked function's execution time varies significantly between runs. Some runs are much faster or slower than others.

**Why it happens:**

- **Background Processes**: Other processes running on your system (operating system tasks, other applications, etc.) can interfere with the benchmark, causing fluctuations in execution time.
- **Garbage Collection**: The JavaScript garbage collector can run at unpredictable times, pausing execution and causing spikes in execution time.
- **Just-In-Time (JIT) Compilation**: The JIT compiler in JavaScript engines optimizes code during runtime. The timing of these optimizations can vary, leading to inconsistent performance.
- **CPU Frequency Scaling**: Modern CPUs dynamically adjust their clock speed based on load and temperature. This can cause performance variations.
- **Caching Effects**: The first few runs of a function might be slower due to cache misses. Later runs might be faster due to caching.
- **Asynchronous operations** If the benchmark function performs asynchronous operations, the timing of these operations can vary, leading to inconsistent results.

### Insufficient Number of Samples

You're not running the benchmark enough times to get a statistically significant sample size.

**Why it happens:**

- **`maxIterations` Too Low**: If `maxIterations` is set too low, you might not be collecting enough data.
- **`maxExecutionTime` Too Short**: If `maxExecutionTime` is too short, the benchmark might stop before it has collected enough samples.
- **Outliers removal** If the outliers removal process removes too many samples, the number of samples might be too low.

### Timer Resolution Limitations

The `performance.now()` timer might not be precise enough to measure very fast functions accurately.

**Why it happens:**

- **Very Fast Functions**: If your benchmarked function executes in a fraction of a millisecond, the timer's resolution might not be fine-grained enough to capture the differences accurately.
- **`timeThreshold`** If the `timeThreshold` is too low, the inner loop might not take enough time to get an accurate measurement.

### Outliers

A few extremely slow or fast runs can skew the results and increase the RME.

**Why it happens:**

- `Garbage Collection`: A garbage collection pause during a run can cause a significant outlier.
- `System Interrupts`: A system interrupt (e.g., a driver update) can cause a temporary slowdown.

## What Can Be Done to Improve RME

### Increase the Number of Samples

- **Increase maxIterations**: Try increasing the `maxIterations` option to collect more data points.
- **Increase maxExecutionTime**: If you're hitting the `maxExecutionTime` limit, increase it to allow more iterations to complete.
- **Decrease `minSamples`** If the outliers removal process removes too many samples, try decreasing the `minSamples` option.

### Reduce Variability

- **Isolate the Test Environment**: Run your benchmarks in a more isolated environment. Close unnecessary applications, and try to minimize background processes.
- **Disable CPU Frequency Scaling**: If possible, disable CPU frequency scaling (e.g., in your BIOS settings) to get more consistent clock speeds.
- **Run Multiple Times**: Run the benchmark multiple times and average the results. This can help smooth out some of the variability.

### Adjust `innerIterations` and `timeThreshold`

- **Increase `timeThreshold`**: If your function is very fast, try increasing `timeThreshold` to ensure that the inner loop takes more time. This can improve the accuracy of the measurements.
- **Increase innerIterations** If the function is very fast, try increasing the `innerIterations` option.

### Check the benchmark function

If the benchmark function performs asynchronous operations, the timing of these operations can vary, leading to inconsistent results. Try to reduce the number of asynchronous operations in the benchmark function.

### Analyze Outliers

- **Inspect `sample`**: Look at the `sample` array in the `BenchmarkReport` to see if there are any extreme outliers. If there are, consider whether they are legitimate or due to some external factor.
- **Check the logs** Check the logs to see if there are any warnings about outliers removal.
