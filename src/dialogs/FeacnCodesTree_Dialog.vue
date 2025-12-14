<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import FeacnCodesTree from '@/components/FeacnCodesTree.vue'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'

defineOptions({ name: 'FeacnCodesTree_Dialog' })

const store = useFeacnCodesStore()

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

const authStore = useAuthStore()
const { isSrLogistPlus } = storeToRefs(authStore)

const fileInput = ref(null)
const treeRef = ref(null)
const uploading = ref(false)
const treeKey = ref(0) // Add key for forcing re-render

function openFileDialog() {
  fileInput.value?.click()
}

async function fileSelected(file) {
  if (!file) return
  
  uploading.value = true
  
  try {
    await store.upload(file)
    treeKey.value += 1
  } catch (error) {
    alertStore.error('Ошибка при загрузке файла: ' + (error.message || 'Неизвестная ошибка'))
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="settings table-2 feacn-codes-tree-container">
    <div class="header-with-actions">
      <h1 class="primary-heading">Коды ТН ВЭД</h1>
      <div style="display:flex; align-items:center;">
        <div v-if="uploading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group" v-if="isSrLogistPlus">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-file-import"
            tooltip-text="Загрузить коды ТН ВЭД"
            iconSize="2x"
            :disabled="uploading"
            @click="openFileDialog"
          />
        </div>
      </div>
    </div>
    <hr class="hr" />
    <input
      ref="fileInput"
      type="file"
      style="display: none"
      accept=".xls,.xlsx,.csv"
      :disabled="uploading"
      @change="(e) => fileSelected(e.target.files[0])"
    />

    <div class="tree-container" :class="{ 'disabled': uploading }">
      <FeacnCodesTree 
        ref="treeRef" 
        :key="treeKey"
        class="tree-wrapper" 
        :disabled="uploading" 
      />
    </div>
    
    <!-- Alert -->
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
.feacn-codes-tree-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tree-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.tree-container.disabled {
  pointer-events: none;
}

.tree-wrapper {
  height: 100%;
  overflow-y: auto;
}
</style>

