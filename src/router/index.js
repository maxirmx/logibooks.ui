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
//# ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

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
      meta: { requiresAdmin: true }
    },
    {
      path: '/companies',
      name: 'Компании',
      component: () => import('@/views/Companies_View.vue'),
    },
    {
      path: '/orderstatuses',
      name: 'Статусы заказов',
      component: () => import('@/views/OrderStatuses_View.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/orderstatus/create',
      name: 'Создание статуса заказа',
      component: () => import('@/views/OrderStatus_CreateView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/orderstatus/edit/:id',
      name: 'Редактирование статуса заказа',
      component: () => import('@/views/OrderStatus_EditView.vue'),
      props: route => ({
        id: Number(route.params.id)
      }),
      meta: { requiresAdmin: true }
    },
    {
      path: '/stopwords',
      name: 'Стоп-слова',
      component: () => import('@/views/StopWords_View.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/stopword/create',
      name: 'Создание стоп-слова',
      component: () => import('@/views/StopWord_CreateView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/stopword/edit/:id',
      name: 'Редактирование стоп-слова',
      component: () => import('@/views/StopWord_EditView.vue'),
      props: route => ({
        id: Number(route.params.id)
      }),
      meta: { requiresAdmin: true }
    },
    {
      path: '/countries',
      name: 'Страны',
      component: () => import('@/views/Countries_View.vue'),
    },
    {
      path: '/registers',
      name: 'Реестры',
      component: () => import('@/views/Registers_View.vue'),
      meta: { requiresLogist: true }
    },
    {
      path: '/registers/:id/orders',
      name: 'Заказы',
      component: () => import('@/views/Orders_View.vue'),
      props: route => ({
        id: Number(route.params.id)
      }),
      meta: { requiresLogist: true }
    },
    {
      path: '/registers/:registerId/orders/edit/:id',
      name: 'Редактирование заказа',
      component: () => import('@/views/Order_EditView.vue'),
      props: route => ({
        registerId: Number(route.params.registerId),
        id: Number(route.params.id)
      }),
      meta: { requiresLogist: true }
    },
    {
      path: '/user/edit/:id',
      name: 'Настройки',
      component: () => import('@/views/User_EditView.vue'),
      props: route => ({
        id: Number(route.params.id)
      })
    },
    {
      path: '/company/create',
      name: 'Регистрация компании',
      component: () => import('@/views/Company_CreateView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/company/edit/:id',
      name: 'Изменить информацию о компании',
      component: () => import('@/views/Company_EditView.vue'),
      props: route => ({
        id: Number(route.params.id)
      }),
      meta: { requiresAdmin: true }
    }
  ]
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const alert = useAlertStore()
  alert.clear()

  if (auth.re_jwt) {
    return auth
      .re()
      .then(() => {
        return auth.re_tgt == 'register' ? '/users/' : '/user/edit/' + auth.user.id
      })
      .catch((error) => {
        router.push('/login').then(() => {
          alert.error(
            auth.re_tgt === 'register'
              ? 'Не удалось завершить регистрацию. '
              : 'Не удалось восстановить пароль. ' + error
          )
        })
      })
  }

  // (1) Route to public pages
  if (publicPages.includes(to.path)) {
    return true
  }

  // (2) No user and (implied) auth required
  if (!auth.user) {
    return routeToLogin(to, auth)
  }

  // (3) Check role-specific access using metadata
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return routeToLogin(to, auth)
  }

  if (to.meta.requiresLogist && !auth.isLogist) {
    return routeToLogin(to, auth)
  }

  // (4) Handle login page access with role-priority redirect
  if (loginPages.includes(to.path)) {
    try {
      await auth.check()
    } catch {
      return true
    }
    if (!auth.user) {
      return true
    }

    // If this is a permission redirect, don't auto-redirect based on role
    if (auth.permissionRedirect) {
      auth.permissionRedirect = false
      return true
    }

    // No need to login, redirect based on role priority
    return getHomeRoute()
  }

  // (5) Allow access to other routes
  return true
})

export default router
