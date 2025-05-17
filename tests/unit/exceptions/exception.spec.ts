import { test } from '@japa/runner'
import { Exception } from '../../../src/exceptions/exception.js'

test.group('Exception', () => {
  test('should create an exception with default values', ({ assert }) => {
    const exception = new Exception()

    assert.equal(exception.name, 'Exception')
    assert.equal(exception.message, '')
    assert.equal(exception.status, 500)
    assert.isUndefined(exception.code)
    assert.isUndefined(exception.help)
  })

  test('should create an exception with custom message', ({ assert }) => {
    const exception = new Exception('Custom message')

    assert.equal(exception.message, 'Custom message')
  })

  test('should create an exception with custom code and status', ({ assert }) => {
    const exception = new Exception('Custom message', { code: 'E_CUSTOM', status: 400 })

    assert.equal(exception.code, 'E_CUSTOM')
    assert.equal(exception.status, 400)
  })

  test('should create an exception with static code, status and help', ({ assert }) => {
    class CustomException extends Exception {
      static override code = 'E_CUSTOM'
      static override status = 400
      static override message = 'Custom message'
      static override help = 'Custom help'
    }

    const exception = new CustomException()

    assert.equal(exception.name, 'CustomException')
    assert.equal(exception.code, 'E_CUSTOM')
    assert.equal(exception.status, 400)
    assert.equal(exception.message, 'Custom message')
    assert.equal(exception.help, 'Custom help')
  })

  test('should create an exception with static code, status and help and override the message', ({ assert }) => {
    class CustomException extends Exception {
      static override code = 'E_CUSTOM'
      static override status = 400
      static override message = 'Custom message'
      static override help = 'Custom help'
    }

    const exception = new CustomException('Overridden message')

    assert.equal(exception.name, 'CustomException')
    assert.equal(exception.code, 'E_CUSTOM')
    assert.equal(exception.status, 400)
    assert.equal(exception.message, 'Overridden message')
    assert.equal(exception.help, 'Custom help')
  })

  test('should set help, code and status using the setters', ({ assert }) => {
    const exception = new Exception()
    exception.setHelp('New help').setCode('NEW_CODE').setStatus(404)

    assert.equal(exception.help, 'New help')
    assert.equal(exception.code, 'NEW_CODE')
    assert.equal(exception.status, 404)
  })

  test('should return the correct string representation', ({ assert }) => {
    const exception = new Exception('Custom message', { code: 'E_CUSTOM' })
    assert.equal(exception.toString(), 'Exception [E_CUSTOM]: Custom message')
    const exception2 = new Exception('Custom message')
    assert.equal(exception2.toString(), 'Exception: Custom message')
  })

  test('should return the correct toJSON representation', ({ assert }) => {
    const exception = new Exception('Custom message', { code: 'E_CUSTOM', status: 404 })
    exception.setHelp('Custom help')
    assert.deepEqual(exception.toJSON(), {
      name: 'Exception',
      message: 'Custom message',
      code: 'E_CUSTOM',
      status: 404,
      help: 'Custom help',
    })
    const exception2 = new Exception('Custom message')
    assert.deepEqual(exception2.toJSON(), {
      name: 'Exception',
      message: 'Custom message',
      status: 500,
    })
  })
})
test.group('Exception with custom constructor', () => {
  test('should create an exception with custom constructor', ({ assert }) => {
    class CustomException extends Exception {
      constructor(message: string, options?: { code?: string; status?: number }) {
        super(message, options)
        this.customProperty = 'Custom value'
      }

      customProperty: string
    }

    const exception = new CustomException('Custom message', { code: 'E_CUSTOM' })

    assert.equal(exception.name, 'CustomException')
    assert.equal(exception.message, 'Custom message')
    assert.equal(exception.status, 500)
    assert.equal(exception.code, 'E_CUSTOM')
    assert.equal(exception.customProperty, 'Custom value')
  })
})
test.group('Exception with static properties', () => {
  test('should create an exception with static properties', ({ assert }) => {
    class CustomException extends Exception {
      static override code = 'E_CUSTOM'
      static override status = 400
      static override message = 'Custom message'
      static override help = 'Custom help'
    }

    const exception = new CustomException()

    assert.equal(exception.name, 'CustomException')
    assert.equal(exception.code, 'E_CUSTOM')
    assert.equal(exception.status, 400)
    assert.equal(exception.message, 'Custom message')
    assert.equal(exception.help, 'Custom help')
  })

  test('should create an exception with static properties and override the message', ({ assert }) => {
    class CustomException extends Exception {
      static override code = 'E_CUSTOM'
      static override status = 400
      static override message = 'Custom message'
      static override help = 'Custom help'
    }

    const exception = new CustomException('Overridden message')

    assert.equal(exception.name, 'CustomException')
    assert.equal(exception.code, 'E_CUSTOM')
    assert.equal(exception.status, 400)
    assert.equal(exception.message, 'Overridden message')
    assert.equal(exception.help, 'Custom help')
  })
  test('should create an exception with static properties and override the message and status', ({ assert }) => {
    class CustomException extends Exception {
      static override code = 'E_CUSTOM'
      static override status = 400
      static override message = 'Custom message'
      static override help = 'Custom help'
    }

    const exception = new CustomException('Overridden message', { status: 500 })

    assert.equal(exception.name, 'CustomException')
    assert.equal(exception.code, 'E_CUSTOM')
    assert.equal(exception.status, 500)
    assert.equal(exception.message, 'Overridden message')
    assert.equal(exception.help, 'Custom help')
  })

  test('should create an exception with static properties and override the message and code', ({ assert }) => {
    class CustomException extends Exception {
      static override code = 'E_CUSTOM'
      static override status = 400
      static override message = 'Custom message'
      static override help = 'Custom help'
    }

    const exception = new CustomException('Overridden message', { code: 'E_NEW_CODE' })

    assert.equal(exception.name, 'CustomException')
    assert.equal(exception.code, 'E_NEW_CODE')
    assert.equal(exception.status, 400)
    assert.equal(exception.message, 'Overridden message')
    assert.equal(exception.help, 'Custom help')
  })

  test('should create an exception with static properties and override the message, code and status', ({ assert }) => {
    class CustomException extends Exception {
      static override code = 'E_CUSTOM'
      static override status = 400
      static override message = 'Custom message'
      static override help = 'Custom help'
    }

    const exception = new CustomException('Overridden message', { code: 'E_NEW_CODE', status: 500 })

    assert.equal(exception.name, 'CustomException')
    assert.equal(exception.code, 'E_NEW_CODE')
    assert.equal(exception.status, 500)
    assert.equal(exception.message, 'Overridden message')
    assert.equal(exception.help, 'Custom help')
  })

  test('overrides the message, code and status and set help', ({ assert }) => {
    class CustomException extends Exception {
      static override code = 'E_CUSTOM'
      static override status = 400
      static override message = 'Custom message'
      static override help = 'Custom help'
    }

    const exception = new CustomException('Overridden message', { code: 'E_NEW_CODE', status: 500 })
    exception.setHelp('New help')

    assert.equal(exception.name, 'CustomException')
    assert.equal(exception.code, 'E_NEW_CODE')
    assert.equal(exception.status, 500)
    assert.equal(exception.message, 'Overridden message')
    assert.equal(exception.help, 'New help')
  })

  test('overrides the message, code and status and set help and status', ({ assert }) => {
    class CustomException extends Exception {
      static override code = 'E_CUSTOM'
      static override status = 400
      static override message = 'Custom message'
      static override help = 'Custom help'
    }

    const exception = new CustomException('Overridden message', { code: 'E_NEW_CODE', status: 500 })
    exception.setHelp('New help').setStatus(404)

    assert.equal(exception.name, 'CustomException')
    assert.equal(exception.code, 'E_NEW_CODE')
    assert.equal(exception.status, 404)
    assert.equal(exception.message, 'Overridden message')
    assert.equal(exception.help, 'New help')
  })

  test('overrides the message, code and status and set help and code', ({ assert }) => {
    class CustomException extends Exception {
      static override code = 'E_CUSTOM'
      static override status = 400
      static override message = 'Custom message'
      static override help = 'Custom help'
    }

    const exception = new CustomException('Overridden message', { code: 'E_NEW_CODE', status: 500 })
    exception.setHelp('New help').setCode('NEW_CODE')

    assert.equal(exception.name, 'CustomException')
    assert.equal(exception.code, 'NEW_CODE')
    assert.equal(exception.status, 500)
    assert.equal(exception.message, 'Overridden message')
    assert.equal(exception.help, 'New help')
  })
  test('overrides the message, code and status and set help and status and code', ({ assert }) => {
    class CustomException extends Exception {
      static override code = 'E_CUSTOM'
      static override status = 400
      static override message = 'Custom message'
      static override help = 'Custom help'
    }

    const exception = new CustomException('Overridden message', { code: 'E_NEW_CODE', status: 500 })
    exception.setHelp('New help').setStatus(404).setCode('NEW_CODE')

    assert.equal(exception.name, 'CustomException')
    assert.equal(exception.code, 'NEW_CODE')
    assert.equal(exception.status, 404)
    assert.equal(exception.message, 'Overridden message')
    assert.equal(exception.help, 'New help')
  })
})
