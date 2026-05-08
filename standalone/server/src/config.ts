import { z } from "zod"

const intEnv = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback)

const ConfigSchema = z.object({
  HOST: z.string().default("localhost"),
  PORT: intEnv(8000),
  WS_PORT: intEnv(4444),
  CORS_ORIGIN: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  OWNER_SECRET: z.string().min(16).default("development-only-replace-in-prod"),
  MAX_VERSIONS_PER_DIAGRAM: intEnv(50),
  MAX_SNAPSHOT_BYTES: intEnv(5 * 1024 * 1024),
  MAX_DESCRIPTION_LENGTH: intEnv(240),
  MAX_NAME_LENGTH: intEnv(80),
  /** TTL for the diagram HEAD, in seconds. 120 days. */
  DIAGRAM_TTL_SECONDS: intEnv(120 * 24 * 3600),
  /** TTL for version body+meta keys, in seconds. HEAD + 1 day margin. */
  VERSION_TTL_SECONDS: intEnv(121 * 24 * 3600),
  /**
   * Wall-clock interval for auto-versioning. The HEAD PUT path attempts to
   * acquire a per-diagram NX-EX marker keyed `:auto-version-marker`; on
   * success and only if the diagram is structurally different from its
   * latest snapshot, an empty-name `kind: "auto"` row is committed.
   *
   * Default 1800 = 30 min, mirroring Figma's checkpoint cadence.
   */
  AUTO_VERSION_INTERVAL_SECONDS: intEnv(30 * 60),
})

export type Config = z.infer<typeof ConfigSchema>

const DEFAULT_OWNER_SECRET = "development-only-replace-in-prod"
// Prefix-match catches typo'd / case-shifted variants so a copy-pasted
// `.env.example` can't slip past the production guard.
const DEFAULT_OWNER_SECRET_PREFIX = "development-only-replace"

export function isDefaultOwnerSecret(secret: string): boolean {
  return (
    secret === DEFAULT_OWNER_SECRET ||
    secret.toLowerCase().startsWith(DEFAULT_OWNER_SECRET_PREFIX)
  )
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = ConfigSchema.safeParse(env)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ")
    throw new Error(`Invalid environment configuration: ${issues}`)
  }
  // Fail-closed: a default HMAC key in production lets anyone mint
  // owner cookies for any diagram.
  if (
    env.NODE_ENV === "production" &&
    isDefaultOwnerSecret(result.data.OWNER_SECRET)
  ) {
    throw new Error(
      "OWNER_SECRET is set to the development default. " +
        "Set OWNER_SECRET to a unique, high-entropy value (≥32 chars) before booting in production."
    )
  }
  return result.data
}
