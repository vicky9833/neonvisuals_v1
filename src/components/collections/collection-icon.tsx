/**
 * Maps a collection's lucide icon name (from buckets.ts) to a rendered icon.
 * Server-safe. Falls back to Gift.
 */
import {
  CalendarHeart,
  Contact,
  Cpu,
  Crown,
  Gift,
  GraduationCap,
  Handshake,
  type LucideIcon,
  PackageOpen,
  PartyPopper,
  Sparkles,
  Sprout,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  PackageOpen,
  CalendarHeart,
  Crown,
  Sparkles,
  Handshake,
  Gift,
  Cpu,
  Sprout,
  PartyPopper,
  GraduationCap,
  Contact,
};

export function CollectionIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const Icon = (name && ICONS[name]) || Gift;
  return <Icon className={className} aria-hidden="true" />;
}
