/* eslint-disable no-console */
import { test } from '@japa/runner'
import { type ILogObj, type ILogObjMeta, Logger } from 'tslog'
import { FileStore } from '../../../src/store/file_store.js'
import { SuiteReport } from '../../../src/types.js'

const mockFs = {
  mkdir: async () => {},
  readdir: async () => [],
  readFile: async () => '',
}

const mockPath = {
  join: (...paths: string[]) => paths.join('/'),
}

test.group('FileStore.constructor()', () => {
  test('sets the defaults', ({ assert }) => {
    const fileStore = new FileStore()
    assert.strictEqual(fileStore.basePath, './benchmarks/history')
    assert.deepEqual(fileStore['options'], {})
  })

  test('sets the custom path', ({ assert }) => {
    const options = { basePath: './custom/path' }
    const fileStore = new FileStore(options)
    assert.strictEqual(fileStore.basePath, './custom/path')
    assert.deepEqual(fileStore['options'], options)
  })
})

test.group('FileStore.getHistoryPath()', () => {
  test('getting path without the type', ({ assert }) => {
    const fileStore = new FileStore()
    const path = fileStore.getHistoryPath()
    assert.strictEqual(path, './benchmarks/history')
  })

  test('getting path with the type', ({ assert }) => {
    const fileStore = new FileStore<'Suite1' | 'Suite2'>()
    const path = fileStore.getHistoryPath('Suite1')
    assert.strictEqual(path, './benchmarks/history/Suite1')
  })
})

test.group('FileStore.list()', () => {
  test('lists empty directory', async ({ assert }) => {
    const fileStore = new FileStore<'Suite1' | 'Suite2'>({ fs: mockFs, path: mockPath })
    const files = await fileStore.list('Suite1')
    assert.deepEqual(files, [])
  })

  test('lists files', async ({ assert }) => {
    const mockFsWithFiles = {
      ...mockFs,
      readdir: async () => ['file1.json', 'file2.json', 'not_a_json.txt'],
    }
    const fileStore = new FileStore<'Suite1' | 'Suite2'>({ fs: mockFsWithFiles, path: mockPath })
    const files = await fileStore.list('Suite1')
    assert.deepEqual(files, ['file1.json', 'file2.json'])
  })

  test('lists files sorted', async ({ assert }) => {
    const mockFsWithFiles = {
      ...mockFs,
      readdir: async () => ['file2.json', 'file1.json', 'file3.json'],
    }
    const fileStore = new FileStore<'Suite1' | 'Suite2'>({ fs: mockFsWithFiles, path: mockPath })
    const files = await fileStore.list('Suite1')
    assert.deepEqual(files, ['file1.json', 'file2.json', 'file3.json'])
  })
})

test.group('FileStore.loadLatestBenchmark()', () => {
  test('handles no files', async ({ assert }) => {
    const fileStore = new FileStore<'Suite1' | 'Suite2'>({ fs: mockFs, path: mockPath })
    const latest = await fileStore.loadLatestBenchmark('Suite1')
    assert.strictEqual(latest, undefined)
    assert.strictEqual(fileStore.latest, undefined)
  })

  test('loads the last file', async ({ assert }) => {
    const mockFsWithFile = {
      ...mockFs,
      readdir: async () => ['file1.json', 'file2.json'],
      readFile: async () => JSON.stringify({ name: 'Test Suite' }),
    }
    const fileStore = new FileStore<'Suite1' | 'Suite2'>({ fs: mockFsWithFile, path: mockPath })
    const latest = await fileStore.loadLatestBenchmark('Suite1')
    assert.deepEqual(latest, { name: 'Test Suite' })
    assert.deepEqual(fileStore.latest, { name: 'Test Suite' })
  })

  test('handles errors while reading the file', async ({ assert }) => {
    const mockFsWithError = {
      ...mockFs,
      readdir: async () => ['file1.json'],
      readFile: async () => {
        throw new Error('File read error')
      },
    }
    const logger = new Logger<ILogObj>({
      type: 'pretty',
      hideLogPositionForProduction: true,
      minLevel: 6,
    })
    const transports: ILogObjMeta[] = []
    logger.attachTransport((logObj) => {
      transports.push(logObj)
    })
    const fileStore = new FileStore<'Suite1' | 'Suite2'>({ fs: mockFsWithError, path: mockPath, logger })
    const latest = await fileStore.loadLatestBenchmark('Suite1')
    assert.strictEqual(latest, undefined)
    assert.strictEqual(fileStore.latest, undefined)
  })
})

test.group('FileStore.compareLatest()', () => {
  test('handles no latest', ({ assert }) => {
    const logger = new Logger<ILogObj>({
      type: 'pretty',
      hideLogPositionForProduction: true,
      minLevel: 3,
    })
    const transports: ILogObjMeta[] = []
    logger.attachTransport((logObj) => {
      transports.push(logObj)
    })
    const fileStore = new FileStore({ logger })
    const result: SuiteReport = {
      name: 'Current Suite',
      date: new Date().toLocaleDateString(),
      results: [],
      kind: 'suite',
    }
    fileStore.compareLatest(result)
    assert.lengthOf(transports, 1)
    assert.strictEqual(transports[0]['0'], 'No previous benchmark found to compare with.')
  })

  test('uses the passed latest report', ({ assert }) => {
    const fileStore = new FileStore()
    const result: SuiteReport = {
      name: 'Current Suite',
      date: new Date().toLocaleDateString(),
      results: [],
      kind: 'suite',
    }
    const latest: SuiteReport = {
      name: 'Latest Suite',
      date: new Date().toLocaleDateString(),
      results: [],
      kind: 'suite',
    }
    let consoleOutput = ''
    const originalLog = console.info
    console.info = (message: string) => {
      consoleOutput = message
    }
    fileStore.compareLatest(result, latest)
    console.info = originalLog
    assert.include(consoleOutput, 'Comparing suites "Current Suite" vs "Latest Suite"')
  })

  test('FileStore - compareLatest uses loaded latest', async ({ assert }) => {
    const mockFsWithFile = {
      ...mockFs,
      readdir: async () => ['file1.json'],
      readFile: async () =>
        JSON.stringify({ name: 'Latest Suite', kind: 'suite', date: new Date().toLocaleDateString(), results: [] }),
    }
    const fileStore = new FileStore<'Suite1' | 'Suite2'>({ fs: mockFsWithFile, path: mockPath })
    await fileStore.loadLatestBenchmark('Suite1')
    const result: SuiteReport = {
      name: 'Current Suite',
      date: new Date().toLocaleDateString(),
      results: [],
      kind: 'suite',
    }
    let consoleOutput = ''
    const originalLog = console.info
    console.info = (message: string) => {
      consoleOutput = message
    }
    fileStore.compareLatest(result)
    console.info = originalLog
    assert.include(consoleOutput, 'Comparing suites "Current Suite" vs "Latest Suite"')
  })
})
