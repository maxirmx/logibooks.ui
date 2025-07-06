<script setup>
import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useOrdersStore } from '@/stores/orders.store.js'
import { useOrderStatusStore } from '@/stores/order.status.store.js'
import { storeToRefs } from 'pinia'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true }
})

const ordersStore = useOrdersStore()
const statusStore = useOrderStatusStore()

const { item } = storeToRefs(ordersStore)

statusStore.ensureStatusesLoaded()
await ordersStore.getById(props.id)

const schema = Yup.object().shape({
  statusId: Yup.number().required('Необходимо выбрать статус'),
  orderNumber: Yup.string().required('Необходимо указать номер заказа'),
  tnVed: Yup.string().required('Необходимо указать ТН ВЭД'),
  invoiceDate: Yup.date().nullable(),
  weightKg: Yup.number().nullable().min(0, 'Вес не может быть отрицательным'),
  quantity: Yup.number().nullable().min(0, 'Количество не может быть отрицательным'),
  unitPrice: Yup.number().nullable().min(0, 'Цена не может быть отрицательной')
})

function onSubmit(values, { setErrors }) {
  return ordersStore
    .update(props.id, values)
    .then(() => router.push(`/registers/${props.registerId}/orders`))
    .catch((error) => setErrors({ apiError: error.message || String(error) }))
}
</script>

