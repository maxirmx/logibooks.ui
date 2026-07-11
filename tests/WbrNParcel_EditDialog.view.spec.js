/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { resolveAll } from './helpers/test-utils.js'
import { DEC_REPORT_UPLOADED_EVENT } from '@/helpers/dec.report.events.js'
import { CheckStatusCode } from '@/helpers/check.status.code.js'
import {
  CUSTOMS_PROCEDURE_EXPORT,
  CUSTOMS_PROCEDURE_IMPORT
} from '@/helpers/customs.procedure.helpers.js'

let WbrNParcelEditDialog
let confirmMock = null
let routeQuery = {}
let formValues = {}

const routerPush = vi.fn()
const routerReplace = vi.fn()
const handleFellowsClick = vi.fn()
const validateParcelData = vi.fn().mockResolvedValue()
const approveParcel = vi.fn().mockResolvedValue()
const approveParcelWithExcise = vi.fn().mockResolvedValue({ tnVed: '6403999300' })
const approveParcelWithNotification = vi.fn().mockResolvedValue()
const generateXml = vi.fn().mockResolvedValue()
const deleteProductImage = vi.fn().mockResolvedValue()
const runCheckStatusAction = vi.fn().mockResolvedValue()
const openImageOverlay = vi.fn().mockResolvedValue()
const closeImageOverlay = vi.fn()
const imageOverlayOpen = ref(false)
const imageUrl = ref(null)
const imageLoading = ref(false)

const parcelItem = ref({})
const parcelLoading = ref(false)
const registerItem = ref({ id: 12, registerType: 2097154, dealNumber: 'WBRN-12' })
const stopWords = ref([])
const feacnOrders = ref([])
const feacnPrefixes = ref([])
const alertRef = ref(null)

const statusEnsureLoaded = vi.fn().mockResolvedValue()
const stopWordsEnsureLoaded = vi.fn().mockResolvedValue()
const keyWordsEnsureLoaded = vi.fn().mockResolvedValue()
const feacnOrdersEnsureLoaded = vi.fn().mockResolvedValue()
const feacnPrefixesEnsureLoaded = vi.fn().mockResolvedValue()
const registerGetById = vi.fn().mockResolvedValue()
const parcelGetById = vi.fn().mockResolvedValue()
const parcelUpdate = vi.fn().mockResolvedValue()
const parcelLookupFeacnCode = vi.fn().mockResolvedValue()
const parcelClearCheckStatus = vi.fn().mockResolvedValue()
const parcelCheckForDuplicate = vi.fn().mockResolvedValue()
const parcelCheckPassport = vi.fn().mockResolvedValue()
const parcelClearPassportCheck = vi.fn().mockResolvedValue()
const parcelViewsAdd = vi.fn().mockResolvedValue()
const parcelViewsBack = vi.fn().mockResolvedValue(null)
const nextParcels = vi.fn().mockResolvedValue({ withoutIssues: null, withIssues: null })
const alertError = vi.fn()
const alertClear = vi.fn()
const setFieldValue = vi.fn((name, value) => {
  formValues[name] = value
})

const authIsSrLogistPlus = ref(true)
const authStore = {
  selectedParcelId: null,
  isAdmin: ref(false),
  get isSrLogistPlus() {
    return authIsSrLogistPlus.value
  }
}
const registerOps = {
  passportCheckStatuses: [
    { value: 0, code: 'NotChecked', name: 'Не проверен' },
    { value: 10, code: 'InProgress', name: 'В процессе' },
    { value: 30, code: 'Checked', name: 'Проверен' }
  ]
}

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      const refs = {}
      Object.keys(store).forEach((key) => {
        const value = store[key]
        if (value && typeof value === 'object' && 'value' in value) {
          refs[key] = value
        }
      })
      return refs
    }
  }
})

vi.mock('@/router', () => ({
  default: {
    push: routerPush,
    replace: routerReplace
  }
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRoute: () => ({ query: routeQuery })
  }
})

vi.mock('@/helpers/parcel.number.ext.helpers.js', () => ({
  handleFellowsClick
}))

vi.mock('@/helpers/parcel.actions.helpers.js', () => ({
  validateParcelData,
  approveParcel,
  approveParcelWithExcise,
  approveParcelWithNotification,
  generateXml,
  deleteProductImage,
  runCheckStatusAction
}))

