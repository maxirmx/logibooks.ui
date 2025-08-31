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

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import router from '@/router'
import { useStatusStore } from '@/stores/status.store.js'

const baseUrl = `${apiUrl}/auth`

export const useAuthStore = defineStore('auth', () => {
  // initialize state from local storage to enable user to stay logged in
  const user = ref(JSON.parse(localStorage.getItem('user')))
  const isAdmin = computed(() =>
    user.value?.roles?.includes('administrator')
  )
  const isLogist = computed(() =>
    user.value?.roles?.includes('logist')
  )
  const users_per_page = ref(10)
  const users_search = ref('')
  const users_sort_by = ref(['id'])
  const users_page = ref(1)
  const companies_per_page = ref(10)
  const companies_search = ref('')
  const companies_sort_by = ref(['id'])
  const companies_page = ref(1)
  const registers_per_page = ref(10)
  const registers_search = ref('')
  const registers_sort_by = ref([{ key: 'id', order: 'desc' }])
  const registers_page = ref(1)
  const parcels_per_page = ref(100)
  const parcels_sort_by = ref([{ key: 'id', order: 'asc' }])
  const parcels_page = ref(1)
  const parcels_status = ref(null)
  const parcels_check_status = ref(null)
  const parcels_tnved = ref('')
  const parcelstatuses_per_page = ref(10)
  const parcelstatuses_search = ref('')
  const parcelstatuses_sort_by = ref(['id'])
  const parcelstatuses_page = ref(1)
  const countries_per_page = ref(10)
  const countries_search = ref('')
  const countries_sort_by = ref([])
  const countries_page = ref(1)
  const stopwords_per_page = ref(10)
  const stopwords_search = ref('')
  const stopwords_sort_by = ref(['id'])
  const stopwords_page = ref(1)
  const keywords_per_page = ref(10)
  const keywords_search = ref('')
  const keywords_sort_by = ref(['id'])
  const keywords_page = ref(1)
  const feacnorders_per_page = ref(10)
  const feacnorders_search = ref('')
  const feacnorders_sort_by = ref([])
  const feacnorders_page = ref(1)
  const feacnprefixes_per_page = ref(10)
  const feacnprefixes_search = ref('')
  const feacnprefixes_sort_by = ref([])
  const feacnprefixes_page = ref(1)
  const selectedWbrParcelId = ref(null)
  const selectedOzonParcelId = ref(null)
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
    registers_per_page,
    registers_search,
    registers_sort_by,
    registers_page,
    parcels_per_page,
    parcels_sort_by,
    parcels_page,
    parcels_status,
    parcels_check_status,
    parcels_tnved,
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
    selectedWbrParcelId,
    selectedOzonParcelId,
    returnUrl,
    re_jwt,
    re_tgt,
    isAdmin,
    isLogist,
    // actions
    check,
    register,
    recover,
    re,
    login,
    logout
  }
})
