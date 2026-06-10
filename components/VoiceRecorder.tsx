"use client";

import { Mic, Square } from "lucide-react";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceRecorder({ onTranscript }: VoiceRecorderProps) {
  const { isRecording, elapsed, toast, toggle } = useSpeechRecognition(onTranscript);

  return (
    <>
      <div className="flex items-center gap-2">
        {isRecording && (
          <div
            className="px-3 py-1.5 rounded-full text-xs font-medium text-white border border-white/10"
            style={{ background: "rgba(17,14,36,0.85)", backdropFilter: "blur(8px)" }}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-2 echo-pulse-dot" />
            {formatDuration(elapsed)}
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={isRecording ? "Zatrzymaj nagrywanie" : "Nagraj notatkę głosową"}
          className={`flex items-center justify-center w-11 h-11 rounded-full transition-all active:scale-95 ${
            isRecording ? "echo-pulse-ring" : ""
          }`}
          style={{
            background: isRecording
              ? "linear-gradient(135deg, #C0392B 0%, #E74C3C 100%)"
              : "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)",
            boxShadow: "0 8px 22px rgba(124,92,191,0.45)",
          }}
        >
          {isRecording ? (
            <Square size={16} className="text-white" fill="white" />
          ) : (
            <Mic size={18} className="text-white" />
          )}
        </button>
      </div>

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm text-white border border-white/10"
          style={{
            bottom: "120px",
            background: "rgba(17,14,36,0.92)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
