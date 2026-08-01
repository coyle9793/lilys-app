import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/queries";
import { logout } from "@/lib/actions/auth";
import ThemeSettings from "./ThemeSettings";
import { HomeIcon } from "./icons";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Falls back to zeros (rather than a broken nav bar) for accounts that
  // haven't run the coins/streak migrations yet.
  const profile = user
    ? await getProfile(supabase, user.id).catch(() => ({ coins: 0, currentStreak: 0, longestStreak: 0 }))
    : { coins: 0, currentStreak: 0, longestStreak: 0 };

  return (
    <header
      className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10"
      style={{ background: "var(--accent-nav-bg)" }}
    >
      <Link
        href={user ? "/dashboard" : "/"}
        className="text-lg font-semibold"
        style={{ color: "var(--accent-btn-text)" }}
      >
        汉字 Flashcards
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-background px-3 py-1 text-xs font-semibold dark:border-white/15"
            >
              <HomeIcon />
              Dashboard
            </Link>
            {profile.currentStreak > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-background px-3 py-1 text-xs font-semibold dark:border-white/15"
                title="Current study streak — study any day to keep it going"
              >
                🔥 {profile.currentStreak}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-background px-3 py-1 text-xs font-semibold dark:border-white/15"
              title="Coins — earned by completing study sessions of more than 10 cards, or by taking exams"
            >
              🪙 {profile.coins}
            </span>
            <ThemeSettings />
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
