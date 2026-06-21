import { Worker } from "node:worker_threads"
import os from "node:os"
import path from "node:path"
import type { UMLModel } from "@tumaet/apollon"
import { Errors } from "../http/errors.js"
import type { ConversionFormat } from "../workers/conversion-worker-thread.js"

export type ConversionOutput = { mime: string; data: Buffer | string }

type Job = {
  id: number
  format: ConversionFormat
  model: UMLModel
  scale?: number
  enqueuedAt: number
  resolve: (output: ConversionOutput) => void
  reject: (error: Error) => void
}

type WorkerMessage =
  | { id: number; ok: true; mime: string; data: string | Uint8Array }
  | { id: number; ok: false; error: string; code?: string }

export class QueueFullError extends Error {}

/** Approx resident memory of one warm worker on top of its heap cap (JSDOM). */
const PER_WORKER_MB_BASE = 80
/** A worker rendering longer than its format's deadline is treated as hung. */
const RENDER_DEADLINE_MS: Record<ConversionFormat, number> = {
  svg: Number(process.env.CONVERTER_TIMEOUT_SVG_MS ?? 10_000),
  png: Number(process.env.CONVERTER_TIMEOUT_PNG_MS ?? 15_000),
  pdf: Number(process.env.CONVERTER_TIMEOUT_PDF_MS ?? 30_000),
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n))

/**
 * Self-calibrating pool ceiling. The binding resource is usually memory (each
 * worker holds a warm JSDOM), so take the min of a CPU-derived and a
 * memory-derived bound. `availableParallelism()` is cgroup/affinity-aware on the
 * repo's Node ≥ 24, so no manual cgroup probing is needed. Env-overridable but
 * never required.
 */
function computePoolMax(workerHeapMb: number): number {
  const cores = os.availableParallelism()
  // Leave a core for the event loop once there's enough to spare.
  const cpuDerived = cores >= 4 ? cores - 1 : cores
  const perWorkerMb = workerHeapMb + PER_WORKER_MB_BASE
  const budgetMb = 0.6 * (os.totalmem() / 1e6) // reserve 40% for OS + main proc
  const memDerived = Math.max(1, Math.floor(budgetMb / perWorkerMb))
  const derived = clamp(Math.min(cpuDerived, memDerived), 1, 32)
  const override = Number(process.env.CONVERTER_POOL_MAX)
  return Number.isFinite(override) && override >= 1
    ? clamp(override, 1, 64)
    : derived
}

type PooledWorker = {
  worker: Worker
  busy: boolean
  idleSince: number
  renders: number
  active: { id: number; timeout: NodeJS.Timeout; job: Job } | undefined
}

/**
 * Render pool for the conversion worker. Replaces the previous single serial
 * worker: throughput is overhead-bound (~320 ms/render regardless of diagram
 * size) and scales near-linearly with worker count, so a pool sized to the
 * machine turns a ~3 rps ceiling into ~3 × poolSize. Self-calibrating — the
 * deployer sets nothing.
 *
 * Lifecycle: one warm worker is spawned eagerly (the first request after boot
 * is warm); the pool lazy-grows to `poolMax` under concurrent demand and reaps
 * idle workers back to one after the idle TTL, so a quiet deploy doesn't hold a
 * fleet of idle JSDOMs. Crashed/timed-out workers are replaced with bounded
 * backoff; a worker is recycled after `recycleAfterRenders` to bound any slow
 * JSDOM leak.
 *
 * The public surface — `render(format, model, scale)`, `QueueFullError`, and the
 * INVALID_MODEL_GEOMETRY → 422 mapping — is unchanged.
 */
