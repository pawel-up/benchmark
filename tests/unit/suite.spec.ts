import { test } from '@japa/runner'
import { Suite } from '../../src/suite.js'
import { Reporter } from '../../src/reporters/reporter.js'
import sinon from 'sinon'
import { Logger, type ILogObj } from 'tslog'

test.group('Suite', (group) => {
  let clock: sinon.SinonFakeTimers
  group.each.setup(() => {
    clock = sinon.useFakeTimers()
  })
  group.each.teardown(() => {
    clock.restore()
  })

  test('should add a benchmark to the suite', async ({ assert }) => {
    const suite = new Suite('Test Suite')
    suite.add('Test Benchmark', () => {})
    assert.lengthOf(suite['benchmarks'], 1)
    assert.equal(suite['benchmarks'][0].name, 'Test Benchmark')
  })

  test('should throw an error when adding a duplicate benchmark', async ({ assert }) => {
    const suite = new Suite('Test Suite', { logLevel: 6 })
    suite.add('Test Benchmark', () => {})
    assert.throws(() => suite.add('Test Benchmark', () => {}), 'Benchmark with name "Test Benchmark" already exists.')
  })

  test('should add a reporter to the suite', async ({ assert }) => {
    const suite = new Suite('Test Suite')
    const reporter = new (class TestReporter extends Reporter {
      async run(): Promise<void> {}
    })()
    suite.addReporter(reporter, 'after-each')
    assert.lengthOf(Array.from(suite['reporters'].keys()), 1)
    const passedReporter = suite['reporters'].get('after-each')!
    assert.equal(passedReporter[0].reporter, reporter)
  })

  test('should set the setup function', async ({ assert }) => {
    const suite = new Suite('Test Suite')
    const setupFn = () => {}
    suite.setSetup(setupFn)
    assert.equal(suite['benchmarkSetup'], setupFn)
  })

  test('should add the setup function to the next benchmark function', async ({ assert }) => {
    const suite = new Suite('Test Suite')
    const setupFn = () => {}
    suite
      .setSetup(setupFn)
      .setup()
      .add('Benchmark', () => {})
    assert.lengthOf(suite['benchmarks'], 1)
    assert.equal(suite['benchmarks'][0].setup, setupFn)
  })

  test('should throw an error if setup is called without setSetup', async ({ assert }) => {
    const suite = new Suite('Test Suite', { logLevel: 6 })
    assert.throws(() => suite.setup(), 'Setup function not defined. Use setSetup() first.')
  })

  test('should run all benchmarks in the suite', async ({ assert }) => {
    const suite = new Suite('Test Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const b1 = sinon.stub().resolves()
    const b2 = sinon.stub().resolves()
    suite.add('Benchmark 1', b1)
    suite.add('Benchmark 2', b2)
    await suite.run()
    assert.isTrue(b1.called)
    assert.isTrue(b2.called)
  })

  test('should run the setup function before benchmarks', async ({ assert }) => {
    const suite = new Suite('Test Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const setupFn = sinon.stub().returns('setup')
    const benchmarkFn = sinon.stub().returns('benchmark')
    suite.setSetup(setupFn).setup().add('Benchmark', benchmarkFn)
    await suite.run()
    assert.isTrue(setupFn.calledOnce)
    assert.isTrue(benchmarkFn.called)
    assert.isTrue(setupFn.calledBefore(benchmarkFn))
  })

  test('runs the setup function in the correct order', async ({ assert }) => {
    const suite = new Suite('Test Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const setupFn = sinon.stub().returns('setup')
    const benchmarkFn1 = sinon.stub().returns('benchmark')
    const benchmarkFn2 = sinon.stub().returns('benchmark')
    suite.setSetup(setupFn).add('b1', benchmarkFn1).setup().add('b2', benchmarkFn2).setup()
    await suite.run()
    assert.isTrue(setupFn.calledOnce)
    assert.isTrue(benchmarkFn1.called)
    assert.isTrue(benchmarkFn2.called)
    assert.isTrue(setupFn.calledBefore(benchmarkFn2))
  })

  test('should run reporters after each benchmark', async ({ assert }) => {
    const suite = new Suite('Test Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const reporter = new (class TestReporter extends Reporter {
      run = sinon.stub().resolves()
    })()
    const benchmarkFn = sinon.stub().resolves()
    suite.addReporter(reporter, 'after-each')
    suite.add('Benchmark', benchmarkFn)
    await suite.run()
    assert.isTrue(reporter.run.calledOnce)
  })

  test('should run reporters after all benchmarks', async ({ assert }) => {
    const suite = new Suite('Test Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const reporter = new (class TestReporter extends Reporter {
      run = sinon.stub().resolves()
    })()
    const benchmarkFn = sinon.stub().resolves()
    suite.addReporter(reporter, 'after-all')
    suite.add('Benchmark', benchmarkFn)
    await suite.run()
    assert.isTrue(reporter.run.calledOnce)
  })

  test('should dispatch before-run and after-run events', async ({ assert }) => {
    const suite = new Suite('Test Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const beforeRunListener = sinon.stub()
    const afterRunListener = sinon.stub()
    const benchmarkFn = sinon.stub().resolves()
    suite.addEventListener('before-run', beforeRunListener)
    suite.addEventListener('after-run', afterRunListener)
    suite.add('Benchmark', benchmarkFn)
    await suite.run()
    assert.isTrue(beforeRunListener.calledOnce)
    assert.isTrue(afterRunListener.calledOnce)
    assert.equal(beforeRunListener.getCall(0).args[0].detail.name, 'Benchmark')
    assert.equal(afterRunListener.getCall(0).args[0].detail.name, 'Benchmark')
    assert.instanceOf(afterRunListener.getCall(0).args[0].detail.report, Object)
  })

  test('should dispatch error event and throw error', async ({ assert }) => {
    const suite = new Suite('Test Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2, logLevel: 6 })
    const errorListener = sinon.stub()
    const benchmarkFn = sinon.stub().rejects(new Error('Test Error'))
    suite.addEventListener('error', errorListener)
    suite.add('Benchmark', benchmarkFn)
    await assert.rejects(() => suite.run(), 'Test Error')
    assert.isTrue(errorListener.calledOnce)
    assert.equal(errorListener.getCall(0).args[0].detail.name, 'Benchmark')
    assert.equal(errorListener.getCall(0).args[0].detail.error.message, 'Test Error')
  })

  test('should get the suite report', async ({ assert }) => {
    const suite = new Suite('Test Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const benchmarkFn = sinon.stub().resolves()
    suite.add('Benchmark', benchmarkFn)
    const report = await suite.run()
    assert.equal(report.kind, 'suite')
    assert.equal(report.name, 'Test Suite')
    assert.isArray(report.results)
    assert.equal(report.results.length, 1)
    assert.typeOf(report.date, 'string')
  })

  test('should run reporters with correct timing', async ({ assert }) => {
    const suite = new Suite('Test Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const afterEachReporter = new (class TestReporter extends Reporter {
      run = sinon.stub().resolves()
    })()
    const afterAllReporter = new (class TestReporter extends Reporter {
      run = sinon.stub().resolves()
    })()
    const benchmarkFn1 = sinon.stub().resolves()
    const benchmarkFn2 = sinon.stub().resolves()
    suite.addReporter(afterEachReporter, 'after-each')
    suite.addReporter(afterAllReporter, 'after-all')
    suite.add('Benchmark 1', benchmarkFn1)
    suite.add('Benchmark 2', benchmarkFn2)
    await suite.run()
    assert.isTrue(afterEachReporter.run.calledTwice)
    assert.isTrue(afterAllReporter.run.calledOnce)
    assert.isTrue(afterEachReporter.run.calledBefore(afterAllReporter.run))
  })

  test('should handle empty suite', async ({ assert }) => {
    const suite = new Suite('Empty Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const report = await suite.run()
    assert.equal(report.kind, 'suite')
    assert.equal(report.name, 'Empty Suite')
    assert.deepEqual(report.results, [])
  })

  test('does not call the setup without a benchmark function', async ({ assert }) => {
    const suite = new Suite('Setup Only Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const setupFn = sinon.stub().resolves()
    suite.setSetup(setupFn).setup()
    const report = await suite.run()
    assert.isFalse(setupFn.called)
    assert.equal(report.kind, 'suite')
    assert.equal(report.name, 'Setup Only Suite')
    assert.deepEqual(report.results, [])
  })

  test('should create suite with options', async ({ assert }) => {
    const options = { maxExecutionTime: 5000, debug: true, logLevel: 5 }
    const suite = new Suite('Test Suite', options)
    assert.equal(suite['options'].maxExecutionTime, options.maxExecutionTime)
    assert.equal(suite['debug'], true)
  })

  test('should create suite with only options', async ({ assert }) => {
    const options = { maxExecutionTime: 5000, debug: true, logLevel: 5 }
    const suite = new Suite(options)
    assert.equal(suite['options'].maxExecutionTime, options.maxExecutionTime)
    assert.equal(suite['debug'], true)
    assert.equal(suite['name'], 'Benchmark Suite')
  })

  test('should log messages', async ({ assert }) => {
    const logger = new Logger<ILogObj>({ minLevel: 5 })
    const spy = sinon.spy(logger, 'info')
    const suite = new Suite('Test Suite', { logLevel: 5, maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    suite['logger'] = logger
    const benchmarkFn = sinon.stub().resolves()
    suite.add('Benchmark', benchmarkFn)
    await suite.run()
    assert.isTrue(spy.called)
  })

  test('should add a benchmark to a group', async ({ assert }) => {
    const suite = new Suite('Group Test Suite')
    suite.group('Group 1', 'Benchmark 1', () => {})
    assert.lengthOf(suite['benchmarks'], 1)
    assert.equal(suite['benchmarks'][0].name, 'Benchmark 1')
    assert.equal(suite['benchmarks'][0].group, 'Group 1')
  })

  test('should throw an error when adding a duplicate benchmark to a group', async ({ assert }) => {
    const suite = new Suite('Group Test Suite', { logLevel: 6 })
    suite.group('Group 1', 'Benchmark 1', () => {})
    assert.throws(
      () => suite.group('Group 1', 'Benchmark 1', () => {}),
      'Benchmark with name "Benchmark 1" already exists in group "Group 1".'
    )
  })

  test('should set group suite setup function', async ({ assert }) => {
    const suite = new Suite('Group Test Suite')
    const setupFn = () => {}
    suite.setGroupSuiteSetup('Group 1', setupFn)
    assert.equal(suite['groupSuiteSetup'].get('Group 1'), setupFn)
  })

  test('should throw an error when setting a duplicate group suite setup function', async ({ assert }) => {
    const suite = new Suite('Group Test Suite', { logLevel: 6 })
    const setupFn = () => {}
    suite.setGroupSuiteSetup('Group 1', setupFn)
    assert.throws(
      () => suite.setGroupSuiteSetup('Group 1', setupFn),
      'Group suite setup function for group "Group 1" already defined.'
    )
  })

  test('should set group suite teardown function', async ({ assert }) => {
    const suite = new Suite('Group Test Suite')
    const teardownFn = () => {}
    suite.setGroupSuiteTeardown('Group 1', teardownFn)
    assert.equal(suite['groupSuiteTeardown'].get('Group 1'), teardownFn)
  })

  test('should throw an error when setting a duplicate group suite teardown function', async ({ assert }) => {
    const suite = new Suite('Group Test Suite', { logLevel: 6 })
    const teardownFn = () => {}
    suite.setGroupSuiteTeardown('Group 1', teardownFn)
    assert.throws(
      () => suite.setGroupSuiteTeardown('Group 1', teardownFn),
      'Group suite teardown function for group "Group 1" already defined.'
    )
  })

  test('should set group benchmark setup function', async ({ assert }) => {
    const suite = new Suite('Group Test Suite')
    const setupFn = () => {}
    suite.setGroupBenchmarkSetup('Group 1', setupFn)
    assert.equal(suite['groupBenchmarkSetup'].get('Group 1'), setupFn)
  })

  test('should throw an error when setting a duplicate group benchmark setup function', async ({ assert }) => {
    const suite = new Suite('Group Test Suite', { logLevel: 6 })
    const setupFn = () => {}
    suite.setGroupBenchmarkSetup('Group 1', setupFn)
    assert.throws(
      () => suite.setGroupBenchmarkSetup('Group 1', setupFn),
      'Group benchmark setup function for group "Group 1" already defined.'
    )
  })

  test('should set group benchmark teardown function', async ({ assert }) => {
    const suite = new Suite('Group Test Suite')
    const teardownFn = () => {}
    suite.setGroupBenchmarkTeardown('Group 1', teardownFn)
    assert.equal(suite['groupBenchmarkTeardown'].get('Group 1'), teardownFn)
  })

  test('should throw an error when setting a duplicate group benchmark teardown function', async ({ assert }) => {
    const suite = new Suite('Group Test Suite', { logLevel: 6 })
    const teardownFn = () => {}
    suite.setGroupBenchmarkTeardown('Group 1', teardownFn)
    assert.throws(
      () => suite.setGroupBenchmarkTeardown('Group 1', teardownFn),
      'Group benchmark teardown function for group "Group 1" already defined.'
    )
  })

  test('should run benchmarks in groups', async ({ assert }) => {
    const suite = new Suite('Group Test Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const b1 = sinon.stub().resolves()
    const b2 = sinon.stub().resolves()
    suite.group('Group 1', 'Benchmark 1', b1)
    suite.group('Group 2', 'Benchmark 2', b2)
    await suite.run()
    assert.isTrue(b1.called)
    assert.isTrue(b2.called)
  })

  test('should run group suite setup and teardown functions', async ({ assert }) => {
    const suite = new Suite('Group Setup Teardown Test Suite', {
      maxIterations: 1,
      maxInnerIterations: 1,
      maxExecutionTime: 2,
    })
    const setupFn = sinon.stub().resolves()
    const teardownFn = sinon.stub().resolves()
    const benchmarkFn = sinon.stub().resolves()
    suite.setGroupSuiteSetup('Group 1', setupFn)
    suite.setGroupSuiteTeardown('Group 1', teardownFn)
    suite.group('Group 1', 'Benchmark 1', benchmarkFn)
    await suite.run()
    assert.isTrue(setupFn.calledOnce)
    assert.isTrue(teardownFn.calledOnce)
    assert.isTrue(benchmarkFn.called)
    assert.isTrue(setupFn.calledBefore(benchmarkFn))
    assert.isTrue(teardownFn.calledAfter(benchmarkFn))
  })

  test('should run group benchmark setup and teardown functions', async ({ assert }) => {
    const suite = new Suite('Group Benchmark Setup Teardown Test Suite', {
      maxIterations: 1,
      maxInnerIterations: 1,
      maxExecutionTime: 2,
    })
    const setupFn = sinon.stub().resolves()
    const teardownFn = sinon.stub().resolves()
    const benchmarkFn = sinon.stub().resolves()
    suite.setGroupBenchmarkSetup('Group 1', setupFn)
    suite.setGroupBenchmarkTeardown('Group 1', teardownFn)
    suite.group('Group 1', 'Benchmark 1', benchmarkFn)
    await suite.run()
    assert.isTrue(setupFn.calledOnce)
    assert.isTrue(teardownFn.calledOnce)
    assert.isTrue(benchmarkFn.called)
    assert.isTrue(setupFn.calledBefore(benchmarkFn))
    assert.isTrue(teardownFn.calledAfter(benchmarkFn))
  })

  test('should run group setup/teardown and benchmark setup/teardown in correct order', async ({ assert }) => {
    const suite = new Suite('Group Order Test Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const groupSuiteSetup = sinon.stub().resolves()
    const groupSuiteTeardown = sinon.stub().resolves()
    const groupBenchmarkSetup = sinon.stub().resolves()
    const groupBenchmarkTeardown = sinon.stub().resolves()
    const benchmarkFn = sinon.stub().resolves()
    suite.setGroupSuiteSetup('Group 1', groupSuiteSetup)
    suite.setGroupSuiteTeardown('Group 1', groupSuiteTeardown)
    suite.setGroupBenchmarkSetup('Group 1', groupBenchmarkSetup)
    suite.setGroupBenchmarkTeardown('Group 1', groupBenchmarkTeardown)
    suite.group('Group 1', 'Benchmark 1', benchmarkFn)
    await suite.run()
    assert.isTrue(groupSuiteSetup.calledOnce)
    assert.isTrue(groupSuiteTeardown.calledOnce)
    assert.isTrue(groupBenchmarkSetup.calledOnce)
    assert.isTrue(groupBenchmarkTeardown.calledOnce)
    assert.isTrue(benchmarkFn.called)
    assert.isTrue(groupSuiteSetup.calledBefore(groupBenchmarkSetup))
    assert.isTrue(groupBenchmarkSetup.calledBefore(benchmarkFn))
    assert.isTrue(groupBenchmarkTeardown.calledAfter(benchmarkFn))
    assert.isTrue(groupSuiteTeardown.calledAfter(groupBenchmarkTeardown))
  })

  test('should pass down values from setup functions', async ({ assert }) => {
    const suite = new Suite('Pass Down Values Test Suite', {
      maxIterations: 1,
      maxInnerIterations: 1,
      maxExecutionTime: 2,
    })
    // executes first
    const groupSuiteSetup = sinon.stub().returns('groupSuite')
    // executes second
    const groupBenchmarkSetup = sinon.stub().returns('groupBenchmark')
    // executes third
    const benchmarkSetup = sinon.stub().returns('benchmarkSetup')
    const benchmarkFn = sinon.stub().resolves()
    suite.setGroupSuiteSetup('Group 1', groupSuiteSetup)
    suite.setGroupBenchmarkSetup('Group 1', groupBenchmarkSetup)
    suite.setSetup(benchmarkSetup)
    suite.setup().group('Group 1', 'Benchmark 1', benchmarkFn)
    await suite.run()
    assert.isTrue(groupSuiteSetup.calledOnce)
    assert.isTrue(groupBenchmarkSetup.calledOnce)
    assert.isTrue(benchmarkSetup.calledOnce)
    assert.isTrue(benchmarkFn.called)
    assert.deepEqual(benchmarkSetup.firstCall.args[0], 'groupBenchmark')
    assert.isUndefined(groupSuiteSetup.firstCall.args[0])
    assert.equal(groupBenchmarkSetup.firstCall.args[0], 'groupSuite')
    assert.deepEqual(benchmarkFn.firstCall.args[0], 'benchmarkSetup')
  })

  test('should run benchmarks in the order they are added within a group', async ({ assert }) => {
    const suite = new Suite('Group Order Test Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const b1 = sinon.stub().resolves()
    const b2 = sinon.stub().resolves()
    suite.group('Group 1', 'Benchmark 1', b1).group('Group 1', 'Benchmark 2', b2)
    await suite.run()
    assert.isTrue(b1.calledBefore(b2))
  })

  test('should pass group setup value to subsequent benchmark calls and benchmark setup', async ({ assert }) => {
    const suite = new Suite('Group Setup Caching Test Suite', {
      maxIterations: 1,
      maxInnerIterations: 1,
      maxExecutionTime: 2,
    })
    const groupSuiteSetup = sinon.stub().returns('groupSuite')
    const benchmarkSetup1 = sinon.stub().returns('benchmarkSetup')
    const benchmarkFn1 = sinon.stub().resolves()
    const benchmarkFn2 = sinon.stub().resolves()

    suite.setGroupSuiteSetup('Group 1', groupSuiteSetup)
    suite.setSetup(benchmarkSetup1)
    suite.setup().group('Group 1', 'Benchmark 1', benchmarkFn1)
    suite.setup().group('Group 1', 'Benchmark 2', benchmarkFn2)

    await suite.run()

    assert.isTrue(groupSuiteSetup.calledOnce)
    assert.isTrue(benchmarkFn1.called)
    assert.isTrue(benchmarkFn2.called)
    assert.isTrue(benchmarkSetup1.calledTwice)

    // Check that the group setup value is passed to both benchmark functions
    assert.deepEqual(benchmarkSetup1.firstCall.args[0], 'groupSuite')

    // Check that the benchmark setup value is passed to the benchmark function
    assert.deepEqual(benchmarkFn1.firstCall.args[0], 'benchmarkSetup')
    assert.deepEqual(benchmarkFn2.firstCall.args[0], 'benchmarkSetup')
  })
})
