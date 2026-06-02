/**
 * Minimal duck-type for the Lupa emitter.
 * Typed as a structural interface so this module has zero runtime dependency on Lupa.
 */
interface MinimalEmitter {
  emit(event: string, data?: unknown): void
}

let _emitter: MinimalEmitter | null = null

/** Called by the browser plugin once Lupa injects its emitter. */
export const setEmitter = (e: MinimalEmitter): void => {
  _emitter = e
}

/** Returns the emitter set by the browser plugin, or null if not yet initialised. */
export const getEmitter = (): MinimalEmitter | null => _emitter
