<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import FieldError from '@/components/FieldError.vue'
import ActionButton from '@/components/ActionButton.vue'
import {
  createEmptyPrototypeParcelFilter,
  getPrototypeParcelFilter,
  prototypeParcelFilterOptions,
  validatePrototypeParcelFilterName
} from '@/helpers/parcel.filters.prototype.js'

const props = defineProps({
  mode: { type: String, required: true, validator: (value) => ['create', 'edit'].includes(value) },
  id: { type: Number, default: null }
})

const router = useRouter()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const parcelStatusesStore = useParcelStatusesStore()
const registersStore = useRegistersStore()
const statusOptionsReady = ref(false)
const parcelStatusOptions = computed(() =>
  parcelStatusesStore.parcelStatuses.map((status) => ({ value: status.id, title: status.title }))
)
const passportStatusOptions = computed(() =>
  (registersStore.ops?.passportCheckStatuses ?? []).map((status) => ({
    value: status.value,
    title: status.name
  }))
)
const checkStatusGroups = computed(() => [
  { key: 'common', label: 'Общие статусы проверки', options: prototypeParcelFilterOptions.common },
  { key: 'sw', label: 'Проверка стоп-слов', options: prototypeParcelFilterOptions.sw },
  { key: 'fc', label: 'Проверка ТН ВЭД', options: prototypeParcelFilterOptions.fc },
  { key: 'passport', label: 'Проверка паспорта', options: passportStatusOptions.value }
])
const fixture = computed(() =>
  props.mode === 'edit' ? getPrototypeParcelFilter(props.id) : null
)
const missingFilter = computed(() => props.mode === 'edit' && !fixture.value)
const draft = ref(fixture.value ?? createEmptyPrototypeParcelFilter())
const errors = ref({})
const nameError = computed(() => validatePrototypeParcelFilterName(draft.value.name, draft.value.id))
const saveDisabled = computed(() => !statusOptionsReady.value || missingFilter.value || Boolean(nameError.value))
const profileUrl = computed(() => `/user/edit/${authStore.user?.id}`)
const heading = computed(() =>
  props.mode === 'create' ? 'Создание пользовательского фильтра' : 'Настройка пользовательского фильтра'
)

let active = true
onUnmounted(() => { active = false })

async function loadStatusOptions() {
  statusOptionsReady.value = false
  try {
    await Promise.all([parcelStatusesStore.ensureLoaded(), registersStore.ensureOpsLoaded()])
    if (active && !missingFilter.value) statusOptionsReady.value = true
    return true
  } catch (error) {
    // An abandoned page or route no longer owns this load failure or its retry action.
    if (!active || missingFilter.value) return false
    alertStore.error(error, {
      fallback: 'Не удалось загрузить статусы',
      action: { label: 'Повторить', handler: loadStatusOptions }
    })
    return false
  }
}

onMounted(() => {
  if (missingFilter.value) alertStore.error('Фильтр не найден в данных прототипа')
  else void loadStatusOptions()
})

watch(
  () => [props.mode, props.id],
  () => {
    draft.value = fixture.value ?? createEmptyPrototypeParcelFilter()
    errors.value = {}
    if (missingFilter.value) alertStore.error('Фильтр не найден в данных прототипа')
    else if (!statusOptionsReady.value) {
      void loadStatusOptions()
    }
  }
)

function reviewForm() {
  if (!statusOptionsReady.value || missingFilter.value) return
  errors.value = nameError.value ? { name: nameError.value } : {}
  if (nameError.value) return

  alertStore.info('Прототип: форма проверена, но фильтр не сохранён.')
}

function validateName() {
  errors.value = nameError.value ? { name: nameError.value } : {}
}

async function returnToProfile() {
  try {
    await router.push(profileUrl.value)
  } catch (error) {
    alertStore.error(error, { fallback: 'Не удалось вернуться к настройкам пользователя' })
  }
}
</script>

