/**
 * Dev-only worker bootstrap. `pnpm run dev` runs the server from TypeScript
 * source via tsx, so there is no compiled `conversion-worker-thread.js` to
 * spawn. tsx's worker loader transpiles a `.ts` entry but does NOT apply its
 * `.js`→`.ts` resolution to that entry's own imports, so a worker pointed
 * straight at the `.ts` fails to resolve its siblings (e.g. `./jsdom-shims.js`).
 *
 * `tsImport` runs the worker under tsx's programmatic ESM loader, which
 * resolves the full module graph. Production spawns the compiled `.js`
 * directly (see `ConversionResource.createWorker`) and never loads this file.
 */
import { tsImport } from "tsx/esm/api"

await tsImport("./conversion-worker-thread.ts", import.meta.url)
