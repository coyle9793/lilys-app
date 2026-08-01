import { BADGES } from "@/lib/badges";
import type { BadgeStats } from "@/lib/queries";

export default function BadgesGrid({ stats }: { stats: BadgeStats }) {
  const earnedCount = BADGES.filter((b) => b.isEarned(stats)).length;

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-zinc-500">
        Badges ({earnedCount}/{BADGES.length})
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {BADGES.map((badge) => {
          const earned = badge.isEarned(stats);
          return (
            <div
              key={badge.id}
              title={badge.description}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center ${
                earned ? "border-black/10 bg-card dark:border-white/10" : "border-black/5 opacity-40 dark:border-white/5"
              }`}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-xs font-medium">{badge.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
