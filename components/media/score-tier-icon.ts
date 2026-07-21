import { Angry, Frown, Meh, Smile, Laugh, Star, Flame, type LucideIcon } from "lucide-react";
import { tierForScore } from "@/lib/rating";

/** An expressive face/mark per score tier — the icon that changes as you rate. */
const TIER_ICON: Record<string, LucideIcon> = {
  terrible: Angry,
  bad: Frown,
  meh: Meh,
  good: Smile,
  great: Laugh,
  excellent: Star,
  peak: Flame,
  unrated: Meh,
};

/** The tier icon for a 0–10 score. */
export function scoreTierIcon(score?: number | null): LucideIcon {
  return TIER_ICON[tierForScore(score).key] ?? Meh;
}
