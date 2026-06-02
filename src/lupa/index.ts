import { Suite } from '../suite.js'
import type { SuiteInit } from '../types.js'
import { LupaReporter } from './lupa_reporter.js'

export { LupaReporter } from './lupa_reporter.js'

/**
 * Creates a `Suite` pre-wired with a `LupaReporter` so benchmark results are
 * automatically forwarded to the Lupa Node orchestrator over the IPC channel.
 *
 * Use this instead of `new Suite()` in benchmark files when running under Lupa:
 *
 * ```ts
 * // tests/my-fn.benchmark.ts
 * import { createSuite } from '@pawel-up/benchmark/lupa'
 *
 * const suite = createSuite('My Suite')
 * suite.add('Array.from', () => Array.from({ length: 1_000 }))
 * suite.add('spread',     () => [...Array(1_000)])
 * await suite.run()
 * ```
 *
 * The reporter is registered for both `'after-each'` and `'after-all'` timings
 * so individual results appear progressively and a final suite summary is also
 * forwarded.
 */
export function createSuite(name: string, options?: SuiteInit): Suite {
  const suite = new Suite(name, options)
  const reporter = new LupaReporter()
  suite.addReporter(reporter, 'after-each')
  suite.addReporter(reporter, 'after-all')
  return suite
}
