/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import RegistersList from '@/components/Registers_List.vue'

const mockItems = ref([])
const getAll = vi.fn()

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: () => ({ items: mockItems, loading: ref(false), error: ref(null), hasNextPage: ref(false) }) }
})

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({ getAll, items: mockItems, loading: ref(false), error: ref(null), hasNextPage: ref(false) })
}))

describe('Registers_List.vue', () => {
  it('calls getAll on mount', () => {
    mount(RegistersList, {
      global: { stubs: { 'v-data-table-server': true, 'font-awesome-icon': true } }
    })
    expect(getAll).toHaveBeenCalled()
  })
})
