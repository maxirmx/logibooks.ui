<script setup>

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { InvoiceParcelSelection } from '@/models/invoice.parcel.selection.js'
import { useAuthStore } from '@/stores/auth.store.js'
import {
  isCustomsChargesCalculationProcedure,
  isImportCustomsProcedure
} from '@/helpers/customs.procedure.helpers.js'
import { canChangeParcelWeights } from '@/helpers/weight.correction.helpers.js'
const authStore = useAuthStore()

const props = defineProps({
  item: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
  mutationDisabled: { type: Boolean, default: false },
  iconSize: { type: String, default: '2x' },
  loading: { type: Boolean, default: false },
  noHistoricData: { type: Boolean, default: false },
  showPassportCheck: { type: Boolean, default: false },
  showWeightUpdate: { type: Boolean, default: false },
})

const emit = defineEmits([
  'validate-sw',
  'validate-sw-ex',
  'validate-fc',
  'lookup',
  'lookup-ex',
  'check-passports',
  'finish-passport-check',
  'export-ordinary',
  'export-excise',
  'export-notifications',
  'download',
  'download-packing-list',
  'download-additional-restrictions',
  'download-techdoc',
  'bulk-change-parcel-status',
  'update-weights-from-file',
  'calculate-customs-charges',
  'freeze-check-status',
  'freeze-tnved-order',
  'close',
])

const mutationEvents = new Set([
  'validate-sw',
  'validate-sw-ex',
  'validate-fc',
  'lookup',
  'lookup-ex',
  'check-passports',
  'finish-passport-check',
  'bulk-change-parcel-status',
  'update-weights-from-file',
  'calculate-customs-charges',
  'freeze-check-status',
  'freeze-tnved-order'
])

const router = useRouter()

const {
  isSrLogistPlus,
  isShiftLeadPlus
} = storeToRefs(authStore)

const canCalculateCustomsCharges = computed(() => {
  return isCustomsChargesCalculationProcedure(props.item?.customsProcedureCode)
})

const weightChangesAllowed = computed(() => canChangeParcelWeights(props.item))
const weightUpdateTooltip = computed(() =>
  weightChangesAllowed.value
    ? 'Обновить веса из файла реестра'
    : 'Обновление весов недоступно: задан фактический вес к оформлению'
)

const documentOptions = computed(() => {
  const options = [
    {
      label: 'инвойс-манифест (все)',
      icon: 'fa-solid fa-file-invoice',
      color: 'not-checked',
      action: () => openInvoiceSettings(InvoiceParcelSelection.All)
    },
    {
      label: 'инвойс-манифест (с акцизом)',
      icon: 'fa-solid fa-file-invoice',
      color: 'approved-with-excise',
      action: () => openInvoiceSettings(InvoiceParcelSelection.WithExcise)
    },
    {
      label: 'инвойс-манифест (с нотификациями)',
      icon: 'fa-solid fa-file-invoice',
      color: 'approved-with-notification',
      action: () => openInvoiceSettings(InvoiceParcelSelection.WithNotifications)
    },
    {
      label: 'инвойс-манифест (без акциза и нотификаций)',
      icon: 'fa-solid fa-file-invoice',
      color: 'no-issues',
      action: () => openInvoiceSettings(InvoiceParcelSelection.Ordinal)
    }
  ]

  if (isImportCustomsProcedure(props.item?.customsProcedureCode)) {
    options.push({
      label: 'отчёт ДО1 (все)',
      icon: 'fa-solid fa-check-to-slot',
      color: 'not-checked',
      action: openDo1Settings
    })
  }

  if (Number(props.item?.transportationTypeCode) === 1) {
    options.push({
      label: 'CMR (все)',
      icon: 'fa-solid fa-file-signature',
      color: 'not-checked',
      action: openCmrSettings
    })
  }

  if (
    Number(props.item?.transportationTypeCode) === 0 &&
    Number(props.item?.warehouseId) > 0
  ) {
    options.push({
      label: 'packing list',
      icon: 'fa-solid fa-file-invoice',
      color: 'not-checked',
      action: () => run('download-packing-list')
    })
  }

  options.push(
    {
      label: 'реестр дополнительных изъятий',
      icon: 'fa-solid fa-person-circle-xmark',
      color: 'parcel-has-issues',
      action: () => run('download-additional-restrictions')
    },
    {
      label: 'тех. документация (с акцизом)',
      icon: 'fa-solid fa-file-image',
      color: 'approved-with-excise',
      action: () => run('download-techdoc')
    }
  )

  return options
})

