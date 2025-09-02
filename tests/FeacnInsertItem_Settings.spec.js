/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import FeacnInsertItem_Settings from '@/dialogs/FeacnInsertItem_Settings.vue'

// Stub components
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
    template: '<button data-test="action-btn" @click="$emit(\'click\', item)"></button>'
  }
}))

// Mock stores
const getById = vi.fn()
const create = vi.fn()
const update = vi.fn()

vi.mock('@/stores/feacn.insert.items.store.js', () => ({
  useFeacnInsertItemsStore: () => ({
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

// Mock storeToRefs
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: () => ({
      alert: ref(null)
    })
  }
})

describe('FeacnInsertItem_Settings.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mountComponent = (props = { mode: 'create' }) =>
    mount(FeacnInsertItem_Settings, {
      props,
      global: {
        stubs: { 'font-awesome-icon': true }
      }
    })

  it('renders create mode and submits', async () => {
    create.mockResolvedValue({})
    const wrapper = mountComponent()
    wrapper.vm.setFieldValue('code', '1234567890')
    wrapper.vm.setFieldValue('insBefore', 'before')
    wrapper.vm.setFieldValue('insAfter', 'after')
    await wrapper.vm.onSubmit()
    expect(create).toHaveBeenCalledWith({ code: '1234567890', insBefore: 'before', insAfter: 'after' })
  })

  it('loads data in edit mode and updates', async () => {
    getById.mockResolvedValue({ code: '1111111111', insBefore: 'b', insAfter: 'a' })
    update.mockResolvedValue({})
    const wrapper = mountComponent({ mode: 'edit', insertItemId: 1 })
    await flushPromises()
    await wrapper.vm.onSubmit()
    expect(getById).toHaveBeenCalledWith(1)
    expect(update).toHaveBeenCalledWith(1, { code: '1111111111', insBefore: 'b', insAfter: 'a' })
  })

  it('toggles FeacnCodeSearch and selects code', async () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.feacn-code-search-stub').exists()).toBe(false)
    await wrapper.find('[data-test="action-btn"]').trigger('click')
    expect(wrapper.find('.feacn-code-search-stub').exists()).toBe(true)
    await wrapper.find('.feacn-code-search-stub').trigger('click')
    expect(wrapper.find('input[name="code"]').element.value).toBe('9876543210')
  })
})
