"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Maximize2, 
  Minimize2, 
  FileCode, 
  FileText, 
  Table,
  ChevronLeft,
  ChevronRight,
  Play,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useArtifact, type UIArtifact } from "@/hooks/use-artifact";
import { getLanguageFromTitle, type ArtifactKind } from "@/lib/artifacts/types";

// Artifact UI Components
function KindIcon({ kind, className }: { kind: ArtifactKind; className?: string }) {
  switch (kind) {
    case "code":
      return <FileCode className={cn("w-4 h-4", className)} />;
    case "sheet":
      return <Table className={cn("w-4 h-4", className)} />;
    default:
      return <FileText className={cn("w-4 h-4", className)} />;
  }
}

// Sheet Renderer
function SheetRenderer({ content }: { content: string }) {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return <p className="text-gray-500">Empty spreadsheet</p>;
  const rows = lines.map((line) => line.split(",").map((cell) => cell.trim()));
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            {rows[0]?.map((cell, i) => (
              <th
                key={i}
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r last:border-r-0"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.slice(1).map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900 border-r last:border-r-0">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Code Editor Component
function CodeContent({ 
  content, 
  language, 
  onSave,
  isReadonly = false,
}: { 
  content: string; 
  language: string;
  onSave?: (content: string) => void;
  isReadonly?: boolean;
}) {
  const [localContent, setLocalContent] = useState(content);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleRun = async () => {
    if (language !== "python") {
      toast.error("Code execution only available for Python");
      return;
    }
    
    setIsRunning(true);
    setOutput(null);
    
    try {
      // @ts-expect-error - Pyodide loaded from CDN
      const pyodide = await globalThis.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
      });
      
      let stdout = "";
      pyodide.setStdout({
        batched: (text: string) => {
          stdout += text + "\n";
        },
      });
      
      await pyodide.runPythonAsync(localContent);
      setOutput(stdout || "Code executed successfully (no output)");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setOutput(`Error: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {isReadonly ? (
          <pre className="p-4 text-sm font-mono text-gray-800 bg-gray-50 overflow-x-auto h-full">
            <code>{content}</code>
          </pre>
        ) : (
          <textarea
            value={localContent}
            onChange={(e) => {
              setLocalContent(e.target.value);
              onSave?.(e.target.value);
            }}
            className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-gray-100 resize-none focus:outline-none"
            spellCheck={false}
            aria-label="Code editor"
            placeholder="Enter code..."
          />
        )}
      </div>
      
      {language === "python" && (
        <div className="border-t border-gray-200">
          <div className="p-2 flex items-center gap-2 bg-gray-50">
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md transition-colors"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isRunning ? "Running..." : "Run"}
            </button>
          </div>
          
          {output && (
            <div className="p-4 bg-gray-900 text-gray-100 font-mono text-sm max-h-48 overflow-auto">
              <pre className="whitespace-pre-wrap">{output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Text Content Component
function TextContent({ 
  content,
  onSave,
  isReadonly = false,
}: { 
  content: string;
  onSave?: (content: string) => void;
  isReadonly?: boolean;
}) {
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  if (isReadonly) {
    return (
      <div className="p-4 prose prose-sm max-w-none h-full overflow-auto">
        <pre className="whitespace-pre-wrap font-sans text-gray-800">{content}</pre>
      </div>
    );
  }

  return (
    <textarea
      value={localContent}
      onChange={(e) => {
        setLocalContent(e.target.value);
        onSave?.(e.target.value);
      }}
      className="w-full h-full p-4 text-sm text-gray-800 resize-none focus:outline-none"
      spellCheck={true}
      aria-label="Text editor"
      placeholder="Enter text..."
    />
  );
}

// Artifact Actions
function ArtifactActions({ 
  artifact,
  onVersionChange,
  currentVersionIndex,
  totalVersions,
}: { 
  artifact: UIArtifact;
  onVersionChange?: (direction: "prev" | "next") => void;
  currentVersionIndex?: number;
  totalVersions?: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = artifact.title || "artifact.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  return (
    <div className="flex items-center gap-1">
      {totalVersions && totalVersions > 1 && (
        <>
          <button
            type="button"
            onClick={() => onVersionChange?.("prev")}
            disabled={currentVersionIndex === 0}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous version"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 px-1">
            {(currentVersionIndex || 0) + 1} / {totalVersions}
          </span>
          <button
            type="button"
            onClick={() => onVersionChange?.("next")}
            disabled={currentVersionIndex === totalVersions - 1}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next version"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
        </>
      )}
      
      <button
        type="button"
        onClick={handleCopy}
        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Copy to clipboard"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
      
      <button
        type="button"
        onClick={handleDownload}
        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Download"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}

// Main Artifact Panel Component
function PureArtifactPanel({
  className,
  isReadonly = false,
}: {
  className?: string;
  isReadonly?: boolean;
}) {
  const { artifact, closeArtifact, setArtifact } = useArtifact();
  const [isExpanded, setIsExpanded] = useState(false);

  const language = artifact.language || getLanguageFromTitle(artifact.title);

  const handleContentSave = useCallback(
    (newContent: string) => {
      setArtifact((current) => ({
        ...current,
        content: newContent,
      }));
    },
    [setArtifact]
  );

  if (!artifact.isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {artifact.isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeArtifact}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed right-0 top-0 bottom-0 z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col",
              isExpanded ? "left-0" : "w-full max-w-2xl",
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600">
                  <KindIcon kind={artifact.kind} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 truncate">
                    {artifact.title || "Untitled"}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {artifact.kind === "code" && (
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                        {language}
                      </span>
                    )}
                    {artifact.status === "streaming" && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Streaming...
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <ArtifactActions artifact={artifact} />
                
                <div className="w-px h-4 bg-gray-200 mx-1" />
                
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title={isExpanded ? "Minimize" : "Maximize"}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                
                <button
                  type="button"
                  onClick={closeArtifact}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {artifact.kind === "code" ? (
                <CodeContent
                  content={artifact.content}
                  language={language}
                  onSave={handleContentSave}
                  isReadonly={isReadonly || artifact.status === "streaming"}
                />
              ) : artifact.kind === "sheet" ? (
                <div className="p-4 h-full overflow-auto">
                  <SheetRenderer content={artifact.content} />
                </div>
              ) : (
                <TextContent
                  content={artifact.content}
                  onSave={handleContentSave}
                  isReadonly={isReadonly || artifact.status === "streaming"}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export const ArtifactPanel = memo(PureArtifactPanel);

// Export Artifact Preview Button (to open panel)
export function ArtifactPreviewButton({ 
  artifact,
  className,
}: { 
  artifact: {
    id: string;
    title: string;
    kind: ArtifactKind;
    content: string;
    language?: string;
  };
  className?: string;
}) {
  const { openArtifact } = useArtifact();

  const handleClick = () => {
    openArtifact({
      documentId: artifact.id,
      title: artifact.title,
      kind: artifact.kind,
      content: artifact.content,
      language: artifact.language,
      messageId: "",
      status: "idle",
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-left group",
        className
      )}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
        <KindIcon kind={artifact.kind} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{artifact.title}</p>
        <p className="text-xs text-gray-500">
          {artifact.kind === "code"
            ? getLanguageFromTitle(artifact.title)
            : artifact.kind === "sheet"
            ? "Spreadsheet"
            : "Document"}
        </p>
      </div>
      <Maximize2 className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
    </button>
  );
}
