import { printingError } from './qz.printing.js'

// Web Locks provide atomic, crash-safe ownership across tabs in the same browser.
export function createPrintingOwnership(locks = navigator.locks) {
  let current = null
  async function acquire() {
    while (current?.releaseRequested) await current.completion
    if (current) return current.acquired
    if (!locks) throw printingError('OwnershipUnavailable')
    const request = { releaseRequested: false, release: null, completion: null, acquired: null }
    current = request
    request.acquired = new Promise((resolve, reject) => {
      request.completion = locks.request('logibooks.localLabelAutoPrint', { ifAvailable: true }, (lock) => {
        // A release before this callback cancels acquisition without holding the lock.
        if (!lock || request.releaseRequested) {
          if (current === request) current = null
          resolve(false)
          return
        }
        const held = new Promise((done) => { request.release = done })
        resolve(true)
        return held
      })
      request.completion.then(undefined, reject)
    })
    return request.acquired
  }
  async function release() {
    const request = current
    if (!request) return
    request.releaseRequested = true
    request.release?.()
    try { await request.completion }
    finally {
      if (current === request) current = null
    }
  }
  return { acquire, release }
}
