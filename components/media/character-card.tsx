import Image from "next/image";
import { User } from "lucide-react";

interface CharacterCardProps {
  name: string | null;
  image: string | null;
  role: string;
  /** Japanese voice actor, when the title has one. */
  actorName?: string | null;
  actorImage?: string | null;
}

/**
 * Character ↔ voice-actor pairing. The character reads from the left and the
 * actor from the right, mirroring how the two relate, with both faces shown
 * when available. Falls back cleanly when art or an actor is missing.
 */
export function CharacterCard({ name, image, role, actorName, actorImage }: CharacterCardProps) {
  return (
    <div className="glass flex min-w-0 items-stretch gap-2 overflow-hidden rounded-2xl p-2">
      {/* character */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Avatar src={image} alt="" />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">{name ?? "Unknown"}</p>
          <p className="truncate text-[11px] capitalize text-white/40">{role.toLowerCase()}</p>
        </div>
      </div>

      {/* voice actor */}
      {actorName && (
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5 text-right">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white/80">{actorName}</p>
            <p className="truncate text-[11px] text-white/35">Japanese</p>
          </div>
          <Avatar src={actorImage ?? null} alt="" />
        </div>
      )}
    </div>
  );
}

function Avatar({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-abyss-700 ring-1 ring-white/10">
      {src ? (
        <Image src={src} alt={alt} fill sizes="48px" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/25">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
