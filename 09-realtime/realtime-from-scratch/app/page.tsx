"use client";

import { useMicrophone } from "./hooks/useMicrophone";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import dotenv from "dotenv";
import { useRef, useCallback, useEffect } from "react";

dotenv.config();

export default function Home() {
  const wsRef = useRef<WebSocket | null>(null);

  const {
    isListening,
    startListening,
    stopListening,
    addAudioChunkHandler,
    removeAudioChunkHandler,
  } = useMicrophone();

  const { isPlaying, addChunk, stop } = useAudioPlayer();

  /// === relatime api stuff

  const handleMicrophoneChunk = useCallback(
    (chunk: string) => {
      wsRef.current?.send(
        JSON.stringify({ type: "input_audio_buffer.append", audio: chunk })
      );
    },
    [addChunk]
  );

  useEffect(() => {
    addAudioChunkHandler(handleMicrophoneChunk);
    return () => {
      removeAudioChunkHandler(handleMicrophoneChunk);
    };
  }, [handleMicrophoneChunk]);

  const connect = () => {
    console.log("Connecting...");

    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    const ws = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
      [
        "realtime",
        "openai-insecure-api-key." + apiKey,
        "openai-beta.realtime-v1",
      ]
    );

    ws.onmessage = (message) => {
      const event = JSON.parse(message.data);

      console.log(event);
      switch (event.type) {
        case "response.audio.delta":
          addChunk(event.delta);
          break;
      }
      console.log(event);
    };

    wsRef.current = ws;
  };

  const toggleMic = () => {
    console.log("Toggling mic...");
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md">
      <div className="text-lg font-semibold mb-4">Hello, World.</div>
      <button
        onClick={connect}
        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-300 ease-in-out mr-2"
      >
        Connect
      </button>
      <button
        onClick={startListening}
        className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition duration-300 ease-in-out"
      >
        Toggle mic
      </button>
    </div>
  );
}
