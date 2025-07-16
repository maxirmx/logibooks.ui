/**
 * Shared test utilities and configurations
 */

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
    template: '<div class="v-data-table-stub" data-testid="v-data-table"><slot></slot></div>',
    props: ['items', 'headers', 'loading', 'itemsLength', 'itemsPerPage', 'page', 'sortBy', 'itemsPerPageOptions', 'search', 'customFilter', 'density', 'style'],
    inheritAttrs: false
  },
  'v-data-table-server': {
    template: '<div class="v-data-table-stub" data-testid="v-data-table"><slot></slot></div>',
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
    template: '<div class="v-tooltip-stub" data-testid="v-tooltip"><slot></slot></div>',
    props: ['text', 'location', 'activator', 'style'],
    inheritAttrs: false
  },
  'v-dialog': {
    template: '<div class="v-dialog-stub" data-testid="v-dialog"><slot></slot></div>',
    props: ['modelValue', 'width', 'maxWidth', 'persistent', 'style'],
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
