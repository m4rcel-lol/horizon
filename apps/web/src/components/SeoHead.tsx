import { useEffect } from "react";

type Props = {
  title: string;
  description?: string;
  url?: string;
  image?: string;
  type?: "website" | "article" | "profile";
};

/**
 * Client-side document meta for link previews and browser tabs.
 * Crawlers that execute JS will see these; for pure bot OG cards, the host
 * Caddy/API can still serve dedicated HTML later.
 */
export function SeoHead({
  title,
  description = "Horizon — a self-hosted community timeline.",
  url,
  image = "/assets/logo.svg",
  type = "website",
}: Props) {
  useEffect(() => {
    const fullTitle = title.includes("Horizon") ? title : `${title} · Horizon`;
    document.title = fullTitle;

    const tags: Record<string, string> = {
      description,
      "og:title": fullTitle,
      "og:description": description,
      "og:type": type,
      "og:image": image.startsWith("http") ? image : `${window.location.origin}${image}`,
      "twitter:card": "summary",
      "twitter:title": fullTitle,
      "twitter:description": description,
      "twitter:image": image.startsWith("http") ? image : `${window.location.origin}${image}`,
    };
    if (url) {
      tags["og:url"] = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    }

    const nodes: HTMLElement[] = [];
    for (const [key, value] of Object.entries(tags)) {
      // Open Graph uses `property`; Twitter's cards are read from `name`.
      const isOg = key.startsWith("og:");
      let el = document.head.querySelector(
        isOg ? `meta[property="${key}"]` : `meta[name="${key}"]`,
      ) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (isOg) el.setAttribute("property", key);
        else el.setAttribute("name", key);
        document.head.appendChild(el);
        nodes.push(el);
      }
      el.setAttribute("content", value);
    }
    return () => {
      /* leave tags for next navigation; SeoHead will overwrite */
    };
  }, [title, description, url, image, type]);

  return null;
}
