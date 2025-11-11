"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { MessageBubble } from "./MessageBubble";
import { useNapStore } from "@/lib/nap/state";
import { motion } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNapping, setIsNapping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const effort = useNapStore((state) => state.effort);
  const consumeEnergy = useNapStore((state) => state.consumeEnergy);
  const updateIdle = useNapStore((state) => state.updateIdle);
  const napTimerEnabled = useNapStore((state) => state.napTimerEnabled);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (!napTimerEnabled) return;

    const interval = setInterval(() => {
      updateIdle();
    }, 1000);

    return () => clearInterval(interval);
  }, [napTimerEnabled, updateIdle]);

  const handleCommand = (text: string): boolean => {
    if (text === "/nap") {
      setIsNapping(true);
      if (inputRef.current) inputRef.current.disabled = true;

      setTimeout(() => {
        setIsNapping(false);
        if (inputRef.current) inputRef.current.disabled = false;
        inputRef.current?.focus();
      }, 5000);

      return true;
    }

    return false;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    
    // Snapshot state synchronously to avoid race condition
    // Zustand hook has getState method for synchronous access
    const currentEffort = (useNapStore as any).getState?.()?.effort ?? effort;
    const dreamMode = userMessage === "/dream";
    
    setInput("");
    updateIdle();

    // Handle /nap command (UI-only, shows animation)
    if (userMessage === "/nap") {
      if (handleCommand(userMessage)) {
        return;
      }
    }
    // /dream is handled by API preprocessing

    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setIsLoading(true);
    consumeEnergy(10);

    // Microtask: settle any pending setState on slider
    await Promise.resolve();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Get test config from window.__nap_test if available
      const testConfig = typeof window !== "undefined" && (window as any).__nap_test
        ? { dreamDriftProb: (window as any).__nap_test.dreamDriftProb }
        : undefined;

      console.log('[ChatWindow] Sending fetch request to /api/chat...');
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          effort: currentEffort, // Use snapshot, not reactive value
          flags: {
            dream: dreamMode,
          },
          ...(testConfig && { testConfig }),
        }),
        signal: controller.signal,
      });
      console.log('[ChatWindow] Fetch response received, status:', response.status);

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Check for rate limit
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Rate limit exceeded. Please slow down.");
        }
        throw new Error(`Failed to get response: ${response.status}`);
      }

      const data = await response.json();
      console.log('[ChatWindow] Received response:', data.reply?.substring(0, 50));
      setMessages([
        ...newMessages,
        { role: "assistant", content: data.reply },
      ]);
      console.log('[ChatWindow] Messages updated, count:', newMessages.length + 1);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Error:", error);
      
      let errorMessage = "ugh... something broke. maybe try again later?";
      if (error instanceof Error) {
        if (error.name === "AbortError" || error.message.includes("aborted") || error.message.includes("Failed to fetch")) {
          errorMessage = "ugh... took too long. maybe try again?";
        } else if (error.message.includes("Rate limit")) {
          errorMessage = "Rate limit exceeded. Please slow down.";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "ugh... network issue. maybe try again?";
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        const errMsg = String((error as any).message);
        if (errMsg.includes("aborted") || errMsg.includes("Failed to fetch")) {
          errorMessage = "ugh... took too long. maybe try again?";
        }
      }
      
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: errorMessage,
        },
      ]);
      console.log('[ChatWindow] Error message added:', errorMessage);
    } finally {
      setIsLoading(false);
      updateIdle();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6" data-testid="message-list">
        {isEmpty ? (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-center px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-6xl mb-4">😴</div>
            <h2 className="text-2xl font-bold text-cozy-dim mb-2">
              NapGPT
            </h2>
            <p className="text-cozy-dim/70 max-w-md">
              The AI that just... doesn&apos;t feel like it right now.
            </p>
            <p className="text-sm text-cozy-dim/50 mt-4">
              Try: <code className="bg-cozy-warm/50 px-2 py-1 rounded">/nap</code> or{" "}
              <code className="bg-cozy-warm/50 px-2 py-1 rounded">/dream</code>
            </p>
          </motion.div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                content={msg.content}
                isUser={msg.role === "user"}
                isTyping={false}
              />
            ))}
            {isLoading && <MessageBubble content="" isUser={false} isTyping={true} data-testid="typing-indicator" />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {isNapping && (
        <motion.div
          className="absolute inset-0 bg-cozy-dim/40 backdrop-blur-sm z-40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="nap-overlay"
        >
          <div className="text-4xl text-cozy-latte">💤</div>
        </motion.div>
      )}

      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              updateIdle();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (or /nap, /dream)"
            className="flex-1 px-4 py-3 bg-cozy-warm/50 rounded-2xl border border-cozy-amber/20 focus:outline-none focus:ring-2 focus:ring-cozy-amber/50 text-cozy-dim placeholder-cozy-dim/50"
            disabled={isLoading || isNapping}
            aria-label="Message input"
            data-testid="chat-input"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || isNapping}
            className="px-6 py-3 bg-cozy-amber text-cozy-dim rounded-2xl font-medium hover:bg-cozy-amber/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Send message"
            data-testid="send-btn"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

