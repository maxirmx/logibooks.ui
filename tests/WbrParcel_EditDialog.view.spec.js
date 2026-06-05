import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { resolveAll } from './helpers/test-utils'

let confirmMock = null
vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

const parcelsMock = {
  item: ref({ id: 3, productLink: 'http://example.com', hasImage: true, extId: '44' }),
  loading: ref(false),
  getImageProcessingUrl: vi.fn(() => 'http://test/api/parcels/3/image'),
  getImageBlob: vi.fn(),
  getById: vi.fn().mockResolvedValue({ id: 3, hasImage: true }),
  clearExtId: vi.fn().mockResolvedValue(true),
  applyExtIdChange: vi.fn()
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

const authMock = { selectedParcelId: null, isAdmin: ref(false) }
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => authMock }))
const scanJobsMock = {
  startParcelExtIdMonitor: vi.fn().mockResolvedValue(),
  stopParcelExtIdMonitor: vi.fn().mockResolvedValue()
}
vi.mock('@/stores/scanjobs.store.js', () => ({ useScanjobsStore: () => scanJobsMock }))
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
    parcelsMock.item.value = { id: 3, productLink: 'http://example.com', hasImage: true, extId: '44' }
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

  it('renders KGT number and clears it for admins', async () => {
    authMock.isAdmin.value = true

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

    expect(wrapper.text()).toContain('Номер КГТ')
    expect(wrapper.get('#extId').element.value).toBe('44')

    const clearButton = wrapper.get('[data-testid="clear-ext-id-action"]')
    expect(clearButton.attributes('disabled')).toBeUndefined()

    await clearButton.trigger('click')
    await resolveAll()

    expect(parcelsMock.clearExtId).toHaveBeenCalledWith(3)
  })

  it('subscribes to KGT number changes and patches matching register events', async () => {
    const TestWrapper = {
      components: { WbrParcel_EditDialog },
      template: '<Suspense><WbrParcel_EditDialog :registerId="1" :id="3" /></Suspense>'
    }

    mount(TestWrapper, {
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

    expect(scanJobsMock.startParcelExtIdMonitor).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ onChanged: expect.any(Function) })
    )

    const onChanged = scanJobsMock.startParcelExtIdMonitor.mock.calls[0][1].onChanged
    const matchingChange = { registerId: 1, parcelId: 3, extId: '45', revision: 2 }
    const otherRegisterChange = { registerId: 2, parcelId: 3, extId: '46', revision: 3 }

    onChanged(matchingChange)
    onChanged(otherRegisterChange)

    expect(parcelsMock.applyExtIdChange).toHaveBeenCalledTimes(1)
    expect(parcelsMock.applyExtIdChange).toHaveBeenCalledWith(matchingChange)
  })
})
