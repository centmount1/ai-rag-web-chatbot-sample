"use client";

import { useState, useEffect, useCallback } from "react";

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const reco = new SpeechRecognition();
        reco.lang = "ja-JP";
        reco.continuous = false;
        reco.interimResults = true;

        reco.onresult = (event) => {
          const current = event.resultIndex;
          const transcriptText = event.results[current][0].transcript;
          setTranscript(transcriptText);
        };

        reco.onend = () => {
          setIsRecording(false);
        };

        setRecognition(reco);
      }
    }
  }, []);

  const startRecording = useCallback(() => {
    if (recognition) {
      setTranscript("");
      recognition.start();
      setIsRecording(true);
    }
  }, [recognition]);

  const stopRecording = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
    }
  }, [recognition]);

  return { isRecording, transcript, startRecording, stopRecording };
}

export function useSpeechSynthesis() {
  const speak = useCallback((text: string) => {
    if (typeof window !== "undefined") {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      // Try to find a cute/female voice if available
      const voices = window.speechSynthesis.getVoices();
      const cuteVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Kyoko"));
      if (cuteVoice) utterance.voice = cuteVoice;
      
      utterance.pitch = 1.2; // Slightly higher pitch for "cute" effect
      utterance.rate = 1.1;  // Slightly faster

      window.speechSynthesis.speak(utterance);
    }
  }, []);

  return { speak };
}
