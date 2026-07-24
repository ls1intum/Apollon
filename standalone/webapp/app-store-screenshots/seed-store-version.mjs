// The zustand-persist version the app writes for `persistenceModelStore`. MUST
// match PERSISTENCE_STORE_VERSION in src/stores/usePersistenceModelStore.tsx: a
// mismatch makes the store discard or migrate the seeded diagrams on load, so
// the screenshot run would capture an empty app with no error. Both seeders
// (Playwright preview + native XCUITest) import this one value.
export const PERSISTENCE_STORE_VERSION = 3
