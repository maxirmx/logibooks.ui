/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
// Import component after mocks are registered (see below)
let InvoiceSettings
import { InvoiceOptionalColumns } from '@/models/invoice.optional.columns.js'
import { InvoiceParcelSelection } from '@/models/invoice.parcel.selection.js'
import router from '@/router'
import { defaultGlobalStubs } from './helpers/test-utils.js'
import { resolveAll } from './helpers/test-utils.js'

const itemRef = ref({ id: 77, invoiceNumber: 'INV-77' })
const loadingRef = ref(false)
const errorRef = ref(null)
const getByIdMock = vi.fn(() => Promise.resolve())
const downloadInvoiceFileMock = vi.fn(() => Promise.resolve())

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store.downloadInvoiceFile === downloadInvoiceFileMock) {
        return {
          item: itemRef,
          loading: loadingRef,
          error: errorRef
        }
      }
      return {}
    }
  }
})

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    item: itemRef,
    loading: loadingRef,
    error: errorRef,
    getById: getByIdMock,
    downloadInvoiceFile: downloadInvoiceFileMock
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => {
    const alert = ref(null)
    return {
      alert,
      error: (msg) => { alert.value = { message: msg, type: 'alert-danger' } },
      success: (msg) => { alert.value = { message: msg, type: 'alert-success' } },
      clear: () => { alert.value = null }
    }
  }
}))

vi.mock('@/router', () => ({ 
  default: { 
    push: vi.fn(() => Promise.resolve()),
    go: vi.fn(() => Promise.resolve())
  } 
}))

// Stub vee-validate Form used in component
const FormStub = {
  name: 'Form',
  emits: ['submit'],
  template: '<form @submit.prevent="$emit(\'submit\')"><slot /></form>'
}

function mountDialog(props = { id: 77 }) {
  const Parent = {
    template: '<Suspense><InvoiceSettings v-bind="props" /></Suspense>',
    components: { InvoiceSettings },
    setup() { return { props } }
  }
  return mount(Parent, {
    global: { stubs: { ...defaultGlobalStubs, Form: FormStub } }
  })
}

// Now import the component so it picks up the mocks above
beforeEach(async () => {
  if (!InvoiceSettings) {
    InvoiceSettings = (await import('@/dialogs/Invoice_Settings.vue')).default
  }
})

describe('Invoice_Settings.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    itemRef.value = { id: 77, invoiceNumber: 'INV-77' }
    loadingRef.value = false
    errorRef.value = null
  })

  it('loads register by id and renders heading', async () => {
    const wrapper = mountDialog()
    await resolveAll()
    expect(getByIdMock).toHaveBeenCalledWith(77)
    expect(wrapper.find('h1').text()).toContain('Настройки инвойса')
  })

  it('renders selection dropdown and optional columns checkboxes', async () => {
    const wrapper = mountDialog()
    await resolveAll()
    const select = wrapper.find('#parcelSelection')
    expect(select.exists()).toBe(true)
    const labels = wrapper.findAll('.custom-checkbox .custom-checkbox-label').map(l => l.text())
    expect(labels).toContain('Номер мешка')
    expect(labels).toContain('ФИО')
  })

  it('initializes parcel selection from prop', async () => {
    const wrapper = mountDialog({ id: 88, selection: InvoiceParcelSelection.Ordinal })
    await resolveAll()
    const state = wrapper.findComponent(InvoiceSettings).vm.$.setupState
    expect(state.parcelSelection).toBe(InvoiceParcelSelection.Ordinal)
  })

  it('submits and calls downloadInvoiceFile with selected options', async () => {
    const wrapper = mountDialog()
    await resolveAll()
    const comp = wrapper.findComponent(InvoiceSettings).vm.$.setupState
    comp.parcelSelection = InvoiceParcelSelection.Ordinal
    // toggle two columns
    comp.toggleColumn(InvoiceOptionalColumns.BagNumber)
    comp.toggleColumn(InvoiceOptionalColumns.Url)
    await nextTick()
    await comp.onSubmit()
    expect(downloadInvoiceFileMock).toHaveBeenCalledWith(
      77,
      'INV-77',
      InvoiceParcelSelection.Ordinal,
      InvoiceOptionalColumns.BagNumber | InvoiceOptionalColumns.Url
    )
    // Implementation now uses router.go(-1) instead of router.push
    expect(router.go).toHaveBeenCalledWith(-1)
  })

  it('displays error on submission failure', async () => {
    downloadInvoiceFileMock.mockRejectedValueOnce(new Error('Ошибка'))
    const wrapper = mountDialog()
    await resolveAll()
    const comp = wrapper.findComponent(InvoiceSettings).vm.$.setupState
    await comp.onSubmit()
    // wait for any pending promises and DOM updates (action dialog hide, alert store update)
    await resolveAll()
    await nextTick()
    // assert alert store received the error message
    expect(comp.alertStore.alert.value.message).toBe('Ошибка')
  })

  it('cancel navigates back to registers', async () => {
    const wrapper = mountDialog()
    await resolveAll()
    const comp = wrapper.findComponent(InvoiceSettings).vm.$.setupState
    await comp.onCancel()
    // Implementation now uses router.go(-1) instead of router.push
    expect(router.go).toHaveBeenCalledWith(-1)
  })
})
