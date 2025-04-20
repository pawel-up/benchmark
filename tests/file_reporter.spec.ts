import { test } from '@japa/runner'
import { FileReporter, FileReporterOptions } from '../src/reporters/file_reporter.js'
import sinon from 'sinon'
import { BenchmarkReport, SuiteReport } from '../src/types.js'

test.group('File Reporter', (group) => {
  let writeFileStub: sinon.SinonStub
  let mkdirStub: sinon.SinonStub
  let dateNowStub: sinon.SinonStub
  let fsMock: {
    mkdir: (path: string, options: { recursive: boolean }) => Promise<void>
    writeFile: (path: string, data: string, encoding: string) => Promise<void>
  }
  let pathMock: {
    join: (...paths: string[]) => string
  }

  const validReport: BenchmarkReport = {
    kind: 'benchmark',
    name: 'My Benchmark',
    operationsPerSecond: 1000,
    samples: 100,
    relativeMarginOfError: 0.02,
    sampleStandardDeviation: 0.005,
    marginOfError: 0.01,
    sampleArithmeticMean: 0.001,
    sampleVariance: 0.000025,
    date: '2023-10-27',
    executionTimes: [1, 2, 3],
    standardErrorOfTheMean: 0.001,
  }

  const validSuiteReport: SuiteReport = {
    kind: 'suite',
    date: '2023-10-27',
    name: 'My Suite',
    results: [validReport, validReport],
  }

  group.each.setup(() => {
    // Create mock objects for fs and path
    fsMock = {
      mkdir: sinon.stub().resolves(),
      writeFile: sinon.stub().resolves(),
    }

    pathMock = {
      join: sinon.stub().callsFake((...paths: string[]) => paths.join('-/-')), // Simple join for testing
    }

    writeFileStub = fsMock.writeFile as unknown as sinon.SinonStub
    mkdirStub = fsMock.mkdir as unknown as sinon.SinonStub
    dateNowStub = sinon.stub(Date, 'now').returns(1678886400000) // Example timestamp
  })

  group.each.teardown(() => {
    dateNowStub.restore()
  })

  test('should use default options if none are provided', async ({ assert }) => {
    const reporter = new FileReporter({ fs: fsMock, path: pathMock })
    await reporter.run(validReport)

    assert.equal(mkdirStub.callCount, 1)
    assert.deepEqual(mkdirStub.firstCall.args, ['./', { recursive: true }])

    assert.equal(writeFileStub.callCount, 1)
    assert.deepEqual(writeFileStub.firstCall.args, [
      './-/-1678886400000_benchmark.json',
      JSON.stringify(validReport, null, 2),
      'utf-8',
    ])
  })

  test('should use provided options', async ({ assert }) => {
    const options: FileReporterOptions = {
      outputDir: './my-reports',
      fileNamePattern: 'benchmark_results_%timestamp%.json',
      fs: fsMock,
      path: pathMock,
    }
    const reporter = new FileReporter(options)
    await reporter.run(validReport)

    assert.equal(mkdirStub.callCount, 1)
    assert.deepEqual(mkdirStub.firstCall.args, ['./my-reports', { recursive: true }])

    assert.equal(writeFileStub.callCount, 1)
    assert.deepEqual(writeFileStub.firstCall.args, [
      './my-reports-/-benchmark_results_1678886400000.json',
      JSON.stringify(validReport, null, 2),
      'utf-8',
    ])
  })

  test('should create the output directory if it does not exist', async ({ assert }) => {
    const options: FileReporterOptions = {
      outputDir: './nonexistent-dir',
      fs: fsMock,
      path: pathMock,
    }
    const reporter = new FileReporter(options)
    await reporter.run(validReport)

    assert.equal(mkdirStub.callCount, 1)
    assert.deepEqual(mkdirStub.firstCall.args, ['./nonexistent-dir', { recursive: true }])
  })

  test('should replace %timestamp% in the file name pattern', async ({ assert }) => {
    const options: FileReporterOptions = {
      fileNamePattern: 'my_report_%timestamp%_results.json',
      fs: fsMock,
      path: pathMock,
    }
    const reporter = new FileReporter(options)
    await reporter.run(validReport)

    assert.equal(writeFileStub.callCount, 1)
    assert.deepEqual(writeFileStub.firstCall.args, [
      './-/-my_report_1678886400000_results.json',
      JSON.stringify(validReport, null, 2),
      'utf-8',
    ])
  })

  test('should handle file name pattern without %timestamp%', async ({ assert }) => {
    const options: FileReporterOptions = {
      fileNamePattern: 'my_report.json',
      fs: fsMock,
      path: pathMock,
    }
    const reporter = new FileReporter(options)
    await reporter.run(validReport)

    assert.equal(writeFileStub.callCount, 1)
    assert.deepEqual(writeFileStub.firstCall.args, [
      './-/-my_report.json',
      JSON.stringify(validReport, null, 2),
      'utf-8',
    ])
  })

  test('should write the report to a file', async ({ assert }) => {
    const reporter = new FileReporter({ fs: fsMock, path: pathMock })
    await reporter.run(validReport)

    assert.equal(writeFileStub.callCount, 1)
    assert.deepEqual(writeFileStub.firstCall.args, [
      './-/-1678886400000_benchmark.json',
      JSON.stringify(validReport, null, 2),
      'utf-8',
    ])
  })

  test('should write the suite report to a file', async ({ assert }) => {
    const reporter = new FileReporter({ fs: fsMock, path: pathMock })
    await reporter.run(validSuiteReport)

    assert.equal(writeFileStub.callCount, 1)
    assert.deepEqual(writeFileStub.firstCall.args, [
      './-/-1678886400000_benchmark.json',
      JSON.stringify(validSuiteReport, null, 2),
      'utf-8',
    ])
  })
})
