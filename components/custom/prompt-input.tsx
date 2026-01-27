"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Camera,
  ChevronDown,
  FileText,
  Lightbulb,
  Loader2,
  MousePointer2,
  Paperclip,
  Plug,
  Send,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { OPENROUTER_MODELS, type OpenRouterModelId, type ModelDefinition } from "@/lib/ai/openrouter";
import { useArtifact } from "@/hooks/use-artifact";
import { MCPSettings } from "@/components/custom/mcp-settings";
import { toast } from "sonner";

type ModelId = OpenRouterModelId;

type PromptInputProps = {
  onSubmit: (value: string, attachments?: File[], modelId?: ModelId) => void;
  onStop?: () => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  className?: string;
  selectedModel?: ModelId;
  onModelChange?: (modelId: ModelId) => void;
  isCompact?: boolean;
};

type RichTextEditorProps = {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message?: string, attachments?: File[]) => void;
  selectedModel?: ModelId;
  onSelectModel?: (model: ModelId) => void;
  isCompact?: boolean;
  isDisabled?: boolean;
  isPending?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
};

// Group models by provider
function getModelsByProvider(): { provider: string; models: ModelDefinition[] }[] {
  // Use only OpenRouter models
  const allModels = OPENROUTER_MODELS;
  const grouped = allModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, ModelDefinition[]>);

  return Object.entries(grouped).map(([provider, models]) => ({
    provider,
    models,
  }));
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <title>Models</title>
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function RichTextEditor({
  placeholder = "Ask a follow-up question or construct a Devin prompt",
  value,
  onChange,
  onSubmit,
  selectedModel,
  onSelectModel,
  isCompact = false,
  isDisabled = false,
  isPending = false,
  isStreaming = false,
  onStop,
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const { openArtifact } = useArtifact();

  const isEmpty = value.trim().length === 0;
  const modelsByProvider = useMemo(() => getModelsByProvider(), []);

  const currentModel = useMemo(() => {
    const allModels = OPENROUTER_MODELS;
    return allModels.find((m) => m.id === selectedModel);
  }, [selectedModel]);

  const handleInput = useCallback(() => {
    if (contentEditableRef.current) {
      const text = contentEditableRef.current.innerText;
      onChange(text === "\n" ? "" : text);
    }
  }, [onChange]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isPending) return;

      if (isStreaming) {
        onStop?.();
        return;
      }

      let currentMessage = value;
      if (contentEditableRef.current) {
        const text = contentEditableRef.current.innerText;
        currentMessage = text === "\n" ? "" : text;
        if (currentMessage !== value) {
          onChange(currentMessage);
        }
      }

      onSubmit(currentMessage, attachments.length > 0 ? attachments : undefined);
      setAttachments([]);

      // Clear the contentEditable
      if (contentEditableRef.current) {
        contentEditableRef.current.textContent = "";
      }
    },
    [attachments, isPending, isStreaming, onChange, onStop, onSubmit, value]
  );

  useEffect(() => {
    if (contentEditableRef.current && value === "") {
      if (contentEditableRef.current.textContent) {
        queueMicrotask(() => {
          if (contentEditableRef.current) {
            contentEditableRef.current.textContent = "";
          }
        });
      }
    }
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  const handleImageClick = () => {
    if (!currentModel?.capabilities.vision) {
      toast.error(`${currentModel?.name || "This model"} does not support image input. Please select a vision-capable model.`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (!currentModel?.capabilities.vision) {
        toast.error(`${currentModel?.name || "This model"} does not support image input. Please select a vision-capable model.`);
        e.target.value = "";
        return;
      }
      setAttachments((prev) => [...prev, ...files]);
    }
    e.target.value = "";
  }, [currentModel]);

  // Open empty code artifact (cursor-like behavior)
  const handleCursorClick = useCallback(() => {
    openArtifact({
      documentId: `code-${Date.now()}`,
      title: "New Code",
      kind: "code",
      content: "// Start typing your code here...\n",
      language: "typescript",
      messageId: "",
      status: "idle",
    });
  }, [openArtifact]);

  // Open empty document artifact
  const handleDocumentClick = useCallback(() => {
    openArtifact({
      documentId: `doc-${Date.now()}`,
      title: "New Document",
      kind: "text",
      content: "",
      messageId: "",
      status: "idle",
    });
  }, [openArtifact]);

  const modelButtonClass =
    "inline-flex min-w-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";
  const optionsButtonClass =
    "inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/80 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";
  const iconButtonClass =
    "inline-flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus:outline-none disabled:opacity-50";
  const showExtraIcons = !isCompact;
  const modelLabelClass = cn(
    "max-w-[160px] truncate sm:max-w-[220px]",
    isCompact && "max-w-[120px] sm:max-w-[160px]"
  );
  const optionsLabelClass = cn("hidden sm:inline", isCompact && "sm:hidden");

  return (
    <div className="mx-auto flex w-full flex-col px-4 lg:max-w-[600px] xl:px-0">
      <form className="flex w-full flex-col" onSubmit={handleSubmit}>
        <div
          className={cn(
            "rounded-xl border border-border bg-card transition-all",
            isFocused && "border-ring",
            isDisabled && "opacity-60"
          )}
        >
          <div role="presentation" className="relative overflow-hidden">
            <input
              ref={fileInputRef}
              accept="image/*,.jpeg,.jpg,.png,.webp,.svg,.pdf,application/pdf"
              multiple
              type="file"
              tabIndex={-1}
              onChange={handleFileChange}
              title="Attach files"
              aria-label="Attach files"
              className="absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]"
            />
            <div className="flex flex-col">
              <div className="relative min-h-[48px] w-full px-4 py-4">
                {isEmpty && (
                  <span className="pointer-events-none absolute left-4 top-4 text-[15px] text-muted-foreground">
                    {placeholder}
                  </span>
                )}
                <div
                  ref={contentEditableRef}
                  contentEditable={!isDisabled}
                  role="textbox"
                  tabIndex={isDisabled ? -1 : 0}
                  aria-label="Message input"
                  title="Type your message here"
                  translate="no"
                  className="relative min-h-[48px] max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words text-[15px] text-foreground outline-none"
                  onInput={handleInput}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (items) {
                      const imageFiles: File[] = [];
                      for (const item of items) {
                        if (item.kind === "file" && item.type.startsWith("image/")) {
                          const file = item.getAsFile();
                          if (file) imageFiles.push(file);
                        }
                      }
                      if (imageFiles.length > 0) {
                        if (!currentModel?.capabilities.vision) {
                          e.preventDefault();
                          toast.error(`${currentModel?.name || "This model"} does not support image input.`);
                          return;
                        }
                        e.preventDefault();
                        setAttachments((prev) => [...prev, ...imageFiles]);
                      }
                    }
                  }}
                  suppressContentEditableWarning
                />
              </div>

              {/* Attachments preview */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pb-2">
                  {attachments.map((file) => (
                    <Badge key={`${file.name}-${file.size}-${file.lastModified}`} variant="secondary" className="gap-1">
                      {file.name}
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((f) => f !== file))}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
                <div className={cn("flex min-w-0 flex-1 items-center gap-2", isCompact && "gap-1.5")}>
                  <button
                    type="button"
                    onClick={handleImageClick}
                    title="Attach"
                    aria-label="Attach"
                    disabled={isDisabled}
                    className={iconButtonClass}
                  >
                    <Paperclip className="h-[18px] w-[18px]" />
                  </button>

                  {/* Model Selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className={modelButtonClass} disabled={isDisabled}>
                        <GridIcon className="h-4 w-4 shrink-0" />
                        <span className={modelLabelClass}>{currentModel?.name || "Select model"}</span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-primary-foreground/70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-56 max-h-80 overflow-y-auto bg-popover text-popover-foreground border-border"
                    >
                      {modelsByProvider.map((group, idx) => (
                        <div key={group.provider}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {group.provider}
                          </div>
                          {group.models.map((model) => (
                            <DropdownMenuItem
                              key={model.id}
                              onClick={() => onSelectModel?.(model.id)}
                              className={cn(
                                "pl-4 text-muted-foreground focus:bg-accent focus:text-foreground",
                                selectedModel === model.id && "bg-accent text-foreground"
                              )}
                            >
                              <span className="truncate">{model.name}</span>
                            </DropdownMenuItem>
                          ))}
                          {idx < modelsByProvider.length - 1 && (
                            <DropdownMenuSeparator className="bg-border" />
                          )}
                        </div>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Options Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className={optionsButtonClass} disabled={isDisabled}>
                        <Settings className="h-4 w-4 shrink-0" />
                        <span className={optionsLabelClass}>Options</span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-52 bg-popover text-popover-foreground border-border"
                    >
                      <DropdownMenuItem className="text-muted-foreground focus:bg-accent focus:text-foreground">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <MCPSettings
                        variant="compact"
                        trigger={
                          <DropdownMenuItem
                            className="text-muted-foreground focus:bg-accent focus:text-foreground"
                            disabled={isDisabled}
                          >
                            <Plug className="mr-2 h-4 w-4" />
                            MCP Connections
                          </DropdownMenuItem>
                        }
                      />
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem
                        onClick={handleCursorClick}
                        className="text-muted-foreground focus:bg-accent focus:text-foreground"
                      >
                        <MousePointer2 className="mr-2 h-4 w-4" />
                        New Code
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          setReasoningEnabled(!reasoningEnabled);
                        }}
                        className="flex items-center justify-between text-muted-foreground focus:bg-accent focus:text-foreground"
                      >
                        <div className="flex items-center">
                          <Lightbulb className="mr-2 h-4 w-4" />
                          Reasoning
                        </div>
                        <div
                          className={cn(
                            "h-4 w-8 rounded-full transition-colors",
                            reasoningEnabled ? "bg-primary" : "bg-muted"
                          )}
                        >
                          <div
                            className={cn(
                              "h-4 w-4 rounded-full bg-background shadow transition-transform",
                              reasoningEnabled && "translate-x-4"
                            )}
                          />
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className={cn("flex shrink-0 items-center gap-1", isCompact && "gap-0.5")}>
                  <button
                    type="submit"
                    title={isStreaming ? "Stop" : "Send"}
                    aria-label={isStreaming ? "Stop" : "Send"}
                    disabled={isDisabled || (!isStreaming && isEmpty)}
                    className={cn(iconButtonClass, !showExtraIcons && "hidden")}
                  >
                    <Send className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDocumentClick}
                    title="New Document"
                    aria-label="New Document"
                    disabled={isDisabled}
                    className={cn(iconButtonClass, !showExtraIcons && "hidden")}
                  >
                    <FileText className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleImageClick}
                    title="Camera"
                    aria-label="Camera"
                    disabled={isDisabled}
                    className={cn(iconButtonClass, !showExtraIcons && "hidden")}
                  >
                    <Camera className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    type="submit"
                    disabled={isDisabled || (!isStreaming && isEmpty)}
                    title={isStreaming ? "Stop" : "Submit"}
                    aria-label={isStreaming ? "Stop" : "Submit"}
                    className={cn(
                      "ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors focus:outline-none disabled:cursor-not-allowed",
                      isEmpty && !isStreaming
                        ? "bg-muted text-muted-foreground"
                        : isStreaming
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          : "bg-foreground text-background hover:bg-foreground/90"
                    )}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isStreaming ? (
                      <span className="h-3 w-3 rounded-sm bg-current" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export const PromptInput = ({
  onSubmit,
  onStop,
  isLoading = false,
  isStreaming = false,
  placeholder = "Ask a follow-up question or construct a Devin prompt",
  className = "",
  selectedModel = "moonshotai/kimi-k2.5",
  onModelChange,
  isCompact = false,
}: PromptInputProps) => {
  const [value, setValue] = useState("");

  const handleSelectModel = useCallback(
    (modelId: OpenRouterModelId) => {
      onModelChange?.(modelId);
    },
    [onModelChange]
  );

  const handleSubmit = useCallback(
    (message?: string, attachments?: File[]) => {
      const trimmed = (message ?? "").trim();
      if (!trimmed && (!attachments || attachments.length === 0)) return;
      if (isLoading) return;
      onSubmit(trimmed, attachments, selectedModel);
      setValue("");
    },
    [isLoading, onSubmit, selectedModel]
  );

  return (
    <div className={cn("w-full", className)}>
      <RichTextEditor
        placeholder={placeholder}
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        isCompact={isCompact}
        isDisabled={isLoading}
        isPending={isLoading}
        isStreaming={isStreaming}
        onStop={onStop}
      />
    </div>
  );
};
