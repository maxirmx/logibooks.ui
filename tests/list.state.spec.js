import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { effectScope, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { AUTH_LIST_SCHEMA } from '@/helpers/auth.list.state.js'
import { createListRefs, createSessionListState, LIST_STATE_STORAGE_KEY, listField, pageField, pageSizeField, scalarField } from '@/helpers/list.state.helpers.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useListStateStore } from '@/stores/list.state.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useListState } from '@/composables/useListState.js'
import { useListPageBounds } from '@/composables/useListPageBounds.js'
import { useParcelBoxScope } from '@/composables/useParcelBoxScope.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { buildParcelsFilterParams, buildParcelsWhFilterParams } from '@/stores/parcels.store.js'
import { reportError } from '@/helpers/error.helpers.js'

vi.mock('@/router', () => ({ default: { push: vi.fn().mockResolvedValue() } }))
vi.mock('@/helpers/fetch.wrapper.js', () => ({ fetchWrapper: { get: vi.fn().mockResolvedValue({}) } }))
vi.mock('@/helpers/error.helpers.js', async original => ({ ...await original(), reportError: vi.fn() }))

const piniaInstances = []
const scopes = []
function reload() {
  const pinia = createPinia()
  piniaInstances.push(pinia)
  setActivePinia(pinia)
  return useAuthStore()
}
function inScope(fn) {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(fn)
}
function seed(lists, userId = 1) {
  sessionStorage.setItem(LIST_STATE_STORAGE_KEY, JSON.stringify({ version: 1, userId, lists }))
}
const key = (id, context = '') => JSON.stringify([id, context])
const document = () => JSON.parse(sessionStorage.getItem(LIST_STATE_STORAGE_KEY))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('user', JSON.stringify({ id: 1, roles: [] }))
  vi.clearAllMocks()
})
afterEach(() => {
  vi.restoreAllMocks()
  scopes.splice(0).forEach(scope => scope.stop())
  piniaInstances.splice(0).forEach(pinia => disposePinia(pinia))
})

