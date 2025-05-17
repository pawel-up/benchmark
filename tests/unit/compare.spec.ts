import { test } from '@japa/runner'
import {
  compare,
  compareFunction,
  compareSuites,
  outputCompareFunction,
  OutputFormat,
  SuiteReport,
  type BenchmarkReport,
} from '../../src/index.js'
import { Logger, type ILogObj } from 'tslog'
import sinon from 'sinon'
import chalk from 'chalk'

test.group('compare()', () => {
  test('should return a ComparisonResult object', ({ assert }) => {
    const ra: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Report A',
      ops: 1000,
      rme: 0.01,
      stddev: 0.001,
      mean: 0.001,
      me: 0.0002,
      sample: [0.001, 0.0011, 0.0009, 0.001, 0.001],
      sem: 0.00005,
      variance: 0.000001,
      size: 100,
      date: '2023-10-27',
      median: 0.001,
    }
    const br: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Report B',
      ops: 900,
      rme: 0.01,
      stddev: 0.001,
      mean: 0.0011,
      me: 0.0002,
      sample: [0.0011, 0.0012, 0.001, 0.0011, 0.0011],
      sem: 0.00005,
      variance: 0.000001,
      size: 100,
      date: '2023-10-27',
      median: 0.0011,
    }

    const result = compare(ra, br)

    assert.properties(result, [
      'a',
      'b',
      'ts',
      'df',
      'p',
      'different',
      'aWins',
      'dmean',
      'pmean',
      'dops',
      'pops',
      'lci',
      'uci',
      'cohensd',
      'sed',
      'dmedian',
      'pmedian',
    ])
  })

  test('should return different true and aWins true when report a is significantly faster', ({ assert }) => {
    const ra: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Report A',
      ops: 1000,
      rme: 0.01,
      stddev: 0.0005,
      mean: 0.00007,
      me: 0.0002,
      sample: [0.001, 0.0011, 0.0009, 0.001, 0.001],
      sem: 0.00005,
      variance: 0.000001,
      size: 100,
      date: '2023-10-27',
      median: 0.001,
    }
    const rb: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Report B',
      ops: 900,
      rme: 0.01,
      stddev: 0.001,
      mean: 0.0011,
      me: 0.0002,
      sample: [0.0011, 0.0012, 0.001, 0.0011, 0.0011],
      sem: 0.00005,
      variance: 0.000001,
      size: 100,
      date: '2023-10-27',
      median: 0.0011,
    }

    const result = compare(ra, rb)
    assert.isTrue(result.different)
    assert.isTrue(result.aWins)
    assert.isAbove(result.dmean, 0)
    assert.isAbove(result.pmean, 0)
    assert.isAbove(result.dmedian, 0)
    assert.isAbove(result.pmedian, 0)
    assert.isBelow(result.p, 0.05)
  })

  test('should return different true and aWins false when report A is significantly slower', ({ assert }) => {
    const ra: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Report A',
      ops: 900,
      rme: 0.01,
      stddev: 0.0005,
      mean: 0.0007,
      me: 0.0002,
      sample: [0.0011, 0.0012, 0.001, 0.0011, 0.0011],
      sem: 0.00005,
      variance: 0.000001,
      size: 100,
      date: '2023-10-27',
      median: 0.0011,
    }
    const rb: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Report B',
      ops: 1000,
      rme: 0.01,
      stddev: 0.001,
      mean: 0.0001,
      me: 0.0002,
      sample: [0.001, 0.0011, 0.0009, 0.001, 0.001],
      sem: 0.00005,
      variance: 0.000001,
      size: 100,
      date: '2023-10-27',
      median: 0.001,
    }

    const result = compare(ra, rb)

    assert.isTrue(result.different)
    assert.isFalse(result.aWins)
    assert.isBelow(result.dmean, 0)
    assert.isBelow(result.pmean, 0)
    assert.isBelow(result.dmedian, 0)
    assert.isBelow(result.pmedian, 0)
    assert.isBelow(result.p, 0.05)
  })

  test('should return isSignificantlyDifferent false when there is no statistically significant difference', ({
    assert,
  }) => {
    const ra: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Report A',
      ops: 1000,
      rme: 0.01,
      stddev: 0.001,
      mean: 0.001,
      me: 0.0002,
      sample: [0.001, 0.0011, 0.0009, 0.001, 0.001],
      sem: 0.00005,
      variance: 0.000001,
      size: 100,
      date: '2023-10-27',
      median: 0.001,
    }
    const rb: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Report B',
      ops: 1000,
      rme: 0.01,
      stddev: 0.001,
      mean: 0.00101,
      me: 0.0002,
      sample: [0.001, 0.0011, 0.0009, 0.001, 0.001],
      sem: 0.00005,
      variance: 0.000001,
      size: 100,
      date: '2023-10-27',
      median: 0.001,
    }

    const result = compare(ra, rb)

    assert.isFalse(result.different)
  })

  test('should calculate statistical values correctly', ({ assert }) => {
    const ra: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Report A',
      ops: 1000,
      rme: 0.01,
      stddev: 0.01,
      mean: 0.1,
      me: 0.0002,
      sample: [0.1, 0.11, 0.09, 0.1, 0.1],
      sem: 0.00005,
      variance: 0.0001,
      size: 100,
      date: '2023-10-27',
      median: 0.1,
    }
    const rb: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Report B',
      ops: 1000,
      rme: 0.01,
      stddev: 0.02,
      mean: 0.12,
      me: 0.0002,
      sample: [0.12, 0.13, 0.11, 0.12, 0.12],
      sem: 0.00005,
      variance: 0.0004,
      size: 100,
      date: '2023-10-27',
      median: 0.12,
    }

    const result = compare(ra, rb)

    assert.approximately(result.ts, -8.944271909999156, 0.000001)
    assert.approximately(result.df, 145.58823529411762, 0.000001)
  })

  test('should calculate statistical values correctly with p value lower than 0.05', ({ assert }) => {
    const ra: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Report A',
      ops: 1000,
      rme: 0.01,
      stddev: 0.0001, // Reduced standard deviation
      mean: 0.001,
      me: 0.0002,
      sample: [0.001, 0.0011, 0.0009, 0.001, 0.001],
      sem: 0.00005,
      variance: 0.000001,
      size: 100,
      date: '2023-10-27',
      median: 0.001,
    }
    const rb: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Report B',
      ops: 900,
      rme: 0.01,
      stddev: 0.0001, // Reduced standard deviation
      mean: 0.0012, // Increased mean
      me: 0.0002,
      sample: [0.0011, 0.0012, 0.001, 0.0011, 0.0011],
      sem: 0.00005,
      variance: 0.000001,
      size: 100,
      date: '2023-10-27',
      median: 0.0011,
    }

    const result = compare(ra, rb)

    assert.isBelow(result.p, 0.05)
  })
})

