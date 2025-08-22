// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

<script setup>
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

function openFileDialog() {
  fileInput.value?.click()
}

async function fileSelected(file) {
  if (!file) return
  
  uploading.value = true
  
  try {
    await store.upload(file)
    alertStore.success('Коды ТН ВЭД успешно загружены')
    // Refresh the tree to show updated data
    if (treeRef.value && treeRef.value.loadChildren) {
      await treeRef.value.loadChildren()
    }
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
          :icon="uploading ? 'fa-solid fa-spinner' : 'fa-solid fa-file-import'"
          :spin="uploading"
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

    <FeacnCodesTree ref="treeRef" class="tree-wrapper" />
    
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

.tree-wrapper {
  flex: 1;
  overflow-y: auto;
}

.upload-links {
  margin-bottom: 8px;
}

.link.disabled {
  opacity: 0.6;
  pointer-events: none;
  cursor: wait;
}
</style>

