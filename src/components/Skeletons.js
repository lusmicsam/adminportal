import React from 'react';

export const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={`animate-pulse rounded-md bg-white/10 ${className}`}
            {...props}
        />
    );
};

export const BatchSkeleton = () => (
    <div className="p-5 rounded-2xl border border-white/5 bg-white/5 h-full relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="w-16 h-6 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <div className="grid grid-cols-2 gap-2 my-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="pt-3 mt-auto border-t border-white/5 flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
        </div>
    </div>
);

export const TeacherSkeleton = () => (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between h-full">
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <div className="space-y-3 mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
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
    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center space-y-3 h-32">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-20" />
    </div>
);

export const ListSkeleton = () => (
    <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-9 w-32 rounded-lg" />
            </div>
        ))}
    </div>
);
