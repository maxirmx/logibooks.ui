import { afterEach, describe, expect, it, vi } from 'vitest'
import { printingRequest, printingApi, createPrintChannel } from '@/services/printing.api.js'
import { flushPromises } from '@vue/test-utils'
import { roleAdmin, roleWhManager, roleWhOperator } from '@/helpers/user.roles.js'
const auth = vi.hoisted(() => ({ user: { token: 'token' } }))
const hub = vi.hoisted(() => ({ on: vi.fn(), onclose: vi.fn(), onreconnecting: vi.fn(), onreconnected: vi.fn(), start: vi.fn(), stop: vi.fn(), invoke: vi.fn() }))
const builder = vi.hoisted(() => ({ withUrl: vi.fn(), withAutomaticReconnect: vi.fn(), build: vi.fn() }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => auth }))
vi.mock('@microsoft/signalr', () => ({ HubConnectionState: { Connected: 'Connected', Disconnected: 'Disconnected' }, HubConnectionBuilder: function () { return builder } }))
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); auth.user = { token: 'token' } })
function response(text, status = 200, type = 'application/json') { return { ok: status < 400, status, text: async () => text, headers: { get: () => type } } }
describe('printing API', () => {
  it('fetches fresh PEM and signs exact strings with authentication, without logging', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response('PEM\n', 200, 'text/plain')).mockResolvedValueOnce(response('{"signature":"sig"}')).mockResolvedValueOnce(response('{}')).mockResolvedValueOnce(response('{}'))
    vi.stubGlobal('fetch', fetch)
    expect(await printingApi.certificate()).toBe('PEM\n')
    const data = ' \n{}'
    expect(await printingApi.sign(data)).toBe('sig')
    expect(fetch.mock.calls[1][1]).toMatchObject({ headers: { Authorization: 'Bearer token' }, cache: 'no-store', body: JSON.stringify({ data }) })
    await printingApi.label({ scanJobId: 42, parcelId: 7, template: 'WBRN' })
    expect(fetch.mock.calls[2][0]).toContain('/scanjobs/42/monitor/parcels/7/label?template=WBRN')
    await printingApi.label({ scanJobId: 42, scanCodeId: 8, template: 'TJ_EXPORT' })
    expect(fetch.mock.calls[3][0]).toContain('/monitor/scans/8/label?template=TJ_EXPORT')
  })
  it('rejects transport, server, malformed and text failures without notification', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response('{"msg":"disabled","code":"QzDisabled"}', 503)).mockResolvedValueOnce(response('failure', 500, 'text/plain')).mockResolvedValueOnce(response('invalid'))
    vi.stubGlobal('fetch', fetch)
    await expect(printingApi.certificate()).rejects.toThrow('offline')
    await expect(printingApi.sign('x')).rejects.toMatchObject({ message: 'disabled', status: 503, data: { code: 'QzDisabled' } })
    await expect(printingRequest('/qz/certificate')).rejects.toMatchObject({ status: 500 })
    await expect(printingApi.label({ scanJobId: 1, parcelId: 2, template: 'OZON' })).rejects.toThrow()
    auth.user = null
    fetch.mockResolvedValueOnce(response('{}'))
    await printingRequest('/qz/certificate')
    expect(fetch.mock.calls.at(-1)[1].headers.Authorization).toBe('Bearer ')
  })
})
describe('dedicated live printing channel', () => {
  function setup() {
    builder.withUrl.mockReturnValue(builder); builder.withAutomaticReconnect.mockReturnValue(builder); builder.build.mockReturnValue(hub)
    hub.state = 'Connected'; hub.start.mockImplementation(async () => { hub.state = 'Connected' }); hub.stop.mockResolvedValue(); hub.invoke.mockResolvedValue()
    const event = vi.fn(), error = vi.fn(), channel = createPrintChannel(event, error)
    return { channel, event, error }
  }
  it.each([roleAdmin, roleWhManager, roleWhOperator])(
    'authenticates as the UI %s while subscribing to a different scanner user', async (role) => {
      auth.user = { id: 100, roles: [role], token: 'ui-user-token' }
      const fetch = vi.fn().mockResolvedValue(response('{}'))
      vi.stubGlobal('fetch', fetch)
      const { channel, event } = setup()
      await channel.start(42, 9)
      expect(builder.withUrl.mock.calls[0][1].accessTokenFactory()).toBe('ui-user-token')
      expect(hub.invoke).toHaveBeenCalledExactlyOnceWith('ObserveScanJobFollowUser', { scanJobId: 42, userId: 9 })
      const scan = { scanJobId: 42, userId: 9, scanCodeId: 8 }
      hub.on.mock.calls[0][1](scan)
      expect(event).toHaveBeenCalledExactlyOnceWith(scan)
      await printingApi.label({ scanJobId: 42, scanCodeId: 8, template: 'KGT' })
      expect(fetch.mock.calls[0][0]).toContain('/scanjobs/42/monitor/scans/8/label?template=KGT')
      expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer ui-user-token')
      await channel.stop()
    }
  )
  it('consumes only live follow events and resubscribes without snapshots', async () => {
    const { channel, event, error } = setup()
    await channel.start(42, 8)
    expect(hub.on.mock.calls.map(([name]) => name)).toEqual(['ScanJobMonitorFollowEvent'])
    const follow = hub.on.mock.calls[0][1]
    follow({ scanCodeId: 9 })
    expect(event).toHaveBeenCalledWith({ scanCodeId: 9 })
    expect(builder.withUrl.mock.calls[0][1].accessTokenFactory()).toBe('token')
    auth.user = null
    expect(builder.withUrl.mock.calls[0][1].accessTokenFactory()).toBe('')
    hub.onreconnecting.mock.calls[0][0]()
    hub.onreconnected.mock.calls[0][0]()
    await flushPromises()
    expect(hub.invoke).toHaveBeenLastCalledWith('ObserveScanJobFollowUser', { scanJobId: 42, userId: 8 })
    hub.invoke.mockRejectedValueOnce(new Error('resubscribe failed'))
    hub.onreconnected.mock.calls[0][0]()
    await flushPromises()
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'resubscribe failed' }))
    hub.onclose.mock.calls[0][0](new Error('closed'))
    hub.onclose.mock.calls[0][0]()
    await channel.stop()
    follow({ scanCodeId: 10 })
    hub.onreconnected.mock.calls[0][0]()
    hub.onreconnecting.mock.calls[0][0]()
    hub.onclose.mock.calls[0][0]()
    expect(event).toHaveBeenCalledTimes(1)
    await channel.stop()
  })
  it('restores a terminal follow connection and verifies subscription before continuing', async () => {
    const { channel } = setup()
    expect(await channel.resume()).toBe(false)
    await channel.start(42, 8)
    hub.state = 'Disconnected'
    expect(await channel.resume()).toBe(true)
    expect(hub.start).toHaveBeenCalledTimes(2)
    expect(hub.invoke).toHaveBeenLastCalledWith('ObserveScanJobFollowUser', { scanJobId: 42, userId: 8 })
    hub.invoke.mockRejectedValueOnce(new Error('subscribe denied'))
    await expect(channel.resume()).rejects.toThrow('subscribe denied')
    hub.state = 'Reconnecting'
    await expect(channel.resume()).rejects.toThrow('переподключается')
    hub.state = 'Disconnected'
    hub.start.mockRejectedValueOnce(new Error('start failed'))
    await expect(channel.resume()).rejects.toThrow('start failed')
    let resolve
    hub.start.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    const resuming = channel.resume()
    await channel.stop()
    resolve()
    expect(await resuming).toBe(false)
  })
  it('propagates start, observation and stop failures and cancels pending start', async () => {
    const { channel } = setup()
    hub.start.mockRejectedValueOnce(new Error('start'))
    await expect(channel.start(42, 8)).rejects.toThrow('start')
    hub.invoke.mockRejectedValueOnce(new Error('observe'))
    await expect(channel.start(42, 8)).rejects.toThrow('observe')
    hub.stop.mockRejectedValueOnce(new Error('stop'))
    await expect(channel.stop()).rejects.toThrow('stop')
    let complete
    hub.start.mockImplementationOnce(() => new Promise((done) => { complete = done }))
    const pending = channel.start(42, 8)
    await channel.stop()
    complete()
    await pending
  })
})
