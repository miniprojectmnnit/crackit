/**
 * AudioPlayer — Plays PCM audio chunks from Gemini Live API.
 *
 * Gemini returns base64-encoded 16-bit little-endian PCM at 24kHz.
 * This class decodes and queues audio buffers for gapless playback.
 */

export class AudioPlayer {
  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
    this.audioContext = null;
    this.nextStartTime = 0;
    this.isPlaying = false;
    this._scheduledSources = [];
  }

  _ensureContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    }
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Decode a base64-encoded PCM16 chunk and schedule it for playback.
   */
  playChunk(base64Pcm) {
    this._ensureContext();
    this.isPlaying = true;

    // Decode base64 → raw bytes
    const binaryStr = atob(base64Pcm);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Convert 16-bit LE PCM → Float32
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    // Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(1, float32.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32);

    // Schedule playback
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    const startTime = Math.max(now, this.nextStartTime);

    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;

    this._scheduledSources.push(source);

    // Cleanup reference when done
    source.onended = () => {
      this._scheduledSources = this._scheduledSources.filter(s => s !== source);
      if (this._scheduledSources.length === 0) {
        this.isPlaying = false;
      }
    };
  }

  /**
   * Stop all scheduled audio immediately (for barge-in / skip).
   */
  stop() {
    for (const source of this._scheduledSources) {
      try { source.stop(); } catch (e) { /* already stopped */ }
    }
    this._scheduledSources = [];
    this.nextStartTime = 0;
    this.isPlaying = false;
  }

  /**
   * Clean up AudioContext.
   */
  destroy() {
    this.stop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
  }
}
