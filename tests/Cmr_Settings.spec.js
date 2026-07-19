/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import router from '@/router'
import { defaultGlobalStubs, resolveAll } from './helpers/test-utils.js'

let CmrSettings
let CmrSettingsView

const itemRef = ref({
  id: 77,
  invoiceNumber: 'INV-77',
  invoiceDate: '2026-06-15',
  transportationTypeCode: 1,
  senderId: 10,
  recipientId: 20
})
const registerLoading = ref(false)
const companiesRef = ref([
  { id: 10, shortName: 'Sender' },
  { id: 20, name: 'Recipient' }
])
const companiesLoading = ref(false)
const companiesError = ref(null)
const warehousesRef = ref([{ id: 30, name: 'Warehouse 30' }])
const warehousesLoading = ref(false)
const warehousesError = ref(null)
const stationsRef = ref([{ id: 40, name: 'Station', number: '10101010' }])
const stationsLoading = ref(false)
const stationsError = ref(null)

const getByIdMock = vi.fn(() => Promise.resolve())
const companiesGetAllMock = vi.fn(() => Promise.resolve())
const warehousesEnsureLoadedMock = vi.fn(() => Promise.resolve())
const stationsGetAllMock = vi.fn(() => Promise.resolve())
const downloadCmrFileMock = vi.fn(() => Promise.resolve(true))
const alertErrorMock = vi.fn()

const registerStore = {
  item: itemRef,
  loading: registerLoading,
  getById: getByIdMock,
  downloadCmrFile: downloadCmrFileMock
}
const companiesStore = {
  companies: companiesRef,
  loading: companiesLoading,
  error: companiesError,
  getAll: companiesGetAllMock
}
const warehousesStore = {
  warehouses: warehousesRef,
  loading: warehousesLoading,
  error: warehousesError,
  ensureLoaded: warehousesEnsureLoadedMock
}
const stationsStore = {
  customsStations: stationsRef,
  loading: stationsLoading,
  error: stationsError,
  getAll: stationsGetAllMock
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: store => store }
})
vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => registerStore
}))
vi.mock('@/stores/companies.store.js', () => ({
  useCompaniesStore: () => companiesStore
}))
vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => warehousesStore
}))
vi.mock('@/stores/customs.stations.store.js', () => ({
  useCustomsStationsStore: () => stationsStore
}))
vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ error: alertErrorMock })
}))
vi.mock('@/router', () => ({
  default: { go: vi.fn(() => Promise.resolve()) }
}))

const FormStub = {
  name: 'Form',
  emits: ['submit'],
  template: '<form @submit.prevent="$emit(\'submit\')"><slot /></form>'
}

function mountDialog() {
  const Parent = {
    template: '<Suspense><CmrSettings :id="77" /></Suspense>',
    components: { CmrSettings }
  }
  return mount(Parent, {
    global: { stubs: { ...defaultGlobalStubs, Form: FormStub } }
  })
}

function setupState(wrapper) {
  return wrapper.findComponent(CmrSettings).vm.$.setupState
}

