// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { ref, computed, watch, onScopeDispose } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import router from '@/router'
import { useStatusStore } from '@/stores/status.store.js'
import { reportError } from '@/helpers/error.helpers.js'
import { AUTH_LIST_SCHEMA } from '@/helpers/auth.list.state.js'
import { createListRefs } from '@/helpers/list.state.helpers.js'
import { useListStateStore } from '@/stores/list.state.store.js'
import {
  roleShiftLead,
  roleSrLogist,
  roleLogist,
  roleWhManager,
  roleWhOperator,
  roleAdmin
} from '@/helpers/user.roles.js'

const baseUrl = `${apiUrl}/auth`
const scanjobMonitorFollowUserStorageKey = 'scanjobmonitor_follow_user_id'
const parcelFilterStorageKey = 'logibooks.parcelFilter'

function readParcelFilterId(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(parcelFilterStorageKey))
    return userId != null && saved?.userId === userId && Number.isInteger(saved.filterId) && saved.filterId > 0
      ? saved.filterId : null
  } catch (error) {
    reportError(error, { context: 'restore saved parcel filter' })
    return null
  }
}

function readScanjobMonitorFollowUserId() {
  const raw = localStorage.getItem(scanjobMonitorFollowUserStorageKey)
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export const useAuthStore = defineStore('auth', () => {
  // initialize state from local storage to enable user to stay logged in
  const user = ref(JSON.parse(localStorage.getItem('user')))
  const parcels_filter_id = ref(readParcelFilterId(user.value?.id))
  function setParcelFilterId(value) {
    const id = Number(value)
    parcels_filter_id.value = user.value?.id != null && Number.isInteger(id) && id > 0 ? id : null
    parcels_page.value = 1
    parcels_wh_page.value = 1
    if (parcels_filter_id.value == null) localStorage.removeItem(parcelFilterStorageKey)
    else localStorage.setItem(parcelFilterStorageKey, JSON.stringify({ userId: user.value.id, filterId: parcels_filter_id.value }))
  }
  watch(() => user.value?.id, (id, previousId) => {
    if (id !== previousId) setParcelFilterId(null)
  }, { flush: 'sync' })
  const isAdmin = computed(() => user.value?.roles?.includes(roleAdmin))
  const isShiftLead = computed(() => user.value?.roles?.includes(roleShiftLead))
  const isSrLogist = computed(() => user.value?.roles?.includes(roleSrLogist))
  const isLogist = computed(() => user.value?.roles?.includes(roleLogist))
  const isWhOperator = computed(() => user.value?.roles?.includes(roleWhOperator))
  const isWhManager = computed(() => user.value?.roles?.includes(roleWhManager))
  const isShiftLeadPlus = computed(() => isAdmin.value || isShiftLead.value)
  const isSrLogistPlus = computed(() => isAdmin.value || isShiftLead.value || isSrLogist.value)
  const isWhManagerPlus = computed(() => isAdmin.value || isShiftLead.value || isWhManager.value)
  const hasLogistRole = computed(() => isLogist.value || isSrLogist.value || isShiftLead.value)
  const hasWhRole = computed(
    () => isAdmin.value || isShiftLead.value || isWhManager.value || isWhOperator.value
  )
  const hasAnyRole = computed(
    () =>
      isAdmin.value ||
      isShiftLead.value ||
      isSrLogist.value ||
      isLogist.value ||
      isWhManager.value ||
      isWhOperator.value
  )

  const listRefs = createListRefs(AUTH_LIST_SCHEMA)
  const { parcels_page, parcels_wh_page } = listRefs
  const scanjobmonitor_follow_user_id = ref(readScanjobMonitorFollowUserId())
  const selectedOrderId = ref(null)
  const selectedParcelId = ref(null)
  const returnUrl = ref(null)
  const re_jwt = ref(null)
  const re_tgt = ref(null)

  async function check() {
    await fetchWrapper.get(`${baseUrl}/check`)
  }

  async function register(userParam) {
    await fetchWrapper.post(`${baseUrl}/register`, userParam)
  }

  async function recover(userParam) {
    await fetchWrapper.post(`${baseUrl}/recover`, userParam)
  }

  async function re() {
    const currentReJwt = re_jwt.value
    re_jwt.value = null

    // Fetch status information regardless of re-authentication success, failure, or exception
    const statusStore = useStatusStore()

    try {
      const userData = await fetchWrapper.put(`${baseUrl}/${re_tgt.value}`, { jwt: currentReJwt })
      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (error) {
      // Ensure status is fetched before re-throwing the error
      await statusStore.fetchStatus().catch((statusError) => {
        reportError(statusError, { context: 'auth.re status refresh after failure' })
      })
      throw error
    }

    // Fetch status after successful re-authentication as well
    await statusStore.fetchStatus().catch((statusError) => {
      reportError(statusError, { context: 'auth.re status refresh' })
    })
  }

  async function login(email, password) {
    // Fetch status information regardless of login success, failure, or exception
    const statusStore = useStatusStore()

    try {
      const userData = await fetchWrapper.post(`${baseUrl}/login`, { email, password })
      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))

      if (returnUrl.value) {
        await router.push(returnUrl.value).catch((navigationError) => {
          reportError(navigationError, { context: 'auth.login return navigation' })
          throw navigationError
        })
        returnUrl.value = null
      }
    } catch (error) {
      // Ensure status is fetched before re-throwing the error
      await statusStore.fetchStatus().catch((statusError) => {
        reportError(statusError, { context: 'auth.login status refresh after failure' })
      })
      throw error
    }

    // Fetch status after successful login as well
    await statusStore.fetchStatus().catch((statusError) => {
      reportError(statusError, { context: 'auth.login status refresh' })
    })
  }

  function clearSession() {
    user.value = null
    localStorage.removeItem('user')
  }

  function logout() {
    // Fetch status information regardless of logout success, failure, or exception
    const statusStore = useStatusStore()

    try {
      clearSession()
      router.push('/login')
    } catch (error) {
      // Ensure status is fetched before re-throwing the error
      statusStore.fetchStatus().catch((statusError) => {
        reportError(statusError, { context: 'auth.logout status refresh after failure' })
      })
      throw error
    }

    // Fetch status after successful logout as well
    statusStore.fetchStatus().catch((statusError) => {
      reportError(statusError, { context: 'auth.logout status refresh' })
    })
  }

  function setScanjobMonitorFollowUserId(userId) {
    const parsed = Number(userId)
    const normalized = Number.isInteger(parsed) && parsed > 0 ? parsed : null
    scanjobmonitor_follow_user_id.value = normalized

    if (normalized == null) {
      localStorage.removeItem(scanjobMonitorFollowUserStorageKey)
      return
    }

    localStorage.setItem(scanjobMonitorFollowUserStorageKey, String(normalized))
  }

  const listStateStore = useListStateStore()
  listStateStore.setUser(user.value?.id)
  const { stop } = listStateStore.bind('auth', listRefs, AUTH_LIST_SCHEMA)
  onScopeDispose(stop)
  watch(() => user.value?.id, id => listStateStore.setUser(id), { flush: 'sync' })
  const persistListState = () => listStateStore.persist()

  return {
    ...listRefs,
    persistListState,
    parcels_filter_id,
    setParcelFilterId,
    // state
    user,
    scanjobmonitor_follow_user_id,
    selectedOrderId,
    selectedParcelId,
    returnUrl,
    re_jwt,
    re_tgt,
    isAdmin,
    isShiftLead,
    isSrLogist,
    isWhManager,
    isWhOperator,
    isShiftLeadPlus,
    isSrLogistPlus,
    isWhManagerPlus,
    hasLogistRole,
    isLogist,
    hasWhRole,
    hasAnyRole,
    // actions
    check,
    register,
    recover,
    re,
    login,
    clearSession,
    logout,
    setScanjobMonitorFollowUserId
  }
})
