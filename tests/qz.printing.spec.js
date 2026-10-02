import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQzPrinting, PRINTER_STORAGE_KEY } from '@/services/qz.printing.js'
import { getPrintingErrorMessage } from '@/helpers/label.printing.helpers.js'

let client, api, service
const label = { language: 'TSPL', contentBase64: 'wMHC', jobName: 'parcel 7', widthMm: 58, heightMm: 40 }
beforeEach(() => {
  localStorage.clear()
  client = {
    security: { setCertificatePromise: vi.fn(), setSignatureAlgorithm: vi.fn(), setSignaturePromise: vi.fn() },
    websocket: { isActive: vi.fn(() => false), connect: vi.fn(async () => { client.websocket.isActive.mockReturnValue(true) }), disconnect: vi.fn().mockResolvedValue(), setClosedCallbacks: vi.fn() },
    printers: { find: vi.fn().mockResolvedValue(['Office', 'TSC TE200']) }, configs: { create: vi.fn(() => 'config') }, print: vi.fn().mockResolvedValue()
  }
  api = { certificate: vi.fn().mockResolvedValue('PEM\n'), sign: vi.fn().mockResolvedValue('signature') }
  service = createQzPrinting({ client, api })
})
describe('QZ printing', () => {
  it('initializes authenticated signing once, preserving exact data and callback failures', async () => {
    await service.connect()
    await service.connect()
    expect(client.security.setSignatureAlgorithm).toHaveBeenCalledWith('SHA512')
    expect(client.security.setCertificatePromise).toHaveBeenCalledTimes(1)
    const certificate = client.security.setCertificatePromise.mock.calls[0][0]
    expect(await new Promise(certificate)).toBe('PEM\n')
    const signing = client.security.setSignaturePromise.mock.calls[0][0]
    const exact = '  {"city":"Душанбе"}\n'
    expect(await new Promise(signing(exact))).toBe('signature')
    expect(api.sign).toHaveBeenCalledWith(exact)
    const error = new Error('server disabled')
    api.certificate.mockRejectedValueOnce(error)
    await expect(new Promise(certificate)).rejects.toBe(error)
    api.sign.mockRejectedValueOnce(error)
    await expect(new Promise(signing(exact))).rejects.toBe(error)
  })
  it('preserves Core failures when QZ applies its certificate/signature transformations', async () => {
    const disabled = Object.assign(new Error('disabled'), { status: 503, data: { code: 'QzDisabled' } })
    api.certificate.mockRejectedValueOnce(disabled)
    client.websocket.connect.mockImplementationOnce(async () => {
      const [callback, options] = client.security.setCertificatePromise.mock.calls[0]
      try { await new Promise(callback) }
      catch (error) {
        // qz-tray normally falls back to an unsigned/null certificate here.
        if (options?.rejectOnFailure) throw error
      }
    })
    await expect(service.connect()).rejects.toBe(disabled)
    expect(client.security.setCertificatePromise.mock.calls[0][1]).toEqual({ rejectOnFailure: true })
    const origin = Object.assign(new Error('origin'), { status: 403, data: { code: 'QzOriginRejected' } })
    api.sign.mockRejectedValueOnce(origin)
    client.printers.find.mockImplementationOnce(async () => {
      const signing = client.security.setSignaturePromise.mock.calls[0][0]
      try { return await new Promise(signing('exact printer request')) }
      catch { throw new Error('Failed to sign request') }
    })
    await expect(service.connect()).rejects.toBe(origin)
    expect(getPrintingErrorMessage(origin)).toContain('не разрешает')
    await service.connect()
    service.select('TSC TE200')
    api.sign.mockRejectedValueOnce(disabled)
    client.print.mockImplementationOnce(async () => {
      const signing = client.security.setSignaturePromise.mock.calls[0][0]
      try { return await new Promise(signing('exact print request')) }
      catch { throw new Error('Failed to sign request') }
    })
    await expect(service.submit(label)).rejects.toBe(disabled)
    expect(getPrintingErrorMessage(disabled)).toContain('отключена на сервере')
    client.print.mockRejectedValueOnce(new Error('ordinary submission failure'))
    await expect(service.submit(label)).rejects.toMatchObject({ code: 'SubmissionFailed' })
  })
  it('coalesces connecting, restores selection, revalidates and submits unchanged base64', async () => {
    localStorage.setItem(PRINTER_STORAGE_KEY, 'TSC TE200')
    await Promise.all([service.ready(), service.ready()])
    expect(client.websocket.connect).toHaveBeenCalledTimes(1)
    service.select('Office')
    expect(localStorage.getItem(PRINTER_STORAGE_KEY)).toBe('Office')
    await service.submit(label)
    expect(client.configs.create).toHaveBeenCalledWith('Office', { jobName: 'parcel 7' })
    expect(client.print).toHaveBeenCalledWith('config', [{ type: 'raw', format: 'command', flavor: 'base64', data: 'wMHC' }])
    client.printers.find.mockResolvedValueOnce(['TSC TE200'])
    await expect(service.ready()).rejects.toMatchObject({ code: 'PrinterMissing' })
    expect(service.state.printer).toBe('')
    await expect(service.submit(label)).rejects.toMatchObject({ code: 'NoSelection' })
    service.select('TSC TE200')
    expect(() => service.select('gone')).toThrow('PrinterMissing')
  })
  it('rejects unavailable, untrusted, absent and unselected printers', async () => {
    client.websocket.connect.mockRejectedValueOnce(new Error('offline'))
    await expect(service.connect()).rejects.toMatchObject({ code: 'QzUnavailable' })
    client.printers.find.mockRejectedValueOnce(new Error('trust'))
    await expect(service.connect()).rejects.toMatchObject({ code: 'QzTrustRejected' })
    client.printers.find.mockResolvedValueOnce([])
    await expect(service.connect()).rejects.toMatchObject({ code: 'NoPrinters' })
    await expect(service.ready()).rejects.toMatchObject({ code: 'NoSelection' })
    service.select('TSC TE200')
    client.print.mockRejectedValueOnce(new Error('unknown submission'))
    await expect(service.submit(label)).rejects.toMatchObject({ code: 'SubmissionFailed' })
    await expect(service.submit({ ...label, language: 'ZPL' })).rejects.toMatchObject({ code: 'InvalidData' })
    client.websocket.isActive.mockReturnValue(false)
    await expect(service.submit(label)).rejects.toMatchObject({ code: 'QzUnavailable' })
  })
  it('reports disconnection, reconnects and propagates teardown failure', async () => {
    await service.connect()
    const closed = vi.fn()
    service.onDisconnect(closed)
    client.websocket.setClosedCallbacks.mock.calls[0][0]()
    expect(service.state.connected).toBe(false)
    expect(closed).toHaveBeenCalledWith(expect.objectContaining({ code: 'QzUnavailable' }))
    await service.connect()
    client.websocket.disconnect.mockRejectedValueOnce(new Error('stop failed'))
    await expect(service.disconnect()).rejects.toThrow('stop failed')
    await service.disconnect()
    client.websocket.setClosedCallbacks.mock.calls[0][0]()
    expect(closed).toHaveBeenCalledTimes(2)
    await service.disconnect()
  })
  it('waits for an ongoing or failed connect before disconnecting', async () => {
    let done
    client.websocket.connect.mockImplementationOnce(() => new Promise((resolve) => { done = resolve }))
    const start = service.connect()
    const stop = service.disconnect()
    done()
    await Promise.all([start, stop])
    client.websocket.isActive.mockReturnValue(false)
    client.websocket.connect.mockRejectedValueOnce(new Error('failed'))
    const failed = service.connect()
    const cleanup = service.disconnect()
    await expect(failed).rejects.toThrow('QzUnavailable')
    await cleanup
  })
  it('presents distinct domain errors and safe fallbacks', () => {
    expect(getPrintingErrorMessage({ cause: { data: { code: 'QzDisabled' } }, code: 'QzUnavailable' })).toContain('отключена на сервере')
    expect(getPrintingErrorMessage({ data: { code: 'Overflow' } })).toContain('не помещается')
    expect(getPrintingErrorMessage(new Error('network'))).toBe('network')
    expect(getPrintingErrorMessage(null)).toBe('Ошибка локальной печати')
  })
})
