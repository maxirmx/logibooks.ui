// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

// I had to do it because did not work items-per-page-all="Все"
// It is not a property :(
// https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/labs/VDataTable/VDataTableFooter.tsx
// примеры https://github.com/vuetifyjs/vuetify/blob/master/packages/docs/src/examples/v-data-table/headers-multiple.vue

export const itemsPerPageOptions = [
  { value: 10, title: '10' },
  { value: 50, title: '50' },
  { value: 100, title: '100' },      /* this is the api default value, shall be kept as an option for consistency */
  { value: 500, title: '500' },
  { value: -1, title: 'Все' }
]
