"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  className?: string;
  encryptedClassName?: string;
  animateOn?: "hover" | "view" | "load";
  characters?: string;
  useOriginalCharsOnly?: boolean;
  revealDirection?: "start" | "end" | "center";
}

export default function DecryptedText({
  text,
  speed = 60,
  maxIterations = 15,
  sequential = false,
  className = "",
  encryptedClassName = "",
  animateOn = "hover",
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?",
  useOriginalCharsOnly = false,
  revealDirection = "start",
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const getRandomChar = () => {
    if (useOriginalCharsOnly) {
      const uniqueChars = Array.from(new Set(text.split("")));
      return uniqueChars[Math.floor(Math.random() * uniqueChars.length)];
    }
    return characters[Math.floor(Math.random() * characters.length)];
  };

  const getRevealOrder = (length: number) => {
    const indices = Array.from({ length }, (_, i) => i);
    
    switch (revealDirection) {
      case "end":
        return [...indices].reverse();
      case "center": {
        const center = Math.floor(length / 2);
        const result: number[] = [];
        if (length > 0) {
          result.push(center);
        }
        for (let i = 1; i < length; i++) {
          if (center - i >= 0) result.push(center - i);
          if (center + i < length) result.push(center + i);
        }
        return result;
      }
      default:
        return indices;
    }
  };

  const animate = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    const textArray = text.split("");
    const revealOrder = sequential ? getRevealOrder(textArray.length) : [];
  let iterations = 0;
  const revealedIndices = new Set<number>();

    const interval = setInterval(() => {
      setDisplayText((prev) => {
        return prev
          .split("")
          .map((char, index) => {
            if (sequential) {
              // Sequential mode: reveal characters in order
              const shouldReveal = revealOrder.slice(0, Math.floor(iterations / 2)).includes(index);
              if (shouldReveal) {
                revealedIndices.add(index);
                return textArray[index];
              }
              if (revealedIndices.has(index)) {
                return textArray[index];
              }
            } else {
              // Simultaneous mode: all characters scramble then reveal
              if (iterations > maxIterations) {
                return textArray[index];
              }
            }
            
            // Show scrambled character
            return char === " " ? " " : getRandomChar();
          })
          .join("");
      });

      iterations++;

      const shouldStop = sequential 
        ? revealedIndices.size === textArray.length
        : iterations > maxIterations;

      if (shouldStop) {
        clearInterval(interval);
        setDisplayText(text);
        setIsAnimating(false);
      }
    }, speed);
  };

  useEffect(() => {
    if (animateOn === "load") {
      animate();
    }
  }, []);

  useEffect(() => {
    if (animateOn === "hover" && isHovered) {
      animate();
    }
  }, [isHovered]);

  useEffect(() => {
    if (animateOn === "view" && isVisible) {
      animate();
    }
  }, [isVisible]);

  // Intersection Observer for "view" trigger
  useEffect(() => {
    if (animateOn !== "view") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById(`decrypted-text-${text.replace(/\s+/g, "-")}`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [animateOn, text]);

  const handleMouseEnter = () => {
    if (animateOn === "hover") {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (animateOn === "hover") {
      setIsHovered(false);
    }
  };

  return (
    <span
      id={`decrypted-text-${text.replace(/\s+/g, "-")}`}
      className={cn(
        "inline-block",
        isAnimating ? encryptedClassName : className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={text}
    >
      <span aria-hidden="true">{displayText}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}