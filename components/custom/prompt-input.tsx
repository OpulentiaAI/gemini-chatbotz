"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Settings, Mic, PlusCircle, Sparkles, CornerDownLeft, StopCircle, ChevronDown, Check, Zap, Brain, Gauge, FileText, Image, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OPENROUTER_MODELS, type OpenRouterModelId, type ModelDefinition } from "@/lib/ai/openrouter";

// Supported file types for AI analysis
const SUPPORTED_FILE_TYPES = {
  "application/pdf": { icon: FileText, label: "PDF", color: "text-red-500" },
  "image/png": { icon: Image, label: "PNG", color: "text-blue-500" },
  "image/jpeg": { icon: Image, label: "JPEG", color: "text-green-500" },
  "image/gif": { icon: Image, label: "GIF", color: "text-purple-500" },
  "image/webp": { icon: Image, label: "WebP", color: "text-orange-500" },
};

function getFileIcon(mimeType: string) {
  const config = SUPPORTED_FILE_TYPES[mimeType as keyof typeof SUPPORTED_FILE_TYPES];
  return config || { icon: FileText, label: "File", color: "text-chocolate-400" };
}

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
        className={`absolute -inset-[1px] rounded-[14px] bg-gradient-to-r from-chocolate-500/30 via-chocolate-400/20 to-transparent blur-[2px] transition-opacity duration-500 pointer-events-none
          ${isFocused || value.length > 0 ? "opacity-100" : "opacity-0"}
        `}
      />
      <div
        className={`
          relative flex flex-col gap-4 p-3 md:p-4
          bg-chocolate-50 dark:bg-chocolate-900 rounded-xl border transition-all duration-200
          ${isFocused ? "border-chocolate-300 dark:border-chocolate-700 shadow-sm" : "border-chocolate-200 dark:border-chocolate-800 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"}
        `}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsFocused(false);
          }
        }}
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-3 border-b border-chocolate-100 dark:border-chocolate-800">
            {attachments.map((file, index) => {
              const { icon: FileIcon, label, color } = getFileIcon(file.type);
              const isSupported = Object.keys(SUPPORTED_FILE_TYPES).includes(file.type);
              return (
                <div
                  key={index}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    isSupported 
                      ? "bg-chocolate-100 dark:bg-chocolate-800 border border-chocolate-200 dark:border-chocolate-700" 
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  }`}
                >
                  <FileIcon className={`w-4 h-4 ${color} flex-shrink-0`} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate max-w-[120px] font-medium text-chocolate-900 dark:text-chocolate-100">
                      {file.name}
                    </span>
                    <span className={`text-[10px] ${isSupported ? "text-chocolate-500" : "text-red-500"}`}>
                      {isSupported ? `${label} • Ready for AI analysis` : "Unsupported format"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                    className="ml-1 p-0.5 rounded text-chocolate-400 hover:text-chocolate-600 dark:hover:text-chocolate-300 hover:bg-chocolate-200 dark:hover:bg-chocolate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove ${file.name}`}
                    title="Remove file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
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
            className="w-full resize-none border-0 bg-transparent p-0 text-chocolate-900 dark:text-chocolate-100 placeholder:text-chocolate-400 dark:placeholder:text-chocolate-500 focus:ring-0 focus:outline-none text-sm md:text-[15px] leading-6 max-h-[300px] disabled:opacity-50"
            style={{ minHeight: "24px" }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative" ref={modelMenuRef}>
            <button
              type="button"
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-chocolate-50 dark:bg-chocolate-800 border border-chocolate-200 dark:border-chocolate-700 rounded-xl text-xs font-medium text-chocolate-600 dark:text-chocolate-300 hover:bg-chocolate-100 dark:hover:bg-chocolate-700 hover:text-chocolate-900 dark:hover:text-chocolate-100 transition-colors shadow-sm"
            >
              <ModelIcon provider={currentModel.provider} />
              <span className="hidden sm:inline">
                <span className="text-chocolate-900 dark:text-chocolate-100">{currentModel.name}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-chocolate-400 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isModelMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-80 max-h-[400px] overflow-y-auto bg-chocolate-50 dark:bg-chocolate-900 border border-chocolate-200 dark:border-chocolate-700 rounded-xl shadow-lg z-50">
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
                          className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors ${
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
                              {model.pricing.prompt > 0 && (
                                <span className="text-[10px] text-chocolate-400">
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
                ${isListening ? "bg-red-50 dark:bg-red-900/30 text-red-600" : "text-chocolate-600 dark:text-chocolate-400 hover:bg-chocolate-100 dark:hover:bg-chocolate-800"}
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
                className="flex items-center justify-center w-8 h-8 rounded-full text-chocolate-600 dark:text-chocolate-400 hover:bg-chocolate-100 dark:hover:bg-chocolate-800 transition-colors"
                title="Upload PDF or image for AI analysis"
                disabled={isLoading}
              >
                <Upload className="w-[18px] h-[18px]" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 text-xs text-chocolate-50 bg-chocolate-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                <div className="font-medium">Upload files</div>
                <div className="text-chocolate-300 text-[10px]">PDF, PNG, JPEG, GIF, WebP</div>
              </div>
            </div>
            <div className="h-4 w-px bg-chocolate-200 dark:bg-chocolate-700 mx-1 hidden sm:block" />
            <button
              type="button"
              onClick={handleLucky}
              disabled={isLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 h-8 bg-chocolate-50 dark:bg-chocolate-800 border border-chocolate-200 dark:border-chocolate-700 rounded-xl text-xs font-medium text-chocolate-700 dark:text-chocolate-300 hover:bg-chocolate-100 dark:hover:bg-chocolate-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <div className="relative w-[18px] h-[18px] flex items-center justify-center">
                <svg width="0" height="0">
                  <linearGradient id="spark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop stopColor="hsl(33, 32%, 30%)" offset="0%" />
                    <stop stopColor="hsl(33, 38%, 16%)" offset="100%" />
                  </linearGradient>
                </svg>
                <Sparkles className="w-[18px] h-[18px]" style={{ stroke: "url(#spark-gradient)" }} />
              </div>
              <span className="bg-gradient-to-r from-chocolate-600 to-chocolate-800 bg-clip-text text-transparent font-semibold">
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
                  ${value.trim() ? "bg-chocolate-700 border-chocolate-700 text-chocolate-50 hover:bg-chocolate-800 cursor-pointer" : "bg-chocolate-50 dark:bg-chocolate-800 border-chocolate-200 dark:border-chocolate-700 text-chocolate-300 dark:text-chocolate-600 cursor-not-allowed"}
                `}
              >
                <span>Build</span>
                <CornerDownLeft className={`w-4 h-4 ${value.trim() ? "text-chocolate-50" : "text-chocolate-300 dark:text-chocolate-600"}`} />
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
        accept=".pdf,application/pdf,image/png,image/jpeg,image/gif,image/webp"
      />
    </div>
  );
};
