"use client";

import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import cx from "classnames";
import { Search } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
type MinimalUser = { id?: string | null; email?: string | null };
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import {
  InfoIcon,
  MenuIcon,
  MoreHorizontalIcon,
  PencilEditIcon,
  TrashIcon,
} from "./icons";
import { SearchChatsDialog } from "./search-chats-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";

export const History = ({ user }: { user?: MinimalUser | null }) => {
  const { id } = useParams();
  const router = useRouter();

  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [shortcutText, setShortcutText] = useState("Ctrl+K");
  
  // Use Convex query for thread history instead of old /api/history endpoint
  const threads = useQuery(
    api.chatDb.getUserThreads,
    user?.id ? { userId: user.id } : "skip"
  );
  const deleteThreadMutation = useMutation(api.chatDb.deleteThread);
  
  const isLoading = threads === undefined;
  const history = threads ?? [];

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    setShortcutText(isMac ? "Cmd+K" : "Ctrl+K");
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        if (!user) return;
        event.preventDefault();
        setIsHistoryVisible(true);
        setIsSearchOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [user]);

  useEffect(() => {
    if (!isHistoryVisible) {
      setIsSearchOpen(false);
    }
  }, [isHistoryVisible]);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await deleteThreadMutation({ threadId: deleteId });
      toast.success("Chat deleted successfully");
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast.error(`Failed to delete chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className="p-1.5 h-fit"
        onClick={() => {
          setIsHistoryVisible(true);
        }}
      >
        <MenuIcon />
      </Button>

      <Sheet
        open={isHistoryVisible}
        onOpenChange={(state) => {
          setIsHistoryVisible(state);
        }}
      >
        <SheetContent side="left" className="p-3 w-80 bg-muted">
          <SheetHeader>
            <VisuallyHidden.Root>
              <SheetTitle className="text-left">History</SheetTitle>
              <SheetDescription className="text-left">
                {history === undefined ? "loading" : history.length} chats
              </SheetDescription>
            </VisuallyHidden.Root>
          </SheetHeader>

          <div className="text-sm flex flex-row items-center justify-between">
            <div className="flex flex-row gap-2">
              <div className="dark:text-chocolate-300">History</div>

              <div className="dark:text-chocolate-400 text-chocolate-500">
                {history === undefined ? "loading" : history.length} chats
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col">
            {user && (
              <Button
                className="font-normal text-sm flex flex-row justify-between text-white"
                asChild
              >
                <Link href="/">
                  <div>Start a new chat</div>
                  <PencilEditIcon size={14} />
                </Link>
              </Button>
            )}
            {user && (
              <Button
                className="mt-2 w-full justify-between text-sm font-normal"
                variant="outline"
                onClick={() => setIsSearchOpen(true)}
              >
                <span className="flex items-center gap-2">
                  <Search className="size-4" />
                  Search chats
                </span>
                <span className="text-xs text-muted-foreground">
                  {shortcutText}
                </span>
              </Button>
            )}

            <div className="flex flex-col overflow-y-scroll p-1 h-[calc(100dvh-124px)]">
              {!user ? (
                <div className="text-chocolate-500 h-dvh w-full flex flex-row justify-center items-center text-sm gap-2">
                  <InfoIcon />
                  <div>Login to save and revisit previous chats!</div>
                </div>
              ) : null}

              {!isLoading && history?.length === 0 && user ? (
                <div className="text-chocolate-500 h-dvh w-full flex flex-row justify-center items-center text-sm gap-2">
                  <InfoIcon />
                  <div>No chats found</div>
                </div>
              ) : null}

              {isLoading && user ? (
                <div className="flex flex-col">
                  {[44, 32, 28, 52].map((item) => (
                    <div key={item} className="p-2 my-[2px]">
                      <div
                        className={`w-${item} h-[20px] rounded-md bg-chocolate-200 dark:bg-chocolate-600 animate-pulse`}
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {history?.map((thread) => (
                  <div
                    key={thread.threadId}
                    className={cx(
                      "flex flex-row items-center gap-6 hover:bg-chocolate-200 dark:hover:bg-chocolate-700 rounded-md pr-2",
                      { "bg-chocolate-200 dark:bg-chocolate-700": thread.threadId === id },
                    )}
                  >
                    <Button
                      variant="ghost"
                      className={cx(
                        "hover:bg-chocolate-200 dark:hover:bg-chocolate-700 justify-between p-0 text-sm font-normal flex flex-row items-center gap-2 pr-2 w-full transition-none",
                      )}
                      onClick={() => {
                        setIsHistoryVisible(false);
                        router.push(`/chat/${thread.threadId}`);
                      }}
                    >
                      <span className="text-ellipsis overflow-hidden text-left py-2 pl-2 rounded-lg">
                        {thread.title || "New Chat"}
                      </span>
                    </Button>

                    <DropdownMenu modal={true}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="p-0 h-fit font-normal text-chocolate-500 transition-none hover:bg-chocolate-200 dark:hover:bg-chocolate-700"
                          variant="ghost"
                        >
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="left" className="z-[60]">
                        <DropdownMenuItem asChild>
                          <Button
                            className="flex flex-row gap-2 items-center justify-start w-full h-fit font-normal p-1.5 rounded-sm"
                            variant="ghost"
                            onClick={() => {
                              setDeleteId(thread.threadId);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <TrashIcon />
                            <div>Delete</div>
                          </Button>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {user && (
        <SearchChatsDialog
          chats={history}
          isLoading={isLoading}
          onOpenChange={setIsSearchOpen}
          onSelectChat={(chatId) => {
            setIsHistoryVisible(false);
            setIsSearchOpen(false);
            router.push(`/chat/${chatId}`);
          }}
          open={isSearchOpen}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
