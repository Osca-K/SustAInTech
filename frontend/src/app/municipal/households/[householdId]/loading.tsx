import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";

export default function HouseholdDetailsLoading() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-4 w-36 rounded bg-slate-200" />
            <div className="mt-4 h-8 w-56 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-72 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" />
            <div className="h-72 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {["latest", "average", "highest", "total"].map((item) => (
              <div
                key={item}
                className="h-28 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="h-3 w-24 rounded bg-slate-200" />
                <div className="mt-4 h-7 w-20 rounded bg-slate-200" />
              </div>
            ))}
          </div>
          <div className="h-96 rounded-lg border border-slate-200 bg-white shadow-sm" />
        </div>
      </main>
    </div>
  );
}
