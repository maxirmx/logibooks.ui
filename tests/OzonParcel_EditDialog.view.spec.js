import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { resolveAll } from './helpers/test-utils'

let confirmMock = null
vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn()
}))

vi.mock('@/router', () => ({ default: routerMocks }))

const parcelsMock = {
  item: ref({ id: 2, productLink: 'http://example.com', hasImage: true }),
  loading: ref(false),
  getImageProcessingUrl: vi.fn(() => 'http://test/api/parcels/2/image'),
  getImageBlob: vi.fn(),
  getById: vi.fn().mockResolvedValue({ id: 2, hasImage: true }),
  update: vi.fn().mockResolvedValue()
}
vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => parcelsMock
}))

const ensureLoadedFactory = () => ({ ensureLoaded: vi.fn().mockResolvedValue(), add: vi.fn().mockResolvedValue() })
const parcelStatusesMock = vi.hoisted(() => [])
vi.mock('@/stores/parcel.statuses.store.js', () => ({ useParcelStatusesStore: () => ({ ensureLoaded: vi.fn().mockResolvedValue(), parcelStatuses: parcelStatusesMock }) }))
vi.mock('@/stores/stop.words.store.js', () => ({ useStopWordsStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/key.words.store.js', () => ({ useKeyWordsStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/feacn.orders.store.js', () => ({ useFeacnOrdersStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/feacn.prefixes.store.js', () => ({ useFeacnPrefixesStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/countries.store.js', () => ({ useCountriesStore: () => ({ ensureLoaded: vi.fn().mockResolvedValue(), countries: [] }) }))
const parcelViewsMock = {
  add: vi.fn().mockResolvedValue(),
  back: vi.fn().mockResolvedValue(null)
}
vi.mock('@/stores/parcel.views.store.js', () => ({ useParcelViewsStore: () => parcelViewsMock }))
const registersMock = {
  item: ref({ id: 1, customsProcedureCode: 40 }),
  getById: vi.fn().mockResolvedValue({ id: 1, customsProcedureCode: 40 }),
  nextParcels: vi.fn().mockResolvedValue({ withoutIssues: null, withIssues: null })
}
vi.mock('@/stores/registers.store.js', () => ({ useRegistersStore: () => registersMock }))

vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ selectedParcelId: null }) }))
const alertErrorMock = vi.fn()
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => ({ alert: ref(null), error: alertErrorMock, clear: vi.fn() }) }))

vi.mock('@/components/ProductLinkWithActions.vue', () => ({
  default: { template: '<button data-test="view-btn" @click="$emit(\'view-image\')">View</button>' }
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRoute: () => ({ query: {} })
  }
})

import OzonParcel_EditDialog from '@/dialogs/OzonParcel_EditDialog.vue'

