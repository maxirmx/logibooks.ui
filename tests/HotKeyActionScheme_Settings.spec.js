/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import HotKeyActionSchemeSettings from '@/dialogs/HotKeyActionScheme_Settings.vue'
import { defaultGlobalStubs, resolveAll } from './helpers/test-utils.js'

const schemeRef = ref({ id: 1, name: 'Default' })
const getByIdMock = vi.hoisted(() => vi.fn())
const createMock = vi.hoisted(() => vi.fn())
const updateMock = vi.hoisted(() => vi.fn())
const pushMock = vi.hoisted(() => vi.fn())

let storeMock

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => ({ hotKeyActionScheme: store.hotKeyActionScheme })
  }
})

vi.mock('@/stores/hotkey.action.schemes.store.js', () => ({
  useHotKeyActionSchemesStore: () => storeMock
}))

vi.mock('@/router', () => ({ default: { push: pushMock } }), { virtual: true })

const AsyncWrapper = {
  components: { HotKeyActionSchemeSettings },
  props: ['mode', 'hotKeyActionSchemeId'],
  template: '<Suspense><HotKeyActionSchemeSettings :mode="mode" :hot-key-action-scheme-id="hotKeyActionSchemeId" /></Suspense>'
}

describe('HotKeyActionScheme_Settings.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeMock = {
      hotKeyActionScheme: schemeRef,
      getById: getByIdMock,
      create: createMock.mockResolvedValue({ id: 2, name: 'New' }),
      update: updateMock.mockResolvedValue(true)
    }
  })

  it('loads item in edit mode', async () => {
    mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    expect(getByIdMock).toHaveBeenCalledWith(1)
  })

  it('submits create and edit', async () => {
    const createWrapper = mount(AsyncWrapper, { props: { mode: 'create' }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    await createWrapper.findComponent({ name: 'Form' }).vm.$emit('submit', { name: 'Ops' }, { setErrors: vi.fn() })

    const editWrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    await editWrapper.findComponent({ name: 'Form' }).vm.$emit('submit', { name: 'Ops v2' }, { setErrors: vi.fn() })

    expect(createMock).toHaveBeenCalledWith({ name: 'Ops' })
    expect(updateMock).toHaveBeenCalledWith(1, { name: 'Ops v2' })
    expect(pushMock).toHaveBeenCalledWith('/hotkeyactionschemes')
  })

  it('sets api error for create conflict', async () => {
    const setErrors = vi.fn()
    createMock.mockRejectedValueOnce(new Error('409 Conflict'))

    const wrapper = mount(AsyncWrapper, { props: { mode: 'create' }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    await wrapper.findComponent({ name: 'Form' }).vm.$emit('submit', { name: 'Ops' }, { setErrors })
    await resolveAll()

    expect(setErrors).toHaveBeenCalledWith({ apiError: 'Схема действий горячих клавиш с таким названием уже существует' })
  })

  it('sets api error for edit failures', async () => {
    const setErrors = vi.fn()
    updateMock.mockRejectedValueOnce(new Error('Save failed'))

    const wrapper = mount(AsyncWrapper, { props: { mode: 'edit', hotKeyActionSchemeId: 1 }, global: { stubs: defaultGlobalStubs } })
    await resolveAll()
    await wrapper.findComponent({ name: 'Form' }).vm.$emit('submit', { name: 'Ops' }, { setErrors })
    await resolveAll()

    expect(setErrors).toHaveBeenCalledWith({ apiError: 'Save failed' })
  })
})
