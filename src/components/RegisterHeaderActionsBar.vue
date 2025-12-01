<script setup>
import { useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { InvoiceParcelSelection } from '@/models/invoice.parcel.selection.js'

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

const router = useRouter()

function run(evt) {
  if (props.disabled) return
  emit(evt)
}

function openInvoiceSettings(selection = InvoiceParcelSelection.All) {
  if (props.disabled) return
  const registerId = props.item?.id
  if (!registerId) return
  router.push({
    name: 'Настройки инвойса',
    params: { id: registerId },
    query: { selection }
  })
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
        icon="fa-solid fa-book-journal-whills"
        tooltip-text="Проверить по стоп-словам с учётом исторических данных"
        :iconSize="iconSize"
        :disabled="disabled"
        @click="run('validate-sw-ex')"
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
        tooltip-text="Подбор кодов ТН ВЭД с учётом исторических данных"
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
      <ActionButton2L
        :item="item"
        icon="fa-solid fa-file-invoice"
        tooltip-text="Сформировать инвойс-манифест"
        :iconSize="iconSize"
        :disabled="disabled"
        :options="[
          {
            label: 'Все',
            action: () => openInvoiceSettings(InvoiceParcelSelection.All)
          },
          {
            label: 'С акцизом',
            action: () => openInvoiceSettings(InvoiceParcelSelection.WithExcise)
          },
          {
            label: 'Без акциза',
            action: () => openInvoiceSettings(InvoiceParcelSelection.WithoutExcise)
          }
        ]"
      />
    </div>
  </div>
</template>
