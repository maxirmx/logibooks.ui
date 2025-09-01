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

// Mock stores
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
})

