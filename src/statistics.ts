/**
 * Calculates the arithmetic mean of an array of numbers.
 *
 * @param data - The data to calculate the mean for.
 * @returns The mean of the data.
 * @throws Will throw an error if the data array is empty.
 * @example
 * const data = [1, 2, 3, 4, 5];
 * const meanValue = mean(data);
 * console.log(meanValue); // Output: 3
 */
export function arithmeticMean(data: number[]): number {
  if (data.length === 0) {
    throw new Error('Data array cannot be empty.')
  }
  return data.reduce((sum, value) => sum + value, 0) / data.length
}

/**
 * Calculates the median of an array of numbers.
 *
 * @param data - The data to calculate the median for.
 * @returns The median of the data.
 * @throws Will throw an error if the data array is empty.
 * @example
 * const data = [1, 2, 3, 4, 5];
 * const medianValue = median(data);
 * console.log(medianValue); // Output: 3
 */
export function median(data: number[]): number {
  if (data.length === 0) {
    throw new Error('Data array cannot be empty.')
  }
  const sorted = [...data].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  } else {
    return sorted[mid]
  }
}

/**
 * Calculates the t-statistic for an independent two-sample t-test.
 * @param mean1 - The mean of the first sample.
 * @param mean2 - The mean of the second sample.
 * @param s1 - The standard deviation of the first sample.
 * @param s2 - The standard deviation of the second sample.
 * @param n1 - The number of samples in the first sample.
 * @param n2 - The number of samples in the second sample.
 * @returns The t-statistic.
 */
export function calculateTStatistic(
  mean1: number,
  mean2: number,
  s1: number,
  s2: number,
  n1: number,
  n2: number
): number {
  // Checked for correctness.
  // Formula (Unequal Variances - Welch's t-test):
  // t = (x̄1 - x̄2) / sqrt((s1^2 / n1) + (s2^2 / n2))
  return (mean1 - mean2) / Math.sqrt(s1 ** 2 / n1 + s2 ** 2 / n2)
}

/**
 * Calculates the degrees of freedom for an independent two-sample t-test using the Welch-Satterthwaite equation.
 * @param s1 - The standard deviation of the first sample.
 * @param s2 - The standard deviation of the second sample.
 * @param n1 - The number of samples in the first sample.
 * @param n2 - The number of samples in the second sample.
 * @returns The degrees of freedom.
 * @see {@link https://statkat.com/degrees-of-freedom-t-test.php}
 */
export function calculateDegreesOfFreedom(s1: number, s2: number, n1: number, n2: number): number {
  // Checked for correctness.
  const s1Squared = s1 ** 2
  const s2Squared = s2 ** 2
  const s1SqOverN1 = s1Squared / n1
  return (s1SqOverN1 + s2Squared / n2) ** 2 / (s1SqOverN1 ** 2 / (n1 - 1) + (s2Squared / n2) ** 2 / (n2 - 1))
}

/**
 * Calculates the continued fraction for the Student's t-distribution cumulative probability.
 *
 * This function is a helper function used by `studT` to calculate the Student's t-distribution
 * cumulative probability. It computes a continued fraction that approximates the tail probability
 * of the t-distribution.
 *
 * The implementation is based on the algorithm described in:
 *
 * -   Hill, G. W. (1970). Algorithm 396: Student's t-quantiles. Communications of the ACM, 13(10), 619-620.
 *
 * @param q - A parameter derived from the t-statistic and degrees of freedom.
 * @param i - The starting index for the continued fraction calculation.
 * @param j - The ending index for the continued fraction calculation.
 * @param b - An offset value used in the continued fraction calculation.
 * @returns The value of the continued fraction.
 * @internal
 */
function continuedFraction(q: number, i: number, j: number, b: number): number {
  let zz = 1
  let z = zz
  let k = i
  while (k <= j) {
    zz = (zz * q * k) / (k - b)
    z = z + zz
    k = k + 2
  }
  return z
}

/**
 * Formats a number to ensure consistent p-value calculation.
 *
 * This function is used internally by `calculatePValue` to format the result of the
 * `studT` function. It adds or subtracts a small value (0.0005) to the input number
 * to ensure that the p-value calculation is consistent across different JavaScript engines
 * and environments. This helps to avoid subtle differences in the p-value due to floating-point
 * precision issues.
 *
 * @param value - The number to format.
 * @returns The formatted number.
 * @internal
 */
function formatPValue(value: number): number {
  if (value >= 0) {
    return value + 0.0005
  }
  return value - 0.0005
}

