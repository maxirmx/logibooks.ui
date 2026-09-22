/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import CompanyRegisterOutputFormatEditView from '@/views/CompanyRegisterOutputFormat_EditView.vue'
import { COMPANY_REGISTER_OUTPUT_TYPES } from '@/helpers/company.constants.js'

const { push, editorSave, alerts } = vi.hoisted(() => ({
  push: vi.fn(), editorSave: vi.fn(), alerts: { error: vi.fn() }
}))
vi.mock('@/router', () => ({ default: { push } }))
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => alerts }))
vi.mock('@/stores/companies.store.js', () => ({ useCompaniesStore: () => ({
  companies: [
    { id: 2, shortName: '', name: 'ООО "РВБ"' },
    { id: 1, shortName: 'Озон' },
    { id: 8, shortName: 'ГТК' },
    { id: 42, shortName: 'Получатель', name: 'ООО "Получатель"' },
    { id: 43, shortName: '', name: 'ООО "Заказчик"' }
  ]
}) }))

const ActionButtonStub = {
  name: 'ActionButton',
  props: ['disabled', 'tooltipText'],
  emits: ['click'],
  inheritAttrs: false,
  template: '<button type="button" :data-testid="$attrs[\'data-testid\']" :disabled="disabled" @click="$emit(\'click\')">{{ tooltipText }}</button>'
}
const editorCanSave = ref(true)
const EditorStub = defineComponent({
  name: 'CompanyRegisterOutputFormatEditor',
  props: {
    companyId: Number,
    initialRegisterType: Number,
    standalone: Boolean
  },
  setup(props, { expose }) {
    expose({ save: editorSave, loading: false, saving: false, canSave: editorCanSave })
    return () => h('div', { 'data-testid': 'editor' }, `${props.companyId}:${props.initialRegisterType}`)
  }
})

function mountPage(type = COMPANY_REGISTER_OUTPUT_TYPES[0], companyId = 42) {
  return mount(CompanyRegisterOutputFormatEditView, {
    props: { id: companyId, registerType: type },
    global: { stubs: {
      ActionButton: ActionButtonStub,
      PageAlertRegion: true,
      CompanyRegisterOutputFormatEditor: EditorStub
    } }
  })
}

describe('routed company register output format editor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    push.mockReset().mockResolvedValue()
    editorSave.mockReset().mockResolvedValue(true)
    editorCanSave.value = true
  })

  it.each([
    [COMPANY_REGISTER_OUTPUT_TYPES[0], 'ООО "РВБ"'],
    [COMPANY_REGISTER_OUTPUT_TYPES[1], 'Озон'],
    [COMPANY_REGISTER_OUTPUT_TYPES[2], 'ГТК']
  ])('opens the %s editor with both company names and returns to its company on save', async (value, label) => {
    const wrapper = mountPage(value)
    expect(wrapper.get('h1').findAll('span').map((span) => span.text()))
      .toEqual(['Формат выгрузки реестра', `${label} → Получатель`])
    expect(wrapper.get('.register-output-heading__company').exists()).toBe(true)
    expect(wrapper.get('[data-testid="editor"]').text()).toBe(`42:${value}`)
    const editor = wrapper.findComponent(EditorStub)
    expect(editor.props('standalone')).toBe(true)
    await vi.waitFor(() => expect(wrapper.get('[data-testid="register-output-save-action"]').attributes('disabled')).toBeUndefined())
    await wrapper.get('[data-testid="register-output-save-action"]').trigger('click')
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/company/edit/42'))
    expect(editorSave).toHaveBeenCalledTimes(1)
  })

  it('uses the configuration company full name when its short name is absent', () => {
    const wrapper = mountPage(COMPANY_REGISTER_OUTPUT_TYPES[1], 43)
    expect(wrapper.get('.register-output-heading__company').text()).toBe('Озон → ООО "Заказчик"')
    expect(wrapper.get('[data-testid="editor"]').text()).toBe(`${43}:${COMPANY_REGISTER_OUTPUT_TYPES[1]}`)
  })

  it('disables header Save while the layout has no savable column', async () => {
    editorCanSave.value = false
    const wrapper = mountPage()
    const saveButton = wrapper.get('[data-testid="register-output-save-action"]')
    expect(saveButton.attributes('disabled')).toBeDefined()
    await saveButton.trigger('click')
    expect(editorSave).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="register-output-cancel-action"]').attributes('disabled')).toBeUndefined()
    editorCanSave.value = true
    await wrapper.vm.$nextTick()
    expect(saveButton.attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('keeps the page open and its draft intact after validation fails', async () => {
    editorSave.mockResolvedValueOnce(false)
    const wrapper = mountPage()
    await vi.waitFor(() => expect(wrapper.get('[data-testid="register-output-save-action"]').attributes('disabled')).toBeUndefined())
    await wrapper.get('[data-testid="register-output-save-action"]').trigger('click')
    await vi.waitFor(() => expect(editorSave).toHaveBeenCalledTimes(1))
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="editor"]').exists()).toBe(true)
  })

  it('returns to company settings from the header cancel action', async () => {
    const wrapper = mountPage()
    await wrapper.get('[data-testid="register-output-cancel-action"]').trigger('click')
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/company/edit/42'))
    expect(editorSave).not.toHaveBeenCalled()
  })

  it('shows one retryable error when returning to the company fails', async () => {
    push.mockRejectedValueOnce(new Error('navigation failed'))
    const wrapper = mountPage()
    await wrapper.get('[data-testid="register-output-cancel-action"]').trigger('click')
    await vi.waitFor(() => expect(alerts.error).toHaveBeenCalledTimes(1))
    expect(wrapper.get('[data-testid="editor"]').exists()).toBe(true)
    await alerts.error.mock.calls[0][1].action.handler()
    expect(push).toHaveBeenCalledTimes(2)
  })
})
