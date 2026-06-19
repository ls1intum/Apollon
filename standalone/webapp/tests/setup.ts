import { vi } from "vitest"

// `@ionic/react` pulls in `@ionic/core` whose Stencil runtime doesn't
// evaluate under jsdom. `isPlatform` is a leaf no-op in tests.
vi.mock("@ionic/react", () => ({ isPlatform: () => false }))
