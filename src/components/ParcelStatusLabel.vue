<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faSkullCrossbones } from '@fortawesome/free-solid-svg-icons'
import { isDangerousGoodsVisible } from '@/helpers/parcel.dangerous.goods.helpers.js'

const props = defineProps({
  dangerousGoods: { type: Boolean, default: false },
  theOtherCountryCode: { type: [Number, String], default: null }
})

const showIndicator = computed(() =>
  props.dangerousGoods === true && isDangerousGoodsVisible(props.theOtherCountryCode)
)
</script>

<template>
  <span class="parcel-status-label">
    <span
      v-if="showIndicator"
      class="parcel-status-label__dangerous"
      role="img"
      title="Опасный груз"
      aria-label="Опасный груз"
    ><FontAwesomeIcon :icon="faSkullCrossbones" aria-hidden="true" /></span>
    <span class="parcel-status-label__value"><slot /></span>
  </span>
</template>

<style scoped>
.parcel-status-label {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  max-width: 100%;
  vertical-align: middle;
}

.parcel-status-label__dangerous {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 1.5em;
  height: 1.5em;
  border: 2px solid currentColor;
  border-radius: 2px;
  color: #000;
  line-height: 1;
}

.parcel-status-label__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
