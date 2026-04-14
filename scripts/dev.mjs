import { spawn } from "node:child_process"
import fs from "node:fs"
import net from "node:net"
import path from "node:path"
import process from "node:process"

const DEFAULT_PORTS = {
  webapp: 5173,
  server: 8000,
  websocket: 4444,
  redis: 6379,
}

const repoRoot = process.cwd()
const SHUTDOWN_GRACE_MS = 4_000
const PREFIX_COLORS = {
  lib: "\u001B[33m",
  server: "\u001B[34m",
  webapp: "\u001B[35m",
}
const PREFIX_RESET = "\u001B[39m"

function readPort(name, fallback) {
  const rawValue = process.env[name]

  if (!rawValue) {
    return fallback
  }

  const value = Number(rawValue)

  if (!Number.isInteger(value) || value <= 0 || value > 65535) {
    throw new Error(`Invalid port in ${name}: ${rawValue}`)
  }

  return value
}

function getPreferredPorts() {
  return {
    webapp: readPort("APOLLON_WEBAPP_PORT", DEFAULT_PORTS.webapp),
    server: readPort("APOLLON_SERVER_PORT", DEFAULT_PORTS.server),
    websocket: readPort("APOLLON_WS_PORT", DEFAULT_PORTS.websocket),
    redis: readPort("APOLLON_REDIS_PORT", DEFAULT_PORTS.redis),
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function canConnect(host, port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })

    const finish = (connected) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(connected)
    }

    socket.once("connect", () => finish(true))
    socket.once("error", () => finish(false))
    socket.setTimeout(timeoutMs, () => finish(false))
  })
}

function pingRedis(host, port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })
    let settled = false
    let response = ""

    const finish = (ready) => {
      if (settled) {
        return
      }

      settled = true
      socket.removeAllListeners()
      socket.destroy()
      resolve(ready)
    }

    socket.setTimeout(timeoutMs, () => finish(false))
    socket.once("error", () => finish(false))
    socket.once("connect", () => {
      socket.write("*1\r\n$4\r\nPING\r\n")
    })
    socket.on("data", (chunk) => {
      response += chunk.toString("utf8")

      if (response.includes("+PONG")) {
        finish(true)
      }
    })
    socket.once("close", () => finish(false))
  })
}

async function findAvailablePort(startPort, host = "127.0.0.1", reserved = new Set()) {
  let port = startPort

  while (true) {
    if (!reserved.has(port) && !(await canConnect(host, port))) {
      return port
    }

    port += 1
  }
}

function parseRedisUrl(redisUrl) {
  const url = new URL(redisUrl)

  if (url.protocol !== "redis:") {
    throw new Error(`Unsupported REDIS_URL protocol: ${url.protocol}`)
  }

  return {
    host: url.hostname || "127.0.0.1",
    port: Number(url.port || DEFAULT_PORTS.redis),
    url: `redis://${url.hostname || "127.0.0.1"}:${Number(url.port || DEFAULT_PORTS.redis)}`,
  }
}

function commandBinary(relativeDirectory, binaryName) {
  const binary = process.platform === "win32" ? `${binaryName}.cmd` : binaryName
  const hoisted = path.join(repoRoot, "node_modules", ".bin", binary)
  if (fs.existsSync(hoisted)) {
    return hoisted
  }

  return path.join(repoRoot, relativeDirectory, "node_modules", ".bin", binary)
}

function colorPrefix(name) {
  const color = PREFIX_COLORS[name] || ""
  return `${color}[${name}]${PREFIX_RESET}`
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8")
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8")
    })
    child.once("error", reject)
    child.once("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }

      const error = new Error(
        `${command} ${args.join(" ")} exited with code ${code}\n${stderr || stdout}`
      )
      reject(error)
    })
  })
}

async function getComposeRedisPort() {
  try {
    const { stdout } = await runCommand("docker", [
      "compose",
      "-f",
      "docker/compose.local.db.yml",
      "port",
      "db",
      "6379",
    ])

    const match = stdout.trim().match(/:(\d+)\s*$/)
    if (!match) {
      return null
    }

    return Number(match[1])
  } catch {
    return null
  }
}

async function waitForRedis(host, port, timeoutMs = 30_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await pingRedis(host, port)) {
      return
    }

    await delay(500)
  }

  throw new Error(`Timed out waiting for Redis on ${host}:${port}`)
}

