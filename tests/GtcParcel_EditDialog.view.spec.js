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
  item: ref({}),
  loading: ref(false),
  getById: vi.fn().mockResolvedValue({ id: 5 }),
  update: vi.fn().mockResolvedValue(),
  checkPassport: vi.fn().mockResolvedValue(),
  clearPassportCheck: vi.fn().mockResolvedValue()
}
vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => parcelsMock
}))

const ensureLoadedFactory = () => ({ ensureLoaded: vi.fn().mockResolvedValue(), add: vi.fn().mockResolvedValue() })
vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({ ensureLoaded: vi.fn().mockResolvedValue(), parcelStatuses: [] })
}))
vi.mock('@/stores/stop.words.store.js', () => ({ useStopWordsStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/key.words.store.js', () => ({ useKeyWordsStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/feacn.orders.store.js', () => ({ useFeacnOrdersStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/feacn.prefixes.store.js', () => ({ useFeacnPrefixesStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({ ensureLoaded: vi.fn().mockResolvedValue(), countries: [] })
}))
vi.mock('@/stores/parcel.views.store.js', () => ({
  useParcelViewsStore: () => ({ add: vi.fn().mockResolvedValue(), back: vi.fn().mockResolvedValue(null) })
}))

const registersMock = {
  item: ref({ id: 1, customsProcedureCode: 40 }),
  ops: {
    passportCheckStatuses: [
      { value: 0, code: 'NotChecked', name: 'Не проверен' },
      { value: 30, code: 'Checked', name: 'Проверен' }
    ]
  },
  getById: vi.fn().mockResolvedValue({ id: 1, customsProcedureCode: 40 }),
  nextParcels: vi.fn().mockResolvedValue({ withoutIssues: null, withIssues: null })
}
vi.mock('@/stores/registers.store.js', () => ({ useRegistersStore: () => registersMock }))

const authMock = { selectedParcelId: null, isSrLogistPlus: true }
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => authMock }))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ alert: ref(null), error: vi.fn(), clear: vi.fn() })
}))

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

import GtcParcel_EditDialog from '@/dialogs/GtcParcel_EditDialog.vue'

describe('GtcParcel_EditDialog passport verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmMock = vi.fn()
    authMock.selectedParcelId = null
    authMock.isSrLogistPlus = true
    parcelsMock.item.value = {
      id: 5,
      registerId: 1,
      postingNumber: 'GTC-5',
      statusId: 1,
      checkStatus: 0,
      productLink: 'http://example.com',
      passportSeries: 'AA',
      passportNumber: '123456',
      passportCheckStatus: 30
    }
    parcelsMock.update.mockResolvedValue()
    parcelsMock.checkPassport.mockResolvedValue()
    parcelsMock.clearPassportCheck.mockResolvedValue()
    registersMock.item.value = { id: 1, customsProcedureCode: 40 }
    registersMock.nextParcels.mockResolvedValue({ withoutIssues: null, withIssues: null })
  })

  it('renders passport verification actions for import SrLogistPlus parcels and runs check actions', async () => {
    const TestWrapper = {
      components: { GtcParcel_EditDialog },
      template: '<Suspense><GtcParcel_EditDialog :registerId="1" :id="5" /></Suspense>'
    }

    const wrapper = mount(TestWrapper, {
      global: {
        stubs: {
          Field: {
            props: ['name', 'id', 'class'],
            computed: {
              classes() {
                return this.class
              }
            },
            template: '<input :name="name" :id="id" :class="classes" />'
          },
          Form: {
            template: '<div><slot :errors="{}" :values="{ id: 5, statusId: 1 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
          },
          ParcelHeaderActionsBar: true,
          ParcelStatusSection: true,
          FeacnCodeEditor: true,
          ParcelNumberExt: true,
          ParcelWeightAutoField: true,
          GtcFormField: { props: ['name'], template: '<div>{{ name }}</div>' },
          ActionButton: true,
          DTagSection: true,
          'font-awesome-icon': true,
          VTooltip: true
        }
      }
    })

    await nextTick()
    await resolveAll()

    expect(wrapper.get('[data-testid="passport-check-actions"]').exists()).toBe(true)

    const passportField = wrapper.findComponent({ name: 'PassportNumberWithActions' })
    expect(passportField.exists()).toBe(true)
    passportField.vm.$emit('check')
    await resolveAll()
    expect(parcelsMock.checkPassport).toHaveBeenCalledWith(5)

    passportField.vm.$emit('clear')
    await resolveAll()
    expect(parcelsMock.clearPassportCheck).toHaveBeenCalledWith(5)
  })
})
