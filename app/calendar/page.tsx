import { CalendarDays } from "lucide-react";
import { getAiring, type AiringItem } from "@/lib/anilist/client";
import { toTenScale } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarAgenda, type DayItem } from "@/components/calendar/calendar-agenda";

export const metadata = { title: "Calendar" };
export const revalidate = 900;

const DAY_MS = 86400 * 1000;
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function collectWeek(start: number, end: number): Promise<AiringItem[]> {
  const all: AiringItem[] = [];
  try {
    for (let page = 1; page <= 6; page++) {
      const { items, hasNextPage } = await getAiring(start, end, page);
      all.push(...items);
      if (!hasNextPage) break;
    }
  } catch {
    /* transient hiccup — render what we have */
  }
  return all.filter((i) => !i.media.isAdult);
}

export default async function CalendarPage() {
  // Start at the beginning of *today* (not now) so episodes that already aired
  // earlier today are still included.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = Math.floor(today.getTime() / 1000);
  const end = start + 7 * 86400;

  const items = await collectWeek(start, end);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getTime() + i * DAY_MS);
    return {
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : WEEKDAY[date.getDay()],
      dateLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      items: [] as DayItem[],
    };
  });

  for (const it of items) {
    const airDate = new Date(it.airingAt * 1000);
    airDate.setHours(0, 0, 0, 0);
    const offset = Math.round((airDate.getTime() - today.getTime()) / DAY_MS);
    if (offset < 0 || offset >= 7) continue;
    days[offset].items.push({
      id: it.id,
      mediaId: it.media.id,
      title: it.media.title.english || it.media.title.romaji || "",
      cover: it.media.coverImage.large,
      time: new Date(it.airingAt * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      episode: it.episode,
      score: toTenScale(it.media.averageScore),
    });
  }

  for (const d of days) d.items.sort((a, b) => a.time.localeCompare(b.time));

  const total = days.reduce((n, d) => n + d.items.length, 0);

  return (
    <div className="container max-w-3xl pb-16 pt-20 md:pt-24">
      <PageHeader
        icon={<CalendarDays className="h-5 w-5" />}
        title="Calendar"
        meta={total > 0 ? `${total} episodes · next 7 days` : "Next 7 days"}
      />
      <CalendarAgenda days={days} />
    </div>
  );
}
