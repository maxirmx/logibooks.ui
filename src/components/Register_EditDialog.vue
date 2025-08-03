<script setup>
import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { storeToRefs } from 'pinia'
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
  destCountryCode: Yup.number().nullable(),
  invoiceDate: Yup.date().nullable(),
  invoiceNumber: Yup.string().nullable(),
  transportationTypeId: Yup.number().nullable(),
  customsProcedureId: Yup.number().nullable()
})

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
  <div class="settings form-3">
    <h1 class="primary-heading">Редактировать информацию о реестре</h1>
    <hr class="hr" />
    <Form
      @submit="onSubmit"
      :initial-values="item"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label class="label">Файл:</label>
        <div class="readonly-field">{{ item.fileName }}</div>
      </div>
      <div class="form-group">
        <label class="label">Клиент:</label>
        <div class="readonly-field">{{ getCustomerName(item.companyId) }}</div>
      </div>
      <div class="form-group">
        <label for="destCountryCode" class="label">Страна:</label>
        <Field as="select" name="destCountryCode" id="destCountryCode" class="form-control input">
          <option value="">Выберите страну</option>
          <option v-for="c in countries" :key="c.id" :value="c.isoNumeric">
            {{ c.nameRuOfficial }}
          </option>
        </Field>
      </div>
      <div class="form-group">
        <label for="invoiceNumber" class="label">Номер накладной:</label>
        <Field name="invoiceNumber" id="invoiceNumber" type="text" class="form-control input" />
      </div>
      <div class="form-group">
        <label for="invoiceDate" class="label">Дата накладной:</label>
        <Field name="invoiceDate" id="invoiceDate" type="date" class="form-control input" />
      </div>
      <div class="form-group">
        <label for="transportationTypeId" class="label">Тип транспорта:</label>
        <Field
          as="select"
          name="transportationTypeId"
          id="transportationTypeId"
          class="form-control input"
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
        >
          <option value="">Выберите процедуру</option>
          <option v-for="p in customsProceduresStore.procedures" :key="p.id" :value="p.id">
            {{ p.name }}
          </option>
        </Field>
      </div>
      <div class="form-group">
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
