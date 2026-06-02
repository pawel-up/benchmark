import type { LupaPlugin, TestSuite } from '@pawel-up/lupa/runner'
import { CliReporter } from '../reporters/cli_reporter.js'
import type { BenchmarkReport, SuiteReport } from '../types.js'

/**
 * Returns true when a suite should be treated as a benchmark suite.
 * Matches by suite name ('benchmark' / 'benchmarks') or by file glob
 * pattern containing '.benchmark.' (only for string/string[] file specs).
 */
function isBenchmarkSuite(suite: Required<TestSuite>): boolean {
  const name = suite.name.toLowerCase()
  if (name === 'benchmark' || name === 'benchmarks') return true
  if (typeof suite.files === 'string') return suite.files.includes('.benchmark.')
  if (Array.isArray(suite.files)) return suite.files.some((f) => f.includes('.benchmark.'))
  return false
}

/**
 * Lupa Node-side runner plugin for `@pawel-up/benchmark`.
 *
 * Register this in `lupa.config.ts` under `runnerPlugins`:
 *
 * ```ts
 * import { benchmarkPlugin } from '@pawel-up/benchmark/lupa/node'
 *
 * export default defineConfig({
 *   runnerPlugins: [benchmarkPlugin()],
 * })
 * ```
 *
 * The plugin does two things automatically:
 *
 * 1. **`plan` hook** — sets `priority: 50` and `disableInWatchMode: true` on
 *    every suite detected as a benchmark suite, so benchmarks always run after
 *    all regular test suites and are skipped during `--watch` runs.
 *
 * 2. **`execute` hook** — subscribes to `benchmark:result` events forwarded
 *    from the browser and prints each result to the terminal via `CliReporter`.
 */
export function benchmarkPlugin(): LupaPlugin {
  return {
    name: 'benchmark',

    plan({ config }) {
      if (!('suites' in config)) return
      for (const suite of config.suites) {
        if (isBenchmarkSuite(suite)) {
          suite.priority = 50
          suite.disableInWatchMode = true
        }
      }
    },

    execute({ emitter }) {
      const reporter = new CliReporter({ format: 'short' })

      // Cast to any: custom events are not in RunnerEvents until the consumer
      // adds the type augmentation via @pawel-up/benchmark/lupa/types.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = emitter as any

      e.on('benchmark:result', (report: BenchmarkReport) => {
        void reporter.run(report)
      })

      e.on('benchmark:suite:end', (report: SuiteReport) => {
        void reporter.run(report)
      })
    },
  }
}
