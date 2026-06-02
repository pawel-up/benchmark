import type { BenchmarkReport, SuiteReport } from '../types.js'
import { Reporter } from '../reporters/reporter.js'
import { getEmitter } from './shared.js'

/**
 * A reporter that forwards benchmark results to the Lupa IPC channel.
 * Emits `benchmark:result` for individual benchmark reports and
 * `benchmark:suite:end` for full suite reports.
 *
 * Results are automatically forwarded from the browser to the Node
 * orchestrator over Lupa's Vite WebSocket channel, where the Node
 * plugin (`benchmarkPlugin`) picks them up and prints them via `CliReporter`.
 *
 * This reporter is a no-op when used outside a Lupa environment
 * (i.e. when no emitter has been registered via `setEmitter`).
 */
export class LupaReporter extends Reporter {
  async run(report: BenchmarkReport | SuiteReport): Promise<void> {
    const emitter = getEmitter()
    if (!emitter) return
    if (report.kind === 'benchmark') {
      emitter.emit('benchmark:result', report)
    } else {
      emitter.emit('benchmark:suite:end', report)
    }
  }
}
