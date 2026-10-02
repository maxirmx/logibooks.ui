import { printingError } from './qz.printing.js'

// Web Locks provide atomic, crash-safe ownership across tabs in the same browser.
export function createPrintingOwnership(locks = navigator.locks) {
  let release = null
  let completion = null
  return {
    async acquire() {
      if (release) return true
      if (!locks) throw printingError('OwnershipUnavailable')
      return new Promise((resolve, reject) => {
        completion = locks.request('logibooks.localLabelAutoPrint', { ifAvailable: true }, (lock) => {
          if (!lock) { resolve(false); return }
          const held = new Promise((done) => { release = done })
          resolve(true)
          return held
        })
        completion.then(undefined, reject)
      })
    },
    async release() {
      release?.()
      release = null
      if (completion) await completion
      completion = null
    }
  }
}
