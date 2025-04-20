import type { BenchmarkReport, SuiteReport, FieldValidationMessage } from './types.js'

/**
 * Validates a benchmark report and list all issues found.
 *
 * @param report - The benchmark report to validate.
 * @returns The list of issues found in the report. Empty array when no issues.
 */
export function validateBenchmarkReport(report: BenchmarkReport): FieldValidationMessage[] {
  const issues: FieldValidationMessage[] = []
  if (typeof report !== 'object' || report === null) {
    issues.push({
      message: 'Report must be an object.',
      field: '',
      rule: 'type',
    })
    return issues
  }

  const requiredProperties: (keyof BenchmarkReport)[] = [
    'name',
    'ops',
    'size',
    'rme',
    'stddev',
    'me',
    'mean',
    'variance',
    'date',
  ]

  const missing: (keyof BenchmarkReport)[] = requiredProperties.filter((prop) => !(prop in report))
  if (missing.length === 1) {
    issues.push({
      message: `Missing property "${missing[0]}".`,
      field: missing[0],
      rule: 'required',
    })
  } else if (missing.length > 1) {
    issues.push({
      message: `Missing properties: ${missing.join(', ')}.`,
      field: missing.join(', '),
      rule: 'required',
    })
  }

  if (typeof report.name !== 'string') {
    issues.push({
      message: '"name" must be a string.',
      field: 'name',
      rule: 'type',
    })
  }

  if (typeof report.ops !== 'number' || report.ops < 0) {
    issues.push({
      message: '"ops" must be a non-negative number.',
      field: 'ops',
      rule: 'type',
    })
  }

  if (typeof report.size !== 'number' || report.size < 0) {
    issues.push({
      message: '"size" must be a non-negative number.',
      field: 'size',
      rule: 'type',
    })
  }

  if (typeof report.rme !== 'number' || report.rme < 0) {
    issues.push({
      message: '"rme" must be a non-negative number.',
      field: 'rme',
      rule: 'type',
    })
  }

  if (typeof report.stddev !== 'number' || report.stddev < 0) {
    issues.push({
      message: '"stddev" must be a non-negative number.',
      field: 'stddev',
      rule: 'type',
    })
  }

  if (typeof report.me !== 'number' || report.me < 0) {
    issues.push({
      message: '"me" must be a non-negative number.',
      field: 'me',
      rule: 'type',
    })
  }

  if (typeof report.mean !== 'number' || report.mean < 0) {
    issues.push({
      message: '"mean" must be a non-negative number.',
      field: 'mean',
      rule: 'type',
    })
  }

  if (typeof report.variance !== 'number' || report.variance < 0) {
    issues.push({
      message: '"variance" must be a non-negative number.',
      field: 'variance',
      rule: 'type',
    })
  }

  if (typeof report.date !== 'string') {
    issues.push({
      message: '"date" must be a string.',
      field: 'date',
      rule: 'type',
    })
  }
  return issues
}

/**
 * Validates a suite report and list all issues found.
 *
 * @param report - The suite report to validate.
 * @returns The list of issues found in the report. Empty array when no issues.
 */
export function validateSuiteReport(report: SuiteReport): FieldValidationMessage[] {
  const issues: FieldValidationMessage[] = []
  if (typeof report !== 'object' || report === null) {
    issues.push({
      message: 'Report must be an object.',
      field: '',
      rule: 'type',
    })
    return issues
  }

  const requiredProperties: (keyof SuiteReport)[] = ['kind', 'name', 'date', 'results']
  const missing = requiredProperties.filter((prop) => !(prop in report))
  if (missing.length === 1) {
    issues.push({
      message: `Missing property "${missing[0]}".`,
      field: missing[0],
      rule: 'required',
    })
  } else if (missing.length > 1) {
    issues.push({
      message: `Missing properties: ${missing.join(', ')}.`,
      field: missing.join(', '),
      rule: 'required',
    })
  }

  if (report.kind !== 'suite') {
    issues.push({
      message: `"kind" must be "suite".`,
      field: 'kind',
      rule: 'value',
    })
  }

  if (typeof report.name !== 'string') {
    issues.push({
      message: '"name" must be a string.',
      field: 'name',
      rule: 'type',
    })
  }

  if (typeof report.date !== 'string') {
    issues.push({
      message: '"date" must be a string.',
      field: 'date',
      rule: 'type',
    })
  }

  if (!Array.isArray(report.results)) {
    issues.push({
      message: '"results" must be an array.',
      field: 'results',
      rule: 'type',
    })
  }
  return issues
}
