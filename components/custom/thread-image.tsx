"use client";

import { useState, useEffect, useMemo } from "react";
import { Image as AIImage } from "@/components/ai-elements/image";
import { cn } from "@/lib/utils";
import { AlertCircle, ImageIcon, Loader2 } from "lucide-react";

// Supported image MIME types
const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg", 
  "image/jpg",
  "image/webp",
  "image/gif",
];

// Thread image item structure
export interface ThreadImageItem {
  imageId: string;
  filename?: string;
  mimeType: string;
  caption?: string;
  // Payload can be URL, base64 (with or without data prefix), or blob
  payload: string;
  // Original source type for debugging
  sourceType?: "url" | "base64" | "blob" | "file_id";
}

// Props for ThreadImage component
interface ThreadImageProps {
  item: ThreadImageItem;
  className?: string;
  onError?: (imageId: string, error: string) => void;
}

// Helper to strip data URL prefix from base64
function stripDataUrlPrefix(data: string): string {
  const match = data.match(/^data:image\/[^;]+;base64,(.+)$/);
  return match ? match[1] : data;
}

// Helper to infer MIME type from filename
function inferMimeTypeFromFilename(filename?: string): string | null {
  if (!filename) return null;
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    default: return null;
  }
}

// Helper to validate if MIME type is supported
function isSupportedImageType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType.toLowerCase());
}

// Generate stable image ID from content hash or use provided
function generateImageId(payload: string, filename?: string): string {
  // Simple hash for deduplication
  let hash = 0;
  const str = payload.slice(0, 1000) + (filename || "");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `img-${Math.abs(hash).toString(36)}`;
}

