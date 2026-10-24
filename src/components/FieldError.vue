<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { getErrorMessage } from '@/helpers/error.helpers.js'

defineProps({
  name: { type: String, required: true },
  errors: { type: Object, default: () => ({}) }
})
</script>

<template>
  <div v-if="errors?.[name]" class="invalid-feedback d-block" role="alert">
    {{ getErrorMessage(errors[name], 'Некорректное значение') }}
  </div>
</template>
