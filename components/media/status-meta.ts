import {
  Play,
  RotateCcw,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import type { WatchStatus } from "@/lib/store";

/** Icon + color identity for each watch status — shared by every menu. */
export const STATUS_META: Record<
  WatchStatus,
  { icon: LucideIcon; color: string; soft: string }
> = {
  CURRENT: { icon: Play, color: "#5b8cff", soft: "rgba(91,140,255,0.16)" },
  REWATCHING: { icon: RotateCcw, color: "#8a7dff", soft: "rgba(138,125,255,0.16)" },
  COMPLETED: { icon: CheckCircle2, color: "#2fb765", soft: "rgba(47,183,101,0.16)" },
  PAUSED: { icon: PauseCircle, color: "#f0a51f", soft: "rgba(240,165,31,0.16)" },
  PLANNING: { icon: Bookmark, color: "#3fc4f7", soft: "rgba(63,196,247,0.16)" },
  DROPPED: { icon: XCircle, color: "#e25563", soft: "rgba(226,85,99,0.16)" },
};
