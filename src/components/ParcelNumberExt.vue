<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, ref, watch } from 'vue'
import { useExportFeesStore } from '@/stores/export.fees.store.js'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ClickableCell from '@/components/ClickableCell.vue'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  liveCategory: { type: Boolean, default: false },
  tnVed: { type: String, default: '' },
  customsProcedureCode: { type: [Number, String], default: null },
  item: { type: Object, required: true },
  fieldName: { type: String, default: 'postingNumber' }, // field to display (postingNumber for Ozon, shk for WBR)
  disabled: { type: Boolean, default: false }
})

const draftMatches = ref(false)
const showCategory = computed(() => props.liveCategory
  ? draftMatches.value
  : props.item.matchesExportFeeCategory === true)
const normalizeCode = (code) => String(code ?? '').replace(/\s/g, '')
watch(
  () => [props.liveCategory, props.tnVed, props.customsProcedureCode],
  async ([live, value, procedure], _, onCleanup) => {
    let current = true
    onCleanup(() => { current = false })
    draftMatches.value = false
    const code = normalizeCode(value)
    if (!live || ![10, 31].includes(Number(procedure)) || !/^\d{10}$/.test(code)) return
    try {
      const feesStore = useExportFeesStore()
      await feesStore.ensureLoaded()
      const matches = feesStore.fees.some((fee) => {
        const prefix = normalizeCode(fee.code)
        return prefix.length > 0 && code.startsWith(prefix)
      })
      if (!matches || !current) return
      // Bulk lookup returns null for an inactive/unknown code, without a 404 error.
      const response = await useFeacnCodesStore().bulkLookup([code])
      const results = response?.results ?? response?.Results ?? response
      if (current) draftMatches.value = Boolean(results?.[code])
    } catch (error) {
      // A superseded check no longer belongs to the current form value.
      if (current) useAlertStore().error(error)
    }
  },
  { immediate: true }
)
const emit = defineEmits(['click', 'fellows'])

function handleClick(item) {
  emit('click', item)
}

function handleFellowsClick(item) {
  emit('fellows', item)
}
</script>

<template>
  <div class="action-buttons">
    <ClickableCell 
      :item="item" 
      :display-value="item[fieldName] || ''" 
      cell-class="truncated-cell clickable-cell" 
      :disabled="disabled"
      @click="handleClick" 
    />
    <span
      v-if="showCategory"
      class="export-fee-category-marker"
      role="img"
      title="Код ТН ВЭД входит в справочник экспортных сборов"
      aria-label="Код ТН ВЭД входит в справочник экспортных сборов"
    >C</span>
    <ActionButton 
      v-if="item?.fellowItems?.length > 0 && !item?.blockedByFellowItem && !item?.excsiseByFellowItem"
      :item="item" 
      icon="fa-solid fa-comment-dots" 
      tooltip-text="Есть товары с тем же номером посылки" 
      @click="handleFellowsClick" 
      :disabled="disabled" 
    />
    <ActionButton 
      v-if="item?.blockedByFellowItem"
      :item="item" 
      icon="fa-solid fa-comment-slash" 
      tooltip-text="Есть запрет товара с тем же номером посылки" 
      @click="handleFellowsClick" 
      :disabled="disabled" 
      variant="red"
    />
    <ActionButton 
      v-if="item?.excsiseByFellowItem"
      :item="item" 
      icon="fa-solid fa-comment-dollar" 
      tooltip-text="Есть подакцизный товар с тем же номером посылки" 
      @click="handleFellowsClick" 
      :disabled="disabled" 
      variant="orange"
    />
    <ActionButton 
      v-if="item?.markedByFellowItem"
      :item="item" 
      icon="fa-solid fa-comment-nodes" 
      tooltip-text="Товар с тем же номером посылки помечен партнёром" 
      @click="handleFellowsClick" 
      :disabled="disabled" 
      variant="blue"
    />
  </div>
</template>

<style scoped>
.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

</style>
