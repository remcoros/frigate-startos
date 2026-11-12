import { StringDecoder } from 'string_decoder'

// Host id Frigate binds its Electrum interface on, and the container port it
// listens on. Exported so dependents resolve Frigate over the bridge without a
// literal.
export const electrumHostId = 'electrum'
export const electrumPort = 50001

const ANSI_SGR = /\x1b\[[0-9;]*m/g
const MAX_PARTIAL_LINE = 64 * 1024

// A pipe chunk can end mid-line or mid-codepoint, so matches run on whole lines; make one per spawn.
export function stdoutLines(onLine: (line: string) => void) {
  const decoder = new StringDecoder('utf8')
  let partial = ''
  return (chunk: Buffer | string) => {
    process.stdout.write(chunk)
    const text = typeof chunk === 'string' ? chunk : decoder.write(chunk)
    const lines = (partial + text).split('\n')
    partial = lines.pop() ?? ''
    if (partial.length > MAX_PARTIAL_LINE) partial = ''
    for (const line of lines)
      onLine(line.replace(/\r$/, '').replace(ANSI_SGR, ''))
  }
}