vi.mock('@/helpers/parcel.image.overlay.js', () => ({
  useParcelImageOverlay: () => ({
    imageOverlayOpen,
    imageUrl,
    imageLoading,
    openImageOverlay,
    closeImageOverlay
  })
}))

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    item: parcelItem,
    loading: parcelLoading,
    getById: parcelGetById,
    update: parcelUpdate,
    lookupFeacnCode: parcelLookupFeacnCode,
    clearCheckStatus: parcelClearCheckStatus,
    checkForDuplicate: parcelCheckForDuplicate,
    checkPassport: parcelCheckPassport,
    clearPassportCheck: parcelClearPassportCheck
  })
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    ensureLoaded: statusEnsureLoaded,
    parcelStatuses: [
      { id: 5, title: 'В работе', useAtCustomsProcessing: true },
      { id: 6, title: 'Не выгружать', useAtCustomsProcessing: false }
    ]
  })
}))

vi.mock('@/stores/stop.words.store.js', () => ({
  useStopWordsStore: () => ({
    ensureLoaded: stopWordsEnsureLoaded,
    stopWords
  })
}))

vi.mock('@/stores/key.words.store.js', () => ({
  useKeyWordsStore: () => ({
    ensureLoaded: keyWordsEnsureLoaded
  })
}))

vi.mock('@/stores/feacn.orders.store.js', () => ({
  useFeacnOrdersStore: () => ({
    ensureLoaded: feacnOrdersEnsureLoaded,
    orders: feacnOrders
  })
}))

vi.mock('@/stores/feacn.prefixes.store.js', () => ({
  useFeacnPrefixesStore: () => ({
    ensureLoaded: feacnPrefixesEnsureLoaded,
    prefixes: feacnPrefixes
  })
}))

vi.mock('@/stores/parcel.views.store.js', () => ({
  useParcelViewsStore: () => ({
    add: parcelViewsAdd,
    back: parcelViewsBack
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    item: registerItem,
    ops: registerOps,
    getById: registerGetById,
    nextParcels
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: alertRef,
    error: alertError,
    clear: alertClear
  })
}))

const baseParcel = {
  id: 3,
  registerId: 12,
  shk: 'SHK-N-EDIT',
  article: '29817781',
  notificationId: 44,
  productLink: 'https://www.wildberries.ru/catalog/29817781/detail.aspx',
  productName: 'WbrN edit product',
  description: 'Long description',
  productCountryName: 'Китай',
  weightKg: 1.25,
  quantity: 2,
  unitPrice: 19.5,
  currency: 'CNY',
  tnVed: '6403999300',
  statusId: 5,
  checkStatus: 0,
  lastName: 'Ivanov',
  firstName: 'Ivan',
  patronymic: 'Ivanovich',
  recipientCountryName: 'Узбекистан',
  recipientCity: 'Ташкент',
  recipientAddress: 'ул. Навои, 1',
  passportNumber: 'AA1234567',
  passportCheckStatus: 30,
  hasImage: true
}

