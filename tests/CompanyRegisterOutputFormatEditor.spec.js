/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CompanyRegisterOutputFormatEditor from '@/components/CompanyRegisterOutputFormatEditor.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import {
  COMPANY_REGISTER_OUTPUT_TYPES,
  OFFERED_COMPANY_REGISTER_OUTPUT_TYPES
} from '@/helpers/company.constants.js'

const confirm = vi.fn()
const companiesStore = {
  companies: [],
  getAll: vi.fn(),
  getRegisterOutputColumns: vi.fn(),
  getRegisterOutputFormat: vi.fn(),
  saveRegisterOutputFormat: vi.fn(),
  deleteRegisterOutputFormat: vi.fn()
}
const alertStore = reactive({ alert: null, activePageHosts: 0, success: vi.fn(), error: vi.fn(), dismiss: vi.fn() })
vi.mock('@/stores/companies.store.js', () => ({ useCompaniesStore: () => companiesStore }))
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => alertStore }))
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => confirm }))

const flush = async () => { await Promise.resolve(); await Promise.resolve(); await nextTick() }
const vuetify = createVuetify({ components, directives })
const catalog = {
  inputColumns: [{ columnId: 101, name: 'Исходное поле' }],
  generatedColumns: [{ generatedKey: 'restrictionReason', name: 'Причина запрета', importOnly: false }]
}

const ActionButtonStub = {
  name: 'ActionButton',
  props: ['disabled'],
  emits: ['click'],
  inheritAttrs: false,
  template: '<button type="button" :aria-label="$attrs[\'aria-label\']" :disabled="disabled" @click="$emit(\'click\')"></button>'
}

function entryRows(wrapper) {
  return wrapper.findAll('.register-output-editor__entry-row')
}

async function chooseInput(wrapper, columnId) {
  await wrapper.get('button[aria-label="Добавить исходный столбец"]').trigger('click')
  await wrapper.get('select[aria-label="Исходный столбец"]').setValue(String(columnId))
}

async function chooseGenerated(wrapper, generatedKey) {
  await wrapper.get('button[aria-label="Добавить вычисляемый столбец"]').trigger('click')
  await wrapper.get('select[aria-label="Вычисляемый столбец"]').setValue(generatedKey)
}

async function mountEditor(waitForLoad = true) {
  const wrapper = mount(CompanyRegisterOutputFormatEditor, {
    props: { companyId: 42 }, global: { plugins: [vuetify], stubs: { ActionButton: ActionButtonStub } }
  })
  if (waitForLoad) {
    await vi.waitFor(() => expect(wrapper.find('.register-output-editor__add-row').exists()).toBe(true))
  } else {
    await vi.waitFor(() => expect(alertStore.error).toHaveBeenCalledTimes(1))
  }
  return wrapper
}

