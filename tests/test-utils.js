/**
 * Shared test utilities and configurations
 */

import { vi } from 'vitest'

// Comprehensive Vuetify component stubs that handle common props
export const vuetifyStubs = {
  'v-select': {
    template: '<div class="v-select-stub" data-testid="v-select"><slot></slot></div>',
    props: ['modelValue', 'items', 'label', 'clearable', 'prefix', 'itemTitle', 'itemValue', 'multiple', 'variant', 'density', 'hideDetails', 'style', 'errorMessages', 'required', 'disabled', 'placeholder'],
    inheritAttrs: false
  },
  'v-text-field': {
    template: '<label class="v-text-field-stub" data-testid="v-text-field"><span>{{ label }}</span><input /></label>',
    props: ['modelValue', 'label', 'clearable', 'prefix', 'type', 'variant', 'density', 'hideDetails', 'readonly', 'style', 'errorMessages', 'required', 'disabled', 'placeholder'],
    inheritAttrs: false,
    emits: ['input', 'update:modelValue']
  },
  'v-textarea': {
    template: '<textarea class="v-textarea-stub" data-testid="v-textarea"></textarea>',
    props: ['modelValue', 'label', 'rows', 'variant', 'density', 'hideDetails', 'readonly', 'style', 'errorMessages', 'required', 'disabled', 'placeholder'],
    inheritAttrs: false,
    emits: ['input', 'update:modelValue']
  },
  'v-data-table': {
    template: `
      <div class="v-data-table-stub" data-testid="v-data-table">
        <div v-for="(item, i) in items" :key="i" class="v-data-table-row">
          <div v-for="header in headers" :key="header.key" class="v-data-table-cell">
            <slot :name="'item.' + header.key" :item="item">
              {{ item[header.key] }}
            </slot>
          </div>
        </div>
        <slot></slot>
      </div>
    `,
    props: ['items', 'headers', 'loading', 'itemsLength', 'itemsPerPage', 'page', 'sortBy', 'itemsPerPageOptions', 'search', 'customFilter', 'density', 'style'],
    inheritAttrs: false
  },
  'v-data-table-server': {
    template: `
      <div class="v-data-table-stub" data-testid="v-data-table">
        <div v-for="(item, i) in items" :key="i" class="v-data-table-row">
          <div v-for="header in headers" :key="header.key" class="v-data-table-cell">
            <slot :name="'item.' + header.key" :item="item">
              {{ item[header.key] }}
            </slot>
          </div>
        </div>
        <slot></slot>
      </div>
    `,
    props: ['items', 'headers', 'loading', 'itemsLength', 'itemsPerPage', 'page', 'sortBy', 'itemsPerPageOptions', 'style'],
    inheritAttrs: false
  },
  'v-card': {
    template: '<div class="v-card-stub" data-testid="v-card"><slot></slot></div>',
    props: ['variant', 'elevation', 'color', 'style'],
    inheritAttrs: false
  },
  'v-card-title': {
    template: '<div class="v-card-title-stub" data-testid="v-card-title"><slot></slot></div>',
    inheritAttrs: false
  },
  'v-card-text': {
    template: '<div class="v-card-text-stub" data-testid="v-card-text"><slot></slot></div>',
    inheritAttrs: false
  },
  'v-card-actions': {
    template: '<div class="v-card-actions-stub" data-testid="v-card-actions"><slot></slot></div>',
    inheritAttrs: false
  },
  'v-btn': {
    template: '<button class="v-btn-stub" data-testid="v-btn"><slot></slot></button>',
    props: ['variant', 'color', 'size', 'loading', 'disabled', 'type', 'style'],
    inheritAttrs: false
  },
  'v-tooltip': {
    template: '<div class="v-tooltip-stub" data-testid="v-tooltip"><slot name="activator"></slot><slot></slot></div>',
    props: ['text', 'location', 'activator', 'style'],
    inheritAttrs: false
  },
  'v-dialog': {
    template: '<div class="v-dialog-stub" data-testid="v-dialog"><slot></slot></div>',
    props: ['modelValue', 'width', 'maxWidth', 'persistent', 'style'],
    inheritAttrs: false
  },
  'v-progress-circular': {
    template: '<div class="v-progress-circular-stub" data-testid="v-progress-circular">{{ modelValue }}%</div>',
    props: ['modelValue', 'size', 'width', 'color'],
    inheritAttrs: false
  },
  'v-row': {
    template: '<div class="v-row-stub" data-testid="v-row"><slot></slot></div>',
    props: ['noGutters', 'align', 'justify', 'style'],
    inheritAttrs: false
  },
  'v-col': {
    template: '<div class="v-col-stub" data-testid="v-col"><slot></slot></div>',
    props: ['cols', 'sm', 'md', 'lg', 'xl', 'style'],
    inheritAttrs: false
  },
  'v-file-input': {
    template: '<input type="file" class="v-file-input-stub" data-testid="v-file-input" />',
    props: ['modelValue', 'accept', 'multiple', 'loading-text', 'style', 'errorMessages', 'required', 'disabled'],
    inheritAttrs: false,
    emits: ['input', 'update:modelValue']
  },
  'v-form': {
    template: '<form class="v-form-stub" data-testid="v-form"><slot></slot></form>',
    props: ['modelValue', 'style'],
    inheritAttrs: false,
    emits: ['submit']
  },
  'v-divider': {
    template: '<hr class="v-divider-stub" data-testid="v-divider" />',
    props: ['color', 'inset', 'length', 'opacity', 'thickness', 'vertical', 'style'],
    inheritAttrs: false
  },
  'v-container': {
    template: '<div class="v-container-stub" data-testid="v-container"><slot></slot></div>',
    props: ['fluid', 'style'],
    inheritAttrs: false
  },
  'v-spacer': {
    template: '<div class="v-spacer-stub" data-testid="v-spacer"></div>',
    props: ['tag', 'style'],
    inheritAttrs: false
  },
  'v-alert': {
    template: `
      <div v-if="modelValue !== false" class="v-alert-stub" data-testid="v-alert">
        {{ text }}<slot></slot>
        <button v-if="closable" @click="$emit('click:close')" data-testid="alert-close">×</button>
      </div>
    `,
    props: ['type', 'text', 'variant', 'closable', 'density', 'border', 'borderColor', 'closeIcon', 'closeLabel', 'icon', 'modelValue', 'prominent', 'title', 'style'],
    emits: ['click:close', 'update:modelValue'],
    inheritAttrs: false
  },
  'v-radio-group': {
    template: '<div class="v-radio-group-stub" data-testid="v-radio-group">{{ label }}<slot></slot></div>',
    props: ['modelValue', 'errorMessages', 'label', 'disabled', 'style', 'required'],
    inheritAttrs: false,
    emits: ['input', 'update:modelValue']
  },
  'v-radio': {
    template: '<label class="v-radio-stub" data-testid="v-radio"><input type="radio" />{{ label }}</label>',
    props: ['label', 'value', 'disabled', 'style'],
    inheritAttrs: false
  },
  'font-awesome-icon': {
    template: '<i class="fa-icon-stub" data-testid="fa-icon"></i>',
    props: ['icon', 'size', 'color', 'style'],
    inheritAttrs: false
  }
}

