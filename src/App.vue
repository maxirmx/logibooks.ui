<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { RouterLink, RouterView } from 'vue-router'
import { version } from '@/../package'
import { computed, onMounted } from 'vue'
import { useStatusStore } from '@/stores/status.store.js'

import { useDisplay } from 'vuetify'
const { height } = useDisplay()

import { useAuthStore } from '@/stores/auth.store.js'
const authStore = useAuthStore()

const statusStore = useStatusStore()

onMounted(() => {
  statusStore.fetchStatus().catch(() => {})
})

const ruDateFormatter = new Intl.DateTimeFormat('ru-RU')
const rateNumberFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

function formatExchangeRate(currency) {
  const rate = statusStore.exchangeRates?.find((item) => {
    const code = item?.alphabeticCode
    return code?.toUpperCase() === currency
  })

  if (!rate) {
    return ''
  }

  const parsedDate = (new Date(rate.date)).getTime()
  if (Number.isNaN(parsedDate)) {
    return ''
  }
  const formattedDate = ruDateFormatter.format(parsedDate)

  if (typeof rate.rate !== 'number') {
    return ''
  }
  const formattedRate = rateNumberFormatter.format(rate.rate)

  const datePrefix = formattedDate ? `${formattedDate} ` : ''
  return `${currency} ${datePrefix}${formattedRate}`
}

const usdExchangeRate = computed(() => formatExchangeRate('USD'))
const eurExchangeRate = computed(() => formatExchangeRate('EUR'))

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


/*
<v-list-item>
          <RouterLink to="/register" class="link">Регистрация</RouterLink>
        </v-list-item>
        <v-list-item>
          <RouterLink to="/recover" class="link">Восстановление пароля</RouterLink>
        </v-list-item>
*/

</script>

<template>
  <v-app class="rounded rounded-md">
    <v-app-bar>
      <template v-slot:prepend>
        <v-app-bar-nav-icon @click.stop="toggleDrawer()" color="blue-darken-2"></v-app-bar-nav-icon>
      </template>
      <v-app-bar-title class="primary-heading">Logibooks {{ getUserName() }} </v-app-bar-title>
      <v-spacer />
      <div class="primary-heading exchange-rates" v-if="usdExchangeRate || eurExchangeRate">
        <span v-if="usdExchangeRate">{{ usdExchangeRate }}</span>
        <span v-if="eurExchangeRate">{{ eurExchangeRate }}</span>
      </div>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" elevation="4">
      <template v-slot:prepend>
        <div class="pa-2" v-if="height > 480">
          <img alt="Logibooks" class="logo" src="@/assets/logo.png" />
        </div>
      </template>
      <v-list v-if="authStore.user">
        <v-list-item v-if="authStore.isLogist || authStore.isSrLogist">
          <RouterLink to="/registers" class="link">Реестры</RouterLink>
        </v-list-item>
        <v-list-item v-if="!authStore.isAdmin">
          <RouterLink :to="'/user/edit/' + authStore.user.id" class="link">Настройки</RouterLink>
        </v-list-item>
        <v-list-item v-if="authStore.isAdmin">
          <RouterLink to="/users" class="link">Пользователи</RouterLink>
        </v-list-item>

        <!-- Справочники -->
        <v-list-group  v-if="authStore.hasAnyRole">
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
          <RouterLink to="/airports" class="link">Коды аэропортов</RouterLink>
        </v-list-item>
        <v-list-item>
          <RouterLink to="/parcelstatuses" class="link">Статусы посылок</RouterLink>
        </v-list-item>
          <v-list-item>
            <RouterLink to="/stopwords" class="link">Стоп-слова</RouterLink>
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
          <br v-if="statusStore.coreVersion"/>
          <span v-if="statusStore.coreVersion" class="primary-heading version-info">
            Сервер {{ statusStore.coreVersion }}
          </span>
          <br v-if="statusStore.dbVersion"/>
          <span v-if="statusStore.dbVersion" class="primary-heading version-info">
            БД {{ statusStore.dbVersion }}
          </span>
        </div>
      </template>
    </v-navigation-drawer>

    <v-main class="d-flex align-center justify-center vvv">
      <RouterView />
    </v-main>
  </v-app>
</template>

<style scoped>
.vvv {
  width: 90vw;
  margin: 1rem;
  min-width: 480px;
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

.exchange-rates {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  white-space: nowrap;
  margin-right: 3rem;
}

.exchange-rates span {
  display: inline-flex;
  align-items: center;
}

nav {
  width: 100%;
  margin-top: 1.5rem;
  text-align: left;
  margin-left: 1rem;
  font-size: 1rem;
  padding: 1rem 0;
  margin-top: 1rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

/* Make the entire menu item hoverable */
:deep(.v-list-item) {
  transition: background-color 0.2s ease-in-out;
}

:deep(.v-list-item:hover) {
    color: #eeeeee;
    background-color: var(--primary-color);
}

/* Style for nested menu items */
:deep(.v-list-group .v-list-item) {
  padding-left: 2rem;
}

:deep(.v-list-group .v-list-item .link) {
  font-size: 1rem;
}



/* Ensure menu group activator text matches list items */
:deep(.v-list-group__header .v-list-item-title) {
  font-size: 1.2rem !important;
  font-family: inherit !important;
  font-weight: normal !important;
  color: var(--primary-color) !important;
}
</style>