async function resolveRedisEndpoint(preferredRedisPort, reservedPorts) {
  if (process.env.REDIS_URL) {
    const endpoint = parseRedisUrl(process.env.REDIS_URL)
    await waitForRedis(endpoint.host, endpoint.port)
    return {
      ...endpoint,
      source: "configured REDIS_URL",
    }
  }

  const composeRedisPort = await getComposeRedisPort()
  if (composeRedisPort && (await pingRedis("127.0.0.1", composeRedisPort))) {
    return {
      host: "127.0.0.1",
      port: composeRedisPort,
      url: `redis://127.0.0.1:${composeRedisPort}`,
      source: "existing Docker Redis",
    }
  }

  if (await pingRedis("127.0.0.1", preferredRedisPort)) {
    return {
      host: "127.0.0.1",
      port: preferredRedisPort,
      url: `redis://127.0.0.1:${preferredRedisPort}`,
      source: "existing local Redis",
    }
  }

  const redisPort = await findAvailablePort(
    preferredRedisPort,
    "127.0.0.1",
    reservedPorts
  )

  console.log(`[dev] Starting Redis via Docker on 127.0.0.1:${redisPort}`)

  await runCommand(
    "docker",
    ["compose", "-f", "docker/compose.local.db.yml", "up", "-d"],
    {
      env: {
        ...process.env,
        REDIS_PORT: String(redisPort),
      },
    }
  )

  await waitForRedis("127.0.0.1", redisPort)

  return {
    host: "127.0.0.1",
    port: redisPort,
    url: `redis://127.0.0.1:${redisPort}`,
    source: "Docker Redis",
  }
}

function prefixOutput(name, stream) {
  let buffer = ""

  stream.setEncoding("utf8")
  stream.on("data", (chunk) => {
    buffer += chunk

    while (true) {
      const newlineIndex = buffer.search(/\r?\n/)
      if (newlineIndex === -1) {
        break
      }

      const newlineLength = buffer[newlineIndex] === "\r" && buffer[newlineIndex + 1] === "\n"
        ? 2
        : 1
      const line = buffer.slice(0, newlineIndex)

      console.log(`${colorPrefix(name)} ${line}`)
      buffer = buffer.slice(newlineIndex + newlineLength)
    }
  })

  stream.on("end", () => {
    if (buffer.length > 0) {
      console.log(`${colorPrefix(name)} ${buffer}`)
      buffer = ""
    }
  })
}

function quoteWindowsCmdArgument(value) {
  const stringValue = String(value)
  if (stringValue.length === 0) {
    return "\"\""
  }

  if (!/[ \t"&()<>^|]/.test(stringValue)) {
    return stringValue
  }

  return `"${stringValue.replace(/"/g, "\"\"")}"`
}

function resolveManagedSpawnCommand(command, args) {
  if (process.platform !== "win32" || !/\.(cmd|bat)$/i.test(command)) {
    return { command, args }
  }

  const comspec = process.env.ComSpec || process.env.COMSPEC || "cmd.exe"
  const commandLine = [quoteWindowsCmdArgument(command), ...args.map(quoteWindowsCmdArgument)].join(" ")

  return {
    command: comspec,
    args: ["/d", "/s", "/c", commandLine],
  }
}

function spawnManagedProcess({ name, command, args, cwd, env }) {
  const spawnCommand = resolveManagedSpawnCommand(command, args)
  const child = spawn(spawnCommand.command, spawnCommand.args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  })

  prefixOutput(name, child.stdout)
  prefixOutput(name, child.stderr)

  child.on("error", (error) => {
    console.error(`${colorPrefix(name)} Failed to start:`, error)
  })

  return child
}

async function killProcessTree(child, signal) {
  if (!child.pid || child.killed) {
    return
  }

  if (process.platform === "win32") {
    const taskkillArgs = ["/pid", String(child.pid), "/t"]
    if (signal === "SIGKILL") {
      taskkillArgs.push("/f")
    }

    try {
      await runCommand("taskkill", taskkillArgs)
    } catch {
      // Ignore errors for already-exited processes.
    }
    return
  }

  try {
    process.kill(-child.pid, signal)
  } catch {
    try {
      child.kill(signal)
    } catch {
      // Ignore errors for already-exited processes.
    }
  }
}

function waitForClose(child, timeoutMs) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve(true)
      return
    }

    const timeout = setTimeout(() => {
      cleanup()
      resolve(false)
    }, timeoutMs)

    const onClose = () => {
      cleanup()
      resolve(true)
    }

    const cleanup = () => {
      clearTimeout(timeout)
      child.off("close", onClose)
    }

    child.once("close", onClose)
  })
}

