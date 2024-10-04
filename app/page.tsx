"use client";

import * as THREE from "three";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "@/components/ui/navbar";
import { IoChatbubbleEllipsesSharp, IoSettingsSharp } from "react-icons/io5";
import { IoSend } from "react-icons/io5";
import { twMerge } from "tailwind-merge";
import { Input } from "@/components/ui/input";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { useChat } from "@ai-sdk/react";
import { useWindowEvent } from "@/hooks/useWindowEvent";
import { useOs } from "@/hooks/useOs";
import WavEncoder from "wav-encoder";
import { formatTime } from "@/lib/utils";
import { setTimeout } from "timers";
import { Skeleton } from "@/components/ui/skeleton";
import GradientAnimtion from "@/components/animations/gradientAnimation";

import StrawberryAnimation from "@/components/animations/strawberryAnimation";

import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai/react";
import AudioSelector from "@/components/ui/audioSelector";
import { Button } from "@/components/ui/button";
import { ModalPermissionDenied } from "@/components/ui/modalPemissionDenied";
import VertexAnimation from "@/components/animations/vertexAnimnation";

const audioVisualizerAtom = atomWithStorage("audioVisualizer", "strawberry");

const audioVisualizerList = [
  {
    id: "strawberry",
    display: "🍓",
  },
  {
    id: "gradient",
    display: "🖲️",
  },
  {
    id: "vertex",
    display: "🌐",
  },
];

