import Link from "next/link";

const TABS = [
  { key: "home", href: "/dashboard", label: "Home" },
  { key: "decks", href: "/decks", label: "Decks" },
  { key: "folders", href: "/folders", label: "Folders" },
] as const;

export default function HomeNav({ active }: { active: "home" | "decks" | "folders" }) {
  return (
    <nav className="mb-6 flex gap-5 text-sm">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={isActive ? "font-semibold" : "text-zinc-500 hover:underline dark:text-zinc-400"}
            style={isActive ? { color: "var(--accent-btn-text)" } : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
