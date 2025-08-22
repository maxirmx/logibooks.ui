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
import { reactive, ref, computed, onUnmounted } from 'vue'
import FeacnCodesTree from '@/components/FeacnCodesTree.vue'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import {
  createValidationState,
  calculateValidationProgress,
  createPollingTimer
} from '@/helpers/registers.list.helpers.js'

defineOptions({ name: 'FeacnCodes_Tree' })

const store = useFeacnCodesStore()
const uploadState = reactive(createValidationState())
const progressPercent = computed(() => calculateValidationProgress(uploadState))
const fileInput = ref(null)

function openFileDialog() {
  fileInput.value?.click()
}

async function fileSelected(file) {
  if (!file) return
  try {
    const res = await store.upload(file)
    uploadState.handleId = res.id
    uploadState.total = 0
    uploadState.processed = 0
    uploadState.show = true
    await pollUpload()
    pollingTimer.start()
  } catch (err) {
    // ignore, store.error already set
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function pollUpload() {
  if (!uploadState.handleId) return
  try {
    const progress = await store.getUploadProgress(uploadState.handleId)
    uploadState.total = progress.total
    uploadState.processed = progress.processed
    if (progress.finished || progress.total === -1 || progress.processed === -1) {
      uploadState.show = false
      pollingTimer.stop()
    }
  } catch (err) {
    uploadState.show = false
    pollingTimer.stop()
  }
}

function cancelUploadWrapper() {
  if (uploadState.handleId) {
    store.cancelUpload(uploadState.handleId).catch(() => {})
  }
  uploadState.show = false
  pollingTimer.stop()
}

const pollingTimer = createPollingTimer(pollUpload)

onUnmounted(() => {
  pollingTimer.stop()
})
</script>

<template>
  <div class="feacn-codes-tree-container">
    <div class="link-crt d-flex upload-links">
      <a @click="openFileDialog" class="link" tabindex="0">
        <font-awesome-icon
          size="1x"
          icon="fa-solid fa-file-import"
          class="link"
        />&nbsp;&nbsp;&nbsp;Загрузить коды ТН ВЭД
      </a>
      <input
        ref="fileInput"
        type="file"
        style="display: none"
        accept=".xls,.xlsx,.csv"
        @change="(e) => fileSelected(e.target.files[0])"
      />
    </div>
    <FeacnCodesTree class="tree-wrapper" />
    <v-dialog v-model="uploadState.show" width="300">
      <v-card>
        <v-card-title class="primary-heading">Загрузка кодов ТН ВЭД</v-card-title>
        <v-card-text class="text-center">
          <v-progress-circular :model-value="progressPercent" :size="70" :width="7" color="primary">
            {{ progressPercent }}%
          </v-progress-circular>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="cancelUploadWrapper">Отменить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
</style>

