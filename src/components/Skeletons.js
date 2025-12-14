import React from 'react';

export const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={`animate-pulse rounded-md bg-gray-200 dark:bg-white/10 ${className}`}
            {...props}
        />
    );
};

export const BatchSkeleton = () => (
    <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-white/5 h-full relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="w-16 h-6 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <div className="grid grid-cols-2 gap-2 my-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="pt-3 mt-auto border-t border-gray-100 dark:border-white/5 flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
        </div>
    </div>
);

export const TeacherSkeleton = () => (
    <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 flex flex-col justify-between h-full">
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <div className="space-y-3 mb-6 bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                <div className="flex justify-between">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
    </div>
);

export const SectionSkeleton = () => (
    <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 flex flex-col items-center justify-center space-y-3 h-32">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-20" />
    </div>
);

export const ListSkeleton = () => (
    <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-9 w-32 rounded-lg" />
            </div>
        ))}
    </div>
);

export const SectionDetailSkeleton = () => (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-[#0B0F19] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-white/5 shrink-0">
            <div className="flex items-center gap-6">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div>
                    <Skeleton className="h-3 w-32 mb-2" />
                    <Skeleton className="h-8 w-48 mb-2" />
                    <div className="flex gap-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* LEFT: Course Performance */}
            <div className="w-full md:w-80 p-6 border-r border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-black/20 shrink-0 space-y-6">
                <Skeleton className="h-6 w-40" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 space-y-3">
                            <Skeleton className="h-4 w-32" />
                            <div className="flex justify-between items-end">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-6 w-12" />
                            </div>
                            <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: Student Table */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col space-y-4">
                <Skeleton className="h-6 w-48" />
                <div className="flex-1 overflow-auto border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 p-4 space-y-4">
                    <div className="flex justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/6" />
                        <Skeleton className="h-4 w-1/6" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="flex justify-between gap-4 py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
                            <Skeleton className="h-5 w-1/4" />
                            <Skeleton className="h-4 w-1/6" />
                            <Skeleton className="h-6 w-1/6 rounded-full" />
                            <div className="flex gap-2 w-1/4 justify-center">
                                <Skeleton className="h-5 w-8" />
                                <Skeleton className="h-5 w-8" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

export const DashboardSkeleton = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F19] p-6 md:p-10 font-sans">
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-6 p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5">
                <div className="space-y-3">
                    <Skeleton className="h-10 w-64" />
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <Skeleton className="h-5 w-40" />
                    </div>
                </div>
                <Skeleton className="h-10 w-32 rounded-xl" />
            </div>

            {/* Nav */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-32 rounded-2xl bg-white dark:bg-white/5" />
                ))}
            </div>

            {/* View Content */}
            <div className="rounded-3xl p-6 md:p-8 min-h-[600px] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 space-y-8">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-64 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Skeleton key={i} className="h-64 rounded-2xl bg-white dark:bg-white/5" />
                    ))}
                </div>
            </div>
        </div>
    </div>
);
