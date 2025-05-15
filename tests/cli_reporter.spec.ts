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
    ops: 1000,
    size: 100,
    rme: 0.02,
    stddev: 0.005,
    me: 0.01,
    mean: 0.001,
    variance: 0.000025,
    date: '2023-10-27',
    sample: [1, 2, 3],
    sem: 0.001,
    median: 0.001,
    group: 'Test Group',
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
    assert.isTrue(consoleLogStub.calledWithMatch(/My Benchmark \(Test Group\)/))
  })

  test('should print long report', async ({ assert }) => {
    const reporter = new CliReporter({ format: 'long' }, logger)
    await reporter.run(validReport)
    assert.isTrue(consoleLogStub.called)
    assert.isTrue(consoleLogStub.calledWithMatch(/Benchmark: My Benchmark/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Sample size/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Operations per second/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Relative margin of error \(RME\)/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Sample standard deviation/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Margin of error/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Sample arithmetic mean/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Execution Time Variance/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Date run/))
    assert.isTrue(consoleLogStub.calledWithMatch(/Benchmark: My Benchmark \(Test Group\)/))
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
    const invalidReport = { ...validReport, ops: -1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"ops" must be a non-negative number.')
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
    const invalidReport = { ...validReport } as { name?: string; ops?: number }
    delete invalidReport.name
    delete invalidReport.ops
    assert.isFalse(reporter.isValidReport(invalidReport as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(
      loggerErrorStub.args[0][1],
      'Missing properties: name, ops. "name" must be a string. "ops" must be a non-negative number.'
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
    ops: 1000,
    size: 100,
    rme: 0.02,
    stddev: 0.005,
    me: 0.01,
    mean: 0.001,
    variance: 0.000025,
    date: '2023-10-27',
    sample: [1, 2, 3],
    sem: 0.001,
    median: 0.001,
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

  test('should return false for a report with negative ops', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, ops: -1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"ops" must be a non-negative number.')
  })

  test('should return false for a report with negative size', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, size: -1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"size" must be a non-negative number.')
  })

  test('should return false for a report with negative rme', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, rme: -0.1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"rme" must be a non-negative number.')
  })

  test('should return false for a report with negative stddev', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, stddev: -0.1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"stddev" must be a non-negative number.')
  })

  test('should return false for a report with negative me', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, me: -0.1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"me" must be a non-negative number.')
  })

  test('should return false for a report with negative mean', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, mean: -0.1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"mean" must be a non-negative number.')
  })

  test('should return false for a report with negative variance', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, variance: -0.1 }
    assert.isFalse(reporter.isValidReport(invalidReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(loggerErrorStub.args[0][1], '"variance" must be a non-negative number.')
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
    const invalidReport = { ...validReport } as { name?: string; ops?: number }
    delete invalidReport.name
    delete invalidReport.ops
    assert.isFalse(reporter.isValidReport(invalidReport as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(
      loggerErrorStub.args[0][1],
      'Missing properties: name, ops. "name" must be a string. "ops" must be a non-negative number.'
    )
  })

  test('should return false for a report with multiple errors', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const invalidReport = { ...validReport, name: 123, ops: -1, size: -1 }
    assert.isFalse(reporter.isValidReport(invalidReport as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.args[0][0], 'Invalid report:')
    assert.equal(
      loggerErrorStub.args[0][1],
      '"name" must be a string. "ops" must be a non-negative number. "size" must be a non-negative number.'
    )
  })

  test('should initialize name padding based on benchmark names', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    await reporter.initialize({
      benchmarks: [{ name: 'short' }, { name: 'longerName' }, { name: 'veryLongBenchmarkName' }],
    })
    assert.equal(reporter['namePadding'], 'veryLongBenchmarkName'.length + 4)
  })

  test('should format name with group', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    const formattedName = reporter['formatName']('benchmarkName', 'groupName')
    assert.equal(formattedName, 'benchmarkName (groupName)')
  })

  test('should format name without group', async ({ assert }) => {
    const reporter = new CliReporter({}, logger)
    assert.equal(reporter['formatName']('benchmarkName'), 'benchmarkName')
  })
})
