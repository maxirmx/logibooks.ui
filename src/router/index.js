// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { getHomeRoute } from '@/helpers/login.navigation.js'

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
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/companies',
      name: 'Компании',
      component: () => import('@/views/Companies_View.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/parcelstatuses',
      name: 'Статусы посылок',
      component: () => import('@/views/ParcelStatuses_View.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/parcelstatus/create',
      name: 'Регистрация статуса посылки',
      component: () => import('@/views/ParcelStatus_CreateView.vue'),
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
      path: '/keywords',
      name: 'Ключевые слова и фразы',
      component: () => import('@/views/KeyWords_View.vue'),
      meta: { reqAdminOrSrLogist: true }
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
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/stopword/create',
      name: 'Регистрация стоп-слова или фразы',
      component: () => import('@/views/StopWord_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/stopword/edit/:id',
      name: 'Редактирование стоп-слова или фразы',
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
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/feacn/orders',
      name: 'Запреты по постановлениям',
      component: () => import('@/views/FeacnOrders_View.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/feacn/prefixes',
      name: 'Запреты по ТН ВЭД',
      component: () => import('@/views/FeacnPrefixes_View.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/feacn/prefix/create',
      name: 'Создание префикса ТН ВЭД',
      component: () => import('@/views/FeacnPrefix_CreateView.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/feacn/prefix/edit/:id',
      name: 'Редактирование префикса ТН ВЭД',
      component: () => import('@/views/FeacnPrefix_EditView.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/feacn/codes',
      name: 'Коды ТН ВЭД',
      component: () => import('@/views/FeacnCodes_View.vue'),
      meta: { reqAdminOrSrLogist: true }
    },
    {
      path: '/feacn/insertitems',
      name: 'Правила для формирования описания продукта',
      component: () => import('@/views/FeacnInsertItems_View.vue'),
      meta: { reqAdminOrSrLogist: true }
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
      meta: { reqLogistOrSrLogist: true, hideSidebar: true }
    },
    {
      path: '/registers/:id/parcels',
      name: 'Посылки',
      component: () => import('@/views/Parcels_View.vue'),
      props: (route) => ({
        id: Number(route.params.id)
      }),
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
      props: (route) => ({ id: Number(route.params.id) }),
      meta: { reqLogistOrSrLogist: true, hideSidebar: true }
    },
    {
      path: '/register/load',
      name: 'Загрузка реестра',
      component: () => import('@/views/Register_LoadView.vue'),
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
    }
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
    if (to.meta.reqAdminOrSrLogist && !auth.isAdminOrSrLogist) {
      return routeToLogin(to, auth)
    }

    if (to.meta.reqLogistOrSrLogist && !auth.isLogistOrSrLogist) {
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
