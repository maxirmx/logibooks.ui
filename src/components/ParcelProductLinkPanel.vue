<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import { ensureHttps } from '@/helpers/url.helpers.js'

const props = defineProps({
  item: {
    type: Object,
    default: () => ({})
  },
  label: {
    type: String,
    required: true
  },
  productLink: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['view-image', 'delete-image'])

const productLinkWithProtocol = computed(() => ensureHttps(props.productLink))
const actionsDisabled = computed(() => props.disabled || !props.item?.hasImage)
</script>

<template>
  <div class="product-link-panel">
    <label class="label">{{ label }}:</label>
    <div class="product-link-content">
      <div class="product-link-text">
        <a
          v-if="productLinkWithProtocol"
          :href="productLinkWithProtocol"
          target="_blank"
          rel="noopener noreferrer"
          class="product-link-inline"
        >
          {{ productLinkWithProtocol }}
        </a>
        <span v-else class="no-link">Ссылка отсутствует</span>
      </div>
      <div class="product-link-actions">
        <ActionButton
          :item="item"
          icon="fa-solid fa-eye"
          tooltip-text="Посмотреть изображение для тех. документации"
          :disabled="actionsDisabled"
          @click="$emit('view-image')"
          :iconSize="'1x'"
        />
        <ActionButton
          :item="item"
          icon="fa-solid fa-trash-can"
          tooltip-text="Удалить изображение для тех. документации"
          :disabled="actionsDisabled"
          @click="$emit('delete-image')"
          :iconSize="'1x'"
          variant="red"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-link-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.product-link-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.product-link-text {
  flex: 1;
  min-width: 0;
}

.product-link-actions {
  margin-left: auto;
  display: flex;
  gap: 0.25rem;
  background: #ffffff;
  border: 1px solid #74777c;
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