function today() {
  const date = new Date()
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

beforeEach(async () => {
  if (!CmrSettings) {
    CmrSettings = (await import('@/dialogs/Cmr_Settings.vue')).default
    CmrSettingsView = (await import('@/views/Register_CmrSettingsView.vue')).default
  }
  vi.clearAllMocks()
  itemRef.value = {
    id: 77,
    invoiceNumber: 'INV-77',
    invoiceDate: '2026-06-15',
    transportationTypeCode: 1,
    senderId: 10,
    recipientId: 20
  }
  registerLoading.value = false
  companiesLoading.value = false
  companiesError.value = null
  warehousesLoading.value = false
  warehousesError.value = null
  stationsLoading.value = false
  stationsError.value = null
  getByIdMock.mockResolvedValue(undefined)
  companiesGetAllMock.mockResolvedValue(undefined)
  warehousesEnsureLoadedMock.mockResolvedValue(undefined)
  stationsGetAllMock.mockResolvedValue(undefined)
  downloadCmrFileMock.mockResolvedValue(true)
})

describe('Cmr_Settings.vue', () => {
  it('forwards the numeric route id through the CMR settings view', () => {
    const wrapper = mount(CmrSettingsView, {
      props: { id: 42 },
      global: { stubs: { CmrSettings: true } }
    })

    expect(wrapper.get('cmr-settings-stub').attributes('id')).toBe('42')
  })

  it('loads all references together and renders the exact five-row order', async () => {
    const wrapper = mountDialog()
    await resolveAll()

    expect(getByIdMock).toHaveBeenCalledWith(77)
    expect(companiesGetAllMock).toHaveBeenCalledOnce()
    expect(warehousesEnsureLoadedMock).toHaveBeenCalledOnce()
    expect(stationsGetAllMock).toHaveBeenCalledOnce()
    const rows = [1, 2, 3, 4, 5].map(number =>
      wrapper.get(`[data-testid="cmr-row-${number}"]`).findAll('label').map(label => label.text())
    )
    expect(rows).toEqual([
      ['Отправитель:', 'Получатель:'],
      ['Место погрузки:', 'Дата погрузки:'],
      ['Перевозчик:', 'Место разгрузки:'],
      ['Регистрац. номер тягач/полуприцеп:', 'Марка тягач/полуприцеп:'],
      ['Таможенный пост:', 'Дата:']
    ])
  })

  it('applies direction-aware defaults and keeps optional references blank', async () => {
    const wrapper = mountDialog()
    await resolveAll()
    const state = setupState(wrapper)

    expect(state.senderCompanyId).toBe(10)
    expect(state.recipientCompanyId).toBe(20)
    expect(state.carrierCompanyId).toBe(20)
    expect(state.loadingWarehouseId).toBeNull()
    expect(state.deliveryWarehouseId).toBeNull()
    expect(state.customsStationId).toBeNull()
    expect(state.loadingDate).toBe(today())
    expect(state.documentDate).toBe('2026-06-15')
    expect(state.vehicleRegistrationNumber).toBe('')
    expect(state.vehicleMakeModel).toBe('')
  })

  it('defaults the document date to today and allows optional fields to be cleared', async () => {
    itemRef.value.invoiceDate = null
    const wrapper = mountDialog()
    await resolveAll()

    expect(setupState(wrapper).documentDate).toBe(today())
    await wrapper.get('#loadingDate').setValue('')
    await wrapper.get('#senderCompanyId').setValue('')
    expect(setupState(wrapper).loadingDate).toBe('')
    expect(setupState(wrapper).senderCompanyId).toBeFalsy()
  })

  it('posts the exact normalized payload, locks submission, and navigates back', async () => {
    let finishDownload
    downloadCmrFileMock.mockImplementationOnce(() => new Promise(resolve => {
      finishDownload = resolve
    }))
    const wrapper = mountDialog()
    await resolveAll()
    const state = setupState(wrapper)
    await wrapper.get('#recipientCompanyId').setValue('20')
    await wrapper.get('#loadingWarehouseId').setValue('30')
    await wrapper.get('#loadingDate').setValue('')
    await wrapper.get('#carrierCompanyId').setValue('20')
    await wrapper.get('#deliveryWarehouseId').setValue('')
    await wrapper.get('#vehicleRegistrationNumber').setValue('  А123ВС  ')
    await wrapper.get('#vehicleMakeModel').setValue('  Volvo / Schmitz  ')
    await wrapper.get('#customsStationId').setValue('40')
    await wrapper.get('#documentDate').setValue('2026-06-15')
    await nextTick()

    const submit = state.onSubmit()
    await nextTick()
    expect(state.isSubmitting).toBe(true)
    expect(state.isFormDisabled).toBe(true)
    await state.onSubmit()
    expect(downloadCmrFileMock).toHaveBeenCalledOnce()

    finishDownload(true)
    await submit
    expect(downloadCmrFileMock).toHaveBeenCalledWith(77, 'INV-77', {
      senderCompanyId: 10,
      recipientCompanyId: 20,
      carrierCompanyId: 20,
      loadingWarehouseId: 30,
      deliveryWarehouseId: null,
      customsStationId: 40,
      loadingDate: null,
      vehicleRegistrationNumber: 'А123ВС',
      vehicleMakeModel: 'Volvo / Schmitz',
      documentDate: '2026-06-15'
    })
    expect(router.go).toHaveBeenCalledWith(-1)
    expect(state.isSubmitting).toBe(false)
  })

  it('keeps the form open and displays the controller error on failure', async () => {
    downloadCmrFileMock.mockRejectedValueOnce(new Error('Неизвестный таможенный пост'))
    const wrapper = mountDialog()
    await resolveAll()

    await setupState(wrapper).onSubmit()

    expect(alertErrorMock).toHaveBeenCalledWith('Неизвестный таможенный пост')
    expect(router.go).not.toHaveBeenCalled()
    expect(setupState(wrapper).isSubmitting).toBe(false)
  })

  it('blocks submission when document date is cleared', async () => {
    const wrapper = mountDialog()
    await resolveAll()
    const state = setupState(wrapper)
    state.documentDate = ''
    await nextTick()

    await state.onSubmit()

    expect(downloadCmrFileMock).not.toHaveBeenCalled()
    expect(alertErrorMock).toHaveBeenCalledWith('Дата документа обязательна')
  })

  it('reports reference-loading failures and keeps generation disabled', async () => {
    companiesError.value = new Error('Companies unavailable')
    const wrapper = mountDialog()
    await resolveAll()

    expect(alertErrorMock).toHaveBeenCalledWith('Companies unavailable')
    expect(setupState(wrapper).isFormDisabled).toBe(true)
    expect(downloadCmrFileMock).not.toHaveBeenCalled()
  })

  it('rejects direct access for a non-Auto register', async () => {
    itemRef.value.transportationTypeCode = 2
    const wrapper = mountDialog()
    await resolveAll()

    expect(alertErrorMock).toHaveBeenCalledWith('CMR доступна только для автомобильных реестров')
    expect(setupState(wrapper).isFormDisabled).toBe(true)
  })

  it('keeps controls disabled until every reference request completes', async () => {
    let finishCompanies
    companiesGetAllMock.mockImplementationOnce(() => new Promise(resolve => {
      finishCompanies = resolve
    }))
    const wrapper = mountDialog()
    await nextTick()

    expect(setupState(wrapper).isFormDisabled).toBe(true)
    finishCompanies()
    await resolveAll()
    expect(setupState(wrapper).isFormDisabled).toBe(false)
  })

  it('supports cancel, string errors, and fallback errors', async () => {
    const wrapper = mountDialog()
    await resolveAll()
    const state = setupState(wrapper)

    state.onCancel()
    expect(router.go).toHaveBeenCalledWith(-1)
    vi.clearAllMocks()
    state.isSubmitting = true
    state.onCancel()
    expect(router.go).not.toHaveBeenCalled()
    state.isSubmitting = false

    downloadCmrFileMock.mockRejectedValueOnce('String failure')
    await state.onSubmit()
    expect(alertErrorMock).toHaveBeenCalledWith('String failure')
    downloadCmrFileMock.mockRejectedValueOnce(null)
    await state.onSubmit()
    expect(alertErrorMock).toHaveBeenCalledWith('Не удалось сформировать CMR')
  })

  it('handles a missing loaded register and no-op default initialization', async () => {
    itemRef.value = { loading: true }
    const wrapper = mountDialog()
    await resolveAll()
    const state = setupState(wrapper)

    expect(alertErrorMock).toHaveBeenCalledWith('Реестр не найден')
    state.initializeDefaults()
    expect(state.loadFailed).toBe(true)
  })
})
