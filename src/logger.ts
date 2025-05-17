import { Logger, type ILogObj } from 'tslog'
import type { BenchmarkOptions } from './types.js'

export function createLogger(opts: BenchmarkOptions): Logger<ILogObj> {
  const { debug = false, logLevel } = opts
  let level: number
  if (debug && typeof logLevel === 'number') {
    level = logLevel
  } else {
    level = debug ? 0 : 5
  }
  return new Logger({
    type: 'pretty',
    hideLogPositionForProduction: true,
    minLevel: level,
  })
}
