/* eslint-disable no-restricted-globals */
import { test } from '@japa/runner'
import { SuiteConfig } from '../../src/suite_config.js'
import { Logger, type ILogObj } from 'tslog'
import sinon from 'sinon'
import nodePath from 'node:path'

test.group('SuiteConfig', (group) => {
  let clock: sinon.SinonFakeTimers
  group.each.setup(() => {
    clock = sinon.useFakeTimers()
  })
  group.each.teardown(() => {
    clock.restore()
  })

  test('should create a SuiteConfig instance with default options', async ({ assert }) => {
    const config = new SuiteConfig()
    await config.load()
    assert.equal(config.maxExecutionTime, 10000)
    assert.equal(config.warmupIterations, 10)
    assert.equal(config.innerIterations, 10)
    assert.equal(config.maxInnerIterations, 10000)
    assert.equal(config.timeThreshold, 1)
    assert.equal(config.minSamples, 10)
    assert.equal(config.maxIterations, 100)
    assert.equal(config.debug, false)
    assert.equal(config.logLevel, 5)
  })

  test('should create a SuiteConfig instance with custom options', async ({ assert }) => {
    const options = {
      maxExecutionTime: 5000,
      warmupIterations: 5,
      innerIterations: 5,
      maxInnerIterations: 5000,
      timeThreshold: 0.5,
      minSamples: 5,
      maxIterations: 50,
      logLevel: 2,
    }
    const config = new SuiteConfig(options)
    await config.load()
    assert.equal(config.maxExecutionTime, options.maxExecutionTime)
    assert.equal(config.warmupIterations, options.warmupIterations)
    assert.equal(config.innerIterations, options.innerIterations)
    assert.equal(config.maxInnerIterations, options.maxInnerIterations)
    assert.equal(config.timeThreshold, options.timeThreshold)
    assert.equal(config.minSamples, options.minSamples)
    assert.equal(config.maxIterations, options.maxIterations)
    assert.equal(config.logLevel, 2)
  })

  test('should load configuration from a JSON file', async ({ assert }) => {
    const fs = {
      readFile: sinon.stub().resolves(JSON.stringify({ maxExecutionTime: 2000 })),
      stat: (filePath: string) => {
        if (filePath === '/path/to/benchmark.config.json') {
          return Promise.resolve({ isFile: () => true })
        }
        return Promise.reject(new Error('File not found'))
      },
    }
    const path = {
      join: nodePath.join,
      dirname: nodePath.dirname,
    }
    const config = new SuiteConfig({ fs, path })
    const origCwd = process.cwd
    process.cwd = () => '/path/to/'
    await config.load()
    process.cwd = origCwd
    assert.equal(config.maxExecutionTime, 2000)
    assert.isTrue(fs.readFile.calledOnceWith('/path/to/benchmark.config.json', 'utf-8'))
  })

  test('should load configuration from a JS file', async ({ assert }) => {
    const module = { default: { maxExecutionTime: 3000 } }
    const importStub = sinon.stub().resolves(module)
    const fs = {
      readFile: sinon.stub(),
      stat: sinon.stub().resolves({ isFile: () => true }),
    }
    const path = {
      join: sinon.stub().returns('/path/to/benchmark.config.js'),
      dirname: sinon.stub().returns('/path/to'),
    }
    const config = new SuiteConfig({ fs, path })
    config['loadFromFile'] = async () => (await importStub())['default']
    await config.load()
    assert.equal(config.maxExecutionTime, 3000)
  })

  test('should use constructor options if no config file is found', async ({ assert }) => {
    const fs = {
      readFile: sinon.stub(),
      stat: sinon.stub().rejects(new Error('File not found')),
    }
    const path = {
      join: sinon.stub().returns('/path/to/benchmark.config.json'),
      dirname: sinon.stub().returns('/path/to'),
    }
    const options = { maxExecutionTime: 4000 }
    const config = new SuiteConfig({ ...options, fs, path })
    await config.load()
    assert.equal(config.maxExecutionTime, 4000)
  })

  test('should merge constructor options with config file options', async ({ assert }) => {
    const fs = {
      readFile: sinon.stub().resolves(JSON.stringify({ maxExecutionTime: 2000, warmupIterations: 20 })),
      stat: (filePath: string) => {
        if (filePath === '/path/to/benchmark.config.json') {
          return Promise.resolve({ isFile: () => true })
        }
        return Promise.reject(new Error('File not found'))
      },
    }
    const path = {
      join: nodePath.join,
      dirname: nodePath.dirname,
    }
    const options = { maxExecutionTime: 4000, innerIterations: 5 }
    const config = new SuiteConfig({ ...options, fs, path })
    const origCwd = process.cwd
    process.cwd = () => '/path/to/'
    await config.load()
    process.cwd = origCwd
    assert.equal(config.maxExecutionTime, 4000)
    assert.equal(config.warmupIterations, 20)
    assert.equal(config.innerIterations, 5)
  })

  test('should handle errors when loading config file', async ({ assert }) => {
    const logger = new Logger<ILogObj>({ minLevel: 5 })
    const spy = sinon.spy(logger, 'error')
    const fs = {
      readFile: sinon.stub().rejects(new Error('Failed to read file')),
      stat: sinon.stub().resolves({ isFile: () => true }),
    }
    const path = {
      join: sinon.stub().returns('/path/to/benchmark.config.json'),
      dirname: sinon.stub().returns('/path/to'),
    }
    const config = new SuiteConfig({ fs, path })
    config.logger = logger
    await config.load()
    assert.isTrue(spy.calledOnce)
    assert.equal(spy.firstCall.args[0] as string, 'Error loading configuration file:')
  })

  test('should find config file in parent directories', async ({ assert }) => {
    const fs = {
      readFile: sinon.stub().resolves(JSON.stringify({ maxExecutionTime: 2000 })),
      stat: sinon
        .stub()
        .onFirstCall()
        .rejects(new Error('File not found'))
        .onSecondCall()
        .resolves({ isFile: () => true }),
    }
    const path = {
      join: sinon
        .stub()
        .onFirstCall()
        .returns('/path/to/current/benchmark.config.json')
        .onSecondCall()
        .returns('/path/to/benchmark.config.json'),
      dirname: sinon.stub().onFirstCall().returns('/path/to').onSecondCall().returns('/path'),
    }
    const config = new SuiteConfig({ fs, path })
    const origCwd = process.cwd
    process.cwd = () => '/path/to/current'
    await config.load()
    process.cwd = origCwd
    assert.equal(config.maxExecutionTime, 2000)
    assert.isTrue(fs.stat.calledTwice)
    assert.equal(fs.stat.firstCall.args[0], '/path/to/current/benchmark.config.json')
    assert.equal(fs.stat.secondCall.args[0], '/path/to/benchmark.config.json')
  })

  test('should return null when no config file is found after traversing to root', async ({ assert }) => {
    const fs = {
      readFile: sinon.stub(),
      stat: sinon.stub().rejects(new Error('File not found')),
    }
    const path = {
      join: sinon.stub().returns('/benchmark.config.json'),
      dirname: sinon.stub().returns('/'),
    }
    const config = new SuiteConfig({ fs, path })
    const origCwd = process.cwd
    process.cwd = () => '/'
    await config.load()
    process.cwd = origCwd
    assert.deepEqual(config['options'], config['initOptions'])
  })

  test('should use configPath option if provided', async ({ assert }) => {
    const fs = {
      readFile: sinon.stub().resolves(JSON.stringify({ maxExecutionTime: 2000 })),
      stat: sinon.stub().resolves({ isFile: () => true }),
    }
    const path = {
      join: sinon.stub().returns('/custom/path/config.json'),
      dirname: sinon.stub().returns('/custom/path'),
    }
    const configPath = '/custom/path/config.json'
    const config = new SuiteConfig({ configPath, fs, path })
    await config.load()
    assert.equal(config.maxExecutionTime, 2000)
    assert.isTrue(fs.readFile.calledOnceWith(configPath, 'utf-8'))
    assert.isTrue(path.join.notCalled)
  })

  test('should use configPath option with js file', async ({ assert }) => {
    const module = { default: { maxExecutionTime: 3000 } }
    const importStub = sinon.stub().resolves(module)
    const fs = {
      readFile: sinon.stub(),
      stat: sinon.stub().resolves({ isFile: () => true }),
    }
    const path = {
      join: sinon.stub().returns('/custom/path/config.js'),
      dirname: sinon.stub().returns('/custom/path'),
    }
    const configPath = '/custom/path/config.js'
    const config = new SuiteConfig({ configPath, fs, path })
    config['loadFromFile'] = async () => (await importStub())['default']
    await config.load()
    assert.equal(config.maxExecutionTime, 3000)
    assert.isTrue(path.join.notCalled)
  })

  test('should create logger with correct settings', async ({ assert }) => {
    const options = { debug: true, logLevel: 2 }
    const config = new SuiteConfig(options)
    await config.load()
    assert.instanceOf(config.logger, Logger)
    assert.equal(config.logger.settings.minLevel, 2)

    const config2 = new SuiteConfig({ debug: false })
    await config2.load()
    assert.equal(config2.logger.settings.minLevel, 5)
  })

  test('Accepts an instance of the SuiteConfig and makes a reference', ({ assert }) => {
    const c1 = new SuiteConfig({ maxExecutionTime: 10 })
    const c2 = new SuiteConfig(c1)
    assert.equal(c2.maxExecutionTime, 10)
    c1['options'].maxExecutionTime = 20
    assert.equal(c2.maxExecutionTime, 20)
  })
})

