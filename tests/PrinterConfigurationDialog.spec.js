import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrinterConfigurationDialog from '@/l2/PrinterConfigurationDialog.vue'
import ActionButton from '@/components/ActionButton.vue'
import { APP_DIALOG_BUTTON_PROPS, APP_DIALOG_SIZES, APP_DIALOG_MAX_WIDTH } from '@/helpers/dialog.helpers.js'

const stubs = {
  PageAlertRegion: true,
  'v-tooltip': { inheritAttrs: false, template: '<div><slot name="activator" :props="{}" /></div>' },
  'font-awesome-icon': { props: ['icon'], template: '<i :data-icon="icon" />' },
  'v-dialog': { props: { modelValue: Boolean, width: Number, maxWidth: String, persistent: Boolean }, template: '<div role="dialog"><slot /></div>' },
  'v-card': { template: '<div><slot /></div>' },
  'v-card-title': { template: '<div><slot /></div>' },
  'v-card-text': { template: '<div><slot /></div>' },
  'v-card-actions': { template: '<div><slot /></div>' },
  'v-btn': { props: ['disabled', 'color', 'variant'], template: '<button :disabled="disabled"><slot /></button>' },
  'v-select': { props: ['modelValue', 'items', 'disabled'], emits: ['update:modelValue'], template: '<select :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value || item" :value="item.value || item" :disabled="item.props?.disabled">{{ item.title || item }}</option></select>' }
}

function mountDialog(props = {}) {
  return mount(PrinterConfigurationDialog, { props: { show: true, ...props }, global: { stubs } })
}

