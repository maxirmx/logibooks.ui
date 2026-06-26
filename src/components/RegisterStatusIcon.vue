<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import {
  resolveRegisterStatusColors,
  resolveRegisterStatusIcon
} from '@/helpers/register.status.icons.js'

const props = defineProps({
  status: { type: Object, default: null },
  size: { type: String, default: '1x' },
  title: { type: String, default: '' },
  showTooltip: { type: Boolean, default: true }
})

const icon = computed(() => resolveRegisterStatusIcon(props.status?.icon))
const styles = computed(() => resolveRegisterStatusColors(props.status))
const label = computed(() => (
  props.showTooltip ? props.title || props.status?.title || 'Статус партии' : null
))
</script>

<template>
  <span
    class="register-status-icon"
    :style="styles"
    :title="label"
    data-testid="register-status-icon"
  >
    <font-awesome-icon :icon="icon" :size="size" />
  </span>
</template>

<style scoped>
.register-status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #c7ccd1;
  border-radius: 0.375rem;
  line-height: 1;
}
</style>
