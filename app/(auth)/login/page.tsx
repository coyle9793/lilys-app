"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-background p-8 dark:border-white/10">
        <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15"
            />
          </label>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-60"
          >
            {pending ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="mt-4 text-sm text-zinc-500">
          No account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
