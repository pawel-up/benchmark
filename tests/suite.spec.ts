import { test } from '@japa/runner'
import { Suite } from '../src/suite.js'
import { Reporter } from '../src/reporters/reporter.js'
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
    assert.equal(suite['benchmarks'].length, 1)
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
    assert.equal(suite['reporters'].length, 1)
    assert.equal(suite['reporters'][0].reporter, reporter)
    assert.equal(suite['reporters'][0].timing, 'after-each')
  })

  test('should set the setup function', async ({ assert }) => {
    const suite = new Suite('Test Suite')
    const setupFn = () => {}
    suite.setSetup(setupFn)
    assert.equal(suite['setupFn'], setupFn)
  })

  test('should add the setup function to the execution queue', async ({ assert }) => {
    const suite = new Suite('Test Suite')
    const setupFn = () => {}
    suite.setSetup(setupFn).setup()
    assert.equal(suite['benchmarks'].length, 1)
    assert.equal(suite['benchmarks'][0].fn, setupFn)
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
    assert.isTrue(setupFn.calledTwice)
    assert.isTrue(benchmarkFn1.called)
    assert.isTrue(benchmarkFn2.called)
    assert.isTrue(setupFn.calledBefore(benchmarkFn2))
    assert.isTrue(setupFn.calledAfter(benchmarkFn2))
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

  test('should handle suite with only setup', async ({ assert }) => {
    const suite = new Suite('Setup Only Suite', { maxIterations: 1, maxInnerIterations: 1, maxExecutionTime: 2 })
    const setupFn = sinon.stub().resolves()
    suite.setSetup(setupFn).setup()
    const report = await suite.run()
    assert.isTrue(setupFn.calledOnce)
    assert.equal(report.kind, 'suite')
    assert.equal(report.name, 'Setup Only Suite')
    assert.deepEqual(report.results, [])
  })

  test('should create suite with options', async ({ assert }) => {
    const options = { maxExecutionTime: 5000, debug: true, logLevel: 5 }
    const suite = new Suite('Test Suite', options)
    assert.equal(suite['options'], options)
    assert.equal(suite['debug'], true)
  })

  test('should create suite with only options', async ({ assert }) => {
    const options = { maxExecutionTime: 5000, debug: true, logLevel: 5 }
    const suite = new Suite(options)
    assert.equal(suite['options'], options)
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
})
