// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { isNavigationFailure, NavigationFailureType } from 'vue-router'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { reportError } from '@/helpers/error.helpers.js'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { getCurrentInternalRoute } from '@/helpers/parcel.navigation.helpers.js'

export const LOGIN_REQUIRED_MESSAGE = 'Необходимо войти в систему'

let pageRecovery = null

export async function recoverPageLoad(router, error, fallback) {
  reportError(error, { context: fallback })
  if (pageRecovery) return pageRecovery

  const failedRoute = router.currentRoute.value
  const auth = useAuthStore()
  const alerts = useAlertStore()
  pageRecovery = (async () => {
    if (failedRoute.path !== '/login') {
      try {
        auth.returnUrl = getCurrentInternalRoute(router)
        auth.clearSession()
        const failure = await router.replace('/login')
        if (isNavigationFailure(failure, NavigationFailureType.aborted | NavigationFailureType.cancelled)) throw failure
      } catch (navigationError) {
        reportError(navigationError, { context: 'Переход на страницу входа после ошибки загрузки' })
      }
    }

    const currentRoute = router.currentRoute.value
    if (currentRoute.path === '/login' || currentRoute === failedRoute) alerts.error(error, { fallback })
  })()
  try {
    await pageRecovery
  } finally {
    pageRecovery = null
  }
}

/**
 * Determines the route to navigate to after successful login
 * based on user roles and permissions
 * @returns {string} The path to redirect to
 */
export function getHomeRoute(from_user_dialog = false) {
  const authStore = useAuthStore()
  // No user means we should go to login
  if (!authStore.user) {
    return '/login'
  }

  // Priority: logist > administrator > regular user
  if (from_user_dialog && authStore.isAdmin) return '/users'
  if (authStore.hasLogistRole) return '/registers'
  if (authStore.hasWhRole) return `/registers?mode=${OP_MODE_WAREHOUSE}`
  if (authStore.isAdmin) return '/users'
  
  // Regular user - go to edit profile
  return '/user/edit/' + authStore.user.id
}
