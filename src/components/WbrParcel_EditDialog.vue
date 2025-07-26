<script setup>
import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useParcelCheckStatusStore } from '@/stores/parcel.checkstatuses.store.js'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { storeToRefs } from 'pinia'
import { ref, watch, } from 'vue'
import { wbrRegisterColumnTitles, wbrRegisterColumnTooltips } from '@/helpers/wbr.register.mapping.js'
import { HasIssues, getCheckStatusInfo } from '@/helpers/orders.check.helper.js'
import { getFieldTooltip } from '@/helpers/parcel.tooltip.helpers.js'
import WbrFormField from './WbrFormField.vue'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true }
})

const parcelsStore = useParcelsStore()
const statusStore = useParcelStatusesStore()
const parcelCheckStatusStore = useParcelCheckStatusStore()
const stopWordsStore = useStopWordsStore()
const feacnCodesStore = useFeacnCodesStore()
const countriesStore = useCountriesStore()

const { item } = storeToRefs(parcelsStore)
const { stopWords } = storeToRefs(stopWordsStore)
const { orders: feacnOrders } = storeToRefs(feacnCodesStore)
const { countries } = storeToRefs(countriesStore)

// Reactive reference to track current statusId for color updates
const currentStatusId = ref(null)

// Watch for changes in item.statusId to initialize currentStatusId
watch(() => item.value?.statusId, (newStatusId) => {
  currentStatusId.value = newStatusId
}, { immediate: true })

statusStore.ensureStatusesLoaded()
parcelCheckStatusStore.ensureStatusesLoaded()
await stopWordsStore.getAll()
if (countries.value.length === 0) {
  await countriesStore.getAll()
}
await parcelsStore.getById(props.id)

const schema = Yup.object().shape({
  statusId: Yup.number().required('Необходимо выбрать статус'),
  tnVed: Yup.string().required('Необходимо указать ТН ВЭД'),
  countryCode: Yup.number().required('Необходимо выбрать страну'),
  invoiceDate: Yup.date().nullable(),
  weightKg: Yup.number().nullable().min(0, 'Вес не может быть отрицательным'),
  quantity: Yup.number().nullable().min(0, 'Количество не может быть отрицательным'),
  unitPrice: Yup.number().nullable().min(0, 'Цена не может быть отрицательной')
})

function onSubmit(values, { setErrors }) {
  return parcelsStore
    .update(props.id, values)
    .then(() => router.push(`/registers/${props.registerId}/parcels`))
    .catch((error) => setErrors({ apiError: error.message || String(error) }))
}


async function validateParcel() {
  try {
    await parcelsStore.validate(item.value.id)
    // Optionally reload the order data to reflect any changes
    await parcelsStore.getById(props.id)
  } catch (error) {
    console.error('Failed to validate parcel:', error)
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при проверке посылки'
  }
}
</script>

<template>
  <div class="settings form-3">
    <h1 class="primary-heading">
      Посылка {{ item?.shk ? item.shk : '[без номера]' }}
    </h1>
    <hr class="hr" />
    <Form @submit="onSubmit" :initial-values="item" :validation-schema="schema" v-slot="{ errors, isSubmitting }">

      <!-- Order Identification & Status Section -->
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="statusId" class="label" :title="getFieldTooltip('statusId', wbrRegisterColumnTitles, wbrRegisterColumnTooltips)">{{ wbrRegisterColumnTitles.statusId }}:</label>
            <Field as="select" name="statusId" id="statusId" class="form-control input"
                   @change="(e) => currentStatusId = parseInt(e.target.value)">
              <option v-for="s in statusStore.parcelStatuses" :key="s.id" :value="s.id">{{ s.title }}</option>
            </Field>
          </div>
          <div class="form-group">
            <label for="checkStatusId" class="label" :title="getFieldTooltip('checkStatusId', wbrRegisterColumnTitles, wbrRegisterColumnTooltips)">{{ wbrRegisterColumnTitles.checkStatusId }}:</label>
            <div class="readonly-field status-cell" :class="{ 'has-issues': HasIssues(item?.checkStatusId) }">
              {{ parcelCheckStatusStore.getStatusTitle(item?.checkStatusId) }}
            </div>
            <button class="validate-btn" @click="validateParcel" type="button" title="Проверить посылку">
              <font-awesome-icon size="1x" icon="fa-solid fa-clipboard-check" />
            </button>
          </div>
          <!-- Stopwords information when there are issues -->
          <div v-if="HasIssues(item?.checkStatusId) && getCheckStatusInfo(item, feacnOrders, stopWords)" class="form-group stopwords-info">
            <div class="stopwords-text">
              {{ getCheckStatusInfo(item, feacnOrders, stopWords) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Product Identification & Details Section -->
      <div class="form-section">
        <h3 class="section-title">Информация о товаре</h3>
        <div class="form-row">
          <WbrFormField name="tnVed" :errors="errors" />
          <WbrFormField name="shk" :errors="errors" />
          <WbrFormField name="productName" :errors="errors" />
          <div class="form-group">
            <label class="label">{{ wbrRegisterColumnTitles.productLink }}:</label>
            <a v-if="item?.productLink" :href="item.productLink" target="_blank" rel="noopener noreferrer" class="product-link-inline" :title="item.productLink">
              {{ item.productLink }}
            </a>
            <span v-else class="no-link">Ссылка отсутствует</span>
          </div>
          <WbrFormField name="countryCode" as="select" :errors="errors">
            <option value="">Выберите страну</option>
            <option v-for="country in countries" :key="country.id" :value="country.isoNumeric">
              {{ country.nameRuOfficial }}
            </option>
          </WbrFormField>
          <WbrFormField name="weightKg" type="number" step="1.0" :errors="errors" />
          <WbrFormField name="quantity" type="number" step="1.0" :errors="errors" />
          <WbrFormField name="unitPrice" type="number" step="1.0" :errors="errors" />
          <WbrFormField name="currency" :errors="errors" />
        </div>
      </div>

      <!-- Recipient Information Section -->
      <div class="form-section">
        <h3 class="section-title">Информация о получателе</h3>
        <div class="form-row">
          <WbrFormField name="recipientName" :errors="errors" />
          <WbrFormField name="passportNumber" :errors="errors" />
        </div>
      </div>

      <!-- Action buttons -->

      <div class="form-actions">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          Сохранить
        </button>
        <button class="button secondary" type="button" @click="router.push(`/registers/${props.registerId}/parcels`)">
          Отменить
        </button>
      </div>

      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>

    <div v-if="item?.loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="item?.error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке информации о посылке: {{ item.error }}</div>
    </div>
  </div>
</template>

