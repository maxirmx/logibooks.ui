import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ProductLinkWithActions from '@/components/ProductLinkWithActions.vue'

// Create mocks that can be modified per test
let mockAuthStore = {
  user: { token: 'test-token' }
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
      user: { token: 'test-token' }
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
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

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
    expect(infoSpy).toHaveBeenCalledTimes(1)
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

  it('ignores messages that are not from extension', async () => {
    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 14, productLink: 'example.com', hasImage: true },
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    // Initially, extension should not be present
    expect(wrapper.vm.extensionPresent).toBe(false)

    // Send message with wrong type
    const wrongTypeEvent = new MessageEvent('message', {
      data: {
        type: 'SOME_OTHER_TYPE',
        active: true
      },
      source: window
    })
    window.dispatchEvent(wrongTypeEvent)
    await nextTick()

    // Extension should still not be detected
    expect(wrapper.vm.extensionPresent).toBe(false)
  })

  it('cleans up event listeners on unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 15, productLink: 'example.com', hasImage: true },
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    // Unmount the component
    wrapper.unmount()

    // Verify cleanup was called
    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function))
  })

  it('shows error when token is null during select', async () => {
    // Mock auth store with no token
    mockAuthStore.user = { token: null }

    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 16, productLink: 'example.com', hasImage: true },
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

  it('posts message to extension when select is clicked with valid token', async () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage')

    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 18, productLink: 'example.com', hasImage: true },
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    // Set extension as present
    wrapper.vm.extensionPresent = true
    await nextTick()

    // Click select
    await wrapper.find('[data-test="product-link-select"]').trigger('click')

    // Should post message to extension
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: 'LOGIBOOKS_EXTENSION_ACTIVATE',
        target: '/parcels/18/image',
        url: 'https://example.com',
        token: 'test-token'
      },
      window.location.origin
    )
    expect(wrapper.emitted()['select-image']).toHaveLength(1)
  })

  it('handles view button when image is unavailable', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 19, productLink: 'example.com', hasImage: false },
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    // Try to click view button
    await wrapper.find('[data-test="product-link-view"]').trigger('click')

    // Should not emit or log anything because button is disabled
    expect(wrapper.emitted()['view-image']).toBeUndefined()
    expect(infoSpy).not.toHaveBeenCalled()
  })

  it('handles delete button when image is unavailable', async () => {
    const wrapper = mount(ProductLinkWithActions, {
      props: {
        label: 'Product Link',
        item: { id: 20, productLink: 'example.com', hasImage: false },
        disabled: false
      },
      global: { stubs: globalStubs }
    })

    // Try to click delete button
    await wrapper.find('[data-test="product-link-delete"]').trigger('click')

    // Should not emit because button is disabled
    expect(wrapper.emitted()['delete-image']).toBeUndefined()
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
