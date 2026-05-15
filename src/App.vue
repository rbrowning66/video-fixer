<script setup>
import { ref } from 'vue'
import FileUpload from './components/FileUpload.vue'
import VideoPreview from './components/VideoPreview.vue'
import ConvertProgress from './components/ConvertProgress.vue'
import { useFFmpeg } from './composables/useFFmpeg.js'
import logo from './assets/video-fixer-logo.png'

const { isLoaded, error, load, convertAndCompress, progress } =
  useFFmpeg()

// ── State machine: idle | loading | processing | done ──
const state = ref('idle') // 'idle' | 'loading' | 'processing' | 'done'
const result = ref(null)  // { url, fileName, sizeMB }

async function onFileSelected(file) {
  result.value = null
  error.value = null

  // Load core on first use (cached after that)
  if (!isLoaded.value) {
    state.value = 'loading'
    await load()
    if (error.value) {
      state.value = 'idle'
      return
    }
  }

  state.value = 'processing'
  const output = await convertAndCompress(file)

  if (output) {
    result.value = output
    state.value = 'done'
  } else {
    state.value = 'idle'
  }
}

function reset() {
  if (result.value?.url) {
    URL.revokeObjectURL(result.value.url)
  }
  result.value = null
  error.value = null
  state.value = 'idle'
}
</script>

<template>
  <header class="app-header">
    <img :src="logo" alt="SPLC logo" class="app-logo" />
    <h1>Video Fixer</h1>
    <p>Video file too big to upload or incompatible? We can fix it. Upload it below.</p>
  </header>

  <main>
    <!-- Upload area (always visible unless processing/done) -->
    <FileUpload
      v-if="state === 'idle'"
      @select="onFileSelected"
    />

    <ConvertProgress
      v-if="state === 'loading' || state === 'processing'"
      :phase="state === 'loading' ? 'loading' : 'processing'"
      :progress="progress"
    />

    <!-- Upload area visible but locked while busy, so user can queue next file after done -->
    <FileUpload
      v-if="state === 'done'"
      :disabled="true"
    />

    <!-- Result -->
    <VideoPreview
      v-if="state === 'done' && result"
      :url="result.url"
      :file-name="result.fileName"
      :size-m-b="result.sizeMB"
      @reset="reset"
    />

    <!-- Error banner -->
    <div v-if="error" class="error-banner" role="alert">
      {{ error }}
    </div>
  </main>
</template>
