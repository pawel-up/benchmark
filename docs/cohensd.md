# Interpreting Cohen's d

When comparing results from different executions of the same function, we not only need to understand whether the difference is statistically significant, but also what is the magnitude of these changes. This library provides Cohen's d as a key metric to help you make these assessments.

Here's a breakdown of why Cohen's d is important and why it's included in the `ComparisonResult` provided by this library.

## What is Cohen's d?

- **Effect Size:** Cohen's d is a measure of *effect size*. In simple terms, it quantifies the magnitude of the difference between two groups (in our case, two benchmark runs) rather than just indicating whether a difference exists (which is what a p-value does).
- **Standardized Difference:** It expresses the difference between two means in terms of their pooled standard deviation. This standardization allows you to compare effect sizes across different studies or different metrics.
- **Unitless Measure:** Cohen's d is a unitless measure, meaning it doesn't depend on the units of measurement (e.g., milliseconds, seconds, operations per second). This makes it useful for comparing effects across different types of data.

## Why is Cohen's d Important?

### Beyond Statistical Significance

- **P-values vs. Practical Significance:** A p-value tells us if a difference is *statistically significant* (i.e., unlikely to be due to random chance). However, a statistically significant difference might be very small and practically meaningless.
- **Example:** Imagine comparing two versions of a function. A t-test might show a statistically significant difference (p < 0.05), but the actual difference in execution time might be only 0.0001 milliseconds. This difference is statistically significant but practically irrelevant.
- **Cohen's d's Role:** Cohen's d helps you determine if the difference is also *practically significant*. It tells you how large the difference is, regardless of whether it's statistically significant.

## Interpreting the Magnitude of the Difference

Cohen proposed some general guidelines for interpreting the magnitude of Cohen's d:

- **Small effect:** d ≈ 0.2
- **Medium effect:** d ≈ 0.5
- **Large effect:** d ≈ 0.8

**Context Matters:** These are just general guidelines. The practical significance of a particular Cohen's d value depends on the specific context of the benchmark. For example, a small effect might be important in a performance-critical application, while a large effect might be needed to justify a major code change.

### Comparing Across Benchmarks

**Different Metrics:** This benchmarking library might measure different things (e.g., execution time, operations per second). Cohen's d allows you to compare the magnitude of the difference across these different metrics because it's a standardized measure.

**Different Functions:** You can also use Cohen's d to compare the magnitude of performance changes for different functions.

## Why Cohen's d is Useful in This Benchmarking Library

This library provides Cohen's d to help you:

### Performance Regressions

**Detecting Meaningful Slowdowns:** If a code change introduces a performance regression, Cohen's d helps you determine if the slowdown is practically significant or just a minor fluctuation.

### Performance Improvements

**Validating Optimizations:** If you've made an optimization, Cohen's d helps you quantify how much the performance has improved.

### Guiding Development Decisions

**Prioritizing Optimizations:** If you're considering multiple potential optimizations, Cohen's d can help you prioritize the ones that are likely to have the largest impact.

### Clearer reporting

Cohen's d allows you to see the magnitude of the difference, providing a more complete picture of the performance changes.

## In Conclusion

Cohen's d is a crucial addition to this benchmarking library because it goes beyond simply detecting statistical significance. It provides a standardized measure of the magnitude of the performance difference, which is essential for making informed decisions about code changes and optimizations. It helps you answer the question, "Is this difference practically meaningful?" rather than just, "Is this difference statistically significant?"
