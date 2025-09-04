import { useState, useCallback, useRef, useEffect } from "react";

interface UseMicrophoneOptions {
  chunkSize?: number;
  targetSampleRate?: number;
}

type AudioChunkHandler = (chunk: string) => void;

interface UseMicrophoneReturn {
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  addAudioChunkHandler: (handler: AudioChunkHandler) => void;
  removeAudioChunkHandler: (handler: AudioChunkHandler) => void;
}

export function useMicrophone({
  chunkSize = 4096,
  targetSampleRate = 24000,
}: UseMicrophoneOptions = {}): UseMicrophoneReturn {
  const [isListening, setIsListening] = useState<boolean>(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const handlersRef = useRef<Set<AudioChunkHandler>>(new Set());

  const downsample = (
    inputBuffer: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number
  ): Float32Array => {
    if (inputSampleRate === outputSampleRate) {
      return inputBuffer;
    }
    const ratio = inputSampleRate / outputSampleRate;
    const outputLength = Math.round(inputBuffer.length / ratio);
    const result = new Float32Array(outputLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0,
        count = 0;
      for (
        let i = offsetBuffer;
        i < nextOffsetBuffer && i < inputBuffer.length;
        i++
      ) {
        accum += inputBuffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  const processAudioChunk = (
    inputBuffer: Float32Array,
    sampleRate: number
  ): string => {
    const downsampledBuffer = downsample(
      inputBuffer,
      sampleRate,
      targetSampleRate
    );
    const output = new Int16Array(downsampledBuffer.length);

    for (let i = 0; i < downsampledBuffer.length; i++) {
      const s = Math.max(-1, Math.min(1, downsampledBuffer[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    const uint8Array = new Uint8Array(output.buffer);
    return btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
  };

  const startListening = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);

      const processor = audioContextRef.current.createScriptProcessor(
        chunkSize,
        1,
        1
      );
      processorRef.current = processor;

      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        const inputBuffer = event.inputBuffer.getChannelData(0);
        const base64Chunk = processAudioChunk(
          inputBuffer,
          audioContextRef.current!.sampleRate
        );
        handlersRef.current.forEach((handler) => handler(base64Chunk));
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      setIsListening(true);
    } catch (error) {
      console.error("Error starting microphone:", error);
    }
  }, [chunkSize, targetSampleRate]);

  const stopListening = useCallback((): void => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (processorRef.current && audioContextRef.current) {
      processorRef.current.disconnect();
      audioContextRef.current.close();
    }
    setIsListening(false);
  }, []);

  const addAudioChunkHandler = useCallback(
    (handler: AudioChunkHandler): void => {
      handlersRef.current.add(handler);
    },
    []
  );

  const removeAudioChunkHandler = useCallback(
    (handler: AudioChunkHandler): void => {
      handlersRef.current.delete(handler);
    },
    []
  );

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    startListening,
    stopListening,
    addAudioChunkHandler,
    removeAudioChunkHandler,
  };
}
