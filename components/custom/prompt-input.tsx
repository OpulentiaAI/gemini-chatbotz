"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus, MoreHorizontal, Mic, ArrowUp, Bot, ChevronDown, Sparkles, StopCircle, Check, Zap, Brain, Gauge, FileText, Image, X, CornerDownLeft, Loader2 } from "lucide-react";
import { StopIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OPENROUTER_MODELS, type OpenRouterModelId, type ModelDefinition } from "@/lib/ai/openrouter";

// Supported file types for AI analysis
const SUPPORTED_FILE_TYPES = {
  "application/pdf": { icon: FileText, label: "PDF", color: "text-chocolate-600" },
  "image/png": { icon: Image, label: "PNG", color: "text-chocolate-500" },
  "image/jpeg": { icon: Image, label: "JPEG", color: "text-chocolate-500" },
  "image/gif": { icon: Image, label: "GIF", color: "text-chocolate-500" },
  "image/webp": { icon: Image, label: "WebP", color: "text-chocolate-500" },
};

function getFileIcon(mimeType: string) {
  const config = SUPPORTED_FILE_TYPES[mimeType as keyof typeof SUPPORTED_FILE_TYPES];
  return config || { icon: FileText, label: "File", color: "text-chocolate-400" };
}

type PromptInputProps = {
  onSubmit: (value: string, attachments?: File[], modelId?: OpenRouterModelId) => void;
  onStop?: () => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  className?: string;
  selectedModel?: OpenRouterModelId;
  onModelChange?: (modelId: OpenRouterModelId) => void;
};

function ModelIcon({ provider }: { provider: string }) {
  switch (provider) {
    case "OpenAI":
      return <div className="w-4 h-4 rounded bg-chocolate-600 flex items-center justify-center text-[9px] font-bold text-chocolate-50">AI</div>;
    case "Anthropic":
      return <div className="w-4 h-4 rounded bg-chocolate-500 flex items-center justify-center text-[9px] font-bold text-chocolate-50">A</div>;
    case "Google":
      return <div className="w-4 h-4 rounded bg-chocolate-700 flex items-center justify-center text-[9px] font-bold text-chocolate-50">G</div>;
    case "Meta":
      return <div className="w-4 h-4 rounded bg-chocolate-800 flex items-center justify-center text-[9px] font-bold text-chocolate-50">M</div>;
    case "Mistral":
      return <div className="w-4 h-4 rounded bg-chocolate-400 flex items-center justify-center text-[9px] font-bold text-chocolate-900">MI</div>;
    case "DeepSeek":
      return <div className="w-4 h-4 rounded bg-chocolate-300 flex items-center justify-center text-[9px] font-bold text-chocolate-900">D</div>;
    default:
      return <Brain className="w-4 h-4" />;
  }
}

