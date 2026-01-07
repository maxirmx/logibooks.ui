import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

// We'll mock many stores and the confirm dialog used by the component
let confirmMock = null
vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

// Mock stores used in the dialog setup
const parcelsMock = {
  item: ref({ id: 2, productLink: 'http://example.com', hasImage: true }),
  loading: ref(false),
  deleteImage: vi.fn().mockResolvedValue(true),
  getById: vi.fn().mockResolvedValue({ id: 2, hasImage: false })
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

import OzonParcel_EditDialog from '@/dialogs/OzonParcel_EditDialog.vue'

describe('OzonParcel_EditDialog delete flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmMock = vi.fn()
  })

  it('calls deleteImage when user confirms', async () => {
    // confirm resolves true
    confirmMock.mockResolvedValue(true)

    const TestWrapper = {
      components: { OzonParcel_EditDialog },
      template: '<Suspense><OzonParcel_EditDialog :registerId="1" :id="2" /></Suspense>'
    }

    const wrapper = mount(TestWrapper, {
      global: {
        stubs: {
          Field: { template: '<input />' },
          // Provide Form that yields slot props including values.id matching prop id
          Form: {
            template: '<div><slot :errors="{}" :values="{ id: 2 }" :isSubmitting="false" :setFieldValue="() => {}"></slot></div>'
          },
          ParcelHeaderActionsBar: true,
          CheckStatusActionsBar: true,
          FeacnCodeEditor: true,
          ParcelNumberExt: true,
          ArticleWithH: true,
          ActionButton: true,
          'font-awesome-icon': true,
          VTooltip: true
        }
      }
    })

    // Wait for component to render inside Suspense
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
    await nextTick()

    // Trigger delete via stubbed ProductLink button
    const btn = wrapper.find('[data-test="delete-btn"]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')

    expect(confirmMock).toHaveBeenCalled()
    expect(parcelsMock.deleteImage).toHaveBeenCalledWith(2)
    expect(parcelsMock.getById).toHaveBeenCalledWith(2)
  })

  it('does not call deleteImage when user cancels', async () => {
    confirmMock.mockResolvedValue(false)

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
          CheckStatusActionsBar: true,
          FeacnCodeEditor: true,
          ParcelNumberExt: true,
          ArticleWithH: true,
          ActionButton: true,
          'font-awesome-icon': true,
          VTooltip: true
        }
      }
    })

    // Wait for component to render inside Suspense
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
