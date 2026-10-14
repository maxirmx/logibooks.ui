// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

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
import { CUSTOMS_PROCEDURE_REEXPORT } from '@/helpers/customs.procedure.helpers.js'

const itemRef = ref({ id: 77, invoiceNumber: 'INV-77' })
const loadingRef = ref(false)
const errorRef = ref(null)
const getByIdMock = vi.fn(() => Promise.resolve())
const downloadInvoiceFileMock = vi.fn(() => Promise.resolve())
const downloadDo1FileMock = vi.fn(() => Promise.resolve())

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
    downloadInvoiceFile: downloadInvoiceFileMock,
    downloadDo1File: downloadDo1FileMock
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => {
    const alert = ref(null)
    return {
      alert,
      error: (msg) => {
        alert.value = { message: msg, type: 'alert-danger' }
      },
      success: (msg) => {
        alert.value = { message: msg, type: 'alert-success' }
      },
      clear: () => {
        alert.value = null
      }
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
    setup() {
      return { props }
    }
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
    downloadInvoiceFileMock.mockResolvedValue(undefined)
    downloadDo1FileMock.mockResolvedValue(undefined)
  })

  it('loads register by id and renders heading', async () => {
    const wrapper = mountDialog()
    await resolveAll()
    expect(getByIdMock).toHaveBeenCalledWith(77)
    expect(wrapper.find('h1').text()).toContain('Настройки инвойса')
  })

  it('submits and calls downloadInvoiceFile with selected options', async () => {
    const wrapper = mountDialog({ id: 77, selection: InvoiceParcelSelection.Ordinal })
    await resolveAll()
    const comp = wrapper.findComponent(InvoiceSettings).vm.$.setupState
    // toggle two columns
    comp.toggleColumn(InvoiceOptionalColumns.BagNumber)
    comp.toggleColumn(InvoiceOptionalColumns.Url)
    await nextTick()
    await comp.onSubmit()
    expect(downloadInvoiceFileMock).toHaveBeenCalledWith(
      77,
      'INV-77',
      InvoiceParcelSelection.Ordinal,
      InvoiceOptionalColumns.BagNumber | InvoiceOptionalColumns.Url,
      true
    )
    // Implementation now uses router.go(-1) instead of router.push
    expect(router.go).toHaveBeenCalledWith(-1)
  })

  it('does not submit previous DTEG optional column for reexport registers', async () => {
    itemRef.value = {
      id: 77,
      invoiceNumber: 'INV-77',
      customsProcedureCode: CUSTOMS_PROCEDURE_REEXPORT
    }

    const wrapper = mountDialog()
    await resolveAll()
    const comp = wrapper.findComponent(InvoiceSettings).vm.$.setupState
    comp.optionalColumns = InvoiceOptionalColumns.PreviousDteg | InvoiceOptionalColumns.Url
    await nextTick()

    await comp.onSubmit()

    expect(downloadInvoiceFileMock).toHaveBeenCalledWith(
      77,
      'INV-77',
      InvoiceParcelSelection.All,
      InvoiceOptionalColumns.Url,
      true
    )
  })

  it('resets weight correction to checked when another correctable register is loaded', async () => {
    itemRef.value = {
      id: 77,
      invoiceNumber: 'INV-77',
      realWeightKg: 5,
      totalWeightKgToRelease: 10
    }

    const wrapper = mountDialog()
    await resolveAll()
    await wrapper.get('.weight-correction-checkbox input').setChecked(false)

    itemRef.value = {
      id: 88,
      invoiceNumber: 'INV-88',
      realWeightKg: 12,
      totalWeightKgToRelease: 24
    }
    await nextTick()

    const correctionCheckbox = wrapper.get('.weight-correction-checkbox input')
    expect(correctionCheckbox.element.checked).toBe(true)
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

  it('submits ДО1 with masked optional columns and weight correction', async () => {
    itemRef.value = {
      id: 77,
      invoiceNumber: 'INV-77',
      realWeightKg: 5,
      totalWeightKgToRelease: 10
    }
    const wrapper = mountDialog({ id: 77, documentType: 'do1' })
    await resolveAll()
    const comp = wrapper.findComponent(InvoiceSettings).vm.$.setupState
    comp.optionalColumns =
      InvoiceOptionalColumns.BagNumber |
      InvoiceOptionalColumns.FullName |
      InvoiceOptionalColumns.PreviousDteg |
      InvoiceOptionalColumns.Uin |
      InvoiceOptionalColumns.Url
    await wrapper.get('.weight-correction-checkbox input').setChecked(false)

    await comp.onSubmit()

    expect(downloadDo1FileMock).toHaveBeenCalledWith(
      77,
      'INV-77',
      InvoiceOptionalColumns.BagNumber | InvoiceOptionalColumns.Uin | InvoiceOptionalColumns.Url,
      false
    )
    expect(downloadInvoiceFileMock).not.toHaveBeenCalled()
  })

  it('shows ДО1-specific fallback error', async () => {
    downloadDo1FileMock.mockRejectedValueOnce(null)
    const wrapper = mountDialog({ id: 77, documentType: 'do1' })
    await resolveAll()
    const comp = wrapper.findComponent(InvoiceSettings).vm.$.setupState

    await comp.onSubmit()

    expect(comp.alertStore.alert.value.message).toBe('Не удалось сформировать форму ДО1')
  })

})
