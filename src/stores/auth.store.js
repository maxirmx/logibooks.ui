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
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import router from '@/router'

const baseUrl = `${apiUrl}/auth`

export const useAuthStore = defineStore('auth', () => {
  // initialize state from local storage to enable user to stay logged in
  const user = ref(JSON.parse(localStorage.getItem('user')))
  const users_per_page = ref(10)
  const users_search = ref('')
  const users_sort_by = ref(['id'])
  const users_page = ref(1)
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
    const userData = await fetchWrapper.put(`${baseUrl}/${re_tgt.value}`, { jwt: currentReJwt })
    user.value = userData
    localStorage.setItem('user', JSON.stringify(userData))
  }

  async function login(email, password) {
    const userData = await fetchWrapper.post(`${baseUrl}/login`, { email, password })
    user.value = userData
    localStorage.setItem('user', JSON.stringify(userData))
    if (returnUrl.value) {
      router.push(returnUrl.value)
      returnUrl.value = null
    }
  }

  function logout() {
    user.value = null
    localStorage.removeItem('user')
    router.push('/login')
  }

  return {
    // state
    user,
    users_per_page,
    users_search,
    users_sort_by,
    users_page,
    returnUrl,
    re_jwt,
    re_tgt,
    // actions
    check,
    register,
    recover,
    re,
    login,
    logout
  }
})