export const PromptInput = ({
  onSubmit,
  onStop,
  isLoading = false,
  isStreaming = false,
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
    <div className={`flex flex-col items-center justify-center w-full p-4 bg-transparent font-sans ${className}`}>
      {/* Main Search Container */}
      <motion.div
        className={`
          w-full max-w-2xl bg-chocolate-50 dark:bg-chocolate-900 rounded-[32px] 
          shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]
          border border-chocolate-100 dark:border-chocolate-800 p-4 transition-all duration-300 ease-in-out
          ${isFocused ? 'shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgb(0,0,0,0.3)] ring-1 ring-chocolate-200 dark:ring-chocolate-700' : ''}
        `}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="flex flex-col gap-4">
          {/* Attachments Row */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-3 border-b border-chocolate-100 dark:border-chocolate-800">
              {attachments.map((file, index) => {
                const { icon: FileIcon, label, color } = getFileIcon(file.type);
                const isSupported = Object.keys(SUPPORTED_FILE_TYPES).includes(file.type);
                return (
                  <div
                    key={index}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-full text-xs transition-all ${
                      isSupported 
                        ? "bg-chocolate-100 dark:bg-chocolate-800 border border-chocolate-200 dark:border-chocolate-700" 
                        : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    }`}
                  >
                    <FileIcon className={`w-4 h-4 ${color} flex-shrink-0`} />
                    <span className="truncate max-w-[100px] font-medium text-chocolate-900 dark:text-chocolate-100">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                      className="p-0.5 rounded-full text-chocolate-400 hover:text-chocolate-600 dark:hover:text-chocolate-300 hover:bg-chocolate-200 dark:hover:bg-chocolate-700 transition-colors"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top Row: Search Icon & Input */}
          <div className="flex items-center gap-3 px-1">
            <Search className="w-5 h-5 text-chocolate-400 shrink-0" strokeWidth={2.5} />
            <input
              type="text"
              placeholder={placeholder}
              className="w-full text-lg text-chocolate-700 dark:text-chocolate-200 placeholder:text-chocolate-400 dark:placeholder:text-chocolate-500 bg-transparent border-none outline-none focus:ring-0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isLoading}
            />
          </div>

          {/* Bottom Row: Actions & Tools */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              {/* File Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-chocolate-50 dark:bg-chocolate-800 border border-chocolate-200 dark:border-chocolate-700 rounded-full text-sm font-medium text-chocolate-600 dark:text-chocolate-300 hover:bg-chocolate-100 dark:hover:bg-chocolate-700 hover:border-chocolate-300 dark:hover:border-chocolate-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 text-chocolate-400 group-hover:text-chocolate-600 dark:group-hover:text-chocolate-300" />
                <span>Add files</span>
              </button>

              {/* Model Selector Button */}
              <div className="relative" ref={modelMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                  className="group flex items-center gap-1.5 px-3 py-1.5 bg-chocolate-50 dark:bg-chocolate-800 border border-chocolate-200 dark:border-chocolate-700 rounded-full text-sm font-medium text-chocolate-600 dark:text-chocolate-300 hover:bg-chocolate-100 dark:hover:bg-chocolate-700 hover:border-chocolate-300 dark:hover:border-chocolate-600 transition-colors cursor-pointer"
                >
                  <Bot className="w-4 h-4 text-chocolate-400 group-hover:text-chocolate-600 dark:group-hover:text-chocolate-300" />
                  <span className="hidden sm:inline">{currentModel.name}</span>
                  <span className="sm:hidden">Model</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-chocolate-400 group-hover:text-chocolate-600 dark:group-hover:text-chocolate-300 ml-0.5 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Model Dropdown */}
                {isModelMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-80 max-h-[400px] overflow-y-auto bg-chocolate-50 dark:bg-chocolate-900 border border-chocolate-200 dark:border-chocolate-700 rounded-2xl shadow-lg z-50">
                    <div className="p-2">
                      {Object.entries(groupedModels).map(([provider, models]) => (
                        <div key={provider} className="mb-2 last:mb-0">
                          <div className="px-2 py-1 text-xs font-semibold text-chocolate-500 dark:text-chocolate-400 uppercase tracking-wider">
                            {provider}
                          </div>
                          {models.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => handleModelSelect(model.id)}
                              className={`w-full flex items-start gap-3 p-2 rounded-xl text-left transition-colors ${
                                selectedModel === model.id
                                  ? 'bg-chocolate-200 dark:bg-chocolate-700/50'
                                  : 'hover:bg-chocolate-100 dark:hover:bg-chocolate-800'
                              }`}
                            >
                              <ModelIcon provider={model.provider} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-chocolate-900 dark:text-chocolate-100">
                                    {model.name}
                                  </span>
                                  {selectedModel === model.id && (
                                    <Check className="w-3.5 h-3.5 text-chocolate-600" />
                                  )}
                                </div>
                                <p className="text-xs text-chocolate-500 dark:text-chocolate-400 truncate">
                                  {model.description}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                  {model.capabilities.vision && (
                                    <span className="flex items-center gap-1 text-[10px] text-chocolate-400">
                                      <Zap className="w-3 h-3" /> Vision
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-[10px] text-chocolate-400">
                                    <Gauge className="w-3 h-3" /> {(model.contextLength / 1000).toFixed(0)}K ctx
                                  </span>
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

              {/* Lucky Button */}
              <button
                type="button"
                onClick={handleLucky}
                disabled={isLoading}
                className="p-2 text-chocolate-400 hover:text-chocolate-600 dark:hover:text-chocolate-300 hover:bg-chocolate-100 dark:hover:bg-chocolate-800 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                title="I'm feeling lucky"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Mic Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  isListening 
                    ? "bg-red-50 dark:bg-red-900/30 text-red-600" 
                    : "text-chocolate-400 hover:text-chocolate-600 dark:hover:text-chocolate-300 hover:bg-chocolate-100 dark:hover:bg-chocolate-800"
                }`}
                title="Speech to text"
              >
                {isListening ? (
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              {/* Submit/Stop Button */}
              <Button
                disabled={
                  (!isStreaming && value.trim().length === 0) ||
                  isLoading
                }
                onClick={isStreaming ? onStop : handleSubmit}
                size="sm"
                className="h-8 px-3"
                aria-label={isStreaming ? 'Stop' : 'Send'}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isStreaming ? (
                  <StopIcon />
                ) : (
                  <CornerDownLeft className="w-4 h-4" />
                )}
                {!isStreaming ? 'Build' : 'Stop'}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Hidden file input */}
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
        accept=".pdf,application/pdf,image/png,image/jpeg,image/gif,image/webp"
        aria-label="Upload files"
      />
    </div>
  );
};
