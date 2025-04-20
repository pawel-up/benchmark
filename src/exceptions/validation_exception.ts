import type { FieldValidationMessage } from '../types.js'
import { Exception } from './exception.js'

/**
 * An exception related validation errors.
 */
export class ValidationException extends Exception {
  static override code = 'E_VALIDATION_EXCEPTION'
  static override status = 422
  static override message = 'Invalid schema.'
  static override help = 'Make sure you are using the correct object.'

  violations: FieldValidationMessage[]

  constructor(violations: FieldValidationMessage[], options?: ErrorOptions & { message?: string }) {
    const msg = options?.message
    super(msg, options)
    this.violations = violations
    const ErrorConstructor = this.constructor as typeof ValidationException
    if ('captureStackTrace' in Error) {
      Error.captureStackTrace(this, ErrorConstructor)
    }
  }
}
