import { test } from '@japa/runner'
import { validateBenchmarkReport, validateSuiteReport } from '../../src/validators.js'
import type { BenchmarkReport, SuiteReport } from '../../src/types.js'

test.group('Validators/validateBenchmarkReport', () => {
  test('valid report', ({ assert }) => {
    const report: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Test Benchmark',
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
    const issues = validateBenchmarkReport(report)
    assert.isEmpty(issues)
  })

  test('missing properties', ({ assert }) => {
    const report = {} as BenchmarkReport
    const issues = validateBenchmarkReport(report)
    assert.isNotEmpty(issues)
    assert.equal(issues[0].message, 'Missing properties: name, ops, size, rme, stddev, me, mean, variance, date.')
  })

  test('invalid name', ({ assert }) => {
    const report: BenchmarkReport = {
      kind: 'benchmark',
      // @ts-expect-error Testing invalid type
      name: 123,
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
    const issues = validateBenchmarkReport(report)
    assert.isNotEmpty(issues)
    assert.equal(issues[0].message, '"name" must be a string.')
  })

  test('invalid ops', ({ assert }) => {
    const report: BenchmarkReport = {
      kind: 'benchmark',
      name: 'Test Benchmark',
      ops: -1000,
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
    const issues = validateBenchmarkReport(report)
    assert.isNotEmpty(issues)
    assert.equal(issues[0].message, '"ops" must be a non-negative number.')
  })

  test('invalid report type', ({ assert }) => {
    // @ts-expect-error Testing invalid type
    const issues = validateBenchmarkReport('not an object')
    assert.isNotEmpty(issues)
    assert.equal(issues[0].message, 'Report must be an object.')
  })

  test('null report', ({ assert }) => {
    // @ts-expect-error Testing null value
    const issues = validateBenchmarkReport(null)
    assert.isNotEmpty(issues)
    assert.equal(issues[0].message, 'Report must be an object.')
  })
})

test.group('Validators/validateSuiteReport', () => {
  test('valid report', ({ assert }) => {
    const report: SuiteReport = {
      kind: 'suite',
      name: 'Test Suite',
      date: '2023-10-27',
      results: [],
    }
    const issues = validateSuiteReport(report)
    assert.isEmpty(issues)
  })

  test('missing properties', ({ assert }) => {
    const report = {} as SuiteReport
    const issues = validateSuiteReport(report)
    assert.isNotEmpty(issues)
    assert.equal(issues[0].message, 'Missing properties: kind, name, date, results.')
  })

  test('missing property', ({ assert }) => {
    const report = {
      kind: 'benchmark',
      name: 'Test Benchmark',
      results: [],
    } as unknown as SuiteReport
    const issues = validateSuiteReport(report)
    assert.isNotEmpty(issues)
    assert.equal(issues[0].message, 'Missing property "date".')
  })

  test('invalid kind', ({ assert }) => {
    const report: SuiteReport = {
      // @ts-expect-error Testing invalid kind
      kind: 'invalid',
      name: 'Test Suite',
      date: '2023-10-27',
      results: [],
    }
    const issues = validateSuiteReport(report)
    assert.isNotEmpty(issues)
    assert.equal(issues[0].message, '"kind" must be "suite".')
  })

  test('invalid name', ({ assert }) => {
    const report: SuiteReport = {
      kind: 'suite',
      // @ts-expect-error Testing invalid type
      name: 123,
      date: '2023-10-27',
      results: [],
    }
    const issues = validateSuiteReport(report)
    assert.isNotEmpty(issues)
    assert.equal(issues[0].message, '"name" must be a string.')
  })

  test('invalid date', ({ assert }) => {
    const report: SuiteReport = {
      kind: 'suite',
      name: 'Test Suite',
      // @ts-expect-error Testing invalid type
      date: 123,
      results: [],
    }
    const issues = validateSuiteReport(report)
    assert.isNotEmpty(issues)
    assert.equal(issues[0].message, '"date" must be a string.')
  })

  test('invalid results', ({ assert }) => {
    const report: SuiteReport = {
      kind: 'suite',
      name: 'Test Suite',
      date: '2023-10-27',
      // @ts-expect-error Testing invalid type
      results: 'not an array',
    }
    const issues = validateSuiteReport(report)
    assert.isNotEmpty(issues)
    assert.equal(issues[0].message, '"results" must be an array.')
  })

  test('invalid report type', ({ assert }) => {
    // @ts-expect-error Testing invalid type
    const issues = validateSuiteReport('not an object')
    assert.isNotEmpty(issues)
    assert.equal(issues[0].message, 'Report must be an object.')
  })

  test('null report', ({ assert }) => {
    // @ts-expect-error Testing null value
    const issues = validateSuiteReport(null)
    assert.isNotEmpty(issues)
    assert.equal(issues[0].message, 'Report must be an object.')
  })
})
