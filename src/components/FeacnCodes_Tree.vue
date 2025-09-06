<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import FeacnCodesTree from '@/components/FeacnCodesTree.vue'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

defineOptions({ name: 'FeacnCodes_Tree' })

const store = useFeacnCodesStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
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
    <h1 class="primary-heading">Коды ТН ВЭД</h1>
    <hr class="hr" />
    <div class="link-crt d-flex upload-links">
      <a @click="openFileDialog" class="link" tabindex="0" :class="{ disabled: uploading }">
        <font-awesome-icon
          size="1x"
          icon="fa-solid fa-file-import"
          class="link"
        />&nbsp;&nbsp;&nbsp;{{ uploading ? 'Загрузка...' : 'Загрузить коды ТН ВЭД' }}
      </a>
      <input
        ref="fileInput"
        type="file"
        style="display: none"
        accept=".xls,.xlsx,.csv"
        :disabled="uploading"
        @change="(e) => fileSelected(e.target.files[0])"
      />
    </div>

    <div class="tree-container" :class="{ 'disabled': uploading }">
      <FeacnCodesTree 
        ref="treeRef" 
        :key="treeKey"
        class="tree-wrapper" 
        :disabled="uploading" 
      />
      <div v-if="uploading" class="loading-overlay">
        <div class="loading-content">
          <font-awesome-icon icon="fa-solid fa-spinner" spin size="2x" />
          <div class="loading-text">Загрузка файла...</div>
        </div>
      </div>
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

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  text-align: center;
  color: #666;
}

.loading-text {
  margin-top: 1rem;
  font-size: 1.1rem;
  font-weight: 500;
}

.upload-links {
  margin-bottom: 24px;
}

.link.disabled {
  opacity: 0.6;
  pointer-events: none;
  cursor: wait;
}
</style>

