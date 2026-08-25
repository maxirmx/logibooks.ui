<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { RouterLink, RouterView } from 'vue-router'
import { version } from '@/../package'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { mdiChevronDown, mdiChevronUp } from '@mdi/js'
import { useStatusStore } from '@/stores/status.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE, getRegisterNouns } from '@/helpers/op.mode.js'
import { reportError } from '@/helpers/error.helpers.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'

import { useDisplay } from 'vuetify'
const { height } = useDisplay()

import { useAuthStore } from '@/stores/auth.store.js'
const authStore = useAuthStore()

const statusStore = useStatusStore()
const alertStore = useAlertStore()

const baseUrl = import.meta.env.BASE_URL
const paperworkRegisterNouns = getRegisterNouns(OP_MODE_PAPERWORK)
const warehouseRegisterNouns = getRegisterNouns(OP_MODE_WAREHOUSE)

onMounted(() => {
  statusStore.fetchStatus().catch((error) => {
    reportError(error, { context: 'App.fetchStatus' })
    alertStore.error(error, { fallback: 'Не удалось загрузить состояние сервера' })
  })
})

const ruDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit'
})
const rateNumberFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4
})
const unitNumberFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0
})
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/
const RATE_UNAVAILABLE_MARK = '—'
const RATE_UNAVAILABLE_MESSAGE = 'не удалось получить курс'
const COLLAPSED_APP_BAR_HEIGHT = 64
const EXPANDED_APP_BAR_VERTICAL_PADDING = 24

const exchangeRatesViewport = ref(null)
const exchangeRatesContent = ref(null)
const exchangeRatesOverflow = ref(false)
const exchangeRatesExpanded = ref(false)
const appBarHeight = ref(COLLAPSED_APP_BAR_HEIGHT)

let exchangeRatesResizeObserver = null

function findRate(code) {
  return statusStore.exchangeRates?.find((r) => r?.alphabeticCode?.toUpperCase() === code) || null
}

function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}