describe('registered list controls', () => {
  it.each(['registers_status', 'registers_wh_status', 'registers_procedure', 'registers_wh_procedure',
    'stopwords_procedure', 'stopwords_country', 'feacnlocalprefixes_procedure', 'feacnlocalprefixes_country'])('preserves numeric selector values and the all option for %s', name => {
    let auth = reload()
    auth[name] = 10
    auth = reload()
    expect(auth[name]).toBe(10)
    auth[name] = 'all'
    expect(reload()[name]).toBe('all')
  })
  it.each(Object.entries(AUTH_LIST_SCHEMA))('round-trips %s immediately', (name, field) => {
    const auth = reload()
    expect(auth[name]).toEqual(field.value)
    const value = name.endsWith('_per_page') ? -1 : name.endsWith('_page') ? 4
      : Array.isArray(field.value) ? [{ key: 'id', order: 'desc' }]
        : typeof field.value === 'boolean' ? true
          : field.value === null ? 7 : 'test filter'
    auth[name] = value
    expect(document().lists[key('auth')][name]).toEqual(value)
    expect(reload()[name]).toEqual(value)
  })

  it('retains cleared values, legacy sort strings and deep sort mutations without credentials', () => {
    const auth = reload()
    auth.parcels_status = 3
    auth.parcels_status = null
    auth.parcels_hide_legacy_restrictions = true
    auth.parcels_hide_legacy_restrictions = false
    auth.users_search = 'query'
    auth.users_search = ''
    auth.users_sort_by = ['name']
    auth.parcels_sort_by[0].order = 'desc'
    auth.selectedParcelId = 123
    auth.re_jwt = 'secret'
    const restored = reload()
    expect(restored.parcels_status).toBeNull()
    expect(restored.parcels_hide_legacy_restrictions).toBe(false)
    expect(restored.users_search).toBe('')
    expect(restored.users_sort_by).toEqual(['name'])
    expect(restored.parcels_sort_by).toEqual([{ key: 'id', order: 'desc' }])
    expect(restored.selectedParcelId).toBeNull()
    expect(JSON.stringify(document())).not.toMatch(/secret|selectedParcelId|roles|token/)
  })

  it('restores personal and ordinary filters together into query builders', () => {
    const auth = reload()
    auth.setParcelFilterId(23)
    Object.assign(auth, { parcels_tnved: '4901', parcels_sort_by: [{ key: 'frozenOrder', order: 'asc' }], parcels_page: 3,
      parcels_wh_number: 'WH-123', parcels_wh_zone: 2, parcels_wh_page: 4 })
    const restored = reload()
    const paperwork = buildParcelsFilterParams(restored)
    const warehouse = buildParcelsWhFilterParams(restored)
    expect(paperwork.get('parcelFilterId')).toBe('23')
    expect(paperwork.get('tnVed')).toBe('4901')
    expect(paperwork.get('sortBy')).toBe('frozenOrder')
    expect(warehouse.get('parcelFilterId')).toBe('23')
    expect(warehouse.get('numberPrefix')).toBe('WH-123')
    expect(warehouse.get('zone')).toBe('2')
    expect(restored.parcels_page).toBe(3)
    expect(restored.parcels_wh_page).toBe(4)
  })

  it('uses defaults for invalid fields and ignores unknown keys', () => {
    seed({ [key('auth')]: { users_page: 0, users_per_page: -2, users_search: {}, users_sort_by: [{}],
      parcels_sort_by: null, parcels_hide_legacy_restrictions: 'false', parcels_status: {},
      companies_search: 'valid', token: 'ignored' } })
    const auth = reload()
    for (const name of ['users_page', 'users_per_page', 'users_search', 'users_sort_by', 'parcels_sort_by', 'parcels_hide_legacy_restrictions', 'parcels_status']) {
      expect(auth[name]).toEqual(AUTH_LIST_SCHEMA[name].value)
    }
    expect(auth.companies_search).toBe('valid')
    expect(auth.token).toBeUndefined()
    auth.persistListState()
    expect(document().lists[key('auth')].token).toBeUndefined()
  })

  it('clears live and saved state on account changes, keeps same-user refresh and other preferences', () => {
    const auth = reload()
    const local = inScope(() => useListState('local', { search: listField('') }))
    local.search.value = 'private'
    auth.users_search = 'private'
    auth.setScanjobMonitorFollowUserId(9)
    auth.user = { id: 1, roles: ['logist'], token: 'refreshed' }
    expect(auth.users_search).toBe('private')
    auth.user = { id: 2, roles: [] }
    expect(auth.users_search).toBe('')
    expect(local.search.value).toBe('')
    expect(sessionStorage.getItem(LIST_STATE_STORAGE_KEY)).toBeNull()
    expect(auth.scanjobmonitor_follow_user_id).toBe(9)
    local.search.value = 'second user'
    expect(document().userId).toBe(2)
    auth.logout()
    expect(local.search.value).toBe('')
    expect(sessionStorage.getItem(LIST_STATE_STORAGE_KEY)).toBeNull()
  })

  it.each([2, null])('does not restore a document belonging to account %s', userId => {
    seed({ [key('auth')]: { users_search: 'other account' } }, userId)
    expect(reload().users_search).toBe('')
    expect(sessionStorage.getItem(LIST_STATE_STORAGE_KEY)).toBeNull()
  })
})

