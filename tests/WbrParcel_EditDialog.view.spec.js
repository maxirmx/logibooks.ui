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

import WbrParcel_EditDialog from '@/dialogs/WbrParcel_EditDialog.vue'

describe('WbrParcel_EditDialog image overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmMock = vi.fn()
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
          CheckStatusActionsBar: true,
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
})
