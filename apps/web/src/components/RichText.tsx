import { Link } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * Turn plain post/bio text into linked @mentions and #hashtags.
 * URLs become external links. Everything else stays plain text.
 */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const nodes = parseRichText(text);
  return <span className={className}>{nodes}</span>;
}

const TOKEN =
  /(@[a-zA-Z0-9_]{1,30})|(#[\p{L}\p{N}_]{1,100})|(https?:\/\/[^\s<]+[^\s<.,;:!?"')\]])/gu;

function parseRichText(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const [raw, mention, hashtag, url] = match;
    if (mention) {
      const username = mention.slice(1);
      out.push(
        <Link
          key={key++}
          to={`/${username}`}
          className="link"
          onClick={(e) => e.stopPropagation()}
        >
          {mention}
        </Link>,
      );
    } else if (hashtag) {
      const tag = hashtag.slice(1);
      out.push(
        <Link
          key={key++}
          to={`/hashtag/${encodeURIComponent(tag)}`}
          className="link"
          onClick={(e) => e.stopPropagation()}
        >
          {hashtag}
        </Link>,
      );
    } else if (url) {
      out.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="link"
          onClick={(e) => e.stopPropagation()}
        >
          {url}
        </a>,
      );
    } else {
      out.push(raw);
    }
    last = index + raw.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
