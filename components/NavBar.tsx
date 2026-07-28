import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
      <Link href={user ? "/dashboard" : "/"} className="text-lg font-semibold">
        汉字 Flashcards
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <span className="text-zinc-500">{user.email}</span>
            <form action={logout}>
              <button type="submit" className="hover:underline">
                Log out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:underline">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-foreground px-3 py-1.5 text-background"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
