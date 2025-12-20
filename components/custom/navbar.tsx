"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { History } from "./history";
import { SlashIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { MCPSettings } from "./mcp-settings";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export const Navbar = () => {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const res = await authClient.$fetch("/sign-out", { method: "POST" });
      if (res?.error) {
        throw new Error(res.error.message || "Failed to sign out");
      }
      toast.success("Signed out");
      router.refresh();
      router.push("/");
    } catch (error) {
      toast.error((error as Error).message || "Failed to sign out");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="bg-background absolute top-0 left-0 w-dvw py-2 px-3 justify-between flex flex-row items-center z-30">
      <div className="flex flex-row gap-3 items-center">
        <History user={session?.user as any} />
        <div className="flex flex-row gap-2 items-center">
          <Image
            src="/images/black-dots-transparent.svg"
            height={20}
            width={20}
            alt="logo"
          />
          <div className="text-chocolate-500">
            <SlashIcon size={16} />
          </div>
          <div className="text-sm dark:text-chocolate-300 truncate w-28 md:w-fit font-medium tracking-tight">
            Opulent Chatbot
          </div>
        </div>
      </div>

      {session ? (
        <div className="flex items-center gap-2">
          <MCPSettings variant="compact" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="py-1.5 px-2 h-fit font-normal"
                variant="secondary"
                disabled={signingOut}
              >
                {session.user?.email}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <ThemeToggle />
              </DropdownMenuItem>
              <DropdownMenuItem className="p-1 z-50">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full text-left px-1 py-0.5 text-red-500"
                  disabled={signingOut}
                >
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <Button className="py-1.5 px-2 h-fit font-normal text-white" asChild>
          <Link href="/login">Login</Link>
        </Button>
      )}
    </div>
  );
};

