# Test Utilities

This file contains shared utilities and configurations for Vue component testing.

## Vuetify Component Stubs

The `vuetifyStubs` export provides comprehensive stub components for Vuetify components that handle common props properly. This prevents Vue warnings about missing props during testing.

### Usage

```javascript
import { vuetifyStubs } from './test-utils.js'

const wrapper = mount(YourComponent, {
  global: {
    stubs: vuetifyStubs
  }
})
```

### Available Stubs

- `v-select` - Handles props: modelValue, items, label, clearable, prefix, itemTitle, itemValue, multiple, variant, density, hideDetails
- `v-text-field` - Handles props: modelValue, label, clearable, prefix, type, variant, density, hideDetails, readonly
- `v-textarea` - Handles props: modelValue, label, rows, variant, density, hideDetails, readonly
- `v-data-table-server` - Handles props: items, headers, loading, itemsLength, itemsPerPage, page, sortBy, itemsPerPageOptions
- `v-card`, `v-card-title`, `v-card-text`, `v-card-actions`
- `v-btn` - Handles props: variant, color, size, loading, disabled, type
- `v-tooltip` - Handles props: text, location, activator
- `v-dialog` - Handles props: modelValue, width, maxWidth, persistent
- `v-row`, `v-col` - Handles layout props
- `font-awesome-icon` - Handles props: icon, size, color

All stub components include `data-testid` attributes for easier testing.

## Helper Functions

### `createMockStore(storeData)`

Creates a mock store with common patterns including default loading and error states.

### `waitForTicks(ticks = 2)`

Helper to wait for Vue's reactive updates during testing.

## Why Use These Stubs?

1. **Prevents Vue Warnings**: Proper prop handling prevents console warnings about missing props
2. **Consistent Testing**: All component tests use the same stub patterns
3. **Maintainability**: Central location for updating stub configurations
4. **Test IDs**: Built-in data-testid attributes for reliable element selection
