import { Emitter, type FrameworkEvents } from '@pawel-up/lupa/testing/api'
import type { BenchmarkReport, SuiteReport } from '../index.js'

let _emitter: Emitter<FrameworkEvents> | null = null

/** Called by the browser plugin once Lupa injects its emitter. */
export const setEmitter = (e: Emitter<FrameworkEvents>): void => {
  _emitter = e
}

/** Returns the emitter set by the browser plugin, or null if not yet initialised. */
export const getEmitter = (): Emitter<FrameworkEvents> | null => _emitter

declare module '@pawel-up/lupa/testing/api' {
  interface CustomRunnerEvents {
    'benchmark:result': BenchmarkReport
    'benchmark:suite:end': SuiteReport
  }
}
