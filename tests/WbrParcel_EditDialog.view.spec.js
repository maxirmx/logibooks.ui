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
  item: ref({ id: 3, productLink: 'http://example.com', hasImage: true }),
  loading: ref(false),
  getImageProcessingUrl: vi.fn(() => 'http://test/api/parcels/3/image'),
  getImageBlob: vi.fn(),
  getById: vi.fn().mockResolvedValue({ id: 3, hasImage: true }),
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
const parcelStatusesMock = vi.hoisted(() => [])
vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    ensureLoaded: vi.fn().mockResolvedValue(),
    parcelStatuses: parcelStatusesMock
  })
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

const authMock = { selectedParcelId: null, isAdmin: ref(false), isSrLogistPlus: true }
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => authMock }))
const alertRef = ref(null)
const alertErrorMock = vi.fn((error, options = {}) => {
  alertRef.value = {
    id: 1,
    severity: 'error',
    message: error?.message || options.fallback
  }
})
const alertStoreMock = {
  get alert() {
    return alertRef.value
  },
  get activePageHosts() {
    return 0
  },
  error: alertErrorMock,
  clear: vi.fn(() => {
    alertRef.value = null
  }),
  dismiss: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  registerPageHost: vi.fn(),
  unregisterPageHost: vi.fn()
}
vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStoreMock
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

import WbrParcel_EditDialog from '@/dialogs/WbrParcel_EditDialog.vue'

