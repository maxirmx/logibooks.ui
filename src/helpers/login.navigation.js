// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application

import { useAuthStore } from '@/stores/auth.store.js'

/**
 * Determines the route to navigate to after successful login
 * based on user roles and permissions
 * @returns {string} The path to redirect to
 */
export function getHomeRoute() {
  const authStore = useAuthStore()
  
  // No user means we should go to login
  if (!authStore.user) {
    return '/login'
  }

  // Priority: logist > administrator > regular user
  if (authStore.isLogist) return '/registers'
  if (authStore.isAdmin) return '/users'
  
  // Regular user - go to edit profile
  return '/user/edit/' + authStore.user.id
}
