/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { buildParcelsFilterParams, buildParcelsWhFilterParams, buildParcelsNumberParams } from '@/stores/parcels.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { reportError } from '@/helpers/error.helpers.js'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

vi.mock('@/router', () => ({ default: { push: vi.fn() } }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn() } }))
vi.mock('@/helpers/error.helpers.js', async importOriginal => ({ ...await importOriginal(), reportError: vi.fn() }))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('user', JSON.stringify({ id: 1, roles: [] }))
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('saved parcel filter selection', () => {
  it('remembers the signed-in selection across reloads and resets both list pages', () => {
    const auth = useAuthStore()
    auth.parcels_page = 4
    auth.parcels_wh_page = 6
    auth.setParcelFilterId(23)
    expect(auth.parcels_page).toBe(1)
    expect(auth.parcels_wh_page).toBe(1)
    setActivePinia(createPinia())
    expect(useAuthStore().parcels_filter_id).toBe(23)
    expect(buildParcelsFilterParams(useAuthStore()).get('parcelFilterId')).toBe('23')
    expect(buildParcelsWhFilterParams(useAuthStore()).get('parcelFilterId')).toBe('23')
    expect(buildParcelsNumberParams('123').has('parcelFilterId')).toBe(false)
  })

  it('clears on account change and logout without clearing on same-user refresh', () => {
    const auth = useAuthStore()
    auth.setParcelFilterId(23)
    auth.user = { id: 1, roles: ['logist'] }
    expect(auth.parcels_filter_id).toBe(23)
    auth.user = { id: 2, roles: [] }
    expect(auth.parcels_filter_id).toBeNull()
    expect(localStorage.getItem('logibooks.parcelFilter')).toBeNull()
    auth.setParcelFilterId(31)
    auth.user = null
    expect(auth.parcels_filter_id).toBeNull()
    auth.setParcelFilterId(45)
    expect(auth.parcels_filter_id).toBeNull()
  })

  it.each([null, { userId: 2, filterId: 23 }, { userId: 1, filterId: 0 }, { userId: 1, filterId: '23' }])('ignores invalid or another account\'s stored selection %s', saved => {
    localStorage.setItem('logibooks.parcelFilter', JSON.stringify(saved))
    expect(useAuthStore().parcels_filter_id).toBeNull()
  })

  it('reports malformed storage and lets the user select a new filter', () => {
    localStorage.setItem('logibooks.parcelFilter', '{broken')
    const auth = useAuthStore()
    expect(auth.parcels_filter_id).toBeNull()
    expect(reportError).toHaveBeenCalledOnce()
    auth.setParcelFilterId(24)
    expect(auth.parcels_filter_id).toBe(24)
    auth.setParcelFilterId('bad')
    expect(auth.parcels_filter_id).toBeNull()
  })

  it('sends the saved filter alongside the current mode controls to adjacent navigation', async () => {
    const auth = useAuthStore()
    auth.setParcelFilterId(23)
    auth.parcels_status = 2
    auth.parcels_hide_legacy_restrictions = true
    auth.parcels_wh_status = 3
    auth.parcels_wh_zone = 10
    fetchWrapper.get.mockResolvedValue({ withoutIssues: { id: 5 } })
    const store = useRegistersStore()
    await store.nextParcels(4)
    let url = new URL(fetchWrapper.get.mock.calls[0][0])
    expect(url.searchParams.get('parcelFilterId')).toBe('23')
    expect(url.searchParams.get('statusId')).toBe('2')
    expect(url.searchParams.get('hideLegacyRestrictions')).toBe('true')
    await store.nextParcels(4, { mode: OP_MODE_WAREHOUSE, boxId: 7 })
    url = new URL(fetchWrapper.get.mock.calls[1][0])
    expect(url.searchParams.get('parcelFilterId')).toBe('23')
    expect(url.searchParams.get('includeAll')).toBe('true')
    expect(url.searchParams.get('statusId')).toBe('3')
    expect(url.searchParams.get('zone')).toBe('10')
    expect(url.searchParams.get('boxId')).toBe('7')
    expect(url.searchParams.has('hideLegacyRestrictions')).toBe(false)
  })

  it('propagates navigation rejection and preserves the remembered selection', async () => {
    const auth = useAuthStore()
    auth.setParcelFilterId(23)
    fetchWrapper.get.mockRejectedValue(new Error('Navigation unavailable'))
    await expect(useRegistersStore().nextParcels(4, { mode: OP_MODE_WAREHOUSE })).rejects.toThrow('Navigation unavailable')
    expect(auth.parcels_filter_id).toBe(23)
  })
})