<template>
  <div class="settings form-3">
    <h1 class="primary-heading">
      Заказ {{ item?.orderNumber ? item.orderNumber : '[без номера]' }}
    </h1>
    <hr class="hr" />
    <Form @submit="onSubmit" :initial-values="item" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
      
      <!-- Row 1: Basic Info --> 
      <div class="form-row">
      <!-- 
        <div class="form-group">
          <label for="rowNumber" class="label">Номер строки:</label>
          <Field name="rowNumber" id="rowNumber" type="number" class="form-control input" readonly />
        </div>
        <div class="form-group">
          <label for="orderNumber" class="label">Номер заказа:</label>
          <Field name="orderNumber" id="orderNumber" type="text" class="form-control input" :class="{ 'is-invalid': errors.orderNumber }" />
        </div>
      -->  
        <div class="form-group">
          <label for="statusId" class="label">Статус:</label>
          <Field as="select" name="statusId" id="statusId" class="form-control input" :class="{ 'is-invalid': errors.statusId }">
            <option v-for="s in statusStore.statuses" :key="s.id" :value="s.id">{{ s.title }}</option>
          </Field>
        </div>
      </div>

      <!-- Row 2: Order Details -->
      <div class="form-row">
        <div class="form-group">
          <label for="tnVed" class="label">ТН ВЭД:</label>
          <Field name="tnVed" id="tnVed" type="text" class="form-control input" :class="{ 'is-invalid': errors.tnVed }" />
        </div>
        <div class="form-group">
          <label for="invoiceDate" class="label">Дата инвойса:</label>
          <Field name="invoiceDate" id="invoiceDate" type="date" class="form-control input" :class="{ 'is-invalid': errors.invoiceDate }" />
        </div>
        <div class="form-group">
          <label for="extId" class="label">ext_id:</label>
          <Field name="extId" id="extId" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 3: Product Info -->
      <div class="form-row">
        <div class="form-group">
          <label for="sticker" class="label">Стикер:</label>
          <Field name="sticker" id="sticker" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="shk" class="label">ШК:</label>
          <Field name="shk" id="shk" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="stickerCode" class="label">Код стикера:</label>
          <Field name="stickerCode" id="stickerCode" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 4: Product Details -->
      <div class="form-row">
        <div class="form-group">
          <label for="siteArticle" class="label">Артикул сайта:</label>
          <Field name="siteArticle" id="siteArticle" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="productName" class="label">Наименование товара:</label>
          <Field name="productName" id="productName" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="brand" class="label">Бренд:</label>
          <Field name="brand" id="brand" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 5: Product Specs -->
      <div class="form-row">
        <div class="form-group">
          <label for="size" class="label">Размер:</label>
          <Field name="size" id="size" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="gender" class="label">Пол:</label>
          <Field name="gender" id="gender" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="heelHeight" class="label">Высота каблука:</label>
          <Field name="heelHeight" id="heelHeight" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 6: Materials -->
      <div class="form-row">
        <div class="form-group">
          <label for="fabricType" class="label">Тип ткани:</label>
          <Field name="fabricType" id="fabricType" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="composition" class="label">Состав:</label>
          <Field name="composition" id="composition" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="lining" class="label">Подкладка:</label>
          <Field name="lining" id="lining" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 7: More Materials -->
      <div class="form-row">
        <div class="form-group">
          <label for="insole" class="label">Стелька:</label>
          <Field name="insole" id="insole" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="sole" class="label">Подошва:</label>
          <Field name="sole" id="sole" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="country" class="label">Страна:</label>
          <Field name="country" id="country" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 8: Measurements & Pricing -->
      <div class="form-row">
        <div class="form-group">
          <label for="weightKg" class="label">Масса, кг:</label>
          <Field name="weightKg" id="weightKg" type="number" step="0.001" class="form-control input" :class="{ 'is-invalid': errors.weightKg }" />
        </div>
        <div class="form-group">
          <label for="quantity" class="label">Количество:</label>
          <Field name="quantity" id="quantity" type="number" step="0.001" class="form-control input" :class="{ 'is-invalid': errors.quantity }" />
        </div>
        <div class="form-group">
          <label for="unitPrice" class="label">Цена за 1 шт:</label>
          <Field name="unitPrice" id="unitPrice" type="number" step="0.01" class="form-control input" :class="{ 'is-invalid': errors.unitPrice }" />
        </div>
      </div>

      <!-- Row 9: Units & Codes -->
      <div class="form-row">
        <div class="form-group">
          <label for="unit" class="label">Единица измерения:</label>
          <Field name="unit" id="unit" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="currency" class="label">Валюта:</label>
          <Field name="currency" id="currency" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="barcode" class="label">Баркод:</label>
          <Field name="barcode" id="barcode" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 10: Documents & Links -->
      <div class="form-row">
        <div class="form-group">
          <label for="declaration" class="label">ГТД:</label>
          <Field name="declaration" id="declaration" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="productLink" class="label">Ссылка на товар:</label>
          <Field name="productLink" id="productLink" type="url" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="factoryAddress" class="label">Адрес завода:</label>
          <Field name="factoryAddress" id="factoryAddress" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 11: Recipient Info -->
      <div class="form-row">
        <div class="form-group">
          <label for="recipientName" class="label">ФИО получателя:</label>
          <Field name="recipientName" id="recipientName" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="recipientInn" class="label">ИНН получателя:</label>
          <Field name="recipientInn" id="recipientInn" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="passportNumber" class="label">Номер паспорта:</label>
          <Field name="passportNumber" id="passportNumber" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 12: More Recipient Info -->
      <div class="form-row">
        <div class="form-group">
          <label for="pinfl" class="label">Пинфл:</label>
          <Field name="pinfl" id="pinfl" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="contactPhone" class="label">Контактный номер:</label>
          <Field name="contactPhone" id="contactPhone" type="tel" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="boxNumber" class="label">Номер коробки:</label>
          <Field name="boxNumber" id="boxNumber" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 13: Supplier Info -->
      <div class="form-row">
        <div class="form-group">
          <label for="supplier" class="label">Поставщик:</label>
          <Field name="supplier" id="supplier" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="supplierInn" class="label">ИНН поставщика:</label>
          <Field name="supplierInn" id="supplierInn" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="category" class="label">Категория:</label>
          <Field name="category" id="category" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 14: Additional Info -->
      <div class="form-row">
        <div class="form-group">
          <label for="subcategory" class="label">Подкатегория:</label>
          <Field name="subcategory" id="subcategory" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="personalData" class="label">Персональные данные:</label>
          <Field name="personalData" id="personalData" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="customsClearance" class="label">Таможенное оформление:</label>
          <Field name="customsClearance" id="customsClearance" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 15: Final Details -->
      <div class="form-row">
        <div class="form-group">
          <label for="dutyPayment" class="label">Оплата пошлины:</label>
          <Field name="dutyPayment" id="dutyPayment" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="otherReason" class="label">Другая причина:</label>
          <Field name="otherReason" id="otherReason" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <!-- Empty for alignment -->
        </div>
      </div>

      <!-- Full width field for address -->
      <div class="form-group full-width">
        <label for="recipientAddress" class="label">Адрес получателя:</label>
        <Field name="recipientAddress" id="recipientAddress" type="text" class="form-control input" />
      </div>

      <!-- Full width field for description -->
      <div class="form-group full-width">
        <label for="description" class="label">Описание:</label>
        <Field as="textarea" name="description" id="description" rows="3" class="form-control input" />
      </div>

      <!-- Action buttons -->
      <div class="form-actions">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          Сохранить
        </button>
        <button class="button secondary" type="button" @click="router.push(`/registers/${props.registerId}/orders`)">
          Отменить
        </button>
      </div>
      
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
    
    <div v-if="item?.loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="item?.error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке заказа: {{ item.error }}</div>
    </div>
  </div>
</template>

<style scoped>
.form-3 {
  max-width: 2400px;
  margin: 0 auto;
  margin-bottom: 0.1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  margin-bottom: 0rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 0rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
  margin-bottom: 0rem;
}

.label {
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: var(--text-color);
}

.input {
  padding: 0.1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.8rem;
  height: 2rem;
  margin-bottom: 0.1rem;
}

.input[readonly] {
  background-color: #f5f5f5;
  color: #666;
}

.input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.1);
}

.input.is-invalid {
  border-color: #dc3545;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.button.primary {
  background-color: var(--primary-color);
  color: white;
}

.button.primary:hover:not(:disabled) {
  background-color: var(--primary-color-dark);
}

.button.secondary {
  background-color: #6c757d;
  color: white;
}

.button.secondary:hover {
  background-color: #5a6268;
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

textarea.input {
  height: auto;
  resize: vertical;
  min-height: 4rem;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
}

@media (max-width: 1024px) and (min-width: 769px) {
  .form-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