const stubs = {
  Form: {
    props: ['initialValues', 'validationSchema'],
    template: '<form data-testid="form"><slot :errors="{}" :values="values" :isSubmitting="false" :setFieldValue="setFieldValue"></slot></form>',
    data() {
      return { values: formValues }
    },
    methods: {
      setFieldValue
    }
  },
  Field: {
    props: ['name', 'id', 'as', 'rows', 'class'],
    computed: {
      classes() {
        return this.class
      }
    },
    template: '<textarea v-if="as === \'textarea\'" :name="name" :id="id" :class="classes"></textarea><input v-else :name="name" :id="id" :class="classes" />'
  },
  ParcelHeaderActionsBar: {
    props: ['downloadDisabled', 'lookupDisabled', 'disabled', 'actionsDisabled'],
    emits: ['next-parcel', 'next-issue', 'back', 'save', 'lookup', 'cancel', 'download'],
    template: `
      <div data-testid="parcel-header-actions" :data-download-disabled="String(downloadDisabled)" :data-lookup-disabled="String(lookupDisabled)" :data-actions-disabled="String(actionsDisabled)">
        <button data-testid="next-parcel" :disabled="disabled || actionsDisabled" @click="$emit('next-parcel')"></button>
        <button data-testid="next-issue" :disabled="disabled || actionsDisabled" @click="$emit('next-issue')"></button>
        <button data-testid="back" :disabled="disabled || actionsDisabled" @click="$emit('back')"></button>
        <button data-testid="save" :disabled="disabled || actionsDisabled" @click="$emit('save')"></button>
        <button data-testid="lookup" :disabled="disabled || actionsDisabled" @click="$emit('lookup')"></button>
        <button data-testid="cancel" :disabled="disabled" @click="$emit('cancel')"></button>
        <button data-testid="download" :disabled="disabled || actionsDisabled" @click="$emit('download')"></button>
      </div>
    `
  },
  ParcelStatusSection: {
    props: ['item', 'values', 'disabled', 'clearCheckStatusDisabled'],
    emits: ['validate-sw', 'validate-sw-ex', 'validate-fc', 'approve', 'approve-excise', 'clear-check-status', 'check-for-duplicate'],
    template: `
      <div data-testid="parcel-status-section" :data-disabled="String(disabled)" :data-clear-disabled="String(clearCheckStatusDisabled)">
        <button data-testid="validate-sw" :disabled="disabled" @click="$emit('validate-sw', values)"></button>
        <button data-testid="validate-sw-ex" :disabled="disabled" @click="$emit('validate-sw-ex', values)"></button>
        <button data-testid="validate-fc" :disabled="disabled" @click="$emit('validate-fc', values)"></button>
        <button data-testid="approve" :disabled="disabled" @click="$emit('approve', values)"></button>
        <button data-testid="approve-excise" :disabled="disabled" @click="$emit('approve-excise', values)"></button>
        <button data-testid="clear-check-status" :disabled="clearCheckStatusDisabled" @click="$emit('clear-check-status', values)"></button>
        <button data-testid="check-for-duplicate" :disabled="disabled" @click="$emit('check-for-duplicate', values)"></button>
      </div>
    `
  },
  FeacnCodeEditor: {
    props: ['columnTitles', 'columnTooltips', 'disabled'],
    emits: ['update:item', 'overlay-state-changed', 'set-running-action'],
    template: '<div data-testid="feacn-code-editor" :data-tnved-title="columnTitles.tnVed" :data-weight-tooltip="columnTooltips.weightKg" :data-disabled="String(disabled)"><button data-testid="update-item" @click="$emit(\'update:item\', { id: 99, shk: \'SHK-UPDATED\' })"></button><button data-testid="overlay-on" @click="$emit(\'overlay-state-changed\', true)"></button><button data-testid="overlay-off" @click="$emit(\'overlay-state-changed\', false)"></button><button data-testid="running-on" @click="$emit(\'set-running-action\', true)"></button><button data-testid="running-off" @click="$emit(\'set-running-action\', false)"></button></div>'
  },
  WbrNFormField: {
    props: ['name', 'fullWidth', 'type', 'step', 'disabled'],
    template: '<div data-testid="wbrn-form-field" :data-name="name" :data-full-width="String(fullWidth)" :data-type="type" :data-step="step" :data-disabled="String(disabled)">{{ name }}</div>'
  },
  ParcelWeightAutoField: {
    props: ['fieldComponent', 'label'],
    template: '<div data-testid="parcel-weight-auto-field" :data-label="label"><component :is="fieldComponent" name="weightKg" :errors="{}" :full-width="false" /></div>'
  },
  ActionButton: {
    props: ['item', 'disabled', 'tooltipText'],
    emits: ['click'],
    template: '<button type="button" data-testid="action-button" :data-tooltip="tooltipText" :disabled="disabled" @click="$emit(\'click\', item)"><slot /></button>'
  },
  ParcelNumberExt: {
    props: ['item', 'fieldName', 'disabled'],
    emits: ['fellows', 'click'],
    template: '<button type="button" data-testid="parcel-number-ext" :disabled="disabled" @click="$emit(\'click\', item)"><span>{{ item[fieldName] }}</span><span data-testid="fellows" @click.stop="$emit(\'fellows\')">fellows</span></button>'
  },
  ArticleWithH: {
    props: {
      item: { type: Object, required: true },
      disabled: { type: Boolean, default: false },
      columnTitles: { type: Object, required: true },
      inputReadonly: { type: Boolean, default: false },
      fullWidth: { type: Boolean, default: false }
    },
    emits: ['approve-notification'],
    template: '<div data-testid="article-with-h" :data-title="columnTitles.article" :data-readonly="String(inputReadonly)" :data-full-width="String(fullWidth)" :data-disabled="String(disabled)">{{ item.article }}<button type="button" data-testid="approve-notification" :disabled="disabled" @click="$emit(\'approve-notification\')"></button></div>'
  },
  ProductLinkWithActions: {
    props: ['label', 'item', 'disabled'],
    emits: ['view-image', 'delete-image'],
    template: '<div data-testid="product-link-with-actions" :data-label="label" :data-disabled="String(disabled)">{{ item.productLink }}<button type="button" data-testid="view-image" :disabled="disabled" @click="$emit(\'view-image\')"></button><button type="button" data-testid="delete-image" :disabled="disabled" @click="$emit(\'delete-image\')"></button></div>'
  },
  DTagSection: {
    props: ['item'],
    template: '<div data-testid="dtag-section">{{ item.dTag }}</div>'
  },
  ParcelImageOverlay: {
    props: ['open', 'imageUrl', 'loading'],
    emits: ['close'],
    template: '<div v-if="open" data-testid="parcel-image-overlay"><button type="button" data-testid="close-overlay" @click="$emit(\'close\')"></button></div>'
  },
  'font-awesome-icon': {
    props: ['icon'],
    template: '<i data-testid="fa-icon" :data-icon="icon" v-bind="$attrs"></i>'
  },
  'v-tooltip': {
    props: ['text', 'disabled'],
    template: '<span data-testid="v-tooltip" :data-text="text" :data-disabled="String(disabled)"><slot name="activator" :props="{ title: text }"></slot><slot></slot></span>'
  }
}

