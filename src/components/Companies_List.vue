<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify, mdiPlus, mdiPencil, mdiDelete } from '@mdi/js'

const companiesStore = useCompaniesStore()
const countriesStore = useCountriesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { companies, loading } = storeToRefs(companiesStore)
const { countries } = storeToRefs(countriesStore)
const { alert } = storeToRefs(alertStore)

// Dialog states
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const editingCompany = ref(null)

// Search and pagination
const search = ref('')
const itemsPerPage = ref(10)

// Get country name by ISO numeric code
function getCountryName(isoNumeric) {
  const country = countries.value.find(c => c.isoNumeric === isoNumeric)
  return country ? country.nameRu : isoNumeric ? `Код: ${isoNumeric}` : ''
}

// Filtered companies based on search
const filteredCompanies = computed(() => {
  if (!search.value) return companies.value

  const searchTerm = search.value.toLowerCase()
  return companies.value.filter(company =>
    company.name?.toLowerCase().includes(searchTerm) ||
    company.shortName?.toLowerCase().includes(searchTerm) ||
    company.inn?.toLowerCase().includes(searchTerm) ||
    company.kpp?.toLowerCase().includes(searchTerm) ||
    getCountryName(company.countryIsoNumeric)?.toLowerCase().includes(searchTerm)
  )
})

// Table headers
const headers = [
  { title: 'ИНН', key: 'inn', sortable: true },
  { title: 'КПП', key: 'kpp', sortable: true },
  { title: 'Название', key: 'name', sortable: true },
  { title: 'Краткое название', key: 'shortName', sortable: true },
  { title: 'Страна', key: 'countryIsoNumeric', sortable: true },
  { title: 'Город', key: 'city', sortable: true },
  { title: 'Действия', key: 'actions', sortable: false, width: '120px' }
]

// Validation schema
const validationSchema = Yup.object({
  inn: Yup.string().required('ИНН обязателен'),
  kpp: Yup.string(),
  name: Yup.string().required('Название обязательно'),
  shortName: Yup.string(),
  countryIsoNumeric: Yup.number().required('Страна обязательна'),
  postalCode: Yup.string(),
  city: Yup.string(),
  street: Yup.string()
})

// CRUD operations
function openCreateDialog() {
  editingCompany.value = {
    inn: '',
    kpp: '',
    name: '',
    shortName: '',
    countryIsoNumeric: null,
    postalCode: '',
    city: '',
    street: ''
  }
  showCreateDialog.value = true
}

function openEditDialog(company) {
  editingCompany.value = { ...company }
  showEditDialog.value = true
}

async function saveCompany(values) {
  try {
    if (editingCompany.value.id) {
      await companiesStore.update(editingCompany.value.id, values)
      alertStore.success('Компания успешно обновлена')
    } else {
      await companiesStore.create(values)
      alertStore.success('Компания успешно создана')
    }
    showCreateDialog.value = false
    showEditDialog.value = false
  } catch (error) {
    if (error.message?.includes('409')) {
      alertStore.error('Компания с таким ИНН уже существует')
    } else {
      alertStore.error('Ошибка при сохранении компании')
    }
  }
}

async function deleteCompany(company) {
  const confirmed = await confirm({
    title: 'Подтвердите удаление',
    text: `Вы уверены, что хотите удалить компанию "${company.name}"?`,
    confirmationText: 'Удалить',
    cancellationText: 'Отмена'
  })

  if (confirmed) {
    try {
      await companiesStore.remove(company.id)
      alertStore.success('Компания успешно удалена')
    } catch (error) {
      if (error.message?.includes('409')) {
        alertStore.error('Нельзя удалить компанию, у которой есть связанные записи')
      } else {
        alertStore.error('Ошибка при удалении компании')
      }
    }
  }
}

