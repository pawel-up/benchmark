import { ValidationException } from './validation_exception.js'

/**
 * An exception related to suite validation errors.
 */
export class SuiteValidationException extends ValidationException {
  static override code = 'E_SUITE_VALIDATION_EXCEPTION'
  static override message = 'Invalid suite schema.'
  static override help = 'Make sure you are using the correct suite object.'
}
