import { reactive } from 'vue'
import { printingError } from './qz.printing.js'
import { reportError } from '@/helpers/error.helpers.js'

export const automaticPrintHistory = new Set()
export const MAX_PRINT_QUEUE = 50
export const MAX_PRINT_HISTORY = 10000

export function createLabelPrintingCoordinator({ qz, api, channel, ownership, onError, onSent, history = automaticPrintHistory }) {
  const state = reactive({ mode: 'Off', busy: false, paused: false, failed: null, overflow: null, queued: 0, last: null })
  let scope = { scanJobId: null, userId: null }
  let epoch = 0
  let accepting = false
  let queue = []
  let working = null
  let manualRunning = false

  function pause(error) {
    if (!accepting || state.paused) return
    state.paused = true
    if (!manualRunning) onError(error)
  }
  async function disarm() {
    accepting = false
    epoch++
    queue = []
    state.mode = 'Off'
    state.paused = false
    state.failed = null
    state.overflow = null
    state.queued = 0
    try { await channel.stop() } finally { await ownership.release() }
  }
  async function setScope(scanJobId, userId) {
    scope = { scanJobId, userId }
    state.last = null
    await disarm()
  }
  async function stopIfPrinterMissing() {
    if (qz.state.printer || state.mode === 'Off') return
    try { await disarm() }
    catch (error) {
      // Preserve the original printing failure; cleanup must not replace its message.
      reportError(error, { context: 'missing printer cleanup' })
    }
  }
  async function arm(mode) {
    await disarm()
    if (mode === 'Off') return
    if (!['KGT', 'TJ'].includes(mode)) throw printingError('InvalidData')
    if (!scope.scanJobId || !scope.userId) throw printingError('NoOperator')
    const version = epoch
    try {
      await qz.ready()
      if (version !== epoch) return
      if (!await ownership.acquire()) throw printingError('OtherTab')
      if (version !== epoch) { await ownership.release(); return }
      state.mode = mode
      accepting = true
      await channel.start(scope.scanJobId, scope.userId)
    } catch (error) {
      if (version === epoch) { await disarm(); throw error }
      // Scope changes cancel an arm operation before it can accept events.
    }
  }
  async function send(target, version) {
    await qz.ready()
    if (version !== epoch) return false
    const label = await api.label(target)
    if (version !== epoch) return false
    if (target.revision && label.revision !== target.revision) throw printingError('RevisionChanged')
    await qz.submit(label)
    if (version === epoch) {
      if (target.scanCodeId != null) state.last = { ...target }
      onSent(target)
    }
    return true
  }
  function pump() {
    if (working || state.busy || state.paused || !queue.length) return
    const target = queue.shift()
    state.queued = queue.length
    const version = epoch
    state.busy = true
    working = (async () => {
      // Assign the worker before a synchronous candidate error can finish it.
      await Promise.resolve()
      try {
        if (target.errorCode) throw printingError(target.errorCode)
        await send(target, version)
      } catch (error) {
        if (version === epoch) {
          const alreadyReported = state.paused
          state.failed = target
          state.paused = true
          if (!alreadyReported) onError(error)
          await stopIfPrinterMissing()
        }
      } finally {
        state.busy = false
        working = null
        pump()
      }
    })()
  }
  function consume(event) {
    if (!accepting || Number(event.scanJobId) !== Number(scope.scanJobId) || Number(event.userId) !== Number(scope.userId)) return
    const template = state.mode === 'KGT' ? 'KGT' : 'TJ_EXPORT'
    for (const candidate of event.printCandidates ?? []) {
      if (candidate.template !== template || Number(candidate.scanJobId) !== Number(scope.scanJobId)) continue
      const key = [candidate.scanJobId, candidate.scanCodeId, candidate.template, candidate.revision].join(':')
      if (history.has(key)) continue
      if (state.overflow) continue
      if (queue.length >= MAX_PRINT_QUEUE || history.size >= MAX_PRINT_HISTORY) {
        state.overflow = { ...candidate }
        pause(printingError('QueueOverflow'))
        continue
      }
      history.add(key)
      queue.push({ ...candidate })
      state.queued = queue.length
    }
    pump()
  }
  async function manual(target) {
    if (state.busy || queue.length || state.failed) return false
    state.busy = true
    manualRunning = true
    const captured = { ...target }
    const version = epoch
    try { return await send(captured, version) }
    catch (error) { await stopIfPrinterMissing(); throw error }
    finally { manualRunning = false; state.busy = false; pump() }
  }
  async function retry() {
    if (state.busy || state.overflow) return false
    state.busy = true
    const version = epoch
    try {
      await qz.ready()
      if (version !== epoch) return false
      if (accepting && !await channel.resume()) return false
      if (version !== epoch) return false
      const target = state.failed
      if (target) queue.unshift(target)
      state.failed = null
      state.paused = false
    } catch (error) { await stopIfPrinterMissing(); throw error }
    finally { state.busy = false }
    pump()
    return true
  }
  qz.onDisconnect(pause)
  return { state, arm, disarm, setScope, consume, manual, retry, pause, stopIfPrinterMissing }
}