function resetState() {
  vi.clearAllMocks()
  confirmMock = vi.fn()
  routeQuery = {}
  formValues = { ...baseParcel }
  parcelItem.value = { ...baseParcel }
  parcelLoading.value = false
  registerItem.value = { id: 12, registerType: 2097154, dealNumber: 'WBRN-12', customsProcedureCode: CUSTOMS_PROCEDURE_IMPORT }
  stopWords.value = []
  feacnOrders.value = []
  feacnPrefixes.value = []
  alertRef.value = null
  authStore.selectedParcelId = null
  authIsSrLogistPlus.value = true
  imageOverlayOpen.value = false
  imageUrl.value = null
  imageLoading.value = false
  nextParcels.mockResolvedValue({ withoutIssues: null, withIssues: null })
  parcelViewsBack.mockResolvedValue(null)
  parcelUpdate.mockResolvedValue()
  parcelGetById.mockResolvedValue({ ...baseParcel })
  parcelClearPassportCheck.mockResolvedValue()
  registerGetById.mockResolvedValue({ id: 12 })
  validateParcelData.mockResolvedValue()
  approveParcel.mockResolvedValue()
  approveParcelWithExcise.mockResolvedValue({ tnVed: '6403999300' })
  approveParcelWithNotification.mockResolvedValue()
  generateXml.mockResolvedValue()
  deleteProductImage.mockResolvedValue()
  parcelCheckPassport.mockResolvedValue()
  runCheckStatusAction.mockResolvedValue()
}

async function mountDialog() {
  const TestWrapper = {
    components: { WbrNParcelEditDialog },
    template: '<Suspense><WbrNParcelEditDialog :registerId="12" :id="3" /></Suspense>'
  }
  const wrapper = mount(TestWrapper, {
    global: {
      stubs
    }
  })
  await resolveAll()
  await nextTick()
  return wrapper
}

