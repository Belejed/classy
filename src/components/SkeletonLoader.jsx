import React from 'react';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-200">
      {/* Hero Announcement Shimmer */}
      <div className="rounded-2xl p-6 bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="w-40 h-6 rounded-full animate-shimmer" />
          <div className="w-28 h-5 rounded-full animate-shimmer" />
        </div>
        <div className="space-y-2">
          <div className="w-3/4 h-6 rounded-lg animate-shimmer" />
          <div className="w-full h-4 rounded-md animate-shimmer" />
          <div className="w-2/3 h-4 rounded-md animate-shimmer" />
        </div>
      </div>

      {/* 3 Metric Cards Shimmer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
            <div className="space-y-2">
              <div className="w-20 h-3 rounded-full animate-shimmer" />
              <div className="w-28 h-6 rounded-lg animate-shimmer" />
            </div>
            <div className="w-10 h-10 rounded-xl animate-shimmer" />
          </div>
        ))}
      </div>


      {/* 3 Column Grid Shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((col) => (
          <div key={col} className="p-5 rounded-2xl bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
            <div className="w-36 h-5 rounded-md animate-shimmer pb-1" />
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2">
                  <div className="w-3/4 h-4 rounded-md animate-shimmer" />
                  <div className="w-1/2 h-3 rounded-md animate-shimmer" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TasksSkeleton() {
  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1.5">
          <div className="w-48 h-7 rounded-lg animate-shimmer" />
          <div className="w-72 h-4 rounded-md animate-shimmer" />
        </div>
        <div className="w-36 h-10 rounded-xl animate-shimmer" />
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 h-10 rounded-xl animate-shimmer" />
        <div className="w-48 h-10 rounded-xl animate-shimmer" />
      </div>

      {/* Task Cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="w-24 h-4 rounded-full animate-shimmer" />
              <div className="w-3/5 h-5 rounded-md animate-shimmer" />
              <div className="w-40 h-3 rounded-md animate-shimmer" />
            </div>
            <div className="w-24 h-8 rounded-full animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="space-y-4 font-sans animate-in fade-in duration-200">
      <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="w-40 h-6 rounded-lg animate-shimmer" />
        <div className="w-32 h-9 rounded-xl animate-shimmer" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((day) => (
          <div key={day} className="p-3.5 rounded-2xl bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-20 h-4 rounded-full animate-shimmer mx-auto" />
            <div className="h-28 rounded-xl animate-shimmer" />
            <div className="h-28 rounded-xl animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default {
  DashboardSkeleton,
  TasksSkeleton,
  ScheduleSkeleton
};
