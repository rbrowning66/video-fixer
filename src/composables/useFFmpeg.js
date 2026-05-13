import { ref } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let currentDuration = 0
let startTime = 0
let hasDuration = false
const progress = ref({ percent: 0, eta: '', speed: '' })

function getDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    let resolved = false
    const done = (val) => {
      if (!resolved) {
        resolved = true
        URL.revokeObjectURL(video.src)
        resolve(val)
      }
    }
    video.onloadedmetadata = () => done(video.duration)
    video.onerror = () => done(0)              // browser can't decode
    setTimeout(() => done(0), 2000)             // timeout fallback
    video.src = URL.createObjectURL(file)
  })
}

// esm build required for Vite (not umd)
const MT_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm'
const ST_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'

// ── Singleton: one FFmpeg instance shared across all composable calls ──
const ffmpeg = new FFmpeg()
let coreLoaded = false

const isLoading = ref(false)
const isLoaded = ref(false)
const isProcessing = ref(false)
const error = ref(null)

export function useFFmpeg() {
  async function load() {

    if (coreLoaded) {
      isLoaded.value = true
      return
    }

    ffmpeg.on('log', ({ message }) => {
      console.log('[ffmpeg]', message)

      if (message.includes('frame=')) {
        if (hasDuration) {
          const t = message.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
          if (t) {
            const secs = (+t[1]) * 3600 + (+t[2]) * 60 + (+t[3]) + (+t[4]) / 100
            const pct = Math.min(99, Math.round((secs / currentDuration) * 100))

            const s = message.match(/speed=\s*([\d.]+)x/)
            let eta = ''
            if (s && +s[1] > 0) {
              const r = Math.round((currentDuration - secs) / +s[1])
              eta = r > 60 ? `${Math.floor(r / 60)}m ${r % 60}s remaining` : `${r}s remaining`
            }

            progress.value = { percent: pct, eta, speed: s ? `${s[1]}x` : '' }
          }
        } else {
          // HEVC fallback: show elapsed wall-clock time
          const elapsed = Math.round((Date.now() - startTime) / 1000)
          const display = elapsed > 60
            ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
            : `${elapsed}s`
          progress.value = { percent: 0, eta: `${display}`, speed: '' }
        }
      }
    })
    isLoading.value = true
    error.value = null
    try {
      const coreURL = await toBlobURL(`${MT_BASE_URL}/ffmpeg-core.js`, 'text/javascript')
      console.log('coreURL OK')
      const wasmURL = await toBlobURL(`${MT_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm')
      console.log('wasmURL OK')
      const workerURL = await toBlobURL(`${MT_BASE_URL}/ffmpeg-core.worker.js`, 'text/javascript')
      console.log('workerURL OK')
      await ffmpeg.load({ coreURL, wasmURL, workerURL })
      console.log('load OK')
      console.log('crossOriginIsolated:', window.crossOriginIsolated)
      console.log('FS types:', Object.keys(ffmpeg.FS?.filesystems || {}))
      coreLoaded = true
      isLoaded.value = true

    } catch (err) {
      error.value = `Failed to load ffmpeg core ${err.message}`
    } finally {
      isLoading.value = false
    }
  }

  async function convertAndCompress(file) {
    if (!coreLoaded) return null

    error.value = null
    isProcessing.value = true

    const ext = file.name.split('.').pop().toLowerCase() || 'mp4'
    const inputName = `input.${ext}`
    const outputName = 'output.mp4'

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(file))
      // Reset for this conversion
      progress.value = { percent: 0, eta: 'Starting...', speed: '' }
      // Probe duration
      const duration = await getDuration(file).catch(() => 0)
      hasDuration = duration > 0
      if (hasDuration) {
        currentDuration = duration        // used by the log handler
      } else {
        startTime = Date.now()            // for elapsed-time fallback
      }

      await ffmpeg.exec([
        '-i', inputName,
        '-vf', 'scale=-2:1080,fps=30',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '27',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-q:a', '2',
        '-threads', '2',
        outputName
      ])

      progress.value = { percent: 100, eta: 'Done', speed: '' }

      const data = await ffmpeg.readFile(outputName)
      const blob = new Blob([data.buffer], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)
      const sizeMB = parseFloat((blob.size / 1024 / 1024).toFixed(2))

      // Clean up virtual FS
      try { await ffmpeg.deleteFile(inputName) } catch { /* ignore */ }
      try { await ffmpeg.deleteFile(outputName) } catch { /* ignore */ }

      return {
        url,
        sizeMB,
        fileName: file.name.replace(/\.[^.]+$/, '') + '.mp4',
      }
    } catch (err) {
      error.value = `Conversion failed: ${err.message}`
      return null
    } finally {
      currentDuration = 0
      startTime = 0
      hasDuration = false
      isProcessing.value = false
      console.log('Processing complete')
    }
  }
  return {
    isLoading,
    isLoaded,
    isProcessing,
    error,
    progress,
    load,
    convertAndCompress,
  }
}
