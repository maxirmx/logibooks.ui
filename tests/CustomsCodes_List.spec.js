/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomsCodesList from '@/components/CustomsCodes_List.vue'
import { defaultGlobalStubs } from './test-utils.js'

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { 
    ...actual, 
    storeToRefs: (store) => ({
      customs_codes_per_page: store.customs_codes_per_page,
      customs_codes_search: store.customs_codes_search,
      customs_codes_sort_by: store.customs_codes_sort_by,
      customs_codes_page: store.customs_codes_page,
      alert: store.alert
    })
  }
})

const mockAuthStore = {
  customs_codes_per_page: { value: 25 },
  customs_codes_search: { value: '' },
  customs_codes_sort_by: { value: [{ key: 'code', order: 'asc' }] },
  customs_codes_page: { value: 1 }
}

const mockAlertStore = {
  alert: { value: null },
  clear: vi.fn()
}

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => mockAlertStore
}))

describe('CustomsCodes_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with title and empty message when no items', () => {
    const wrapper = mount(CustomsCodesList, {
      props: {
        title: 'Запреты',
        items: [],
        loading: false
      },
      global: { stubs: defaultGlobalStubs }
    })

    expect(wrapper.find('h2').text()).toBe('Запреты')
    expect(wrapper.text()).toContain('Список запретов пуст')
  })

  it('renders different title and empty message for exceptions', () => {
    const wrapper = mount(CustomsCodesList, {
      props: {
        title: 'Исключения',
        items: [],
        loading: false
      },
      global: { stubs: defaultGlobalStubs }
    })

    expect(wrapper.find('h2').text()).toBe('Исключения')
    expect(wrapper.text()).toContain('Список исключений пуст')
  })

  it('shows loading spinner when loading', () => {
    const wrapper = mount(CustomsCodesList, {
      props: {
        title: 'Запреты',
        items: [],
        loading: true
      },
      global: { stubs: defaultGlobalStubs }
    })

    expect(wrapper.find('.spinner-border').exists()).toBe(true)
  })

  it('shows error message when error is provided', () => {
    const wrapper = mount(CustomsCodesList, {
      props: {
        title: 'Запреты',
        items: [],
        loading: false,
        error: 'Test error'
      },
      global: { stubs: defaultGlobalStubs }
    })

    expect(wrapper.text()).toContain('Ошибка при загрузке списка запретов: Test error')
  })

  it('shows different error message for exceptions', () => {
    const wrapper = mount(CustomsCodesList, {
      props: {
        title: 'Исключения',
        items: [],
        loading: false,
        error: 'Test error'
      },
      global: { stubs: defaultGlobalStubs }
    })

    expect(wrapper.text()).toContain('Ошибка при загрузке списка исключений: Test error')
  })
})
