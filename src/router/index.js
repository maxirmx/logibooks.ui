// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { getHomeRoute } from '@/helpers/login.navigation.js'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

const publicPages = ['/recover', '/register']
const loginPages = ['/login']

function routeToLogin(to, auth) {
  if (loginPages.includes(to.path)) {
    return true
  }
  auth.returnUrl = to ? to.fullPath : null
  // Set a flag to indicate this is a permission redirect
  auth.permissionRedirect = true
  return '/login'
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => getHomeRoute()
    },
    {
      path: '/login',
      name: 'Вход',
      component: () => import('@/views/User_LoginView.vue')
    },
    {
      path: '/recover',
      name: 'Восстановление пароля',
      component: () => import('@/views/User_RecoverView.vue'),
      props: true
    },
    {
      path: '/register',
      name: 'Регистрация',
      component: () => import('@/views/User_RegisterView.vue')
    },
    {
      path: '/users',
      name: 'Пользователи',
      component: () => import('@/views/Users_View.vue'),
      meta: { reqAdmin: true }
    },
    {
      path: '/companies',
      name: 'Компании',
      component: () => import('@/views/Companies_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/warehouses',
      name: 'Склады',
      component: () => import('@/views/Warehouses_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/scanjobs',
      name: 'Задания на сканирование',
      component: () => import('@/views/Scanjobs_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/notifications',
      name: 'Нотификации',
      component: () => import('@/views/Notifications_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/airports',
      name: 'Коды аэропортов',
      component: () => import('@/views/Airports_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/hotkeyactionschemes',
      name: 'Схемы действий горячих клавиш',
      component: () => import('@/views/HotKeyActionSchemes_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/company/create',
      name: 'Регистрация компании',
      component: () => import('@/views/Company_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/company/edit/:id',
      name: 'Изменить информацию о компании',
      component: () => import('@/views/Company_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/warehouse/create',
      name: 'Регистрация склада',
      component: () => import('@/views/Warehouse_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/warehouse/edit/:id',
      name: 'Изменить информацию о складе',
      component: () => import('@/views/Warehouse_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/scanjob/create',
      name: 'Создание задания на сканирование',
      component: () => import('@/views/Scanjob_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/scanjob/edit/:id',
      name: 'Редактировать задание на сканирование',
      component: () => import('@/views/Scanjob_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/notification/create',
      name: 'Создание нотификации',
      component: () => import('@/views/Notification_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/notification/edit/:id',
      name: 'Редактирование нотификации',
      component: () => import('@/views/Notification_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/airport/create',
      name: 'Регистрация кода аэропорта',
      component: () => import('@/views/Airport_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/airport/edit/:id',
      name: 'Изменить информацию о коде аэропорта',
      component: () => import('@/views/Airport_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/hotkeyactionscheme/create',
      name: 'Регистрация схемы действий горячих клавиш',
      component: () => import('@/views/HotKeyActionScheme_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/hotkeyactionscheme/edit/:id',
      name: 'Изменить информацию о схеме действий горячих клавиш',
      component: () => import('@/views/HotKeyActionScheme_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/parcelstatuses',
      name: 'Статусы посылок',
      component: () => import('@/views/ParcelStatuses_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/registerstatuses',
      name: 'Статусы реестров',
      component: () => import('@/views/RegisterStatuses_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/parceleventprocessing',
      name: 'Обработка событий посылок',
      component: () => import('@/views/ParcelEventProcessing_View.vue'),
      meta: { reqAdmin: true }
    },
    {
      path: '/parcelstatus/create',
      name: 'Регистрация статуса посылки',
      component: () => import('@/views/ParcelStatus_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/registerstatus/create',
      name: 'Регистрация статуса реестра',
      component: () => import('@/views/RegisterStatus_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/parcelstatus/edit/:id',
      name: 'Редактирование статуса посылки',
      component: () => import('@/views/ParcelStatus_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/registerstatus/edit/:id',
      name: 'Редактирование статуса реестра',
      component: () => import('@/views/RegisterStatus_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/keywords',
      name: 'Ключевые слова и фразы',
      component: () => import('@/views/KeyWords_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/keyword/create',
      name: 'Регистрация ключевого слова или фразы',
      component: () => import('@/views/KeyWord_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/keyword/edit/:id',
      name: 'Редактирование ключевого слова или фразы',
      component: () => import('@/views/KeyWord_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/stopwords',
      name: 'Стоп-слова и фразы',
      component: () => import('@/views/StopWords_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/stopword/create',
      name: 'Регистрация стоп слова или фразы',
      component: () => import('@/views/StopWord_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/stopword/edit/:id',
      name: 'Редактирование стоп слова или фразы',
      component: () => import('@/views/StopWord_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/countries',
      name: 'Страны',
      component: () => import('@/views/Countries_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/feacn/orders',
      name: 'Запреты по постановлениям',
      component: () => import('@/views/FeacnOrders_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/feacn/prefixes',
      name: 'Запреты по ТН ВЭД',
      component: () => import('@/views/FeacnLocalPrefixes_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/customs-reports',
      name: 'Отчеты о выпуске',
      component: () => import('@/views/CustomsReports_View.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/customs-reports/:id/rows',
      name: 'Строки отчёта о выпуске',
      component: () => import('@/views/CustomsReportRows_View.vue'),
      props: (route) => ({
        reportId: Number(route.params.id),
        masterInvoice: route.query.masterInvoice || ''
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/feacn/prefix/create',
      name: 'Создание префикса ТН ВЭД',
      component: () => import('@/views/FeacnLocalPrefix_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/feacn/prefix/edit/:id',
      name: 'Редактирование префикса ТН ВЭД',
      component: () => import('@/views/FeacnLocalPrefix_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/feacn/codes',
      name: 'Коды ТН ВЭД',
      component: () => import('@/views/FeacnCodes_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/feacn/insertitems',
      name: 'Правила для формирования описания продукта',
      component: () => import('@/views/FeacnInsertItems_View.vue'),
      meta: { reqAnyRole: true }
    },
    {
      path: '/feacninsertitem/create',
      name: 'Создание правила формирования описания продукта',
      component: () => import('@/views/FeacnInsertItem_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/feacninsertitem/edit/:id',
      name: 'Редактирование правила формирования описания продукта',
      component: () => import('@/views/FeacnInsertItem_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/registers',
      name: 'Реестры',
      component: () => import('@/views/Registers_View.vue'),
      props: (route) => {
        // Accept only known operation modes; default to paperwork for invalid or missing values
        const validModes = [OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE]
        const rawMode = route.query.mode
        const queryMode = typeof rawMode === 'string' ? rawMode : undefined
        const mode = validModes.includes(queryMode) ? queryMode : OP_MODE_PAPERWORK
        return { mode }
      },
      meta: { reqLogistOrSrLogist: true, hideSidebar: true }
    },
    {
      path: '/parcels/by-number',
      name: 'Посылки по номеру',
      component: () => import('@/views/ParcelsByNumber_View.vue'),
      meta: { reqLogistOrSrLogist: true }
    },
    {
      path: '/registers/:id/parcels',
      name: 'Посылки',
      component: () => import('@/views/Parcels_View.vue'),
      props: (route) => {
        const validModes = [OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE]
        const rawMode = route.query.mode
        const queryMode = typeof rawMode === 'string' ? rawMode : undefined
        const mode = validModes.includes(queryMode) ? queryMode : OP_MODE_PAPERWORK
        return { id: Number(route.params.id), mode }
      },
      meta: { reqLogistOrSrLogist: true, hideSidebar: true }
    },
    {
      path: '/registers/:registerId/parcels/edit/:id',
      name: 'Редактирование посылки',
      component: () => import('@/views/Parcel_EditView.vue'),
      props: (route) => ({
        registerId: Number(route.params.registerId),
        id: Number(route.params.id)
      }),
      meta: { reqLogistOrSrLogist: true, hideSidebar: true }
    },
    {
      path: '/register/edit/:id',
      name: 'Редактирование реестра',
      component: () => import('@/views/Register_EditView.vue'),
      props: (route) => {
        const validModes = [OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE]
        const rawMode = route.query.mode
        const queryMode = typeof rawMode === 'string' ? rawMode : undefined
        const mode = validModes.includes(queryMode) ? queryMode : OP_MODE_PAPERWORK
        return { id: Number(route.params.id), mode }
      },
      meta: { reqLogistOrSrLogist: true, hideSidebar: true }
    },
    {
      path: '/register/load',
      name: 'Загрузка реестра',
      component: () => import('@/views/Register_LoadView.vue'),
      meta: { reqLogistOrSrLogist: true, hideSidebar: true }
    },
    {
      path: '/register/:id/invoice-settings',
      name: 'Настройки инвойса',
      component: () => import('@/views/Register_InvoiceSettingsView.vue'),
      props: (route) => ({
        id: Number(route.params.id),
        selection: typeof route.query.selection === 'string' ? route.query.selection : undefined
      }),
      meta: { reqLogistOrSrLogist: true, hideSidebar: true }
    },
    {
      path: '/user/edit/:id',
      name: 'Настройки',
      component: () => import('@/views/User_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      })
    },
  ]
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const alert = useAlertStore()
  alert.clear()

  // Handle password recovery or registration completion
  if (auth.re_jwt) {
    try {
      await auth.re()
      return auth.re_tgt == 'register' ? '/users/' : '/user/edit/' + auth.user.id
    } catch (error) {
      auth.logout()
      auth.returnUrl = null
      alert.error(
        auth.re_tgt === 'register'
          ? 'Не удалось завершить регистрацию. '
          : 'Не удалось восстановить пароль. ' + error
      )
      return '/login'
    }
  }

  // Public pages are always accessible
  if (publicPages.includes(to.path)) {
    return true
  }

  // For login pages, check server availability and redirect if already logged in
  if (loginPages.includes(to.path)) {
    try {
      await auth.check()
      // User is logged in and server is available
      if (auth.user) {
        // Handle permission redirects
        if (auth.permissionRedirect) {
          auth.permissionRedirect = false
          return true
        }
        // Otherwise redirect to role-appropriate home
        return getHomeRoute()
      }
    } catch {
      // Server unavailable but it's OK for login page
    }
    // Allow access to login page if not logged in or server check failed
    return true
  }

  // For all other routes, verify authentication and permissions
  try {
    // Verify server availability and session validity
    await auth.check()
    
    // If no user after check, route to login
    if (!auth.user) {
      return routeToLogin(to, auth)
    }

    // Check role-specific permissions
    if (to.meta.reqAdminOrSrLogist && !auth.isSrLogistPlus) {
      return routeToLogin(to, auth)
    }

    if (to.meta.reqLogistOrSrLogist && !auth.hasLogistRole) {
      return routeToLogin(to, auth)
    }

    if (to.meta.reqAnyRole && !auth.hasAnyRole) {
      return routeToLogin(to, auth)
    }

    // User is authenticated and has proper permissions
    return true
  } catch (error) {
    // Server unavailable or other error
    console.error('Authentication check failed:', error)
    auth.logout()
    auth.returnUrl = to.fullPath
    alert.error('Сервер недоступен. Пожалуйста, попробуйте позже.')
    return '/login'
  }
})

export default router
