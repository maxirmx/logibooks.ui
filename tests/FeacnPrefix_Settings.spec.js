/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import FeacnPrefix_Settings from '@/components/FeacnPrefix_Settings.vue'

// Stub FieldArrayWithButtons
vi.mock('@/components/FieldArrayWithButtons.vue', () => ({
  default: {
    name: 'FieldArrayWithButtons',
    props: ['name', 'label'],
    template: '<div data-test="fab-stub"></div>'
  }
}))

// Mock FeacnCodeSearch
vi.mock('@/components/FeacnCodeSearch.vue', () => ({
  default: {
    name: 'FeacnCodeSearch',
    props: [],
    emits: ['select'],
    template: '<div data-test="feacn-code-search"></div>'
  }
}))

// Mock ActionButton
vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    props: ['icon', 'item', 'tooltipText', 'disabled'],
    emits: ['click'],
    template: '<button data-test="action-button" @click="$emit(\'click\')">{{ icon }}</button>'
  }
}))

// Mock stores
const getById = vi.fn()
const create = vi.fn()
const update = vi.fn()

vi.mock('@/stores/feacn.prefixes.store.js', () => ({
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
    wrapper.vm.setFieldValue('code', '0101')
    wrapper.vm.setFieldValue('exceptions', ['111', ''])
    await wrapper.vm.onSubmit()
    expect(create).toHaveBeenCalledWith({ code: '0101', exceptions: ['111'] })
  })

  it('loads data in edit mode and updates', async () => {
    // Mock backend response with FeacnPrefixExceptionDto structure
    getById.mockResolvedValue({ 
      code: '0202', 
      exceptions: [{ id: 1, code: '222', feacnPrefixId: 1 }] 
    })
    update.mockResolvedValue({})
    const wrapper = mountComponent({ mode: 'edit', prefixId: 1 })
    await flushPromises()
    await wrapper.vm.onSubmit()
    expect(getById).toHaveBeenCalledWith(1)
    expect(update).toHaveBeenCalledWith(1, { code: '0202', exceptions: ['222'] })
  })

  it('handles mixed exception formats in edit mode', async () => {
    // Mock backend response with mixed string and object formats for backward compatibility
    getById.mockResolvedValue({ 
      code: '0303', 
      exceptions: ['333', { id: 2, code: '444', feacnPrefixId: 1 }] 
    })
    update.mockResolvedValue({})
    const wrapper = mountComponent({ mode: 'edit', prefixId: 1 })
    await flushPromises()
    await wrapper.vm.onSubmit()
    expect(getById).toHaveBeenCalledWith(1)
    expect(update).toHaveBeenCalledWith(1, { code: '0303', exceptions: ['333', '444'] })
  })

  it('filters out empty exception strings on submit', async () => {
    create.mockResolvedValue({})
    const wrapper = mountComponent()
    wrapper.vm.setFieldValue('code', '0404')
    wrapper.vm.setFieldValue('exceptions', ['555', '', '666', '   '])
    await wrapper.vm.onSubmit()
    expect(create).toHaveBeenCalledWith({ code: '0404', exceptions: ['555', '666'] })
  })

  it('renders FieldArrayWithButtons', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-test="fab-stub"]').exists()).toBe(true)
  })

  it('renders ActionButton and FeacnCodeSearch when search is toggled', async () => {
    const wrapper = mountComponent()
    
    // Should render ActionButton
    expect(wrapper.find('[data-test="action-button"]').exists()).toBe(true)
    
    // Should not show search initially
    expect(wrapper.find('[data-test="feacn-code-search"]').exists()).toBe(false)
    
    // Click the action button to toggle search
    await wrapper.find('[data-test="action-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    
    // Should show search now
    expect(wrapper.find('[data-test="feacn-code-search"]').exists()).toBe(true)
  })

  it('handles code selection from FeacnCodeSearch', async () => {
    const wrapper = mountComponent()
    
    // Toggle search on
    await wrapper.find('[data-test="action-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    
    // Simulate code selection
    const feacnCodeSearch = wrapper.findComponent({ name: 'FeacnCodeSearch' })
    await feacnCodeSearch.vm.$emit('select', '123456')
    
    // Check that code field is updated
    expect(wrapper.vm.code).toBe('123456')
    
    // Search should be closed
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="feacn-code-search"]').exists()).toBe(false)
  })
})

