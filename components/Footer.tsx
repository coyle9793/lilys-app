export default function Footer() {
  return (
    <footer
      className="border-t border-black/10 px-6 py-4 text-center text-xs text-zinc-500 dark:border-white/10"
      style={{ background: "var(--accent-btn-bg)" }}
    >
      Definitions &amp; pinyin from{" "}
      <a href="https://cc-cedict.org/" className="underline" target="_blank" rel="noopener noreferrer">
        CC-CEDICT
      </a>
      , used under CC BY-SA 4.0.
    </footer>
  );
}
