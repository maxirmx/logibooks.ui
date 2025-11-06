<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useRegistersStore } from '@/stores/registers.store.js'
import { InvoiceOptionalColumns } from '@/models/invoice.optional.columns.js'
import { InvoiceParcelSelection } from '@/models/invoice.parcel.selection.js'

const props = defineProps({
  id: { type: Number, required: true },
  selection: { type: String, default: undefined }
})

const router = useRouter()
const registersStore = useRegistersStore()
const { item, loading, error } = storeToRefs(registersStore)

function resolveParcelSelection(value) {
  if (value === InvoiceParcelSelection.All) return InvoiceParcelSelection.All
  if (value === InvoiceParcelSelection.WithExcise) return InvoiceParcelSelection.WithExcise
  if (value === InvoiceParcelSelection.WithoutExcise) return InvoiceParcelSelection.WithoutExcise
  return InvoiceParcelSelection.All
}

const parcelSelection = ref(resolveParcelSelection(props.selection))
const selectedOptionalColumns = ref(InvoiceOptionalColumns.None)
const submissionError = ref('')
const isSubmitting = ref(false)

const parcelSelectionOptions = [
  { title: 'Все', value: InvoiceParcelSelection.All },
  { title: 'С акцизом', value: InvoiceParcelSelection.WithExcise },
  { title: 'Без акциза', value: InvoiceParcelSelection.WithoutExcise }
]

const optionalColumnOptions = [
  { label: 'Номер мешка', value: InvoiceOptionalColumns.BagNumber },
  { label: 'ФИО', value: InvoiceOptionalColumns.FullName },
  { label: 'Предшествующий ДТЭГ', value: InvoiceOptionalColumns.PreviousDteg },
  { label: 'УИН', value: InvoiceOptionalColumns.Uin },
  { label: 'Ссылка', value: InvoiceOptionalColumns.Url }
]

const currentRegister = computed(() => {
  const value = item.value
  if (!value || value.loading || value.error) {
    return null
  }
  return value
})

const isFetching = computed(() => loading.value || item.value?.loading)
const storeErrorMessage = computed(() => normalizeError(error.value ?? item.value?.error))
const displayError = computed(() => submissionError.value || storeErrorMessage.value)
const isFormDisabled = computed(() => isFetching.value || isSubmitting.value || !currentRegister.value)

const heading = computed(() => {
  const number = currentRegister.value?.invoiceNumber
  if (number) {
    return `Сформировать инвойс/манифест (${number})`
  }
  return 'Сформировать инвойс/манифест'
})

function normalizeError(err) {
  if (!err) return ''
  if (typeof err === 'string') return err
  if (err?.message) return err.message
  return String(err)
}

function isColumnSelected(column) {
  return (selectedOptionalColumns.value & column) === column
}

function setColumn(column, checked) {
  if (checked) {
    selectedOptionalColumns.value |= column
  } else {
    selectedOptionalColumns.value &= ~column
  }
}

async function handleSubmit() {
  submissionError.value = ''
  if (!currentRegister.value) {
    submissionError.value = 'Не удалось получить данные реестра'
    return
  }

  isSubmitting.value = true
  try {
    await registersStore.downloadInvoiceFile(
      currentRegister.value.id,
      currentRegister.value.invoiceNumber,
      parcelSelection.value,
      selectedOptionalColumns.value
    )
    router.back()
  } catch (err) {
    submissionError.value = normalizeError(err) || 'Не удалось сформировать инвойс'
  } finally {
    isSubmitting.value = false
  }
}

function handleCancel() {
  router.back()
}

onMounted(() => {
  registersStore.getById(props.id)
})

watch(
  () => props.selection,
  (value) => {
    parcelSelection.value = resolveParcelSelection(value)
  }
)
</script>

<template>
  <div class="invoice-settings">
    <header class="invoice-settings__header">
      <h1 class="invoice-settings__title">{{ heading }}</h1>
      <div class="invoice-settings__actions">
        <v-btn
          color="primary"
          @click="handleSubmit"
          :disabled="isFormDisabled"
          :loading="isSubmitting"
        >
          Сформировать
        </v-btn>
        <v-btn color="secondary" variant="outlined" @click="handleCancel">
          Отменить
        </v-btn>
      </div>
    </header>

    <v-divider class="mb-4" />

    <v-alert v-if="displayError" type="error" variant="tonal" class="mb-4">
      {{ displayError }}
    </v-alert>

    <v-progress-linear
      v-if="isFetching"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <v-card variant="outlined" class="pa-6">
      <v-row dense>
        <v-col cols="12" md="6">
          <v-select
            v-model="parcelSelection"
            :items="parcelSelectionOptions"
            item-title="title"
            item-value="value"
            label="Выбор посылок"
            density="comfortable"
            :disabled="isFormDisabled"
          />
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <h2 class="invoice-settings__section-title">Дополнительные колонки</h2>

      <v-row>
        <v-col v-for="option in optionalColumnOptions" :key="option.value" cols="12" sm="6">
          <v-checkbox
            :label="option.label"
            :model-value="isColumnSelected(option.value)"
            @update:model-value="(value) => setColumn(option.value, value)"
            :disabled="isFormDisabled"
          />
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>

<style scoped>
.invoice-settings {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px 48px;
}

.invoice-settings__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.invoice-settings__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.invoice-settings__actions {
  display: flex;
  gap: 12px;
}

.invoice-settings__section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 12px;
}
</style>
