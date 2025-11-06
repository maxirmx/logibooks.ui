import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import InvoiceSettings from '@/dialogs/Invoice_Settings.vue'
import { InvoiceOptionalColumns } from '@/models/invoice.optional.columns.js'
import { InvoiceParcelSelection } from '@/models/invoice.parcel.selection.js'
import { vuetifyStubs } from './helpers/test-utils.js'

const backMock = vi.fn()
const downloadMock = vi.fn()
const getByIdMock = vi.fn()
const itemRef = ref({ id: 1, invoiceNumber: 'INV-001' })
const loadingRef = ref(false)
const errorRef = ref(null)

vi.mock('vue-router', () => ({
  useRouter: () => ({ back: backMock })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    downloadInvoiceFile: downloadMock,
    getById: getByIdMock,
    item: itemRef,
    loading: loadingRef,
    error: errorRef
  })
}))

describe('Invoice_Settings dialog', () => {
  beforeEach(() => {
    backMock.mockClear()
    downloadMock.mockReset()
    downloadMock.mockResolvedValue()
    getByIdMock.mockReset()
    getByIdMock.mockResolvedValue()
    itemRef.value = { id: 1, invoiceNumber: 'INV-001' }
    loadingRef.value = false
    errorRef.value = null
  })

  it('submits selected settings to the register store', async () => {
    const wrapper = mount(InvoiceSettings, {
      props: { id: 1 },
      global: { stubs: vuetifyStubs }
    })

    // ensure store fetch called on mount
    expect(getByIdMock).toHaveBeenCalledWith(1)

    const state = wrapper.vm.$.setupState
    state.parcelSelection = InvoiceParcelSelection.WithExcise
    state.setColumn(InvoiceOptionalColumns.BagNumber, true)
    state.setColumn(InvoiceOptionalColumns.Url, true)
    await nextTick()

    await state.handleSubmit()

    expect(downloadMock).toHaveBeenCalledWith(
      1,
      'INV-001',
      InvoiceParcelSelection.WithExcise,
      InvoiceOptionalColumns.BagNumber | InvoiceOptionalColumns.Url
    )
    expect(backMock).toHaveBeenCalled()
  })
})