test.group('SuiteConfig.canReadFile()', () => {
  test('returns true for node environment', ({ assert }) => {
    const c1 = new SuiteConfig()
    // we are in the NodeJS environment right now.
    assert.isTrue(c1.canReadFile())
  })

  test('returns true when polyfills are provided', ({ assert }) => {
    const fs = {
      readFile: sinon.stub(),
      stat: sinon.stub().resolves({ isFile: () => true }),
    }
    const path = {
      join: sinon.stub().returns('/custom/path/config.js'),
      dirname: sinon.stub().returns('/custom/path'),
    }
    const c1 = new SuiteConfig({ useSyntheticNodeModules: true, fs, path })
    assert.isTrue(c1.canReadFile())
  })
})

test.group('SuiteConfig.validateSyntheticNodeModules()', () => {
  test('throws when fs module is not defined', ({ assert }) => {
    const path = {
      join: sinon.stub().returns('/custom/path/config.js'),
      dirname: sinon.stub().returns('/custom/path'),
    }
    const c1 = new SuiteConfig({ useSyntheticNodeModules: true, path })
    assert.throws(
      () => c1['validateSyntheticNodeModules'](),
      'The "fs" synthetic module must be defined on the init options'
    )
  })

  test('throws when path module is not defined', ({ assert }) => {
    const fs = {
      readFile: sinon.stub(),
      stat: sinon.stub().resolves({ isFile: () => true }),
    }
    const c1 = new SuiteConfig({ useSyntheticNodeModules: true, fs })
    assert.throws(
      () => c1['validateSyntheticNodeModules'](),
      'The "path" synthetic module must be defined on the init options'
    )
  })

  test('throws when fs.readFile module is not defined', ({ assert }) => {
    const fs = {
      // readFile: sinon.stub(),
      stat: sinon.stub().resolves({ isFile: () => true }),
    }
    const path = {
      join: sinon.stub().returns('/custom/path/config.js'),
      dirname: sinon.stub().returns('/custom/path'),
    }
    // @ts-expect-error Testing missing properties
    const c1 = new SuiteConfig({ useSyntheticNodeModules: true, path, fs })
    assert.throws(
      () => c1['validateSyntheticNodeModules'](),
      'The "fs.readFile" function must be defined on the init options'
    )
  })

  test('throws when fs.stat module is not defined', ({ assert }) => {
    const fs = {
      readFile: sinon.stub(),
      // stat: sinon.stub().resolves({ isFile: () => true }),
    }
    const path = {
      join: sinon.stub().returns('/custom/path/config.js'),
      dirname: sinon.stub().returns('/custom/path'),
    }
    // @ts-expect-error Testing missing properties
    const c1 = new SuiteConfig({ useSyntheticNodeModules: true, path, fs })
    assert.throws(
      () => c1['validateSyntheticNodeModules'](),
      'The "fs.stat" function must be defined on the init options'
    )
  })

  test('throws when path.join module is not defined', ({ assert }) => {
    const fs = {
      readFile: sinon.stub(),
      stat: sinon.stub().resolves({ isFile: () => true }),
    }
    const path = {
      // join: sinon.stub().returns('/custom/path/config.js'),
      dirname: sinon.stub().returns('/custom/path'),
    }
    // @ts-expect-error Testing missing properties
    const c1 = new SuiteConfig({ useSyntheticNodeModules: true, path, fs })
    assert.throws(
      () => c1['validateSyntheticNodeModules'](),
      'The "path.join" function must be defined on the init options'
    )
  })

  test('throws when path.dirname module is not defined', ({ assert }) => {
    const fs = {
      readFile: sinon.stub(),
      stat: sinon.stub().resolves({ isFile: () => true }),
    }
    const path = {
      join: sinon.stub().returns('/custom/path/config.js'),
      // dirname: sinon.stub().returns('/custom/path'),
    }
    // @ts-expect-error Testing missing properties
    const c1 = new SuiteConfig({ useSyntheticNodeModules: true, path, fs })
    assert.throws(
      () => c1['validateSyntheticNodeModules'](),
      'The "path.dirname" function must be defined on the init options'
    )
  })
})

