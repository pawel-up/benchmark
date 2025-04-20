/* eslint-disable max-len */
import { test } from '@japa/runner'
import { CliReporter, type CliReporterOptions, type ColorThresholds } from '../src/reporters/cli_reporter.js'
import sinon from 'sinon'
import type { BenchmarkReport, SuiteReport } from '../src/types.js'
import { Logger, type ILogObj } from 'tslog'

test.group('Cli Reporter', (group) => {
  let consoleLogStub: sinon.SinonSpy
  let consoleErrorStub: sinon.SinonSpy
  let loggerInfoStub: sinon.SinonSpy
  let loggerLogStub: sinon.SinonSpy
  let loggerErrorStub: sinon.SinonSpy
  let logger: Logger<ILogObj>

  const defaultRmeColorThresholds: ColorThresholds = { yellow: 0.05, red: 0.1 }
  const defaultStdDevAndMoeColorThresholds: ColorThresholds = { yellow: 0.01, red: 0.05 }

  const validReport: BenchmarkReport = {
    kind: 'benchmark',
    name: 'My Benchmark',
    operationsPerSecond: 1000,
    samples: 100,
    relativeMarginOfError: 0.02,
    sampleStandardDeviation: 0.005,
    marginOfError: 0.01,
    sampleArithmeticMean: 0.001,
    sampleVariance: 0.000025,
    date: '2023-10-27',
    executionTimes: [1, 2, 3],
    standardErrorOfTheMean: 0.001,
    sampleMedian: 0.001,
  }

  const validSuiteReport: SuiteReport = {
    kind: 'suite',
    date: '2023-10-27',
    name: 'My Suite',
    results: [validReport, validReport],
  }

  group.each.setup(() => {
    consoleLogStub = sinon.stub(console, 'log')
    consoleErrorStub = sinon.stub(console, 'error')
    logger = new Logger({ type: 'hidden' })
    loggerInfoStub = sinon.stub(logger, 'info')
    loggerLogStub = sinon.stub(logger, 'log')
    loggerErrorStub = sinon.stub(logger, 'error')
  })

  group.each.teardown(() => {
    consoleLogStub.restore()
    consoleErrorStub.restore()
    loggerInfoStub.restore()
    loggerLogStub.restore()
    loggerErrorStub.restore()
  })

  test('should log info message on creation', async ({ assert }) => {
    new CliReporter({}, logger)
    assert.isTrue(loggerInfoStub.calledOnce)
  })

  test('sets its own reporter', async ({ assert }) => {
    const reporter = new CliReporter({})
    assert.ok(reporter['logger'])
  })

  test('should use default options if none are provided', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    assert.deepEqual(reporter['rmeColorThresholds'], defaultRmeColorThresholds)
    assert.deepEqual(reporter['stdDevAndMoeColorThresholds'], defaultStdDevAndMoeColorThresholds)
  })

  test('should use provided options', async ({ assert }) => {
    const options: CliReporterOptions = {
      format: 'long',
      rmeColorThresholds: { yellow: 0.1, red: 0.2 },
      stdDevAndMoeColorThresholds: { yellow: 0.02, red: 0.06 },
    }
    const reporter = new CliReporter(options, logger)
    assert.deepEqual(reporter['options'], options)
    assert.deepEqual(reporter['rmeColorThresholds'], options.rmeColorThresholds)
    assert.deepEqual(reporter['stdDevAndMoeColorThresholds'], options.stdDevAndMoeColorThresholds)
  })

  test('should print short report', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    await reporter.run(validReport)
    assert.isTrue(consoleLogStub.called)
    assert.isTrue(consoleLogStub.calledWithMatch(/My Benchmark/))
    assert.isTrue(consoleLogStub.calledWithMatch(/1,000 ops\/sec/))
    assert.isTrue(consoleLogStub.calledWithMatch(/2%/))
    assert.isTrue(consoleLogStub.calledWithMatch(/\(100 run\(s\) sampled\)/))
  })

  test('should print long report', async ({ assert }) => {
    const reporter = new CliReporter({ format: 'long' }, logger)
    await reporter.run(validReport)
    assert.isTrue(consoleLogStub.called)
    assert.isTrue(consoleLogStub.calledWithMatch(/Benchmark: My Benchmark/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Samples/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Operations per second/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Relative margin of error \(RME\)/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Sample standard deviation/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Margin of error/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Sample arithmetic mean/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Execution Time Variance/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Date run/))
  })

  test('should print short report for each item in suite report', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    await reporter.run(validSuiteReport)
    assert.isTrue(consoleLogStub.calledTwice)
  })

  test('should print long report for each item in suite report', async ({ assert }) => {
    const reporter = new CliReporter({ format: 'long' }, logger)
    await reporter.run(validSuiteReport)
    assert.equal(consoleLogStub.callCount, 2)
  })

  test('should throw error for invalid short report', async ({ assert }) => {
    const reporter = new CliReporter({ format: 'short' }, logger)
    const invalidReport = { ...validReport, name: null } as unknown as BenchmarkReport
    await assert.rejects(() => reporter.run(invalidReport), 'Invalid benchmark report data.')
  })

  test('should throw error for invalid long report', async ({ assert }) => {
    const reporter = new CliReporter({ format: 'long' }, logger)
    const invalidReport = { ...validReport, name: null } as unknown as BenchmarkReport
    await assert.rejects(() => reporter.run(invalidReport), 'Invalid benchmark report data.')
  })

  test('should color code string green', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const result = reporter['colorCode']('test', 0.01, { yellow: 0.05, red: 0.1 })
    assert.equal(result, '\u001b[32mtest\u001b[39m')
  })

  test('should color code string yellow', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const result = reporter['colorCode']('test', 0.07, { yellow: 0.05, red: 0.1 })
    assert.equal(result, '\u001b[33mtest\u001b[39m')
  })

  test('should color code string red', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const result = reporter['colorCode']('test', 0.15, { yellow: 0.05, red: 0.1 })
    assert.equal(result, '\u001b[31mtest\u001b[39m')
  })

  test('should validate report with missing properties', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport } as { name?: string }
    delete invalidReport.name
    const result = reporter.isValidReport(invalidReport as unknown as BenchmarkReport)
    assert.isFalse(result)
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], 'Missing property "name". "name" must be a string.')
  })

  test('should validate report with invalid types', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, name: 123 }
    assert.isFalse(reporter.isValidReport(invalidReport as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"name" must be a string.')
  })

  test('should validate report with negative numbers', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, operationsPerSecond: -1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"operationsPerSecond" must be a non-negative number.')
  })

  test('should validate report with null', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    assert.isFalse(reporter.isValidReport(null as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], 'Report must be an object.')
  })

  test('should validate report with multiple missing properties', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport } as { name?: string; operationsPerSecond?: number }
    delete invalidReport.name
    delete invalidReport.operationsPerSecond
    assert.isFalse(reporter.isValidReport(invalidReport as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(
      loggerErrorStub.args[0][1],
      'Missing properties: name, operationsPerSecond. "name" must be a string. "operationsPerSecond" must be a non-negative number.'
    )
  })
})

