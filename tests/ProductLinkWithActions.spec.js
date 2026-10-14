import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ProductLinkWithActions from '@/components/ProductLinkWithActions.vue'

// Create mocks that can be modified per test
let mockAuthStore = {
  user: { token: 'test-token' },
      persistListState: vi.fn().mockReturnValue(true)
}

let mockAlertStore = {
  error: vi.fn(),
  clear: vi.fn()
}

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    getImageProcessingUrl: (id) => `/parcels/${id}/image`
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => mockAuthStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => mockAlertStore
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
  beforeEach(() => {
    // Reset mocks before each test
    mockAuthStore = {
      user: { token: 'test-token' },
      persistListState: vi.fn().mockReturnValue(true)
    }
    mockAlertStore = {
      error: vi.fn(),
      clear: vi.fn()
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders sanitized link and emits events when actions are clicked', async () => {
    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 10, productLink: 'example.com', hasImage: true },
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    // Simulate extension presence by setting component's internal state
    wrapper.vm.extensionPresent = true
    await nextTick()

    const link = wrapper.find('[data-test="product-link-anchor"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('https://example.com')

    await wrapper.find('[data-test="product-link-select"]').trigger('click')
    await wrapper.find('[data-test="product-link-view"]').trigger('click')
    await wrapper.find('[data-test="product-link-delete"]').trigger('click')

    expect(wrapper.emitted()['select-image']).toHaveLength(1)
    expect(wrapper.emitted()['view-image']).toHaveLength(1)
    expect(wrapper.emitted()['delete-image']).toHaveLength(1)
  })

  it('does not emit events when buttons are disabled', async () => {
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
  })

  it('handles extension presence through window messages', async () => {
    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 13, productLink: 'example.com', hasImage: true },
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    // Initially, extension should not be present
    expect(wrapper.vm.extensionPresent).toBe(false)

    // Simulate extension sending active message
    const event = new MessageEvent('message', {
      data: {
        type: 'LOGIBOOKS_EXTENSION_ACTIVE',
        active: true
      },
      source: window
    })
    window.dispatchEvent(event)
    await nextTick()

    // Extension should now be detected
    expect(wrapper.vm.extensionPresent).toBe(true)

    // Test with active: false
    const eventInactive = new MessageEvent('message', {
      data: {
        type: 'LOGIBOOKS_EXTENSION_ACTIVE',
        active: false
      },
      source: window
    })
    window.dispatchEvent(eventInactive)
    await nextTick()

    expect(wrapper.vm.extensionPresent).toBe(false)
  })

  it('shows error when user is null during select', async () => {
    // Mock auth store with null user
    mockAuthStore.user = null

    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 17, productLink: 'example.com', hasImage: true },
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    // Set extension as present
    wrapper.vm.extensionPresent = true
    await nextTick()

    // Try to select image
    await wrapper.find('[data-test="product-link-select"]').trigger('click')

    // Should show error and not emit event
    expect(mockAlertStore.error).toHaveBeenCalledWith('Необходимо войти в систему')
    expect(wrapper.emitted()['select-image']).toBeUndefined()
  })

  it('handleViewClick returns early when buttons are disabled', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 21, productLink: 'example.com', hasImage: false },
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    // Buttons should be disabled due to hasImage: false
    expect(wrapper.vm.buttonsDisabled).toBe(true)

    // Call handleViewClick directly to test the guard
    wrapper.vm.handleViewClick()
    await nextTick()

    // Should not emit or log due to early return
    expect(wrapper.emitted()['view-image']).toBeUndefined()
    expect(infoSpy).not.toHaveBeenCalled()
  })

  it('handleDeleteClick returns early when buttons are disabled', async () => {
    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 22, productLink: 'example.com', hasImage: false },
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    // Buttons should be disabled due to hasImage: false
    expect(wrapper.vm.buttonsDisabled).toBe(true)

    // Call handleDeleteClick directly to test the guard
    wrapper.vm.handleDeleteClick()
    await nextTick()

    // Should not emit due to early return
    expect(wrapper.emitted()['delete-image']).toBeUndefined()
  })
})