describe('shared local state and lifecycle', () => {
  it('restores per-context controls before use and disposes watchers', () => {
    reload()
    const context = ref(42)
    let scope = effectScope()
    const state = scope.run(() => useListState('history', { page: pageField(), search: listField('') }, () => context.value))
    state.page.value = 4
    state.search.value = 'reason'
    context.value = 43
    expect(state.page.value).toBe(1)
    expect(state.search.value).toBe('')
    state.page.value = 2
    context.value = 42
    expect(state.page.value).toBe(4)
    expect(state.search.value).toBe('reason')
    context.value = null
    expect(state.page.value).toBe(1)
    state.search.value = 'inactive'
    expect(document().lists[key('history', null)]).toBeUndefined()
    context.value = 42
    scope.stop()
    const saved = sessionStorage.getItem(LIST_STATE_STORAGE_KEY)
    state.search.value = 'disposed'
    context.value = 44
    expect(sessionStorage.getItem(LIST_STATE_STORAGE_KEY)).toBe(saved)
    reload()
    scope = effectScope()
    const restored = scope.run(() => useListState('history', { page: pageField(), search: listField('') }, () => 42))
    expect(restored.page.value).toBe(4)
    expect(restored.search.value).toBe('reason')
    scope.stop()
  })

  it('hydrates controls already bound when authentication initializes', () => {
    seed({ [key('local')]: { search: 'restored' } })
    setActivePinia(createPinia())
    const local = inScope(() => useListState('local', { search: listField('') }))
    useAuthStore()
    expect(local.search.value).toBe('restored')
    useListStateStore().setUser(1)
    expect(local.search.value).toBe('restored')
  })

  it('clamps only after loading has completed', async () => {
    const page = ref(7), max = ref(1), ready = ref(false)
    const loaded = inScope(() => useListPageBounds(page, max, ready))
    max.value = 2
    await nextTick()
    expect(page.value).toBe(7)
    max.value = 9
    ready.value = true
    await nextTick()
    expect(page.value).toBe(7)
    max.value = 2
    await nextTick()
    expect(page.value).toBe(7)
    max.value = 9
    loaded.value = true
    await nextTick()
    max.value = 3
    await nextTick()
    expect(page.value).toBe(3)
  })

  it.each(['paperwork', 'warehouse'])('retains %s box page on reload and resets on actual scope changes', async mode => {
    reload()
    const boxId = ref(3), page = ref(5), boxNumber = ref('other'), localBoxNumber = ref('other'), onChange = vi.fn()
    const options = { mode, boxId: () => boxId.value, page, boxNumber, localBoxNumber, onChange }
    inScope(() => useParcelBoxScope(options))
    expect(page.value).toBe(1)
    expect(boxNumber.value).toBe('')
    expect(localBoxNumber.value).toBe('')
    expect(onChange).not.toHaveBeenCalled()
    page.value = 5
    reload()
    inScope(() => useParcelBoxScope(options))
    expect(page.value).toBe(5)
    boxId.value = null
    expect(page.value).toBe(1)
    await nextTick()
    expect(onChange).toHaveBeenCalled()
  })

  it('supports box scopes on paperwork tables with no box-number input', () => {
    reload()
    inScope(() => useParcelBoxScope({ mode: 'paperwork', boxId: () => null, page: ref(4), onChange: vi.fn() }))
  })

  it('retains the mounted box context when accounts change and the new account reloads', async () => {
    const auth = reload()
    inScope(() => useParcelBoxScope({ mode: 'warehouse', boxId: () => 17,
      page: ref(3), onChange: vi.fn() }))
    auth.user = { id: 2, roles: [] }
    await nextTick()
    auth.parcels_wh_page = 4
    localStorage.setItem('user', JSON.stringify({ id: 2, roles: [] }))
    const restored = reload()
    const page = ref(restored.parcels_wh_page)
    inScope(() => useParcelBoxScope({ mode: 'warehouse', boxId: () => 17, page, onChange: vi.fn() }))
    expect(page.value).toBe(4)
  })
})

