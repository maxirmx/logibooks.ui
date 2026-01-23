// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import router from '@/router'
import { useStatusStore } from '@/stores/status.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import {
  roleShiftLead,
  roleSrLogist,
  roleLogist,
  roleWhOperator,
  roleAdmin
} from '@/helpers/user.roles.js'

const baseUrl = `${apiUrl}/auth`

export const useAuthStore = defineStore('auth', () => {
  // initialize state from local storage to enable user to stay logged in
  const user = ref(JSON.parse(localStorage.getItem('user')))
  const isAdmin = computed(() =>
    user.value?.roles?.includes(roleAdmin)
  )
  const isShiftLead = computed(() =>
    user.value?.roles?.includes(roleShiftLead)
  )
  const isSrLogist = computed(() =>
    user.value?.roles?.includes(roleSrLogist)
  )
  const isLogist = computed(() =>
    user.value?.roles?.includes(roleLogist)
  )
  const isWhOperator = computed(() =>
    user.value?.roles?.includes(roleWhOperator)
  )
  const isShiftLeadPlus = computed(() =>
    isAdmin.value || isShiftLead.value 
  )
  const isSrLogistPlus = computed(() =>
    isAdmin.value || isShiftLead.value || isSrLogist.value 
  )
  const hasLogistRole = computed(() =>
    isLogist.value || isSrLogist.value || isShiftLead.value
  )
  const hasAnyRole = computed(() =>
    isAdmin.value || isShiftLead.value || isSrLogist.value || isLogist.value || isWhOperator.value
  )

  const users_per_page = ref(100)
  const users_search = ref('')
  const users_sort_by = ref(['id'])
  const users_page = ref(1)
  const companies_per_page = ref(100)
  const companies_search = ref('')
  const companies_sort_by = ref(['id'])
  const companies_page = ref(1)
  const warehouses_per_page = ref(100)
  const warehouses_search = ref('')
  const warehouses_sort_by = ref(['id'])
  const warehouses_page = ref(1)
  const scanjobs_per_page = ref(100)
  const scanjobs_search = ref('')
  const scanjobs_sort_by = ref([{ key: 'id', order: 'asc' }])
  const scanjobs_page = ref(1)
  const notifications_per_page = ref(100)
  const notifications_search = ref('')
  const notifications_sort_by = ref(['id'])
  const notifications_page = ref(1)
  const airports_per_page = ref(10)
  const airports_search = ref('')
  const airports_sort_by = ref(['id'])
  const airports_page = ref(1)
  const registers_per_page = ref(50)
  const registers_search = ref('')
  const registers_sort_by = ref([{ key: 'id', order: 'desc' }])
  const registers_page = ref(1)
  const parcels_per_page = ref(100)
  const parcels_sort_by = ref([{ key: 'id', order: 'asc' }])
  const parcels_page = ref(1)
  const parcels_status = ref(null)
  const parcels_check_status_sw = ref(null)
  const parcels_check_status_fc = ref(null)
  const parcels_tnved = ref('')
  const parcels_number = ref('')
  const parcelstatuses_per_page = ref(100)
  const parcelstatuses_search = ref('')
  const parcelstatuses_sort_by = ref(['id'])
  const parcelstatuses_page = ref(1)
  const countries_per_page = ref(100)
  const countries_search = ref('')
  const countries_sort_by = ref([])
  const countries_page = ref(1)
  const stopwords_per_page = ref(100)
  const stopwords_search = ref('')
  const stopwords_sort_by = ref(['id'])
  const stopwords_page = ref(1)
  const keywords_per_page = ref(100)
  const keywords_search = ref('')
  const keywords_sort_by = ref(['id'])
  const keywords_page = ref(1)
  const feacnorders_per_page = ref(100)
  const feacnorders_search = ref('')
  const feacnorders_sort_by = ref([])
  const feacnorders_page = ref(1)
  const feacnprefixes_per_page = ref(100)
  const feacnprefixes_search = ref('')
  const feacnprefixes_sort_by = ref([])
  const feacnprefixes_page = ref(1)
  const feacnlocalprefixes_per_page = ref(100)
  const feacnlocalprefixes_search = ref('')
  const feacnlocalprefixes_sort_by = ref([])
  const feacnlocalprefixes_page = ref(1)
  const feacninsertitems_per_page = ref(100)
  const feacninsertitems_search = ref('')
  const feacninsertitems_sort_by = ref([])
  const feacninsertitems_page = ref(1)
  const uploadcustomsreports_per_page = ref(100)
  const uploadcustomsreports_sort_by = ref([])
  const uploadcustomsreports_page = ref(1)
  const customsreportrows_per_page = ref(100)
  const customsreportrows_search = ref('')
  const customsreportrows_sort_by = ref([])
  const customsreportrows_page = ref(1)
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
      await statusStore.fetchStatus().catch(() => {})
      throw error
    }

    // Fetch status after successful re-authentication as well
    await statusStore.fetchStatus().catch(() => {})
  }

  async function login(email, password) {
    // Fetch status information regardless of login success, failure, or exception
    const statusStore = useStatusStore()

    try {
      const userData = await fetchWrapper.post(`${baseUrl}/login`, { email, password })
      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))

      if (returnUrl.value) {
        router.push(returnUrl.value)
        returnUrl.value = null
      }
    } catch (error) {
      // Ensure status is fetched before re-throwing the error
      await statusStore.fetchStatus().catch(() => {})
      throw error
    }

    // Fetch status after successful login as well
    await statusStore.fetchStatus().catch(() => {})
  }

  function logout() {
    // Fetch status information regardless of logout success, failure, or exception
    const statusStore = useStatusStore()

    try {
      user.value = null
      localStorage.removeItem('user')
      router.push('/login')
    } catch (error) {
      // Ensure status is fetched before re-throwing the error
      statusStore.fetchStatus().catch(() => {})
      throw error
    }

    // Fetch status after successful logout as well
    statusStore.fetchStatus().catch(() => {})
  }

  // Restore temporary parcels snapshot from sessionStorage if available.
  // This helps keep filters/sorting when a browser extension or external
  // actor causes a navigation or reload during image selection.
  try {
    const raw = sessionStorage.getItem('logibooks.parcelsSnapshot')
    if (raw) {
      const snap = JSON.parse(raw)
      if (snap) {
        if (snap.parcels_sort_by != null) parcels_sort_by.value = snap.parcels_sort_by
        if (snap.parcels_status != null) parcels_status.value = snap.parcels_status
        if (snap.parcels_check_status_sw != null) parcels_check_status_sw.value = snap.parcels_check_status_sw
        if (snap.parcels_check_status_fc != null) parcels_check_status_fc.value = snap.parcels_check_status_fc
        if (snap.parcels_tnved != null) parcels_tnved.value = snap.parcels_tnved
        if (snap.parcels_number != null) parcels_number.value = snap.parcels_number
        if (snap.parcels_page != null) parcels_page.value = snap.parcels_page
        if (snap.parcels_per_page != null) parcels_per_page.value = snap.parcels_per_page

        // Clean up snapshot after restore so it doesn't interfere later.
        sessionStorage.removeItem('logibooks.parcelsSnapshot')
      }
    }
  } catch  {
    const alertStore = useAlertStore()
    alertStore.error('Не удалось восстановить фильтры и сортировку')
  }

  return {
    // state
    user,
    users_per_page,
    users_search,
    users_sort_by,
    users_page,
    companies_per_page,
    companies_search,
    companies_sort_by,
    companies_page,
    warehouses_per_page,
    warehouses_search,
    warehouses_sort_by,
    warehouses_page,
    scanjobs_per_page,
    scanjobs_search,
    scanjobs_sort_by,
    scanjobs_page,
    notifications_per_page,
    notifications_search,
    notifications_sort_by,
    notifications_page,
    airports_per_page,
    airports_search,
    airports_sort_by,
    airports_page,
    registers_per_page,
    registers_search,
    registers_sort_by,
    registers_page,
    parcels_per_page,
    parcels_sort_by,
    parcels_page,
    parcels_status,
    parcels_check_status_sw,
    parcels_check_status_fc,
    parcels_tnved,
    parcels_number,
    parcelstatuses_per_page,
    parcelstatuses_search,
    parcelstatuses_sort_by,
    parcelstatuses_page,
    countries_per_page,
    countries_search,
    countries_sort_by,
    countries_page,
    stopwords_per_page,
    stopwords_search,
    stopwords_sort_by,
    stopwords_page,
    keywords_per_page,
    keywords_search,
    keywords_sort_by,
    keywords_page,
    feacnorders_per_page,
    feacnorders_search,
    feacnorders_sort_by,
    feacnorders_page,
    feacnprefixes_per_page,
    feacnprefixes_search,
    feacnprefixes_sort_by,
    feacnprefixes_page,
    feacnlocalprefixes_per_page,
    feacnlocalprefixes_search,
    feacnlocalprefixes_sort_by,
    feacnlocalprefixes_page,
    feacninsertitems_per_page,
    feacninsertitems_search,
    feacninsertitems_sort_by,
    feacninsertitems_page,
    uploadcustomsreports_per_page,
    uploadcustomsreports_sort_by,
    uploadcustomsreports_page,
    customsreportrows_per_page,
    customsreportrows_search,
    customsreportrows_sort_by,
    customsreportrows_page,
    selectedOrderId,
    selectedParcelId,
    returnUrl,
    re_jwt,
    re_tgt,
    isAdmin,
    isShiftLead,
    isSrLogist,
    isWhOperator,
    isShiftLeadPlus,
    isSrLogistPlus,
    hasLogistRole,
    isLogist,
    hasAnyRole,
    // actions
    check,
    register,
    recover,
    re,
    login,
    logout
  }
})
