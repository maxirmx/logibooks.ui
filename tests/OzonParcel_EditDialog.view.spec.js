import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { resolveAll } from './helpers/test-utils'

let confirmMock = null
vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

const parcelsMock = {
  item: ref({ id: 2, productLink: 'http://example.com', hasImage: true }),
  loading: ref(false),
  getImageProcessingUrl: vi.fn(() => 'http://test/api/parcels/2/image'),
  getImageBlob: vi.fn(),
  getById: vi.fn().mockResolvedValue({ id: 2, hasImage: true })
}
vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => parcelsMock
}))

const ensureLoadedFactory = () => ({ ensureLoaded: vi.fn().mockResolvedValue(), add: vi.fn().mockResolvedValue() })
vi.mock('@/stores/parcel.statuses.store.js', () => ({ useParcelStatusesStore: () => ({ ensureLoaded: vi.fn().mockResolvedValue(), parcelStatuses: [] }) }))
vi.mock('@/stores/stop.words.store.js', () => ({ useStopWordsStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/key.words.store.js', () => ({ useKeyWordsStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/feacn.orders.store.js', () => ({ useFeacnOrdersStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/feacn.prefixes.store.js', () => ({ useFeacnPrefixesStore: () => ensureLoadedFactory() }))
vi.mock('@/stores/countries.store.js', () => ({ useCountriesStore: () => ({ ensureLoaded: vi.fn().mockResolvedValue(), countries: [] }) }))
vi.mock('@/stores/parcel.views.store.js', () => ({ useParcelViewsStore: () => ({ add: vi.fn().mockResolvedValue() }) }))
vi.mock('@/stores/registers.store.js', () => ({ useRegistersStore: () => ({ nextParcels: vi.fn().mockResolvedValue({ withoutIssues: null, withIssues: null }) }) }))

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
})
