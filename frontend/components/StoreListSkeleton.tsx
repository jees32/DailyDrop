export default function StoreListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-56 animate-pulse rounded-2xl bg-white shadow-sm"
        />
      ))}
    </div>
  );
}
