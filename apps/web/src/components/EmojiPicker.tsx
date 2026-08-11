import { useEffect, useRef, useState } from "react";

/**
 * A small, offline emoji picker.
 *
 * Deliberately a fixed list rather than a dependency: the full Unicode set is
 * megabytes, needs a search index, and a composer needs the handful people
 * actually reach for. Grouped so they are findable without one.
 */
const GROUPS: { label: string; emoji: string[] }[] = [
  {
    label: "Smileys",
    emoji: "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 😐 😑 😶 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐".split(" "),
  },
  {
    label: "Feelings",
    emoji: "😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 💀 💩 🤡 👻 👽 🤖".split(" "),
  },
  {
    label: "Gestures",
    emoji: "👍 👎 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👋 🤚 🖐️ ✋ 🖖 👏 🙌 🫶 🤝 🙏 💪 🫡 🤷 🤦".split(" "),
  },
  {
    label: "Hearts",
    emoji: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 ✨ ⭐ 🌟 💫 🔥 💥 💯 ✅ ❌ ⚠️ 🎉 🎊".split(" "),
  },
  {
    label: "Things",
    emoji: "☕ 🍵 🍺 🍻 🥂 🍕 🍔 🍟 🌮 🍿 🍩 🍪 🎂 🍎 🍌 🍇 🌍 🌙 ☀️ ⛅ 🌧️ ❄️ 🚀 ✈️ 🚗 ⚽ 🎮 🎧 📷 💻 📱 📚 ✏️ 🔗 📌 🕰️".split(" "),
  },
];

export function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const [group, setGroup] = useState(0);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (panel.current && !panel.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label="Choose an emoji"
      className="absolute left-0 top-full mt-2 z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-xl overflow-hidden animate-pop-in"
      style={{
        background: "var(--color-bg)",
        borderColor: "var(--color-border)",
        boxShadow: "0 0 15px rgba(0,0,0,0.2)",
      }}
    >
      <div
        className="flex border-b overflow-x-auto"
        style={{ borderColor: "var(--color-border)" }}
        role="tablist"
      >
        {GROUPS.map((g, i) => (
          <button
            key={g.label}
            type="button"
            role="tab"
            aria-selected={group === i}
            onClick={() => setGroup(i)}
            className="px-3 py-2 text-[13px] font-bold whitespace-nowrap"
            style={{
              color: group === i ? "var(--color-primary)" : "var(--color-text-secondary)",
              borderBottom: group === i ? "2px solid var(--color-primary)" : "2px solid transparent",
            }}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="p-2 max-h-[220px] overflow-y-auto grid grid-cols-8 gap-1">
        {GROUPS[group].emoji.map((e) => (
          <button
            key={e}
            type="button"
            className="text-[20px] leading-none h-9 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            onClick={() => onPick(e)}
            aria-label={`Insert ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
