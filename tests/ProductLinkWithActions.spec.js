import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ProductLinkWithActions from '@/components/ProductLinkWithActions.vue'

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    getImageProcessingUrl: (id) => `/parcels/${id}/image`
  })
}))

const ActionButtonStub = {
  props: ['item', 'icon', 'variant', 'iconSize', 'tooltipText', 'disabled'],
  emits: ['click'],
  template:
    '<button class="action-button-stub" v-bind="$attrs" :data-disabled="String(disabled)" :disabled="disabled" @click="$emit(\'click\', item)">Action</button>'
}

const globalStubs = {
  ActionButton: ActionButtonStub
}

describe('ProductLinkWithActions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    // cleanup global extension flag if set
    try { delete global.window.__LOGIBOOKS_EXTENSION_ACTIVE 
    } catch {
      // ignore if not accessible in this test runner
    }
  })

  it('renders sanitized link and emits events when actions are clicked', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    // Simulate extension presence for select action
    global.window.__LOGIBOOKS_EXTENSION_ACTIVE = true

    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 10, productLink: 'example.com', hasImage: true },
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    // wait for onMounted to run and pick up extension flag
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    // Ensure extensionPresent is true in test environment
    try {
      wrapper.vm.extensionPresent = true
      await nextTick()
    } catch {
      // ignore if not accessible in this test runner
    }

    const link = wrapper.find('[data-test="product-link-anchor"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('https://example.com')

    await wrapper.find('[data-test="product-link-select"]').trigger('click')
    await wrapper.find('[data-test="product-link-view"]').trigger('click')
    await wrapper.find('[data-test="product-link-delete"]').trigger('click')

    expect(wrapper.emitted()['select-image']).toHaveLength(1)
    expect(wrapper.emitted()['view-image']).toHaveLength(1)
    expect(wrapper.emitted()['delete-image']).toHaveLength(1)
    expect(infoSpy).toHaveBeenCalledTimes(2)
  })

  it('shows placeholder text and disables buttons when link is missing or image is unavailable', () => {
    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 11, productLink: null, hasImage: false },
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    expect(wrapper.find('[data-test="product-link-anchor"]').exists()).toBe(false)
    const placeholder = wrapper.find('[data-test="product-link-empty"]')
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.text()).toBe('Ссылка отсутствует')

    const buttons = wrapper.findAll('.action-button-stub')
    expect(buttons).toHaveLength(3)
    expect(wrapper.vm.buttonsDisabled).toBe(true)
  })

  it('does not emit events when buttons are disabled', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 12, productLink: '', hasImage: false },
        disabled: true
      },
      global: { stubs: globalStubs }
    })

    await wrapper.find('[data-test="product-link-select"]').trigger('click')
    await wrapper.find('[data-test="product-link-view"]').trigger('click')
    await wrapper.find('[data-test="product-link-delete"]').trigger('click')

    expect(wrapper.emitted()['select-image']).toBeUndefined()
    expect(wrapper.emitted()['view-image']).toBeUndefined()
    expect(wrapper.emitted()['delete-image']).toBeUndefined()
    expect(infoSpy).not.toHaveBeenCalled()
  })
})
