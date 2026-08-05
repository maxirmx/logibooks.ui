import { describe, it, expect, vi } from 'vitest'

const libraryAdd = vi.hoisted(() => vi.fn())
const mount = vi.hoisted(() => vi.fn())
const alertError = vi.hoisted(() => vi.fn())

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

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    createPinia: vi.fn(() => ({ use: vi.fn() }))
  }
})

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

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: vi.fn(() => ({ error: alertError }))
}))

describe('init.app', () => {
  it('registers all explicitly used account icons with the app icon set', async () => {
    await import('@/init.app.js')

    expect(libraryAdd).toHaveBeenCalledTimes(1)
    const registeredIconNames = libraryAdd.mock.calls[0].map((icon) => icon?.iconName)
    expect(registeredIconNames).toEqual(expect.arrayContaining(['passport', 'user', 'robot']))
  })

  it('installs generic reporters for Vue and unhandled promise errors', async () => {
    const { installGlobalErrorHandlers } = await import('@/init.app.js')
    const app = { config: {} }
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    installGlobalErrorHandlers(app)
    app.config.errorHandler(new Error('private component details'), null, 'render')

    const rejectionHandler = addEventListener.mock.calls.find(
      ([eventName]) => eventName === 'unhandledrejection'
    )?.[1]
    rejectionHandler({ reason: new Error('private promise details') })

    expect(alertError).toHaveBeenCalledTimes(2)
    expect(alertError).toHaveBeenNthCalledWith(
      1,
      'Произошла непредвиденная ошибка. Обновите страницу и повторите попытку.'
    )
    expect(alertError).toHaveBeenNthCalledWith(
      2,
      'Произошла непредвиденная ошибка. Обновите страницу и повторите попытку.'
    )
    expect(consoleError).toHaveBeenCalledTimes(2)

    addEventListener.mockRestore()
    consoleError.mockRestore()
  })
})
