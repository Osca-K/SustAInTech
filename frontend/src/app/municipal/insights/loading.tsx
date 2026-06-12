import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";

export default function InsightsLoading() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-40 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {["review", "high", "medium", "total"].map((item) => (
              <div
                key={item}
                className="h-28 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="h-3 w-28 rounded bg-slate-200" />
                <div className="mt-4 h-7 w-14 rounded bg-slate-200" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-10 rounded bg-slate-100" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-4">
                  <div className="h-4 rounded bg-slate-100" />
                  <div className="h-4 rounded bg-slate-100" />
                  <div className="h-4 rounded bg-slate-100 md:col-span-2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
