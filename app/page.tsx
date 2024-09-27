"use client";
import * as THREE from "three";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "ai/react";
import WavEncoder from "wav-encoder";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { Button } from "@/components/ui/button";
import { twMerge } from "tailwind-merge";
import { MessageSquareText, Mic, SendHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import Logo from "@/components/ui/logo";
import Vertex from "@/components/ui/vertex";
import CanvasAnimation from "@/components/ui/canvasAnimation";

export default function Chat() {
  const [isRecording, setIsRecording] = useState(false);
  const audioURL = useRef<string[]>([]);
  const audioURLIndex = useRef(-1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { load } = useGlobalAudioPlayer();
  const [lastPlayedMessageId, setLastPlayedMessageId] = useState<string | null>(
    null
  );

  const audioAnalyser = useRef<THREE.AudioAnalyser | null>(null);

  const waveBars = useRef<HTMLDivElement[]>([]);

  var currentText = useRef("");
  var currentCount = useRef(0);
  var lastMsg = useRef("");
  var checkpoint = useRef(10);
  let audioContext: AudioContext;
  let animationFrameId: number;

  const defaultColors = [
    "linear-gradient(135deg, #FF5733, #FFC300)",
    "linear-gradient(135deg, #33FF57, #33FFB8)",
    "linear-gradient(135deg, #3357FF, #3B9FFF)",
    "linear-gradient(135deg, #3357FF, #3B9FFF)",
    "linear-gradient(135deg, #FF33A1, #FF5B93)",
    "linear-gradient(135deg, #FFC300, #FF5733)",
  ];

  const [frequency, setFrequency] = useState<number>(20);
  const [isChatVisible, setIsChatVisible] = useState(false);

  const {
    error,
    input,
    isLoading,
    handleInputChange,
    handleSubmit,
    messages,
    reload,
    stop,
    setInput,
  } = useChat({
    keepLastMessageOnError: true,
    onFinish(message) {
      handleTTS(message.id, currentText.current);
      console.log("send: ", currentText.current);
    },
  });

  const isInputVoice = input.startsWith("<|sound_start|>");

  const playAudio = () => {
    if (audioURL.current.length > 0 && audioURLIndex.current != -1) {
      console.log("Playing: ", audioURLIndex.current);
      console.log(audioURL.current[audioURLIndex.current], "Playing");

      const listener = new THREE.AudioListener();
      const audio = new THREE.Audio(listener);
      const audioLoader = new THREE.AudioLoader();

      const analyzeFrequency = () => {
        if (audioAnalyser.current) {
          const data = audioAnalyser.current.getFrequencyData();
          console.log("Frequency Data:", data);

          // Check if data contains non-zero values
          if (data.some((value) => value > 0)) {
            const averageFrequency =
              data.reduce((sum, value) => sum + value, 0) / data.length;
            console.log("Average Frequency:", averageFrequency);
            setFrequency(averageFrequency);
          } else {
            console.log(
              "Frequency data is all zeros, indicating silence or no audio."
            );
          }

          // Call analyzeFrequency again if the audio is still playing
          if (audio.isPlaying) {
            requestAnimationFrame(analyzeFrequency);
          }
        }
      };

      load(audioURL.current[audioURLIndex.current], {
        autoplay: true,
        format: "wav",
        onload() {
          // Load the audio buffer
          audioLoader.load(
            audioURL.current[audioURLIndex.current],
            (buffer) => {
              audio.setBuffer(buffer);
              audioAnalyser.current = new THREE.AudioAnalyser(audio, 32);
              console.log(audioAnalyser.current, "audioAnalyser.current");

              // Start playing the audio
              audio.play();

              // Delay the analysis to ensure the audio is playing
              setTimeout(() => {
                analyzeFrequency();
              }, 100); // Wait 100ms before starting to analyze
            }
          );
        },
        onend: () => {
          console.log("OneEnd: ", audioURL.current.length, audioURLIndex);
          if (audioURL.current.length > audioURLIndex.current + 1) {
            audioURLIndex.current = audioURLIndex.current + 1;
            playAudio();
          } else {
            audioURL.current = [];
            audioURLIndex.current = -1;
          }
        },
      });
    }
  };

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== "assistant") return;

    const newWord = lastMsg.current
      ? lastMessage?.content.replace(lastMsg.current, "")
      : lastMessage?.content;

    const chunkSize = checkpoint.current ?? 400;
    const punctuation = [
      ".",
      ",",
      "!",
      "?",
      ":",
      ";",
      '"',
      "'",
      "(",
      ")",
      "[",
      "]",
      "{",
      "}",
      "-",
      "--",
      "...",
      "/",
      "\\",
    ];
    // console.log("send first: ", newWord, punctuation.includes(newWord),currentCount.current , checkpoint.current);
    if (currentCount.current < chunkSize) {
      currentText.current = currentText.current + newWord;
    } else if (currentCount.current < 60 && punctuation.includes(newWord)) {
      console.log("send first: ", currentText.current);
      handleTTS(lastMessage.id, currentText.current);
      checkpoint.current = 60;
      currentText.current = ""; // in case of punctuation, reset the text
      currentCount.current = 0;
    } else if (chunkSize === 10) {
      // first chunk
      currentText.current = currentText.current + newWord;
    } else {
      console.log("send: ", currentText.current);
      handleTTS(lastMessage.id, currentText.current);
      checkpoint.current = chunkSize === 60 ? 60 : 400;
      currentText.current = newWord;
      currentCount.current = 0;
    }

    currentCount.current += 1;
    lastMsg.current = lastMessage?.content;
  }, [
    messages,
    currentText,
    currentCount,
    lastMsg,
    lastPlayedMessageId,
    checkpoint,
  ]);

  const handleTTS = async (messageId: string, text: string) => {
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        body: JSON.stringify({
          text: text,
          reference_id: messageId,
          normalize: true,
          format: "wav",
          latency: "balanced",
          max_new_tokens: 2048,
          chunk_length: 200,
          repetition_penalty: 1.5,
        }),
      });
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioURL.current.push(audioUrl);
      console.log("Pushing: ", audioURL.current.length, audioUrl);
      if (audioURLIndex.current === -1) {
        console.log("Set Audio Index: ", 0);
        audioURLIndex.current = 0;
        playAudio();
      }
    } catch (error) {
      console.error("Error fetching TTS audio:", error);
    }
  };

  const startRecording = async () => {
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      audioContext = new ((window as any).AudioContext ||
        (window as any).webkitAudioContext)();
      const source = audioContext!.createMediaStreamSource(stream);

      analyser = audioContext!.createAnalyser();
      analyser.fftSize = 1024;

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log(audioContext);
        if (audioContext) {
          audioContext.close();
        }
        cancelAnimationFrame(animationFrameId);
        waveBars.current.forEach((bar, i) => {
          if (bar) {
            bar.style.height = "10px"; // Reset to default height
            bar.style.background = defaultColors[i]; // Reset color
          }
        });

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioData = await audioContext.decodeAudioData(arrayBuffer);

        const channelData = [];
        for (let i = 0; i < audioData.numberOfChannels; i++) {
          channelData.push(audioData.getChannelData(i));
        }

        const wavData = await WavEncoder.encode({
          sampleRate: audioData.sampleRate,
          channelData: channelData,
        });

        const wavBlob = new Blob([new Uint8Array(wavData)], {
          type: "audio/wav",
        });

        // const audioUrl = URL.createObjectURL(wavBlob);
        // setAudioURL(audioUrl);

        const formData = new FormData();
        formData.append("file", wavBlob, "audio.wav");

        try {
          const response = await fetch("/api/tokenize", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Failed to tokenize audio");
          }

          const data = await response.json();
          setInput(`<|sound_start|>${data.tokens}`);
        } catch (error) {
          console.error("Error tokenizing audio:", error);
        }
      };

      const animateWave = () => {
        analyser!.getByteFrequencyData(dataArray);

        // Adjust each bar height based on audio frequency data
        waveBars.current.forEach((bar, i) => {
          const value = dataArray[i];
          const barHeight = (value / 255) * 100; // Normalize to 100%
          if (bar) {
            bar.style.height = `${barHeight}px`;
            // bar.style.background = `hsl(${(value / 255) * 30}, 100%, 50%)`; // Warm color change with HSL
          }
        });

        animationFrameId = requestAnimationFrame(animateWave);
      };

      animateWave();

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset messages
    currentText.current = "";
    currentCount.current = 0;
    lastMsg.current = "";
    checkpoint.current = 10;
    audioURL.current = [];
    audioURLIndex.current = -1;
    handleSubmit(e);
  };

  useEffect(() => {
    if (isInputVoice) {
      const preventDefault = {
        preventDefault: () => {},
      } as React.FormEvent;

      handleFormSubmit(preventDefault);
    }
  }, [isInputVoice]);

  const displayInput = input.includes("<|sound_start|>")
    ? "🔊 🔊 Audio 🔊 🔊 "
    : input;

  return (
    <>
      <main className="relative p-4 h-svh bg-white">
        {/* Left Panel */}
        <div className="flex w-full h-full gap-4">
          {/* Left Panel Navbar */}
          <div className="w-20 flex h-full justify-center">
            <Logo />
          </div>

          {/* Left Panel Header */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg flex flex-col justify-between w-full overflow-hidden">
            <div className="w-full p-3 pb-0 ">
              <div className="mb-4 p-4  rounded-xl">
                <h1 className="text-xl font-bold">
                  Ichigo: checkpoint Aug 24, 2024
                </h1>
                <p className="mt-2">
                  This model is capable of multi-modality, you can input either
                  text, or voice through recording button!
                </p>
                <p className="mt-2">
                  Powered by{" "}
                  <a
                    href="https://homebrew.ltd/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Homebrew Ltd
                  </a>{" "}
                  |{" "}
                  <a
                    href="https://homebrew.ltd/blog/llama3-just-got-ears"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Read our blog post
                  </a>
                </p>
              </div>
            </div>
            {/* Left Panel Content */}
            <div className="flex justify-center  h-full p-2 border-y border-neutral-200 bg-white relative">
              {/* <CanvasAnimation frequency={frequency} /> */}

              <Vertex frequency={frequency} />
              {/* <div className="absolute w-32 h-32 bg-red-700 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div> */}
            </div>
            {/* Left Panel Footer */}
            <div className="flex justify-center p-8 bg-white">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                className="cursor-pointer"
              >
                <div className="flex gap-2 items-center">
                  <Mic size={16} />
                  <p>{isRecording ? "Stop Recording" : "Start Recording"}</p>
                </div>
              </Button>

              {/* <div className="flex gap-3 justify-center items-end w-full p-4 rounded-lg">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    ref={(el) => {
                      waveBars.current[i] = el as HTMLDivElement;
                    }}
                    className="w-2 rounded-md transition-all duration-100 ease-in-out"
                    style={{
                      height: "10px", // Initial height
                      background: defaultColors[i], // Initial gradient background
                      transition:
                        "height 0.2s ease-in-out, background 0.3s ease",
                    }}
                  />
                ))}
              </div> */}
            </div>
          </div>

          {/* Right Panel */}
          {isChatVisible && (
            <div className="bg-neutral-50 w-[480px] rounded-lg border border-neutral-200 text-black flex flex-col justify-between overflow-hidden">
              {/* Right Panel Content */}
              <div className="h-full w-full overflow-scroll bg-white pb-4">
                <div
                  className={twMerge(
                    "space-y-4 h-full p-4",
                    !messages.length && "flex justify-center items-center"
                  )}
                >
                  {!messages.length && (
                    <div className=" flex justify-center items-center flex-col">
                      <MessageSquareText
                        size={28}
                        className="mb-3 text-emerald-600"
                      />
                      <h2 className="text-xl font-semibold">No chat history</h2>
                      <p className="text-gray-600 mt-1">
                        How can I help u today?
                      </p>
                    </div>
                  )}
                  {messages.map((m) => {
                    const displayContent =
                      m.role === "user" ? (
                        m.content.startsWith("<|sound_start|>") ? (
                          <i>🔊 This is an audio message 🔊</i>
                        ) : (
                          m.content.split(" ").slice(0, 10).join(" ")
                        )
                      ) : (
                        m.content
                      );
                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-lg ${
                          m.role === "user"
                            ? "bg-primary text-white ml-auto"
                            : "bg-muted text-black"
                        } max-w-[80%]`}
                      >
                        <p className="font-semibold mb-1">
                          {m.role === "user" ? "You:" : "Ichigo:"}
                        </p>
                        <p className="whitespace-pre-wrap">{displayContent}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel Footer */}
              <div className="p-4 border-t border-neutral-200">
                <form>
                  <div className="flex justify-end gap-2">
                    <Input
                      value={displayInput}
                      placeholder="Say something..."
                      className="bg-white"
                      onChange={(e) => {
                        handleInputChange(e);
                        if (e.target.value.includes("<|sound_start|>")) {
                          setInput("This is an audio message");
                        }
                      }}
                      disabled={isLoading || error != null}
                    />
                    <Button
                      onClick={handleFormSubmit}
                      disabled={isLoading || !input.trim()}
                      className="w-9 h-9 p-0 flex-shrink-0"
                    >
                      <SendHorizontal size={16} />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
        {/* Hide Chat Button */}
        <Button
          onClick={() => setIsChatVisible(!isChatVisible)}
          className="fixed bottom-2 right-2 z-10"
        >
          <p>{isChatVisible ? "Hide Chat" : "Show Chat"}</p>
        </Button>
      </main>
    </>
  );
}
