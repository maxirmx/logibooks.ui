<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import {
  REGISTER_STATUS_ICON_KIND_SVG,
  resolveRegisterStatusColors,
  resolveRegisterStatusIcon
} from '@/helpers/register.status.icons.js'

const props = defineProps({
  status: { type: Object, default: null },
  size: { type: String, default: '1x' }
})

const icon = computed(() => resolveRegisterStatusIcon(props.status?.icon))
const styles = computed(() => resolveRegisterStatusColors(props.status))
const svgStyles = computed(() => {
  const maskImage = `url("${icon.value.src}")`
  return {
    maskImage,
    WebkitMaskImage: maskImage
  }
})
</script>

<template>
  <span
    class="register-status-icon"
    :style="styles"
    :data-icon="icon.value"
    :data-icon-kind="icon.kind"
    data-testid="register-status-icon"
  >
    <span
      v-if="icon.kind === REGISTER_STATUS_ICON_KIND_SVG"
      class="register-status-icon__svg"
      :style="svgStyles"
      aria-hidden="true"
      data-testid="register-status-svg-icon"
    ></span>
    <font-awesome-icon
      v-else
      :icon="icon.icon"
      :size="size"
    />
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

.register-status-icon__svg {
  display: block;
  width: 1.5em;
  height: 1.5em;
  background-color: currentColor;
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
  -webkit-mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
}
</style>
