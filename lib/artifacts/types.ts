export const artifactKinds = ["text", "code", "sheet"] as const;
export type ArtifactKind = (typeof artifactKinds)[number];

export interface Artifact {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  language?: string;
  createdAt: number;
  updatedAt: number;
  messageId?: string;
}

export interface ArtifactToolResult {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
}

export interface CodeExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  chart?: {
    base64: string;
    format: string;
  };
}

export function getLanguageFromTitle(title: string): string {
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
    scala: "scala",
    r: "r",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "zsh",
    yml: "yaml",
    yaml: "yaml",
    json: "json",
    xml: "xml",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    md: "markdown",
    txt: "text",
  };
  return languageMap[extension || ""] || "text";
}
