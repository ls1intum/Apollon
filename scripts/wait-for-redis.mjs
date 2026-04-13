import net from "node:net"

const DEFAULT_HOST = "127.0.0.1"
const DEFAULT_PORT = 6379
const DEFAULT_TIMEOUT_MS = 30_000
const RETRY_DELAY_MS = 500

function getRedisEndpoint() {
  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    return {
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      label: `${DEFAULT_HOST}:${DEFAULT_PORT}`,
    }
  }

  const url = new URL(redisUrl)
  const host = url.hostname || DEFAULT_HOST
  const port = Number(url.port || DEFAULT_PORT)

  return {
    host,
    port,
    label: `${host}:${port}`,
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function pingRedis(host, port) {
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

    socket.once("connect", () => {
      socket.write("*1\r\n$4\r\nPING\r\n")
    })
    socket.on("data", (chunk) => {
      response += chunk.toString("utf8")

      if (response.includes("+PONG")) {
        finish(true)
      }
    })
    socket.once("error", () => finish(false))
    socket.setTimeout(RETRY_DELAY_MS, () => finish(false))
    socket.once("close", () => finish(false))
  })
}

async function main() {
  const { host, port, label } = getRedisEndpoint()
  const start = Date.now()

  console.log(`Waiting for Redis on ${label}...`)

  while (Date.now() - start < DEFAULT_TIMEOUT_MS) {
    if (await pingRedis(host, port)) {
      console.log(`Redis is ready on ${label}.`)
      return
    }

    await delay(RETRY_DELAY_MS)
  }

  console.error(
    `Timed out after ${DEFAULT_TIMEOUT_MS}ms waiting for Redis on ${label}.`
  )
  process.exit(1)
}

main().catch((error) => {
  console.error("Failed while waiting for Redis:", error)
  process.exit(1)
})