function toLocalDateKey(date) {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isSameRateDate(rateDate, today) {
  if (typeof rateDate === 'string' && dateOnlyPattern.test(rateDate)) {
    return rateDate === toLocalDateKey(today)
  }

  const d = new Date(rateDate)
  if (Number.isNaN(d.getTime())) return false
  return isSameDay(d, today)
}

const exchangeRatesDisplay = computed(() => {
  const today = new Date()
  const todayStr = ruDateFormatter.format(today)

  const usd = findRate('USD')
  const eur = findRate('EUR')
  const uzs = findRate('UZS')
  const tjs = findRate('TJS')

  function formatEntry(rateObj) {
    if (!rateObj) return RATE_UNAVAILABLE_MARK
    if (!isSameRateDate(rateObj.date, today)) return RATE_UNAVAILABLE_MARK
    if (typeof rateObj.rate !== 'number') return RATE_UNAVAILABLE_MARK
    return rateNumberFormatter.format(rateObj.rate)
  }

  function formatUnitRateLabel(currencyCode, rateObj) {
    if (!rateObj || typeof rateObj.units !== 'number' || rateObj.units <= 0) {
      return currencyCode
    }

    return `${currencyCode} (за ${unitNumberFormatter.format(rateObj.units)})`
  }

  const usdText = formatEntry(usd)
  const eurText = formatEntry(eur)
  const uzsText = formatEntry(uzs)
  const tjsText = formatEntry(tjs)
  const uzsLabel = formatUnitRateLabel('UZS', uzs)
  const tjsLabel = formatUnitRateLabel('TJS', tjs)
  //  const eurUzsText = formatEntry(eurUzs)

  return {
    date: todayStr,
    usd: usdText,
    eur: eurText,
    uzs: `${uzsLabel} ${uzsText}`,
    tjs: `${tjsLabel} ${tjsText}`
  }
})

function getRateTitle(rateText) {
  return rateText.endsWith(RATE_UNAVAILABLE_MARK) ? RATE_UNAVAILABLE_MESSAGE : undefined
}

function getExchangeRatesNaturalWidth(content) {
  const items = Array.from(content.children)
  const columnGap = Number.parseFloat(window.getComputedStyle(content).columnGap) || 0
  const itemsWidth = items.reduce(
    (total, item) => total + item.getBoundingClientRect().width,
    0
  )

  return Math.max(content.scrollWidth, itemsWidth + columnGap * Math.max(items.length - 1, 0))
}

function updateAppBarHeight() {
  if (!exchangeRatesExpanded.value || !exchangeRatesOverflow.value) {
    appBarHeight.value = COLLAPSED_APP_BAR_HEIGHT
    return
  }

  appBarHeight.value = Math.max(
    COLLAPSED_APP_BAR_HEIGHT,
    exchangeRatesContent.value.scrollHeight + EXPANDED_APP_BAR_VERTICAL_PADDING
  )
}

function measureExchangeRatesOverflow() {
  const viewport = exchangeRatesViewport.value
  const content = exchangeRatesContent.value
  if (!viewport || !content || viewport.clientWidth <= 0) return

  exchangeRatesOverflow.value = getExchangeRatesNaturalWidth(content) > viewport.clientWidth + 1
  if (!exchangeRatesOverflow.value) {
    exchangeRatesExpanded.value = false
  }
  updateAppBarHeight()
}

function toggleExchangeRates() {
  if (!exchangeRatesOverflow.value) return
  exchangeRatesExpanded.value = !exchangeRatesExpanded.value
}

watch(exchangeRatesDisplay, measureExchangeRatesOverflow, { flush: 'post' })
watch(exchangeRatesExpanded, updateAppBarHeight, { flush: 'post' })

onMounted(() => {
  measureExchangeRatesOverflow()
  if (typeof globalThis.ResizeObserver === 'undefined') return

  exchangeRatesResizeObserver = new globalThis.ResizeObserver(measureExchangeRatesOverflow)
  exchangeRatesResizeObserver.observe(exchangeRatesViewport.value)
  exchangeRatesResizeObserver.observe(exchangeRatesContent.value)
})

onBeforeUnmount(() => {
  exchangeRatesResizeObserver?.disconnect()
})

import { drawer, toggleDrawer } from '@/helpers/drawer.js'

function deauth() {
  authStore.logout()
}

function getUserName() {
  return authStore.user
    ? ' | ' +
        authStore.user.lastName +
        ' ' +
        authStore.user.firstName +
        ' ' +
        authStore.user.patronymic
    : ''
}
</script>

<template>
  <v-app class="rounded rounded-md">
    <v-app-bar :height="appBarHeight">
      <template v-slot:prepend>
        <v-app-bar-nav-icon @click.stop="toggleDrawer()" color="blue-darken-2"></v-app-bar-nav-icon>
      </template>
      <v-app-bar-title class="primary-heading">Logibooks {{ getUserName() }} </v-app-bar-title>
      <v-spacer />
      <div class="exchange-rates-region">
        <div
          ref="exchangeRatesViewport"
          class="exchange-rates-viewport"
          :class="{ 'exchange-rates-viewport--expanded': exchangeRatesExpanded }"
        >
          <div
            ref="exchangeRatesContent"
            class="primary-heading exchange-rates"
            :class="{ 'exchange-rates--expanded': exchangeRatesExpanded }"
          >
            <span class="exchange-rate-item">{{ exchangeRatesDisplay.date }}</span>
            <span
              class="exchange-rate-item exchange-rate-usd font-weight-bold text-green-darken-3"
              data-testid="exchange-rate-usd"
              :title="getRateTitle(exchangeRatesDisplay.usd)"
            >USD {{ exchangeRatesDisplay.usd }}</span>
            <span
              class="exchange-rate-item exchange-rate-eur font-weight-bold text-purple-darken-2"
              data-testid="exchange-rate-eur"
              :title="getRateTitle(exchangeRatesDisplay.eur)"
            >EUR {{ exchangeRatesDisplay.eur }}</span>
            <span
              class="exchange-rate-item"
              data-testid="exchange-rate-uzs"
              :title="getRateTitle(exchangeRatesDisplay.uzs)"
            >{{ exchangeRatesDisplay.uzs }}</span>
            <span
              class="exchange-rate-item"
              data-testid="exchange-rate-tjs"
              :title="getRateTitle(exchangeRatesDisplay.tjs)"
            >{{ exchangeRatesDisplay.tjs }}</span>
          </div>
        </div>
        <v-btn
          v-if="exchangeRatesOverflow"
          class="exchange-rates-toggle"
          data-testid="exchange-rates-toggle"
          :icon="exchangeRatesExpanded ? mdiChevronUp : mdiChevronDown"
          :aria-label="exchangeRatesExpanded ? 'Свернуть курсы валют' : 'Показать все курсы валют'"
          :aria-expanded="exchangeRatesExpanded"
          density="compact"
          size="small"
          variant="text"
          @click="toggleExchangeRates"
        />
      </div>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" elevation="4">
      <template v-slot:prepend>
        <div class="pa-2" v-if="height > 480">
          <img alt="Logibooks" class="logo" src="@/assets/logo.png" />
        </div>
      </template>
      <v-list v-if="authStore.user">
        <v-list-item v-if="authStore.hasLogistRole">
          <RouterLink to="/registers" class="link">{{ paperworkRegisterNouns.plural }}</RouterLink>
        </v-list-item>
        <v-list-item v-if="authStore.hasLogistRole">
          <RouterLink to="/parcels/by-number" class="link">Посылки</RouterLink>
        </v-list-item>

        <!-- Склад -->
        <v-list-group v-if="authStore.hasWhRole">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" title="Склад"></v-list-item>
          </template>
          <v-list-item>
            <RouterLink
              :to="{ path: '/registers', query: { mode: OP_MODE_WAREHOUSE } }"
              class="link"
            >
              {{ warehouseRegisterNouns.plural }}
            </RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/scanjobs" class="link">Сканирования</RouterLink>
          </v-list-item>
        </v-list-group>

        <!-- Отчёты -->
        <v-list-item v-if="authStore.isSrLogistPlus">
          <RouterLink to="/customs-reports" class="link">Отчёты</RouterLink>
        </v-list-item>

        <!-- Пользователи -->
        <v-list-item v-if="!authStore.isAdmin">
          <RouterLink :to="'/user/edit/' + authStore.user.id" class="link">Пользователь</RouterLink>
        </v-list-item>
        <v-list-item v-if="authStore.isAdmin">
          <RouterLink to="/users" class="link">Пользователи</RouterLink>
        </v-list-item>

        <!-- Справочники -->
        <v-list-group v-if="authStore.hasLogistRole">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" title="Справочники"></v-list-item>
          </template>
          <v-list-item>
            <RouterLink to="/countries" class="link">Страны</RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/feacn/codes" class="link">Коды ТН ВЭД</RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/feacn/orders" class="link">Постановления</RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/export-fees" class="link">Сборы</RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/feacn/prefixes" class="link">Запреты по ТН ВЭД</RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/keywords" class="link">Подбор ТН ВЭД</RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/feacn/insertitems" class="link">До и После</RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/companies" class="link">Компании</RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/customsstations" class="link">Таможенные посты</RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/warehouses" class="link">Склады</RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/airports" class="link">Коды аэропортов</RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/notifications" class="link">Нотификации</RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/stopwords" class="link">Стоп-слова</RouterLink>
          </v-list-item>
        </v-list-group>

        <!-- Meta -->
        <v-list-group v-if="authStore.isShiftLeadPlus">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" title="Настройки"></v-list-item>
          </template>
          <v-list-item v-if="authStore.isAdmin">
            <RouterLink to="/parcelstatuses" class="link">Статусы посылок</RouterLink>
          </v-list-item>
          <v-list-item>
            <RouterLink to="/registerstatuses" class="link">Статусы партий</RouterLink>
          </v-list-item>
          <v-list-item v-if="authStore.isAdmin">
            <RouterLink to="/parcelsevents" class="link">События/посылки</RouterLink>
          </v-list-item>
          <v-list-item v-if="authStore.isAdmin">
            <RouterLink to="/registersevents" class="link">События/партии</RouterLink>
          </v-list-item>
          <v-list-item v-if="authStore.isAdmin">
            <RouterLink to="/hotkeyactionschemes" class="link">Клавиатура</RouterLink>
          </v-list-item>
        </v-list-group>

        <!-- Загрузки -->
        <v-list-group v-if="authStore.hasAnyRole">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" title="Скачать"></v-list-item>
          </template>
          <v-list-item v-if="authStore.hasLogistRole">
            <a
              :href="`${baseUrl}downloads/extension-latest.zip`"
              target="_blank"
              rel="noopener"
              class="link"
              >Расширение</a
            >
          </v-list-item>
          <v-list-item v-if="authStore.hasWhRole">
            <a
              :href="`${baseUrl}downloads/app-latest.apk`"
              target="_blank"
              rel="noopener"
              class="link"
              >Сканнер apk</a
            >
          </v-list-item>
          <v-list-item>
            <RouterLink to="/scanner/wd4" class="link">Настройки WD4</RouterLink>
          </v-list-item>
        </v-list-group>

        <v-list-item>
          <RouterLink to="/login" @click="deauth()" class="link">Выход</RouterLink>
        </v-list-item>
      </v-list>
      <v-list v-if="!authStore.user">
        <v-list-item>
          <RouterLink to="/login" class="link">Вход</RouterLink>
        </v-list-item>
      </v-list>
      <template v-slot:append>
        <div class="pa-2">
          <span class="primary-heading version-info"> Клиент {{ version }} </span>
          <br v-if="statusStore.coreVersion" />
          <span v-if="statusStore.coreVersion" class="primary-heading version-info">
            Сервер {{ statusStore.coreVersion }}
          </span>
          <br v-if="statusStore.dbVersion" />
          <span v-if="statusStore.dbVersion" class="primary-heading version-info">
            БД {{ statusStore.dbVersion }}
          </span>
        </div>
      </template>
    </v-navigation-drawer>

    <v-main class="app-main">
      <div class="app-page-shell">
        <RouterView />
        <PageAlertRegion fallback />
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.app-main {
  width: auto;
  max-width: 100%;
  min-width: 0;
}

.app-page-shell {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: clamp(0.75rem, 2vw, 2rem);
}

.logo {
  margin: 1rem;
  display: block;
  width: 75%;
}

.version-info {
  margin-left: 1rem;
  margin-top: 0;
  margin-bottom: 0;
  font-size: smaller;
}

.exchange-rates-region {
  align-items: center;
  display: flex;
  flex: 0 1 auto;
  min-width: 0;
  margin-right: 3rem;
}

.exchange-rates-viewport {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
}

.exchange-rates-viewport--expanded {
  overflow: visible;
}

.exchange-rates {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.75rem;
  font-size: 0.875rem;
  white-space: nowrap;
  width: 100%;
}

.exchange-rates--expanded {
  flex-wrap: wrap;
  row-gap: 0.25rem;
}

.exchange-rate-item {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
}

.exchange-rates-toggle {
  flex: 0 0 auto;
  margin-left: 0.25rem;
}

/* Make the entire menu item hoverable */
:deep(.v-list-item) {
  transition: background-color 0.2s ease-in-out;
}

:deep(.v-list-item:hover) {
  color: #eeeeee;
  background-color: var(--primary-color);
}

/* Ensure links inside list items also change color on hover */
:deep(.v-list-item:hover .link) {
  color: #eeeeee !important;
}

:deep(.v-list-item:hover a) {
  color: #eeeeee !important;
}

:deep(.v-list-item .router-link-exact-active) {
  color: var(--color-text);
}

/* Style for nested menu items */
:deep(.v-list-group__items > .v-list-item) {
  padding-inline-start: 2rem !important;
}

:deep(.v-list-group__items > .v-list-item .link) {
  font-size: 1rem;
}

/* Ensure menu group activator text matches list items */
:deep(.v-list-group__header .v-list-item-title) {
  font-size: 1.2rem !important;
  font-family: inherit !important;
  font-weight: normal !important;
  color: var(--primary-color) !important;
}

/* Make list group headers have the same hover color as list items */
:deep(.v-list-group__header:hover .v-list-item-title) {
  color: #eeeeee !important;
}

:deep(.v-list-group__header .v-list-item:hover .v-list-item-title) {
  color: #eeeeee !important;
}
</style>
