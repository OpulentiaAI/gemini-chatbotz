// AI Elements - Reusable components for AI chat interfaces
// Core UI components
export { Shimmer } from "./shimmer";
export { ThinkingMessage, StreamingIndicator } from "./thinking-message";

// Reasoning/Thinking components
export { 
  Reasoning, 
  ReasoningTrigger, 
  ReasoningContent,
  useReasoning,
  type ReasoningProps,
  type ReasoningTriggerProps,
  type ReasoningContentProps,
} from "./reasoning";

// Tool components
export { 
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
  type ToolProps,
  type ToolHeaderProps,
  type ToolContentProps,
  type ToolInputProps,
  type ToolOutputProps,
} from "./tool";

// Code block components
export {
  CodeBlock,
  CodeBlockCopyButton,
  highlightCode,
  type CodeBlockCopyButtonProps,
} from "./code-block";

// Message components  
export {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
  MessageResponse,
  MessageBranch,
  MessageBranchContent,
  MessageBranchSelector,
  MessageBranchPrevious,
  MessageBranchNext,
  MessageBranchPage,
  MessageAttachment,
  MessageAttachments,
  MessageToolbar,
  type MessageProps,
  type MessageContentProps,
  type MessageActionsProps,
  type MessageActionProps,
  type MessageResponseProps,
  type MessageBranchProps,
  type MessageBranchContentProps,
  type MessageBranchSelectorProps,
  type MessageBranchPreviousProps,
  type MessageBranchNextProps,
  type MessageBranchPageProps,
  type MessageAttachmentProps,
  type MessageAttachmentsProps,
  type MessageToolbarProps,
} from "./message";

// Conversation components
export {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  type ConversationProps,
  type ConversationContentProps,
  type ConversationEmptyStateProps,
  type ConversationScrollButtonProps,
} from "./conversation";

// Artifact components
export {
  Artifact,
  ArtifactHeader,
  ArtifactClose,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
  type ArtifactProps,
  type ArtifactHeaderProps,
  type ArtifactCloseProps,
  type ArtifactTitleProps,
  type ArtifactDescriptionProps,
  type ArtifactActionsProps,
  type ArtifactActionProps,
  type ArtifactContentProps,
} from "./artifact";

// Loader components
export {
  Loader,
  type LoaderProps,
} from "./loader";

// Sources components
export {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
  type SourcesProps,
  type SourcesTriggerProps,
  type SourcesContentProps,
  type SourceProps,
} from "./sources";

// Suggestion components
export {
  Suggestions,
  Suggestion,
  type SuggestionsProps,
  type SuggestionProps,
} from "./suggestion";

// Task components
export {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
  TaskItemFile,
  type TaskProps,
  type TaskTriggerProps,
  type TaskContentProps,
  type TaskItemProps,
  type TaskItemFileProps,
} from "./task";

// Browserbase Preview components
export {
  BrowserbasePreview,
  BrowserbasePreviewHeader,
  BrowserbasePreviewNavigation,
  BrowserbasePreviewBody,
  BrowserbasePreviewToolView,
  useBrowserbasePreview,
  type BrowserbasePreviewProps,
  type BrowserbasePreviewHeaderProps,
  type BrowserbasePreviewNavigationProps,
  type BrowserbasePreviewBodyProps,
  type BrowserbasePreviewToolViewProps,
  type BrowserbaseSessionStatus,
  type BrowserbasePreviewContextValue,
} from "./browserbase-preview";

// Web Preview components
export {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
  WebPreviewBody,
  WebPreviewConsole,
  type WebPreviewProps,
  type WebPreviewNavigationProps,
  type WebPreviewNavigationButtonProps,
  type WebPreviewUrlProps,
  type WebPreviewBodyProps,
  type WebPreviewConsoleProps,
} from "./web-preview";
