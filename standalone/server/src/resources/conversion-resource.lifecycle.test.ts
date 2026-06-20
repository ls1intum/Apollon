/**
 * Worker-lifecycle unit tests. A real `Worker.terminate()` exits with a
 * non-zero code, so intentional shutdowns re-fire the `exit` listener; these
 * pin that this does not get accounted as a crash.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { EventEmitter } from "node:events"
import type { Worker } from "node:worker_threads"
import { ConversionResource } from "./conversion-resource.js"

// Module-level so it survives the base constructor's spawn (subclass field
// initializers only run after `super()`).
let fakes: FakeWorker[] = []

class FakeWorker extends EventEmitter {
  terminated = false
  postMessage() {}
  terminate() {
    this.terminated = true
    // A real worker exits with code 1 on terminate(), asynchronously.
    queueMicrotask(() => this.emit("exit", 1))
    return Promise.resolve(1)
  }
}

class TestPool extends ConversionResource {
  protected override createWorker(): Worker {
    const w = new FakeWorker()
    fakes.push(w)
    return w as unknown as Worker
  }
  get crashes(): number {
    return (this as unknown as { consecutiveCrashes: number })
      .consecutiveCrashes
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0))
const liveWorkers = () => fakes.filter((f) => !f.terminated).length

describe("ConversionResource worker lifecycle", () => {
  beforeEach(() => {
    fakes = []
    process.env.CONVERTER_POOL_MIN = "1"
    process.env.CONVERTER_POOL_MAX = "2"
  })
  afterEach(() => {
    delete process.env.CONVERTER_POOL_MIN
    delete process.env.CONVERTER_POOL_MAX
  })

  it("counts a real crash once and ignores the terminate's exit(1)", async () => {
    const pool = new TestPool()
    expect(fakes.length).toBe(1)

    // Real crash: rejected + the worker is replaced exactly once.
    fakes[0].emit("error", new Error("boom"))
    await tick()

    // The crash-cleanup terminate() re-fires exit(1) for the same (removed)
    // worker; the idempotent guard must drop it — one crash, one live worker.
    expect(pool.crashes).toBe(1)
    expect(liveWorkers()).toBe(1)
  })

  it("a stray exit(1) from an already-removed worker spawns nothing", async () => {
    const pool = new TestPool()
    const original = fakes[0]
    original.emit("error", new Error("boom"))
    await tick()
    const spawnedSoFar = fakes.length

    // The already-removed worker fires a late exit again — must be a no-op.
    original.emit("exit", 1)
    await tick()
    expect(fakes.length).toBe(spawnedSoFar)
    expect(liveWorkers()).toBe(1)
    expect(pool.crashes).toBe(1)
  })
})
