/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import InvoiceSettings from '@/dialogs/Invoice_Settings.vue'
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

vi.mock('@/router', () => ({ default: { push: vi.fn(() => Promise.resolve()) } }))

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

describe('Invoice_Settings.vue (refactored)', () => {
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
    const labels = wrapper.findAll('.custom-checkbox-label').map(l => l.text())
    expect(labels).toContain('Номер мешка')
    expect(labels).toContain('ФИО')
  })

  it('initializes parcel selection from prop', async () => {
    const wrapper = mountDialog({ id: 88, selection: InvoiceParcelSelection.WithoutExcise })
    await resolveAll()
    const state = wrapper.findComponent(InvoiceSettings).vm.$.setupState
    expect(state.parcelSelection).toBe(InvoiceParcelSelection.WithoutExcise)
  })

  it('submits and calls downloadInvoiceFile with selected options', async () => {
    const wrapper = mountDialog()
    await resolveAll()
    const comp = wrapper.findComponent(InvoiceSettings).vm.$.setupState
    comp.parcelSelection = InvoiceParcelSelection.WithoutExcise
    // toggle two columns
    comp.toggleColumn(InvoiceOptionalColumns.BagNumber)
    comp.toggleColumn(InvoiceOptionalColumns.Url)
    await nextTick()
    await comp.onSubmit()
    expect(downloadInvoiceFileMock).toHaveBeenCalledWith(
      77,
      'INV-77',
      InvoiceParcelSelection.WithoutExcise,
      InvoiceOptionalColumns.BagNumber | InvoiceOptionalColumns.Url
    )
    expect(router.push).toHaveBeenCalledWith('/registers')
  })

  it('displays error on submission failure', async () => {
    downloadInvoiceFileMock.mockRejectedValueOnce(new Error('Ошибка'))
    const wrapper = mountDialog()
    await resolveAll()
    const comp = wrapper.findComponent(InvoiceSettings).vm.$.setupState
    await comp.onSubmit()
    await nextTick()
    expect(wrapper.html()).toContain('Ошибка')
  })

  it('cancel navigates back to registers', async () => {
    const wrapper = mountDialog()
    await resolveAll()
    const comp = wrapper.findComponent(InvoiceSettings).vm.$.setupState
    await comp.onCancel()
    expect(router.push).toHaveBeenCalledWith('/registers')
  })
})