export class ConversionResource {
  private readonly workerMaxOldGenerationMb = Number(
    process.env.CONVERTER_WORKER_MAX_OLD_SPACE_MB ?? 256
  )
  private readonly workerStackMb = Number(
    process.env.CONVERTER_WORKER_STACK_MB ?? 8
  )
  private readonly poolMax = computePoolMax(this.workerMaxOldGenerationMb)
  private readonly poolMin = clamp(
    Number(process.env.CONVERTER_POOL_MIN ?? 1),
    1,
    this.poolMax
  )
  /** Little's Law: cap ≈ tolerable-wait / service-time, scaled by pool width. */
  private readonly maxQueueLength = clamp(
    Number(process.env.CONVERTER_MAX_QUEUE_LENGTH ?? this.poolMax * 8),
    8,
    512
  )
  /** Drop a queued job that has already waited longer than this (it's a ghost). */
  private readonly maxQueueWaitMs = Number(
    process.env.CONVERTER_MAX_QUEUE_WAIT_MS ?? 10_000
  )
  private readonly recycleAfterRenders = Number(
    process.env.CONVERTER_RECYCLE_AFTER_RENDERS ?? 500
  )
  private readonly crashBackoffMaxMs = Number(
    process.env.CONVERTER_CRASH_BACKOFF_MAX_MS ?? 5_000
  )

  private workers: PooledWorker[] = []
  private queue: Job[] = []
  private nextId = 1
  private consecutiveCrashes = 0

  constructor() {
    for (let i = 0; i < this.poolMin; i++) this.spawn()
    // Reap idle workers down to poolMin. unref so it never holds the process up.
    setInterval(() => this.reapIdle(), 15_000).unref()
  }

  // Overridable so tests can drive a fake worker without a real thread.
  protected createWorker(): Worker {
    // `pnpm run dev` runs the server from TypeScript source via tsx, where the
    // sibling worker is a `.ts` with no compiled `.js`. tsx's worker loader
    // transpiles a worker entry but does NOT apply its `.js`→`.ts` resolution to
    // that entry's own imports, so we can't point a worker at the raw `.ts`.
    // Route dev through a small `.mjs` bootstrap that re-imports the worker under
    // tsx's programmatic loader (`tsImport`), which resolves the whole graph.
    // Production runs the compiled `.js` directly and never loads the bootstrap.
    const fromSource = import.meta.url.endsWith(".ts")
    const workerPath =
      process.env.CONVERTER_WORKER_PATH ??
      path.resolve(
        import.meta.dirname,
        fromSource
          ? "../workers/conversion-worker-dev.mjs"
          : "../workers/conversion-worker-thread.js"
      )
    return new Worker(workerPath, {
      env: { ...process.env },
      resourceLimits: {
        maxOldGenerationSizeMb: this.workerMaxOldGenerationMb,
        stackSizeMb: this.workerStackMb,
      },
    })
  }

  private spawn(): PooledWorker {
    const pw: PooledWorker = {
      worker: this.createWorker(),
      busy: false,
      idleSince: Date.now(),
      renders: 0,
      active: undefined,
    }
    pw.worker.on("message", (m: WorkerMessage) => this.onMessage(pw, m))
    pw.worker.on("error", (e) => this.onExit(pw, e))
    pw.worker.on("exit", (code) => {
      if (code !== 0) {
        this.onExit(pw, new Error(`Conversion worker exited with code ${code}`))
      }
    })
    this.workers.push(pw)
    return pw
  }

  private onMessage(pw: PooledWorker, message: WorkerMessage) {
    if (!pw.active || pw.active.id !== message.id) return
    clearTimeout(pw.active.timeout)
    const { job } = pw.active
    pw.active = undefined
    pw.busy = false
    pw.idleSince = Date.now()
    pw.renders += 1
    this.consecutiveCrashes = 0 // a successful round-trip clears the crash streak

    if (message.ok) {
      job.resolve({
        mime: message.mime,
        data:
          typeof message.data === "string"
            ? message.data
            : Buffer.from(message.data),
      })
    } else if (message.code === "INVALID_MODEL_GEOMETRY") {
      // Corrupt client model, not a server fault — 422, not 500.
      job.reject(
        Errors.invalidParams(message.error.split("\n")[0] || message.error)
      )
    } else {
      job.reject(new Error(message.error))
    }

    // Recycle a worn worker between jobs (graceful — no in-flight loss).
    if (pw.renders >= this.recycleAfterRenders) this.retire(pw)
    this.dispatch()
  }

