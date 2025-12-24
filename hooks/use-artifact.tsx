"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ArtifactKind } from "@/lib/artifacts/types";

export interface UIArtifact {
  documentId: string;
  content: string;
  kind: ArtifactKind;
  title: string;
  messageId: string;
  status: "streaming" | "idle";
  isVisible: boolean;
  language?: string;
}

const initialArtifactData: UIArtifact = {
  documentId: "init",
  content: "",
  kind: "text",
  title: "",
  messageId: "",
  status: "idle",
  isVisible: false,
};

type Selector<T> = (state: UIArtifact) => T;

type ArtifactContextType = {
  artifact: UIArtifact;
  setArtifact: (
    updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact)
  ) => void;
  metadata: Record<string, Record<string, unknown> | null> | null;
  setMetadata: (
    documentId: string,
    metadata:
      | Record<string, unknown>
      | null
      | ((current: Record<string, unknown> | null) => Record<string, unknown> | null)
  ) => void;
};

const ArtifactContext = createContext<ArtifactContextType | undefined>(
  undefined
);

export function ArtifactProvider({ children }: { children: ReactNode }) {
  const [artifact, setArtifactState] = useState<UIArtifact>(initialArtifactData);
  const [metadataStore, setMetadataStore] = useState<Record<string, Record<string, unknown> | null>>({});

  const setArtifact = useCallback(
    (updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact)) => {
      setArtifactState((currentArtifact) => {
        if (typeof updaterFn === "function") {
          return updaterFn(currentArtifact);
        }
        return updaterFn;
      });
    },
    []
  );

  const setMetadata = useCallback(
    (
      documentId: string,
      metadata:
        | Record<string, unknown>
        | null
        | ((current: Record<string, unknown> | null) => Record<string, unknown> | null)
    ) => {
      setMetadataStore((current) => ({
        ...current,
        [documentId]:
          typeof metadata === "function"
            ? metadata(current ? current[documentId] : null)
            : metadata,
      }));
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      artifact,
      setArtifact,
      metadata: metadataStore,
      setMetadata,
    }),
    [artifact, setArtifact, metadataStore, setMetadata]
  );

  return (
    <ArtifactContext.Provider value={contextValue}>
      {children}
    </ArtifactContext.Provider>
  );
}

function useArtifactContext() {
  const context = useContext(ArtifactContext);
  if (!context) {
    throw new Error("Artifact hooks must be used within ArtifactProvider");
  }
  return context;
}

export function useArtifactSelector<T>(selector: Selector<T>) {
  const { artifact } = useArtifactContext();
  const selectedValue = useMemo(() => selector(artifact), [artifact, selector]);
  return selectedValue;
}

export function useArtifact() {
  const {
    artifact,
    setArtifact,
    metadata: metadataStore,
    setMetadata: setMetadataStore,
  } = useArtifactContext();

  const metadata = useMemo(
    () => (artifact.documentId ? metadataStore?.[artifact.documentId] : null),
    [metadataStore, artifact.documentId]
  );

  const setMetadata = useCallback(
    (
      metadataArg:
        | Record<string, unknown>
        | null
        | ((current: Record<string, unknown> | null) => Record<string, unknown> | null)
    ) => {
      if (artifact.documentId) {
        setMetadataStore(artifact.documentId, metadataArg);
      }
    },
    [artifact.documentId, setMetadataStore]
  );

  const resetArtifact = useCallback(() => {
    setArtifact(initialArtifactData);
  }, [setArtifact]);

  const closeArtifact = useCallback(() => {
    setArtifact(() => ({
      ...initialArtifactData,
      status: "idle",
    }));
  }, [setArtifact]);

  const openArtifact = useCallback(
    (artifactData: Partial<UIArtifact> & { documentId: string }) => {
      setArtifact((current) => ({
        ...current,
        ...artifactData,
        isVisible: true,
        status: artifactData.status || "idle",
      }));
    },
    [setArtifact]
  );

  return useMemo(
    () => ({
      artifact,
      setArtifact,
      resetArtifact,
      closeArtifact,
      openArtifact,
      metadata,
      setMetadata,
    }),
    [artifact, setArtifact, metadata, setMetadata, resetArtifact, closeArtifact, openArtifact]
  );
}
