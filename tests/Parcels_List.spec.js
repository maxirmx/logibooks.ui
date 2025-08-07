import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Parcels list export button', () => {
  it('OzonParcels_List disables export when HasIssues returns true', () => {
    const content = readFileSync(resolve('src/components/OzonParcels_List.vue'), 'utf8')
    expect(content).toMatch(/<ActionButton[\s\S]*?:disabled="HasIssues\(item\?\.checkStatusId\)"/)
  })

  it('WbrParcels_List disables export when HasIssues returns true', () => {
    const content = readFileSync(resolve('src/components/WbrParcels_List.vue'), 'utf8')
    expect(content).toMatch(/<ActionButton[\s\S]*?:disabled="HasIssues\(item\?\.checkStatusId\)"/)
  })
})
