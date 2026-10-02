import qz from 'qz-tray'
import { reactive } from 'vue'
import { printingApi } from './printing.api.js'

export const PRINTER_STORAGE_KEY = 'logibooks.localLabelPrinter'
export function printingError(code, cause) {
  const error = new Error(code)
  error.code = code
  error.cause = cause
  return error
}

export function createQzPrinting({ client = qz, api = printingApi, storage = localStorage } = {}) {
  const state = reactive({ connected: false, printer: '', printers: [] })
  let connecting = null
  let onDisconnect = null
  let initialized = false
  let credentialError = null
  function rejectCredential(error, reject) {
    // QZ replaces signing failures with a generic Error; preserve the Core cause.
    credentialError = error
    reject(error)
  }
  function initialize() {
    if (initialized) return
    client.security.setCertificatePromise((resolve, reject) => { api.certificate().then(resolve, (error) => rejectCredential(error, reject)) }, { rejectOnFailure: true })
    client.security.setSignatureAlgorithm('SHA512')
    client.security.setSignaturePromise((data) => (resolve, reject) => { api.sign(data).then(resolve, (error) => rejectCredential(error, reject)) })
    client.websocket.setClosedCallbacks(() => {
      state.connected = false
      state.printers = []
      onDisconnect?.(printingError('QzUnavailable'))
    })
    initialized = true
  }
  async function connect() {
    initialize()
    if (!connecting) {
      connecting = (async () => {
        credentialError = null
        if (!client.websocket.isActive()) {
          try { await client.websocket.connect({ retries: 0 }) }
          catch (error) { throw credentialError || printingError('QzUnavailable', error) }
        }
        state.connected = true
        try { state.printers = await client.printers.find() }
        catch (error) { throw credentialError || printingError('QzTrustRejected', error) }
        if (!state.printers.length) throw printingError('NoPrinters')
        const saved = storage.getItem(PRINTER_STORAGE_KEY)
        state.printer = saved && state.printers.includes(saved) ? saved : ''
        if (saved && !state.printer) throw printingError('PrinterMissing')
        return state.printers
      })().finally(() => { connecting = null })
    }
    return connecting
  }
  return {
    state, connect,
    onDisconnect(handler) { onDisconnect = handler },
    select(printer) {
      if (!state.printers.includes(printer)) throw printingError('PrinterMissing')
      storage.setItem(PRINTER_STORAGE_KEY, printer)
      state.printer = printer
    },
    async ready() {
      await connect()
      if (!state.printer) throw printingError('NoSelection')
    },
    async submit(label) {
      if (!client.websocket.isActive()) throw printingError('QzUnavailable')
      if (!state.printer) throw printingError('NoSelection')
      if (label.language !== 'TSPL' || !label.contentBase64 || label.widthMm !== 58 || label.heightMm !== 40) throw printingError('InvalidData')
      credentialError = null
      try {
        await client.print(client.configs.create(state.printer, { jobName: label.jobName }), [
          { type: 'raw', format: 'command', flavor: 'base64', data: label.contentBase64 }
        ])
      } catch (error) { throw credentialError || printingError('SubmissionFailed', error) }
    },
    async disconnect() {
      if (connecting) {
        try { await connecting } catch { /* A failed connection is already reported by its caller. */ }
      }
      if (client.websocket.isActive()) await client.websocket.disconnect()
      state.connected = false
    }
  }
}
