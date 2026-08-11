import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function HomeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2L2 10.5V21h7v-6h6v6h7V10.5L12 2z" />
    </svg>
  );
}

export function ExploreIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function NotificationsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
}

export function MessagesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

export function BookmarksIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

export function ListsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
    </svg>
  );
}

export function CommunitiesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

export function ProfileIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

export function ReplyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z" />
    </svg>
  );
}

export function LikeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export function RepostIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" {...props}>
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="M21 21l-5.2-5.2" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm0 6.2a2.2 2.2 0 110-4.4 2.2 2.2 0 010 4.4z" />
      <path d="M20.6 13.1l-1.4-.8a7.6 7.6 0 000-2.6l1.4-.8a1 1 0 00.4-1.3l-1.5-2.6a1 1 0 00-1.3-.4l-1.4.8a7.5 7.5 0 00-2.2-1.3V2.6a1 1 0 00-1-1h-3a1 1 0 00-1 1v1.5c-.8.3-1.6.7-2.2 1.3l-1.4-.8a1 1 0 00-1.3.4L3.2 7.6a1 1 0 00.4 1.3l1.4.8a7.6 7.6 0 000 2.6l-1.4.8a1 1 0 00-.4 1.3l1.5 2.6a1 1 0 001.3.4l1.4-.8c.6.6 1.4 1 2.2 1.3v1.5a1 1 0 001 1h3a1 1 0 001-1v-1.5c.8-.3 1.6-.7 2.2-1.3l1.4.8a1 1 0 001.3-.4l1.5-2.6a1 1 0 00-.4-1.3z" opacity=".999" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20 11H7.4l5.3-5.3-1.4-1.4L3.6 12l7.7 7.7 1.4-1.4L7.4 13H20z" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.1 5.1l1.4 1.4M17.5 17.5l1.4 1.4M18.9 5.1l-1.4 1.4M6.5 17.5l-1.4 1.4" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21 14.2A9 9 0 019.8 3 9 9 0 1021 14.2z" />
    </svg>
  );
}

export function ComposeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.7 5.3l-2-2a1 1 0 00-1.4 0L15.6 5 19 8.4l1.7-1.7a1 1 0 000-1.4zM14.2 6.4L4 16.6V20h3.4L17.6 9.8 14.2 6.4z" />
    </svg>
  );
}

export function MediaIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5v-2.6l3.5-3.5 3 3 4-4L19 15.4V19zM8.5 10a1.8 1.8 0 110-3.6 1.8 1.8 0 010 3.6z" />
    </svg>
  );
}

export function PollIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M6 20H3V10h3v10zm7.5 0h-3V4h3v16zm7.5 0h-3v-7h3v7z" />
    </svg>
  );
}

export function EmojiIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zM8.9 9.9a1.3 1.3 0 112.6 0 1.3 1.3 0 01-2.6 0zm3.6 0a1.3 1.3 0 112.6 0 1.3 1.3 0 01-2.6 0zM12 17.2c-2.2 0-4-1.4-4.5-3.2h9c-.5 1.8-2.3 3.2-4.5 3.2z" />
    </svg>
  );
}

export function ScheduleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm.9-12.5h-1.8v5.2l4.1 2.5.9-1.5-3.2-1.9V7.5z" />
    </svg>
  );
}

export function VerifiedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22.3 12l-2.2-2.6.3-3.4-3.3-.8-1.8-2.9L12 3.6 8.7 2.3 6.9 5.2l-3.3.8.3 3.4L1.7 12l2.2 2.6-.3 3.4 3.3.8 1.8 2.9 3.3-1.3 3.3 1.3 1.8-2.9 3.3-.8-.3-3.4L22.3 12zm-11.6 4.4l-3.5-3.5 1.5-1.5 2 2 4.6-4.6 1.5 1.5-6.1 6.1z" />
    </svg>
  );
}

export function SettingsGearIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a7.7 7.7 0 000-3l1.7-1.3-1.8-3.1-2 .8a7.6 7.6 0 00-2.6-1.5L14.4 3h-3.6l-.3 2.4a7.6 7.6 0 00-2.6 1.5l-2-.8-1.8 3.1 1.7 1.3a7.7 7.7 0 000 3l-1.7 1.3 1.8 3.1 2-.8a7.6 7.6 0 002.6 1.5l.3 2.4h3.6l.3-2.4a7.6 7.6 0 002.6-1.5l2 .8 1.8-3.1-1.7-1.3z" />
    </svg>
  );
}

export function NoteIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-2 6H7V7h10v2zm0 4H7v-2h10v2zm-3 4H7v-2h7v2z" />
    </svg>
  );
}
