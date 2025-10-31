<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import ActionButton from './ActionButton.vue'
import { actionButtonProps } from './actionButtonShared'

defineOptions({ inheritAttrs: false })

const menuId = `action-button-2l-menu-${Math.random().toString(36).slice(2, 10)}`

const props = defineProps({
  ...actionButtonProps,
  options: {
    type: Array,
    required: true,
    validator(options) {
      return Array.isArray(options) && options.length > 0 && options.every(option => {
        return option && typeof option.label === 'string' && typeof option.action === 'function'
      })
    }
  }
})

const emit = defineEmits(['open', 'close', 'select'])

const isMenuOpen = ref(false)
const isExecuting = ref(false)
const focusedIndex = ref(-1)
const optionRefs = ref([])
const rootRef = ref(null)

const effectiveDisabled = computed(() => props.disabled || isExecuting.value)

function resetFocus() {
  focusedIndex.value = -1
  optionRefs.value = []
}

async function focusOption(index) {
  await nextTick()
  const target = optionRefs.value[index]
  if (target) {
    target.focus()
    focusedIndex.value = index
  }
}

function setOptionRef(el, index) {
  optionRefs.value[index] = el || null
}

function firstEnabledIndex() {
  return props.options.findIndex(option => !option.disabled)
}

async function openMenu() {
  if (isMenuOpen.value || effectiveDisabled.value) {
    return
  }

  isMenuOpen.value = true
  emit('open')
  const indexToFocus = firstEnabledIndex()
  if (indexToFocus !== -1) {
    await focusOption(indexToFocus)
  }
}

function closeMenu() {
  if (!isMenuOpen.value) {
    return
  }

  isMenuOpen.value = false
  emit('close')
  resetFocus()
  nextTick(() => {
    const buttonEl = rootRef.value?.querySelector('button')
    buttonEl?.focus()
  })
}

function toggleMenu() {
  if (isMenuOpen.value) {
    closeMenu()
  } else {
    openMenu()
  }
}

function focusNext() {
  const total = props.options.length
  if (total === 0) {
    return
  }

  let index = focusedIndex.value
  for (let i = 0; i < total; i += 1) {
    index = (index + 1) % total
    if (!props.options[index].disabled) {
      focusOption(index)
      break
    }
  }
}

function focusPrevious() {
  const total = props.options.length
  if (total === 0) {
    return
  }

  let index = focusedIndex.value
  for (let i = 0; i < total; i += 1) {
    index = (index - 1 + total) % total
    if (!props.options[index].disabled) {
      focusOption(index)
      break
    }
  }
}

async function activateOption(index) {
  const option = props.options[index]
  if (!option || option.disabled || isExecuting.value) {
    return
  }

  isExecuting.value = true
  try {
    emit('select', { option, index })
    await option.action(props.item)
  } finally {
    isExecuting.value = false
    closeMenu()
  }
}

function handleButtonClick() {
  if (effectiveDisabled.value) {
    return
  }

  toggleMenu()
}

function handleOptionClick(index) {
  activateOption(index)
}

function handleKeydown(event) {
  if (effectiveDisabled.value) {
    return
  }

  if (!isMenuOpen.value) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu()
    }
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusNext()
      break
    case 'ArrowUp':
      event.preventDefault()
      focusPrevious()
      break
    case 'Enter':
      event.preventDefault()
      if (focusedIndex.value !== -1) {
        activateOption(focusedIndex.value)
      }
      break
    case 'Escape':
      event.preventDefault()
      closeMenu()
      break
    default:
      break
  }
}

watch(() => props.disabled, value => {
  if (value) {
    closeMenu()
  }
})

defineExpose({
  isMenuOpen,
  isExecuting,
  focusedIndex
})
</script>

<template>
  <div
    class="action-button-2l"
    ref="rootRef"
    @keydown.capture="handleKeydown"
  >
    <ActionButton
      :item="props.item"
      :icon="props.icon"
      :tooltip-text="props.tooltipText"
      :icon-size="props.iconSize"
      :variant="props.variant"
      :disabled="effectiveDisabled"
      aria-haspopup="menu"
      :aria-expanded="isMenuOpen"
      :aria-controls="menuId"
      @click="handleButtonClick"
      v-bind="$attrs"
    />
    <transition name="action-button-2l__fade">
      <ul
        v-if="isMenuOpen"
        class="action-button-2l__menu"
        role="menu"
        :id="menuId"
      >
        <li
          v-for="(option, index) in props.options"
          :key="option.label"
          role="none"
        >
          <button
            type="button"
            role="menuitem"
            class="action-button-2l__menu-item"
            :disabled="option.disabled || isExecuting"
            :aria-disabled="option.disabled || isExecuting"
            :tabindex="focusedIndex === index ? 0 : -1"
            :data-index="index"
            @click="handleOptionClick(index)"
            :ref="el => setOptionRef(el, index)"
          >
            {{ option.label }}
          </button>
        </li>
      </ul>
    </transition>
  </div>
</template>

<style scoped>
.action-button-2l {
  position: relative;
  display: inline-block;
}

.action-button-2l__menu {
  position: absolute;
  right: 0;
  margin-top: 20px;
  padding: 4px 0;
  list-style: none;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  z-index: 10;
  min-width: 160px;
}

.action-button-2l__menu-item {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px 16px;
  font-size: 0.9rem;
  color: #333;
  cursor: pointer;
}

.action-button-2l__menu-item:not([disabled]):not([aria-disabled="true"]):hover,
.action-button-2l__menu-item:not([disabled]):not([aria-disabled="true"]):focus {
  background-color: rgba(var(--primary-color-rgb), 0.1);
  outline: none;
}

.action-button-2l__menu-item[disabled],
.action-button-2l__menu-item[aria-disabled="true"] {
  color: rgba(0, 0, 0, 0.3);
  cursor: not-allowed;
}

.action-button-2l__fade-enter-active,
.action-button-2l__fade-leave-active {
  transition: opacity 0.1s ease;
}

.action-button-2l__fade-enter-from,
.action-button-2l__fade-leave-to {
  opacity: 0;
}
</style>
