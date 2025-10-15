/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, watch } from 'vue'
import OzonParcelEditDialog from '@/dialogs/OzonParcel_EditDialog.vue'
import WbrParcelEditDialog from '@/dialogs/WbrParcel_EditDialog.vue'
import { CheckStatusCode } from '@/helpers/check.status.code.js'
import { resolveAll } from './helpers/test-utils.js'

const baseParcelData = {
  id: 1,
  registerId: 10,
  postingNumber: 'PN-1',
  shk: 'SHK-1',
  statusId: 2,
  checkStatus: CheckStatusCode.NoIssues.value,
  blockedByFellowItem: false
}

let currentParcelData = { ...baseParcelData }

const parcelsStore = {
  item: ref(null),
  loading: ref(false),
  error: ref(null),
  getById: vi.fn(),
  update: vi.fn(() => Promise.resolve())
}

const registersStore = {
  theNextParcel: vi.fn(),
  nextParcel: vi.fn()
}

const parcelViewsStore = {
  add: vi.fn(),
  back: vi.fn()
}

const statusStore = {
  ensureLoaded: vi.fn(),
  parcelStatuses: []
}

const stopWordsStore = {
  ensureLoaded: vi.fn(),
  stopWords: ref([])
}

const keyWordsStore = {
  ensureLoaded: vi.fn(),
  keyWords: ref([])
}

const feacnOrdersStore = {
  ensureLoaded: vi.fn(),
  orders: ref([])
}

const feacnPrefixesStore = {
  ensureLoaded: vi.fn(),
  prefixes: ref([])
}

const countriesStore = {
  ensureLoaded: vi.fn(),
  countries: ref([])
}

const alertStore = {
  alert: ref(null),
  clear: vi.fn(),
  error: vi.fn(),
  success: vi.fn()
}

const authStore = { selectedParcelId: null }

const validateParcelDataMock = vi.fn(() => Promise.resolve())
const approveParcelHelperMock = vi.fn(() => Promise.resolve())
const approveParcelWithExciseHelperMock = vi.fn(() => Promise.resolve())
const generateXmlHelperMock = vi.fn(() => Promise.resolve())

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')

  return {
    ...actual,
    storeToRefs: (store) => {
      if (store === parcelsStore) {
        return {
          item: parcelsStore.item,
          loading: parcelsStore.loading,
          error: parcelsStore.error
        }
      }
      if (store === stopWordsStore) {
        return { stopWords: stopWordsStore.stopWords }
      }
      if (store === feacnOrdersStore) {
        return { orders: feacnOrdersStore.orders }
      }
      if (store === feacnPrefixesStore) {
        return { prefixes: feacnPrefixesStore.prefixes }
      }
      if (store === countriesStore) {
        return { countries: countriesStore.countries }
      }
      if (store === alertStore) {
        return { alert: alertStore.alert }
      }
      return {}
    }
  }
})

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => parcelsStore
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => registersStore
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => statusStore
}))

vi.mock('@/stores/stop.words.store.js', () => ({
  useStopWordsStore: () => stopWordsStore
}))

vi.mock('@/stores/key.words.store.js', () => ({
  useKeyWordsStore: () => keyWordsStore
}))

vi.mock('@/stores/feacn.orders.store.js', () => ({
  useFeacnOrdersStore: () => feacnOrdersStore
}))

vi.mock('@/stores/feacn.prefixes.store.js', () => ({
  useFeacnPrefixesStore: () => feacnPrefixesStore
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => countriesStore
}))

vi.mock('@/stores/parcel.views.store.js', () => ({
  useParcelViewsStore: () => parcelViewsStore
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStore
}))

vi.mock('@/router', () => ({
  default: {
    push: vi.fn(() => Promise.resolve()),
    replace: vi.fn(() => Promise.resolve())
  }
}))

vi.mock('@/helpers/parcel.actions.helpers.js', () => ({
  validateParcelData: (...args) => validateParcelDataMock(...args),
  approveParcel: (...args) => approveParcelHelperMock(...args),
  approveParcelWithExcise: (...args) => approveParcelWithExciseHelperMock(...args),
  generateXml: (...args) => generateXmlHelperMock(...args)
}))

vi.mock('@/helpers/parcel.number.ext.helpers.js', () => ({
  handleFellowsClick: vi.fn()
}))

const FormStub = {
  name: 'Form',
  props: ['initialValues', 'validationSchema'],
  setup(props) {
    const values = ref(props.initialValues || {})
    watch(
      () => props.initialValues,
      (newValues) => {
        values.value = newValues || {}
      },
      { immediate: true, deep: true }
    )

    const setFieldValue = (field, value) => {
      values.value = { ...values.value, [field]: value }
    }

    return { values, setFieldValue }
  },
  template:
    '<form><slot :errors="{}" :values="values" :isSubmitting="false" :setFieldValue="setFieldValue" /></form>'
}

const FieldStub = {
  name: 'Field',
  props: ['name', 'id', 'type', 'as', 'readonly', 'disabled', 'valueAsNumber'],
  template: `
    <input :id="id || name" :type="type || 'text'" :readonly="readonly" :disabled="disabled" v-if="as !== 'select'" />
    <select :id="id || name" :disabled="disabled" v-else><slot /></select>
  `
}

