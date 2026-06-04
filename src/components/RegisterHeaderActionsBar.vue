<script setup>

import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { InvoiceParcelSelection } from '@/models/invoice.parcel.selection.js'
import { useAuthStore } from '@/stores/auth.store.js'
const authStore = useAuthStore()

const props = defineProps({
  item: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
  iconSize: { type: String, default: '2x' },
  loading: { type: Boolean, default: false },
  noHistoricData: { type: Boolean, default: false },
})

const emit = defineEmits([
  'validate-sw',
  'validate-sw-ex',
  'validate-fc',
  'lookup',
  'lookup-ex',
  'export-ordinary',
  'export-excise',
  'export-notifications',
  'download',
  'download-additional-restrictions',
  'download-techdoc',
  'freeze-check-status',
  'freeze-tnved-order',
  'close',
])

const router = useRouter()

const {
  isSrLogistPlus,
  isShiftLeadPlus
} = storeToRefs(authStore)

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
  <div class="header-actions-bar">
    <div v-if="loading" class="header-actions header-actions-group">
        <span class="spinner-border spinner-border-m"></span>
    </div>
    <div v-if="isSrLogistPlus" class="header-actions header-actions-group">
      <ActionButton2L
        :item="item"
        icon="fa-solid fa-spell-check"
        tooltip-text="Проверить по стоп-словам"
        :iconSize="iconSize"
        :disabled="disabled"
        :options="[
          {
            label: 'С учётом исторических данных',
            action: () => run('validate-sw-ex'),
            disabled: noHistoricData
          },
          {
            label: 'Без учёта исторических данных',
            action: () => run('validate-sw')
          }
        ]"
      />
      <ActionButton
        :item="item"
        icon="fa-solid fa-anchor-circle-check"
        tooltip-text="Проверить по кодам ТН ВЭД"
        :iconSize="iconSize"
        :disabled="disabled"
        @click="run('validate-fc')"
      />
      <ActionButton2L
        :item="item"
        icon="fa-solid fa-magnifying-glass"
        tooltip-text="Подбор кодов ТН ВЭД"
        :iconSize="iconSize"
        :disabled="disabled"
        :options="[
          {
            label: 'С учётом исторических данных',
            action: () => run('lookup-ex'),
            disabled: noHistoricData
          },
          {
            label: 'Без учёта исторических данных',
            action: () => run('lookup')
          }
        ]"
      />
    </div>
    <div class="header-actions header-actions-group">
      <ActionButton2L
        :item="item"
        icon="fa-solid fa-upload"
        tooltip-text="Выгрузить XML накладные"
        :iconSize="iconSize"
        :disabled="disabled"
        :options="[
          {
            label: 'С акцизом',
            action: () => run('export-excise')
          },
          {
            label: 'С нотификациями',
            action: () => run('export-notifications')
          },
          {
            label: 'Без акциза и нотификаций',
            action: () => run('export-ordinary')
          }
        ]"
      />
      <ActionButton
        :item="item"
        icon="fa-solid fa-file-export"
        tooltip-text="Экспортировать реестр"
        :iconSize="iconSize"
        :disabled="disabled"
        @click="run('download')"
      />
      <ActionButton
        :item="item"
        icon="fa-solid fa-person-circle-xmark"
        tooltip-text="Скачать дополнительные изъятия"
        :iconSize="iconSize"
        :disabled="disabled"
        @click="run('download-additional-restrictions')"
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
            label: 'С нотификациями',
            action: () => openInvoiceSettings(InvoiceParcelSelection.WithNotifications)
          },
          {
            label: 'Без акциза и нотификаций',
            action: () => openInvoiceSettings(InvoiceParcelSelection.Ordinal)
          }
        ]"
      />
      <ActionButton
        :item="item"
        icon="fa-solid fa-file-image"
        tooltip-text="Сформировать тех. документацию (акциз)"
        :iconSize="iconSize"
        :disabled="disabled"
        @click="run('download-techdoc')"
      />
    </div>
    <div class="header-actions header-actions-group">
      <ActionButton
        v-if="isShiftLeadPlus"
        :item="item"
        icon="fa-solid fa-xmarks-lines"
        tooltip-text="Применить запреты"
        :iconSize="iconSize"
        :disabled="disabled"
        @click="run('freeze-check-status')"
      />
      <ActionButton
        v-if="isShiftLeadPlus"
        :item="item"
        icon="fa-solid fa-arrows-to-eye"
        tooltip-text="Зафиксировать сортировку по кодам ТН ВЭД"
        :iconSize="iconSize"
        :disabled="disabled"
        @click="run('freeze-tnved-order')"
      />
      <ActionButton
        :item="item"
        icon="fa-solid fa-xmark"
        tooltip-text="Закрыть"
        aria-label="Закрыть"
        :iconSize="iconSize"
        :disabled="disabled"
        @click="run('close')"
      />
    </div>
  </div>
</template>