async function stopManagedProcesses(children) {
  await Promise.all(children.map((child) => killProcessTree(child, "SIGTERM")))

  const results = await Promise.all(
    children.map((child) => waitForClose(child, SHUTDOWN_GRACE_MS))
  )

  const stubbornChildren = children.filter((_, index) => !results[index])
  if (stubbornChildren.length === 0) {
    return
  }

  await Promise.all(
    stubbornChildren.map((child) => killProcessTree(child, "SIGKILL"))
  )
  await Promise.all(stubbornChildren.map((child) => waitForClose(child, 1_000)))
}

async function main() {
  delete process.env.NO_COLOR

  const preferredPorts = getPreferredPorts()
  const reservedPorts = new Set()
  const serverPort = await findAvailablePort(
    preferredPorts.server,
    "127.0.0.1",
    reservedPorts
  )
  reservedPorts.add(serverPort)

  const websocketPort = await findAvailablePort(
    preferredPorts.websocket,
    "127.0.0.1",
    reservedPorts
  )
  reservedPorts.add(websocketPort)

  const webappPort = await findAvailablePort(
    preferredPorts.webapp,
    "127.0.0.1",
    reservedPorts
  )
  reservedPorts.add(webappPort)

  const redis = await resolveRedisEndpoint(preferredPorts.redis, reservedPorts)

  console.log("[dev] Selected development ports:")
  console.log(`[dev]   webapp:    http://localhost:${webappPort}`)
  console.log(`[dev]   server:    http://127.0.0.1:${serverPort}`)
  console.log(`[dev]   websocket: ws://127.0.0.1:${websocketPort}`)
  console.log(`[dev]   redis:     ${redis.url} (${redis.source})`)

  const sharedEnv = {
    ...process.env,
    APOLLON_WEBAPP_PORT: String(webappPort),
    APOLLON_SERVER_PORT: String(serverPort),
    APOLLON_WS_PORT: String(websocketPort),
  }

  const coloredEnv = {
    ...sharedEnv,
    FORCE_COLOR: sharedEnv.FORCE_COLOR || "1",
  }
  delete coloredEnv.NO_COLOR

  const children = [
    spawnManagedProcess({
      name: "lib",
      command: commandBinary("library", "tsc"),
      args: ["-b", "--watch"],
      cwd: path.join(repoRoot, "library"),
      env: coloredEnv,
    }),
    spawnManagedProcess({
      name: "lib",
      command: commandBinary("library", "vite"),
      args: ["build", "--watch"],
      cwd: path.join(repoRoot, "library"),
      env: coloredEnv,
    }),
    spawnManagedProcess({
      name: "server",
      command: commandBinary("standalone/server", "tsx"),
      args: ["watch", "--clear-screen=false", "src/server.ts"],
      cwd: path.join(repoRoot, "standalone/server"),
      env: {
        ...coloredEnv,
        HOST: "127.0.0.1",
        PORT: String(serverPort),
        WS_PORT: String(websocketPort),
        REDIS_URL: redis.url,
      },
    }),
    spawnManagedProcess({
      name: "webapp",
      command: commandBinary("standalone/webapp", "vite"),
      args: [],
      cwd: path.join(repoRoot, "standalone/webapp"),
      env: coloredEnv,
    }),
  ]

  let shuttingDown = false
  let resolved = false

  const done = new Promise((resolve) => {
    const finish = (exitCode) => {
      if (resolved) {
        return
      }

      resolved = true
      resolve(exitCode)
    }

    const shutdown = async (exitCode) => {
      if (shuttingDown) {
        finish(exitCode)
        return
      }

      shuttingDown = true
      await stopManagedProcesses(children)
      finish(exitCode)
    }

    process.once("SIGINT", () => {
      shutdown(0).catch((error) => {
        console.error("[dev] Failed to stop cleanly after SIGINT:", error)
        finish(1)
      })
    })
    process.once("SIGTERM", () => {
      shutdown(0).catch((error) => {
        console.error("[dev] Failed to stop cleanly after SIGTERM:", error)
        finish(1)
      })
    })

    children.forEach((child) => {
      child.once("close", (code, signal) => {
        if (shuttingDown) {
          return
        }

        const reason =
          signal !== null
            ? `signal ${signal}`
            : `exit code ${code === null ? "unknown" : code}`
        console.error(
          `[dev] Stopping development stack because a process exited with ${reason}.`
        )

        shutdown(code === 0 ? 1 : code ?? 1).catch((error) => {
          console.error("[dev] Failed to stop cleanly after child exit:", error)
          finish(1)
        })
      })
    })
  })

  process.exitCode = await done
}

main().catch((error) => {
  console.error("[dev] Failed to start development stack:", error)
  process.exit(1)
})