// Single thread image component
export function ThreadImage({ item, className, onError }: ThreadImageProps) {
  const [imageData, setImageData] = useState<{ base64: string; mediaType: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadImage() {
      setIsLoading(true);
      setError(null);

      try {
        const { payload, mimeType, filename } = item;
        
        // Determine actual MIME type
        let actualMimeType = mimeType;
        if (!actualMimeType || !isSupportedImageType(actualMimeType)) {
          const inferred = inferMimeTypeFromFilename(filename);
          if (inferred) {
            actualMimeType = inferred;
          } else if (!actualMimeType) {
            actualMimeType = "image/png"; // Default fallback
          }
        }

        // Check if supported
        if (!isSupportedImageType(actualMimeType)) {
          throw new Error(`Unsupported image format: ${actualMimeType}`);
        }

        // Handle different payload types
        if (payload.startsWith("data:image/")) {
          // Already a data URL - strip prefix
          const base64 = stripDataUrlPrefix(payload);
          if (mounted) {
            setImageData({ base64, mediaType: actualMimeType });
          }
        } else if (payload.startsWith("http://") || payload.startsWith("https://") || payload.startsWith("/")) {
          // URL - fetch and convert to base64
          try {
            const response = await fetch(payload);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status}`);
            }
            const blob = await response.blob();
            const reader = new FileReader();
            
            const base64Promise = new Promise<string>((resolve, reject) => {
              reader.onloadend = () => {
                const result = reader.result as string;
                const base64 = stripDataUrlPrefix(result);
                resolve(base64);
              };
              reader.onerror = () => reject(new Error("Failed to read image"));
            });
            
            reader.readAsDataURL(blob);
            const base64 = await base64Promise;
            
            if (mounted) {
              setImageData({ 
                base64, 
                mediaType: blob.type || actualMimeType 
              });
            }
          } catch (fetchError) {
            throw new Error(`Failed to load image from URL: ${(fetchError as Error).message}`);
          }
        } else {
          // Assume it's already base64 without prefix
          if (mounted) {
            setImageData({ base64: payload, mediaType: actualMimeType });
          }
        }
      } catch (err) {
        const errorMessage = (err as Error).message || "Failed to load image";
        if (mounted) {
          setError(errorMessage);
          onError?.(item.imageId, errorMessage);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadImage();

    return () => {
      mounted = false;
    };
  }, [item, onError]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted rounded-lg p-4 min-h-[100px] min-w-[100px]",
        className
      )}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state - show placeholder
  if (error || !imageData) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg p-4 min-h-[100px]",
        className
      )}>
        <AlertCircle className="h-6 w-6 text-destructive" />
        <span className="text-xs text-destructive text-center">
          Couldn&apos;t render attachment{item.filename ? ` "${item.filename}"` : ""}
        </span>
        {error && (
          <span className="text-xs text-muted-foreground text-center">{error}</span>
        )}
      </div>
    );
  }

  // Render using AI Elements Image component
  return (
    <div className={cn("relative group", className)}>
      <AIImage
        base64={imageData.base64}
        mediaType={imageData.mediaType}
        uint8Array={new Uint8Array([])}
        alt={item.caption || item.filename || "Attached image"}
        className="max-h-[300px] w-auto rounded-lg border border-border shadow-sm"
      />
      {item.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
          {item.caption}
        </div>
      )}
    </div>
  );
}

// Props for ThreadImageGallery
interface ThreadImageGalleryProps {
  items: ThreadImageItem[];
  className?: string;
}

// Gallery component for multiple images with deduplication
export function ThreadImageGallery({ items, className }: ThreadImageGalleryProps) {
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  // Deduplicate images by imageId while preserving order
  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter(item => {
      if (seen.has(item.imageId)) return false;
      seen.add(item.imageId);
      return true;
    });
  }, [items]);

  const handleError = (imageId: string, error: string) => {
    setErrors(prev => new Map(prev).set(imageId, error));
  };

  if (uniqueItems.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {uniqueItems.map((item, index) => (
        <ThreadImage
          key={item.imageId}
          item={item}
          onError={handleError}
        />
      ))}
    </div>
  );
}

// Helper to extract image items from message attachments
export function extractImageAttachments(
  attachments?: Array<{
    url?: string;
    name?: string;
    contentType?: string;
    fileName?: string;
    mediaType?: string;
    base64?: string;
    payload?: string;
    file_id?: string;
  }>
): ThreadImageItem[] {
  if (!attachments || attachments.length === 0) return [];

  return attachments
    .filter(att => {
      // Check if it's an image attachment
      const type = att.contentType || att.mediaType || "";
      const name = att.name || att.fileName || "";
      const hasImageType = type.startsWith("image/");
      const hasImageExtension = /\.(png|jpe?g|gif|webp)$/i.test(name);
      const hasPayload = !!(att.url || att.base64 || att.payload);
      
      return (hasImageType || hasImageExtension) && hasPayload;
    })
    .map((att, index) => {
      const payload = att.base64 || att.payload || att.url || "";
      const filename = att.name || att.fileName;
      const mimeType = att.contentType || att.mediaType || 
        inferMimeTypeFromFilename(filename) || "image/png";
      
      return {
        imageId: att.file_id || generateImageId(payload, filename),
        filename,
        mimeType,
        caption: filename || `Image ${index + 1}`,
        payload,
        sourceType: att.base64 ? "base64" : att.url ? "url" : "base64",
      } as ThreadImageItem;
    });
}

// Helper to extract images from message parts (for inline images)
export function extractImageParts(
  parts?: Array<{
    type: string;
    image?: string;
    data?: string;
    mimeType?: string;
    url?: string;
  }>
): ThreadImageItem[] {
  if (!parts || parts.length === 0) return [];

  return parts
    .filter(part => part.type === "image" || part.type?.startsWith("image/"))
    .map((part, index) => {
      const payload = part.image || part.data || part.url || "";
      const mimeType = part.mimeType || part.type || "image/png";
      
      return {
        imageId: generateImageId(payload),
        mimeType: mimeType.startsWith("image/") ? mimeType : `image/${mimeType}`,
        caption: `Image ${index + 1}`,
        payload,
        sourceType: part.url ? "url" : "base64",
      } as ThreadImageItem;
    });
}
