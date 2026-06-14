// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, unref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.js'
import {
  buildParcelEditCellClass,
  hasParcelEditRouteAccess,
  navigateToEditParcel
} from '@/helpers/parcels.list.helpers.js'

const defaultParcelEditRouteName = 'Редактирование посылки'

function resolveQueryParams(getQueryParams, item) {
  return typeof getQueryParams === 'function' ? getQueryParams(item) : unref(getQueryParams)
}

/**
 * Creates shared state and handlers for parcel-edit cell navigation.
 *
 * The access rule intentionally matches Scanjob monitor: only users with
 * `authStore.hasLogistRole` receive clickable parcel edit cells. Unauthorized
 * or disabled clicks are silent no-ops, while the router guard remains the
 * final permission backstop.
 *
 * @param {Object} options
 * @param {Object} options.router - Vue router instance used for navigation.
 * @param {string|import('vue').Ref<string>} [options.routeName='Редактирование посылки'] - Parcel edit route name.
 * @param {Function|Object} [options.getQueryParams] - Function `(item) => queryParams` or ref/plain query params object.
 * @param {boolean|import('vue').Ref<boolean>} [options.disabled=false] - Additional loading/disabled state.
 * @param {Function|null} [options.onBeforeOpen=null] - Optional callback called before successful navigation.
 * @returns {Object} Permission state, class builder, and guarded opener.
 */
export function useParcelEditAccess({
  router,
  routeName = defaultParcelEditRouteName,
  getQueryParams = () => ({}),
  disabled = false,
  onBeforeOpen = null
} = {}) {
  const authStore = useAuthStore()
  const canFollowParcelEditRoute = computed(() => hasParcelEditRouteAccess(authStore))
  const isParcelEditCellDisabled = computed(() => Boolean(unref(disabled)) || !canFollowParcelEditRoute.value)

  function parcelEditCellClass(baseClass = '') {
    return buildParcelEditCellClass(canFollowParcelEditRoute, baseClass)
  }

  function openParcelEdit(item) {
    if (isParcelEditCellDisabled.value || !item?.id) return false

    const resolvedRouter = unref(router)
    if (!resolvedRouter?.push) return false

    const queryParams = resolveQueryParams(getQueryParams, item) || {}
    if (queryParams.registerId == null) return false

    onBeforeOpen?.(item)
    navigateToEditParcel(resolvedRouter, item, unref(routeName), queryParams)
    return true
  }

  return {
    canFollowParcelEditRoute,
    isParcelEditCellDisabled,
    parcelEditCellClass,
    openParcelEdit
  }
}
