import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

vi.mock('@/helpers/config.js', () => ({ apiUrl: 'http://localhost/api', enableLog: false }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => ({ user: { token: 'token' } }) }))
vi.mock('@/stores/parcels.store.js', () => ({ buildParcelsFilterParams: vi.fn(), buildParcelsWhFilterParams: vi.fn() }))

beforeEach(() => { setActivePinia(createPinia()); vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => vi.unstubAllGlobals())

it('preserves full ErrMessage and rejection through real multipart transport and store', async () => {
  const data = { msg: 'В манифесте отсутствует столбец «Стикер»', errors: { file: ['Отсутствует столбец'] },
    code: 'ReconciliationFailed', details: { handleId: 'op', finished: true, failureKind: 'InvalidManifest' } }
  fetch.mockResolvedValue(new globalThis.Response(JSON.stringify(data), { status: 400 }))
  const store = useRegistersStore()
  const notification = vi.spyOn(useAlertStore(), 'error')
  const file = new File(['a'], 'manifest.xlsx')
  await expect(store.startReconciliation(7, file, 'op')).rejects.toMatchObject({ status: 400, data })
  expect(store.error.data).toEqual(data)
  expect(notification).not.toHaveBeenCalled()
  expect(fetch.mock.calls[0][0]).toBe('http://localhost/api/registers/7/reconciliation?operationId=op')
  expect(fetch.mock.calls[0][1].body.get('file').name).toBe('manifest.xlsx')
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token')
})

it('preserves terminal GET metadata and returns accepted/completed data', async () => {
  const store = useRegistersStore()
  const data = { msg: 'Результат сохранения неизвестен', errors: {}, code: 'ReconciliationOutcomeUnknown', details: { finished: true } }
  fetch.mockResolvedValueOnce(new globalThis.Response(JSON.stringify(data), { status: 409 }))
  await expect(store.getReconciliation(7, 'op')).rejects.toMatchObject({ status: 409, data })
  expect(store.error.data).toEqual(data)
  fetch.mockResolvedValueOnce(new globalThis.Response(JSON.stringify({ id: 'op' }), { status: 202 }))
  await expect(store.startReconciliation(7, new File(['a'], 'a.xlsx'), 'op')).resolves.toEqual({ id: 'op' })
  const result = { registerId: 7, dangerousGoodsCount: 104, markedCount: 42, newlyMarkedCount: 13,
    excludedCount: 2, registerOnlyCount: 5, manifestOnlyCount: 6 }
  fetch.mockResolvedValueOnce(new globalThis.Response(JSON.stringify({ finished: true, result }), { status: 200 }))
  await expect(store.getReconciliation(7, 'op')).resolves.toEqual({ finished: true, result })
})

it.each([['cancelSplit', 'split'], ['cancelReconciliation', 'reconciliation']])('preserves cancellation responses and rejects %s transport errors', async (method, segment) => {
  const store = useRegistersStore()
  const notification = vi.spyOn(useAlertStore(), 'error')
  const progress = { finished: false, cancellationRequested: true, phase: 'saving' }
  fetch.mockResolvedValueOnce(new globalThis.Response(JSON.stringify(progress), { status: 200 }))
  await expect(store[method](7, 'op/?')).resolves.toEqual(progress)
  expect(fetch.mock.calls[0][0]).toBe(`http://localhost/api/registers/7/${segment}/op%2F%3F/cancel`)
  expect(fetch.mock.calls[0][1].method).toBe('POST')
  const data = { msg: 'Недостаточно прав для отмены операции', errors: {}, code: 'Forbidden' }
  fetch.mockResolvedValueOnce(new globalThis.Response(JSON.stringify(data), { status: 403 }))
  await expect(store[method](7, 'op')).rejects.toMatchObject({ status: 403, data })
  expect(store.error.data).toEqual(data)
  expect(notification).not.toHaveBeenCalled()
})