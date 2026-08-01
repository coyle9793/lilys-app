import { BADGES, CATEGORY_LABEL, type BadgeCategory } from "@/lib/badges";
import type { BadgeStats } from "@/lib/queries";
import {
  BoltIcon,
  CardIcon,
  ChartIcon,
  CoinIcon,
  FlameIcon,
  FolderIcon,
  NoteIcon,
  OrganizerIcon,
  StarIcon,
  TrophyIcon,
} from "@/components/icons";

const BADGE_ICON: Record<string, (props: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  "first-deck": FolderIcon,
  "first-card": CardIcon,
  "hundred-cards": ChartIcon,
  "five-hundred-cards": TrophyIcon,
  "three-day-streak": FlameIcon,
  "week-streak": BoltIcon,
  "month-streak": StarIcon,
  "note-taker": NoteIcon,
  organizer: OrganizerIcon,
  "coin-collector": CoinIcon,
};

const CATEGORIES: BadgeCategory[] = ["study", "streaks", "collection"];

export default function BadgesGrid({ stats }: { stats: BadgeStats }) {
  const earnedCount = BADGES.filter((b) => b.isEarned(stats)).length;

  return (
    <div className="w-full shrink-0 rounded-xl border border-black/10 bg-card p-4 lg:w-56">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Badges ({earnedCount}/{BADGES.length})
      </p>
      <div className="flex flex-col gap-4">
        {CATEGORIES.map((category) => (
          <div key={category}>
            <p
              className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--accent-btn-text)" }}
            >
              {CATEGORY_LABEL[category]}
            </p>
            <div className="flex flex-col gap-0.5">
              {BADGES.filter((b) => b.category === category).map((badge) => {
                const Icon = BADGE_ICON[badge.id];
                const earned = badge.isEarned(stats);
                return (
                  <div key={badge.id} title={badge.description} className="flex items-center gap-2 px-1 py-1">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                        earned ? "" : "bg-black/5 text-zinc-400 dark:bg-white/10 dark:text-zinc-600"
                      }`}
                      style={earned ? { background: "var(--accent-btn-bg)", color: "var(--accent-btn-text)" } : undefined}
                    >
                      <Icon width={15} height={15} />
                    </span>
                    <span className={`text-xs ${earned ? "font-medium" : "text-zinc-400 dark:text-zinc-500"}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
