"use client";

import { useState } from "react";
import { getRandomQuestion } from "@/lib/questions";

export default function QuestionRandomizer() {
  const [question, setQuestion] = useState<string | null>(null);

  function handleClick() {
    setQuestion((prev) => getRandomQuestion(prev ?? undefined));
  }

  return (
    <button
      onClick={handleClick}
      className={`text-left py-2.5 text-sm font-medium border border-[#7C5CBF]/40 transition-colors hover:bg-[#7C5CBF]/20 ${question ? "w-full" : "inline-flex"}`}
      style={{
        paddingLeft: "24px",
        paddingRight: "24px",
        background:
          "linear-gradient(135deg, rgba(124,92,191,0.15) 0%, rgba(160,125,224,0.10) 100%)",
        color: question ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.80)",
        borderRadius: question ? "16px" : "100px",
      }}
    >
      {question ?? "Zainspiruj mnie"}
    </button>
  );
}
