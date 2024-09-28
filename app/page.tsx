"use client";

import * as THREE from "three";
import React, { useEffect, useRef, useState } from "react";
import BlobAnimation from "@/components/animations/blobAnimation";
import Navbar from "@/components/ui/navbar";
import { IoChatbubbleEllipsesSharp } from "react-icons/io5";
import { IoSend } from "react-icons/io5";
import { twMerge } from "tailwind-merge";
import { Input } from "@/components/ui/input";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { useChat } from "@ai-sdk/react";

const MainView = () => {
  const [isChatVisible, setIsChatVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [frequency, setFrequency] = useState<number>(20);
  const audioURL = useRef<string[]>([]);
  const audioURLIndex = useRef(-1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { load } = useGlobalAudioPlayer();
  const [lastPlayedMessageId, setLastPlayedMessageId] = useState<string | null>(
    null
  );
  const audioAnalyser = useRef<THREE.AudioAnalyser | null>(null);
  const currentText = useRef("");
  const currentCount = useRef(0);
  const lastMsg = useRef("");
  const checkpoint = useRef(10);
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
  const displayInput = isInputVoice ? "🔊 🔊  🔊 " : input;

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

  useEffect(() => {
    if (isInputVoice) {
      const preventDefault = {
        preventDefault: () => {},
      } as React.FormEvent;

      handleFormSubmit(preventDefault);
    }
  }, [isInputVoice]);

  // Make the input focus when the chat is open.
  useEffect(() => {
    if (isChatVisible && inputRef.current) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 500); // A timeout is needed because the element is invisible due to its parent, and there is a transition duration.

      return () => clearTimeout(timeoutId);
    }
  }, [isChatVisible]);

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

  return (
    <main className="px-8 flex flex-col w-full h-svh overflow-hidden">
      <div className="flex-shrink-0">
        <Navbar />
      </div>
      <div className="h-full bg-background flex justify-center items-center relative">
        <BlobAnimation frequency={frequency} />
        <div
          className={twMerge(
            "invisible flex flex-col overflow-x-hidden justify-between opacity-0 -right-80 w-full md:w-[400px] border border-border rounded-xl h-[calc(100%-24px)] absolute top-6 bg-background duration-500 transition-[transform, border-radius]",
            isChatVisible && "visible opacity-1 right-0"
          )}
        >
          <div className="h-full overflow-x-hidden mt-2 mb-4">
            <div
              className={twMerge(
                "space-y-4 h-full p-4",
                !messages.length && "flex justify-center items-center"
              )}
            >
              {!messages.length && (
                <div className=" flex justify-center items-center flex-col w-full">
                  <h2 className="text-xl font-semibold">No chat history</h2>
                  <p className="mt-1 text-muted-foreground">
                    How can I help u today?
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-4 overflow-x-hidden">
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
                      className={twMerge(
                        "px-3 py-2 rounded-lg max-w-[80%]",
                        m.role === "user" ? "ml-auto border" : "border"
                      )}
                    >
                      {/* <p className="font-semibold mb-1">
                        {m.role === "user" ? "You:" : "Ichigo:"}
                      </p> */}
                      <p className="whitespace-pre-wrap">{displayContent}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <form onSubmit={handleFormSubmit}>
            <div className="relative">
              <IoSend
                size={20}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
              />
              <Input
                ref={inputRef}
                value={displayInput}
                onChange={(e) => {
                  handleInputChange(e);
                  if (e.target.value.includes("<|sound_start|>")) {
                    setInput("This is an audio message");
                  }
                }}
                type="text"
                placeholder="Type a message..."
                className="w-full h-12 p-4 border-0 border-t rounded-t-none focus-within:outline-none focus-visible:ring-0"
              />
            </div>
          </form>
        </div>
      </div>
      <div className="flex flex-shrink-0 justify-center items-center h-32 relative w-full">
        <div className="relative w-16 h-16 flex  justify-center items-center cursor-pointer">
          <div className="absolute top-0 left-0 bg-transparent border-2 border-foreground w-full h-full rounded-full"></div>
          <div className="w-10 h-10 rounded-full bg-foreground" />
        </div>

        <div
          className={twMerge(
            "absolute right-0 cursor-pointer transition-colors duration-500",
            isChatVisible && "dark:text-blue-300 text-blue-700"
          )}
          onClick={() => setIsChatVisible(!isChatVisible)}
        >
          <IoChatbubbleEllipsesSharp size={28} />
        </div>
      </div>
    </main>
  );
};

export default MainView;
