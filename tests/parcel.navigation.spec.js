import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { findNextIssueParcel } from '@/helpers/parcel.navigation.js'

const mockAuthStore = {
  parcels_page: ref(1),
  parcels_per_page: ref(3),
  parcels_sort_by: ref([{ key: 'id', order: 'asc' }]),
  parcels_status: ref(null),
  parcels_tnved: ref('')
}

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => mockAuthStore
}))

describe('findNextIssueParcel', () => {
  let mockStore

  beforeEach(() => {
    mockStore = {
      items: [],
      hasNextPage: false,
      getAll: vi.fn(async (registerId, status, tnVed, page) => {
        if (page === 1) {
          mockStore.items = [
            { id: 1, checkStatusId: 150 },
            { id: 2, checkStatusId: 50 },
            { id: 3, checkStatusId: 150 }
          ]
          mockStore.hasNextPage = true
        } else if (page === 2) {
          mockStore.items = [
            { id: 4, checkStatusId: 150 }
          ]
          mockStore.hasNextPage = false
        }
      })
    }
  })

  it('returns next issue id on the same page', async () => {
    const result = await findNextIssueParcel(mockStore, 1, 1)
    expect(result).toBe(3)
  })

  it('returns issue id from next page when current is last on page', async () => {
    const result = await findNextIssueParcel(mockStore, 1, 3)
    expect(result).toBe(4)
  })

  it('returns null when there is no next issue', async () => {
    const result = await findNextIssueParcel(mockStore, 1, 4)
    expect(result).toBeNull()
  })
})

