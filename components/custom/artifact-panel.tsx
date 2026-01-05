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
  Code,
  Eye,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useArtifact, type UIArtifact } from "@/hooks/use-artifact";
import { getLanguageFromTitle, type ArtifactKind } from "@/lib/artifacts/types";

// Kibo UI Components
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockBody,
  CodeBlockItem,
  CodeBlockContent,
  CodeBlockCopyButton,
  type BundledLanguage,
} from "@/components/kibo-ui/code-block";
import {
  SandboxProvider,
  SandboxLayout,
  SandboxTabs,
  SandboxTabsList,
  SandboxTabsTrigger,
  SandboxTabsContent,
  SandboxCodeEditor,
  SandboxPreview,
  SandboxConsole,
  SandboxFileExplorer,
} from "@/components/kibo-ui/sandbox";
import { Spinner } from "@/components/kibo-ui/spinner";

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
  if (lines.length === 0) return <p className="text-neutral-600 dark:text-neutral-400">Empty spreadsheet</p>;
  const rows = lines.map((line) => line.split(",").map((cell) => cell.trim()));
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-chocolate-200 dark:divide-chocolate-700 border border-chocolate-200 dark:border-chocolate-700 rounded-lg">
        <thead className="bg-chocolate-50 dark:bg-chocolate-900">
          <tr>
            {rows[0]?.map((cell, i) => (
              <th
                key={i}
                className="px-4 py-2 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider border-r border-chocolate-200 dark:border-chocolate-700 last:border-r-0"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-chocolate-950 divide-y divide-chocolate-200 dark:divide-chocolate-800">
          {rows.slice(1).map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-chocolate-50 dark:hover:bg-chocolate-900">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2 text-sm text-neutral-900 dark:text-white border-r border-chocolate-200 dark:border-chocolate-700 last:border-r-0">
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

// Map language string to Shiki BundledLanguage
function mapToShikiLanguage(lang: string): BundledLanguage {
  const langMap: Record<string, BundledLanguage> = {
    javascript: "javascript",
    js: "javascript",
    typescript: "typescript",
    ts: "typescript",
    python: "python",
    py: "python",
    html: "html",
    css: "css",
    json: "json",
    markdown: "markdown",
    md: "markdown",
    bash: "bash",
    shell: "bash",
    sh: "bash",
    sql: "sql",
    yaml: "yaml",
    yml: "yaml",
    tsx: "tsx",
    jsx: "jsx",
    go: "go",
    rust: "rust",
    java: "java",
    cpp: "cpp",
    c: "c",
    csharp: "csharp",
    php: "php",
    ruby: "ruby",
    swift: "swift",
    kotlin: "kotlin",
  };
  return langMap[lang.toLowerCase()] || "typescript";
}

// Check if language supports sandbox preview
function isSandboxSupported(language: string): boolean {
  const supported = ["javascript", "js", "typescript", "ts", "tsx", "jsx", "html", "css"];
  return supported.includes(language.toLowerCase());
}

// Code Editor Component with Kibo UI
function CodeContent({
  content,
  language,
  title,
  onSave,
  isReadonly = false,
  documentId,
}: {
  content: string;
  language: string;
  title?: string;
  onSave?: (content: string) => void;
  isReadonly?: boolean;
  documentId?: string;
}) {
  const [localContent, setLocalContent] = useState(content);
  const [activeTab, setActiveTab] = useState<"code" | "preview" | "console">("code");
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  useEffect(() => {
    setLocalContent(content);
  }, [content, documentId]);

  const shikiLang = mapToShikiLanguage(language);
  const canPreview = isSandboxSupported(language);

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

  // For web languages (JS/TS/HTML/CSS), use Sandbox
  if (canPreview && !isReadonly) {
    const getTemplate = () => {
      if (language === "html") return "vanilla";
      if (["tsx", "jsx"].includes(language.toLowerCase())) return "react-ts";
      return "vanilla-ts";
    };

    const getFilename = () => {
      if (title) return title;
      if (language === "html") return "index.html";
      if (["tsx", "jsx"].includes(language.toLowerCase())) return "App.tsx";
      if (["ts", "typescript"].includes(language.toLowerCase())) return "index.ts";
      return "index.js";
    };

    return (
      <div className="flex flex-col h-full">
        <SandboxProvider
          key={documentId || content.slice(0, 50)}
          template={getTemplate()}
          files={{
            [getFilename()]: localContent,
          }}
        >
          <SandboxTabs defaultValue="code" value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <SandboxTabsList className="border-b border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900">
              <SandboxTabsTrigger value="code" className="flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5" />
                Code
              </SandboxTabsTrigger>
              <SandboxTabsTrigger value="preview" className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Preview
              </SandboxTabsTrigger>
              <SandboxTabsTrigger value="console" className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Console
              </SandboxTabsTrigger>
            </SandboxTabsList>
            
            <SandboxLayout>
              <SandboxTabsContent value="code" className="h-full">
                <SandboxCodeEditor 
                  showLineNumbers 
                  style={{ height: "100%" }}
                />
              </SandboxTabsContent>
              
              <SandboxTabsContent value="preview" className="h-full">
                <SandboxPreview style={{ height: "100%" }} />
              </SandboxTabsContent>
              
              <SandboxTabsContent value="console" className="h-full">
                <SandboxConsole />
              </SandboxTabsContent>
            </SandboxLayout>
          </SandboxTabs>
        </SandboxProvider>
      </div>
    );
  }

  // For read-only or non-web languages, use CodeBlock
  if (isReadonly) {
    return (
      <div className="h-full overflow-auto">
        <CodeBlock
          data={[{ language: shikiLang, filename: title || `code.${language}`, code: content }]}
          defaultValue={shikiLang}
        >
          <CodeBlockHeader className="bg-chocolate-50 dark:bg-chocolate-900 border-b border-chocolate-200 dark:border-chocolate-700">
            <div className="flex items-center gap-2 px-3 text-sm text-neutral-800 dark:text-neutral-200">
              <FileCode className="w-4 h-4" />
              <span>{title || `code.${language}`}</span>
            </div>
            <div className="ml-auto">
              <CodeBlockCopyButton />
            </div>
          </CodeBlockHeader>
          <CodeBlockBody>
            {(item) => (
              <CodeBlockItem key={item.language} value={item.language}>
                <CodeBlockContent language={item.language as BundledLanguage}>
                  {item.code}
                </CodeBlockContent>
              </CodeBlockItem>
            )}
          </CodeBlockBody>
        </CodeBlock>
      </div>
    );
  }

  // Editable fallback for non-web languages
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <textarea
          value={localContent}
          onChange={(e) => {
            setLocalContent(e.target.value);
            onSave?.(e.target.value);
          }}
          className="w-full h-full p-4 font-mono text-sm bg-neutral-900 text-white resize-none focus:outline-none"
          spellCheck={false}
          aria-label="Code editor"
          placeholder="Enter code..."
        />
      </div>
      
      {language === "python" && (
        <div className="border-t border-chocolate-200 dark:border-chocolate-700">
          <div className="p-2 flex items-center gap-2 bg-chocolate-50 dark:bg-chocolate-900">
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-chocolate-50 bg-chocolate-700 hover:bg-chocolate-800 disabled:opacity-50 rounded-md transition-colors"
            >
              {isRunning ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isRunning ? "Running..." : "Run"}
            </button>
          </div>
          
          {output && (
            <div className="p-4 bg-neutral-900 text-white font-mono text-sm max-h-48 overflow-auto">
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
        <pre className="whitespace-pre-wrap font-sans text-neutral-900 dark:text-white">{content}</pre>
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
      className="w-full h-full p-4 text-sm text-neutral-900 dark:text-white bg-white dark:bg-neutral-950 resize-none focus:outline-none"
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
            className="p-1.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-chocolate-100 dark:hover:bg-chocolate-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous version"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-neutral-700 dark:text-neutral-300 px-1">
            {(currentVersionIndex || 0) + 1} / {totalVersions}
          </span>
          <button
            type="button"
            onClick={() => onVersionChange?.("next")}
            disabled={currentVersionIndex === totalVersions - 1}
            className="p-1.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-chocolate-100 dark:hover:bg-chocolate-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next version"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-chocolate-200 dark:bg-chocolate-700 mx-1" />
        </>
      )}
      
      <button
        type="button"
        onClick={handleCopy}
        className="p-1.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-chocolate-100 dark:hover:bg-chocolate-800 rounded-lg transition-colors"
        title="Copy to clipboard"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
      
      <button
        type="button"
        onClick={handleDownload}
        className="p-1.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-chocolate-100 dark:hover:bg-chocolate-800 rounded-lg transition-colors"
        title="Download"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}

// Main Artifact Panel Component - Inline split layout version
function PureArtifactPanel({
  className,
  isReadonly = false,
}: {
  className?: string;
  isReadonly?: boolean;
}) {
  const { artifact, closeArtifact, setArtifact } = useArtifact();

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
    <div
      className={cn(
        "h-full w-full bg-white dark:bg-chocolate-950 flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-chocolate-100 dark:border-chocolate-800 bg-chocolate-50/80 dark:bg-chocolate-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-chocolate-100 dark:bg-chocolate-800 text-neutral-700 dark:text-neutral-300">
            <KindIcon kind={artifact.kind} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
              {artifact.title || "Untitled"}
            </h2>
            <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              {artifact.kind === "code" && (
                <span className="px-1.5 py-0.5 bg-chocolate-100 dark:bg-chocolate-800 rounded text-neutral-700 dark:text-neutral-300">
                  {language}
                </span>
              )}
              {artifact.status === "streaming" && (
                <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                  <Spinner className="w-3 h-3" />
                  Streaming...
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <ArtifactActions artifact={artifact} />
          
          <div className="w-px h-4 bg-chocolate-200 dark:bg-chocolate-700 mx-1" />
          
          <button
            type="button"
            onClick={closeArtifact}
            className="p-1.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-chocolate-100 dark:hover:bg-chocolate-800 rounded-lg transition-colors"
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
            title={artifact.title}
            onSave={handleContentSave}
            isReadonly={isReadonly || artifact.status === "streaming"}
            documentId={artifact.documentId}
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
    </div>
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
        "flex items-center gap-3 w-full p-3 rounded-lg border border-chocolate-200 dark:border-chocolate-700 bg-white dark:bg-chocolate-900 hover:bg-chocolate-50 dark:hover:bg-chocolate-800 hover:border-chocolate-300 dark:hover:border-chocolate-600 transition-all text-left group",
        className
      )}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chocolate-100 dark:bg-chocolate-800 text-neutral-700 dark:text-neutral-300 group-hover:bg-chocolate-200 dark:group-hover:bg-chocolate-700 transition-colors">
        <KindIcon kind={artifact.kind} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{artifact.title}</p>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {artifact.kind === "code"
            ? getLanguageFromTitle(artifact.title)
            : artifact.kind === "sheet"
            ? "Spreadsheet"
            : "Document"}
        </p>
      </div>
      <Maximize2 className="w-4 h-4 text-neutral-500 group-hover:text-neutral-700 dark:text-neutral-400 dark:group-hover:text-neutral-200 transition-colors" />
    </button>
  );
}
