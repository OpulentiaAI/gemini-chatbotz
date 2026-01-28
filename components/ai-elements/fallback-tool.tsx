"use client";

import { useState } from "react";
import { CornerDownRight, ChevronDown, Terminal, FileCode, Folder } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

interface FallbackToolProps {
  toolName: string;
  input: unknown;
  result: string | unknown;
  state?: string;
}

const getToolIcon = (toolName: string) => {
  if (toolName.includes("bash") || toolName.includes("execute") || toolName.includes("Sandbox")) {
    return <Terminal className="size-4 text-amber-600" />;
  }
  if (toolName.includes("File") || toolName.includes("file")) {
    return <FileCode className="size-4 text-blue-600" />;
  }
  if (toolName.includes("list") || toolName.includes("List")) {
    return <Folder className="size-4 text-green-600" />;
  }
  return <CornerDownRight className="size-4" />;
};

const formatContent = (content: unknown): string => {
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }
  if (typeof content === "object" && content !== null) {
    return JSON.stringify(content, null, 2);
  }
  return String(content);
};

export function FallbackTool({ toolName, input, result, state }: FallbackToolProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isCompleted = state === "output-available" || state === "done";
  const isError = state === "output-error";
  const isRunning = state === "input-available" || state === "input-streaming";

  return (
    <div className="flex flex-col gap-1 -mt-0.5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "text-sm cursor-pointer select-none hover:text-foreground flex items-center gap-2 py-1 px-2 rounded-md transition-colors w-full text-left",
              isError ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-muted/50",
              isRunning && "animate-pulse"
            )}
            aria-label={`Toggle ${toolName} details`}
          >
            {getToolIcon(toolName)}
            <span className="font-medium">{toolName}</span>
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              isCompleted && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              isError && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
              isRunning && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            )}>
              {isCompleted ? "completed" : isError ? "error" : isRunning ? "running" : state}
            </span>
            <ChevronDown
              className={cn(
                "size-4 ml-auto transition-transform",
                isExpanded && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2 mt-2">
          {input && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Input
              </p>
              <div className="rounded-lg overflow-hidden border">
                <CodeBlock code={formatContent(input)} language="json" />
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {isError ? "Error" : "Output"}
              </p>
              <div className={cn(
                "rounded-lg overflow-hidden border",
                isError && "border-destructive/50"
              )}>
                <CodeBlock 
                  code={formatContent(result)} 
                  language={typeof result === "string" && !result.startsWith("{") ? "bash" : "json"} 
                />
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface BashToolResultProps {
  command: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  state?: string;
}

export function BashToolResult({ command, stdout, stderr, exitCode }: BashToolResultProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isSuccess = exitCode === 0;

  return (
    <div className="flex flex-col gap-2 my-2">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-md p-2 transition-colors">
            <Terminal className={cn(
              "size-4",
              isSuccess ? "text-green-600" : "text-red-600"
            )} />
            <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded flex-1 truncate">
              {command}
            </code>
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              isSuccess 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              exit: {exitCode ?? "?"}
            </span>
            <ChevronDown className={cn(
              "size-4 transition-transform",
              isExpanded && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2 space-y-2">
          {stdout && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">stdout</p>
              <div className="rounded-lg overflow-hidden border bg-neutral-950">
                <pre className="p-3 text-neutral-100 font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto">
                  {stdout}
                </pre>
              </div>
            </div>
          )}

          {stderr && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-destructive">stderr</p>
              <div className="rounded-lg overflow-hidden border border-destructive/30 bg-destructive/5">
                <pre className="p-3 text-destructive font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto">
                  {stderr}
                </pre>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface FileToolResultProps {
  path: string;
  content?: string;
  success: boolean;
  error?: string;
  operation: "read" | "write" | "list";
}

export function FileToolResult({ path, content, success, error, operation }: FileToolResultProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const operationLabels = {
    read: "Read file",
    write: "Write file", 
    list: "List files",
  };

  return (
    <div className="flex flex-col gap-2 my-2">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-md p-2 transition-colors">
            <FileCode className={cn(
              "size-4",
              success ? "text-blue-600" : "text-red-600"
            )} />
            <span className="text-sm font-medium">{operationLabels[operation]}</span>
            <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded truncate max-w-[200px]">
              {path}
            </code>
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full ml-auto",
              success 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {success ? "success" : "failed"}
            </span>
            <ChevronDown className={cn(
              "size-4 transition-transform",
              isExpanded && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2">
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : content ? (
            <div className="rounded-lg overflow-hidden border">
              <CodeBlock 
                code={content} 
                language={path.endsWith(".json") ? "json" : path.endsWith(".py") ? "python" : "bash"} 
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-2">No content</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
