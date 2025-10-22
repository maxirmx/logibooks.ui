<script setup>
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  downloadDisabled: { type: Boolean, default: false },
  iconSize: { type: String, default: '2x' }
})

const emit = defineEmits([
  'next-parcel',
  'next-problem',
  'back',
  'save',
  'cancel',
  'download'
])

function emitEvent(event) {
  if (props.disabled) return
  emit(event)
}

function emitDownload() {
  if (props.disabled || props.downloadDisabled) return
  emit('download')
}
</script>

<template>
  <div class="header-actions">
    <ActionButton
      :item="{}"
      icon="fa-solid fa-arrow-right"
      :iconSize="iconSize"
      tooltip-text="Следующая посылка"
      :disabled="disabled"
      @click="emitEvent('next-parcel')"
    />
    <ActionButton
      :item="{}"
      icon="fa-solid fa-play"
      :iconSize="iconSize"
      tooltip-text="Следующая проблема"
      :disabled="disabled"
      @click="emitEvent('next-problem')"
    />
    <ActionButton
      :item="{}"
      icon="fa-solid fa-arrow-left"
      :iconSize="iconSize"
      tooltip-text="Назад"
      :disabled="disabled"
      @click="emitEvent('back')"
    />
    <ActionButton
      :item="{}"
      icon="fa-solid fa-check-double"
      :iconSize="iconSize"
      tooltip-text="Сохранить"
      :disabled="disabled"
      @click="emitEvent('save')"
    />
    <ActionButton
      :item="{}"
      icon="fa-solid fa-xmark"
      :iconSize="iconSize"
      tooltip-text="Отменить"
      :disabled="disabled"
      @click="emitEvent('cancel')"
    />
    <ActionButton
      :item="{}"
      icon="fa-solid fa-upload"
      :iconSize="iconSize"
      tooltip-text="Выгрузить XML накладную"
      :disabled="disabled || downloadDisabled"
      @click="emitDownload"
    />
  </div>
</template>
