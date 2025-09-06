// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAlertStore = defineStore('alert', () => {
  // state
  const alert = ref(null)

  // actions
  function success(message) {
    alert.value = { message, type: 'alert-success' }
  }
  
  function error(message) {
    alert.value = { message, type: 'alert-danger' }
  }
  
  function clear() {
    alert.value = null
  }

  return {
    // state
    alert,
    // actions
    success,
    error,
    clear
  }
})
