export default function CategoryStorePickerSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-32 animate-pulse rounded-2xl bg-white shadow-sm"
        />
      ))}
    </div>
  );
}
