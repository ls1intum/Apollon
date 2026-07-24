import { QueryClient } from "@tanstack/react-query"

/**
 * Shared QueryClient for Storybook. Module-level (not per-decorator) so a
 * story's `beforeEach` can reset it BEFORE the story renders; `retry: false`
 * keeps play-test failures immediate.
 */
export const storybookQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
})
