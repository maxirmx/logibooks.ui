/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CountryCodesList from '@/components/CountryCodes_List.vue'
import { vuetifyStubs } from './test-utils.js'

const mockItems = ref([
  { IsoNumeric: 840, IsoAlpha2: 'US', NameEnOfficial: 'United States', NameRuOfficial: 'США' },
  { IsoNumeric: 643, IsoAlpha2: 'RU', NameEnOfficial: 'Russia', NameRuOfficial: 'Россия' }
])
const mockLoading = ref(false)
const mockError = ref(null)
const codesPerPage = ref(10)
const codesSearch = ref('')
const codesSortBy = ref([{ key: 'IsoNumeric', order: 'asc' }])
const codesPage = ref(1)
const mockIsAdmin = ref(false)
const mockAlert = ref(null)

const getAll = vi.fn()
const update = vi.fn()
const success = vi.fn()
const error = vi.fn()
const clear = vi.fn()

vi.mock('@/stores/countrycodes.store.js', () => ({
  useCountryCodesStore: () => ({
    items: mockItems,
    loading: mockLoading,
    error: mockError,
    getAll,
    update
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: mockAlert,
    success,
    error,
    clear
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    countries_per_page: codesPerPage,
    countries_search: codesSearch,
    countries_sort_by: codesSortBy,
    countries_page: codesPage,
    isAdmin: mockIsAdmin
  })
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [{ value: 10, title: '10' }]
}))

describe('CountryCodes_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockItems.value = [
      { isoNumeric: 840, isoAlpha2: 'US', nameEnOfficial: 'United States', nameRuOfficial: 'США' },
      { isoNumeric: 643, isoAlpha2: 'RU', nameEnOfficial: 'Russia', nameRuOfficial: 'Россия' }
    ]
    mockLoading.value = false
    mockError.value = null
    codesSearch.value = ''
    mockIsAdmin.value = false
  })

  it('calls getAll on mount', () => {
    mount(CountryCodesList, {
      global: { stubs: vuetifyStubs }
    })
    expect(getAll).toHaveBeenCalled()
  })

  it('filterCodes matches multiple fields', () => {
    const wrapper = mount(CountryCodesList, { global: { stubs: vuetifyStubs } })
    const item = { raw: mockItems.value[1] }
    const f = wrapper.vm.filterCodes
    expect(f(null, '643', item)).toBe(true)
    expect(f(null, 'ru', item)).toBe(true)
    expect(f(null, 'Россия', item)).toBe(true)
    expect(f(null, 'nomatch', item)).toBe(false)
  })

  it('updateCodes calls store and alerts on success', async () => {
    update.mockResolvedValue()
    const wrapper = mount(CountryCodesList, { global: { stubs: vuetifyStubs } })
    await wrapper.vm.updateCodes()
    expect(update).toHaveBeenCalled()
    // called once on mount and once after update
    expect(getAll).toHaveBeenCalledTimes(2)
    expect(success).toHaveBeenCalledWith('Информация о странах обновлена')
  })

  it('updateCodes displays error alert on failure', async () => {
    update.mockRejectedValueOnce(new Error('fail'))
    const wrapper = mount(CountryCodesList, { global: { stubs: vuetifyStubs } })
    await wrapper.vm.updateCodes()
    expect(error).toHaveBeenCalledWith(expect.any(Error))
  })

  it('shows empty message when no items', () => {
    mockItems.value = []
    const wrapper = mount(CountryCodesList, { global: { stubs: vuetifyStubs } })
    expect(wrapper.text()).toContain('Список стран пуст')
  })

  it('renders admin update button when user is admin', () => {
    mockIsAdmin.value = true
    const wrapper = mount(CountryCodesList, { global: { stubs: vuetifyStubs } })
    expect(wrapper.text()).toContain('Обновить информацию о странах')
  })

  it('shows spinner and error message', () => {
    mockLoading.value = true
    mockError.value = 'bad'
    const wrapper = mount(CountryCodesList, { global: { stubs: vuetifyStubs } })
    expect(wrapper.html()).toContain('spinner-border')
    expect(wrapper.html()).toContain('Ошибка при загрузке информации')
  })
})