// Initialize data
onMounted(async () => {
  await companiesStore.getAll()
  await countriesStore.getAll()
})
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <h1>Компании</h1>

        <!-- Alert -->
        <v-alert
          v-if="alert"
          :type="alert.type"
          :text="alert.message"
          class="mb-4"
          dismissible
          @click:close="alertStore.clear()"
        />

        <!-- Toolbar -->
        <v-card class="mb-4">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="search"
                  :prepend-inner-icon="mdiMagnify"
                  label="Поиск компаний"
                  single-line
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" md="6" class="text-right">
                <v-btn
                  v-if="authStore.isAdmin"
                  color="primary"
                  :prepend-icon="mdiPlus"
                  @click="openCreateDialog"
                >
                  Регистрировать компанию
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Data table -->
        <v-data-table
          :headers="headers"
          :items="filteredCompanies"
          :loading="loading"
          :items-per-page-options="itemsPerPageOptions"
          v-model:items-per-page="itemsPerPage"
          class="elevation-1"
        >
          <template #item.countryIsoNumeric="{ item }">
            {{ getCountryName(item.countryIsoNumeric) }}
          </template>

          <template #item.actions="{ item }">
            <v-btn
              v-if="authStore.isAdmin"
              size="small"
              variant="text"
              :icon="mdiPencil"
              @click="openEditDialog(item)"
            />
            <v-btn
              v-if="authStore.isAdmin"
              size="small"
              variant="text"
              :icon="mdiDelete"
              @click="deleteCompany(item)"
            />
          </template>

          <template #no-data>
            <div class="text-center pa-4">
              <p>Компании не найдены</p>
            </div>
          </template>
        </v-data-table>
      </v-col>
    </v-row>

    <!-- Create Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>Регистрация компании</v-card-title>
        <Form :validation-schema="validationSchema" @submit="saveCompany">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <Field name="inn" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="ИНН *"
                    :error-messages="errors"
                    required
                  />
                </Field>
              </v-col>
              <v-col cols="12" md="6">
                <Field name="kpp" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="КПП"
                    :error-messages="errors"
                  />
                </Field>
              </v-col>
              <v-col cols="12">
                <Field name="name" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="Название *"
                    :error-messages="errors"
                    required
                  />
                </Field>
              </v-col>
              <v-col cols="12">
                <Field name="shortName" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="Краткое название"
                    :error-messages="errors"
                  />
                </Field>
              </v-col>
              <v-col cols="12">
                <Field name="countryIsoNumeric" v-slot="{ field, errors }">
                  <v-select
                    v-bind="field"
                    :items="countries"
                    item-title="nameRu"
                    item-value="isoNumeric"
                    label="Страна *"
                    :error-messages="errors"
                    required
                  />
                </Field>
              </v-col>
              <v-col cols="12" md="4">
                <Field name="postalCode" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="Почтовый индекс"
                    :error-messages="errors"
                  />
                </Field>
              </v-col>
              <v-col cols="12" md="8">
                <Field name="city" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="Город"
                    :error-messages="errors"
                  />
                </Field>
              </v-col>
              <v-col cols="12">
                <Field name="street" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="Улица"
                    :error-messages="errors"
                  />
                </Field>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="showCreateDialog = false">Отмена</v-btn>
            <v-btn type="submit" color="primary">Создать</v-btn>
          </v-card-actions>
        </Form>
      </v-card>
    </v-dialog>

    <!-- Edit Dialog -->
    <v-dialog v-model="showEditDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>Изменить информацию о компании</v-card-title>
        <Form :validation-schema="validationSchema" :initial-values="editingCompany" @submit="saveCompany">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <Field name="inn" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="ИНН *"
                    :error-messages="errors"
                    required
                  />
                </Field>
              </v-col>
              <v-col cols="12" md="6">
                <Field name="kpp" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="КПП"
                    :error-messages="errors"
                  />
                </Field>
              </v-col>
              <v-col cols="12">
                <Field name="name" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="Название *"
                    :error-messages="errors"
                    required
                  />
                </Field>
              </v-col>
              <v-col cols="12">
                <Field name="shortName" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="Краткое название"
                    :error-messages="errors"
                  />
                </Field>
              </v-col>
              <v-col cols="12">
                <Field name="countryIsoNumeric" v-slot="{ field, errors }">
                  <v-select
                    v-bind="field"
                    :items="countries"
                    item-title="nameRu"
                    item-value="isoNumeric"
                    label="Страна *"
                    :error-messages="errors"
                    required
                  />
                </Field>
              </v-col>
              <v-col cols="12" md="4">
                <Field name="postalCode" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="Почтовый индекс"
                    :error-messages="errors"
                  />
                </Field>
              </v-col>
              <v-col cols="12" md="8">
                <Field name="city" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="Город"
                    :error-messages="errors"
                  />
                </Field>
              </v-col>
              <v-col cols="12">
                <Field name="street" v-slot="{ field, errors }">
                  <v-text-field
                    v-bind="field"
                    label="Улица"
                    :error-messages="errors"
                  />
                </Field>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="showEditDialog = false">Отмена</v-btn>
            <v-btn type="submit" color="primary">Сохранить</v-btn>
          </v-card-actions>
        </Form>
      </v-card>
    </v-dialog>
  </v-container>
</template>
