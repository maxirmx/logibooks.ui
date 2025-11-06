<script setup>
// Invoice settings dialog implemented to follow Register_EditDialog style & approach
import router from '@/router'
import { Form } from 'vee-validate'
import * as Yup from 'yup'
import { storeToRefs } from 'pinia'
import { ref, computed, watch, onMounted } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import ActionDialog from '@/components/ActionDialog.vue'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { InvoiceOptionalColumns } from '@/models/invoice.optional.columns.js'
import { InvoiceParcelSelection } from '@/models/invoice.parcel.selection.js'
import { useActionDialog } from '@/composables/useActionDialog.js'

const props = defineProps({
  id: { type: Number, required: true },
  selection: { type: String, required: false }
})

const registersStore = useRegistersStore()
const { item, loading } = storeToRefs(registersStore)

function resolveParcelSelection(value) {
  if (value === InvoiceParcelSelection.WithExcise) return InvoiceParcelSelection.WithExcise
  if (value === InvoiceParcelSelection.WithoutExcise) return InvoiceParcelSelection.WithoutExcise
  return InvoiceParcelSelection.All
}

// State mirrors register dialog style (item used as initial values provider)
const parcelSelection = ref(resolveParcelSelection(props.selection))
const optionalColumns = ref(InvoiceOptionalColumns.None)
const isSubmitting = ref(false)

const alertStore = useAlertStore()
const { actionDialogState, showActionDialog, hideActionDialog } = useActionDialog()

const parcelSelectionOptions = [
  { id: 1, label: 'Все', value: InvoiceParcelSelection.All },
  { id: 2, label: 'С акцизом', value: InvoiceParcelSelection.WithExcise },
  { id: 3, label: 'Без акциза', value: InvoiceParcelSelection.WithoutExcise }
]

const optionalColumnOptions = [
  { id: 1, label: 'Номер мешка', value: InvoiceOptionalColumns.BagNumber },
  { id: 2, label: 'ФИО', value: InvoiceOptionalColumns.FullName },
  { id: 3, label: 'Предшествующий ДТЭГ', value: InvoiceOptionalColumns.PreviousDteg },
  { id: 4, label: 'УИН', value: InvoiceOptionalColumns.Uin },
  { id: 5, label: 'Ссылка', value: InvoiceOptionalColumns.Url }
]

const currentRegister = computed(() => {
  const r = item.value
  if (!r || r.loading || r.error) return null
  return r
})

const heading = computed(() => {
  const number = currentRegister.value?.invoiceNumber
  return number ? `Настройки инвойса (${number})` : 'Настройки инвойса'
})

const isFormDisabled = computed(() => isSubmitting.value || loading.value || !currentRegister.value)

function normalizeError(e) {
  if (!e) return ''
  if (typeof e === 'string') return e
  if (e?.message) return e.message
  return String(e)
}

function isColumnSelected(column) {
  return (optionalColumns.value & column) === column
}

function toggleColumn(column) {
  if (isColumnSelected(column)) {
    optionalColumns.value &= ~column
  } else {
    optionalColumns.value |= column
  }
}

const schema = Yup.object().shape({}) // no form-bound fields; using external state

async function onSubmit() {
  if (!currentRegister.value || isSubmitting.value) return
  isSubmitting.value = true
  // show global action dialog while preparing invoice
  try {
    showActionDialog('download-invoice')
    await registersStore.downloadInvoiceFile(
      currentRegister.value.id,
      currentRegister.value.invoiceNumber,
      parcelSelection.value,
      optionalColumns.value
    )
    router.push('/registers')
  } catch (err) {
    // report error via alert store and keep dialog hidden
    const msg = normalizeError(err) || 'Не удалось сформировать инвойс'
    alertStore.error(msg)
  } finally {
    hideActionDialog()
    isSubmitting.value = false
  }
}

function onCancel() {
  router.push('/registers')
}

watch(
  () => props.selection,
  (value) => {
    parcelSelection.value = resolveParcelSelection(value)
  }
)

