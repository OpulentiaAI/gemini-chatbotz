"use client";

import React, { useState } from "react";
import { Copy, Check, Download, Maximize2, Minimize2, FileCode, FileText, Table } from "lucide-react";
import { cn } from "@/lib/utils";

export type ArtifactKind = "text" | "code" | "sheet";

export interface Artifact {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  language?: string;
}

interface ArtifactViewerProps {
  artifact: Artifact;
  className?: string;
  onClose?: () => void;
}

function getLanguageFromTitle(title: string): string {
  const extension = title.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    sql: "sql",
    sh: "bash",
    yml: "yaml",
    yaml: "yaml",
    json: "json",
    xml: "xml",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
  };
  return languageMap[extension || ""] || "text";
}

function KindIcon({ kind }: { kind: ArtifactKind }) {
  switch (kind) {
    case "code":
      return <FileCode className="w-4 h-4" />;
    case "sheet":
      return <Table className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

export function ArtifactViewer({ artifact, className, onClose }: ArtifactViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const language = artifact.language || getLanguageFromTitle(artifact.title);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = artifact.title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden",
        isExpanded && "fixed inset-4 z-50",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <KindIcon kind={artifact.kind} />
          <span className="text-sm font-medium text-gray-900">{artifact.title}</span>
          {artifact.kind === "code" && (
            <span className="px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-md">
              {language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title={isExpanded ? "Minimize" : "Maximize"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className={cn("overflow-auto", isExpanded ? "h-[calc(100%-48px)]" : "max-h-[500px]")}>
        {artifact.kind === "code" ? (
          <pre className="p-4 text-sm font-mono text-gray-800 bg-gray-50 overflow-x-auto">
            <code>{artifact.content}</code>
          </pre>
        ) : artifact.kind === "sheet" ? (
          <div className="p-4">
            <SheetRenderer content={artifact.content} />
          </div>
        ) : (
          <div className="p-4 prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-gray-800">{artifact.content}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

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

export function ArtifactPreview({ artifact, onClick }: { artifact: Artifact; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-left"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600">
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
    </button>
  );
}