<template>
  <div class="settings form-3" data-testid="parcel-filter-settings">
    <div class="header-with-actions">
      <h1 class="primary-heading">{{ heading }}</h1>
      <div class="header-actions-bar">
        <div class="header-actions header-actions-group">
          <ActionButton
            v-if="!missingFilter"
            :item="{}"
            icon="fa-solid fa-check-double"
            icon-size="2x"
            tooltip-text="Сохранить (прототип: без сохранения)"
            :disabled="saveDisabled"
            data-testid="parcel-filter-save"
            @click="reviewForm"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            icon-size="2x"
            tooltip-text="Закрыть без сохранения"
            data-testid="parcel-filter-back"
            @click="returnToProfile"
          />
        </div>
      </div>
    </div>
    <hr class="hr" />
    <PageAlertRegion />

    <template v-if="!missingFilter">
      <form @submit.prevent="reviewForm">
        <div class="form-group">
          <label class="label" for="parcel-filter-name">Название фильтра:</label>
          <input
            id="parcel-filter-name"
            v-model="draft.name"
            type="text"
            class="form-control input"
            :class="{ 'is-invalid': errors.name }"
            maxlength="101"
            data-testid="parcel-filter-name"
            @input="validateName"
            @blur="validateName"
          />
        </div>
        <div class="parcel-filter-settings__field-error">
          <FieldError name="name" :errors="errors" />
        </div>

        <p>Посылка скрывается, если совпадает хотя бы один выбранный статус.</p>
        <div v-if="statusOptionsReady" class="parcel-filter-settings__fields">
          <div class="parcel-filter-settings__left-column">
            <fieldset
              v-for="group in checkStatusGroups"
              :key="group.key"
              class="parcel-filter-settings__group"
              :data-testid="`parcel-filter-${group.key}`"
            >
              <legend class="label parcel-filter-settings__legend">{{ group.label }}</legend>
              <label
                v-for="option in group.options"
                :key="option.value"
                class="parcel-filter-settings__option custom-checkbox"
                :class="{ disabled: option.enforced }"
              >
                <input v-if="option.enforced" class="custom-checkbox-input" type="checkbox" :value="option.value" checked disabled />
                <input v-else v-model="draft.excludedCheckStatuses[group.key]" class="custom-checkbox-input" type="checkbox" :value="option.value" />
                <span class="custom-checkbox-box" aria-hidden="true"></span>
                <span class="custom-checkbox-label">{{ option.title }}</span>
              </label>
            </fieldset>
          </div>
          <div class="parcel-filter-settings__right-column">
            <fieldset class="parcel-filter-settings__group" data-testid="parcel-filter-statuses">
              <legend class="label parcel-filter-settings__legend">Статусы посылок</legend>
              <label v-for="option in parcelStatusOptions" :key="option.value" class="parcel-filter-settings__option custom-checkbox">
                <input v-model="draft.excludedParcelStatusIds" class="custom-checkbox-input" type="checkbox" :value="option.value" />
                <span class="custom-checkbox-box" aria-hidden="true"></span>
                <span class="custom-checkbox-label">{{ option.title }}</span>
              </label>
            </fieldset>
          </div>
        </div>
      </form>
    </template>
  </div>
</template>

<style scoped>
.parcel-filter-settings__field-error {
  margin: -0.25rem 0 0.75rem calc(40% + 0.5rem);
}

.parcel-filter-settings__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: stretch;
}

.parcel-filter-settings__left-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.parcel-filter-settings__right-column {
  min-width: 0;
}

.parcel-filter-settings__right-column .parcel-filter-settings__group {
  height: 100%;
}

.parcel-filter-settings__group {
  min-width: 0;
  border: 1px solid #d7dbe1;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
}

.parcel-filter-settings__legend {
  width: auto;
  min-width: 0;
  padding: 0 0.25rem;
  white-space: normal;
  overflow: visible;
}

.parcel-filter-settings__option {
  margin: 0.25rem 0;
}

.custom-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  width: 100%;
  line-height: 1.4;
  cursor: pointer;
}

.custom-checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.custom-checkbox-box {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 0.2rem;
  border-radius: 3px;
  background-color: #1976d2;
  position: relative;
}

.custom-checkbox-box::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 2px;
  width: 12px;
  height: 12px;
  background-image: url('@/assets/check-solid.svg');
  background-size: cover;
  opacity: 0;
}

.custom-checkbox-input:checked + .custom-checkbox-box::after {
  opacity: 1;
}

.custom-checkbox-input:focus-visible + .custom-checkbox-box {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}

.custom-checkbox-label {
  flex: 1;
  white-space: normal;
  overflow-wrap: anywhere;
}

.custom-checkbox:hover .custom-checkbox-box {
  background-color: #1565c0;
}

.custom-checkbox.disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.custom-checkbox.disabled .custom-checkbox-box,
.custom-checkbox.disabled:hover .custom-checkbox-box {
  background-color: #74777c;
}

@media (max-width: 700px) {
  .parcel-filter-settings__fields {
    grid-template-columns: minmax(0, 1fr);
  }

  .parcel-filter-settings__right-column .parcel-filter-settings__group {
    height: auto;
  }

  .parcel-filter-settings__field-error {
    margin-left: 0;
  }
}
</style>
