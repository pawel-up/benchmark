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

  const requiredProperties = [
    'name',
    'operationsPerSecond',
    'samples',
    'relativeMarginOfError',
    'sampleStandardDeviation',
    'marginOfError',
    'sampleArithmeticMean',
    'sampleVariance',
    'date',
  ]

  const missing: string[] = requiredProperties.filter((prop) => !(prop in report))
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

  if (typeof report.operationsPerSecond !== 'number' || report.operationsPerSecond < 0) {
    issues.push({
      message: '"operationsPerSecond" must be a non-negative number.',
      field: 'operationsPerSecond',
      rule: 'type',
    })
  }

  if (typeof report.samples !== 'number' || report.samples < 0) {
    issues.push({
      message: '"samples" must be a non-negative number.',
      field: 'samples',
      rule: 'type',
    })
  }

  if (typeof report.relativeMarginOfError !== 'number' || report.relativeMarginOfError < 0) {
    issues.push({
      message: '"relativeMarginOfError" must be a non-negative number.',
      field: 'relativeMarginOfError',
      rule: 'type',
    })
  }

  if (typeof report.sampleStandardDeviation !== 'number' || report.sampleStandardDeviation < 0) {
    issues.push({
      message: '"sampleStandardDeviation" must be a non-negative number.',
      field: 'sampleStandardDeviation',
      rule: 'type',
    })
  }

  if (typeof report.marginOfError !== 'number' || report.marginOfError < 0) {
    issues.push({
      message: '"marginOfError" must be a non-negative number.',
      field: 'marginOfError',
      rule: 'type',
    })
  }

  if (typeof report.sampleArithmeticMean !== 'number' || report.sampleArithmeticMean < 0) {
    issues.push({
      message: '"sampleArithmeticMean" must be a non-negative number.',
      field: 'sampleArithmeticMean',
      rule: 'type',
    })
  }

  if (typeof report.sampleVariance !== 'number' || report.sampleVariance < 0) {
    issues.push({
      message: '"sampleVariance" must be a non-negative number.',
      field: 'sampleVariance',
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

  const requiredProperties = ['kind', 'name', 'date', 'results']
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
