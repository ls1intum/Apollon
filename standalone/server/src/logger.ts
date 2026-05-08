export type LogLevel = "silent" | "error" | "warn" | "debug"

type Sink = Pick<Console, "debug" | "warn" | "error">

const noop = () => {}

let sink: Sink =
  typeof process !== "undefined" && process.env.NODE_ENV !== "production"
    ? console
    : { debug: noop, warn: noop, error: noop }

let level: LogLevel =
  typeof process !== "undefined" && process.env.NODE_ENV !== "production"
    ? "debug"
    : "silent"

export function setLogger(next: Partial<Sink>) {
  sink = { ...sink, ...next }
}

export function setLogLevel(next: LogLevel) {
  level = next
}

export const log = {
  debug: (...a: unknown[]) => (level === "debug" ? sink.debug(...a) : void 0),
  warn: (...a: unknown[]) =>
    level === "debug" || level === "warn" ? sink.warn(...a) : void 0,
  // Errors always reach stderr; "silent" suppresses request/message debug noise, not service failures.
  error: (...a: unknown[]) =>
    level === "silent" ? console.error(...a) : sink.error(...a),
}
