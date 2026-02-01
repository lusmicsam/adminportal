export const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={`animate-pulse bg-gray-200/80 dark:bg-white/5 ${className}`}
            {...props}
        />
    );
};

export const BatchSkeleton = () => (
    <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1A1F2E] shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <Skeleton className="w-20 h-7 rounded-full" />
        </div>
        <Skeleton className="h-7 w-3/4 mb-4 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 my-6">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="pt-4 mt-auto border-t border-gray-100 dark:border-white/5 flex justify-between">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
        </div>
    </div>
);

export const TeacherSkeleton = () => (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#1A1F2E] border border-gray-200 dark:border-white/5 shadow-sm flex flex-col justify-between h-full">
        <div>
            <div className="flex items-center gap-5 mb-6">
                <Skeleton className="w-16 h-16 rounded-2xl shadow-sm" />
                <div className="flex-1 space-y-2.5">
                    <Skeleton className="h-6 w-3/4 rounded-lg" />
                    <Skeleton className="h-4 w-1/2 rounded-md" />
                </div>
            </div>
            <div className="space-y-4 mb-6 bg-gray-50/50 dark:bg-white/5 p-5 rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24 rounded-md" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-20 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
            </div>
        </div>
        <Skeleton className="h-12 w-full rounded-xl shadow-sm" />
    </div>
);

export const SectionSkeleton = () => (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#1A1F2E] border border-gray-200 dark:border-white/5 flex flex-col items-center justify-center space-y-4 h-40 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/0 dark:to-white/5 opacity-50" />
        <Skeleton className="h-10 w-20 rounded-xl" />
        <Skeleton className="h-4 w-24 rounded-lg" />
    </div>
);

export const ListSkeleton = () => (
    <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center p-5 rounded-2xl bg-white dark:bg-[#1A1F2E] border border-gray-200 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-4 w-full">
                    <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                    <div className="space-y-2.5 flex-1">
                        <Skeleton className="h-5 w-48 rounded-lg" />
                        <Skeleton className="h-3 w-32 rounded-md" />
                    </div>
                </div>
                <Skeleton className="h-11 w-36 rounded-xl shrink-0" />
            </div>
        ))}
    </div>
);

export const SectionDetailSkeleton = () => (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-[#0B0F19] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#0B0F19] shrink-0 z-10">
            <div className="flex items-center gap-6">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div>
                    <Skeleton className="h-3 w-32 mb-3 rounded-full" />
                    <Skeleton className="h-9 w-64 mb-3 rounded-lg" />
                    <div className="flex gap-4">
                        <Skeleton className="h-5 w-28 rounded-md" />
                        <Skeleton className="h-5 w-28 rounded-md" />
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* LEFT: Course Performance */}
            <div className="w-full md:w-96 p-8 border-r border-gray-200 dark:border-white/5 bg-white dark:bg-black/20 shrink-0 space-y-8 overflow-y-auto">
                <Skeleton className="h-7 w-48 rounded-lg" />
                <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 space-y-4">
                            <Skeleton className="h-5 w-40 rounded-md" />
                            <div className="flex justify-between items-end">
                                <Skeleton className="h-4 w-20 rounded-md" />
                                <Skeleton className="h-8 w-16 rounded-lg" />
                            </div>
                            <Skeleton className="h-2.5 w-full rounded-full" />
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: Student Table */}
            <div className="flex-1 p-8 overflow-hidden flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-56 rounded-lg" />
                    <Skeleton className="h-10 w-64 rounded-xl" />
                </div>
                <div className="flex-1 overflow-auto border border-gray-200 dark:border-white/10 rounded-2xl bg-white dark:bg-[#1A1F2E] p-6 space-y-6 shadow-sm">
                    <div className="flex justify-between gap-6 pb-4 border-b border-gray-100 dark:border-white/5">
                        <Skeleton className="h-4 w-1/4 rounded-md" />
                        <Skeleton className="h-4 w-1/6 rounded-md" />
                        <Skeleton className="h-4 w-1/6 rounded-md" />
                        <Skeleton className="h-4 w-1/4 rounded-md" />
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <div key={i} className="flex justify-between gap-6 py-3 border-b border-gray-50 dark:border-white/5 last:border-0">
                            <Skeleton className="h-6 w-1/4 rounded-md" />
                            <Skeleton className="h-5 w-1/6 rounded-md" />
                            <Skeleton className="h-8 w-1/6 rounded-full" />
                            <div className="flex gap-3 w-1/4 justify-center">
                                <Skeleton className="h-8 w-20 rounded-lg" />
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
        <div className="max-w-[1600px] mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-8 p-8 rounded-3xl bg-white dark:bg-[#1A1F2E] border border-gray-200 dark:border-white/5 shadow-sm">
                <div className="space-y-4">
                    <Skeleton className="h-10 w-72 rounded-xl" />
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <Skeleton className="h-5 w-48 rounded-md" />
                    </div>
                </div>
                <div className="flex gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-12 w-32 rounded-xl" />
                    <Skeleton className="h-12 w-32 rounded-xl" />
                </div>
            </div>

            {/* Nav */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-40 rounded-3xl bg-white dark:bg-[#1A1F2E] shadow-sm" />
                ))}
            </div>

            {/* View Content */}
            <div className="rounded-[2.5rem] p-8 md:p-10 min-h-[600px] bg-white dark:bg-[#1A1F2E] border border-gray-200 dark:border-white/5 space-y-10 shadow-sm">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-8">
                    <Skeleton className="h-9 w-56 rounded-lg" />
                    <Skeleton className="h-12 w-80 rounded-2xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-80 rounded-3xl bg-gray-50 dark:bg-white/5 animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    </div>
);