  /** Crash / timeout: fail the in-flight job, replace the worker with backoff. */
  private onExit(pw: PooledWorker, error: Error) {
    // Idempotent: ignore a worker already removed from the pool. `terminate()`
    // exits with a non-zero code, so every intentional shutdown (retire, reap,
    // and this method's own cleanup) re-fires `exit` — and the worker's `error`
    // then `exit` both fire on a real crash. Without this guard those would
    // re-enter as fake crashes, inflating the backoff counter and respawning
    // past the pool cap.
    if (!this.workers.includes(pw)) return
    this.workers = this.workers.filter((w) => w !== pw)

    if (pw.active) {
      clearTimeout(pw.active.timeout)
      pw.active.job.reject(error)
      pw.active = undefined
    }
    void pw.worker.terminate().catch(() => undefined)

    this.consecutiveCrashes += 1
    const backoff = Math.min(
      250 * 2 ** (this.consecutiveCrashes - 1),
      this.crashBackoffMaxMs
    )
    const respawn = () => {
      if (this.queue.length > 0 || this.workers.length < this.poolMin) {
        this.spawn()
      }
      this.dispatch()
    }
    // No backoff on the first crash (likely transient); back off a thrash loop.
    if (this.consecutiveCrashes <= 1) respawn()
    else setTimeout(respawn, backoff).unref()
  }

  /** Gracefully terminate a worn worker and drop it from the pool. */
  private retire(pw: PooledWorker) {
    // Drop from the pool BEFORE terminating, so the terminate's exit(1) is
    // ignored by `onExit` (worker no longer present) rather than counted.
    this.workers = this.workers.filter((w) => w !== pw)
    void pw.worker.terminate().catch(() => undefined)
    if (this.workers.length < this.poolMin) this.spawn()
  }

  private reapIdle() {
    const now = Date.now()
    const idleTtlMs = Number(process.env.CONVERTER_IDLE_TTL_MS ?? 60_000)
    for (const pw of [...this.workers]) {
      if (
        !pw.busy &&
        this.workers.length > this.poolMin &&
        now - pw.idleSince >= idleTtlMs
      ) {
        this.workers = this.workers.filter((w) => w !== pw)
        void pw.worker.terminate().catch(() => undefined)
      }
    }
  }

  private dispatch() {
    // Shed jobs that have already waited past the tolerable bound — rendering
    // for a client that has likely given up only prolongs the burst.
    const now = Date.now()
    while (this.queue.length > 0) {
      const head = this.queue[0]!
      if (now - head.enqueuedAt <= this.maxQueueWaitMs) break
      this.queue.shift()
      head.reject(new QueueFullError("Conversion queue wait exceeded"))
    }
    if (this.queue.length === 0) return

    let pw = this.workers.find((w) => !w.busy)
    if (!pw && this.workers.length < this.poolMax) pw = this.spawn()
    if (!pw) return // all busy and at cap — the rest wait in the bounded queue

    const job = this.queue.shift()!
    pw.busy = true
    const timeout = setTimeout(
      () => this.onExit(pw!, new Error("Conversion worker timed out")),
      RENDER_DEADLINE_MS[job.format]
    )
    pw.active = { id: job.id, timeout, job }
    pw.worker.postMessage({
      id: job.id,
      model: job.model,
      format: job.format,
      scale: job.scale,
    })
    // Keep filling idle workers while jobs remain queued.
    if (this.queue.length > 0) this.dispatch()
  }

  render = async (
    format: ConversionFormat,
    model: UMLModel,
    scale?: number
  ): Promise<ConversionOutput> => {
    if (this.queue.length >= this.maxQueueLength) {
      throw new QueueFullError("Conversion queue is full")
    }
    return await new Promise<ConversionOutput>((resolve, reject) => {
      this.queue.push({
        id: this.nextId++,
        format,
        model,
        enqueuedAt: Date.now(),
        resolve,
        reject,
        ...(scale !== undefined ? { scale } : {}),
      })
      this.dispatch()
    })
  }
}
