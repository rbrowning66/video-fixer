<script setup>
import { ref } from 'vue'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select'])

const isDragging = ref(false)
const fileInput = ref(null)

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (file) {
    emit('select', file)
    // Reset so the same file can be re-selected after a conversion
    e.target.value = ''
  }
}

function onDrop(e) {
  isDragging.value = false
  if (props.disabled) return
  const file = e.dataTransfer.files?.[0]
  if (file) emit('select', file)
}

function onClick() {
  if (!props.disabled) fileInput.value?.click()
}
</script>

<template>
  <div
    class="upload-area"
    :class="{ dragging: isDragging, disabled }"
    role="button"
    tabindex="0"
    aria-label="Upload video file"
    @dragover.prevent="() => { if (!disabled) isDragging = true }"
    @dragleave="isDragging = false"
    @drop.prevent="onDrop"
    @click="onClick"
    @keydown.enter.space.prevent="onClick"
  >
    <input
      ref="fileInput"
      type="file"
      accept="video/*"
      class="hidden-input"
      :disabled="disabled"
      @change="onFileChange"
    />

    <div class="upload-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="M10 9l5 3-5 3V9z"/>
      </svg>
    </div>

    <p class="upload-title">Drop a video file here</p>
    <p class="upload-sub">or click to browse — any format accepted</p>
    <p class="upload-note">Conversion speed depends on your device</p>
  </div>
</template>
