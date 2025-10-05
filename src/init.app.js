// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { createApp } from 'vue'
import { createPinia } from 'pinia'

// ------------ fontawesome --------------
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import {
  faDownload,
  faEye,
  faEyeSlash,
  faHand,
  faPen,
  faPenToSquare,
  faPlay,
  faPlus,
  faMinus,
  faTrashCan,
  faUserPlus,
  faList,
  faUpload,
  faCog,
  faBuilding,
  faCheck,
  faXmark,
  faClipboardCheck,
  faToggleOn,
  faToggleOff,
  faCheckCircle,
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
  faTruckPlane,
  faFileCirclePlus
} from '@fortawesome/free-solid-svg-icons'

library.add(
  faDownload, 
  faEye, 
  faEyeSlash, 
  faHand, 
  faPen, 
  faPenToSquare, 
  faPlay, 
  faPlus, 
  faMinus,
  faTrashCan, 
  faUserPlus, 
  faList, 
  faUpload, 
  faCog, 
  faBuilding, 
  faCheck, 
  faXmark, 
  faClipboardCheck,
  faToggleOn,
  faToggleOff,
  faCheckCircle,
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
  faTruckPlane,
  faFileCirclePlus
)

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import VuetifyUseDialog from 'vuetify-use-dialog'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { ru } from 'vuetify/locale'

import App from '@/App.vue'
import router from '@/router'

import { useAuthStore } from '@/stores/auth.store.js'
import { useFeacnOrdersStore } from '@/stores/feacn.orders.store.js'
import { useTransportationTypesStore } from '@/stores/transportation.types.store.js'
import { useCustomsProceduresStore } from '@/stores/customs.procedures.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'

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

  // Create the app instance but don't mount it yet
  const app = createApp(App)
    .component('font-awesome-icon', FontAwesomeIcon)
    .use(createPinia())
    .use(router)
    .use(vuetify)
    .use(VuetifyUseDialog)

  // Initialize global data after Pinia is set up
  const feacnOrdersStore = useFeacnOrdersStore()
  const transportationTypesStore = useTransportationTypesStore()
  const customsProceduresStore = useCustomsProceduresStore()
  const countriesStore = useCountriesStore()

  // Load FEACN orders globally at app startup
  feacnOrdersStore.ensureLoaded()
  transportationTypesStore.ensureLoaded()
  customsProceduresStore.ensureLoaded()
  countriesStore.ensureLoaded()

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
