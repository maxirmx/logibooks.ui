<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import ActionButton from '@/components/ActionButton.vue'
import { useStickerCsvDownload } from '@/composables/useStickerCsvDownload.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useBoxesStore } from '@/stores/boxes.store.js'

const props = defineProps({
  registerId: { type: Number, default: null },
  disabled: Boolean
})

const auth = useAuthStore()
const boxes = useBoxesStore()
const label = 'Выгрузить коды стикеров всей партии'
const { busy, download } = useStickerCsvDownload('Не удалось выгрузить коды стикеров всей партии. Повторите попытку.')
</script>

<template>
  <ActionButton
    v-if="auth.isWhManagerPlus && registerId > 0"
    :item="{}"
    icon="fa-solid fa-share"
    icon-size="2x"
    :tooltip-text="label"
    :aria-label="label"
    data-testid="register-export-stickers"
    :disabled="disabled || busy"
    @click="download(() => boxes.downloadRegisterStickers(props.registerId))"
  />
</template>