describe('company register output format editor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    alertStore.alert = null
    alertStore.error.mockReset()
    companiesStore.companies = [
      { id: 2, shortName: 'РВБ' },
      { id: 1, shortName: 'Озон' },
      { id: 8, shortName: 'ГТК' }
    ]
    companiesStore.getAll.mockResolvedValue()
    companiesStore.getRegisterOutputColumns.mockResolvedValue(catalog)
    companiesStore.getRegisterOutputFormat.mockResolvedValue(null)
    companiesStore.saveRegisterOutputFormat.mockResolvedValue(true)
    companiesStore.deleteRegisterOutputFormat.mockResolvedValue(true)
    confirm.mockResolvedValue(true)
  })

  it('offers WbrN and Ozon while keeping GTC available to the routed editor', async () => {
    const wrapper = await mountEditor()
    expect(companiesStore.getRegisterOutputColumns.mock.calls.map(([type]) => type))
      .toEqual(OFFERED_COMPANY_REGISTER_OUTPUT_TYPES)
    expect(companiesStore.getRegisterOutputFormat.mock.calls.map(([id, type]) => [id, type]))
      .toEqual(OFFERED_COMPANY_REGISTER_OUTPUT_TYPES.map((registerType) => [42, registerType]))
    expect(companiesStore.getAll).toHaveBeenCalledTimes(1)
    expect(wrapper.get('select#register-output-type').text()).toContain('РВБ')
    expect(wrapper.get('select#register-output-type').text()).not.toContain('ГТК')
    expect(wrapper.text()).not.toContain('Формат компании не настроен')
    wrapper.unmount()
  })

  it('disables Save until the layout contains a savable column', async () => {
    const wrapper = await mountEditor()
    const saveButton = () => wrapper.findAll('button').find((button) => button.text() === 'Сохранить формат')
    expect(saveButton().attributes('disabled')).toBeDefined()
    await wrapper.get('button[aria-label="Добавить пустой столбец"]').trigger('click')
    expect(saveButton().attributes('disabled')).toBeDefined()
    await chooseInput(wrapper, 101)
    expect(saveButton().attributes('disabled')).toBeUndefined()
    await wrapper.get('button[aria-label="Убрать столбец 2"]').trigger('click')
    expect(saveButton().attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('Формат компании не настроен')
    wrapper.unmount()
  })

  it('edits the routed register type without embedded navigation or action controls', async () => {
    const ozonType = COMPANY_REGISTER_OUTPUT_TYPES[1]
    companiesStore.getRegisterOutputFormat.mockImplementation(async (id, type) =>
      type === ozonType
        ? { schemaVersion: 1, registerType: type, entries: [{ kind: 'flexibleBlock' }] }
        : null)
    const wrapper = mount(CompanyRegisterOutputFormatEditor, {
      props: { companyId: 42, initialRegisterType: ozonType, standalone: true },
      global: { plugins: [vuetify], stubs: { ActionButton: ActionButtonStub } }
    })
    await flush()
    expect(wrapper.find('#register-output-type').exists()).toBe(false)
    expect(wrapper.find('h2').exists()).toBe(false)
    await vi.waitFor(() => expect(entryRows(wrapper)).toHaveLength(1))
    expect(wrapper.find('button[aria-label="Добавить все исходные столбцы"]').exists()).toBe(false)
    expect(companiesStore.getRegisterOutputFormat.mock.calls.map(([, type]) => type)).toEqual([ozonType])
    expect(wrapper.findAll('button').some((button) => button.text() === 'Сохранить формат')).toBe(false)
    expect(await wrapper.vm.save()).toBe(true)
    expect(companiesStore.saveRegisterOutputFormat.mock.calls[0][1]).toBe(ozonType)
    await wrapper.setProps({ initialRegisterType: COMPANY_REGISTER_OUTPUT_TYPES[2] })
    await vi.waitFor(() => expect(companiesStore.getRegisterOutputFormat).toHaveBeenCalledTimes(2))
    expect(companiesStore.getRegisterOutputFormat.mock.calls[1][1]).toBe(COMPANY_REGISTER_OUTPUT_TYPES[2])
    await vi.waitFor(() => expect(wrapper.find('.register-output-editor__add-row').exists()).toBe(true))
    wrapper.unmount()
  })

  it('shows one load error and retries the offered catalogs without discarding the editor', async () => {
    companiesStore.getRegisterOutputColumns.mockRejectedValueOnce(new Error('offline'))
    const wrapper = await mountEditor(false)
    expect(alertStore.error).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Форматы выгрузки реестров')
    await alertStore.error.mock.calls[0][1].action.handler()
    await flush()
    expect(companiesStore.getRegisterOutputColumns).toHaveBeenCalledTimes(4)
    expect(wrapper.get('.register-output-editor__add-row').exists()).toBe(true)
    wrapper.unmount()
  })

  it('retries company-name loading before showing the editor fields', async () => {
    companiesStore.getAll.mockRejectedValueOnce(new Error('offline'))
    const wrapper = await mountEditor(false)
    expect(wrapper.find('select[aria-label="Исходный столбец"]').exists()).toBe(false)
    expect(alertStore.error).toHaveBeenCalledTimes(1)
    await alertStore.error.mock.calls[0][1].action.handler()
    await flush()
    expect(companiesStore.getAll).toHaveBeenCalledTimes(2)
    expect(wrapper.get('select#register-output-type').text()).toContain('РВБ')
    expect(wrapper.get('.register-output-editor__add-row').exists()).toBe(true)
    expect(wrapper.find('select[aria-label="Исходный столбец"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('preserves unsaved edits across types and saves only the selected layout in order', async () => {
    const wrapper = await mountEditor()
    await chooseInput(wrapper, 101)
    const flex = wrapper.get('button[aria-label="Добавить гибкий блок"]')
    await flex.trigger('click')
    const empty = wrapper.get('button[aria-label="Добавить пустой столбец"]')
    await empty.trigger('click')
    await wrapper.get('select#register-output-type').setValue(String(COMPANY_REGISTER_OUTPUT_TYPES[1]))
    expect(entryRows(wrapper)).toHaveLength(0)
    await wrapper.get('select#register-output-type').setValue(String(COMPANY_REGISTER_OUTPUT_TYPES[0]))
    expect(entryRows(wrapper)).toHaveLength(3)
    await wrapper.get('button[aria-label="Поднять столбец 3"]').trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'Сохранить формат').trigger('click')
    await flush()
    expect(companiesStore.saveRegisterOutputFormat).toHaveBeenCalledWith(42, COMPANY_REGISTER_OUTPUT_TYPES[0], {
      schemaVersion: 1,
      registerType: COMPANY_REGISTER_OUTPUT_TYPES[0],
      entries: [{ kind: 'input', columnId: 101 }, { kind: 'empty' }, { kind: 'flexibleBlock' }]
    })
    expect(alertStore.success).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('renders the ordered format as a four-column table with compact row actions', async () => {
    const wrapper = await mountEditor()
    expect(wrapper.findAll('.register-output-editor__table thead th').map((cell) => cell.text()))
      .toEqual(['', 'Порядковый номер', 'Название столбца', 'Тип'])
    expect(wrapper.get('.table-card .v-data-table.interlaced-table').exists()).toBe(true)
    await chooseInput(wrapper, 101)
    await chooseGenerated(wrapper, 'restrictionReason')
    await wrapper.get('button[aria-label="Добавить гибкий блок"]').trigger('click')
    await wrapper.get('button[aria-label="Добавить пустой столбец"]').trigger('click')
    await flush()
    expect(entryRows(wrapper).map((row) => row.findAll('td').map((cell) => cell.text())))
      .toEqual([
        ['', '1', 'Исходное поле', 'исходный'],
        ['', '2', 'Причина запрета', 'вычисляемый'],
        ['', '3', 'Блок дополнительных столбцов из файла', 'исходный'],
        ['', '4', '', 'пустой']
      ])
    expect(entryRows(wrapper)[0].findAll('td')[0].findAll('button')).toHaveLength(3)
    expect(wrapper.get('.register-output-editor__add-row').findAll('td')).toHaveLength(4)
    expect(wrapper.get('button[aria-label="Поднять столбец 1"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[aria-label="Опустить столбец 4"]').attributes('disabled')).toBeDefined()
    await wrapper.get('button[aria-label="Опустить столбец 1"]').trigger('click')
    expect(entryRows(wrapper).map((row) => row.findAll('td')[2].text()))
      .toEqual(['Причина запрета', 'Исходное поле', 'Блок дополнительных столбцов из файла', ''])
    wrapper.unmount()
  })

  it('reveals one selector at a time and closes it after a column is chosen', async () => {
    const wrapper = await mountEditor()
    expect(wrapper.find('select[aria-label="Исходный столбец"]').exists()).toBe(false)
    await wrapper.get('button[aria-label="Добавить исходный столбец"]').trigger('click')
    expect(wrapper.get('select[aria-label="Исходный столбец"]').exists()).toBe(true)
    await wrapper.get('button[aria-label="Добавить вычисляемый столбец"]').trigger('click')
    expect(wrapper.find('select[aria-label="Исходный столбец"]').exists()).toBe(false)
    expect(wrapper.get('select[aria-label="Вычисляемый столбец"]').exists()).toBe(true)
    await wrapper.get('button[aria-label="Добавить вычисляемый столбец"]').trigger('click')
    expect(wrapper.find('select[aria-label="Вычисляемый столбец"]').exists()).toBe(false)
    await wrapper.get('button[aria-label="Добавить исходный столбец"]').trigger('click')
    await wrapper.get('button[aria-label="Добавить гибкий блок"]').trigger('click')
    expect(wrapper.find('select[aria-label="Исходный столбец"]').exists()).toBe(false)
    await chooseInput(wrapper, 101)
    expect(wrapper.find('select[aria-label="Исходный столбец"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('sorts RLColumn choices and adds all source columns by ID without losing other draft entries', async () => {
    companiesStore.getRegisterOutputColumns.mockResolvedValue({
      inputColumns: [
        { columnId: 101, name: 'Сто один' },
        { columnId: 3, name: 'Три' },
        { columnId: 52, name: 'Пятьдесят два' }
      ],
      generatedColumns: []
    })
    const wrapper = await mountEditor()
    await wrapper.get('button[aria-label="Добавить исходный столбец"]').trigger('click')
    expect(wrapper.findAll('select[aria-label="Исходный столбец"] option').map((option) => option.attributes('value')))
      .toEqual(['', '3', '52', '101'])
    await wrapper.get('select[aria-label="Исходный столбец"]').setValue('52')
    await wrapper.get('button[aria-label="Добавить пустой столбец"]').trigger('click')
    await wrapper.get('button[aria-label="Добавить все исходные столбцы"]').trigger('click')
    expect(entryRows(wrapper).map((row) => row.findAll('td')[2].text()))
      .toEqual(['Три', 'Пятьдесят два', 'Сто один', ''])
    expect(wrapper.get('button[aria-label="Добавить все исходные столбцы"]').attributes('disabled')).toBeDefined()
    await wrapper.findAll('button').find((button) => button.text() === 'Сохранить формат').trigger('click')
    await flush()
    expect(companiesStore.saveRegisterOutputFormat.mock.calls[0][2].entries).toEqual([
      { kind: 'input', columnId: 3 },
      { kind: 'input', columnId: 52 },
      { kind: 'input', columnId: 101 },
      { kind: 'empty' }
    ])
    expect(wrapper.find('button[aria-label="Добавить все исходные столбцы"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('publishes blank-only and duplicate validation through the page alert store', async () => {
    const wrapper = await mountEditor()
    await wrapper.get('button[aria-label="Добавить пустой столбец"]').trigger('click')
    expect(wrapper.findAll('button').find((button) => button.text() === 'Сохранить формат').attributes('disabled')).toBeDefined()
    await wrapper.vm.save()
    expect(alertStore.error).toHaveBeenCalledWith('Добавьте исходный, вычисляемый столбец или гибкий блок')
    expect(companiesStore.saveRegisterOutputFormat).not.toHaveBeenCalled()
    await chooseInput(wrapper, 101)
    await chooseInput(wrapper, 101)
    await flush()
    expect(alertStore.error).toHaveBeenCalledWith('Этот столбец уже добавлен')
    const flex = wrapper.get('button[aria-label="Добавить гибкий блок"]')
    await flex.trigger('click')
    await flex.trigger('click')
    expect(alertStore.error).toHaveBeenCalledWith('Блок дополнительных столбцов уже добавлен')
    wrapper.unmount()
  })

  it('shows validation in the existing page alert area instead of under editor controls', async () => {
    alertStore.error.mockImplementation((message) => {
      alertStore.alert = { id: 1, severity: 'error', message, title: '', action: null }
    })
    const wrapper = mount({
      components: { PageAlertRegion, CompanyRegisterOutputFormatEditor },
      template: '<div><PageAlertRegion /><CompanyRegisterOutputFormatEditor :company-id="42" /></div>'
    }, { global: { plugins: [vuetify], stubs: { ActionButton: ActionButtonStub } } })
    await vi.waitFor(() => expect(wrapper.find('.register-output-editor__add-row').exists()).toBe(true))
    await wrapper.get('button[aria-label="Добавить исходный столбец"]').trigger('click')
    await wrapper.get('select[aria-label="Исходный столбец"]').setValue('')
    expect(wrapper.get('[data-testid="page-alert-region"] [role="alert"]').text()).toContain('Выберите исходный столбец')
    expect(wrapper.find('.register-output-editor .invalid-feedback').exists()).toBe(false)
    wrapper.unmount()
  })

  it('adds generated fields, rejects duplicates, and removes individual rows', async () => {
    const wrapper = await mountEditor()
    await wrapper.get('button[aria-label="Добавить исходный столбец"]').trigger('click')
    await wrapper.get('select[aria-label="Исходный столбец"]').setValue('')
    expect(alertStore.error).toHaveBeenCalledWith('Выберите исходный столбец')
    await wrapper.get('button[aria-label="Добавить вычисляемый столбец"]').trigger('click')
    await wrapper.get('select[aria-label="Вычисляемый столбец"]').setValue('')
    expect(alertStore.error).toHaveBeenCalledWith('Выберите вычисляемый столбец')
    await wrapper.get('select[aria-label="Вычисляемый столбец"]').setValue('restrictionReason')
    expect(entryRows(wrapper)).toHaveLength(1)
    expect(wrapper.text()).toContain('Причина запрета')
    await chooseGenerated(wrapper, 'restrictionReason')
    expect(alertStore.error).toHaveBeenCalledWith('Этот столбец уже добавлен')
    await wrapper.get('button[aria-label="Убрать столбец 1"]').trigger('click')
    expect(entryRows(wrapper)).toHaveLength(0)
    wrapper.unmount()
  })

  it('keeps failed edits and publishes entry validation through the page alert store', async () => {
    const wrapper = await mountEditor()
    await wrapper.get('button[aria-label="Добавить гибкий блок"]').trigger('click')
    const failure = Object.assign(new Error('invalid'), { data: { details: [{ entryIndex: 0, message: 'Неверный блок' }] } })
    companiesStore.saveRegisterOutputFormat.mockRejectedValueOnce(failure)
    await wrapper.findAll('button').find((button) => button.text() === 'Сохранить формат').trigger('click')
    await flush()
    expect(entryRows(wrapper)).toHaveLength(1)
    expect(alertStore.error).toHaveBeenCalledExactlyOnceWith('Столбец 1: Неверный блок')
    wrapper.unmount()
  })

  it('retries a transport failure for the original type after switching', async () => {
    const wrapper = await mountEditor()
    await wrapper.get('button[aria-label="Добавить гибкий блок"]').trigger('click')
    companiesStore.saveRegisterOutputFormat.mockRejectedValueOnce(new Error('offline'))
    await wrapper.findAll('button').find((button) => button.text() === 'Сохранить формат').trigger('click')
    await flush()
    expect(entryRows(wrapper)).toHaveLength(1)
    expect(alertStore.error).toHaveBeenCalledTimes(1)
    await wrapper.get('select#register-output-type').setValue(String(COMPANY_REGISTER_OUTPUT_TYPES[1]))
    await alertStore.error.mock.calls[0][1].action.handler()
    expect(companiesStore.saveRegisterOutputFormat.mock.calls[1][1]).toBe(COMPANY_REGISTER_OUTPUT_TYPES[0])
    wrapper.unmount()
  })

  it('removes only the selected saved format after confirmation', async () => {
    companiesStore.getRegisterOutputFormat.mockImplementation(async (id, type) =>
      type === COMPANY_REGISTER_OUTPUT_TYPES[1]
        ? { schemaVersion: 1, registerType: type, entries: [{ kind: 'flexibleBlock' }] }
        : null)
    const wrapper = await mountEditor()
    await wrapper.get('select#register-output-type').setValue(String(COMPANY_REGISTER_OUTPUT_TYPES[1]))
    expect(wrapper.findAll('button').some((button) => button.text() === 'Удалить формат')).toBe(true)
    await wrapper.findAll('button').find((button) => button.text() === 'Удалить формат').trigger('click')
    await flush()
    expect(companiesStore.deleteRegisterOutputFormat).toHaveBeenCalledWith(42, COMPANY_REGISTER_OUTPUT_TYPES[1])
    expect(wrapper.findAll('button').some((button) => button.text() === 'Удалить формат')).toBe(false)
    wrapper.unmount()
  })

  it('keeps a saved format on delete failure and retries that type without asking again', async () => {
    companiesStore.getRegisterOutputFormat.mockImplementation(async (id, type) =>
      type === COMPANY_REGISTER_OUTPUT_TYPES[1]
        ? { schemaVersion: 1, registerType: type, entries: [{ kind: 'flexibleBlock' }] }
        : null)
    companiesStore.deleteRegisterOutputFormat.mockRejectedValueOnce(new Error('offline'))
    const wrapper = await mountEditor()
    await wrapper.get('select#register-output-type').setValue(String(COMPANY_REGISTER_OUTPUT_TYPES[1]))
    await wrapper.findAll('button').find((button) => button.text() === 'Удалить формат').trigger('click')
    await flush()
    expect(wrapper.findAll('button').some((button) => button.text() === 'Удалить формат')).toBe(true)
    expect(alertStore.error).toHaveBeenCalledTimes(1)
    await wrapper.get('select#register-output-type').setValue(String(COMPANY_REGISTER_OUTPUT_TYPES[0]))
    await alertStore.error.mock.calls[0][1].action.handler()
    expect(companiesStore.deleteRegisterOutputFormat.mock.calls[1][1]).toBe(COMPANY_REGISTER_OUTPUT_TYPES[1])
    expect(confirm).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
