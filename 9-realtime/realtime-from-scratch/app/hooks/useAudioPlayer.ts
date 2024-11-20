import { useState, useCallback, useRef, useEffect } from "react";

interface useAudioPlayerOptions {
  bufferThreshold?: number;
  defaultFormat?: "mu-law" | "pcm-16";
}

interface useAudioPlayerReturn {
  isPlaying: boolean;
  addChunk: (base64Chunk: string, format?: "mu-law" | "pcm-16") => void;
  stop: () => void;
}

export function useAudioPlayer(
  options: useAudioPlayerOptions = {}
): useAudioPlayerReturn {
  const { defaultFormat = "pcm-16" } = options;
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const base64ToFloat32Array = (
    base64: string,
    format: "mu-law" | "pcm-16"
  ): Float32Array => {
    const binaryString = window.atob(base64);

    if (format === "mu-law") {
      const len = binaryString.length;
      const float32Array = new Float32Array(len);

      for (let i = 0; i < len; i++) {
        const ulawByte = binaryString.charCodeAt(i);
        const sample = ulawDecode(ulawByte);
        float32Array[i] = sample / 32768; // Normalize to [-1, 1]
      }

      return float32Array;
    } else if (format === "pcm-16") {
      const len = binaryString.length;
      const samples = len / 2;
      const float32Array = new Float32Array(samples);

      for (let i = 0; i < samples; i++) {
        const offset = i * 2;
        const low = binaryString.charCodeAt(offset);
        const high = binaryString.charCodeAt(offset + 1);
        // Combine the two bytes and interpret as signed 16-bit integer (little endian)
        let sample = (high << 8) | low;
        if (sample >= 0x8000) sample = sample - 0x10000; // Convert to signed
        float32Array[i] = sample / 32768; // Normalize to [-1, 1]
      }

      return float32Array;
    } else {
      throw new Error("Unsupported audio format");
    }
  };

  function ulawDecode(u_val: number): number {
    const BIAS = 0x84;
    u_val = ~u_val & 0xff;

    let t = ((u_val & 0x0f) << 3) + BIAS;
    t <<= (u_val & 0x70) >> 4;

    return (u_val & 0x80 ? BIAS - t : t - BIAS) as number;
  }

  const initAudioContext = useCallback(async (sampleRate: number) => {
    if (
      audioContextRef.current &&
      audioContextRef.current.sampleRate !== sampleRate
    ) {
      // Close existing context if sample rate has changed
      await audioContextRef.current.close();
      audioContextRef.current = null;
      workletNodeRef.current = null;
    }

    if (!audioContextRef.current) {
      console.log("Creating new AudioContext with sample rate:", sampleRate);
      audioContextRef.current = new AudioContext({ sampleRate });

      // Define your module code as a string
      const moduleCode = `
        class BufferProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.buffer = new Float32Array(0);
            this.port.onmessage = (event) => {
              const newData = event.data;
              const currentBufferLength = this.buffer.length;
              const newBuffer = new Float32Array(currentBufferLength + newData.length);
              newBuffer.set(this.buffer);
              newBuffer.set(newData, currentBufferLength);
              this.buffer = newBuffer;
            };
          }
  
          process(inputs, outputs) {
            const output = outputs[0];
            const channel = output[0];
            const bufferLength = channel.length;
  
            if (this.buffer.length >= bufferLength) {
              channel.set(this.buffer.subarray(0, bufferLength));
              this.buffer = this.buffer.subarray(bufferLength);
            } else {
              // If not enough data, fill with zeros (silence)
              channel.fill(0);
            }
  
            return true;
          }
        }
  
        registerProcessor('buffer-processor', BufferProcessor);
      `;

      // Create a Blob from the module code
      const blob = new Blob([moduleCode], { type: "application/javascript" });
      const moduleURL = URL.createObjectURL(blob);

      try {
        await audioContextRef.current.audioWorklet.addModule(moduleURL);
      } catch (error) {
        console.error("Error loading audio worklet module:", error);
      }
    }
  }, []);

  const startPlayback = useCallback(() => {
    if (!audioContextRef.current || workletNodeRef.current) return;

    const audioContext = audioContextRef.current;
    const workletNode = new AudioWorkletNode(audioContext, "buffer-processor");
    workletNode.connect(audioContext.destination);
    workletNodeRef.current = workletNode;
    setIsPlaying(true);
  }, []);

  const addChunk = useCallback(
    (base64Chunk: string, format?: "mu-law" | "pcm-16") => {
      const audioFormat = format || defaultFormat;
      const sampleRate = audioFormat === "mu-law" ? 8000 : 24000;

      initAudioContext(sampleRate).then(() => {
        const newChunk = base64ToFloat32Array(base64Chunk, audioFormat);

        if (!workletNodeRef.current) {
          startPlayback();
        }

        // Send data to the AudioWorklet for playback
        workletNodeRef.current?.port.postMessage(newChunk);
      });
    },
    [initAudioContext, startPlayback, defaultFormat]
  );

  const stop = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { isPlaying, addChunk, stop };
}
