export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-24 rounded-lg border border-slate-200 bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
        <div className="h-80 rounded-lg border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
