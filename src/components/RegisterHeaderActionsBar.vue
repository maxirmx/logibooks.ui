<script setup>
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  item: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
  iconSize: { type: String, default: '2x' }
})

const emit = defineEmits([
  'validate-sw',
  'validate-fc',
  'lookup',
  'lookup-ex',
  'export-noexcise',
  'export-excise',
  'download'
])

function run(evt) {
  if (props.disabled) return
  emit(evt)
}
</script>

<template>
  <div style="display:flex; align-items:center;">
    <div class="header-actions header-actions-group">
      <ActionButton
        :item="item"
        icon="fa-solid fa-spell-check"
        tooltip-text="Проверить по стоп-словам"
        :iconSize="iconSize"
        :disabled="disabled"
        @click="run('validate-sw')"
      />
      <ActionButton
        :item="item"
        icon="fa-solid fa-anchor-circle-check"
        tooltip-text="Проверить по кодам ТН ВЭД"
        :iconSize="iconSize"
        :disabled="disabled"
        @click="run('validate-fc')"
      />
      <ActionButton
        :item="item"
        icon="fa-solid fa-magnifying-glass"
        tooltip-text="Подбор кодов ТН ВЭД"
        :iconSize="iconSize"
        :disabled="disabled"
        @click="run('lookup')"
      />
      <ActionButton
        :item="item"
        icon="fa-solid fa-book-skull"
        tooltip-text="Расширенный подбор кодов ТН ВЭД"
        :iconSize="iconSize"
        :disabled="disabled"
        @click="run('lookup-ex')"
      />
    </div>
    <div class="header-actions header-actions-group">
      <ActionButton
        :item="item"
        icon="fa-solid fa-upload"
        tooltip-text="Выгрузить XML накладные для реестра (без акциза)"
        :iconSize="iconSize"
        variant="green"
        :disabled="disabled"
        @click="run('export-noexcise')"
      />
      <ActionButton
        :item="item"
        icon="fa-solid fa-upload"
        tooltip-text="Выгрузить XML накладные для реестра (акциз)"
        :iconSize="iconSize"
        variant="orange"
        :disabled="disabled"
        @click="run('export-excise')"
      />
      <ActionButton
        :item="item"
        icon="fa-solid fa-file-export"
        tooltip-text="Экспортировать реестр"
        :iconSize="iconSize"
        :disabled="disabled"
        @click="run('download')"
      />
    </div>
  </div>
</template>
