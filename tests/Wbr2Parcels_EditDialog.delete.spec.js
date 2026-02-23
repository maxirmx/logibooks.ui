import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

// We'll mock many stores and the confirm dialog used by the component
let confirmMock = null
vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

// Shared parcels mock so spies are the same instance
const parcelsMock = {
  item: ref({ id: 3, productLink: 'http://example.com/3', hasImage: true }),
  loading: ref(false),
  deleteImage: vi.fn().mockResolvedValue(true),
  getById: vi.fn().mockResolvedValue({ id: 3, hasImage: false })
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

// Mock auth and alert stores
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ selectedParcelId: null }) }))
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => ({ alert: ref(null), error: vi.fn(), clear: vi.fn() }) }))

// Stub out heavy child components and vee-validate Form/Field
vi.mock('@/components/ProductLinkWithActions.vue', () => ({ default: { template: '<button data-test="delete-btn" @click="$emit(\'delete-image\')">Del</button>' } }))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRoute: () => ({ query: {} })
  }
})

import Wbr2Parcels_EditDialog from '@/dialogs/Wbr2Parcel_EditDialog.vue'

describe('Wbr2Parcels_EditDialog delete flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmMock = vi.fn()
  })

  it('calls deleteImage when user confirms', async () => {
    confirmMock.mockResolvedValue(true)

    const TestWrapper = {
      components: { Wbr2Parcels_EditDialog },
      template: '<Suspense><Wbr2Parcels_EditDialog :registerId="2" :id="3" /></Suspense>'
    }

    const wrapper = mount(TestWrapper, {
      global: {
        stubs: {
          Field: { template: '<input />' },
          Form: { template: '<div><slot :errors="{}" :values="{ id: 3 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>' },
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

    // Wait for render inside Suspense
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    const btn = wrapper.find('[data-test="delete-btn"]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')

    expect(confirmMock).toHaveBeenCalled()
    expect(parcelsMock.deleteImage).toHaveBeenCalledWith(3)
    expect(parcelsMock.getById).toHaveBeenCalledWith(3)
  })

  it('does not call deleteImage when user cancels', async () => {
    confirmMock.mockResolvedValue(false)

    const TestWrapper = {
      components: { Wbr2Parcels_EditDialog },
      template: '<Suspense><Wbr2Parcels_EditDialog :registerId="2" :id="3" /></Suspense>'
    }

    const wrapper = mount(TestWrapper, {
      global: {
        stubs: {
          Field: { template: '<input />' },
          Form: { template: '<div><slot :errors="{}" :values="{ id: 3 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>' },
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

    // Wait for render inside Suspense
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    const btn = wrapper.find('[data-test="delete-btn"]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')

    expect(confirmMock).toHaveBeenCalled()
    expect(parcelsMock.deleteImage).not.toHaveBeenCalled()
  })
})