test.group('compareFunction', (group) => {
  let loggerInfoStub: sinon.SinonSpy
  let loggerWarnStub: sinon.SinonSpy
  let logger: Logger<ILogObj>

  const validReportA: BenchmarkReport = {
    kind: 'benchmark',
    name: 'My Function',
    ops: 1000,
    rme: 0.01,
    stddev: 0.001,
    mean: 0.001,
    me: 0.0002,
    sample: [0.001, 0.0011, 0.0009, 0.001, 0.001],
    sem: 0.00005,
    variance: 0.000001,
    size: 100,
    date: '2023-10-27',
    median: 0.001,
  }

  const validReportB: BenchmarkReport = {
    kind: 'benchmark',
    name: 'My Function',
    ops: 900,
    rme: 0.01,
    stddev: 0.001,
    mean: 0.0011,
    me: 0.0002,
    sample: [0.0011, 0.0012, 0.001, 0.0011, 0.0011],
    sem: 0.00005,
    variance: 0.000001,
    size: 100,
    date: '2023-10-28',
    median: 0.0011,
  }

  const validSuiteReport1: SuiteReport = {
    kind: 'suite',
    name: 'Suite 1',
    date: '2023-10-27',
    results: [validReportA],
  }

  const validSuiteReport2: SuiteReport = {
    kind: 'suite',
    name: 'Suite 2',
    date: '2023-10-28',
    results: [validReportB],
  }

  group.setup(() => {
    logger = new Logger({ type: 'hidden' })
    loggerInfoStub = sinon.spy(logger, 'info')
    loggerWarnStub = sinon.spy(logger, 'warn')
  })

  group.teardown(() => {
    loggerInfoStub.restore()
    loggerWarnStub.restore()
  })

  test('thorws when fewer than two reports are found for the function', async ({ assert }) => {
    assert.throws(() => {
      compareFunction('My Function', [validSuiteReport1], { logger })
    }, 'At least two valid reports for function "My Function"')
  })

  test('thorws when a function is not found in a suite report', async ({ assert }) => {
    assert.throws(() => {
      compareFunction('Nonexistent Function', [validSuiteReport1, validSuiteReport2], { logger })
    }, 'Function "Nonexistent Function" not found in suite report "Suite 1"')
  })

  test('should compare the performance of a specific function across multiple suite reports', async ({ assert }) => {
    compareFunction('My Function', [validSuiteReport1, validSuiteReport2], { logger })
    assert.isTrue(loggerInfoStub.called)
  })

  test('throws when suite reports have different function names', async ({ assert }) => {
    const reportC: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Another Function',
      ops: 1000,
      rme: 0.01,
      stddev: 0.001,
      mean: 0.001,
      me: 0.0002,
      sample: [0.001, 0.0011, 0.0009, 0.001, 0.001],
      sem: 0.00005,
      variance: 0.000001,
      size: 100,
      date: '2023-10-27',
      median: 0.001,
    }

    const suiteReport3: SuiteReport = {
      kind: 'suite',
      name: 'Suite 3',
      date: '2023-10-29',
      results: [reportC],
    }
    assert.throws(() => {
      compareFunction('My Function', [validSuiteReport1, suiteReport3], { logger })
    }, 'Function "My Function" not found in suite report "Suite 3"')
  })

  test('throws when an empty array of suite reports', async ({ assert }) => {
    assert.throws(() => {
      compareFunction('My Function', [], { logger })
    }, 'At least two valid reports for function "My Function" are required for comparison.')
  })

  test('should handle an invalid suite report', async ({ assert }) => {
    const invalidSuiteReport = {
      kind: 'suite',
      name: 123,
      date: '2023-10-27',
      results: [validReportA],
    } as unknown as SuiteReport

    assert.throws(() => compareFunction('My Function', [invalidSuiteReport, validSuiteReport2]))
  })

  test('should handle an invalid benchmark report', async ({ assert }) => {
    const invalidReport = {
      kind: 'benchmark',
      name: 'My Function',
      ops: 'invalid',
      size: 100,
      rme: 0.01,
      stddev: 0.001,
      mean: 0.001,
      me: 0.0002,
      sample: [0.001, 0.0011, 0.0009, 0.001, 0.001],
      sem: 0.00005,
      variance: 0.000001,
      date: '2023-10-27',
    } as unknown as BenchmarkReport

    const invalidSuiteReport: SuiteReport = {
      kind: 'suite',
      name: 'Suite 1',
      date: '2023-10-27',
      results: [invalidReport],
    }

    assert.throws(() => compareFunction('My Function', [invalidSuiteReport, validSuiteReport2]))
  })

  test('throws for invalid input', async ({ assert }) => {
    assert.throws(() => compareFunction('My Function', validSuiteReport2 as unknown as SuiteReport[]))
  })
})

