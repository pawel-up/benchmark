import type { WebPluginFn } from '@pawel-up/lupa/testing/api'
import { setEmitter } from './shared.js'

/**
 * Lupa browser-side test plugin for `@pawel-up/benchmark`.
 *
 * Register this in `lupa.config.ts` under `testPlugins`:
 *
 * ```ts
 * export default defineConfig({
 *   testPlugins: ['@pawel-up/benchmark/lupa/browser'],
 * })
 * ```
 *
 * Once loaded, it wires the Lupa emitter into the benchmark module so that
 * any `LupaReporter` instance can forward results to the Node orchestrator
 * over Lupa's IPC channel.
 */
const setup: WebPluginFn = ({ emitter }) => {
  setEmitter(emitter)
}

export default setup