const ActionButtonStub = {
  name: 'ActionButton',
  props: ['item', 'icon', 'tooltipText', 'iconSize', 'disabled', 'variant'],
  template:
    '<button type="button" class="action-button-stub" :data-tooltip="tooltipText" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
}

const globalStubs = {
  Form: FormStub,
  Field: FieldStub,
  ActionButton: ActionButtonStub,
  OzonFormField: { template: '<div><slot /></div>' },
  WbrFormField: { template: '<div><slot /></div>' },
  FeacnCodeEditor: { template: '<div />' },
  ParcelNumberExt: { template: '<div />' },
  'font-awesome-icon': true
}

async function mountOzonDialog() {
  const wrapper = mount(
    {
      components: { OzonParcelEditDialog },
      template: '<Suspense><OzonParcelEditDialog :registerId="1" :id="1" /></Suspense>'
    },
    {
      global: {
        stubs: globalStubs
      }
    }
  )

  await resolveAll()
  return wrapper.findComponent(OzonParcelEditDialog)
}

async function mountWbrDialog() {
  const wrapper = mount(
    {
      components: { WbrParcelEditDialog },
      template: '<Suspense><WbrParcelEditDialog :registerId="1" :id="1" /></Suspense>'
    },
    {
      global: {
        stubs: globalStubs
      }
    }
  )

  await resolveAll()
  return wrapper.findComponent(WbrParcelEditDialog)
}

function getApprovalButtons(wrapper) {
  const buttons = wrapper.findAll('button.action-button-stub')
  const approveButton = buttons.find((btn) => btn.attributes('data-tooltip') === 'Сохранить и согласовать')
  const approveWithExciseButton = buttons.find((btn) => btn.attributes('data-tooltip') === 'Сохранить и согласовать c акцизом')
  return { approveButton, approveWithExciseButton }
}

describe('Parcel edit dialogs approval state', () => {
  beforeEach(() => {
    currentParcelData = { ...baseParcelData }
    vi.clearAllMocks()

    parcelsStore.item.value = null
    parcelsStore.loading.value = false
    parcelsStore.error.value = null

    parcelsStore.getById.mockImplementation(async () => {
      parcelsStore.item.value = { ...currentParcelData }
      return parcelsStore.item.value
    })
    parcelsStore.update.mockImplementation(() => Promise.resolve())

    registersStore.theNextParcel.mockImplementation(() => Promise.resolve(null))
    registersStore.nextParcel.mockImplementation(() => Promise.resolve(null))

    parcelViewsStore.add.mockImplementation(() => Promise.resolve())
    parcelViewsStore.back.mockImplementation(() => Promise.resolve(null))

    statusStore.ensureLoaded.mockImplementation(() => Promise.resolve())
    stopWordsStore.ensureLoaded.mockImplementation(() => Promise.resolve())
    keyWordsStore.ensureLoaded.mockImplementation(() => Promise.resolve())
    feacnOrdersStore.ensureLoaded.mockImplementation(() => Promise.resolve())
    feacnPrefixesStore.ensureLoaded.mockImplementation(() => Promise.resolve())
    countriesStore.ensureLoaded.mockImplementation(() => Promise.resolve())

    validateParcelDataMock.mockClear()
    approveParcelHelperMock.mockClear()
    approveParcelWithExciseHelperMock.mockClear()
    generateXmlHelperMock.mockClear()
  })

  it('disables approval actions in Ozon dialog when status is ApprovedWithExcise', async () => {
    currentParcelData = { ...currentParcelData, checkStatus: CheckStatusCode.ApprovedWithExcise.value }

    const dialog = await mountOzonDialog()
    const { approveButton, approveWithExciseButton } = getApprovalButtons(dialog)

    expect(approveButton).toBeTruthy()
    expect(approveWithExciseButton).toBeTruthy()
    expect(approveButton.element.disabled).toBe(true)
    expect(approveWithExciseButton.element.disabled).toBe(true)
  })

  it('keeps approval actions enabled in Ozon dialog when status is not ApprovedWithExcise', async () => {
    const dialog = await mountOzonDialog()
    const { approveButton, approveWithExciseButton } = getApprovalButtons(dialog)

    expect(approveButton).toBeTruthy()
    expect(approveWithExciseButton).toBeTruthy()
    expect(approveButton.element.disabled).toBe(false)
    expect(approveWithExciseButton.element.disabled).toBe(false)
  })

  it('disables approval actions in WBR dialog when status is ApprovedWithExcise', async () => {
    currentParcelData = { ...currentParcelData, checkStatus: CheckStatusCode.ApprovedWithExcise.value }

    const dialog = await mountWbrDialog()
    const { approveButton, approveWithExciseButton } = getApprovalButtons(dialog)

    expect(approveButton).toBeTruthy()
    expect(approveWithExciseButton).toBeTruthy()
    expect(approveButton.element.disabled).toBe(true)
    expect(approveWithExciseButton.element.disabled).toBe(true)
  })

  it('keeps approval actions enabled in WBR dialog when status is not ApprovedWithExcise', async () => {
    const dialog = await mountWbrDialog()
    const { approveButton, approveWithExciseButton } = getApprovalButtons(dialog)

    expect(approveButton).toBeTruthy()
    expect(approveWithExciseButton).toBeTruthy()
    expect(approveButton.element.disabled).toBe(false)
    expect(approveWithExciseButton.element.disabled).toBe(false)
  })
})