describe('OzonParcel_EditDialog image overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmMock = vi.fn()
    parcelStatusesMock.length = 0
    parcelsMock.item.value = { id: 2, registerId: 1, productLink: 'http://example.com', hasImage: true }
    registersMock.item.value = { id: 1, customsProcedureCode: 40 }
    registersMock.getById.mockImplementation(async (id) => {
      registersMock.item.value = { ...registersMock.item.value, id }
      return registersMock.item.value
    })
    registersMock.nextParcels.mockResolvedValue({ withoutIssues: null, withIssues: null })
    parcelViewsMock.add.mockResolvedValue()
    parcelViewsMock.back.mockResolvedValue(null)
    parcelsMock.getImageBlob.mockResolvedValue(new Blob(['test'], { type: 'image/png' }))
    global.URL.createObjectURL = vi.fn(() => 'blob:mock')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('opens and closes overlay when view-image is triggered', async () => {
    const TestWrapper = {
      components: { OzonParcel_EditDialog },
      template: '<Suspense><OzonParcel_EditDialog :registerId="1" :id="2" /></Suspense>'
    }

    const wrapper = mount(TestWrapper, {
      global: {
        stubs: {
          Field: { template: '<input />' },
          Form: {
            template: '<div><slot :errors="{}" :values="{ id: 2 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
          },
          ParcelHeaderActionsBar: true,
          ParcelStatusSection: true,
          FeacnCodeEditor: true,
          ParcelNumberExt: true,
          ArticleWithH: true,
          ActionButton: true,
          'font-awesome-icon': true,
          VTooltip: true
        }
      }
    })

    await nextTick()
    await resolveAll()

    await wrapper.find('[data-test="view-btn"]').trigger('click')
    await resolveAll()

    expect(parcelsMock.getImageBlob).toHaveBeenCalledWith(2)
    const overlay = wrapper.find('[data-test="parcel-image-overlay"]')
    expect(overlay.exists()).toBe(true)

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }))
    await resolveAll()
    expect(wrapper.find('[data-test="parcel-image-overlay"]').exists()).toBe(false)
    expect(global.URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('disables XML download action for customs-disabled parcel status', async () => {
    parcelStatusesMock.push({ id: 10, title: 'Disabled', useAtCustomsProcessing: false })
    parcelsMock.item.value = { id: 2, statusId: 10, checkStatus: 0, productLink: 'http://example.com', hasImage: true }

    const TestWrapper = {
      components: { OzonParcel_EditDialog },
      template: '<Suspense><OzonParcel_EditDialog :registerId="1" :id="2" /></Suspense>'
    }

    const wrapper = mount(TestWrapper, {
      global: {
        stubs: {
          Field: { template: '<input />' },
          Form: {
            template: '<div><slot :errors="{}" :values="{ id: 2, statusId: 10 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
          },
          ParcelHeaderActionsBar: true,
          ParcelStatusSection: true,
          FeacnCodeEditor: true,
          ParcelNumberExt: true,
          ArticleWithH: true,
          ActionButton: true,
          'font-awesome-icon': true,
          VTooltip: true
        }
      }
    })

    await nextTick()
    await resolveAll()

    const headerActions = wrapper.findComponent({ name: 'ParcelHeaderActionsBar' })
    expect(headerActions.exists()).toBe(true)
    expect(headerActions.props('downloadDisabled')).toBe(true)
  })

  it('renders Ozon import recipient fields', async () => {
    registersMock.item.value = { id: 1, customsProcedureCode: 40 }
    parcelsMock.item.value = {
      id: 2,
      registerId: 1,
      statusId: 1,
      checkStatus: 0,
      productLink: 'http://example.com',
      passportIssueDate: '2025-02-03',
      inn: '500100732259',
      phone: '+79001234567',
      email: 'recipient@example.com',
      postalCode: '101000',
      city: 'Москва',
      address: 'Москва, ул. Тестовая, 1'
    }

    const TestWrapper = {
      components: { OzonParcel_EditDialog },
      template: '<Suspense><OzonParcel_EditDialog :registerId="1" :id="2" /></Suspense>'
    }

    const wrapper = mount(TestWrapper, {
      global: {
        stubs: {
          Field: { template: '<input />' },
          Form: {
            template: '<div><slot :errors="{}" :values="{ id: 2, statusId: 1 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
          },
          ParcelHeaderActionsBar: true,
          ParcelStatusSection: true,
          FeacnCodeEditor: true,
          ParcelNumberExt: true,
          ArticleWithH: true,
          ActionButton: true,
          'font-awesome-icon': true,
          VTooltip: true
        }
      }
    })

    await nextTick()
    await resolveAll()

    expect(wrapper.text()).toContain('Серия паспорта')
    expect(wrapper.text()).toContain('Номер паспорта')
    expect(wrapper.text()).toContain('ИНН')
    expect(wrapper.text()).toContain('Телефон')
    expect(wrapper.text()).toContain('Email')
    expect(wrapper.text()).toContain('Дата выдачи паспорта')
    expect(wrapper.text()).toContain('Кем выдан паспорт')
    expect(wrapper.text()).toContain('Индекс')
    expect(wrapper.text()).toContain('Населенный пункт')
    expect(wrapper.text()).toContain('Адрес')
    expect(registersMock.getById).toHaveBeenCalledWith(1)
    expect(registersMock.getById.mock.invocationCallOrder[0])
      .toBeLessThan(parcelsMock.getById.mock.invocationCallOrder[0])
  })

  it('renders Ozon reexport recipient fields', async () => {
    registersMock.item.value = { id: 1, customsProcedureCode: 31 }
    parcelsMock.item.value = { id: 2, registerId: 1, statusId: 1, checkStatus: 0 }

    const TestWrapper = {
      components: { OzonParcel_EditDialog },
      template: '<Suspense><OzonParcel_EditDialog :registerId="1" :id="2" /></Suspense>'
    }

    const wrapper = mount(TestWrapper, {
      global: {
        stubs: {
          Field: { template: '<input />' },
          Form: {
            template: '<div><slot :errors="{}" :values="{ id: 2, statusId: 1 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
          },
          ParcelHeaderActionsBar: true,
          ParcelStatusSection: true,
          FeacnCodeEditor: true,
          ParcelNumberExt: true,
          ArticleWithH: true,
          ActionButton: true,
          'font-awesome-icon': true,
          VTooltip: true
        }
      }
    })

    await nextTick()
    await resolveAll()

    expect(wrapper.text()).toContain('ИНН')
    expect(wrapper.text()).toContain('Дата выдачи паспорта')
    expect(wrapper.text()).toContain('Адрес')
  })

  it('hides additional Ozon recipient fields for export register', async () => {
    registersMock.item.value = { id: 1, customsProcedureCode: 10 }
    parcelsMock.item.value = { id: 2, registerId: 1, statusId: 1, checkStatus: 0 }

    const TestWrapper = {
      components: { OzonParcel_EditDialog },
      template: '<Suspense><OzonParcel_EditDialog :registerId="1" :id="2" /></Suspense>'
    }

    const wrapper = mount(TestWrapper, {
      global: {
        stubs: {
          Field: { template: '<input />' },
          Form: {
            template: '<div><slot :errors="{}" :values="{ id: 2, statusId: 1 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
          },
          ParcelHeaderActionsBar: true,
          ParcelStatusSection: true,
          FeacnCodeEditor: true,
          ParcelNumberExt: true,
          ArticleWithH: true,
          ActionButton: true,
          'font-awesome-icon': true,
          VTooltip: true
        }
      }
    })

    await nextTick()
    await resolveAll()

    expect(wrapper.text()).not.toContain('Серия паспорта')
    expect(wrapper.text()).toContain('Номер паспорта')
    expect(wrapper.text()).not.toContain('ИНН')
    expect(wrapper.text()).not.toContain('Дата выдачи паспорта')
    expect(wrapper.text()).not.toContain('Кем выдан паспорт')
    expect(wrapper.text()).not.toContain('Адрес')
  })

  it('refetches register when back navigation returns parcel from another register', async () => {
    registersMock.item.value = { id: 1, customsProcedureCode: 40 }
    parcelsMock.item.value = { id: 2, registerId: 1, statusId: 1, checkStatus: 0 }
    parcelViewsMock.back.mockResolvedValue({ id: 7, registerId: 9, statusId: 1, checkStatus: 0, postingNumber: 'OZ-7' })

    const TestWrapper = {
      components: { OzonParcel_EditDialog },
      template: '<Suspense><OzonParcel_EditDialog :registerId="1" :id="2" /></Suspense>'
    }

    const wrapper = mount(TestWrapper, {
      global: {
        stubs: {
          Field: { template: '<input />' },
          Form: {
            template: '<div><slot :errors="{}" :values="{ id: 2, statusId: 1 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
          },
          ParcelHeaderActionsBar: {
            template: '<button data-test="back-btn" @click="$emit(\'back\')"></button>'
          },
          ParcelStatusSection: true,
          FeacnCodeEditor: true,
          ParcelNumberExt: true,
          ArticleWithH: true,
          ActionButton: true,
          'font-awesome-icon': true,
          VTooltip: true
        }
      }
    })

    await nextTick()
    await resolveAll()
    expect(registersMock.getById).toHaveBeenCalledTimes(1)

    await wrapper.find('[data-test="back-btn"]').trigger('click')
    await resolveAll()

    expect(parcelViewsMock.back).toHaveBeenCalled()
    expect(registersMock.getById).toHaveBeenCalledWith(9)
    expect(registersMock.getById).toHaveBeenCalledTimes(2)
    expect(routerMocks.replace).toHaveBeenCalledWith('/registers/9/parcels/edit/7')
  })
})