test.group('SuiteConfig.postConfigLoad()', () => {
  test('sets deprecated debug option and no logLevel', ({ assert }) => {
    const c1 = new SuiteConfig({ debug: true })
    c1['postConfigLoad']()
    assert.equal(c1.logger.settings.minLevel, 0)
  })

  test('sets log level when no related config', ({ assert }) => {
    const c1 = new SuiteConfig()
    c1['postConfigLoad']()
    assert.equal(c1.logger.settings.minLevel, 5)
  })

  test('sets the passed log level', ({ assert }) => {
    const c1 = new SuiteConfig({ logLevel: 3 })
    c1['postConfigLoad']()
    assert.equal(c1.logger.settings.minLevel, 3)
  })

  test('the set log level take precedence', ({ assert }) => {
    const c1 = new SuiteConfig({ logLevel: 3, debug: true })
    c1['postConfigLoad']()
    assert.equal(c1.logger.settings.minLevel, 3)
  })
})

test.group('SuiteConfig.loadFromFile()', () => {
  test('loads an esm file', async ({ assert }) => {
    const c1 = new SuiteConfig()
    const result = await c1['loadFromFile']({
      type: 'esm',
      pattern: 'benchmark.config.js',
      path: '../tests/fixtures/benchmark.config.js',
    })
    assert.deepEqual(result, { innerIterations: 123 })
  })

  test('loads a json file', async ({ assert }) => {
    const c1 = new SuiteConfig()
    const result = await c1['loadFromFile']({
      type: 'json',
      pattern: 'benchmark.config.json',
      path: './tests/fixtures/benchmark.config.json',
    })
    assert.deepEqual(result, { innerIterations: 123 })
  })

  test('throws when unsupported import format', async ({ assert }) => {
    const c1 = new SuiteConfig()
    assert.rejects(async () => {
      await c1['loadFromFile']({
        // @ts-expect-error Testing invalid options
        type: 'other',
        pattern: 'benchmark.config.json',
        path: './tests/fixtures/benchmark.config.json',
      })
    })
  })
})
