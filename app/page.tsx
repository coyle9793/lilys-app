import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
        Turn your Chinese slides into flashcards
      </h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        Upload a PowerPoint, PDF, or a photo of your slides. We&apos;ll pull out the
        Chinese vocabulary, add pinyin and English definitions, and let you study
        with flip cards, quizzes, and spaced repetition — free.
      </p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-foreground px-5 py-2.5 text-background"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-black/15 px-5 py-2.5 dark:border-white/15"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
