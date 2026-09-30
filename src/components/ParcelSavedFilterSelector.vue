<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application
import { computed, inject } from 'vue'

defineProps({ disabled: { type: Boolean, default: false } })
const selection = inject('savedParcelFilter', null)
const options = computed(() => selection?.options.value ?? [{ title: 'Нет', value: null }])
const model = computed({
  get: () => selection?.id.value ?? null,
  set: value => selection?.select(value)
})
</script>

<template>
  <v-select
    v-model="model"
    :items="options"
    item-title="title"
    item-value="value"
    label="Пользовательский фильтр"
    density="compact"
    hide-details="auto"
    class="responsive-filter-bar__item--compact"
    :disabled="disabled"
    data-testid="saved-parcel-filter"
  />
</template>
