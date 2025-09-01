/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import FeacnPrefix_Settings from '@/components/FeacnPrefix_Settings.vue'
import FeacnCodeInput from '@/components/FeacnCodeInput.vue'

vi.mock('@/components/FeacnCodeSearch.vue', () => ({
  default: {
    name: 'FeacnCodeSearch',
    emits: ['select'],
    template: '<div class="feacn-code-search-stub" @click="$emit(\'select\', \'9876543210\')"></div>'
  }
}))

vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    props: ['item', 'icon', 'tooltipText', 'iconSize', 'disabled'],
    emits: ['click'],
    template: '<button v-bind="$attrs" @click="$emit(\'click\', item)"></button>'
  }
}))

const getById = vi.fn()
const create = vi.fn()
const update = vi.fn()

vi.mock('@/stores/feacn.prefix.store.js', () => ({
  useFeacnPrefixesStore: () => ({
    getById,
    create,
    update
  })
}))

const alertError = vi.fn()
const alertClear = vi.fn()

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    error: alertError,
    clear: alertClear
  })
}))

vi.mock('@/router', () => ({
  default: {
    push: vi.fn()
  }
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: () => ({
      alert: ref(null)
    })
  }
})

describe('FeacnPrefix_Settings.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mountComponent = (props = { mode: 'create' }) =>
    mount(FeacnPrefix_Settings, {
      props,
      global: {
        stubs: { 'font-awesome-icon': true }
      }
    })

  it('renders create mode and submits', async () => {
    create.mockResolvedValue({})
    const wrapper = mountComponent()
    wrapper.vm.setFieldValue('code', '1234')
    wrapper.vm.setFieldValue('comment', 'comm')
    wrapper.vm.setFieldValue('exceptions[0]', '5678')
    await wrapper.vm.onSubmit()
    expect(create).toHaveBeenCalledWith({ code: '1234', comment: 'comm', exceptions: ['5678'] })
  })

  it('loads data in edit mode and updates', async () => {
    getById.mockResolvedValue({ code: '0101', comment: 'c1', exceptions: ['111', '222'] })
    update.mockResolvedValue({})
    const wrapper = mountComponent({ mode: 'edit', prefixId: 1 })
    await flushPromises()
    expect(getById).toHaveBeenCalledWith(1)
    // ensure values loaded
    expect(wrapper.find('input#code').element.value).toBe('0101')
    await wrapper.vm.setFieldValue('exceptions', ['111', '222'])
    await wrapper.vm.onSubmit()
    expect(update).toHaveBeenCalledWith(1, { code: '0101', comment: 'c1', exceptions: ['111', '222'] })
  })

  it('toggles code search and selects value', async () => {
    const wrapper = mountComponent()
    const buttons = wrapper.findAll('[data-test="feacn-code-search-btn"]')
    expect(wrapper.find('.feacn-code-search-stub').exists()).toBe(false)
    await buttons[0].trigger('click')
    expect(wrapper.find('.feacn-code-search-stub').exists()).toBe(true)
    await wrapper.find('.feacn-code-search-stub').trigger('click')
    expect(wrapper.find('input#code').element.value).toBe('9876543210')
  })

  it('allows selecting exception code', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    const inputs = wrapper.findAllComponents(FeacnCodeInput)
    await inputs[1].find('[data-test="feacn-code-search-btn"]').trigger('click')
    const overlay = wrapper.find('.feacn-code-search-stub')
    await overlay.trigger('click')
    expect(wrapper.find('input#exceptions_0').element.value).toBe('9876543210')
  })
})
