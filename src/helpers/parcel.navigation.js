import { useAuthStore } from '@/stores/auth.store.js'
import { HasIssues } from '@/helpers/orders.check.helper.js'

/**
 * Find next parcel with issues based on persistent sort order
 * @param {Object} parcelsStore - parcels pinia store
 * @param {number} registerId - current register id
 * @param {number} currentId - id of currently edited parcel
 * @returns {Promise<number|null>} id of next parcel with issues or null if none
 */
export async function findNextIssueParcel(parcelsStore, registerId, currentId) {
  const authStore = useAuthStore()

  let page = authStore.parcels_page.value
  const pageSize = authStore.parcels_per_page.value
  const sortKey = authStore.parcels_sort_by.value?.[0]?.key || 'id'
  const sortOrder = authStore.parcels_sort_by.value?.[0]?.order || 'asc'
  const status = authStore.parcels_status.value
  const tnVed = authStore.parcels_tnved.value

  let foundCurrent = false
  while (true) {
    await parcelsStore.getAll(
      registerId,
      status ? Number(status) : null,
      tnVed || null,
      page,
      pageSize,
      sortKey,
      sortOrder
    )

    const issueItems = parcelsStore.items.filter(p => HasIssues(p.checkStatusId))

    if (!foundCurrent) {
      const idx = issueItems.findIndex(p => p.id === currentId)
      if (idx >= 0) {
        foundCurrent = true
        if (idx + 1 < issueItems.length) {
          return issueItems[idx + 1].id
        }
      }
    } else if (issueItems.length) {
      return issueItems[0].id
    }

    if (!parcelsStore.hasNextPage) break
    page += 1
  }

  return null
}

