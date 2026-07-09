import { describe, it, expect, vi } from 'vitest'

const libraryAdd = vi.hoisted(() => vi.fn())
const mount = vi.hoisted(() => vi.fn())

vi.mock('@fortawesome/fontawesome-svg-core', () => ({
  library: { add: libraryAdd }
}))

vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: { name: 'FontAwesomeIcon' }
}))

vi.mock('vue', () => ({
  createApp: vi.fn(() => ({
    component: vi.fn().mockReturnThis(),
    use: vi.fn().mockReturnThis(),
    mount
  }))
}))

vi.mock('pinia', () => ({
  createPinia: vi.fn(() => ({ use: vi.fn() }))
}))

vi.mock('pinia-plugin-persistedstate', () => ({
  default: vi.fn()
}))

vi.mock('vuetify/styles', () => ({}))

vi.mock('vuetify', () => ({
  createVuetify: vi.fn(() => ({}))
}))

vi.mock('vuetify-use-dialog', () => ({
  default: { install: vi.fn() }
}))

vi.mock('vuetify/iconsets/mdi-svg', () => ({
  aliases: {},
  mdi: {}
}))

vi.mock('vuetify/locale', () => ({
  ru: {
    input: {},
    dataIterator: {},
    pagination: { ariaLabel: {} },
    dataFooter: {}
  }
}))

vi.mock('@/App.vue', () => ({
  default: { template: '<div />' }
}))

vi.mock('@/router', () => ({
  default: {}
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: vi.fn(() => ({}))
}))

describe('init.app', () => {
  it('registers the passport Font Awesome icon with the app icon set', async () => {
    await import('@/init.app.js')

    expect(libraryAdd).toHaveBeenCalledTimes(1)
    expect(libraryAdd.mock.calls[0].some((icon) => icon?.iconName === 'passport')).toBe(true)
  })
})
