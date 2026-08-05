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
  generate: vi.fn().mockResolvedValue(),
  lookupFeacnCode: vi.fn().mockResolvedValue(),
  checkPassport: vi.fn().mockResolvedValue(),
  clearPassportCheck: vi.fn().mockResolvedValue()
}
vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => parcelsMock
}))

const ensureLoadedFactory = () => ({
  ensureLoaded: vi.fn().mockResolvedValue(),
  add: vi.fn().mockResolvedValue()
})
vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({ ensureLoaded: vi.fn().mockResolvedValue(), parcelStatuses: [] })
}))
vi.mock('@/stores/stop.words.store.js', () => ({ useStopWordsStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/key.words.store.js', () => ({ useKeyWordsStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/feacn.orders.store.js', () => ({
  useFeacnOrdersStore: () => ensureLoadedFactory()
}))
vi.mock('@/stores/feacn.prefixes.store.js', () => ({
  useFeacnPrefixesStore: () => ensureLoadedFactory()
}))
vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({ ensureLoaded: vi.fn().mockResolvedValue(), countries: [] })
}))
const parcelViewsBack = vi.fn().mockResolvedValue(null)
vi.mock('@/stores/parcel.views.store.js', () => ({
  useParcelViewsStore: () => ({ add: vi.fn().mockResolvedValue(), back: parcelViewsBack })
}))

const registersMock = {
  item: ref({ id: 1, customsProcedureCode: 40 }),
  ops: {
    passportCheckStatuses: [
      { value: 0, code: 'NotChecked', name: 'Не проверен' },
      { value: 10, code: 'InProgress', name: 'В процессе' },
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
    parcelsMock.generate.mockResolvedValue()
    parcelsMock.lookupFeacnCode.mockResolvedValue()
    parcelsMock.checkPassport.mockResolvedValue()
    parcelsMock.clearPassportCheck.mockResolvedValue()
    registersMock.item.value = { id: 1, customsProcedureCode: 40 }
    registersMock.nextParcels.mockResolvedValue({ withoutIssues: null, withIssues: null })
    parcelViewsBack.mockResolvedValue(null)
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
            template:
              '<div><slot :errors="{}" :values="{ id: 5, statusId: 1 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
          },
          ParcelHeaderActionsBar: true,
          ParcelStatusSection: true,
          FeacnCodeEditor: true,
          ParcelNumberExt: true,
          ParcelWeightAutoField: true,
          GtcFormField: {
            props: ['name', 'disabled'],
            template:
              '<div data-testid="gtc-form-field" :data-name="name" :data-disabled="String(disabled)">{{ name }}</div>'
          },
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

    parcelsMock.item.value = { ...parcelsMock.item.value, passportCheckStatus: 10 }
    await nextTick()
    expect(passportField.props('inputDisabled')).toBe(true)
    expect(passportField.props('checkDisabled')).toBe(true)
    const fields = wrapper.findAll('[data-testid="gtc-form-field"]')
    const fieldByName = (name) => fields.find((field) => field.attributes('data-name') === name)
    for (const name of ['lastName', 'firstName', 'passportSeries']) {
      expect(fieldByName(name).attributes('data-disabled')).toBe('true')
    }
    expect(fieldByName('patronymic').attributes('data-disabled')).toBe('undefined')
  })

  it('allows navigation and downloads but blocks mutations for read-only parcels', async () => {
    const actionBarStub = {
      props: ['mutationDisabled'],
      emits: ['next-parcel', 'back', 'save', 'lookup', 'download'],
      template: `
        <div data-testid="parcel-actions" :data-mutation-disabled="String(mutationDisabled)">
          <button data-testid="next" @click="$emit('next-parcel')"></button>
          <button data-testid="back" @click="$emit('back')"></button>
          <button data-testid="save" @click="$emit('save')"></button>
          <button data-testid="lookup" @click="$emit('lookup')"></button>
          <button data-testid="download" @click="$emit('download')"></button>
        </div>
      `
    }
    const mountDialog = async () => {
      const wrapper = mount(
        {
          components: { GtcParcel_EditDialog },
          template: '<Suspense><GtcParcel_EditDialog :registerId="1" :id="5" /></Suspense>'
        },
        {
          global: {
            stubs: {
              Field: { template: '<input />' },
              Form: {
                template:
                  '<div><slot :errors="{}" :values="{ id: 5, statusId: 1 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
              },
              ParcelHeaderActionsBar: actionBarStub,
              ParcelStatusSection: true,
              FeacnCodeEditor: true,
              ParcelNumberExt: true,
              ParcelWeightAutoField: true,
              GtcFormField: true,
              ActionButton: true,
              DTagSection: true,
              'font-awesome-icon': true,
              VTooltip: true
            }
          }
        }
      )
      await nextTick()
      await resolveAll()
      return wrapper
    }

    let wrapper = await mountDialog()
    for (const testId of ['next', 'back', 'download', 'lookup']) {
      await wrapper.get(`[data-testid="${testId}"]`).trigger('click')
      await resolveAll()
    }
    expect(parcelsMock.update).toHaveBeenCalled()
    expect(parcelsMock.lookupFeacnCode).toHaveBeenCalledWith(5)
    expect(parcelsMock.generate).toHaveBeenCalled()
    wrapper.unmount()

    vi.clearAllMocks()
    parcelsMock.item.value = {
      id: 5,
      registerId: 1,
      postingNumber: 'GTC-5',
      statusId: 1,
      checkStatus: 0,
      readOnly: true
    }
    registersMock.item.value = { id: 1, customsProcedureCode: 40 }
    registersMock.nextParcels.mockResolvedValue({ withoutIssues: null, withIssues: null })
    parcelsMock.getById.mockResolvedValue({ id: 5, readOnly: true })
    parcelsMock.generate.mockResolvedValue()
    wrapper = await mountDialog()
    parcelsMock.update.mockClear()

    expect(wrapper.text()).toContain('Изменения запрещены')
    expect(wrapper.get('[data-testid="parcel-actions"]').attributes('data-mutation-disabled')).toBe(
      'true'
    )
    for (const testId of ['next', 'back', 'save', 'download', 'lookup']) {
      await wrapper.get(`[data-testid="${testId}"]`).trigger('click')
      await resolveAll()
    }

    expect(parcelsMock.update).not.toHaveBeenCalled()
    expect(parcelsMock.lookupFeacnCode).not.toHaveBeenCalled()
    expect(parcelsMock.generate).toHaveBeenCalled()
    expect(routerMocks.push).toHaveBeenCalled()
  })
})
