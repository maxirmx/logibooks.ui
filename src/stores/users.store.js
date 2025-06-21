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
import { useAuthStore } from '@/stores/auth.store.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/users`

const roleLogist = 'logist'
const roleAdmin = 'administrator'

function translate(param) {
  const roles = []
  if (param.isLogist === 'LOGIST' || param.isLogist === true) {
    roles.push(roleLogist)
  }
  if (param.isAdmin === 'ADMIN' || param.isAdmin === true) {
    roles.push(roleAdmin)
  }
  if (!roles.length) {
    if (param.roles) {
      roles.push(...param.roles)
    } else {
      roles.push(roleLogist)
    }
  }
  const res = { ...param, roles }
  delete res.isAdmin
  delete res.isLogist
  delete res.password2
  return res
}

export const useUsersStore = defineStore('users', () => {
  // state
  const users = ref({})
  const user = ref({})
  
  // getters
  const getUserById = (id) => {
    return users.value.find((user) => user.id === id)
  }
  
  // actions
  async function add(userParam, trnslt = false) {
    if (trnslt) {
      userParam = translate(userParam)
    }
    await fetchWrapper.post(baseUrl, userParam)
  }

  async function getAll() {
    users.value = { loading: true }
    try {
      users.value = await fetchWrapper.get(baseUrl)
    } catch (error) {
      users.value = { error }
    }
  }

  async function getById(id, trnslt = false) {
    user.value = { loading: true }
    try {
      user.value = await fetchWrapper.get(`${baseUrl}/${id}`)
      if (trnslt) {
        user.value.isAdmin =
          user.value.roles && user.value.roles.includes(roleAdmin) ? 'ADMIN' : 'NONE'
        user.value.isLogist =
          user.value.roles && user.value.roles.includes(roleLogist) ? 'LOGIST' : 'NONE'
      }
    } catch (error) {
      user.value = { error }
    }
  }

  async function update(id, params, trnslt = false) {
    if (trnslt) {
      params = translate(params)
    }
    await fetchWrapper.put(`${baseUrl}/${id}`, params)

    // update stored user if the logged in user updated their own record
    const authStore = useAuthStore()
    if (id === authStore.user.id) {
      // update local storage
      const updatedUser = { ...authStore.user, ...params }
      localStorage.setItem('user', JSON.stringify(updatedUser))

      // update auth user in pinia state
      authStore.user = updatedUser
    }
  }

  async function deleteUser(id) {
    const authStore = useAuthStore()
    if (id === authStore.user.id) {
      authStore.logout()
    }
    await fetchWrapper.delete(`${baseUrl}/${id}`, {})
  }

  return {
    // state
    users,
    user,
    // getters
    getUserById,
    // actions
    add,
    getAll,
    getById,
    update,
    delete: deleteUser
  }
})
