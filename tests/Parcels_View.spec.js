/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelsView from '@/views/Parcels_View.vue'
import { resolveAll } from './helpers/test-utils'
import { OZON_COMPANY_ID, WBR_COMPANY_ID } from '@/helpers/company.constants.js'

vi.mock('@/components/WbrParcels_List.vue', () => ({
  default: { template: '<div data-test="wbr-list">WBR</div>' }
}))

vi.mock('@/components/OzonParcels_List.vue', () => ({
  default: { template: '<div data-test="ozon-list">OZON</div>' }
}))

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({ apiUrl: 'http://api' }))

const { fetchWrapper } = await import('@/helpers/fetch.wrapper.js')

describe('Parcels_View', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders WbrParcels_List when register companyId is WBR', async () => {
    fetchWrapper.get.mockResolvedValue({ companyId: WBR_COMPANY_ID })
    const wrapper = mount(ParcelsView, { props: { id: 1 } })
    await resolveAll()
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(false)
  })

  it('renders OzonParcels_List when register companyId is OZON', async () => {
    fetchWrapper.get.mockResolvedValue({ companyId: OZON_COMPANY_ID })
    const wrapper = mount(ParcelsView, { props: { id: 2 } })
    await resolveAll()
    expect(wrapper.find('[data-test="ozon-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wbr-list"]').exists()).toBe(false)
  })
})
