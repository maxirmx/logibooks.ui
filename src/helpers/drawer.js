// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref } from 'vue'

export const drawer = ref(null)

export function toggleDrawer() {
  drawer.value = !drawer.value
}

export function hideDrawer() {
  drawer.value = false
}
