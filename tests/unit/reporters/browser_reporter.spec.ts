import { test } from '@japa/runner'
import {
  BrowserReporter,
  type BrowserReporterOptions,
  type ColorThresholds,
} from '../../../src/reporters/browser_reporter.js'
import sinon from 'sinon'
import type { BenchmarkReport, SuiteReport } from '../../../src/types.js'
import { Logger, type ILogObj } from 'tslog'

const CSS_GREEN = 'color: #22c55e; font-weight: bold'
const CSS_YELLOW = 'color: #eab308; font-weight: bold'
const CSS_RED = 'color: #ef4444; font-weight: bold'
const CSS_RESET = 'color: inherit; font-weight: normal'
const CSS_BOLD = 'font-weight: bold'

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

test.group('Browser Reporter', (group) => {
  let consoleLogStub: sinon.SinonStub
  let consoleErrorStub: sinon.SinonStub
  let consoleGroupStub: sinon.SinonStub
  let consoleGroupEndStub: sinon.SinonStub
  let consoleTableStub: sinon.SinonStub

  group.each.setup(() => {
    consoleLogStub = sinon.stub(console, 'log')
    consoleErrorStub = sinon.stub(console, 'error')
    consoleGroupStub = sinon.stub(console, 'group')
    consoleGroupEndStub = sinon.stub(console, 'groupEnd')
    consoleTableStub = sinon.stub(console, 'table')
  })

  group.each.teardown(() => {
    consoleLogStub.restore()
    consoleErrorStub.restore()
    consoleGroupStub.restore()
    consoleGroupEndStub.restore()
    consoleTableStub.restore()
  })

  test('should use default options when none are provided', async ({ assert }) => {
    const reporter = new BrowserReporter()
    assert.deepEqual(reporter['rmeColorThresholds'], defaultRmeColorThresholds)
    assert.deepEqual(reporter['stdDevAndMoeColorThresholds'], defaultStdDevAndMoeColorThresholds)
  })

  test('should use provided options', async ({ assert }) => {
    const options: BrowserReporterOptions = {
      format: 'long',
      rmeColorThresholds: { yellow: 0.1, red: 0.2 },
      stdDevAndMoeColorThresholds: { yellow: 0.02, red: 0.06 },
    }
    const reporter = new BrowserReporter(options)
    assert.deepEqual(reporter['rmeColorThresholds'], options.rmeColorThresholds)
    assert.deepEqual(reporter['stdDevAndMoeColorThresholds'], options.stdDevAndMoeColorThresholds)
  })

  test('should print short report', async ({ assert }) => {
    const reporter = new BrowserReporter()
    await reporter.run(validReport)
    assert.isTrue(consoleLogStub.calledOnce)
    const [fmt] = consoleLogStub.firstCall.args
    assert.match(fmt, /My Benchmark/)
    assert.match(fmt, /1,000 ops\/sec/)
    assert.match(fmt, /My Benchmark \(Test Group\)/)
    assert.match(fmt, /run\(s\) sampled/)
  })

  test('short report passes CSS bold for name and CSS reset after name', async ({ assert }) => {
    const reporter = new BrowserReporter()
    await reporter.run(validReport)
    const args = consoleLogStub.firstCall.args
    // args: [formatStr, CSS.bold, CSS.reset, rmeCss, CSS.reset]
    assert.equal(args[1], CSS_BOLD)
    assert.equal(args[2], CSS_RESET)
    assert.equal(args[4], CSS_RESET)
  })

  test('short report colors RME green when below yellow threshold', async ({ assert }) => {
    const reporter = new BrowserReporter() // rme threshold: yellow=0.05, red=0.1
    await reporter.run({ ...validReport, rme: 0.02 }) // green
    assert.equal(consoleLogStub.firstCall.args[3], CSS_GREEN)
  })

  test('short report colors RME yellow when between thresholds', async ({ assert }) => {
    const reporter = new BrowserReporter()
    await reporter.run({ ...validReport, rme: 0.07 })
    assert.equal(consoleLogStub.firstCall.args[3], CSS_YELLOW)
  })

  test('short report colors RME red when above red threshold', async ({ assert }) => {
    const reporter = new BrowserReporter()
    await reporter.run({ ...validReport, rme: 0.15 })
    assert.equal(consoleLogStub.firstCall.args[3], CSS_RED)
  })

  test('should print short report for each item in suite report', async ({ assert }) => {
    const reporter = new BrowserReporter()
    await reporter.run(validSuiteReport)
    assert.equal(consoleLogStub.callCount, 2)
  })

  test('should print long report', async ({ assert }) => {
    const reporter = new BrowserReporter({ format: 'long' })
    await reporter.run(validReport)
    assert.isTrue(consoleGroupStub.calledOnce)
    assert.isTrue(consoleGroupStub.calledWith('Benchmark: My Benchmark (Test Group)'))
    assert.isTrue(consoleTableStub.calledOnce)
    assert.isTrue(consoleGroupEndStub.calledOnce)
    // 3 console.log calls: RME, stddev, MOE
    assert.equal(consoleLogStub.callCount, 3)
  })

  test('long report console.table contains expected metric keys', async ({ assert }) => {
    const reporter = new BrowserReporter({ format: 'long' })
    await reporter.run(validReport)
    const tableArg = consoleTableStub.firstCall.args[0]
    assert.property(tableArg, 'Sample size')
    assert.property(tableArg, 'Operations per second')
    assert.property(tableArg, 'Mean execution time')
    assert.property(tableArg, 'Median execution time')
    assert.property(tableArg, 'Execution time variance')
    assert.property(tableArg, 'Date run')
  })

  test('long report logs RME, stddev and MOE with color coding', async ({ assert }) => {
    const reporter = new BrowserReporter({ format: 'long' })
    await reporter.run(validReport)
    const logCalls = consoleLogStub.args.map((a) => a[0] as string)
    assert.isTrue(logCalls.some((s) => s.includes('Relative margin of error')))
    assert.isTrue(logCalls.some((s) => s.includes('Sample standard deviation')))
    assert.isTrue(logCalls.some((s) => s.includes('Margin of error')))
  })

  test('long report passes CSS reset as last arg for each color-coded log', async ({ assert }) => {
    const reporter = new BrowserReporter({ format: 'long' })
    await reporter.run(validReport)
    for (const callArgs of consoleLogStub.args) {
      assert.equal(callArgs[callArgs.length - 1], CSS_RESET)
    }
  })

  test('should print long report for each item in suite report', async ({ assert }) => {
    const reporter = new BrowserReporter({ format: 'long' })
    await reporter.run(validSuiteReport)
    assert.equal(consoleGroupStub.callCount, 2)
    assert.equal(consoleTableStub.callCount, 2)
    assert.equal(consoleGroupEndStub.callCount, 2)
    assert.equal(consoleLogStub.callCount, 6) // 3 per benchmark × 2
  })

  test('should throw for invalid short report', async ({ assert }) => {
    const reporter = new BrowserReporter({ format: 'short' })
    const invalidReport = { ...validReport, name: null } as unknown as BenchmarkReport
    await assert.rejects(() => reporter.run(invalidReport), 'Invalid benchmark report data.')
  })

  test('should throw for invalid long report', async ({ assert }) => {
    const reporter = new BrowserReporter({ format: 'long' })
    const invalidReport = { ...validReport, name: null } as unknown as BenchmarkReport
    await assert.rejects(() => reporter.run(invalidReport), 'Invalid benchmark report data.')
  })

  test('should set name padding from initialize', async ({ assert }) => {
    const reporter = new BrowserReporter()
    await reporter.initialize({
      benchmarks: [{ name: 'short' }, { name: 'veryLongBenchmarkName' }],
    })
    assert.equal(reporter['namePadding'], 'veryLongBenchmarkName'.length + 4)
  })

  test('initialize respects minimum padding of 25', async ({ assert }) => {
    const reporter = new BrowserReporter()
    await reporter.initialize({ benchmarks: [{ name: 'tiny' }] })
    assert.equal(reporter['namePadding'], 25)
  })

  test('initialize accounts for group in display name length', async ({ assert }) => {
    const reporter = new BrowserReporter()
    await reporter.initialize({ benchmarks: [{ name: 'bench', group: 'grp' }] })
    // formatName produces "bench (grp)" = 11 chars; + 4 = 15, clamped to min 25
    assert.equal(reporter['namePadding'], 25)
  })

  test('should format name with group', async ({ assert }) => {
    const reporter = new BrowserReporter()
    assert.equal(reporter['formatName']('benchmarkName', 'groupName'), 'benchmarkName (groupName)')
  })

  test('should format name without group', async ({ assert }) => {
    const reporter = new BrowserReporter()
    assert.equal(reporter['formatName']('benchmarkName'), 'benchmarkName')
  })

  test('cssForValue returns green below yellow threshold', async ({ assert }) => {
    const reporter = new BrowserReporter()
    assert.equal(reporter['cssForValue'](0.02, { yellow: 0.05, red: 0.1 }), CSS_GREEN)
  })

  test('cssForValue returns yellow between thresholds', async ({ assert }) => {
    const reporter = new BrowserReporter()
    assert.equal(reporter['cssForValue'](0.07, { yellow: 0.05, red: 0.1 }), CSS_YELLOW)
  })

  test('cssForValue returns red above red threshold', async ({ assert }) => {
    const reporter = new BrowserReporter()
    assert.equal(reporter['cssForValue'](0.15, { yellow: 0.05, red: 0.1 }), CSS_RED)
  })
})

