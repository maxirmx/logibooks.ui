/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import HotKeyActionSchemesList from '@/lists/HotKeyActionSchemes_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const schemesRef = ref([])
const loadingRef = ref(false)
const alertRef = ref(null)
const getAllMock = vi.hoisted(() => vi.fn())
const removeMock = vi.hoisted(() => vi.fn())
const errorMock = vi.hoisted(() => vi.fn())
const clearMock = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const pushMock = vi.hoisted(() => vi.fn())

let storeMock
let authStoreMock
let alertStoreMock

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => Object.fromEntries(Object.entries(store).filter(([, v]) => v && typeof v === 'object' && 'value' in v))
  }
})

vi.mock('@/stores/hotkey.action.schemes.store.js', () => ({
  useHotKeyActionSchemesStore: () => storeMock
}))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => authStoreMock }))
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => alertStoreMock }))
vi.mock('vuetify-use-dialog', () => ({ useConfirm: () => confirmMock }))
vi.mock('@/router', () => ({ default: { push: pushMock } }), { virtual: true })
vi.mock('@/helpers/items.per.page.js', () => ({ itemsPerPageOptions: [10, 25] }))
vi.mock('@mdi/js', () => ({ mdiMagnify: 'mdi-magnify' }))

describe('HotKeyActionSchemes_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    schemesRef.value = [{ id: 1, name: 'Default' }]
    storeMock = { hotKeyActionSchemes: schemesRef, loading: loadingRef, getAll: getAllMock, remove: removeMock }
    authStoreMock = {
      isSrLogistPlus: true,
      hotkeyactionschemes_per_page: ref(10),
      hotkeyactionschemes_search: ref(''),
      hotkeyactionschemes_sort_by: ref(['id']),
      hotkeyactionschemes_page: ref(1)
    }
    alertStoreMock = { alert: alertRef, error: errorMock, clear: clearMock }
  })

  it('loads on mount', async () => {
    mount(HotKeyActionSchemesList, { global: { stubs: { ...defaultGlobalStubs, ActionButton: true } } })
    await Promise.resolve()
    expect(getAllMock).toHaveBeenCalled()
  })

  it('navigates to create/edit', async () => {
    const wrapper = mount(HotKeyActionSchemesList, { global: { stubs: { ...defaultGlobalStubs, ActionButton: true } } })
    await wrapper.vm.openCreateDialog()
    await wrapper.vm.openEditDialog({ id: 3 })
    expect(pushMock).toHaveBeenCalledWith('/hotkeyactionscheme/create')
    expect(pushMock).toHaveBeenCalledWith('/hotkeyactionscheme/edit/3')
  })

  it('deletes after confirmation', async () => {
    const wrapper = mount(HotKeyActionSchemesList, { global: { stubs: { ...defaultGlobalStubs, ActionButton: true } } })
    await wrapper.vm.deleteHotKeyActionScheme({ id: 1, name: 'Default' })
    expect(confirmMock).toHaveBeenCalled()
    expect(removeMock).toHaveBeenCalledWith(1)
  })

  it('filters by name', async () => {
    const wrapper = mount(HotKeyActionSchemesList, { global: { stubs: { ...defaultGlobalStubs, ActionButton: true } } })
    expect(wrapper.vm.filterHotKeyActionSchemes(null, 'def', { raw: { name: 'Default' } })).toBe(true)
    expect(wrapper.vm.filterHotKeyActionSchemes(null, 'xyz', { raw: { name: 'Default' } })).toBe(false)
  })

  it('handles null filter inputs', async () => {
    const wrapper = mount(HotKeyActionSchemesList, { global: { stubs: { ...defaultGlobalStubs, ActionButton: true } } })
    expect(wrapper.vm.filterHotKeyActionSchemes(null, null, null)).toBe(false)
    expect(wrapper.vm.filterHotKeyActionSchemes(null, 'a', { raw: null })).toBe(false)
  })

  it('shows specific error messages on delete failure', async () => {
    const wrapper = mount(HotKeyActionSchemesList, { global: { stubs: { ...defaultGlobalStubs, ActionButton: true } } })
    removeMock.mockRejectedValueOnce(new Error('409 conflict'))
    await wrapper.vm.deleteHotKeyActionScheme({ id: 1, name: 'Default' })
    expect(errorMock).toHaveBeenCalledWith('Нельзя удалить схему, у которой есть связанные записи')

    removeMock.mockRejectedValueOnce(new Error('500'))
    await wrapper.vm.deleteHotKeyActionScheme({ id: 1, name: 'Default' })
    expect(errorMock).toHaveBeenCalledWith('Ошибка при удалении схемы')
  })

})
