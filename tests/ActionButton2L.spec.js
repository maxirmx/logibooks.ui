// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import ActionButton2L from '@/components/ActionButton2L.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useAlertStore } from '@/stores/alert.store.js'

vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :data-icon="icon"></i>',
    props: ['icon', 'size']
  }
}))

const vuetify = createVuetify({
  components,
  directives
})

const globalComponents = {
  'font-awesome-icon': {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :data-icon="icon"></i>',
    props: ['icon', 'size']
  }
}

describe('ActionButton2L', () => {
  const item = { id: 1 }
  const icon = 'fa-solid fa-ellipsis-v'
  const tooltipText = 'More actions'

  let options
  const wrappers = []
  const hosts = []

  afterEach(() => {
    wrappers.splice(0).forEach(wrapper => wrapper.unmount())
    hosts.splice(0).forEach(host => host.remove())
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('visualViewport', null)
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
    options = [
      { label: 'First action', action: vi.fn().mockResolvedValue(undefined) },
      { label: 'Second action', action: vi.fn().mockResolvedValue(undefined) },
      { label: 'Disabled action', action: vi.fn().mockResolvedValue(undefined), disabled: true }
    ]
  })

  function createWrapper(props = {}, { attachTo = document.body, errorHandler } = {}) {
    const wrapper = mount(ActionButton2L, {
      attachTo,
      props: {
        item,
        icon,
        tooltipText,
        iconSize: '1x',
        options,
        ...props
      },
      global: {
        config: { errorHandler },
        plugins: [vuetify],
        components: globalComponents,
        stubs: {
          transition: false,
          teleport: false
        }
      }
    })
    wrappers.push(wrapper)
    return wrapper
  }

  function exposed(wrapper) {
    return wrapper.vm.$.exposed || {}
  }

  function menu() {
    return new DOMWrapper(document.body.querySelector('.action-button-2l__menu'))
  }

  function menuOverlay(wrapper) {
    return wrapper.findAllComponents(components.VOverlay).find(overlay => overlay.props('minWidth') === 220)
  }

  async function settle(wrapper) {
    await flushPromises()
    await wrapper.vm.$nextTick()
    await flushPromises()
  }

  it('renders optional menu icons with symbolic color classes', async () => {
    options = [
      {
        label: 'Issue action',
        icon: 'fa-solid fa-person-circle-xmark',
        color: 'parcel-has-issues',
        action: vi.fn().mockResolvedValue(undefined)
      },
      {
        label: 'Excise action',
        icon: 'fa-solid fa-file-invoice',
        color: 'approved-with-excise',
        action: vi.fn().mockResolvedValue(undefined)
      },
      {
        label: 'Plain action',
        action: vi.fn().mockResolvedValue(undefined)
      }
    ]
    const wrapper = createWrapper({ options })
    await wrapper.find('button').trigger('click')
    await settle(wrapper)

    const items = menu().findAll('.action-button-2l__menu-item')
    const icons = menu().findAll('.action-button-2l__menu-icon')

    expect(items.map((item) => item.text())).toEqual([
      'Issue action',
      'Excise action',
      'Plain action'
    ])
    expect(icons).toHaveLength(2)
    expect(icons[0].attributes('data-icon')).toBe('fa-solid fa-person-circle-xmark')
    expect(icons[0].classes()).toContain('action-button-2l__menu-icon--parcel-has-issues')
    expect(icons[1].attributes('data-icon')).toBe('fa-solid fa-file-invoice')
    expect(icons[1].classes()).toContain('action-button-2l__menu-icon--approved-with-excise')
    expect(items[2].find('.action-button-2l__menu-icon').exists()).toBe(false)
  })

  it('supports keyboard navigation and selection', async () => {
    const wrapper = createWrapper()

    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    await settle(wrapper)
    let items = menu().findAll('.action-button-2l__menu-item')
    expect(exposed(wrapper).isMenuOpen.value).toBe(true)
    expect(items[0].attributes('tabindex')).toBe('0')

    await menu().trigger('keydown', { key: 'ArrowDown' })
    await settle(wrapper)
    items = menu().findAll('.action-button-2l__menu-item')
    expect(exposed(wrapper).focusedIndex.value).toBe(1)
    expect(items[0].attributes('tabindex')).toBe('-1')
    expect(items[1].attributes('tabindex')).toBe('0')

    await menu().trigger('keydown', { key: 'Enter' })
    await settle(wrapper)
    expect(options[1].action).toHaveBeenCalledWith(item)
    expect(exposed(wrapper).isMenuOpen.value).toBe(false)
  })

  it('closes menu on escape key', async () => {
    const wrapper = createWrapper()

    await wrapper.find('button').trigger('click')
    await settle(wrapper)
    expect(exposed(wrapper).isMenuOpen.value).toBe(true)
    expect(menu().exists()).toBe(true)

    await menu().trigger('keydown', { key: 'Escape' })
    await settle(wrapper)

    expect(exposed(wrapper).isMenuOpen.value).toBe(false)
  })

  it('closes menu on outside click without selecting an option', async () => {
    const wrapper = createWrapper()

    await wrapper.find('button').trigger('click')
    await settle(wrapper)
    expect(exposed(wrapper).isMenuOpen.value).toBe(true)

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle(wrapper)

    expect(exposed(wrapper).isMenuOpen.value).toBe(false)
    expect(options[0].action).not.toHaveBeenCalled()
    expect(options[1].action).not.toHaveBeenCalled()
    expect(options[2].action).not.toHaveBeenCalled()
  })

  it('renders outside a clipped table and keeps the menu open while its action runs', async () => {
    const host = document.createElement('div')
    host.className = 'table-card'
    host.style.overflow = 'hidden'
    host.style.width = '160px'
    document.body.appendChild(host)
    hosts.push(host)
    let complete
    options[0].action.mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    const wrapper = createWrapper({ menuLocation: 'bottom start' }, { attachTo: host })
    await wrapper.find('button').trigger('click')
    await settle(wrapper)
    const popup = menu()
    expect(host.contains(popup.element)).toBe(false)
    expect(popup.element.closest('.v-overlay-container')).not.toBeNull()
    const overlay = menuOverlay(wrapper)
    expect(overlay.props('locationStrategy')).toBe('connected')
    expect(overlay.props('scrollStrategy')).toBe('reposition')
    expect(overlay.props('location')).toBe('bottom start')
    expect(wrapper.find('button').attributes('aria-controls')).toBe(popup.attributes('id'))
    await popup.findAll('[role="menuitem"]')[0].trigger('click')
    expect(exposed(wrapper).isExecuting.value).toBe(true)
    expect(exposed(wrapper).isMenuOpen.value).toBe(true)
    expect(popup.findAll('[role="menuitem"]').every(option => option.element.disabled)).toBe(true)
    complete()
    await settle(wrapper)
    expect(options[0].action).toHaveBeenCalledExactlyOnceWith(item)
    expect(exposed(wrapper).isMenuOpen.value).toBe(false)
    expect(document.activeElement).toBe(wrapper.find('button').element)
  })

  it('closes through overlay dismissal and ignores an open update', async () => {
    const wrapper = createWrapper()
    await wrapper.find('button').trigger('click')
    await settle(wrapper)
    const overlay = menuOverlay(wrapper)
    overlay.vm.$emit('update:modelValue', true)
    expect(exposed(wrapper).isMenuOpen.value).toBe(true)
    overlay.vm.$emit('update:modelValue', false)
    await settle(wrapper)
    expect(exposed(wrapper).isMenuOpen.value).toBe(false)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it.each(['click', 'keyboard'])('keeps jobs with identical names distinct after reordering (%s)', async method => {
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const first = { key: 47, label: 'Сканирование сделки XX-2', action: vi.fn() }
      const second = { key: 48, label: 'Сканирование сделки XX-2', action: vi.fn() }
      const wrapper = createWrapper({ options: [first, second] })
      await wrapper.find('button').trigger('click')
      await settle(wrapper)
      expect(menu().findAll('[role="menuitem"]').map(option => option.text())).toEqual([first.label, second.label])
      const focusedButton = menu().findAll('[role="menuitem"]')[0].element
      await wrapper.setProps({ options: [second, first] })
      await settle(wrapper)
      if (method === 'click') await menu().findAll('[role="menuitem"]')[0].trigger('click')
      else {
        expect(menu().findAll('[role="menuitem"]')[1].element).toBe(focusedButton)
        focusedButton.focus()
        await new DOMWrapper(focusedButton).trigger('keydown', { key: 'Enter' })
      }
      await settle(wrapper)
      expect(method === 'click' ? second.action : first.action).toHaveBeenCalledExactlyOnceWith(item)
      expect(method === 'click' ? first.action : second.action).not.toHaveBeenCalled()
      expect(warnings).not.toHaveBeenCalled()
    } finally {
      warnings.mockRestore()
    }
  })

  it.each([false, true])('dismisses on Tab and restores the native navigation starting point (backward: %s)', async shiftKey => {
    const host = document.createElement('div')
    const before = document.createElement('button')
    const after = document.createElement('button')
    const mountPoint = document.createElement('div')
    before.textContent = 'До меню'
    after.textContent = 'После меню'
    host.append(before, mountPoint, after)
    document.body.appendChild(host)
    hosts.push(host)
    const wrapper = createWrapper({}, { attachTo: mountPoint })
    const trigger = wrapper.find('button')
    await trigger.trigger('click')
    await settle(wrapper)
    const option = menu().find('[role="menuitem"]').element
    option.focus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })
    option.dispatchEvent(event)
    await settle(wrapper)
    expect(exposed(wrapper).isMenuOpen.value).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
    expect(event.defaultPrevented).toBe(false)
    const controls = [...host.querySelectorAll('button')]
    expect(controls[controls.indexOf(trigger.element) + (shiftKey ? -1 : 1)]).toBe(shiftKey ? before : after)
  })

  it.each(['click', 'keyboard'])('observes a rejected %s action and restores the button', async method => {
    const failure = new Error('Technical action failure')
    const alerts = useAlertStore()
    const errorHandler = vi.fn(error => alerts.error(error, { fallback: 'Не удалось выполнить действие' }))
    const page = mount(PageAlertRegion)
    wrappers.push(page)
    options[0].action.mockRejectedValueOnce(failure)
    const wrapper = createWrapper({}, { errorHandler })
    await wrapper.find('button').trigger('click')
    await settle(wrapper)
    if (method === 'click') await menu().find('[role="menuitem"]').trigger('click')
    else await menu().trigger('keydown', { key: 'Enter' })
    await settle(wrapper)
    expect(errorHandler).toHaveBeenCalledOnce()
    expect(errorHandler.mock.calls[0][0]).toBe(failure)
    expect(page.findAll('[role="alert"]')).toHaveLength(1)
    expect(page.get('[role="alert"]').text()).toContain('Не удалось выполнить действие')
    expect(page.text()).not.toContain('Technical action failure')
    expect(exposed(wrapper).isExecuting.value).toBe(false)
    expect(exposed(wrapper).isMenuOpen.value).toBe(false)
    expect(wrapper.find('button').element.disabled).toBe(false)
  })
})