test.group('Browser Reporter - isValidReport', (group) => {
  let consoleLogStub: sinon.SinonStub
  let consoleGroupStub: sinon.SinonStub
  let consoleGroupEndStub: sinon.SinonStub
  let consoleTableStub: sinon.SinonStub
  let logger: Logger<ILogObj>
  let loggerErrorStub: sinon.SinonStub

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
    consoleGroupStub = sinon.stub(console, 'group')
    consoleGroupEndStub = sinon.stub(console, 'groupEnd')
    consoleTableStub = sinon.stub(console, 'table')
    logger = new Logger({ type: 'hidden' })
    loggerErrorStub = sinon.stub(logger, 'error')
  })

  group.each.teardown(() => {
    consoleLogStub.restore()
    consoleGroupStub.restore()
    consoleGroupEndStub.restore()
    consoleTableStub.restore()
  })

  test('should return true for a valid report', async ({ assert }) => {
    const reporter = new BrowserReporter({}, logger)
    assert.isTrue(reporter.isValidReport(validReport))
    assert.isFalse(loggerErrorStub.called)
  })

  test('should return false and log error for null report', async ({ assert }) => {
    const reporter = new BrowserReporter({}, logger)
    assert.isFalse(reporter.isValidReport(null as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.firstCall.args[0], 'Invalid report:')
    assert.equal(loggerErrorStub.firstCall.args[1], 'Report must be an object.')
  })

  test('should return false for a report with missing name', async ({ assert }) => {
    const reporter = new BrowserReporter({}, logger)
    const invalidReport = { ...validReport } as { name?: string }
    delete invalidReport.name
    assert.isFalse(reporter.isValidReport(invalidReport as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.firstCall.args[0], 'Invalid report:')
    assert.equal(loggerErrorStub.firstCall.args[1], 'Missing property "name". "name" must be a string.')
  })

  test('should return false for a report with invalid name type', async ({ assert }) => {
    const reporter = new BrowserReporter({}, logger)
    assert.isFalse(reporter.isValidReport({ ...validReport, name: 123 } as unknown as BenchmarkReport))
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.equal(loggerErrorStub.firstCall.args[0], 'Invalid report:')
    assert.equal(loggerErrorStub.firstCall.args[1], '"name" must be a string.')
  })

  test('should return false for a report with negative ops', async ({ assert }) => {
    const reporter = new BrowserReporter({}, logger)
    assert.isFalse(reporter.isValidReport({ ...validReport, ops: -1 }))
    assert.equal(loggerErrorStub.firstCall.args[0], 'Invalid report:')
    assert.equal(loggerErrorStub.firstCall.args[1], '"ops" must be a non-negative number.')
  })

  test('should return false for a report with negative rme', async ({ assert }) => {
    const reporter = new BrowserReporter({}, logger)
    assert.isFalse(reporter.isValidReport({ ...validReport, rme: -0.1 }))
    assert.equal(loggerErrorStub.firstCall.args[0], 'Invalid report:')
    assert.equal(loggerErrorStub.firstCall.args[1], '"rme" must be a non-negative number.')
  })

  test('should return false for a report with multiple missing properties', async ({ assert }) => {
    const reporter = new BrowserReporter({}, logger)
    const invalidReport = { ...validReport } as { name?: string; ops?: number }
    delete invalidReport.name
    delete invalidReport.ops
    assert.isFalse(reporter.isValidReport(invalidReport as unknown as BenchmarkReport))
    assert.equal(loggerErrorStub.firstCall.args[0], 'Invalid report:')
    assert.equal(
      loggerErrorStub.firstCall.args[1],
      'Missing properties: name, ops. "name" must be a string. "ops" must be a non-negative number.'
    )
  })
})
