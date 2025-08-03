<script setup>
import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { storeToRefs } from 'pinia'
import { ref, watch, computed } from 'vue'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useTransportationTypesStore } from '@/stores/transportation.types.store.js'
import { useCustomsProceduresStore } from '@/stores/customs.procedures.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'

const props = defineProps({
  id: { type: Number, required: true }
})

const registersStore = useRegistersStore()
const { item } = storeToRefs(registersStore)

const countriesStore = useCountriesStore()
countriesStore.ensureLoaded()
const { countries } = storeToRefs(countriesStore)

const transportationTypesStore = useTransportationTypesStore()
transportationTypesStore.ensureLoaded()

const customsProceduresStore = useCustomsProceduresStore()
customsProceduresStore.ensureLoaded()

const companiesStore = useCompaniesStore()
await companiesStore.getAll()
const { companies } = storeToRefs(companiesStore)

await registersStore.getById(props.id)

const schema = Yup.object().shape({
  dealNumber: Yup.string().nullable(),
  invoiceDate: Yup.date().nullable(),
  invoiceNumber: Yup.string().nullable(),
  transportationTypeId: Yup.number().nullable(),
  customsProcedureId: Yup.number().nullable(),
  theOtherCompanyId: Yup.number().nullable(),
  theOtherCountryCode: Yup.number().nullable()
})

const isExport = ref(false)

const proceduresLoaded = computed(
  () => Array.isArray(customsProceduresStore.procedures) && customsProceduresStore.procedures.length > 0
)

const typesLoaded = computed(
  () => Array.isArray(transportationTypesStore.types) && transportationTypesStore.types.length > 0
)

function updateDirection() {
  if (isExport.value) {
    item.value.destCountryCode = item.value.theOtherCountryCode
    item.value.origCountryCode = 643
    item.value.recipientId = item.value.theOtherCompanyId
    item.value.senderId = item.value.companyId
  } else {
    item.value.destCountryCode = 643
    item.value.origCountryCode = item.value.theOtherCountryCode
    item.value.recipientId = item.value.companyId
    item.value.senderId = item.value.theOtherCompanyId
  }
}

watch(
  () => item.value.customsProcedureId,
  (newId) => {
    const proc = customsProceduresStore.procedures?.find((p) => p.id === newId)
    isExport.value = proc && proc.code === 10
    updateDirection()
  },
  { immediate: true }
)

watch(
  () => item.value.theOtherCountryCode,
  () => updateDirection()
)

watch(
  () => item.value.theOtherCompanyId,
  () => updateDirection()
)

watch(proceduresLoaded, (loaded) => {
  if (loaded && !item.value.customsProcedureId) item.value.customsProcedureId = 1
})

watch(typesLoaded, (loaded) => {
  if (loaded && !item.value.transportationTypeId) item.value.transportationTypeId = 1
})

function handleProcedureChange(e) {
  item.value.customsProcedureId = parseInt(e.target.value)
  const proc = customsProceduresStore.procedures?.find((p) => p.id === item.value.customsProcedureId)
  isExport.value = proc && proc.code === 10
  updateDirection()
}

function onSubmit(values, { setErrors }) {
  return registersStore
    .update(props.id, values)
    .then(() => router.push('/registers'))
    .catch((error) => setErrors({ apiError: error.message || String(error) }))
}

function getCustomerName(customerId) {
  if (!customerId || !companies.value) return 'Неизвестно'
  const company = companies.value.find((c) => c.id === customerId)
  if (!company) return 'Неизвестно'
  return company.shortName || company.name || 'Неизвестно'
}

</script>

<template>
  <div class="settings form-3 form-compact">
    <h1 class="primary-heading">Редактировать информацию о реестре</h1>
    <hr class="hr" />
    <Form
      @submit="onSubmit"
      :initial-values="item"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="dealNumber" class="label">Номер сделки:</label>
            <Field name="dealNumber" id="dealNumber" type="text" class="form-control input" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="invoiceNumber" class="label">Номер накладной:</label>
            <Field name="invoiceNumber" id="invoiceNumber" type="text" class="form-control input" />
          </div>
          <div class="form-group">
            <label for="invoiceDate" class="label">Дата накладной:</label>
            <Field name="invoiceDate" id="invoiceDate" type="date" class="form-control input" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">Отправитель:</label>
            <template v-if="!isExport">
              <Field
                as="select"
                name="theOtherCompanyId"
                id="theOtherCompanyId"
                class="form-control input"
              >
                <option value="">Выберите компанию</option>
                <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.shortName }}</option>
              </Field>
            </template>
            <div v-else class="readonly-field">{{ getCustomerName(item.companyId) }}</div>
          </div>
          <div class="form-group">
            <label class="label">Страна отправления:</label>
            <template v-if="!isExport">
              <Field
                as="select"
                name="theOtherCountryCode"
                id="theOtherCountryCode"
                class="form-control input"
              >
                <option value="">Выберите страну</option>
                <option v-for="c in countries" :key="c.id" :value="c.isoNumeric">
                  {{ c.nameRuOfficial }}
                </option>
              </Field>
            </template>
            <div v-else class="readonly-field">Россия</div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">Получатель:</label>
            <template v-if="isExport">
              <Field
                as="select"
                name="theOtherCompanyId"
                id="theOtherCompanyId"
                class="form-control input"
              >
                <option value="">Выберите компанию</option>
                <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.shortName }}</option>
              </Field>
            </template>
            <div v-else class="readonly-field">{{ getCustomerName(item.companyId) }}</div>
          </div>
          <div class="form-group">
            <label class="label">Страна назначения:</label>
            <template v-if="isExport">
              <Field
                as="select"
                name="theOtherCountryCode"
                id="theOtherCountryCode"
                class="form-control input"
              >
                <option value="">Выберите страну</option>
                <option v-for="c in countries" :key="c.id" :value="c.isoNumeric">
                  {{ c.nameRuOfficial }}
                </option>
              </Field>
            </template>
            <div v-else class="readonly-field">Россия</div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="transportationTypeId" class="label">Транспорт:</label>
            <Field
              as="select"
              name="transportationTypeId"
              id="transportationTypeId"
              class="form-control input"
              :disabled="!typesLoaded"
            >
              <option value="">Выберите тип</option>
              <option v-for="t in transportationTypesStore.types" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </Field>
          </div>
          <div class="form-group">
            <label for="customsProcedureId" class="label">Процедура:</label>
            <Field
              as="select"
              name="customsProcedureId"
              id="customsProcedureId"
              class="form-control input"
              :disabled="!proceduresLoaded"
              @change="handleProcedureChange"
            >
              <option value="">Выберите процедуру</option>
              <option v-for="p in customsProceduresStore.procedures" :key="p.id" :value="p.id">
                {{ p.name }}
              </option>
            </Field>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">Файл:</label>
            <div class="readonly-field">{{ item.fileName }}</div>
          </div>
          <div class="form-group">
            <label class="label">Дата загрузки:</label>
            <div class="readonly-field">{{ item.date ? item.date.slice(0, 10) : '' }}</div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          Сохранить
        </button>
        <button class="button secondary" type="button" @click="router.push('/registers')">
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
    <div v-if="item?.loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="item?.error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке реестра: {{ item.error }}</div>
    </div>
  </div>
</template>