describe('WbrNParcel_EditDialog.vue', () => {
  beforeAll(async () => {
    WbrNParcelEditDialog = (await import('@/dialogs/WbrNParcel_EditDialog.vue')).default
  })

  beforeEach(resetState)

  it('loads WbrN parcel data and renders article plus recipient replacement fields', async () => {
    const wrapper = await mountDialog()

    expect(statusEnsureLoaded).toHaveBeenCalled()
    expect(stopWordsEnsureLoaded).toHaveBeenCalled()
    expect(keyWordsEnsureLoaded).toHaveBeenCalled()
    expect(feacnOrdersEnsureLoaded).toHaveBeenCalled()
    expect(feacnPrefixesEnsureLoaded).toHaveBeenCalled()
    expect(registerGetById).toHaveBeenCalledWith(12)
    expect(parcelGetById).toHaveBeenCalledWith(3)
    expect(parcelViewsAdd).toHaveBeenCalledWith(3)
    expect(authStore.selectedParcelId).toBe(3)

    expect(wrapper.text()).toContain('посылка SHK-N-EDIT')
    expect(wrapper.get('[data-testid="article-with-h"]').attributes('data-title')).toBe('Артикул')
    expect(wrapper.get('[data-testid="article-with-h"]').attributes('data-readonly')).toBe('false')
    expect(wrapper.text()).toContain('29817781')
    expect(wrapper.get('[data-testid="product-link-with-actions"]').attributes('data-label')).toBe('Ссылка на товар')
    expect(wrapper.get('[data-testid="parcel-weight-auto-field"]').attributes('data-label')).toBe('Вес, кг')

    const fieldNames = wrapper.findAll('[data-testid="wbrn-form-field"]').map(field => field.attributes('data-name'))
    expect(fieldNames).toEqual(expect.arrayContaining([
      'productCountryName',
      'weightKg',
      'quantity',
      'unitPrice',
      'currency',
      'lastName',
      'firstName',
      'patronymic'
    ]))
    expect(wrapper.get('input[name="passportNumber"]').exists()).toBe(true)
    expect(fieldNames).not.toContain('countryCode')
    expect(fieldNames).not.toContain('paymentAmount')
    expect(fieldNames).not.toContain('paymentCurrency')
  })

  it('shows passport verification action and indicator only for Import SrLogistPlus users', async () => {
    let wrapper = await mountDialog()

    expect(wrapper.find('[data-tooltip="Проверить паспорт"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="passport-check-actions"]').exists()).toBe(true)
    const icon = wrapper.get('[data-testid="passport-check-status-icon"]')
    expect(icon.attributes('data-icon')).toBe('fa-solid fa-circle-check')
    expect(icon.classes()).toEqual(expect.arrayContaining([
      'passport-check-status__icon--color-no-issues'
    ]))

    await wrapper.get('[data-tooltip="Сохранить и проверить паспорт"]').trigger('click')
    await resolveAll()
    expect(runCheckStatusAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3 }),
      parcelCheckPassport,
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Function),
      expect.any(Object)
    )
    await wrapper.get('[data-tooltip="Очистить"]').trigger('click')
    await resolveAll()
    expect(runCheckStatusAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3 }),
      parcelClearPassportCheck,
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Function),
      expect.any(Object)
    )
    wrapper.unmount()

    resetState()
    registerItem.value = {
      ...registerItem.value,
      customsProcedureCode: CUSTOMS_PROCEDURE_EXPORT
    }
    wrapper = await mountDialog()
    expect(wrapper.find('[data-testid="passport-check-actions"]').exists()).toBe(false)
    expect(wrapper.find('[data-tooltip="Сохранить и проверить паспорт"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="passport-check-status-icon"]').exists()).toBe(false)
    wrapper.unmount()

    resetState()
    authIsSrLogistPlus.value = false
    wrapper = await mountDialog()
    expect(wrapper.find('[data-testid="passport-check-actions"]').exists()).toBe(false)
    expect(wrapper.find('[data-tooltip="Сохранить и проверить паспорт"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="passport-check-status-icon"]').exists()).toBe(false)
  })

  it('locks identity fields during passport checking but keeps clear available', async () => {
    parcelItem.value.passportCheckStatus = 10
    formValues.passportCheckStatus = 10

    const wrapper = await mountDialog()
    const fields = wrapper.findAll('[data-testid="wbrn-form-field"]')
    const fieldByName = (name) => fields.find((field) => field.attributes('data-name') === name)

    expect(fieldByName('lastName').attributes('data-disabled')).toBe('true')
    expect(fieldByName('firstName').attributes('data-disabled')).toBe('true')
    expect(fieldByName('patronymic').attributes('data-disabled')).toBe('undefined')

    const passportField = wrapper.findComponent({ name: 'PassportNumberWithActions' })
    expect(passportField.props('inputDisabled')).toBe(true)
    expect(passportField.props('checkDisabled')).toBe(true)
    expect(wrapper.get('[data-testid="passport-check-run"]').element.disabled).toBe(true)
    expect(wrapper.get('[data-testid="passport-check-clear"]').element.disabled).toBe(false)
  })

  it('shows NotChecked locally when an identity field changes', async () => {
    formValues.firstName = 'Changed name'

    const wrapper = await mountDialog()
    const passportField = wrapper.findComponent({ name: 'PassportNumberWithActions' })

    expect(passportField.props('status')).toEqual(expect.objectContaining({
      code: 'NotChecked',
      value: 0
    }))
    expect(wrapper.get('[data-testid="passport-check-status-icon"]').attributes('data-icon'))
      .toBe('fa-solid fa-circle-question')
  })

  it('disables WbrN parcel action buttons except cancel for MarkedByPartner parcels', async () => {
    const markedByPartner = CheckStatusCode.MarkedByPartner.value
    formValues = { ...baseParcel, checkStatus: markedByPartner }
    parcelItem.value = { ...baseParcel, checkStatus: markedByPartner }

    const wrapper = await mountDialog()

    expect(wrapper.get('[data-testid="parcel-header-actions"]').attributes('data-actions-disabled')).toBe('true')
    for (const testId of ['next-parcel', 'next-issue', 'back', 'save', 'lookup', 'download']) {
      expect(wrapper.get(`[data-testid="${testId}"]`).attributes('disabled')).toBeDefined()
    }
    expect(wrapper.get('[data-testid="cancel"]').attributes('disabled')).toBeUndefined()

    expect(wrapper.get('[data-testid="parcel-status-section"]').attributes('data-disabled')).toBe('true')
    expect(wrapper.get('[data-testid="parcel-status-section"]').attributes('data-clear-disabled')).toBe('true')
    for (const testId of [
      'validate-sw',
      'validate-sw-ex',
      'validate-fc',
      'approve',
      'approve-excise',
      'clear-check-status',
      'check-for-duplicate'
    ]) {
      expect(wrapper.get(`[data-testid="${testId}"]`).attributes('disabled')).toBeDefined()
    }

    expect(wrapper.get('[data-testid="feacn-code-editor"]').attributes('data-disabled')).toBe('true')
    expect(wrapper.get('[data-tooltip="Показать описание"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="parcel-number-ext"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="product-link-with-actions"]').attributes('data-disabled')).toBe('true')
    expect(wrapper.get('[data-testid="view-image"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="delete-image"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="article-with-h"]').attributes('data-disabled')).toBe('true')
    expect(wrapper.get('[data-testid="approve-notification"]').attributes('disabled')).toBeDefined()
  })

  it('saves, cancels, and generates XML using the WbrN SHK number', async () => {
    routeQuery = { mode: 'warehouse' }
    const wrapper = await mountDialog()

    await wrapper.get('[data-testid="download"]').trigger('click')
    await resolveAll()

    expect(parcelUpdate).toHaveBeenCalledWith(3, expect.objectContaining({ id: 3, shk: 'SHK-N-EDIT' }))
    expect(registerGetById).toHaveBeenCalledWith(12)
    expect(generateXml).toHaveBeenCalledWith(
      parcelItem,
      expect.any(Object),
      expect.stringMatching(/SHK-N-EDIT$/),
      expect.objectContaining({ confirm: confirmMock })
    )
    expect(parcelGetById).toHaveBeenCalledWith(3)

    await wrapper.get('[data-testid="save"]').trigger('click')
    await resolveAll()
    expect(routerPush).toHaveBeenCalledWith({
      path: '/registers/12/parcels',
      query: { selectedParcelId: '3', mode: 'warehouse' }
    })

    await wrapper.get('[data-testid="cancel"]').trigger('click')
    expect(routerPush).toHaveBeenCalledWith({
      path: '/registers/12/parcels',
      query: { selectedParcelId: '3', mode: 'warehouse' }
    })
  })

  it('moves to next, issue, previous, and fallback list targets', async () => {
    nextParcels.mockResolvedValueOnce({
      withoutIssues: { ...baseParcel, id: 4, shk: 'SHK-NEXT' },
      withIssues: { ...baseParcel, id: 5, shk: 'SHK-ISSUE' }
    })
    const wrapper = await mountDialog()

    await wrapper.get('[data-testid="next-parcel"]').trigger('click')
    await resolveAll()

    expect(parcelUpdate).toHaveBeenCalledWith(3, expect.objectContaining({ id: 3 }))
    expect(parcelItem.value.id).toBe(4)
    expect(authStore.selectedParcelId).toBe(4)
    expect(routerReplace).toHaveBeenCalledWith('/registers/12/parcels/edit/4')

    Object.assign(formValues, { ...baseParcel, id: 4 })
    nextParcels.mockResolvedValueOnce({ withoutIssues: null, withIssues: null })
    await wrapper.get('[data-testid="next-issue"]').trigger('click')
    await resolveAll()
    expect(routerPush).toHaveBeenCalledWith({
      path: '/registers/12/parcels',
      query: { selectedParcelId: '4' }
    })

    resetState()
    parcelViewsBack.mockResolvedValueOnce({ ...baseParcel, id: 2, shk: 'SHK-PREV' })
    const backWrapper = await mountDialog()
    await backWrapper.get('[data-testid="back"]').trigger('click')
    await resolveAll()
    expect(parcelItem.value.id).toBe(2)
    expect(authStore.selectedParcelId).toBe(2)
    expect(routerReplace).toHaveBeenCalledWith('/registers/12/parcels/edit/2')
  })

  it('runs WbrN validation, approval, notification, check-status, and lookup actions', async () => {
    const wrapper = await mountDialog()

    await wrapper.get('[data-testid="validate-sw"]').trigger('click')
    await resolveAll()
    await wrapper.get('[data-testid="validate-sw-ex"]').trigger('click')
    await resolveAll()
    await wrapper.get('[data-testid="validate-fc"]').trigger('click')
    await resolveAll()
    expect(validateParcelData).toHaveBeenCalledTimes(3)
    expect(validateParcelData).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }), parcelItem, expect.any(Object), true, 0)
    expect(validateParcelData).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }), parcelItem, expect.any(Object), true, 1)
    expect(validateParcelData).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }), parcelItem, expect.any(Object), false, undefined)

    await wrapper.get('[data-testid="approve"]').trigger('click')
    await resolveAll()
    expect(approveParcel).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }), parcelItem, expect.any(Object))

    await wrapper.get('[data-testid="approve-excise"]').trigger('click')
    await resolveAll()
    expect(approveParcelWithExcise).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }), parcelItem, expect.any(Object))
    expect(setFieldValue).toHaveBeenCalledWith('tnVed', '6403999300')

    await wrapper.get('[data-testid="approve-notification"]').trigger('click')
    await resolveAll()
    expect(approveParcelWithNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }), parcelItem, expect.any(Object))

    await wrapper.get('[data-testid="clear-check-status"]').trigger('click')
    await resolveAll()
    await wrapper.get('[data-testid="check-for-duplicate"]').trigger('click')
    await resolveAll()
    expect(runCheckStatusAction).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }), parcelClearCheckStatus, expect.any(Object), expect.any(Object), expect.any(Object), expect.any(Function), expect.any(Object))
    expect(runCheckStatusAction).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }), parcelCheckForDuplicate, expect.any(Object), expect.any(Object), expect.any(Object), expect.any(Function), expect.any(Object))

    await wrapper.get('[data-testid="lookup"]').trigger('click')
    await resolveAll()
    expect(parcelUpdate).toHaveBeenCalledWith(3, expect.objectContaining({ id: 3 }))
    expect(parcelLookupFeacnCode).toHaveBeenCalledWith(3)
    expect(parcelGetById).toHaveBeenCalledWith(3)
  })

  it('handles product image actions, article fellows, description toggle, and report refresh', async () => {
    const wrapper = await mountDialog()

    expect(wrapper.get('[data-tooltip="Показать описание"]').exists()).toBe(true)
    await wrapper.get('[data-tooltip="Показать описание"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-tooltip="Скрыть описание"]').exists()).toBe(true)

    await wrapper.get('[data-testid="view-image"]').trigger('click')
    await resolveAll()
    expect(openImageOverlay).toHaveBeenCalledWith(3)

    await wrapper.get('[data-testid="delete-image"]').trigger('click')
    await resolveAll()
    expect(deleteProductImage).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }), expect.any(Object), expect.any(Object), expect.any(Object), confirmMock, expect.any(Object))

    await wrapper.get('[data-testid="fellows"]').trigger('click')
    expect(handleFellowsClick).toHaveBeenCalledWith(12, 'SHK-N-EDIT')

    parcelGetById.mockClear()
    window.dispatchEvent(new Event(DEC_REPORT_UPLOADED_EVENT))
    await resolveAll()
    expect(parcelGetById).toHaveBeenCalledWith(3)

    imageOverlayOpen.value = true
    await nextTick()
    closeImageOverlay.mockClear()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(closeImageOverlay).toHaveBeenCalled()

    closeImageOverlay.mockClear()
    await wrapper.get('[data-testid="close-overlay"]').trigger('click')
    expect(closeImageOverlay).toHaveBeenCalledTimes(1)
  })

  it('handles Feacn editor state changes and helper errors', async () => {
    const wrapper = await mountDialog()

    await wrapper.get('[data-testid="update-item"]').trigger('click')
    expect(parcelItem.value.value).toEqual({ id: 99, shk: 'SHK-UPDATED' })

    await wrapper.get('[data-testid="overlay-on"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="form"]').classes()).toContain('form-disabled')

    await wrapper.get('[data-testid="overlay-off"]').trigger('click')
    await wrapper.get('[data-testid="running-on"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="parcel-header-actions"]').attributes('data-download-disabled')).toBe('true')
    await wrapper.get('[data-testid="running-off"]').trigger('click')

    parcelItem.value = { ...baseParcel }
    validateParcelData.mockRejectedValueOnce(new Error('validation failed'))
    await wrapper.get('[data-testid="validate-sw"]').trigger('click')
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('validation failed')

    parcelUpdate.mockRejectedValueOnce(new Error('save failed'))
    await wrapper.get('[data-testid="save"]').trigger('click')
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('save failed')
  })

  it('renders parcel and alert errors and reports download and lookup failures', async () => {
    parcelItem.value = {
      ...baseParcel,
      error: 'parcel load failed',
      blockedByFellowItem: true
    }
    alertRef.value = { type: 'alert-danger', message: 'WbrN edit alert' }
    const wrapper = await mountDialog()

    expect(wrapper.text()).toContain('Ошибка: parcel load failed')
    expect(wrapper.text()).toContain('WbrN edit alert')
    expect(wrapper.get('[data-testid="parcel-header-actions"]').attributes('data-download-disabled')).toBe('true')
    await wrapper.get('.alert .close').trigger('click')
    expect(alertClear).toHaveBeenCalled()

    generateXml.mockRejectedValueOnce(new Error('xml failed'))
    await wrapper.get('[data-testid="download"]').trigger('click')
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('xml failed')

    parcelUpdate.mockRejectedValueOnce(new Error('lookup failed'))
    await wrapper.get('[data-testid="lookup"]').trigger('click')
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('lookup failed')
    expect(parcelGetById).toHaveBeenCalledWith(3)
  })

  it('falls back to list when back navigation has no previous parcel', async () => {
    routeQuery = { mode: 'warehouse' }
    parcelViewsBack.mockResolvedValueOnce(null)
    const wrapper = await mountDialog()

    await wrapper.get('[data-testid="back"]').trigger('click')
    await resolveAll()

    expect(routerPush).toHaveBeenCalledWith({
      path: '/registers/12/parcels',
      query: { selectedParcelId: '3', mode: 'warehouse' }
    })
  })

  it('reports approval, notification, refresh, submit, and back errors', async () => {
    const wrapper = await mountDialog()

    approveParcel.mockRejectedValueOnce(new Error('approve failed'))
    await wrapper.get('[data-testid="approve"]').trigger('click')
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('approve failed')

    approveParcelWithExcise.mockRejectedValueOnce(new Error('excise failed'))
    await wrapper.get('[data-testid="approve-excise"]').trigger('click')
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('excise failed')

    approveParcelWithNotification.mockRejectedValueOnce(new Error('notification failed'))
    await wrapper.get('[data-testid="approve-notification"]').trigger('click')
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('notification failed')

    parcelGetById.mockRejectedValueOnce(new Error('refresh failed'))
    window.dispatchEvent(new Event(DEC_REPORT_UPLOADED_EVENT))
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('refresh failed')

    parcelUpdate.mockRejectedValueOnce(new Error('submit failed'))
    await wrapper.get('[data-testid="next-parcel"]').trigger('click')
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('submit failed')

    parcelUpdate.mockResolvedValueOnce()
    parcelViewsBack.mockRejectedValueOnce(new Error('back failed'))
    await wrapper.get('[data-testid="back"]').trigger('click')
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('back failed')
  })

  it('removes report and overlay listeners on unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const removeDocumentListenerSpy = vi.spyOn(document, 'removeEventListener')
    const wrapper = await mountDialog()

    imageOverlayOpen.value = true
    await nextTick()
    wrapper.unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(DEC_REPORT_UPLOADED_EVENT, expect.any(Function))
    expect(removeDocumentListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    removeEventListenerSpy.mockRestore()
    removeDocumentListenerSpy.mockRestore()
  })
})
