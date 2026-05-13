<script setup>
defineProps({
  phase: String,    // 'loading' | 'processing'
  progress: Object  // { percent: Number, eta: String, speed: String }
})
</script>
<template>
  <div class="progress-card">
    <div class="progress-label">
      <span v-if="phase === 'loading'">Loading ffmpeg core (~31 MB)...</span>
      <span v-else-if="progress.eta">Converting... {{ progress.eta }}</span>
      <span v-else>Converting...</span>
      <span v-if="progress.speed">{{ progress.speed }}</span>
    </div>
    <div class="progress-track">
      <div
        class="progress-fill"
        :class="{ indeterminate: phase === 'loading' || progress.percent === 0 }"
        :style="phase === 'processing' && progress.percent > 0 ? { width: progress.percent + '%' } : {}"
      />
    </div>
  </div>
</template>