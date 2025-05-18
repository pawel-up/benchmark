import { test } from '@japa/runner'
import { Logger, type ILogObj } from 'tslog'
import sinon from 'sinon'
import { Benchmarker } from '../../src/benchmark.js'
import type { BenchmarkOptions } from '../../src/types.js'
import * as Statistics from '../../src/statistics.js'

test.group('Benchmarker', () => {
  test('should run a synchronous benchmark', async ({ assert }) => {
    const benchmarker = new Benchmarker('Sync Benchmark', () => {
      let sum = 0
      for (let i = 0; i < 1000; i++) {
        sum += i
      }
      return sum
    })
    await benchmarker.run()
    const report = benchmarker.getReport()
    assert.equal(report.name, 'Sync Benchmark')
    assert.isAbove(report.ops, 0)
    assert.isAbove(report.size, 0)
    assert.isDefined(report.rme)
    assert.isDefined(report.stddev)
    assert.isDefined(report.mean)
    assert.isDefined(report.me)
    assert.isDefined(report.sample)
    assert.isDefined(report.sem)
    assert.isDefined(report.variance)
  })

  test('should run an asynchronous benchmark', async ({ assert }) => {
    const benchmarker = new Benchmarker('Async Benchmark', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1))
    })
    await benchmarker.run()
    const report = benchmarker.getReport()
    assert.equal(report.name, 'Async Benchmark')
    assert.isAbove(report.ops, 0)
    assert.isAbove(report.size, 0)
    assert.isDefined(report.rme)
    assert.isDefined(report.stddev)
    assert.isDefined(report.mean)
    assert.isDefined(report.me)
    assert.isDefined(report.sample)
    assert.isDefined(report.sem)
    assert.isDefined(report.variance)
  }).timeout(20000)

  test('should handle errors in the benchmark function', async ({ assert }) => {
    const benchmarker = new Benchmarker(
      'Error Benchmark',
      () => {
        throw new Error('Test error')
      },
      { logLevel: 6 }
    )
    await assert.rejects(() => benchmarker.run(), 'Test error')
  })

  test('should handle options', async ({ assert }) => {
    const options: BenchmarkOptions = {
      maxExecutionTime: 100,
      maxIterations: 10,
      warmupIterations: 5,
      innerIterations: 5,
      maxInnerIterations: 50,
      timeThreshold: 0.5,
      minSamples: 5,
      logLevel: 5,
    }
    const benchmarker = new Benchmarker('Options Benchmark', () => {}, options)
    await benchmarker.run()
    const report = benchmarker.getReport()
    assert.equal(report.name, 'Options Benchmark')
    assert.isAbove(report.size, 0)
  })

  test('should handle very fast functions', async ({ assert }) => {
    const benchmarker = new Benchmarker('Very Fast Benchmark', () => {
      // Empty function
    })
    await benchmarker.run()
    const report = benchmarker.getReport()
    assert.equal(report.name, 'Very Fast Benchmark')
    assert.isAbove(report.size, 0)
  })

  test('should handle very slow functions', async ({ assert }) => {
    const benchmarker = new Benchmarker(
      'Very Slow Benchmark',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 1))
      },
      { maxExecutionTime: 5 }
    )
    await benchmarker.run()
    const report = benchmarker.getReport()
    assert.equal(report.name, 'Very Slow Benchmark')
    assert.isAbove(report.size, 0)
  }).timeout(2000)

  test('should calculate correct statistics', async ({ assert }) => {
    const data = [1, 2, 3, 4, 5]
    const benchmarker = new Benchmarker('Statistics Benchmark', () => {}, { maxIterations: 5 })
    benchmarker['results'] = data
    const report = benchmarker.getReport()

    const expectedMean = Statistics.arithmeticMean(data)
    const expectedStdDev = Statistics.sampleStandardDeviation(data)
    const expectedMarginOfError = Statistics.marginOfError(expectedStdDev, data.length)
    const expectedRME = Statistics.relativeMarginOfError(expectedMean, expectedStdDev, data.length)
    const expectedVariance = Statistics.sampleVariance(data)
    const expectedStandardErrorOfTheMean = expectedStdDev / Math.sqrt(data.length)
    const expectedMedian = Statistics.median(data)
    const expectedOperations = 1000 / expectedMean

    assert.equal(report.ops, expectedOperations)
    assert.equal(report.rme, expectedRME)
    assert.equal(report.stddev, expectedStdDev)
    assert.equal(report.mean, expectedMean)
    assert.equal(report.me, expectedMarginOfError)
    assert.deepEqual(report.sample, data)
    assert.equal(report.sem, expectedStandardErrorOfTheMean)
    assert.equal(report.variance, expectedVariance)
    assert.equal(report.size, data.length)
    assert.equal(report.median, expectedMedian)
  })

  test('should handle empty results', async ({ assert }) => {
    const benchmarker = new Benchmarker('Empty Results Benchmark', () => {}, { maxIterations: 0 })
    await benchmarker.run()
    const report = benchmarker.getReport()

    assert.equal(report.mean, 0)
    assert.equal(report.stddev, 0)
    assert.equal(report.me, 0)
    assert.equal(report.rme, 0)
    assert.equal(report.variance, 0)
    assert.equal(report.sem, 0)
    assert.equal(report.size, 0)
  })

  test('should remove outliers', async ({ assert }) => {
    const data = [1, 2, 3, 4, 5, 100]
    const benchmarker = new Benchmarker('Outlier Removal Benchmark', () => {}, { minSamples: 5 })
    benchmarker['results'] = data
    benchmarker['removeOutliers']()
    assert.equal(benchmarker['results'].length, 5)
    assert.notInclude(benchmarker['results'], 100)
    assert.equal(benchmarker['getSampleSize'](), 5)
  })

  test('should adapt innerIterations', async ({ assert }) => {
    const initialInnerIterations = 10
    const timeThreshold = 5
    const benchmarker = new Benchmarker(
      'Adaptive Inner Iterations Benchmark',
      () => {
        // Very fast function
      },
      { timeThreshold, innerIterations: initialInnerIterations, maxIterations: 10 }
    )
    await benchmarker.run()
    assert.isAbove(benchmarker['innerIterations'], initialInnerIterations)
  }).timeout(2000)

  test('should not adapt innerIterations', async ({ assert }) => {
    const initialInnerIterations = 10
    const timeThreshold = 0.000001
    const benchmarker = new Benchmarker(
      'Adaptive Inner Iterations Benchmark',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 1))
      },
      { timeThreshold, innerIterations: initialInnerIterations, maxIterations: 10 }
    )
    await benchmarker.run()
    assert.equal(benchmarker['innerIterations'], initialInnerIterations)
  }).timeout(2000)

  test('should log warnings', async ({ assert }) => {
    const logger = new Logger<ILogObj>({ minLevel: 6 })
    const spy = sinon.spy(logger, 'warn')
    const benchmarker = new Benchmarker('Warnings Benchmark', () => {}, { maxIterations: 0, minSamples: 10 }, logger)
    await benchmarker.run()
    assert.isTrue(spy.called)
  }).timeout(2000)
})
