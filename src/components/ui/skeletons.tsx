const p = "animate-pulse bg-slate-200 rounded";

function Row({ w1 = "w-40", w2 = "w-24", w3 = "w-40", w4 = "w-20" }: { w1?: string; w2?: string; w3?: string; w4?: string }) {
  return (
    <div className="flex gap-6 py-3.5 border-b border-slate-50 last:border-0">
      <div className={`h-4 ${w1} ${p}`} />
      <div className={`h-4 ${w2} ${p}`} />
      <div className={`h-4 ${w3} ${p} hidden md:block`} />
      <div className={`h-4 ${w4} ${p} ml-auto`} />
    </div>
  );
}

export function TablePageSkeleton({ rows = 7, hasSearch = true }: { rows?: number; hasSearch?: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className={`h-8 w-44 ${p} mb-2`} />
          <div className={`h-4 w-32 ${p}`} />
        </div>
        <div className={`h-10 w-36 ${p}`} />
      </div>
      {hasSearch && <div className={`h-10 w-full sm:max-w-sm ${p} mb-4`} />}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-2">
        <div className={`flex gap-6 py-3.5 border-b-2 border-slate-100`}>
          {["w-40", "w-24", "w-40", "w-20"].map((w, i) => (
            <div key={i} className={`h-3 ${w} ${p}`} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => <Row key={i} />)}
      </div>
    </div>
  );
}

export function DetailPageSkeleton({ cards = 2, rowsPerCard = 4 }: { cards?: number; rowsPerCard?: number }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className={`h-4 w-20 ${p} mb-2`} />
          <div className={`h-8 w-56 ${p}`} />
        </div>
        <div className="flex gap-2">
          <div className={`h-10 w-20 ${p}`} />
          <div className={`h-10 w-24 ${p}`} />
        </div>
      </div>
      <div className={`grid grid-cols-1 ${cards >= 2 ? "lg:grid-cols-2" : ""} gap-4`}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className={`h-5 w-36 ${p} mb-4`} />
            <div className="space-y-3">
              {Array.from({ length: rowsPerCard }).map((_, j) => (
                <div key={j} className="flex justify-between">
                  <div className={`h-4 w-20 ${p}`} />
                  <div className={`h-4 w-32 ${p}`} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormPageSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div>
      <div className="mb-6">
        <div className={`h-8 w-52 ${p} mb-2`} />
        <div className={`h-4 w-72 ${p}`} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="space-y-5">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i}>
              <div className={`h-4 w-28 ${p} mb-2`} />
              <div className={`h-10 w-full ${p}`} />
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <div className={`h-10 w-24 ${p}`} />
            <div className={`h-10 w-32 ${p}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className={`h-8 w-64 ${p} mb-2`} />
        <div className={`h-4 w-48 ${p}`} />
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${p}`} />
            </div>
            <div className={`h-9 w-16 ${p} mb-1`} />
            <div className={`h-4 w-28 ${p} mb-1`} />
            <div className={`h-3 w-36 ${p}`} />
          </div>
        ))}
      </div>
      {/* Quick actions + status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className={`h-5 w-32 ${p} mb-4`} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`h-20 rounded-xl ${p}`} />
            ))}
          </div>
        </div>
        <div className={`rounded-2xl ${p} h-48`} />
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 rounded-2xl ${p} h-64`} />
        <div className={`rounded-2xl ${p} h-64`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 rounded-2xl ${p} h-64`} />
        <div className={`rounded-2xl ${p} h-64`} />
      </div>
    </div>
  );
}

export function SimplePageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      <div className="mb-6">
        <div className={`h-8 w-48 ${p} mb-2`} />
        <div className={`h-4 w-64 ${p}`} />
      </div>
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`h-24 w-full rounded-xl ${p}`} />
        ))}
      </div>
    </div>
  );
}
