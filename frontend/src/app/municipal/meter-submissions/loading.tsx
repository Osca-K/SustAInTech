import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";

export default function MeterSubmissionsLoading() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-36 rounded-lg border border-slate-200 bg-white shadow-sm" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {["one", "two", "three", "four", "five", "six"].map((item) => (
              <div key={item} className="h-24 rounded-lg border border-slate-200 bg-white" />
            ))}
          </div>
          <div className="h-96 rounded-lg border border-slate-200 bg-white shadow-sm" />
        </div>
      </main>
    </div>
  );
}
