/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import UsersList from '@/components/Users_List.vue'

const mockUsers = ref([
  { id: 1, firstName: 'John', lastName: 'Doe', patronymic: '', email: 'john@example.com', roles: ['administrator'] }
])

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: () => ({ users: mockUsers })
  }
})

const getAll = vi.fn()
vi.mock('@/stores/users.store.js', () => ({
  useUsersStore: () => ({
    users: mockUsers,
    getAll,
    delete: vi.fn()
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ alert: null, error: vi.fn(), clear: vi.fn() })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    users_per_page: 10,
    users_search: '',
    users_sort_by: ['id'],
    users_page: 1
  })
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => vi.fn()
}))

vi.mock('@/router', () => ({
  default: { push: vi.fn() }
}))

describe('Users_List.vue', () => {
  it('calls getAll on mount', () => {
    const wrapper = mount(UsersList, {
      global: {
        stubs: {
          'v-card': true,
          'v-data-table': true,
          'v-text-field': true,
          'font-awesome-icon': true,
          'router-link': true
        }
      }
    })
    expect(getAll).toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })
})
