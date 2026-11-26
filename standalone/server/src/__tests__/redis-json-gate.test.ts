import { describe, it, expect, vi } from "vitest"
import {
  bootLoadFunction,
  resolveJsonModule,
  COMMIT_VERSION_SOURCE,
  MIN_REJSON_MODULE_VERSION,
  MIN_VALKEY_JSON_MODULE_VERSION,
  type Redis,
} from "../redis.js"

// `MODULE LIST` replies as the node-redis RESP2 client returns them: one flat
// `[name, <name>, ver, <int>, path, <path>, args, []]` array per module. The
// fixtures below are the real replies recorded from
// redis/redis-stack-server:7.4.0-v8 and valkey/valkey-bundle:9.2.0-alpine.
const mod = (name: string, ver: number | string) => [
  "name",
  name,
  "ver",
  ver,
  "path",
  `/lib/${name}.so`,
  "args",
  [],
]

const REDIS_STACK_7_4_0_V8 = [
  mod("RedisCompat", 1),
  mod("redisgears_2", 20020),
  mod("bf", 20816),
  mod("search", 21020),
  mod("timeseries", 11206),
  mod("ReJSON", 20809),
]

const VALKEY_BUNDLE_9_2_0 = [
  mod("json", 10100),
  mod("search", 66304),
  mod("bf", 10001),
  mod("ldap", 16843263),
  mod("lua", 1),
]

describe("resolveJsonModule", () => {
  it("accepts the ReJSON module shipped with Redis Stack 7.4.0-v8", () => {
    expect(resolveJsonModule(REDIS_STACK_7_4_0_V8)).toEqual({
      flavor: "redisjson",
      name: "ReJSON",
      version: 20809,
    })
  })

  it("accepts the json module shipped with valkey-bundle 9.2.0", () => {
    expect(resolveJsonModule(VALKEY_BUNDLE_9_2_0)).toEqual({
      flavor: "valkey-json",
      name: "json",
      version: 10100,
    })
  })

  it("accepts the minimum supported version of each module", () => {
    expect(
      resolveJsonModule([mod("ReJSON", MIN_REJSON_MODULE_VERSION)]).flavor
    ).toBe("redisjson")
    expect(
      resolveJsonModule([mod("json", MIN_VALKEY_JSON_MODULE_VERSION)]).flavor
    ).toBe("valkey-json")
  })

  it("accepts a numeric-string version", () => {
    expect(resolveJsonModule([mod("json", "10100")]).version).toBe(10100)
  })

  it("rejects ReJSON older than 2.0", () => {
    expect(() => resolveJsonModule([mod("ReJSON", 10099)])).toThrow(
      /ReJSON module 1\.0\.99 is too old; need >= 2\.0\.0/
    )
  })

  it("rejects a Valkey json module older than 1.0.3", () => {
    expect(() => resolveJsonModule([mod("json", 10002)])).toThrow(
      /json module 1\.0\.2 is too old; need >= 1\.0\.3/
    )
    expect(() => resolveJsonModule([mod("json", 9999)])).toThrow(
      /json module 0\.99\.99 is too old; need >= 1\.0\.3/
    )
  })

  it("rejects a JSON module whose version cannot be read", () => {
    expect(() => resolveJsonModule([mod("json", "abc")])).toThrow(
      /Could not read the version of the json module/
    )
    expect(() => resolveJsonModule([mod("ReJSON", -1)])).toThrow(
      /Could not read the version of the ReJSON module/
    )
  })

  it("rejects a server without any JSON module", () => {
    expect(() =>
      resolveJsonModule([mod("search", 21020), mod("bf", 20816)])
    ).toThrow(/No JSON module loaded/)
    expect(() => resolveJsonModule([])).toThrow(/No JSON module loaded/)
  })

  it("matches module names exactly and case-sensitively", () => {
    for (const name of [
      "rejson",
      "JSON",
      "Json",
      "ReJSON2",
      "jsonx",
      "json2",
    ]) {
      expect(() => resolveJsonModule([mod(name, 99999)])).toThrow(
        /No JSON module loaded/
      )
    }
  })

  it("does not mistake a module path or argument for the module name", () => {
    const decoy = [
      "name",
      "search",
      "ver",
      1,
      "path",
      "json",
      "args",
      ["name", "json"],
    ]
    expect(() => resolveJsonModule([decoy])).toThrow(/No JSON module loaded/)
  })

  it("prefers ReJSON when both are listed", () => {
    expect(
      resolveJsonModule([mod("json", 10100), mod("ReJSON", 20809)]).flavor
    ).toBe("redisjson")
  })

  it("rejects an unexpected reply shape", () => {
    expect(() => resolveJsonModule(null)).toThrow(
      "Unexpected MODULE LIST response shape"
    )
    expect(() => resolveJsonModule(new Map())).toThrow(
      "Unexpected MODULE LIST response shape"
    )
  })

  it("ignores malformed entries", () => {
    expect(
      resolveJsonModule(["junk", 42, null, mod("json", 10100)]).flavor
    ).toBe("valkey-json")
  })
})

describe("bootLoadFunction gate", () => {
  const fakeClient = (modules: unknown) => {
    const sendCommand = vi.fn(async (args: string[]) => {
      if (args[0] === "MODULE") return modules
      return "apollon"
    })
    return { client: { sendCommand } as unknown as Redis, sendCommand }
  }

  it.each([
    ["Redis Stack", REDIS_STACK_7_4_0_V8],
    ["Valkey bundle", VALKEY_BUNDLE_9_2_0],
  ])("loads the function library on %s", async (_label, modules) => {
    const { client, sendCommand } = fakeClient(modules)
    await bootLoadFunction(client)
    expect(sendCommand).toHaveBeenCalledWith(["MODULE", "LIST"])
    expect(sendCommand).toHaveBeenCalledWith([
      "FUNCTION",
      "LOAD",
      "REPLACE",
      COMMIT_VERSION_SOURCE,
    ])
  })

  it("fails closed without loading the library when no JSON module exists", async () => {
    const { client, sendCommand } = fakeClient([mod("search", 66304)])
    await expect(bootLoadFunction(client)).rejects.toThrow(
      /No JSON module loaded/
    )
    expect(sendCommand).not.toHaveBeenCalledWith(
      expect.arrayContaining(["FUNCTION"])
    )
  })
})
