export default function Loading() {
  return (
    <div className="container pt-24">
      <div className="skeleton h-[40vh] min-h-[280px] w-full rounded-4xl" />
      <div className="mt-8 flex gap-4 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[2/3] w-[176px] shrink-0 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
