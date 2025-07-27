// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { findNextParcelWithIssues } from '@/helpers/next.item.helper.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useAuthStore } from '@/stores/auth.store.js'

// Mock the stores
vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: vi.fn()
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: vi.fn()
}))

describe('next.item.helper', () => {
  let mockParcelsStore
  let mockAuthStore

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Setup mock stores
    mockParcelsStore = {
      getAll: vi.fn(),
      items: []
    }
    
    mockAuthStore = {
      parcels_sort_by: [{ key: 'id', order: 'asc' }]
    }
    
    useParcelsStore.mockReturnValue(mockParcelsStore)
    useAuthStore.mockReturnValue(mockAuthStore)
  })

  it('finds the next parcel with issues after current one', async () => {
    // Setup data
    mockParcelsStore.items = [
      { id: 1, checkStatusId: 50 },   // No issues
      { id: 2, checkStatusId: 150 },  // Has issues
      { id: 3, checkStatusId: 120 },  // Has issues
      { id: 4, checkStatusId: 250 }   // No issues
    ]
    
    // Starting from ID 1, should find ID 2
    const result = await findNextParcelWithIssues(1, 1)
    
    expect(mockParcelsStore.getAll).toHaveBeenCalledWith(1, null, null, 1, 1000, 'id', 'asc')
    expect(result).toBe(2)
  })
  
  it('wraps around to the beginning if no issues found after current one', async () => {
    // Setup data
    mockParcelsStore.items = [
      { id: 1, checkStatusId: 150 },  // Has issues
      { id: 2, checkStatusId: 50 },   // No issues
      { id: 3, checkStatusId: 50 },   // No issues
      { id: 4, checkStatusId: 150 }   // Has issues
    ]
    
    // Starting from ID 4, should wrap around and find ID 1
    const result = await findNextParcelWithIssues(1, 4)
    
    expect(result).toBe(1)
  })
  
  it('returns null if no parcels with issues are found', async () => {
    // Setup data with no issues
    mockParcelsStore.items = [
      { id: 1, checkStatusId: 50 },
      { id: 2, checkStatusId: 50 },
      { id: 3, checkStatusId: 300 },
      { id: 4, checkStatusId: 250 }
    ]
    
    const result = await findNextParcelWithIssues(1, 2)
    
    expect(result).toBeNull()
  })
  
  it('returns null if the items array is empty', async () => {
    // Empty items array
    mockParcelsStore.items = []
    
    const result = await findNextParcelWithIssues(1, 1)
    
    expect(result).toBeNull()
  })
  
  it('uses the sort order from the auth store', async () => {
    // Change sort order in auth store
    mockAuthStore.parcels_sort_by = [{ key: 'tnVed', order: 'desc' }]
    
    mockParcelsStore.items = [
      { id: 1, checkStatusId: 150 }
    ]
    
    await findNextParcelWithIssues(1, 2)
    
    // Check that getAll was called with the correct sort parameters
    expect(mockParcelsStore.getAll).toHaveBeenCalledWith(1, null, null, 1, 1000, 'tnVed', 'desc')
  })
})
