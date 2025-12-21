"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthForm } from "@/components/custom/auth-form";
import { SubmitButton } from "@/components/custom/submit-button";
import { authClient, ensureConvexToken } from "@/lib/auth-client";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { refetch } = authClient.useSession();

  const handleSubmit = async (formData: FormData) => {
    const emailValue = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;
    setEmail(emailValue);

    if (!emailValue || !password) {
      toast.error("Email and password are required");
      return;
    }

    setIsLoading(true);
    try {
      const callbackURL =
        process.env.NODE_ENV === "production" && typeof window !== "undefined"
          ? window.location.origin
          : undefined;
      const name = emailValue.split("@")[0] || "User";
      const res = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          email: emailValue,
          password,
          rememberMe: true,
          callbackURL,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.error?.message || body?.error || "Failed to create account";
        throw new Error(message);
      }

      await refetch();
      await ensureConvexToken();
      toast.success("Account created successfully");
      router.refresh();
      router.push("/");
    } catch (error) {
      const msg = (error as Error).message || "Failed to create account";
      toast.error(msg.includes("409") ? "Account already exists" : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl gap-12 flex flex-col">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign Up</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Create an account with your email and password
          </p>
        </div>
        <AuthForm onSubmit={handleSubmit} defaultEmail={email}>
          <SubmitButton isLoading={isLoading}>Sign Up</SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {"Already have an account? "}
            <Link
              href="/login"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign in
            </Link>
            {" instead."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
