import { test } from '@japa/runner'
import * as Statistics from '../../src/statistics.js'

test.group('Statistics', () => {
  test('should calculate the arithmetic mean', ({ assert }) => {
    assert.equal(Statistics.arithmeticMean([1, 2, 3, 4, 5]), 3)
    assert.equal(Statistics.arithmeticMean([2, 4, 6, 8]), 5)
    assert.equal(Statistics.arithmeticMean([1, 1, 1, 1]), 1)
    assert.equal(Statistics.arithmeticMean([-1, 0, 1]), 0)
  })

  test('should throw an error for empty data in arithmeticMean', ({ assert }) => {
    assert.throws(() => Statistics.arithmeticMean([]), 'Data array cannot be empty.')
  })

  test('should calculate the median', ({ assert }) => {
    assert.equal(Statistics.median([1, 2, 3, 4, 5]), 3)
    assert.equal(Statistics.median([1, 2, 3, 4]), 2.5)
    assert.equal(Statistics.median([1, 1, 1, 1]), 1)
    assert.equal(Statistics.median([1, 3, 2, 4]), 2.5)
  })

  test('should throw an error for empty data in median', ({ assert }) => {
    assert.throws(() => Statistics.median([]), 'Data array cannot be empty.')
  })

  test('should calculate the t-statistic', ({ assert }) => {
    const mean1 = 10
    const mean2 = 12
    const s1 = 2
    const s2 = 3
    const n1 = 10
    const n2 = 12
    const expectedT = -1.8650096164806276
    assert.approximately(Statistics.calculateTStatistic(mean1, mean2, s1, s2, n1, n2), expectedT, 0.000001)
  })

  test('should calculate the degrees of freedom', ({ assert }) => {
    const s1 = 2
    const s2 = 3
    const n1 = 10
    const n2 = 12
    const expectedDf = 19.190545987541217
    assert.approximately(Statistics.calculateDegreesOfFreedom(s1, s2, n1, n2), expectedDf, 0.000001)
  })

  test('should calculate the p-value', ({ assert }) => {
    const t = -1.88982236504
    const df = 18.9782608695
    const expectedPValue = 0.07415556
    assert.approximately(Statistics.calculatePValue(t, df), expectedPValue, 0.000001)
  })

  test('should calculate the sample standard deviation', ({ assert }) => {
    assert.equal(Statistics.sampleStandardDeviation([1, 2, 3, 4, 5]), 1.5811388300841898)
    assert.equal(Statistics.sampleStandardDeviation([2, 4, 6, 8]), 2.581988897471611)
    assert.equal(Statistics.sampleStandardDeviation([1, 1, 1, 1]), 0)
  })

  test('should calculate the sample variance', ({ assert }) => {
    assert.equal(Statistics.sampleVariance([1, 2, 3, 4, 5]), 2.5)
    assert.equal(Statistics.sampleVariance([2, 4, 6, 8]), 6.666666666666667)
    assert.equal(Statistics.sampleVariance([1, 1, 1, 1]), 0)
  })

  test('should calculate the percentile', ({ assert }) => {
    const sortedData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    assert.equal(Statistics.getPercentile(sortedData, 50), 5.5)
    assert.equal(Statistics.getPercentile(sortedData, 25), 3.25)
    assert.equal(Statistics.getPercentile(sortedData, 75), 7.75)
    assert.equal(Statistics.getPercentile(sortedData, 0), 1)
    assert.equal(Statistics.getPercentile(sortedData, 100), 10)
  })

  test('should calculate the relative margin of error', ({ assert }) => {
    const mean = 5
    const stdDev = 2
    const expectedRME = 0.1568
    assert.approximately(Statistics.relativeMarginOfError(mean, stdDev, 25), expectedRME, 0.000001)
  })

  test('should calculate the margin of error', ({ assert }) => {
    const stdDev = 2
    const expectedMOE = 0.784
    assert.approximately(Statistics.marginOfError(stdDev, 25), expectedMOE, 0.000001)
  })

  test('should calculate the p-value with positive t and valid df', ({ assert }) => {
    const t = 2.0
    const df = 20
    const expectedPValue = 0.05926553405056212
    assert.approximately(Statistics.calculatePValue(t, df), expectedPValue, 0.000001)
  })

  test('should calculate the p-value with negative t and valid df', ({ assert }) => {
    const t = -2.0
    const df = 20
    const expectedPValue = 0.05926553405056212
    assert.approximately(Statistics.calculatePValue(t, df), expectedPValue, 0.000001)
  })

  test('should calculate the p-value with small t and valid df', ({ assert }) => {
    const t = 0.5
    const df = 10
    const expectedPValue = 0.6278936057243043
    assert.approximately(Statistics.calculatePValue(t, df), expectedPValue, 0.000001)
  })

  test('should throw an error if df is zero', ({ assert }) => {
    const t = 2.0
    const df = 0
    assert.throws(() => Statistics.calculatePValue(t, df), 'Degrees of freedom must be greater than 0.')
  })

  test('should throw an error if df is negative', ({ assert }) => {
    const t = 2.0
    const df = -1
    assert.throws(() => Statistics.calculatePValue(t, df), 'Degrees of freedom must be greater than 0.')
  })

  test('should throw an error if t is NaN', ({ assert }) => {
    const t = NaN
    const df = 10
    assert.throws(() => Statistics.calculatePValue(t, df), 't and df must be numbers.')
  })

  test('should throw an error if df is NaN', ({ assert }) => {
    const t = 2.0
    const df = NaN
    assert.throws(() => Statistics.calculatePValue(t, df), 't and df must be numbers.')
  })

  test('should calculate p-value correctly for various t and df values', ({ assert }) => {
    // Test cases covering different scenarios for t and df
    const testCases = [
      { t: 1.5, df: 15, expectedPValue: 0.15436666 },
      { t: -2.5, df: 25, expectedPValue: 0.019343128 },
      { t: 0.8, df: 5, expectedPValue: 0.4600141 },
      { t: -1.2, df: 10, expectedPValue: 0.2577963 },
      { t: 3.0, df: 30, expectedPValue: 0.005389964 },
      { t: -0.5, df: 2, expectedPValue: 0.6666667 },
      { t: 2.2, df: 8, expectedPValue: 0.05899391 },
      { t: -1.8, df: 18, expectedPValue: 0.08864433 },
    ]

    for (const { t, df, expectedPValue } of testCases) {
      assert.approximately(Statistics.calculatePValue(t, df), expectedPValue, 0.00001, `t: ${t}, df: ${df}`)
    }
  })

  test('should format p-value correctly for positive values', ({ assert }) => {
    assert.equal(Statistics.formatPValue(0.1), 0.1005)
    assert.equal(Statistics.formatPValue(0.5), 0.5005)
  })

  test('should format p-value correctly for negative values', ({ assert }) => {
    assert.equal(Statistics.formatPValue(-0.1), -0.1005)
    assert.equal(Statistics.formatPValue(-0.5), -0.5005)
  })
})