test.group('outputCompareFunction', (group) => {
  let consoleInfoStub: sinon.SinonStub
  let consoleErrorStub: sinon.SinonStub

  const validReportA: BenchmarkReport = {
    kind: 'benchmark',
    name: 'My Function',
    ops: 1000,
    rme: 0.01,
    stddev: 0.001,
    mean: 0.001,
    me: 0.0002,
    sample: [0.001, 0.0011, 0.0009, 0.001, 0.001],
    sem: 0.00005,
    variance: 0.000001,
    size: 100,
    date: '2023-10-27',
    median: 0.001,
  }

  const validReportB: BenchmarkReport = {
    kind: 'benchmark',
    name: 'My Function',
    ops: 900,
    rme: 0.01,
    stddev: 0.001,
    mean: 0.0011,
    me: 0.0002,
    sample: [0.0011, 0.0012, 0.001, 0.0011, 0.0011],
    sem: 0.00005,
    variance: 0.000001,
    size: 100,
    date: '2023-10-28',
    median: 0.0011,
  }

  const comparisonResult = compare(validReportA, validReportB)
  const comparisonResults = [comparisonResult]

  group.each.setup(() => {
    consoleInfoStub = sinon.stub(console, 'info')
    consoleErrorStub = sinon.stub(console, 'error')
  })

  group.each.teardown(() => {
    consoleInfoStub.restore()
    consoleErrorStub.restore()
  })

  test('should output in table format', async ({ assert }) => {
    outputCompareFunction(comparisonResults, 'table')
    assert.isTrue(consoleInfoStub.called)
    assert.match(consoleInfoStub.firstCall.args[0], /Comparing "My Function" vs "My Function"/)
  })

  test('should output in json format', async ({ assert }) => {
    outputCompareFunction(comparisonResults, 'json')
    assert.isTrue(consoleInfoStub.called)
    assert.match(consoleInfoStub.firstCall.args[0], /"a":/)
  })

  test('should output in csv format', async ({ assert }) => {
    outputCompareFunction(comparisonResults, 'csv')
    assert.isTrue(consoleInfoStub.called)
    assert.match(consoleInfoStub.firstCall.args[0], /Report A Name,Report A Date,Report B Name,Report B Date/)
  })

  test('should output in table format for invalid format', async ({ assert }) => {
    outputCompareFunction(comparisonResults, 'invalid' as OutputFormat)
    assert.isTrue(consoleErrorStub.called)
    assert.match(consoleErrorStub.firstCall.args[0], /Invalid output format: invalid. Using default format \(table\)./)
    assert.isTrue(consoleInfoStub.called)
    assert.match(consoleInfoStub.lastCall.args[0], /Median difference percentage: 10.00%/)
  })
})

