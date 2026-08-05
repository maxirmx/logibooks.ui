// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

// ------------ fontawesome --------------
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import {
  faEye,
  faEyeSlash,
  faPen,
  faPenToSquare,
  faPlay,
  faPlus,
  faMinus,
  faTrashCan,
  faUser,
  faUserPlus,
  faRobot,
  faList,
  faListCheck,
  faUpload,
  faCheck,
  faXmark,
  faToggleOn,
  faToggleOff,
  faCheckCircle,
  faCircleCheck,
  faCircleQuestion,
  faCircleExclamation,
  faCircleXmark,
  faTriangleExclamation,
  faArrowRotateLeft,
  faPlaneDeparture,
  faPlaneCircleCheck,
  faRoute,
  faLayerGroup,
  faGears,
  faLock,
  faFileImport,
  faFileExport,
  faCheckDouble,
  faArrowUp,
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faMagnifyingGlass,
  faSpinner,
  faSpellCheck,
  faAnchorCircleCheck,
  faCommentDollar,
  faCommentSlash,
  faCommentDots,
  faCommentNodes,
  faEllipsisVertical,
  faFileCirclePlus,
  faBookmark,
  faFileInvoice,
  faBookJournalWhills,
  faH,
  faFileImage,
  faBarcode,
  faPause,
  faBroom,
  faClone,
  faArrowDownAZ,
  faArrowUpZA,
  faArrowDown19,
  faArrowUp91,
  faRectangleList,
  faArrowsToEye,
  faBedPulse,
  faLink,
  faPersonCircleXmark,
  faPersonCircleCheck,
  faXmarksLines,
  faAnglesRight,
  faAnglesDown,
  faAnglesUp,
  faPersonWalkingArrowLoopLeft,
  faCalculator,
  faPassport,
  faCheckToSlot,
  faFileSignature,
  faClockRotateLeft
} from '@fortawesome/free-solid-svg-icons'

library.add(
  faEye,
  faEyeSlash,
  faPen,
  faPenToSquare,
  faPlay,
  faPlus,
  faMinus,
  faTrashCan,
  faUser,
  faUserPlus,
  faRobot,
  faList,
  faListCheck,
  faUpload,
  faCheck,
  faXmark,
  faToggleOn,
  faToggleOff,
  faCheckCircle,
  faCircleCheck,
  faCircleQuestion,
  faCircleExclamation,
  faCircleXmark,
  faTriangleExclamation,
  faArrowRotateLeft,
  faPlaneDeparture,
  faPlaneCircleCheck,
  faRoute,
  faLayerGroup,
  faGears,
  faLock,
  faFileImport,
  faFileExport,
  faCheckDouble,
  faArrowUp,
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faMagnifyingGlass,
  faSpinner,
  faSpellCheck,
  faAnchorCircleCheck,
  faCommentDollar,
  faCommentSlash,
  faCommentDots,
  faCommentNodes,
  faEllipsisVertical,
  faFileCirclePlus,
  faBookmark,
  faFileInvoice,
  faBookJournalWhills,
  faH,
  faFileImage,
  faBarcode,
  faPause,
  faBroom,
  faClone,
  faArrowDownAZ,
  faArrowUpZA,
  faArrowDown19,
  faArrowUp91,
  faRectangleList,
  faArrowsToEye,
  faBedPulse,
  faLink,
  faPersonCircleXmark,
  faPersonCircleCheck,
  faXmarksLines,
  faAnglesRight,
  faAnglesDown,
  faAnglesUp,
  faPersonWalkingArrowLoopLeft,
  faCalculator,
  faPassport,
  faCheckToSlot,
  faFileSignature,
  faClockRotateLeft
)

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import VuetifyUseDialog from 'vuetify-use-dialog'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { ru } from 'vuetify/locale'

import App from '@/App.vue'
import router from '@/router'

import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { reportError } from '@/helpers/error.helpers.js'

let globalErrorHandlersInstalled = false
const UNEXPECTED_ERROR_MESSAGE = 'Произошла непредвиденная ошибка. Обновите страницу и повторите попытку.'

function publishUnexpectedError(error, context) {
  reportError(error, { context })
  useAlertStore().error(UNEXPECTED_ERROR_MESSAGE)
}

export function installGlobalErrorHandlers(app) {
  app.config.errorHandler = (error, _instance, info) => {
    publishUnexpectedError(error, `Vue: ${info || 'component error'}`)
  }

  if (globalErrorHandlersInstalled) return
  globalErrorHandlersInstalled = true
  window.addEventListener('unhandledrejection', (event) => {
    publishUnexpectedError(event.reason, 'Unhandled promise rejection')
  })
}

export function initializeApp() {
  // Create custom Russian translations with missing keys
  const customRu = {
    ...ru,
    input: {
      ...ru.input,
      prependAction: 'Действие в начале',
      clear: 'Очистить'
    },
    dataIterator: {
      ...ru.dataIterator,
      loadingText: 'Загрузка данных...'
    },
    open: 'Открыть',
    pagination: {
      ...ru.pagination,
      ariaLabel: {
        ...ru.pagination?.ariaLabel,
        root: 'Навигация по страницам'
      }
    },
    dataFooter: {
      ...ru.dataFooter,
      firstPage: 'Первая страница',
      prevPage: 'Предыдущая страница',
      nextPage: 'Следующая страница',
      lastPage: 'Последняя страница'
    }
  }

  const vuetify = createVuetify({
    locale: {
      locale: 'ru',
      fallback: 'en',
      messages: { ru: customRu }
    },
    breakpoint: {
      mobileBreakpoint: 'xl' // This is the breakpoint for mobile devices
    },
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: {
        mdi
        //      fa,
      }
    }
  })

  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)

  // Create the app instance but don't mount it yet
  const app = createApp(App)
    .component('font-awesome-icon', FontAwesomeIcon)
    .use(pinia)
    .use(router)
    .use(vuetify)
    .use(VuetifyUseDialog)

  installGlobalErrorHandlers(app)

  const queryString = window.location.search
  const urlParams = new URLSearchParams(queryString)

  var jwt = null
  var tgt = null

  if (urlParams.has('recover')) {
    jwt = urlParams.get('recover')
    tgt = 'recover'
  } else if (urlParams.has('register')) {
    jwt = urlParams.get('register')
    tgt = 'register'
  }

  if (jwt) {
    const authStore = useAuthStore()
    authStore.re_jwt = jwt
    authStore.re_tgt = tgt
  }

  // Mount the app now that config is already loaded
  app.mount('#app')
}