describe('WbrParcel_EditDialog image overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmMock = vi.fn()
    authMock.isAdmin.value = false
    authMock.isSrLogistPlus = true
    parcelStatusesMock.length = 0
    parcelsMock.item.value = {
      id: 3,
      statusId: 1,
      checkStatus: 0,
      productLink: 'http://example.com',
      passportNumber: 'AA1234567',
      passportCheckStatus: 30,
      hasImage: true
    }
    parcelsMock.update.mockResolvedValue()
    parcelsMock.generate.mockResolvedValue()
    parcelsMock.lookupFeacnCode.mockResolvedValue()
    parcelsMock.checkPassport.mockResolvedValue()
    parcelsMock.clearPassportCheck.mockResolvedValue()
    alertRef.value = null
    registersMock.item.value = { id: 1, customsProcedureCode: 40 }
    registersMock.nextParcels.mockResolvedValue({ withoutIssues: null, withIssues: null })
    parcelViewsBack.mockResolvedValue(null)
    parcelsMock.getImageBlob.mockResolvedValue(new Blob(['test'], { type: 'image/png' }))
    global.URL.createObjectURL = vi.fn(() => 'blob:mock')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('opens and closes overlay when view-image is triggered', async () => {
    const TestWrapper = {
      components: { WbrParcel_EditDialog },
      template: '<Suspense><WbrParcel_EditDialog :registerId="1" :id="3" /></Suspense>'
    }

    const wrapper = mount(TestWrapper, {
      global: {
        stubs: {
          Field: { template: '<input />' },
          Form: {
            template:
              '<div><slot :errors="{}" :values="{ id: 3 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
          },
          ParcelHeaderActionsBar: true,
          ParcelStatusSection: true,
          FeacnCodeEditor: true,
          ParcelNumberExt: true,
          ActionButton: {
            props: ['item', 'disabled'],
            template:
              '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\', item)"><slot /></button>'
          },
          'font-awesome-icon': true,
          VTooltip: true
        }
      }
    })

    await nextTick()
    await resolveAll()

    expect(wrapper.text()).not.toContain('Номер КГТ')
    expect(wrapper.find('[data-testid="clear-ext-id-action"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="passport-check-actions"]').exists()).toBe(true)

    const passportField = wrapper.findComponent({ name: 'PassportNumberWithActions' })
    expect(passportField.exists()).toBe(true)
    passportField.vm.$emit('check')
    await resolveAll()
    expect(parcelsMock.checkPassport).toHaveBeenCalledWith(3)

    passportField.vm.$emit('clear')
    await resolveAll()
    expect(parcelsMock.clearPassportCheck).toHaveBeenCalledWith(3)

    parcelsMock.item.value = { ...parcelsMock.item.value, passportCheckStatus: 10 }
    await nextTick()
    expect(passportField.props('inputDisabled')).toBe(true)
    expect(passportField.props('checkDisabled')).toBe(true)
    const recipientNameField = wrapper
      .findAllComponents({ name: 'WbrFormField' })
      .find((field) => field.props('name') === 'recipientName')
    expect(recipientNameField.props('disabled')).toBe(true)

    await wrapper.find('[data-test="view-btn"]').trigger('click')
    await resolveAll()

    expect(parcelsMock.getImageBlob).toHaveBeenCalledWith(3)
    const overlay = wrapper.find('[data-test="parcel-image-overlay"]')
    expect(overlay.exists()).toBe(true)

    await overlay.find('button').trigger('click')
    await resolveAll()
    expect(wrapper.find('[data-test="parcel-image-overlay"]').exists()).toBe(false)
    expect(global.URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('disables XML download action for customs-disabled parcel status', async () => {
    parcelStatusesMock.push({ id: 10, title: 'Disabled', useAtCustomsProcessing: false })
    parcelsMock.item.value = {
      id: 3,
      statusId: 10,
      checkStatus: 0,
      productLink: 'http://example.com',
      hasImage: true
    }

    const TestWrapper = {
      components: { WbrParcel_EditDialog },
      template: '<Suspense><WbrParcel_EditDialog :registerId="1" :id="3" /></Suspense>'
    }

    const wrapper = mount(TestWrapper, {
      global: {
        stubs: {
          Field: { template: '<input />' },
          Form: {
            template:
              '<div><slot :errors="{}" :values="{ id: 3, statusId: 10 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
          },
          ParcelHeaderActionsBar: true,
          ParcelStatusSection: true,
          FeacnCodeEditor: true,
          ParcelNumberExt: true,
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

  it('keeps read-only navigation and downloads while blocking all mutations', async () => {
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
          components: { WbrParcel_EditDialog },
          template: '<Suspense><WbrParcel_EditDialog :registerId="1" :id="3" /></Suspense>'
        },
        {
          global: {
            stubs: {
              Field: { template: '<input />' },
              Form: {
                template:
                  '<div><slot :errors="{}" :values="{ id: 3, statusId: 1 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
              },
              ParcelHeaderActionsBar: actionBarStub,
              ParcelStatusSection: true,
              FeacnCodeEditor: true,
              ParcelNumberExt: true,
              ParcelWeightAutoField: true,
              WbrFormField: true,
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
    expect(parcelsMock.lookupFeacnCode).toHaveBeenCalledWith(3)
    expect(parcelsMock.generate).toHaveBeenCalled()
    wrapper.unmount()

    vi.clearAllMocks()
    parcelsMock.item.value = {
      id: 3,
      registerId: 1,
      shk: 'WBR-3',
      statusId: 1,
      checkStatus: 0,
      readOnly: true
    }
    registersMock.item.value = { id: 1, customsProcedureCode: 40 }
    registersMock.nextParcels.mockResolvedValue({ withoutIssues: null, withIssues: null })
    parcelsMock.getById.mockResolvedValue({ id: 3, readOnly: true })
    parcelsMock.generate.mockResolvedValue()
    wrapper = await mountDialog()
    parcelsMock.update.mockClear()

    expect(wrapper.text()).toContain('Посылка доступна только для просмотра')
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

  it('reports next-parcel prefetch failures only while the editor is mounted', async () => {
    const mountDialog = () =>
      mount(
        {
          components: { WbrParcel_EditDialog },
          template: '<Suspense><WbrParcel_EditDialog :registerId="1" :id="3" /></Suspense>'
        },
        {
          global: {
            stubs: {
              Field: { template: '<input />' },
              Form: {
                template:
                  '<div><slot :errors="{}" :values="{ id: 3 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
              },
              ParcelHeaderActionsBar: true,
              ParcelStatusSection: true,
              FeacnCodeEditor: true,
              ParcelNumberExt: true,
              ActionButton: true,
              'font-awesome-icon': true,
              VTooltip: true
            }
          }
        }
      )

    const mountedError = new Error('next parcels failed')
    registersMock.nextParcels.mockRejectedValueOnce(mountedError)
    let wrapper = mountDialog()
    await nextTick()
    await resolveAll()

    expect(alertErrorMock).toHaveBeenCalledWith(mountedError, {
      fallback: 'Не удалось определить соседние посылки'
    })
    expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain(
      'next parcels failed'
    )
    wrapper.unmount()

    alertErrorMock.mockClear()
    alertRef.value = null
    let rejectPrefetch
    registersMock.nextParcels.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectPrefetch = reject
        })
    )
    wrapper = mountDialog()
    await nextTick()
    await resolveAll()

    wrapper.unmount()
    rejectPrefetch(new Error('late next parcels failure'))
    await resolveAll()

    expect(alertErrorMock).not.toHaveBeenCalled()
    expect(alertRef.value).toBeNull()
  })
})