test.group('Cli Reporter - isValidReport', (group) => {
  let consoleLogStub: sinon.SinonSpy
  let consoleErrorStub: sinon.SinonSpy
  let loggerInfoStub: sinon.SinonSpy
  let loggerLogStub: sinon.SinonSpy
  let loggerErrorStub: sinon.SinonSpy
  let logger: Logger<ILogObj>

  const validReport: BenchmarkReport = {
    kind: 'benchmark',
    name: 'My Benchmark',
    operationsPerSecond: 1000,
    samples: 100,
    relativeMarginOfError: 0.02,
    sampleStandardDeviation: 0.005,
    marginOfError: 0.01,
    sampleArithmeticMean: 0.001,
    sampleVariance: 0.000025,
    date: '2023-10-27',
    executionTimes: [1, 2, 3],
    standardErrorOfTheMean: 0.001,
    sampleMedian: 0.001,
  }

  group.each.setup(() => {
    consoleLogStub = sinon.stub(console, 'log')
    consoleErrorStub = sinon.stub(console, 'error')
    logger = new Logger({ type: 'hidden' })
    loggerInfoStub = sinon.stub(logger, 'info')
    loggerLogStub = sinon.stub(logger, 'log')
    loggerErrorStub = sinon.stub(logger, 'error')
  })

  group.each.teardown(() => {
    consoleLogStub.restore()
    consoleErrorStub.restore()
    loggerInfoStub.restore()
    loggerLogStub.restore()
    loggerErrorStub.restore()
  })

  test('should return true for a valid report', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    assert.isTrue(reporter.isValidReport(validReport))
    assert.isFalse(loggerErrorStub.called)
  })

  test('should return false for a null report', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    assert.isFalse(reporter.isValidReport(null as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], 'Report must be an object.')
  })

  test('should return false for a report with missing name', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport } as { name?: string }
    delete invalidReport.name
    assert.isFalse(reporter.isValidReport(invalidReport as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], 'Missing property "name". "name" must be a string.')
  })

  test('should return false for a report with invalid name type', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, name: 123 }
    assert.isFalse(reporter.isValidReport(invalidReport as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"name" must be a string.')
  })

  test('should return false for a report with negative operationsPerSecond', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, operationsPerSecond: -1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"operationsPerSecond" must be a non-negative number.')
  })

  test('should return false for a report with negative samples', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, samples: -1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"samples" must be a non-negative number.')
  })

  test('should return false for a report with negative relativeMarginOfError', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, relativeMarginOfError: -0.1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"relativeMarginOfError" must be a non-negative number.')
  })

  test('should return false for a report with negative sampleStandardDeviation', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, sampleStandardDeviation: -0.1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"sampleStandardDeviation" must be a non-negative number.')
  })

  test('should return false for a report with negative marginOfError', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, marginOfError: -0.1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"marginOfError" must be a non-negative number.')
  })

  test('should return false for a report with negative sampleArithmeticMean', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, sampleArithmeticMean: -0.1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"sampleArithmeticMean" must be a non-negative number.')
  })

  test('should return false for a report with negative sampleVariance', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, sampleVariance: -0.1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"sampleVariance" must be a non-negative number.')
  })

  test('should return false for a report with invalid date type', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, date: 123 }
    assert.isFalse(reporter.isValidReport(invalidReport as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"date" must be a string.')
  })

  test('should return false for a report with multiple missing properties', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport } as { name?: string; operationsPerSecond?: number }
    delete invalidReport.name
    delete invalidReport.operationsPerSecond
    assert.isFalse(reporter.isValidReport(invalidReport as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(
      loggerErrorStub.args[0][1],
      'Missing properties: name, operationsPerSecond. "name" must be a string. "operationsPerSecond" must be a non-negative number.'
    )
  })

  test('should return false for a report with multiple errors', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, name: 123, operationsPerSecond: -1, samples: -1 }
    assert.isFalse(reporter.isValidReport(invalidReport as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(
      loggerErrorStub.args[0][1],
      '"name" must be a string. "operationsPerSecond" must be a non-negative number. "samples" must be a non-negative number.'
    )
  })
})
