import { flushPromises } from '@vue/test-utils'

/**
 * Helper function to resolve all pending promises in tests
 * This is particularly useful for components with nested async operations
 * or when testing components wrapped in Suspense
 * 
 * @returns {Promise<void>} A promise that resolves when all promises are flushed
 */
export async function resolveAll() {
  // Call flushPromises multiple times to ensure all promises are resolved
  // This is especially important for components with nested async operations
  await flushPromises()
  await flushPromises()
}

/**
 * Alternative to resolveAll using Vue's nextTick
 * Can be used in simpler scenarios where a single tick is sufficient
 * 
 * @returns {Promise<void>} A promise that resolves after the next tick
 */
export async function waitForNextTick() {
  // Import nextTick dynamically to avoid circular dependencies
  const { nextTick } = await import('vue')
  await nextTick()
}
