import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductLinkWithActions from '@/components/ProductLinkWithActions.vue'

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
  })

  it('renders sanitized link and emits events when actions are clicked', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        productLink: 'example.com',
        item: { id: 10 },
        hasImage: true,
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    const link = wrapper.find('[data-test="product-link-anchor"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('https://example.com')

    await wrapper.find('[data-test="product-link-select"]').trigger('click')
    await wrapper.find('[data-test="product-link-view"]').trigger('click')
    await wrapper.find('[data-test="product-link-delete"]').trigger('click')

    expect(wrapper.emitted()['select-image']).toHaveLength(1)
    expect(wrapper.emitted()['view-image']).toHaveLength(1)
    expect(wrapper.emitted()['delete-image']).toHaveLength(1)
    expect(infoSpy).toHaveBeenCalledTimes(3)
  })

  it('shows placeholder text and disables buttons when link is missing or image is unavailable', () => {
    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        productLink: null,
        item: { id: 11 },
        hasImage: false,
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
        productLink: '',
        item: { id: 12 },
        hasImage: false,
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
