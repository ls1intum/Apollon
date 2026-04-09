import { spawn } from "node:child_process"
import net from "node:net"
import process from "node:process"
import readline from "node:readline"

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"

const DEFAULT_PORTS = {
  webapp: 5173,
  server: 8000,
  websocket: 4444,
  redis: 6379,
}

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

function prefixStream(stream, prefix) {
  const reader = readline.createInterface({ input: stream })
  reader.on("line", (line) => {
    console.log(`[${prefix}] ${line}`)
  })
}

function startProcess(name, args, env) {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    env,
    stdio: ["inherit", "pipe", "pipe"],
  })

  prefixStream(child.stdout, name)
  prefixStream(child.stderr, name)

  child.once("error", (error) => {
    console.error(`[${name}] Failed to start:`, error)
  })

  return child
}

async function main() {
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

  const children = [
    startProcess(
      "lib",
      ["run", "build:watch", "--workspace=@tumaet/apollon"],
      sharedEnv
    ),
    startProcess(
      "server",
      ["run", "dev", "--workspace=@tumaet/server"],
      {
        ...sharedEnv,
        HOST: "127.0.0.1",
        PORT: String(serverPort),
        WS_PORT: String(websocketPort),
        REDIS_URL: redis.url,
      }
    ),
    startProcess(
      "webapp",
      ["run", "start", "--workspace=@tumaet/webapp"],
      sharedEnv
    ),
  ]

  let shuttingDown = false

  const stopChildren = (signal = "SIGTERM") => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    for (const child of children) {
      if (!child.killed) {
        child.kill(signal)
      }
    }
  }

  process.on("SIGINT", () => {
    stopChildren("SIGINT")
  })
  process.on("SIGTERM", () => {
    stopChildren("SIGTERM")
  })

  children.forEach((child) => {
    child.once("close", (code, signal) => {
      if (!shuttingDown) {
        const reason =
          signal !== null
            ? `signal ${signal}`
            : `exit code ${code === null ? "unknown" : code}`
        console.error(`[dev] Stopping development stack because a process exited with ${reason}.`)
        stopChildren()
        process.exitCode = code ?? 1
      }
    })
  })
}

main().catch((error) => {
  console.error("[dev] Failed to start development stack:", error)
  process.exit(1)
})
