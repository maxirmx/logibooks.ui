/**
 * Shared test utilities and configurations
 */

// Comprehensive Vuetify component stubs that handle common props
export const vuetifyStubs = {
  'v-select': {
    template: '<div class="v-select-stub" data-testid="v-select"><slot></slot></div>',
    props: ['modelValue', 'items', 'label', 'clearable', 'prefix', 'itemTitle', 'itemValue', 'multiple', 'variant', 'density', 'hideDetails']
  },
  'v-text-field': {
    template: '<input class="v-text-field-stub" data-testid="v-text-field" />',
    props: ['modelValue', 'label', 'clearable', 'prefix', 'type', 'variant', 'density', 'hideDetails', 'readonly']
  },
  'v-textarea': {
    template: '<textarea class="v-textarea-stub" data-testid="v-textarea"></textarea>',
    props: ['modelValue', 'label', 'rows', 'variant', 'density', 'hideDetails', 'readonly']
  },
  'v-data-table-server': {
    template: '<div class="v-data-table-stub" data-testid="v-data-table"><slot></slot></div>',
    props: ['items', 'headers', 'loading', 'itemsLength', 'itemsPerPage', 'page', 'sortBy', 'itemsPerPageOptions']
  },
  'v-card': {
    template: '<div class="v-card-stub" data-testid="v-card"><slot></slot></div>',
    props: ['variant', 'elevation', 'color']
  },
  'v-card-title': {
    template: '<div class="v-card-title-stub" data-testid="v-card-title"><slot></slot></div>'
  },
  'v-card-text': {
    template: '<div class="v-card-text-stub" data-testid="v-card-text"><slot></slot></div>'
  },
  'v-card-actions': {
    template: '<div class="v-card-actions-stub" data-testid="v-card-actions"><slot></slot></div>'
  },
  'v-btn': {
    template: '<button class="v-btn-stub" data-testid="v-btn"><slot></slot></button>',
    props: ['variant', 'color', 'size', 'loading', 'disabled', 'type']
  },
  'v-tooltip': {
    template: '<div class="v-tooltip-stub" data-testid="v-tooltip"><slot></slot></div>',
    props: ['text', 'location', 'activator']
  },
  'v-dialog': {
    template: '<div class="v-dialog-stub" data-testid="v-dialog"><slot></slot></div>',
    props: ['modelValue', 'width', 'maxWidth', 'persistent']
  },
  'v-row': {
    template: '<div class="v-row-stub" data-testid="v-row"><slot></slot></div>',
    props: ['noGutters', 'align', 'justify']
  },
  'v-col': {
    template: '<div class="v-col-stub" data-testid="v-col"><slot></slot></div>',
    props: ['cols', 'sm', 'md', 'lg', 'xl']
  },
  'font-awesome-icon': {
    template: '<i class="fa-icon-stub" data-testid="fa-icon"></i>',
    props: ['icon', 'size', 'color']
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
