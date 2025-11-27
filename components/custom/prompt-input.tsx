"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Settings, Mic, PlusCircle, Sparkles, CornerDownLeft, StopCircle, ChevronDown, Check, Zap, Brain, Gauge } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OPENROUTER_MODELS, type OpenRouterModelId, type ModelDefinition } from "@/lib/ai/openrouter";

type PromptInputProps = {
  onSubmit: (value: string, attachments?: File[], modelId?: OpenRouterModelId) => void;
  onStop?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  selectedModel?: OpenRouterModelId;
  onModelChange?: (modelId: OpenRouterModelId) => void;
};

function ModelIcon({ provider }: { provider: string }) {
  switch (provider) {
    case "OpenAI":
      return <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center text-[9px] font-bold text-white">AI</div>;
    case "Anthropic":
      return <div className="w-4 h-4 rounded bg-orange-500 flex items-center justify-center text-[9px] font-bold text-white">A</div>;
    case "Google":
      return <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white">G</div>;
    case "Meta":
      return <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white">M</div>;
    case "Mistral":
      return <div className="w-4 h-4 rounded bg-violet-500 flex items-center justify-center text-[9px] font-bold text-white">MI</div>;
    case "DeepSeek":
      return <div className="w-4 h-4 rounded bg-cyan-500 flex items-center justify-center text-[9px] font-bold text-white">D</div>;
    default:
      return <Brain className="w-4 h-4" />;
  }
}

export const PromptInput = ({
  onSubmit,
  onStop,
  isLoading = false,
  placeholder = "Describe your idea",
  className = "",
  selectedModel = "anthropic/claude-3.5-sonnet",
  onModelChange,
}: PromptInputProps) => {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const currentModel = OPENROUTER_MODELS.find(m => m.id === selectedModel) || OPENROUTER_MODELS[2];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = useCallback(() => {
    if (value.trim() && !isLoading) {
      onSubmit(value, attachments.length > 0 ? attachments : undefined, selectedModel);
      setValue("");
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [value, isLoading, onSubmit, attachments, selectedModel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isLoading) {
        toast.error("Please wait for the model to finish its response!");
      } else {
        handleSubmit();
      }
    }
  };

  const toggleListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Speech recognition is not supported in your browser");
      return;
    }
    setIsListening(!isListening);
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    setUploadQueue(files.map((file) => file.name));
    setAttachments((prev) => [...prev, ...files]);
    setUploadQueue([]);
    
    if (event.target) {
      event.target.value = "";
    }
  }, []);

  const handleLucky = useCallback(() => {
    const luckyPrompts = [
      "Help me book a flight from New York to Paris",
      "What's the weather like for traveling to Tokyo?",
      "Find me flights to London next week",
      "I need to fly from LA to Miami tomorrow",
      "Create a Python script that scrapes web data",
      "Write a React component for a todo list",
    ];
    const randomPrompt = luckyPrompts[Math.floor(Math.random() * luckyPrompts.length)];
    setValue(randomPrompt);
  }, []);

  const handleModelSelect = (modelId: OpenRouterModelId) => {
    onModelChange?.(modelId);
    setIsModelMenuOpen(false);
  };

  const groupedModels = OPENROUTER_MODELS.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, ModelDefinition[]>);

  return (
    <div className={`relative w-full max-w-[858px] mx-auto font-sans ${className}`}>
      <div
        className={`absolute -inset-[1px] rounded-[14px] bg-gradient-to-r from-blue-500/30 via-blue-400/20 to-transparent blur-[2px] transition-opacity duration-500 pointer-events-none
          ${isFocused || value.length > 0 ? "opacity-100" : "opacity-0"}
        `}
      />
      <div
        className={`
          relative flex flex-col gap-4 p-3 md:p-4
          bg-white dark:bg-zinc-900 rounded-xl border transition-all duration-200
          ${isFocused ? "border-blue-200 dark:border-blue-800 shadow-sm" : "border-gray-200 dark:border-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"}
        `}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsFocused(false);
          }
        }}
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-100 dark:border-zinc-800">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded-lg text-xs"
              >
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex-1 min-h-[20px]">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading}
            className="w-full resize-none border-0 bg-transparent p-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-0 focus:outline-none text-sm md:text-[15px] leading-6 max-h-[300px] disabled:opacity-50"
            style={{ minHeight: "24px" }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative" ref={modelMenuRef}>
            <button
              type="button"
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white transition-colors shadow-sm"
            >
              <ModelIcon provider={currentModel.provider} />
              <span className="hidden sm:inline">
                <span className="text-gray-900 dark:text-white">{currentModel.name}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isModelMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-80 max-h-[400px] overflow-y-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg z-50">
                <div className="p-2">
                  {Object.entries(groupedModels).map(([provider, models]) => (
                    <div key={provider} className="mb-2 last:mb-0">
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {provider}
                      </div>
                      {models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleModelSelect(model.id)}
                          className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors ${
                            selectedModel === model.id
                              ? 'bg-blue-50 dark:bg-blue-900/30'
                              : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <ModelIcon provider={model.provider} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {model.name}
                              </span>
                              {selectedModel === model.id && (
                                <Check className="w-3.5 h-3.5 text-blue-600" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {model.description}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              {model.capabilities.vision && (
                                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                  <Zap className="w-3 h-3" /> Vision
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                <Gauge className="w-3 h-3" /> {(model.contextLength / 1000).toFixed(0)}K ctx
                              </span>
                              {model.pricing.prompt > 0 && (
                                <span className="text-[10px] text-gray-400">
                                  ${model.pricing.prompt}/1K
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={toggleListening}
              className={`
                relative flex items-center justify-center w-8 h-8 rounded-full transition-all
                ${isListening ? "bg-red-50 dark:bg-red-900/30 text-red-600" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"}
              `}
              title="Speech to text"
            >
              {isListening ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              ) : (
                <Mic className="w-[18px] h-[18px]" />
              )}
            </button>
            <div className="relative group">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center w-8 h-8 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Add files"
                disabled={isLoading}
              >
                <PlusCircle className="w-[18px] h-[18px]" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Add files
              </div>
            </div>
            <div className="h-4 w-px bg-gray-200 dark:bg-zinc-700 mx-1 hidden sm:block" />
            <button
              type="button"
              onClick={handleLucky}
              disabled={isLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 h-8 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <div className="relative w-[18px] h-[18px] flex items-center justify-center">
                <svg width="0" height="0">
                  <linearGradient id="spark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop stopColor="#3b82f6" offset="0%" />
                    <stop stopColor="#8b5cf6" offset="100%" />
                  </linearGradient>
                </svg>
                <Sparkles className="w-[18px] h-[18px]" style={{ stroke: "url(#spark-gradient)" }} />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">
                I'm feeling lucky
              </span>
            </button>
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-xl text-xs font-medium border shadow-sm transition-all bg-red-600 border-red-600 text-white hover:bg-red-700 cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!value.trim()}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-xl text-xs font-medium border shadow-sm transition-all
                  ${value.trim() ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 cursor-pointer" : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-300 dark:text-gray-600 cursor-not-allowed"}
                `}
              >
                <span>Build</span>
                <CornerDownLeft className={`w-4 h-4 ${value.trim() ? "text-white" : "text-gray-300 dark:text-gray-600"}`} />
              </button>
            )}
          </div>
        </div>
      </div>
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />
    </div>
  );
};
