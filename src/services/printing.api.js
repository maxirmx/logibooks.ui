import * as signalR from '@microsoft/signalr'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'

// Dedicated transport preserves PEM text and never logs signing bodies.
export async function printingRequest(path, body) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${useAuthStore().user?.token ?? ''}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store'
  })
  const text = await response.text()
  let data = text
  if (response.headers.get('content-type')?.includes('application/json')) data = JSON.parse(text)
  if (!response.ok) {
    const error = new Error(data.msg || `Ошибка сервера печати (${response.status})`)
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}

export const printingApi = {
  certificate: () => printingRequest('/qz/certificate'),
  sign: async (data) => (await printingRequest('/qz/sign', { data })).signature,
  label: ({ scanJobId, parcelId, scanCodeId, template }) => printingRequest(
    `/scanjobs/${scanJobId}/monitor/${scanCodeId == null ? `parcels/${parcelId}` : `scans/${scanCodeId}`}/label?template=${encodeURIComponent(template)}`
  )
}

// A separate follow connection stays subscribed while the monitor navigates boxes.
// Only live follow events are consumed; snapshots and reconnect snapshots are ignored.
export function createPrintChannel(onEvent, onError) {
  let connection = null
  let active = false
  let followRequest = null
  return {
    async start(scanJobId, userId) {
      const current = new signalR.HubConnectionBuilder()
        .withUrl(`${apiUrl.replace(/\/api\/?$/i, '')}/hubs/scan-jobs`, {
          accessTokenFactory: () => useAuthStore().user?.token ?? '', withCredentials: false
        }).withAutomaticReconnect().build()
      connection = current
      followRequest = { scanJobId, userId }
      current.on('ScanJobMonitorFollowEvent', (event) => { if (active) onEvent(event) })
      current.onreconnecting(() => { if (active) onError(new Error('Связь со сканером потеряна. Автопечать приостановлена.')) })
      current.onclose((error) => { if (active) onError(error || new Error('Связь со сканером закрыта.')) })
      const observe = () => current.invoke('ObserveScanJobFollowUser', { scanJobId, userId })
      current.onreconnected(() => {
        if (active) observe().catch(onError)
      })
      await current.start()
      if (connection !== current) return
      active = true
      await observe()
    },
    async resume() {
      const current = connection
      if (!current || !active) return false
      if (current.state === signalR.HubConnectionState.Disconnected) await current.start()
      else if (current.state !== signalR.HubConnectionState.Connected) throw new Error('Сканер переподключается. Повторите после восстановления связи.')
      if (connection !== current || !active) return false
      await current.invoke('ObserveScanJobFollowUser', followRequest)
      return true
    },
    async stop() {
      active = false
      const current = connection
      connection = null
      if (current) await current.stop()
    }
  }
}