describe('L2 printer configuration dialog', () => {
  it('uses the shared information shell, sizing and button styles', () => {
    const wrapper = mountDialog()
    const frame = wrapper.getComponent({ name: 'AppDialogFrame' })
    expect(frame.props('title')).toBe('Настройки печати')
    expect(frame.props('tone')).toBe('default')
    const dialog = wrapper.getComponent(stubs['v-dialog'])
    expect(dialog.props()).toMatchObject({ width: APP_DIALOG_SIZES.medium, maxWidth: APP_DIALOG_MAX_WIDTH, persistent: true })
    expect(wrapper.getComponent('[data-testid="close-print-settings"]').props()).toMatchObject(APP_DIALOG_BUTTON_PROPS.primary)
    expect(wrapper.findAllComponents(ActionButton).map((button) => button.props())).toMatchObject([
      { icon: 'fa-solid fa-broom', tooltipText: 'Очистить выбор' },
      { icon: 'fa-solid fa-arrow-rotate-left', tooltipText: 'Обновить список' }
    ])
    expect(wrapper.get('.printer-configuration-row').findAllComponents(ActionButton)).toHaveLength(2)
    wrapper.unmount()
  })

  it('sorts printer queues and emits direct selections and operations', async () => {
    const wrapper = mountDialog({ printers: ['Office Z', 'TE200 B', 'Office A', 'TE200 A'], selected: 'TE200 A', active: true, userId: 9, connected: true })
    expect(wrapper.find('[data-testid="printer-status"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="clear-printer"]').attributes('aria-label')).toBe('Очистить выбор')
    expect(wrapper.get('[data-testid="refresh-printers"]').attributes('aria-label')).toBe('Обновить список')
    expect(wrapper.get('[data-testid="printer-selection-inline"]').findAll('option').map((item) => item.text())).toEqual(['TE200 A', 'TE200 B', 'Office A', 'Office Z'])
    await wrapper.get('[data-testid="printer-selection-inline"]').setValue('Office A')
    expect(wrapper.emitted('select')).toEqual([['Office A']])
    await wrapper.get('[data-testid="auto-print-mode"]').setValue('TJ')
    expect(wrapper.emitted('mode')).toEqual([['TJ']])
    await wrapper.get('[data-testid="clear-printer"]').trigger('click')
    await wrapper.get('[data-testid="refresh-printers"]').trigger('click')
    await wrapper.get('[data-testid="close-print-settings"]').trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
    expect(wrapper.emitted('refresh')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('renders unavailable, paused, failed and overflow states and disables operations while busy', async () => {
    const wrapper = mountDialog({ paused: true, failed: { scanCodeId: 8, template: 'KGT' }, overflow: { scanCodeId: 50 } })
    expect(wrapper.get('[data-testid="printer-status"]').text()).toBe('QZ Tray отключён')
    expect(wrapper.get('[data-testid="failed-print"]').text()).toContain('скан 8 (KGT)')
    expect(wrapper.get('[data-testid="print-overflow"]').text()).toContain('скана 50')
    expect(wrapper.get('[data-testid="auto-print-mode"]').findAll('option').slice(1).every((item) => item.element.disabled)).toBe(true)
    await wrapper.setProps({ connected: true })
    expect(wrapper.find('[data-testid="printer-status"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Принтер не выбран')
    await wrapper.setProps({ busy: true, selected: 'Office' })
    expect(wrapper.get('[data-testid="printer-selection-inline"]').element.disabled).toBe(true)
    expect(wrapper.get('[data-testid="auto-print-mode"]').element.disabled).toBe(true)
    expect(wrapper.get('[data-testid="clear-printer"]').element.disabled).toBe(true)
    await wrapper.setProps({ busy: false, printing: true })
    expect(wrapper.get('[data-testid="refresh-printers"]').element.disabled).toBe(true)
    wrapper.unmount()
  })

  it('allows printer changes while armed or paused and closes on Escape', async () => {
    const wrapper = mountDialog({ mode: 'KGT', printers: ['Office', 'TE200'], selected: 'Office', active: true, userId: 9 })
    expect(wrapper.get('[data-testid="printer-selection-inline"]').element.disabled).toBe(false)
    expect(wrapper.get('[data-testid="refresh-printers"]').element.disabled).toBe(false)
    await wrapper.get('[data-testid="printer-selection-inline"]').setValue('TE200')
    expect(wrapper.emitted('select')).toEqual([['TE200']])
    await wrapper.setProps({ paused: true })
    expect(wrapper.get('[data-testid="printer-selection-inline"]').element.disabled).toBe(false)
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('close')).toHaveLength(1)
    await wrapper.setProps({ show: false })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps first-use selection as a draft and validates beneath the complete printer row', async () => {
    const wrapper = mountDialog({ pendingPrint: true, printers: ['Office'], connected: true })
    expect(wrapper.get('[data-testid="auto-print-mode"]').element.disabled).toBe(true)
    expect(wrapper.getComponent('[data-testid="close-print-settings"]').props()).toMatchObject(APP_DIALOG_BUTTON_PROPS.secondary)
    expect(wrapper.getComponent('[data-testid="print-pending-label"]').props()).toMatchObject(APP_DIALOG_BUTTON_PROPS.primary)
    await wrapper.get('[data-testid="print-pending-label"]').trigger('click')
    const validation = wrapper.get('[role="alert"]')
    expect(validation.text()).toBe('Выберите доступный принтер')
    expect(validation.element.previousElementSibling.classList.contains('printer-configuration-row')).toBe(true)
    expect(wrapper.get('.printer-configuration-row').find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.emitted('select')).toBeUndefined()
    await wrapper.get('[data-testid="printer-selection-inline"]').setValue('Office')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.emitted('select')).toBeUndefined()
    await wrapper.get('[data-testid="print-pending-label"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['Office']])
    await wrapper.setProps({ busy: true })
    await wrapper.get('[data-testid="print-pending-label"]').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
    wrapper.unmount()
  })

  it('prefers a TE200 when discovery finishes and preserves a chosen draft on refresh', async () => {
    const wrapper = mountDialog({ pendingPrint: true })
    await wrapper.setProps({ printers: ['Office', 'TE200 A'] })
    expect(wrapper.get('[data-testid="printer-selection-inline"]').element.value).toBe('TE200 A')
    await wrapper.get('[data-testid="printer-selection-inline"]').setValue('Office')
    await wrapper.setProps({ printers: ['TE200 B', 'Office'] })
    expect(wrapper.get('[data-testid="printer-selection-inline"]').element.value).toBe('Office')
    await wrapper.setProps({ selected: 'TE200 B' })
    expect(wrapper.get('[data-testid="printer-selection-inline"]').element.value).toBe('TE200 B')
    await wrapper.setProps({ selected: '' })
    expect(wrapper.get('[data-testid="printer-selection-inline"]').element.value).toBe('')
    await wrapper.setProps({ show: false })
    await wrapper.setProps({ show: true })
    expect(wrapper.get('[data-testid="printer-selection-inline"]').element.value).toBe('TE200 B')
    wrapper.unmount()
  })

  it('prevents Escape cancellation during a submitted print and permits it afterward', async () => {
    const wrapper = mountDialog({ pendingPrint: true, printing: true, selected: 'Office', printers: ['Office'] })
    expect(wrapper.get('[data-testid="close-print-settings"]').element.disabled).toBe(true)
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('close')).toBeUndefined()
    await wrapper.setProps({ printing: false, busy: true })
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })
})