test.group('compareSuites', (group) => {
  let loggerWarnStub: sinon.SinonStub
  let consoleLogStub: sinon.SinonStub
  let consoleInfoStub: sinon.SinonStub
  let logger: Logger<ILogObj>

  const validReportA: BenchmarkReport = {
    kind: 'benchmark',
    name: 'My Function',
    ops: 1000,
    rme: 0.01,
    stddev: 0.001,
    mean: 0.001,
    me: 0.0002,
    sample: [0.001, 0.0011, 0.0009, 0.001, 0.001],
    sem: 0.00005,
    variance: 0.000001,
    size: 100,
    date: '2023-10-27',
    median: 0.001,
  }

  const validReportB: BenchmarkReport = {
    kind: 'benchmark',
    name: 'My Function',
    ops: 900,
    rme: 0.01,
    stddev: 0.001,
    mean: 0.0011,
    me: 0.0002,
    sample: [0.0011, 0.0012, 0.001, 0.0011, 0.0011],
    sem: 0.00005,
    variance: 0.000001,
    size: 100,
    date: '2023-10-28',
    median: 0.0011,
  }

  const validReportC: BenchmarkReport = {
    kind: 'benchmark',
    name: 'Another Function',
    ops: 500,
    rme: 0.01,
    stddev: 0.001,
    mean: 0.002,
    me: 0.0002,
    sample: [0.0011, 0.0012, 0.001, 0.0011, 0.0011],
    sem: 0.00005,
    variance: 0.000001,
    size: 100,
    date: '2023-10-28',
    median: 0.0011,
  }

  const validSuiteReport1: SuiteReport = {
    kind: 'suite',
    name: 'Suite 1',
    date: '2023-10-27',
    results: [validReportA, validReportC],
  }

  const validSuiteReport2: SuiteReport = {
    kind: 'suite',
    name: 'Suite 2',
    date: '2023-10-28',
    results: [validReportB],
  }

  group.each.setup(() => {
    logger = new Logger({ type: 'hidden' })
    loggerWarnStub = sinon.stub(logger, 'warn')
    consoleLogStub = sinon.stub(console, 'log')
    consoleInfoStub = sinon.stub(console, 'info')
  })

  group.each.teardown(() => {
    loggerWarnStub.restore()
    consoleLogStub.restore()
    consoleInfoStub.restore()
  })

  test('should log a warning when a benchmark is missing in suiteB', async ({ assert }) => {
    compareSuites(validSuiteReport1, validSuiteReport2, { logger })
    assert.isTrue(loggerWarnStub.calledOnce)
    assert.match(loggerWarnStub.firstCall.args[0], /Another Function: Missing in suite "Suite 2"/)
  })

  test('should log a warning when a benchmark is missing in suiteA', async ({ assert }) => {
    compareSuites(validSuiteReport2, validSuiteReport1, { logger })
    assert.isTrue(loggerWarnStub.calledOnce)
    assert.match(loggerWarnStub.firstCall.args[0], /Another Function: Missing in suite "Suite 2". Skipping./)
  })

  test('should compare the performance of matching benchmarks', async ({ assert }) => {
    compareSuites(validSuiteReport1, validSuiteReport1, { logger })
    assert.isTrue(consoleLogStub.called)
    assert.match(consoleLogStub.firstCall.args[0], /My Function: No significant difference/)
  })

  test('should handle a regression', async ({ assert }) => {
    const reportASlower: BenchmarkReport = {
      kind: 'benchmark',
      name: 'My Function',
      ops: 800,
      rme: 0.01,
      stddev: 0.01,
      mean: 0.012,
      me: 0.0002,
      sample: [0.0011, 0.0012, 0.001, 0.0011, 0.0011],
      sem: 0.00005,
      variance: 0.000001,
      size: 100,
      date: '2023-10-27',
      median: 0.0011,
    }

    const suiteReportRegression: SuiteReport = {
      kind: 'suite',
      name: 'Suite Regression',
      date: '2023-10-29',
      results: [reportASlower],
    }

    compareSuites(suiteReportRegression, validSuiteReport1, { logger })
    assert.isTrue(consoleLogStub.called)
    assert.equal(consoleLogStub.firstCall.args[0].trim(), `My Function: ${chalk.red('Regression (-91.67%)')}`)
  })

  test('should handle an improvement', async ({ assert }) => {
    const reportAFaster: BenchmarkReport = {
      kind: 'benchmark',
      name: 'My Function',
      ops: 1200,
      rme: 0.01,
      stddev: 0.0001,
      mean: 0.00008,
      me: 0.0002,
      sample: [0.0011, 0.0012, 0.001, 0.0011, 0.0011],
      sem: 0.00005,
      variance: 0.000001,
      size: 100,
      date: '2023-10-27',
      median: 0.0011,
    }

    const suiteReportImprovement: SuiteReport = {
      kind: 'suite',
      name: 'Suite Improvement',
      date: '2023-10-29',
      results: [reportAFaster],
    }

    compareSuites(suiteReportImprovement, validSuiteReport1, { logger })
    assert.isTrue(consoleLogStub.called)
    assert.equal(consoleLogStub.firstCall.args[0].trim(), `My Function: ${chalk.green('Improvement (1150.00%)')}`)
  })

  test('should handle no significant difference', async ({ assert }) => {
    compareSuites(validSuiteReport1, validSuiteReport1, { logger })
    assert.isTrue(consoleLogStub.called)
    assert.match(consoleLogStub.firstCall.args[0], /My Function: No significant difference/)
  })

  test('should handle no matching benchmarks', async ({ assert }) => {
    const suiteReportNoMatch: SuiteReport = {
      kind: 'suite',
      name: 'Suite No Match',
      date: '2023-10-29',
      results: [],
    }

    compareSuites(suiteReportNoMatch, validSuiteReport1, { logger })
    assert.isFalse(consoleLogStub.called)
  })
})
