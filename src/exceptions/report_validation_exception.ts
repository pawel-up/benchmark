import { ValidationException } from './validation_exception.js'

/**
 * An exception related to benchmark report validation errors.
 */
export class ReportValidationException extends ValidationException {
  static override code = 'E_REPORT_VALIDATION_EXCEPTION'
  static override message = 'Invalid benchmark report schema.'
  static override help = 'Make sure you are using the correct benchmark report object.'
}
