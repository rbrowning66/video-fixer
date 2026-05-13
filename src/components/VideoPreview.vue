<script setup>
const props = defineProps({
  url: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  sizeMB: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['reset'])
</script>

<template>
  <div class="preview-card">
    <video :src="url" controls playsinline />

    <div class="preview-meta">
      <div class="preview-info">
        <div class="file-name">{{ fileName }}</div>
        <div class="file-size" :class="{ 'over-limit': sizeMB > 100 }">
          {{ sizeMB }} MB{{ sizeMB > 100 ? ' — exceeds 100 MB limit' : '' }}
        </div>
      </div>

      <div class="preview-actions">
        <a
          :href="url"
          :download="fileName"
          class="btn btn-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
          Download
        </a>
        <button class="btn btn-ghost" @click="emit('reset')">
          Convert another
        </button>
      </div>
    </div>
  </div>
</template>
