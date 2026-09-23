/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CompanyRegisterOutputFormatsTable from '@/components/CompanyRegisterOutputFormatsTable.vue'
import {
  COMPANY_REGISTER_OUTPUT_TYPES,
  OFFERED_COMPANY_REGISTER_OUTPUT_TYPES
} from '@/helpers/company.constants.js'

const { push, confirm, store, alerts } = vi.hoisted(() => ({
  push: vi.fn(),
  confirm: vi.fn(),
  store: { getAll: vi.fn(), companies: [], getRegisterOutputFormat: vi.fn(), deleteRegisterOutputFormat: vi.fn() },
  alerts: { error: vi.fn(), success: vi.fn() }
}))
vi.mock('@/router', () => ({ default: { push } }))
vi.mock('@/stores/companies.store.js', () => ({ useCompaniesStore: () => store }))
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => alerts }))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => confirm }))

const ActionButtonStub = {
  name: 'ActionButton',
  props: ['disabled', 'tooltipText'],
  emits: ['click'],
  inheritAttrs: false,
  template: '<button type="button" :data-testid="$attrs[\'data-testid\']" :disabled="disabled" @click="$emit(\'click\')">{{ tooltipText }}</button>'
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await nextTick() }
const vuetify = createVuetify({ components, directives })
async function mountTable() {
  const wrapper = mount(CompanyRegisterOutputFormatsTable, {
    props: { companyId: 42 }, global: { plugins: [vuetify], stubs: { ActionButton: ActionButtonStub } }
  })
  await flush()
  return wrapper
}

describe('company register output format status table', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    push.mockReset().mockResolvedValue()
    confirm.mockReset().mockResolvedValue(true)
    store.companies = [
      { id: 2, shortName: 'РВБ' },
      { id: 1, shortName: 'Озон' },
      { id: 8, shortName: 'ГТК' }
    ]
    store.getAll.mockReset().mockResolvedValue()
    store.getRegisterOutputFormat.mockReset().mockImplementation(async (id, type) =>
      type === COMPANY_REGISTER_OUTPUT_TYPES[0]
        ? { schemaVersion: 1, registerType: type, entries: [{ kind: 'optional', title: 'Extra' }] }
        : null)
    store.deleteRegisterOutputFormat.mockReset().mockResolvedValue(true)
  })

  it('shows only offered type statuses and routes each edit action to its own page', async () => {
    const wrapper = await mountTable()
    expect(wrapper.get('#register-output-summary-label').text()).toBe('Форматы выгрузки реестров:')
    expect(wrapper.get('.register-output-summary').classes()).toContain('form-group')
    expect(wrapper.findAll('thead th').map((header) => header.text())).toEqual(['', 'Тип реестра', 'Статус'])
    expect(wrapper.get('.register-output-summary').element.children[1].classList.contains('register-output-summary__content')).toBe(true)
    expect(wrapper.get('.register-output-summary__content .table-card .v-data-table.interlaced-table').exists()).toBe(true)
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.findAll('tbody tr').map((row) => row.findAll('td')[1].text())).toEqual(['РВБ', 'Озон'])
    expect(wrapper.findAll('tbody tr')[0].text()).toContain('Настроен')
    expect(wrapper.findAll('tbody tr')[1].text()).toContain('Не настроен')
    expect(store.getRegisterOutputFormat.mock.calls.map(([id, type]) => [id, type]))
      .toEqual(OFFERED_COMPANY_REGISTER_OUTPUT_TYPES.map((registerType) => [42, registerType]))
    expect(wrapper.find(`[data-testid="register-output-edit-${COMPANY_REGISTER_OUTPUT_TYPES[2]}"]`).exists()).toBe(false)
    expect(store.getAll).toHaveBeenCalledTimes(1)
    await wrapper.get(`[data-testid="register-output-edit-${COMPANY_REGISTER_OUTPUT_TYPES[1]}"]`).trigger('click')
    expect(push).toHaveBeenCalledWith(`/company/edit/42/register-output/${COMPANY_REGISTER_OUTPUT_TYPES[1]}`)
    expect(wrapper.find(`[data-testid="register-output-delete-${COMPANY_REGISTER_OUTPUT_TYPES[1]}"]`).exists()).toBe(false)
    wrapper.unmount()
  })

  it('deletes only a configured type after confirmation and updates its status', async () => {
    const wrapper = await mountTable()
    await wrapper.get(`[data-testid="register-output-delete-${COMPANY_REGISTER_OUTPUT_TYPES[0]}"]`).trigger('click')
    await flush()
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(store.deleteRegisterOutputFormat).toHaveBeenCalledWith(42, COMPANY_REGISTER_OUTPUT_TYPES[0])
    expect(wrapper.findAll('tbody tr')[0].text()).toContain('Не настроен')
    expect(alerts.success).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('keeps the row and retries the same delete after a transport failure', async () => {
    store.deleteRegisterOutputFormat.mockRejectedValueOnce(new Error('offline'))
    const wrapper = await mountTable()
    await wrapper.get(`[data-testid="register-output-delete-${COMPANY_REGISTER_OUTPUT_TYPES[0]}"]`).trigger('click')
    await flush()
    expect(wrapper.findAll('tbody tr')[0].text()).toContain('Настроен')
    expect(alerts.error).toHaveBeenCalledTimes(1)
    await alerts.error.mock.calls[0][1].action.handler()
    await flush()
    expect(store.deleteRegisterOutputFormat).toHaveBeenCalledTimes(2)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('tbody tr')[0].text()).toContain('Не настроен')
    wrapper.unmount()
  })

  it('keeps the summary hidden on load failure and retries all statuses', async () => {
    store.getRegisterOutputFormat.mockRejectedValueOnce(new Error('offline'))
    const wrapper = await mountTable()
    expect(wrapper.find('table').exists()).toBe(false)
    expect(alerts.error).toHaveBeenCalledTimes(1)
    await alerts.error.mock.calls[0][1].action.handler()
    await flush()
    expect(store.getRegisterOutputFormat).toHaveBeenCalledTimes(4)
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    wrapper.unmount()
  })

  it('retries company-name loading before showing the register labels', async () => {
    store.getAll.mockRejectedValueOnce(new Error('offline'))
    const wrapper = await mountTable()
    expect(wrapper.find('table').exists()).toBe(false)
    expect(alerts.error).toHaveBeenCalledTimes(1)
    await alerts.error.mock.calls[0][1].action.handler()
    await flush()
    expect(store.getAll).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('tbody tr').map((row) => row.findAll('td')[1].text())).toEqual(['РВБ', 'Озон'])
    wrapper.unmount()
  })

  it('leaves a configured row intact when deletion is canceled', async () => {
    confirm.mockResolvedValueOnce(false)
    const wrapper = await mountTable()
    await wrapper.get(`[data-testid="register-output-delete-${COMPANY_REGISTER_OUTPUT_TYPES[0]}"]`).trigger('click')
    await flush()
    expect(store.deleteRegisterOutputFormat).not.toHaveBeenCalled()
    expect(wrapper.findAll('tbody tr')[0].text()).toContain('Настроен')
    wrapper.unmount()
  })
})
