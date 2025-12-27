/**
 * Chiptune Sound System for Heimdall Dashboard
 *
 * Sound files should be generated using jsfxr (https://sfxr.me/) with these presets:
 *
 * click.wav:     Pickup/Coin - short blip, 50ms
 *                sfxr.me URL: https://sfxr.me/#34T6PkwBbWDBnFnw6aMd6wHUvjzCUZm8qc7xNdQvqZR8xkh1GKpC4wqbZH3jxjR
 *
 * hover.wav:     Blip/Select - soft high tick, 30ms
 *                sfxr.me URL: https://sfxr.me/#34T6Pkn9dSQ8cM5YnFNdq1UQM4pxj9c8KpZmX3qR7Zv6
 *
 * success.wav:   Powerup - ascending arpeggio, 200ms
 *                sfxr.me URL: https://sfxr.me/#34T6PkvBb4F8pN3cKQMd6qH4vjpCT9m8qc7RN
 *
 * error.wav:     Hit/Hurt - descending harsh, 150ms
 *                sfxr.me URL: https://sfxr.me/#34T6PkuBbWF8cM5YnGKd6wH4v
 *
 * notification.wav: Blip/Select - two-note alert, 300ms
 *                   sfxr.me URL: https://sfxr.me/#34T6PkwBbWDBnFnw6aMd
 *
 * boot.wav:      Laser/Shoot - synth sweep, 500ms
 *                sfxr.me URL: https://sfxr.me/#34T6PkvBb4R8pN3cKQMd
 */

export type SoundType = 'click' | 'hover' | 'success' | 'error' | 'notification' | 'boot'

interface SoundConfig {
  src: string
  volume: number
  duration?: number
}

const SOUND_CONFIG: Record<SoundType, SoundConfig> = {
  click: { src: '/sounds/click.wav', volume: 0.3, duration: 50 },
  hover: { src: '/sounds/hover.wav', volume: 0.15, duration: 30 },
  success: { src: '/sounds/success.wav', volume: 0.4, duration: 200 },
  error: { src: '/sounds/error.wav', volume: 0.4, duration: 150 },
  notification: { src: '/sounds/notification.wav', volume: 0.5, duration: 300 },
  boot: { src: '/sounds/boot.wav', volume: 0.6, duration: 500 },
}

// Generate a simple 8-bit style sound using Web Audio API
function generateChiptuneSound(
  context: AudioContext,
  type: OscillatorType,
  frequency: number,
  duration: number,
  volume: number = 0.3
): AudioBuffer {
  const sampleRate = context.sampleRate
  const length = Math.floor(sampleRate * (duration / 1000))
  const buffer = context.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    let sample = 0

    // Generate waveform based on type
    switch (type) {
      case 'square':
        sample = Math.sign(Math.sin(2 * Math.PI * frequency * t))
        break
      case 'sawtooth':
        sample = 2 * ((frequency * t) % 1) - 1
        break
      case 'triangle':
        sample = 2 * Math.abs(2 * ((frequency * t) % 1) - 1) - 1
        break
      default:
        sample = Math.sin(2 * Math.PI * frequency * t)
    }

    // Apply envelope (attack-decay)
    const envelope = Math.exp(-3 * t / (duration / 1000))
    data[i] = sample * volume * envelope
  }

  return buffer
}

class SoundManager {
  private static instance: SoundManager
  private audioContext: AudioContext | null = null
  private sounds: Map<SoundType, AudioBuffer> = new Map()
  private enabled: boolean = true
  private initialized: boolean = false
  private initPromise: Promise<void> | null = null

