import {
  Award,
  BookOpen,
  Cake,
  CalendarHeart,
  Compass,
  Crown,
  Flame,
  Gift,
  Hammer,
  Handshake,
  Heart,
  Leaf,
  type LucideIcon,
  Minus,
  Package,
  PackageOpen,
  Palette,
  Sparkles,
  Sprout,
  Star,
  Tent,
  Trophy,
  Users,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Maps icon name strings (from constants) to lucide components. */
const ICON_MAP: Record<string, LucideIcon> = {
  Award,
  BookOpen,
  Cake,
  CalendarHeart,
  Compass,
  Crown,
  Flame,
  Gift,
  Hammer,
  Handshake,
  Heart,
  Leaf,
  Minus,
  Package,
  PackageOpen,
  Palette,
  Sparkles,
  Sprout,
  Star,
  Tent,
  Trophy,
  Users,
  Waves,
};

interface OccasionIconProps {
  /** lucide-react icon name (see constants). */
  name: string;
  className?: string;
}

/** Renders a named lucide icon, falling back to a gift icon. */
export function OccasionIcon({ name, className }: OccasionIconProps) {
  const Icon = ICON_MAP[name] ?? Gift;
  return <Icon className={cn("size-5", className)} aria-hidden="true" />;
}
