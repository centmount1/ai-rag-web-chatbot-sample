"use client";

import Image from "next/image";

type Emotion = "neutral" | "happy" | "thinking" | "surprised";
type Size = "sm" | "md" | "lg";

interface CharacterProps {
  emotion?: Emotion;
  size?: Size;
}

export function Character({ emotion = "neutral", size = "lg" }: CharacterProps) {
  return (
    <div className={`relative w-full h-full`}>
      <Image
        src="/dog_3d.gif"
        alt="AI Teacher Character"
        fill
        className={`object-cover ${emotion === "thinking" ? "animate-pulse" : ""}`}
        priority
      />
    </div>
  );
}
