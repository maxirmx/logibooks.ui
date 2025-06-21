import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAlertStore } from '@/stores/alert.store.js'

describe('alert store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('success sets success alert', () => {
    const store = useAlertStore()
    store.success('ok')
    expect(store.alert).toEqual({ message: 'ok', type: 'alert-success' })
  })

  it('error sets error alert', () => {
    const store = useAlertStore()
    store.error('bad')
    expect(store.alert).toEqual({ message: 'bad', type: 'alert-danger' })
  })

  it('clear resets alert', () => {
    const store = useAlertStore()
    store.success('ok')
    store.clear()
    expect(store.alert).toBeNull()
  })
})
