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

import { useAuthStore } from '@/stores/auth.store.js'
import { apiUrl } from '@/helpers/config.js'
import { enableLog } from '@/helpers/config.js'
const baseUrl = `${apiUrl}`

export const fetchWrapper = {
  get: request('GET'),
  post: request('POST'),
  put: request('PUT'),
  delete: request('DELETE')
}

function request(method) {
  return async (url, body) => {
    const requestOptions = {
      method,
      headers: authHeader(url)
    }
    if (body) {
      requestOptions.headers['Content-Type'] = 'application/json'
      requestOptions.body = JSON.stringify(body)
    }
    if (enableLog) {
      console.log(url, requestOptions)
    }
    const response = await fetch(url, requestOptions)
    return handleResponse(response)
  }
}

// helper functions

function authHeader(url) {
  // return auth header with jwt if user is logged in and request is to the api url
  const { user } = useAuthStore()
  const isLoggedIn = !!user?.token
  if (isLoggedIn && url.startsWith(baseUrl)) {
    return { Authorization: `Bearer ${user.token}` }
  } else {
    return {}
  }
}

function handleResponse(response) {
  if (response.status == 204) {
    console.log(response.status, response.statusText)
    return Promise.resolve()
  }
  return response.text().then((text) => {
    try {
      const data = JSON.parse(text)
      if (enableLog) {
        console.log(response.status, response.statusText, data)
      }
      if (!response.ok) {
        const { user, logout } = useAuthStore()
        if ([401].includes(response.status)) {
          // auto logout if 401 Unauthorized response returned from api
          if (user) {
            logout()
          }
        }

        const error = (data && data.message) || response.statusText
        return Promise.reject(error)
      }
      return data
    } catch {
      return Promise.reject(text)
    }
  })
}