  private constructor() {}

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager()
    }
    return SoundManager.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this._init()
    return this.initPromise
  }

  private async _init(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

      // Try to load sound files, fall back to generated sounds
      await Promise.all(
        Object.entries(SOUND_CONFIG).map(async ([key, config]) => {
          try {
            const response = await fetch(config.src)
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer()
              const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer)
              this.sounds.set(key as SoundType, audioBuffer)
            } else {
              // Generate fallback sound
              this.generateFallbackSound(key as SoundType)
            }
          } catch {
            // Generate fallback sound if file doesn't exist
            this.generateFallbackSound(key as SoundType)
          }
        })
      )

      this.initialized = true

      // Load enabled state from localStorage
      const savedState = localStorage.getItem('heimdall-sound-enabled')
      if (savedState !== null) {
        this.enabled = savedState === 'true'
      }
    } catch (error) {
      console.warn('Sound system initialization failed:', error)
    }
  }

  private generateFallbackSound(type: SoundType): void {
    if (!this.audioContext) return

    const config = SOUND_CONFIG[type]
    let buffer: AudioBuffer

    switch (type) {
      case 'click':
        buffer = generateChiptuneSound(this.audioContext, 'square', 800, 50, 0.3)
        break
      case 'hover':
        buffer = generateChiptuneSound(this.audioContext, 'square', 1200, 30, 0.15)
        break
      case 'success':
        // Create ascending arpeggio
        buffer = this.createArpeggio([523, 659, 784, 1047], 200, 0.3)
        break
      case 'error':
        buffer = generateChiptuneSound(this.audioContext, 'sawtooth', 200, 150, 0.4)
        break
      case 'notification':
        buffer = this.createArpeggio([880, 1100], 300, 0.4)
        break
      case 'boot':
        buffer = this.createSweep(200, 1000, 500, 0.5)
        break
      default:
        buffer = generateChiptuneSound(this.audioContext, 'square', 440, config.duration || 100, config.volume)
    }

    this.sounds.set(type, buffer)
  }

  private createArpeggio(frequencies: number[], duration: number, volume: number): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized')

    const sampleRate = this.audioContext.sampleRate
    const totalLength = Math.floor(sampleRate * (duration / 1000))
    const buffer = this.audioContext.createBuffer(1, totalLength, sampleRate)
    const data = buffer.getChannelData(0)
    const noteLength = totalLength / frequencies.length

    frequencies.forEach((freq, noteIndex) => {
      const startSample = Math.floor(noteIndex * noteLength)
      const endSample = Math.floor((noteIndex + 1) * noteLength)

      for (let i = startSample; i < endSample; i++) {
        const t = (i - startSample) / sampleRate
        const noteT = (i - startSample) / noteLength
        const sample = Math.sign(Math.sin(2 * Math.PI * freq * t))
        const envelope = Math.exp(-3 * noteT)
        data[i] = sample * volume * envelope
      }
    })

    return buffer
  }

  private createSweep(startFreq: number, endFreq: number, duration: number, volume: number): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized')

    const sampleRate = this.audioContext.sampleRate
    const length = Math.floor(sampleRate * (duration / 1000))
    const buffer = this.audioContext.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const progress = i / length
      const freq = startFreq + (endFreq - startFreq) * progress
      const sample = Math.sign(Math.sin(2 * Math.PI * freq * t))
      const envelope = 1 - progress * 0.5
      data[i] = sample * volume * envelope
    }

    return buffer
  }

  play(type: SoundType): void {
    if (!this.enabled || !this.audioContext || !this.initialized) return

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    const buffer = this.sounds.get(type)
    const config = SOUND_CONFIG[type]

    if (buffer) {
      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()

      source.buffer = buffer
      gainNode.gain.value = config.volume

      source.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      source.start(0)
    }
  }

  toggle(): boolean {
    this.enabled = !this.enabled
    localStorage.setItem('heimdall-sound-enabled', String(this.enabled))
    return this.enabled
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    localStorage.setItem('heimdall-sound-enabled', String(this.enabled))
  }

  isEnabled(): boolean {
    return this.enabled
  }

  isInitialized(): boolean {
    return this.initialized
  }
}

export const soundManager = SoundManager.getInstance()
