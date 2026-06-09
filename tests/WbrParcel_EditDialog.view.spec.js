import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { resolveAll } from './helpers/test-utils'

let confirmMock = null
vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

const parcelsMock = {
  item: ref({ id: 3, productLink: 'http://example.com', hasImage: true }),
  loading: ref(false),
  getImageProcessingUrl: vi.fn(() => 'http://test/api/parcels/3/image'),
  getImageBlob: vi.fn(),
  getById: vi.fn().mockResolvedValue({ id: 3, hasImage: true })
}
vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => parcelsMock
}))

const ensureLoadedFactory = () => ({ ensureLoaded: vi.fn().mockResolvedValue(), add: vi.fn().mockResolvedValue() })
const parcelStatusesMock = []
vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    ensureLoaded: vi.fn().mockResolvedValue(),
    parcelStatuses: parcelStatusesMock
  })
}))
vi.mock('@/stores/stop.words.store.js', () => ({ useStopWordsStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/key.words.store.js', () => ({ useKeyWordsStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/feacn.orders.store.js', () => ({ useFeacnOrdersStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/feacn.prefixes.store.js', () => ({ useFeacnPrefixesStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/countries.store.js', () => ({ useCountriesStore: () => ({ ensureLoaded: vi.fn().mockResolvedValue(), countries: [] }) }))
vi.mock('@/stores/parcel.views.store.js', () => ({ useParcelViewsStore: () => ({ add: vi.fn().mockResolvedValue() }) }))
vi.mock('@/stores/registers.store.js', () => ({ useRegistersStore: () => ({ nextParcels: vi.fn().mockResolvedValue({ withoutIssues: null, withIssues: null }) }) }))

const authMock = { selectedParcelId: null, isAdmin: ref(false) }
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => authMock }))
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

import WbrParcel_EditDialog from '@/dialogs/WbrParcel_EditDialog.vue'

describe('WbrParcel_EditDialog image overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmMock = vi.fn()
    authMock.isAdmin.value = false
    parcelStatusesMock.length = 0
    parcelsMock.item.value = { id: 3, productLink: 'http://example.com', hasImage: true }
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
            template: '<div><slot :errors="{}" :values="{ id: 3 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
          },
          ParcelHeaderActionsBar: true,
          ParcelStatusSection: true,
          FeacnCodeEditor: true,
          ParcelNumberExt: true,
          ActionButton: { props: ['item', 'disabled'], template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\', item)"><slot /></button>' },
          'font-awesome-icon': true,
          VTooltip: true
        }
      }
    })

    await nextTick()
    await resolveAll()

    expect(wrapper.text()).not.toContain('Номер КГТ')
    expect(wrapper.find('[data-testid="clear-ext-id-action"]').exists()).toBe(false)

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
    parcelsMock.item.value = { id: 3, statusId: 10, checkStatus: 0, productLink: 'http://example.com', hasImage: true }

    const TestWrapper = {
      components: { WbrParcel_EditDialog },
      template: '<Suspense><WbrParcel_EditDialog :registerId="1" :id="3" /></Suspense>'
    }

    const wrapper = mount(TestWrapper, {
      global: {
        stubs: {
          Field: { template: '<input />' },
          Form: {
            template: '<div><slot :errors="{}" :values="{ id: 3, statusId: 10 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
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
})
