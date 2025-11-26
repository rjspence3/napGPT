"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  isTyping?: boolean;
  'data-testid'?: string;
}

export function MessageBubble({ content, isUser, isTyping, 'data-testid': dataTestId }: MessageBubbleProps) {
  if (isTyping) {
    return (
      <div className={cn("flex MessageBubble", isUser ? "justify-end" : "justify-start")} data-testid={dataTestId || 'typing-indicator'}>
        <div className="flex items-center gap-2 px-4 py-2 bg-cozy-warm/50 rounded-2xl">
          <span className="text-cozy-amber text-sm">Zzz</span>
          <div className="flex gap-1">
            <motion.div
              className="w-2 h-2 bg-cozy-amber rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-2 h-2 bg-cozy-amber rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-2 h-2 bg-cozy-amber rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={cn("flex mb-4 MessageBubble", isUser ? "justify-end" : "justify-start")}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-testid={isUser ? "message-user" : "message-assistant"}
      data-streaming={isTyping ? "true" : "false"}
    >
      <motion.div
        className={cn(
          "max-w-[80%] px-4 py-3 rounded-2xl cozy-shadow",
          isUser
            ? "bg-cozy-amber text-cozy-dim"
            : "bg-cozy-warm text-cozy-dim"
        )}
        animate={
          !isUser
            ? {
                y: [0, -2, 0],
              }
            : {}
        }
        transition={
          !isUser
            ? {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : {}
        }
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{(content ?? "").toString()}</p>
      </motion.div>
    </motion.div>
  );
}