// Default global stubs for all component tests
export const defaultGlobalStubs = {
  ...vuetifyStubs
}

/**
 * Creates a mock store with common patterns
 * @param {Object} storeData - The store data to mock
 * @returns {Object} Mock store
 */
export function createMockStore(storeData = {}) {
  return {
    loading: false,
    error: null,
    ...storeData
  }
}

/**
 * Helper to wait for Vue's reactive updates
 * @param {number} ticks - Number of ticks to wait
 */
export async function waitForTicks(ticks = 2) {
  const { nextTick } = await import('vue')
  for (let i = 0; i < ticks; i++) {
    await nextTick()
  }
}

/**
 * Creates standard mock data for testing components
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock data
 */
export function createMockData(overrides = {}) {
  return {
    loading: false,
    error: null,
    items: [],
    totalCount: 0,
    ...overrides
  }
}

/**
 * Helper to create mock store with standard patterns including storeToRefs
 * @param {Object} storeData - The store data to mock
 * @returns {Object} Mock store with storeToRefs support
 */
export function createMockStoreWithRefs(storeData = {}) {
  const store = createMockStore(storeData)
  
  return {
    ...store,
    // Mock storeToRefs behavior by returning refs for reactive properties
    $refs: () => {
      const refs = {}
      Object.keys(store).forEach(key => {
        if (typeof store[key] !== 'function') {
          refs[key] = store[key]
        }
      })
      return refs
    }
  }
}

/**
 * Mock fetch responses for testing
 * @param {*} data - Data to return from fetch
 * @param {boolean} isError - Whether to return an error
 * @returns {Function} Mock fetch function
 */
export function createMockFetch(data = {}, isError = false) {
  return vi.fn().mockImplementation(() => {
    if (isError) {
      return Promise.reject(new Error('Fetch error'))
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data))
    })
  })
}

/**
 * Helper to create mock router for testing
 * @returns {Object} Mock router
 */
export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    currentRoute: {
      value: {
        path: '/',
        params: {},
        query: {},
        name: 'home'
      }
    }
  }
}