const MainView = () => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isSettingVisible, setIsSettingVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [frequency, setFrequency] = useState<number>(0);
  const audioURL = useRef<string[]>([]);
  const audioURLIndex = useRef(-1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { load, stop } = useGlobalAudioPlayer();
  const audioAnalyser = useRef<THREE.AudioAnalyser | null>(null);
  const currentText = useRef("");
  const currentCount = useRef(0);
  const lastMsg = useRef("");
  const checkpoint = useRef(10);
  let audioContext: AudioContext;
  let animationFrameId: number;

  const listRef = useRef<HTMLDivElement>(null);
  const prevScrollTop = useRef(0);
  const isUserManuallyScrollingUp = useRef(false);
  const waveBars = useRef<HTMLDivElement[]>([]);
  const maxTime = 15;
  const [time, setTime] = useState(0);
  const [isStopAudio, setIsStopAudio] = useState(false);
  const [permission, setPermission] = useState<PermissionState>(); // Microphone permission state

  const [selectedAudioVisualizer, setSelectedAudioVisualizer] =
    useAtom(audioVisualizerAtom);

  const {
    input,
    isLoading,
    messages,
    handleInputChange,
    handleSubmit,
    setInput,
  } = useChat({
    keepLastMessageOnError: true,
    onFinish(message) {
      handleTTS(message.id, currentText.current);
      console.debug("send: ", currentText.current);
    },
  });

  const isInputVoice = input.startsWith("<|sound_start|>");
  const maskingValueInput = isInputVoice ? "🔊 🔊 🔊 " : input;
  const radius = 16; // Circle radius
  const circumference = 2 * Math.PI * radius; // Circumference of the circle
  const dashOffset = circumference - (time / (maxTime - 1)) * circumference;

  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        const micPermission = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        setPermission(micPermission.state as PermissionState);

        // Watch for permission changes
        micPermission.onchange = () => {
          setPermission(micPermission.state as PermissionState);
        };
      } catch (error) {
        console.error("Error checking microphone permission", error);
      }
    };

    checkMicrophonePermission();
  }, []);

  // Update the timer every second while recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      if (time < maxTime) {
        interval = setInterval(() => {
          setTime((prev) => prev + 1);
        }, 1000);
      } else {
        setIsRecording(false); // Automatically stop recording when max time is reached
      }
    }

    return () => clearInterval(interval);
  }, [isRecording, time]);

  // Send chat message
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
    // console.debug("send first: ", newWord, punctuation.includes(newWord),currentCount.current , checkpoint.current);
    if (currentCount.current < chunkSize) {
      currentText.current = currentText.current + newWord;
    } else if (currentCount.current < 60 && punctuation.includes(newWord)) {
      console.debug("send first: ", currentText.current);
      handleTTS(lastMessage.id, currentText.current);
      checkpoint.current = 60;
      currentText.current = ""; // in case of punctuation, reset the text
      currentCount.current = 0;
    } else if (chunkSize === 10) {
      // first chunk
      currentText.current = currentText.current + newWord;
    } else {
      console.debug("send: ", currentText.current);
      handleTTS(lastMessage.id, currentText.current);
      checkpoint.current = chunkSize === 60 ? 60 : 400;
      currentText.current = newWord;
      currentCount.current = 0;
    }

    currentCount.current += 1;
    lastMsg.current = lastMessage?.content;
  }, [messages]);

  // Send message when user stop record
  useEffect(() => {
    const preventDefault = {
      preventDefault: () => {},
    } as React.FormEvent;

    if (isInputVoice || time === maxTime) {
      handleFormSubmit(preventDefault);
    }
    if (time === maxTime) {
      stopRecording();
    }
  }, [isInputVoice, time]);

  const os = useOs();
  const isMac = os === "macos";

  // Make the input focus when the chat is open.
  useEffect(() => {
    if (isChatVisible && inputRef.current) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 500); // A timeout is needed because the element is invisible due to its parent, and there is a transition duration.

      return () => clearTimeout(timeoutId);
    }
  }, [isChatVisible]);

  // Hotkey toogle chatbox and record audio
  useWindowEvent("keydown", (event) => {
    const prefix = isMac ? event.metaKey : event.ctrlKey;
    if (event.code === "KeyB" && prefix) {
      setIsChatVisible(!isChatVisible);
    }

    if (event.code === "KeyE" && prefix && event.shiftKey) {
      if (isLoading) return null;
      if (isPlayingAudio) return null;
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  });

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const currentScrollTop = event.currentTarget.scrollTop;

    if (prevScrollTop.current > currentScrollTop) {
      isUserManuallyScrollingUp.current = true;
    } else {
      const currentScrollTop = event.currentTarget.scrollTop;
      const scrollHeight = event.currentTarget.scrollHeight;
      const clientHeight = event.currentTarget.clientHeight;

      if (currentScrollTop + clientHeight >= scrollHeight) {
        isUserManuallyScrollingUp.current = false;
      }
    }
    prevScrollTop.current = currentScrollTop;
  }, []);

  useEffect(() => {
    if (isUserManuallyScrollingUp.current === true || !listRef.current) return;
    const scrollHeight = listRef.current?.scrollHeight ?? 0;
    listRef.current?.scrollTo({
      top: scrollHeight,
      behavior: "instant",
    });
  }, [listRef.current?.scrollHeight, isUserManuallyScrollingUp]);

  // Play squance audio
  const playAudio = () => {
    if (audioURL.current.length > 0 && audioURLIndex.current != -1) {
      console.debug("Playing: ", audioURLIndex.current);
      console.debug(audioURL.current[audioURLIndex.current], "Playing");

      const listener = new THREE.AudioListener();
      const audio = new THREE.Audio(listener);
      const audioLoader = new THREE.AudioLoader();

      const analyzeFrequency = () => {
        if (audioAnalyser.current) {
          const data = audioAnalyser.current.getFrequencyData();
          console.debug("Frequency Data:", data);

          // Check if data contains non-zero values
          if (data.some((value) => value > 0)) {
            const averageFrequency =
              data.reduce((sum, value) => sum + value, 0) / data.length;
            console.debug("Average Frequency:", averageFrequency);
            setFrequency(averageFrequency);
          } else {
            console.debug(
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

        onplay: () => {
          audioLoader.load(
            audioURL.current[audioURLIndex.current],
            (buffer) => {
              audio.setBuffer(buffer);
              audioAnalyser.current = new THREE.AudioAnalyser(audio, 32);
              console.debug(audioAnalyser.current, "audioAnalyser.current");
              // Start playing the audio
              audio.play();
              setIsPlayingAudio(true);
              // Delay the analysis to ensure the audio is playing
              setTimeout(() => {
                analyzeFrequency();
              }, 100); // Wait 100ms before starting to analyze
            }
          );
        },

        onstop() {
          audio.stop();
          setIsPlayingAudio(false);
        },

        onend: () => {
          console.debug("OneEnd: ", audioURL.current.length, audioURLIndex);
          setIsPlayingAudio(false);
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

  // Handle get TTS API
  const handleTTS = async (messageId: string, text: string) => {
    if (!text) return;
    if (isStopAudio) return;

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
      console.debug("Pushing: ", audioURL.current.length, audioUrl);
      if (audioURLIndex.current === -1) {
        console.debug("Set Audio Index: ", 0);
        audioURLIndex.current = 0;
        playAudio();
      }
    } catch (error) {
      console.error("Error fetching TTS audio:", error);
    }
  };

  // Handle submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset messages
    currentText.current = "";
    currentCount.current = 0;
    lastMsg.current = "";
    checkpoint.current = 10;
    audioURL.current = [];
    audioURLIndex.current = -1;
    setIsStopAudio(false);
    handleSubmit(e);
  };

  // Start recording audio
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
        console.debug(audioContext);
        setIsPlayingAudio(true);
        if (audioContext) {
          audioContext.close();
        }
        cancelAnimationFrame(animationFrameId);
        waveBars.current.forEach((bar, i) => {
          if (bar) {
            bar.style.height = "10px";
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
          setIsPlayingAudio(false);
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
          }
        });

        animationFrameId = requestAnimationFrame(animateWave);
      };

      animateWave();
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsPlayingAudio(false);
    }
  };

  // stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setTimeout(() => {
        setTime(0);
      }, 500);
    }
  };

  useEffect(() => {
    if (isStopAudio) {
      currentText.current = "";
      currentCount.current = 0;
      lastMsg.current = "";
      checkpoint.current = 10;
      audioURL.current = [];
      audioURLIndex.current = -1;
      stop();
      setIsPlayingAudio(false);
    }
  }, [isStopAudio]);

  return (
    <main className="px-8 flex flex-col w-full h-svh overflow-hidden">
      {permission === "denied" && <ModalPermissionDenied />}
      <div className="flex-shrink-0">
        <Navbar />
      </div>

      <div className="h-full bg-background flex justify-center items-center relative">
        <div className="absolute top-10 left-0 flex gap-2 z-20">
          {audioVisualizerList.map((item, i) => {
            const isActive = selectedAudioVisualizer === item.id;
            return (
              <div
                key={i}
                className={twMerge(
                  "w-10 h-10 border border-border flex items-center justify-center rounded-lg cursor-pointer",
                  os !== "undetermined" &&
                    isActive &&
                    "border-2 border-blue-600"
                )}
                onClick={() => setSelectedAudioVisualizer(item.id)}
              >
                <p>{item.display}</p>
              </div>
            );
          })}
        </div>

        {os == "undetermined" ? (
          <Skeleton className="h-[300px] w-[300px] rounded-full" />
        ) : (
          <>
            {selectedAudioVisualizer === "vertex" && (
              <div className="relative top-[50px] lg:top-0 w-full h-full">
                <VertexAnimation frequency={frequency + 20} />
              </div>
            )}
            {selectedAudioVisualizer === "gradient" && (
              <GradientAnimtion frequency={frequency} isLoading={isLoading} />
            )}
            {selectedAudioVisualizer === "strawberry" && (
              <StrawberryAnimation
                frequency={frequency}
                isLoading={isLoading}
                isPlayingAudio={isPlayingAudio}
              />
            )}
          </>
        )}

        <div
          className={twMerge(
            "invisible flex flex-col overflow-x-hidden justify-between opacity-0 -right-80 w-full md:w-[400px] border border-border rounded-xl h-[calc(100%-24px)] absolute top-6 bg-background duration-500 transition-[transform, border-radius] z-40",
            isChatVisible && "visible opacity-1 right-0"
          )}
        >
          <div
            className="h-full overflow-x-hidden mt-2 mb-4"
            ref={listRef}
            onScroll={handleScroll}
          >
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
                        "px-3 py-1.5 rounded-lg max-w-[80%] shadow-sm",
                        m.role === "user"
                          ? "bg-foreground text-background ml-auto border"
                          : "border "
                      )}
                    >
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
                value={maskingValueInput}
                disabled={isPlayingAudio || isLoading}
                onClick={handleFormSubmit}
                onChange={(e) => {
                  handleInputChange(e);
                  if (e.target.value.includes("<|sound_start|>")) {
                    setInput("This is an audio message");
                  }
                }}
                type="text"
                placeholder="Type a message..."
                className="w-full h-12 p-4 border-0 border-t rounded-t-none focus-within:outline-none focus-visible:ring-0 cursor-pointer"
              />
            </div>
          </form>
        </div>
      </div>

      <div className="flex flex-shrink-0 justify-center items-center h-32 lg:h-48 relative w-full ">
        <div className="flex flex-col justify-center items-center gap-4 ">
          <div
            className={twMerge(
              "flex gap-3 justify-center items-end w-full p-4 rounded-lg absolute -top-14 h-20 invisible",
              isRecording && "visible"
            )}
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                ref={(el) => {
                  waveBars.current[i] = el as HTMLDivElement;
                }}
                className="w-2 rounded-md transition-[height] ease-in-out duration-150 bg-red-200"
                style={{
                  height: "10px", // Initial height
                }}
              />
            ))}
          </div>
          <p className={twMerge("text-xs invisible", isRecording && "visible")}>
            {formatTime(time)}
          </p>
          <div className="flex">
            {isPlayingAudio && (
              <Button
                className="absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2"
                onClick={() => setIsStopAudio(true)}
              >
                Stop Audio
              </Button>
            )}
            <div
              className={twMerge(
                "relative w-16 h-16 flex  justify-center items-center cursor-pointer",
                (isPlayingAudio || isLoading) &&
                  "pointer-events-none opacity-50"
              )}
              onClick={isRecording ? stopRecording : startRecording}
            >
              <svg
                className="absolute top-0 left-0 w-full h-full"
                viewBox="0 0 36 36"
              >
                {/* Static White Border */}
                <circle
                  className="stroke-foreground/50"
                  strokeWidth="1.5"
                  fill="transparent"
                  r={radius}
                  cx="18"
                  cy="18"
                />
                {/* Animated Stroke */}
                {isRecording && (
                  <circle
                    className="stroke-red-500 -translate-y-1/2"
                    strokeWidth="1.5"
                    fill="transparent"
                    r={radius}
                    cx="18"
                    cy="18"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{
                      transition: "stroke-dashoffset 1s linear", // Animate stroke
                      transform: "rotate(-90deg)", // Rotate to start from the top
                      transformOrigin: "50% 50%", // Set the rotation center
                    }}
                  />
                )}
              </svg>

              <div
                className={twMerge(
                  "w-9 h-9 rounded-full bg-foreground transition-all duration-300 ease-linear",
                  isRecording && "w-6 h-6 rounded-sm bg-red-500"
                )}
              />
            </div>
          </div>

          <span className="hidden md:block text-xs">
            {os === "undetermined" ? (
              <Skeleton className="h-4 w-[80px]" />
            ) : (
              <span
                className={twMerge(
                  (isPlayingAudio || isLoading) &&
                    "pointer-events-none opacity-50"
                )}
              >
                {isMac ? "⌘" : "Ctrl"} + Shift + E
              </span>
            )}
          </span>
        </div>

        <div
          className={twMerge(
            "absolute right-0 bottom-8 lg:bottom-16 transition-colors duration-500"
          )}
        >
          <div className="flex gap-4 items-center">
            <span className="hidden md:block text-xs">
              {os == "undetermined" ? (
                <Skeleton className="h-4 w-[40px]" />
              ) : (
                <>{isMac ? "⌘" : "Ctrl"} + B</>
              )}
            </span>
            <IoChatbubbleEllipsesSharp
              size={28}
              onClick={() => setIsChatVisible(!isChatVisible)}
              className={twMerge(
                "cursor-pointer",
                isChatVisible && "dark:text-blue-300 text-blue-700 "
              )}
            />
          </div>
        </div>

        {permission === "granted" && (
          <div className="absolute left-0 w-[300px] max-w-[300px] bottom-14 hidden lg:block">
            <div
              className={twMerge(
                "p-4 border border-border rounded-lg mb-2 -left-80 invisible transition-all duration-500 relative",
                isSettingVisible && "visible opacity-1 left-0"
              )}
            >
              <AudioSelector />
            </div>
            <IoSettingsSharp
              size={28}
              onClick={() => setIsSettingVisible(!isSettingVisible)}
              className={twMerge(
                "cursor-pointer",
                isSettingVisible && "dark:text-blue-300 text-blue-700 "
              )}
            />
          </div>
        )}
      </div>
    </main>
  );
};

export default MainView;
