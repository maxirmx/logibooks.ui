// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { apiUrl } from '@/helpers/config.js'
import {
  roleWhOperator,
  roleLogist,
  roleSrLogist,
  roleShiftLead,
  roleAdmin,
  keyWhOperator,
  keyLogist,
  keySrLogist,
  keyShiftLead,
  keyAdmin,
  keyNone
} from '@/helpers/user.roles.js'

const baseUrl = `${apiUrl}/users`

function translate(param) {
  const roles = []
  if (param.isLogist === keyLogist || param.isLogist === true) {
    roles.push(roleLogist)
  }
  if (param.isSrLogist === keySrLogist || param.isSrLogist === true) {
    roles.push(roleSrLogist)
  }
  if (param.isShiftLead === keyShiftLead || param.isShiftLead === true) {
    roles.push(roleShiftLead)
  }
  if (param.isAdmin === keyAdmin || param.isAdmin === true) {
    roles.push(roleAdmin)
  }
  if (param.isWhOperator === keyWhOperator || param.isWhOperator === true) {
    roles.push(roleWhOperator)
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
  delete res.isShiftLead
  delete res.isSrLogist
  delete res.isLogist
  delete res.isWhOperator
  delete res.password2
  return res
}

export const useUsersStore = defineStore('users', () => {
  // state
  const users = ref([])
  const user = ref({})
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)
  
  // getters
  const getUserById = (id) => {
    return users.value.find((user) => user.id === id)
  }
  
  // actions
  async function add(userParam, trnslt = false) {
    if (trnslt) {
      userParam = translate(userParam)
    }
    loading.value = true
    try {
      await fetchWrapper.post(baseUrl, userParam)
      // Refresh the list after creation
      await getAll()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getAll() {
    loading.value = true
    try {
      error.value = null
      const response = await fetchWrapper.get(baseUrl)
      users.value = response || []
      isInitialized.value = true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    if (!isInitialized.value && !loading.value) {
      await getAll()
    }
  }

  async function getById(id, trnslt = false, refresh = false) {
    if (refresh) {
      user.value = {}
    }
    loading.value = true
    try {
      const response = await fetchWrapper.get(`${baseUrl}/${id}`)
      user.value = response
      if (trnslt) {
        user.value.isAdmin =
          user.value.roles && user.value.roles.includes(roleAdmin) ? keyAdmin : keyNone
        user.value.isShiftLead =
          user.value.roles && user.value.roles.includes(roleShiftLead) ? keyShiftLead : keyNone
        user.value.isSrLogist =
          user.value.roles && user.value.roles.includes(roleSrLogist) ? keySrLogist : keyNone
        user.value.isLogist =
          user.value.roles && user.value.roles.includes(roleLogist) ? keyLogist : keyNone
        user.value.isWhOperator =
          user.value.roles && user.value.roles.includes(roleWhOperator) ? keyWhOperator : keyNone
      }
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id, params, trnslt = false) {
    if (trnslt) {
      params = translate(params)
    }
    loading.value = true
    try {
      error.value = null
      const response = await fetchWrapper.put(`${baseUrl}/${id}`, params)

      // update stored user if the logged in user updated their own record
      const authStore = useAuthStore()
      if (id === authStore.user.id) {
        // update local storage
        const updatedUser = { ...authStore.user, ...params }
        localStorage.setItem('user', JSON.stringify(updatedUser))

        // update auth user in pinia state
        authStore.user = updatedUser
      }

      // Refresh the list after update
      await getAll()
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteUser(id) {
    loading.value = true
    try {
      error.value = null
      const authStore = useAuthStore()
      if (id === authStore.user.id) {
        authStore.logout()
      }
      await fetchWrapper.delete(`${baseUrl}/${id}`, {})
      // Refresh the list after deletion
      await getAll()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // const
    keyNone,
    keyWhOperator,
    keyLogist,
    keySrLogist,
    keyShiftLead,
    keyAdmin,
    roleWhOperator,
    roleLogist,
    roleSrLogist,
    roleShiftLead,
    roleAdmin,
    // state
    users,
    user,
    loading,
    error,
    isInitialized,
    // getters
    getUserById,
    // actions
    add,
    getAll,
    getById,
    update,
    delete: deleteUser,
    ensureLoaded
  }
})
