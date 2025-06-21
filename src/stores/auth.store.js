// Copyright (C) 2023 Maxim [maxirmx] Samsonov  (www.sw.consulting)
// All rights reserved.
// This file is a part of O!Service applcation
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
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import router from '@/router'

const baseUrl = `${apiUrl}/auth`

export const useAuthStore = defineStore({
  id: 'auth',
  state: () => ({
    // initialize state from local storage to enable user to stay logged in
    user: JSON.parse(localStorage.getItem('user')),
    users_per_page: 10,
    users_search: '',
    users_sort_by: ['id'],
    users_page: 1,
    returnUrl: null,
    re_jwt: null,
    re_tgt: null
  }),
  actions: {
    async check() {
      await fetchWrapper.get(`${baseUrl}/check`)
    },
    async register(user) {
      await fetchWrapper.post(`${baseUrl}/register`, user)
    },
    async recover(user) {
      await fetchWrapper.post(`${baseUrl}/recover`, user)
    },
    async re() {
      const re_jwt = this.re_jwt
      this.re_jwt = null
      const user = await fetchWrapper.put(`${baseUrl}/${this.re_tgt}`, { jwt: re_jwt })
      this.user = user
      localStorage.setItem('user', JSON.stringify(user))
    },
    async login(email, password) {
      const user = await fetchWrapper.post(`${baseUrl}/login`, { email, password })
      this.user = user
      localStorage.setItem('user', JSON.stringify(user))
      if (this.returnUrl) {
        router.push(this.returnUrl)
        this.returnUrl = null
      }
    },
    logout() {
      this.user = null
      localStorage.removeItem('user')
      router.push('/login')
    }
  }
})