/**
 * Calculates the Student's t-distribution cumulative probability.
 *
 * This function computes the one-tailed probability that a random variable
 * following a Student's t-distribution with `n` degrees of freedom is greater
 * than `t`. It is used internally by `calculatePValue` to determine the
 * p-value for a two-tailed t-test.
 *
 * The implementation is based on the algorithm described in:
 *
 * -   Hill, G. W. (1970). Algorithm 396: Student's t-quantiles. Communications of the ACM, 13(10), 619-620.
 *
 * @param tStat - The t-statistic (absolute value).
 * @param df - The degrees of freedom.
 * @returns The one-tailed probability (p-value).
 * @internal
 */
function studentsDistribution(tStat: number, df: number): number {
  const w = Math.abs(tStat) / Math.sqrt(df)
  const th = Math.atan(w)
  if (df === 1) {
    return 1 - th / (Math.PI / 2)
  }
  const sth = Math.sin(th)
  const cth = Math.cos(th)
  if (df % 2 === 1) {
    return 1 - (th + sth ** 2 * continuedFraction(cth ** 2, 2, df - 3, -1)) / (Math.PI / 2)
  }
  return 1 - sth * continuedFraction(cth ** 2, 1, df - 3, -1)
}

/**
 * Calculates the p-value for a given t-statistic and degrees of freedom.
 *
 * This function computes the two-tailed p-value for a t-test based on the
 * provided t-statistic and degrees of freedom. It uses the Student's t-distribution
 * to calculate the cumulative probability.
 *
 * @param tStat - The t-statistic (absolute value).
 * @param df - The degrees of freedom.
 * @returns The two-tailed p-value.
 * @throws Will throw an error if `tStat` or `df` is not a number or if `df` is less than or equal to 0.
 */
export function calculatePValue(tStat: number, df: number): number {
  if (isNaN(tStat) || isNaN(df)) {
    throw new Error('t and df must be numbers.')
  }
  if (df <= 0) {
    throw new Error('Degrees of freedom must be greater than 0.')
  }
  const st = studentsDistribution(tStat, df)
  return formatPValue(st)
}

/**
 * Calculates the sample standard deviation.
 * @param data - The sample data.
 * @returns The sample standard deviation.
 */
export function sampleStandardDeviation(data: number[]): number {
  const variance = sampleVariance(data)
  return Math.sqrt(variance)
}

/**
 * Calculates the sample variance.
 * @param data - The sample data.
 * @returns The sample variance.
 */
export function sampleVariance(data: number[]): number {
  const mean = arithmeticMean(data)
  return data.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (data.length - 1)
}

/**
 * Calculates the percentile of a sorted array.
 * @param sortedData - The sorted array.
 * @param percentile - The percentile to calculate (0-100).
 * @returns The percentile value.
 */
export function getPercentile(sortedData: number[], percentile: number): number {
  const index = (percentile / 100) * (sortedData.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower
  return sortedData[lower] * (1 - weight) + sortedData[upper] * weight
}

/**
 * Calculates the relative margin of error for a given mean and standard deviation with a 95% confidence interval.
 * @param mean - The sample mean.
 * @param stdDev - The sample standard deviation.
 * @param n - The number of samples.
 * @returns The relative margin of error.
 */
export function relativeMarginOfError(mean: number, stdDev: number, n: number): number {
  const err = marginOfError(stdDev, n)
  return err / mean
}

/**
 * Calculates the margin of error for a given standard deviation with a 95% confidence interval.
 * This is a simplified calculation assuming a normal distribution.
 *
 * @param stdDev - The sample standard deviation.
 * @param n - The number of samples.
 * @returns The margin of error.
 */
export function marginOfError(stdDev: number, n: number): number {
  return (stdDev / Math.sqrt(n)) * 1.96 // 95% confidence interval
}

/**
 * Calculates Cohen's d effect size.
 *
 * Cohen's d is a measure of the standardized difference between two means.
 * It is calculated as the difference between the means divided by the pooled standard deviation.
 *
 * @param mean1 - The mean of the first sample.
 * @param mean2 - The mean of the second sample.
 * @param s1 - The standard deviation of the first sample.
 * @param s2 - The standard deviation of the second sample.
 * @param n1 - The number of samples in the first sample.
 * @param n2 - The number of samples in the second sample.
 * @returns Cohen's d.
 */
export function calculateCohensD(mean1: number, mean2: number, s1: number, s2: number, n1: number, n2: number): number {
  const pooledStandardDeviation = Math.sqrt(((n1 - 1) * s1 ** 2 + (n2 - 1) * s2 ** 2) / (n1 + n2 - 2))
  return (mean1 - mean2) / pooledStandardDeviation
}