describe('storage failures', () => {
  it.each([false, true])('retries an unread document without overwriting saved controls (intervening edit: %s)', async edit => {
    seed({ [key('auth')]: { users_search: 'saved search', parcels_tnved: '4901', parcels_page: 3 } })
    const originalRead = Storage.prototype.getItem
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === LIST_STATE_STORAGE_KEY) throw new Error('Storage unavailable')
      return originalRead.call(this, key)
    })
    const auth = reload()
    const region = mount(PageAlertRegion)
    expect(region.findAll('[role="alert"]')).toHaveLength(1)
    if (edit) auth.users_search = 'new search'
    expect(auth.persistListState()).toBe(false)
    expect(JSON.parse(originalRead.call(sessionStorage, LIST_STATE_STORAGE_KEY)).lists[key('auth')].users_search).toBe('saved search')
    await region.find('.page-alert-region__action').trigger('click')
    expect(region.findAll('[role="alert"]')).toHaveLength(1)
    read.mockRestore()
    await region.find('.page-alert-region__action').trigger('click')
    expect(auth.users_search).toBe(edit ? 'new search' : 'saved search')
    expect(auth.parcels_tnved).toBe('4901')
    expect(auth.parcels_page).toBe(3)
    expect(document().lists[key('auth')].parcels_tnved).toBe('4901')
    expect(region.find('[role="alert"]').exists()).toBe(false)
    region.unmount()
  })

  it.each(['{broken', 'null', JSON.stringify({ version: 2, lists: {} }), JSON.stringify({ version: 1, lists: [] })])('shows malformed storage once and retries using live controls: %s', async raw => {
    sessionStorage.setItem(LIST_STATE_STORAGE_KEY, raw)
    const auth = reload()
    const region = mount(PageAlertRegion)
    expect(region.findAll('[role="alert"]')).toHaveLength(1)
    expect(region.text()).toContain('Не удалось сохранить или восстановить настройки списков')
    expect(reportError).toHaveBeenCalledOnce()
    await region.find('.page-alert-region__action').trigger('click')
    expect(document().version).toBe(1)
    expect(auth.users_search).toBe('')
    expect(useAlertStore().alert).toBeNull()
    region.unmount()
  })

  it('retains values after a write failure, deduplicates automatic errors, and retries the latest state', async () => {
    const auth = reload()
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    auth.users_search = 'first'
    auth.users_search = 'latest'
    expect(auth.persistListState()).toBe(false)
    expect(auth.users_search).toBe('latest')
    expect(reportError).toHaveBeenCalledOnce()
    const region = mount(PageAlertRegion)
    expect(region.findAll('[role="alert"]')).toHaveLength(1)
    await region.find('.page-alert-region__action').trigger('click')
    expect(region.findAll('[role="alert"]')).toHaveLength(1)
    expect(reportError).toHaveBeenCalledTimes(2)
    write.mockRestore()
    await region.find('.page-alert-region__action').trigger('click')
    expect(document().lists[key('auth')].users_search).toBe('latest')
    expect(region.find('[role="alert"]').exists()).toBe(false)
    region.unmount()
  })

  it('recovers from unavailable reads and failed logout cleanup without leaking another account', () => {
    const originalRead = Storage.prototype.getItem
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === LIST_STATE_STORAGE_KEY) throw new Error('Storage unavailable')
      return originalRead.call(this, key)
    })
    const auth = reload()
    expect(auth.users_search).toBe('')
    expect(reportError).toHaveBeenCalledOnce()
    read.mockRestore()
    auth.users_search = 'private'
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('Storage unavailable') })
    // Exercise the session owner directly: unrelated authentication storage can fail too.
    useListStateStore().setUser(null)
    expect(auth.users_search).toBe('')
    remove.mockRestore()
    expect(useAlertStore().alert.action.handler()).toBe(true)
    expect(sessionStorage.getItem(LIST_STATE_STORAGE_KEY)).toBeNull()
  })

  it('low-level callbacks receive failures; anonymous state is never written', () => {
    const onError = vi.fn(), session = createSessionListState(onError)
    const schema = { page: pageField(), size: pageSizeField(10), choice: scalarField(null), sort: listField([]) }
    const refs = createListRefs(schema)
    session.setUser(null)
    const { stop } = session.bind('anonymous', refs, schema)
    refs.page.value = 3
    expect(sessionStorage.getItem(LIST_STATE_STORAGE_KEY)).toBeNull()
    session.setUser(1)
    refs.choice.value = Infinity
    refs.sort.value = ['id', { key: 'name', order: 'asc' }]
    session.persist()
    expect(onError).not.toHaveBeenCalled()
    stop()
  })
})
