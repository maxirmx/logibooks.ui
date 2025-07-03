/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import RegistersList from '@/components/Registers_List.vue'

const mockItems = ref([])
const getAll = vi.fn()

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { 
    ...actual, 
    storeToRefs: (store) => {
      if (store.getAll) {
        // registers store
        return { items: mockItems, loading: ref(false), error: ref(null), totalCount: ref(0) }
      } else {
        // auth store
        return { 
          registers_per_page: ref(10), 
          registers_search: ref(''), 
          registers_sort_by: ref([{ key: 'id', order: 'asc' }]), 
          registers_page: ref(1) 
        }
      }
    }
  }
})

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({ getAll, items: mockItems, loading: ref(false), error: ref(null), totalCount: ref(0) })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({ 
    registers_per_page: ref(10), 
    registers_search: ref(''), 
    registers_sort_by: ref([{ key: 'id', order: 'asc' }]), 
    registers_page: ref(1) 
  })
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [{ value: 10, title: '10' }]
}))

describe('Registers_List.vue', () => {
  it('calls getAll on mount', () => {
    mount(RegistersList, {
      global: { 
        stubs: { 
          'v-data-table-server': true, 
          'v-card': true,
          'v-text-field': true,
          'font-awesome-icon': true 
        } 
      }
    })
    expect(getAll).toHaveBeenCalled()
  })
})