function run(evt) {
  if (
    props.disabled ||
    props.loading ||
    (props.mutationDisabled && mutationEvents.has(evt)) ||
    (evt === 'update-weights-from-file' && !weightChangesAllowed.value)
  ) return
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

function openDo1Settings() {
  if (props.disabled || !isImportCustomsProcedure(props.item?.customsProcedureCode)) return
  const registerId = props.item?.id
  if (!registerId) return
  router.push({
    name: 'Настройки формы ДО1',
    params: { id: registerId }
  })
}

function openCmrSettings() {
  if (props.disabled || Number(props.item?.transportationTypeCode) !== 1) return
  const registerId = props.item?.id
  if (!registerId) return
  router.push({
    name: 'Настройки CMR',
    params: { id: registerId }
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
        :disabled="disabled || mutationDisabled"
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
        :disabled="disabled || mutationDisabled"
        @click="run('validate-fc')"
      />
      <ActionButton2L
        v-if="showPassportCheck"
        :item="item"
        icon="fa-solid fa-passport"
        tooltip-text="Проверка паспортов"
        :iconSize="iconSize"
        :variant="item?.hasPendingPassportChecks ? 'blue' : 'default'"
        :disabled="disabled || mutationDisabled"
        :options="[
          {
            label: 'Проверить паспорта',
            icon: 'fa-solid fa-passport',
            color: 'not-checked',
            action: () => run('check-passports')
          },
          {
            label: 'Закончить проверку паспортов',
            icon: 'fa-solid fa-passport',
            color: 'parcel-has-issues',
            action: () => run('finish-passport-check')
          }
        ]"
      />
      <ActionButton2L
        :item="item"
        icon="fa-solid fa-magnifying-glass"
        tooltip-text="Подбор кодов ТН ВЭД"
        :iconSize="iconSize"
        :disabled="disabled || mutationDisabled"
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
            icon: 'fa-solid fa-upload',
            color: 'approved-with-excise',
            action: () => run('export-excise')
          },
          {
            label: 'С нотификациями',
            icon: 'fa-solid fa-upload',
            color: 'approved-with-notification',
            action: () => run('export-notifications')
          },
          {
            label: 'Без акциза и нотификаций',
            icon: 'fa-solid fa-upload',
            color: 'no-issues',
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
      <ActionButton2L
        :item="item"
        icon="fa-solid fa-file-invoice"
        tooltip-text="Сформировать документы"
        :iconSize="iconSize"
        :disabled="disabled"
        :options="documentOptions"
      />
    </div>
    <div class="header-actions header-actions-group">
      <ActionButton
        v-if="isSrLogistPlus && showWeightUpdate"
        :item="item"
        icon="fa-solid fa-file-arrow-up"
        :tooltip-text="weightUpdateTooltip"
        :iconSize="iconSize"
        :disabled="disabled || mutationDisabled || loading || !weightChangesAllowed"
        data-testid="register-weight-update-action"
        @click="run('update-weights-from-file')"
      />
      <ActionButton
        v-if="isSrLogistPlus && canCalculateCustomsCharges"
        :item="item"
        icon="fa-solid fa-calculator"
        tooltip-text="Рассчитать сборы и пошлины"
        :iconSize="iconSize"
        :disabled="disabled || mutationDisabled"
        @click="run('calculate-customs-charges')"
      />
      <ActionButton
        v-if="isSrLogistPlus"
        :item="item"
        icon="fa-solid fa-pen-to-square"
        tooltip-text="Выбрать посылки и изменить статус"
        :iconSize="iconSize"
        :disabled="disabled || mutationDisabled"
        @click="run('bulk-change-parcel-status')"
      />
      <ActionButton
        v-if="isShiftLeadPlus"
        :item="item"
        icon="fa-solid fa-xmarks-lines"
        tooltip-text="Применить запреты"
        :iconSize="iconSize"
        :disabled="disabled || mutationDisabled"
        @click="run('freeze-check-status')"
      />
      <ActionButton
        v-if="isShiftLeadPlus"
        :item="item"
        icon="fa-solid fa-arrows-to-eye"
        tooltip-text="Зафиксировать сортировку по кодам ТН ВЭД"
        :iconSize="iconSize"
        :disabled="disabled || mutationDisabled"
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
