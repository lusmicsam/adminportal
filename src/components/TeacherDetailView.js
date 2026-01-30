import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, BookOpen, Layers, User, TrendingUp } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { API_CONFIG } from '../utils/api';
import { getAdminToken } from '../utils/cookies';

export default function TeacherDetailView({ teacher, onBack, onSectionSelect, cache = {}, onUpdateCache, user }) {
    if (!teacher) return null;

    useEffect(() => {
        const loadAllSections = async () => {
            if (!teacher.assigned_section || !user) {
                console.log("Pre-fetch aborted: Missing teacher sections or user", { sections: teacher?.assigned_section, user });
                return;
            }

            console.log("Starting Section Pre-fetch for:", teacher.assigned_section);

            for (const sectionName of teacher.assigned_section) {
                // Skip if we already have *any* data for this section in cache?
                // Or maybe check if we have enough? For now, simplistic check:
                if (cache[sectionName] && Object.keys(cache[sectionName]).length > 0) {
                    console.log(`Skipping ${sectionName} - Cache hit`);
                    continue;
                }

                console.log(`Fetching data for ${sectionName}...`);

                try {
                    // 1. Fetch Section Analytics to get Course List
                    const url = `${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.sectionAnalytics(encodeURIComponent(sectionName))}`;
                    const token = getAdminToken();
                    const headers = {};
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                    const res = await fetch(url, {
                        credentials: 'include',
                        headers
                    });
                    const json = await res.json();

                    if (json.success && json.data?.course_performance) {
                        // 2. Fetch Completion for each course
                        await Promise.all(json.data.course_performance.map(async (course) => {
                            try {
                                const payload = {
                                    section_name: sectionName,
                                    course_id: course.course_id,
                                    university_id: user.university_id || user.universityId || user.id || user.uni_id
                                };
                                const compHeaders = { 'Content-Type': 'application/json' };
                                if (token) {
                                    compHeaders['Authorization'] = `Bearer ${token}`;
                                }
                                const compRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.sectionCompletion}`, {
                                    method: 'POST',
                                    headers: compHeaders,
                                    body: JSON.stringify(payload),
                                    credentials: 'include'
                                });
                                const compData = await compRes.json();

                                if (compData.success && compData.data) {
                                    // Use section_overall_completion from the API response
                                    const val = compData.data.section_overall_completion || 0;

                                    // Update Cache via prop
                                    if (onUpdateCache) {
                                        onUpdateCache(sectionName, course.course_id, val);
                                    }

                                    console.log(`Cached ${sectionName} - ${course.course_name}: ${val}%`);
                                }
                            } catch (e) {
                                console.error(`Failed to fetch completion for ${sectionName} - ${course.course_id}`, e);
                            }
                        }));
                    }
                } catch (err) {
                    console.error(`Failed to pre-fetch section ${sectionName}`, err);
                }
            }
        };

        loadAllSections();
    }, [teacher, user]); // Dependencies: run when teacher/user changes only. Don't re-run on cache updates to avoid loops.

    const getSectionProgress = (sectionName) => {
        const cachedData = cache[sectionName];
        if (!cachedData) return null;

        const courses = Object.values(cachedData);
        if (courses.length === 0) return 0;

        const sum = courses.reduce((a, b) => a + b, 0);
        return Math.round(sum / courses.length);
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right duration-300 bg-gray-50 dark:bg-[#0B0F19]">
            {/* Background Effects */}
            <div className="fixed -top-40 -left-48 h-[38rem] w-[38rem] bg-cyan-500/10 blur-3xl rounded-full pointer-events-none opacity-50 dark:opacity-100" />
            <div className="fixed -bottom-44 -right-40 h-[42rem] w-[42rem] bg-purple-500/10 blur-3xl rounded-full pointer-events-none opacity-50 dark:opacity-100" />

            {/* Header */}
            <div className="flex items-center gap-4 p-6 border-b border-gray-200 dark:border-white/5 bg-white/70 dark:bg-white/5 backdrop-blur-xl sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        {teacher.teacher_name}
                        <span className="text-sm font-normal px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-mono">
                            {teacher.uni_reg_id}
                        </span>
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 flex items-center gap-2">
                        <Mail className="w-3 h-3" /> {teacher.teacher_email || 'No email provided'}
                    </p>
                </div>
            </div>

            {/* Content Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 relative z-10">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">

                    {/* Profile Card */}
                    <div className="col-span-1 space-y-6">
                        <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm shadow-sm dark:shadow-none">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center mb-4 mx-auto border border-cyan-100 dark:border-white/10">
                                <User className="w-10 h-10 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div className="text-center">
                                <div className="text-gray-500 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Uni ID</div>
                                <div className="font-mono text-gray-900 dark:text-white text-lg truncate" title={teacher.uni_reg_id}>{teacher.uni_reg_id}</div>
                            </div>

                            {/* Overall Progress */}
                            <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                                <div className="text-center mb-4">
                                    <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Overall Performance</div>
                                    <div className="flex justify-center items-end gap-1">
                                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                            {(() => {
                                                if (!teacher.assigned_section || teacher.assigned_section.length === 0) return 0;
                                                let total = 0;
                                                let count = 0;
                                                teacher.assigned_section.forEach(sec => {
                                                    const p = getSectionProgress(sec);
                                                    if (p !== null) {
                                                        total += p;
                                                        count++;
                                                    }
                                                });
                                                return count > 0 ? Math.round(total / count) : 0;
                                            })()}%
                                        </span>
                                        <span className="text-sm text-gray-500 mb-1">avg</span>
                                    </div>
                                </div>
                                <div className="flex justify-center">
                                    <CircularProgress
                                        percentage={(() => {
                                            if (!teacher.assigned_section || teacher.assigned_section.length === 0) return 0;
                                            let total = 0;
                                            let count = 0;
                                            teacher.assigned_section.forEach(sec => {
                                                const p = getSectionProgress(sec);
                                                if (p !== null) {
                                                    total += p;
                                                    count++;
                                                }
                                            });
                                            return count > 0 ? Math.round(total / count) : 0;
                                        })()}
                                        size={80}
                                        strokeWidth={6}
                                        color="cyan"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Assigned Sections */}
                    <div className="col-span-1 lg:col-span-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                            Assigned Sections
                        </h3>

                        {teacher.assigned_section && teacher.assigned_section.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {teacher.assigned_section.map((section, idx) => {
                                    const progress = getSectionProgress(section);

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => onSectionSelect && onSectionSelect(section)}
                                            className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:bg-emerald-50 dark:hover:bg-white/10 hover:border-emerald-500/30 transition-all group flex items-center justify-between cursor-pointer shadow-sm dark:shadow-none"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                                    <BookOpen className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white text-lg">{section}</div>
                                                    <div className="text-xs text-gray-500">Section ID</div>
                                                </div>
                                            </div>

                                            {/* Progress Indicator */}
                                            {progress !== null && progress > 0 && (
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Progress</div>
                                                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{progress}%</div>
                                                    </div>
                                                    <CircularProgress percentage={progress} size={32} strokeWidth={3} color="emerald" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 rounded-2xl bg-white dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 text-center text-gray-500">
                                No sections assigned to this teacher.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
