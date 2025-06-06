// VAD Audio Worklet Processor
class VADProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.silenceThreshold = -45; // dB
    this.speechThreshold = -30; // dB
    this.silenceDuration = 800; // ms
    this.isSpeaking = false;
    this.silenceStart = 0;
    this.speechStart = 0;
    this.sampleRate = 16000;
    
    // Receive configuration from main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'config') {
        Object.assign(this, event.data.config);
      }
    };
  }

  calculateRMS(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  calculateDB(rms) {
    return 20 * Math.log10(rms);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const samples = input[0];
    const rms = this.calculateRMS(samples);
    const db = this.calculateDB(rms);

    // Send audio level to main thread
    this.port.postMessage({
      type: 'audioLevel',
      level: Math.min(100, Math.max(0, (db + 60) * 1.67)) // Normalize to 0-100
    });

    // Speech detection logic
    if (db > this.speechThreshold && !this.isSpeaking) {
      this.isSpeaking = true;
      this.speechStart = currentTime;
      this.port.postMessage({ type: 'speechStart' });
    } else if (db < this.silenceThreshold && this.isSpeaking) {
      if (this.silenceStart === 0) {
        this.silenceStart = currentTime;
      } else if ((currentTime - this.silenceStart) * 1000 > this.silenceDuration) {
        this.isSpeaking = false;
        this.silenceStart = 0;
        
        // Extract speech segment
        const speechDuration = currentTime - this.speechStart;
        this.port.postMessage({
          type: 'speechEnd',
          duration: speechDuration * 1000,
          samples: samples
        });
      }
    } else if (db > this.silenceThreshold) {
      this.silenceStart = 0;
    }

    // Pass through audio
    if (outputs[0] && outputs[0][0]) {
      outputs[0][0].set(samples);
    }

    return true;
  }
}

registerProcessor('vad-processor', VADProcessor);