/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import UserSettings from '@/components/User_Settings.vue'

vi.mock('@/router', () => ({
  default: { push: vi.fn() }
}))

const getById = vi.fn()
vi.mock('@/stores/users.store.js', () => ({
  useUsersStore: () => ({
    user: ref({}),
    getById,
    add: vi.fn(),
    update: vi.fn()
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    isAdmin: true,
    user: { id: 1 }
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ alert: null, success: vi.fn(), error: vi.fn(), clear: vi.fn() })
}))

describe('User_Settings.vue', () => {
  it('does not fetch user when registering', async () => {
    const wrapper = mount({
      template: `
        <Suspense>
          <UserSettings register />
        </Suspense>
      `,
      components: { UserSettings }
    }, {
      global: {
        stubs: {
          Form: true,
          Field: true,
          'font-awesome-icon': true,
          Suspense: true
        }
      },
      props: { register: true }
    })
    await flushPromises()
    expect(getById).not.toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })
})
