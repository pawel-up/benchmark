import type { BenchmarkReport, SuiteReport } from '../types.js'

/**
 * Augments Lupa's `CustomRunnerEvents` with the two events emitted by
 * `LupaReporter`, giving full TypeScript safety on both sides of the IPC
 * channel.
 *
 * Place this triple-slash reference in your project's `env.d.ts`:
 *
 * ```ts
 * /// <reference types="@pawel-up/benchmark/lupa/types" />
 * ```
 *
 * Or import it directly:
 *
 * ```ts
 * import type {} from '@pawel-up/benchmark/lupa/types'
 * ```
 */
declare module '@pawel-up/lupa/runner' {
  interface CustomRunnerEvents {
    /** Emitted after each individual benchmark completes. */
    'benchmark:result': BenchmarkReport
    /** Emitted after a full benchmark suite finishes all its benchmarks. */
    'benchmark:suite:end': SuiteReport
  }
}