onMounted(() => {
  registersStore.getById(props.id)
})
</script>

<template>
  <div class="settings form-2 form-compact invoice-settings-dialog">
    <Form :initial-values="{}" :validation-schema="schema" @submit="onSubmit" v-slot="{ }">
      <div class="header-with-actions">
        <h1 class="primary-heading">{{ heading }}</h1>
        <div class="header-actions">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-check-double"
            icon-size="2x"
            tooltip-text="Сформировать"
            :disabled="isFormDisabled"
            @click="onSubmit()"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            icon-size="2x"
            tooltip-text="Отменить"
            :disabled="isSubmitting"
            @click="onCancel()"
          />
        </div>
      </div>
      <hr class="hr" />

      <!-- action dialog shown during invoice preparation -->

      <div class="form-section">
        <div class="form-row-1">
          <div class="form-group">
            <label class="label" for="parcelSelection">Выбор посылок:</label>
            <select
              id="parcelSelection"
              class="form-control input"
              v-model="parcelSelection"
              :disabled="isFormDisabled"
            >
              <option v-for="o in parcelSelectionOptions" :key="o.id" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
        </div>

        <div class="form-row-1 optional-columns-row">
          <div class="form-group optional-columns-group">
            <label class="label">Дополнительные колонки:</label>
            <div class="checkbox-wrapper">
              <div class="checkbox-grid">
                <label
                  v-for="c in optionalColumnOptions"
                  :key="c.id"
                  class="custom-checkbox"
                >
                  <input
                    type="checkbox"
                    class="custom-checkbox-input"
                    :disabled="isFormDisabled"
                    :checked="isColumnSelected(c.value)"
                    @change="toggleColumn(c.value)"
                  />
                  <span class="custom-checkbox-box"></span>
                  <span class="custom-checkbox-label">{{ c.label }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Form>
    <!-- global alert store message placed at the bottom -->
    <div v-if="alertStore.alert" class="mt-3">
      <div :class="['alert', alertStore.alert.type]" role="alert">{{ alertStore.alert.message }}</div>
    </div>
    <ActionDialog :action-dialog="actionDialogState" />
  </div>
</template>

<style scoped>
.invoice-settings-dialog .form-section,
.invoice-settings-dialog .form-row,
.invoice-settings-dialog .form-group { overflow: visible; }

.optional-columns-row { margin-top: 0.5rem; }

.input-wrapper {
  border: 1px solid #d0d7de;
  border-radius: 6px;
  padding: 0.5rem;
  background-color: #fff;
}

.input-wrapper .form-control {
  border: none;
  padding: 0;
  background: transparent;
}

.input-wrapper .form-control:focus {
  box-shadow: none;
  outline: none;
}

.checkbox-wrapper {
  border: 1px solid #d0d7de;
  border-radius: 6px;
  padding: 0.75rem;
  width: 100%;
  background-color: #fff;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* force two columns */
  gap: 0.5rem 1rem;
}

@media (max-width: 640px) {
  .checkbox-grid { grid-template-columns: 1fr; } /* stack on narrow screens */
}

.custom-checkbox { display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer; }
.custom-checkbox-input { position: absolute; opacity: 0; width: 0; height: 0; }
.custom-checkbox-box { width: 16px; height: 16px; background-color: #1976d2; border-radius: 3px; position: relative; margin-top: 0.1rem; }
.custom-checkbox-box:after { content: ''; position: absolute; left: 2px; top: 2px; width: 12px; height: 12px; background-image: url('@/assets/check-solid.svg'); background-size: cover; opacity: 0; transition: opacity 0.3s, transform 0.3s; transform: translateY(-2px); }
.custom-checkbox-input:checked ~ .custom-checkbox-box:after { opacity: 1; transform: translateY(0); }
.custom-checkbox-label { flex: 1; white-space: normal; }
.custom-checkbox:hover .custom-checkbox-box { background-color: #1565c0; }
</style>
