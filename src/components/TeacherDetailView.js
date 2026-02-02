import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Mail, BookOpen, Layers, User, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { API_CONFIG } from '../utils/api';
import { getAdminToken } from '../utils/cookies';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function TeacherDetailView({ teacher, onBack, onSectionSelect, cache = {}, onUpdateCache, user }) {
    const [loadingProgress, setLoadingProgress] = useState({});
    const [loadingAll, setLoadingAll] = useState(false);
    const [sectionAnalyticsCache, setSectionAnalyticsCache] = useState({});

    // Load section analytics from localStorage on mount
    useEffect(() => {
        if (!teacher?.assigned_section) return;

        const loadedCache = {};
        teacher.assigned_section.forEach(sectionName => {
            try {
                const cacheKey = `section_analytics_${sectionName}`;
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    const now = Date.now();
                    if (parsed.timestamp && (now - parsed.timestamp < CACHE_DURATION) && parsed.data) {
                        loadedCache[sectionName] = parsed.data;
                    }
                }
            } catch (e) {
                console.warn(`Failed to load cache for section ${sectionName}`, e);
            }
        });
        setSectionAnalyticsCache(loadedCache);
    }, [teacher?.assigned_section]);

    // Fetch section analytics with caching
    const fetchSectionAnalytics = useCallback(async (sectionName, forceRefresh = false) => {
        const cacheKey = `section_analytics_${sectionName}`;

        // Check memory cache first
        if (!forceRefresh && sectionAnalyticsCache[sectionName]) {
            return sectionAnalyticsCache[sectionName];
        }

        // Check localStorage cache
        if (!forceRefresh) {
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    const now = Date.now();
                    if (parsed.timestamp && (now - parsed.timestamp < CACHE_DURATION) && parsed.data) {
                        setSectionAnalyticsCache(prev => ({ ...prev, [sectionName]: parsed.data }));
                        return parsed.data;
                    }
                }
            } catch (e) {
                console.warn(`Failed to read cache for ${sectionName}`, e);
            }
        }

        // Fetch from API
        try {
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

            if (json.success && json.data) {
                // Save to localStorage
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        data: json.data,
                        timestamp: Date.now()
                    }));
                } catch (e) {
                    console.warn(`Failed to save cache for ${sectionName}`, e);
                }

                // Update memory cache
                setSectionAnalyticsCache(prev => ({ ...prev, [sectionName]: json.data }));
                return json.data;
            }
        } catch (err) {
            console.error(`Failed to fetch section analytics for ${sectionName}`, err);
        }

        return null;
    }, [sectionAnalyticsCache]);

    // Fetch completion for a section's courses
    const fetchSectionCompletion = useCallback(async (sectionName, courses) => {
        if (!user || !courses || courses.length === 0) return;

        const token = getAdminToken();
        const userId = user.university_id || user.universityId || user.id || user.uni_id;

        await Promise.all(courses.map(async (course) => {
            // Skip if already cached
            if (cache[sectionName]?.[course.course_id] !== undefined) {
                return;
            }

            try {
                const payload = {
                    section_name: sectionName,
                    course_id: course.course_id,
                    university_id: userId
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
                    const val = compData.data.section_overall_completion || compData.data.overall_section_completion || 0;
                    if (onUpdateCache) {
                        onUpdateCache(sectionName, course.course_id, val);
                    }
                }
            } catch (e) {
                console.error(`Failed to fetch completion for ${sectionName} - ${course.course_id}`, e);
            }
        }));
    }, [user, cache, onUpdateCache]);

    // Auto-fetch all sections on mount
    useEffect(() => {
        const loadAllSections = async () => {
            if (!teacher?.assigned_section || !user) {
                return;
            }

            setLoadingAll(true);

            for (const sectionName of teacher.assigned_section) {
                // Skip if we already have completion data for this section
                if (cache[sectionName] && Object.keys(cache[sectionName]).length > 0) {
                    continue;
                }

                setLoadingProgress(prev => ({ ...prev, [sectionName]: true }));

                try {
                    // Fetch section analytics (with caching)
                    const analyticsData = await fetchSectionAnalytics(sectionName);

                    if (analyticsData?.course_performance) {
                        // Fetch completion for each course
                        await fetchSectionCompletion(sectionName, analyticsData.course_performance);
                    }
                } catch (err) {
                    console.error(`Failed to load section ${sectionName}`, err);
                } finally {
                    setLoadingProgress(prev => ({ ...prev, [sectionName]: false }));
                }
            }

            setLoadingAll(false);
        };

        loadAllSections();
    }, [teacher?.assigned_section, user, fetchSectionAnalytics, fetchSectionCompletion, cache]);

    // Manual refresh for a single section
    const handleRefreshSection = async (sectionName, e) => {
        e.stopPropagation();

        setLoadingProgress(prev => ({ ...prev, [sectionName]: true }));

        try {
            // Force refresh analytics
            const analyticsData = await fetchSectionAnalytics(sectionName, true);

            if (analyticsData?.course_performance) {
                // Clear existing cache for this section
                if (onUpdateCache) {
                    analyticsData.course_performance.forEach(course => {
                        onUpdateCache(sectionName, course.course_id, undefined);
                    });
                }

                // Fetch fresh completion data
                await fetchSectionCompletion(sectionName, analyticsData.course_performance);
            }
        } catch (err) {
            console.error(`Failed to refresh section ${sectionName}`, err);
        } finally {
            setLoadingProgress(prev => ({ ...prev, [sectionName]: false }));
        }
    };

    const getSectionProgress = (sectionName) => {
        const cachedData = cache[sectionName];
        if (!cachedData) return null;

        const courses = Object.values(cachedData).filter(v => typeof v === 'number');
        if (courses.length === 0) return null;

        const sum = courses.reduce((a, b) => a + b, 0);
        return Math.round(sum / courses.length);
    };

    const getOverallProgress = () => {
        if (!teacher?.assigned_section || teacher.assigned_section.length === 0) return 0;

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
    };

    const getSectionDetails = (sectionName) => {
        return sectionAnalyticsCache[sectionName] || null;
    };

    if (!teacher) return null;

    const overallProgress = getOverallProgress();

    return (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right duration-300 bg-gray-50 dark:bg-[#0B0F19]">
            {/* Background Effects */}
            <div className="fixed -top-40 -left-48 h-[38rem] w-[38rem] bg-cyan-500/10 blur-3xl rounded-full pointer-events-none opacity-50 dark:opacity-100" />
            <div className="fixed -bottom-44 -right-40 h-[42rem] w-[42rem] bg-violet-500/10 blur-3xl rounded-full pointer-events-none opacity-50 dark:opacity-100" />

            {/* Header */}
            <div className="relative flex items-center gap-6 p-8 border-b border-gray-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10 shadow-lg">
                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="group p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 hover:from-cyan-500 hover:to-blue-500 dark:hover:from-cyan-600 dark:hover:to-blue-600 text-gray-700 dark:text-gray-300 hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-110"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>

                {/* Teacher Info */}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            {(teacher.teacher_name || 'T')[0].toUpperCase()}
                        </div>

                        {/* Name */}
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                            {teacher.teacher_name}
                        </h2>

                        {/* Reg ID Badge */}
                        <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 text-cyan-700 dark:text-cyan-400 border-2 border-cyan-500/30 font-mono text-sm font-bold shadow-md">
                            {teacher.uni_reg_id}
                        </span>

                        {/* Loading Indicator */}
                        {loadingAll && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Loading progress...
                            </div>
                        )}
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm font-medium">
                        <Mail className="w-4 h-4 text-blue-500" />
                        <span>{teacher.teacher_email || 'No email provided'}</span>
                    </div>
                </div>
            </div>

            {/* Content */}
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
                            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
                                <div className="text-center mb-4">
                                    <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Overall Performance</div>
                                    <div className="flex justify-center items-end gap-1">
                                        {loadingAll ? (
                                            <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                                        ) : (
                                            <>
                                                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                                    {overallProgress}%
                                                </span>
                                                <span className="text-sm text-gray-500 mb-1">avg</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-center">
                                    <CircularProgress
                                        percentage={overallProgress}
                                        size={80}
                                        strokeWidth={6}
                                        color="cyan"
                                    />
                                </div>
                            </div>

                            {/* Section Stats */}
                            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {teacher.assigned_section?.length || 0}
                                        </div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider">Sections</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {Object.values(sectionAnalyticsCache).reduce((acc, section) => {
                                                return acc + (section?.section_metadata?.total_students || 0);
                                            }, 0)}
                                        </div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider">Students</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Assigned Sections */}
                    <div className="col-span-1 lg:col-span-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                            Assigned Sections
                            {loadingAll && (
                                <span className="text-xs font-normal text-gray-400 ml-2">
                                    (Auto-fetching progress...)
                                </span>
                            )}
                        </h3>

                        {teacher.assigned_section && teacher.assigned_section.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {teacher.assigned_section.map((section, idx) => {
                                    const progress = getSectionProgress(section);
                                    const isLoading = loadingProgress[section];
                                    const sectionDetails = getSectionDetails(section);
                                    const studentCount = sectionDetails?.section_metadata?.total_students;
                                    const courseCount = sectionDetails?.course_performance?.length;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => onSectionSelect && onSectionSelect(section)}
                                            className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:bg-emerald-50 dark:hover:bg-white/10 hover:border-emerald-500/30 transition-all group cursor-pointer shadow-sm dark:shadow-none relative overflow-hidden"
                                        >
                                            {/* Loading Overlay */}
                                            {isLoading && (
                                                <div className="absolute inset-0 bg-white/50 dark:bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
                                                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                                        <BookOpen className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-white text-lg">{section}</div>
                                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                            {studentCount !== undefined && (
                                                                <span>{studentCount} students</span>
                                                            )}
                                                            {courseCount !== undefined && (
                                                                <span>{courseCount} courses</span>
                                                            )}
                                                            {!studentCount && !courseCount && (
                                                                <span>Section ID</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {/* Refresh Button */}
                                                    <button
                                                        onClick={(e) => handleRefreshSection(section, e)}
                                                        disabled={isLoading}
                                                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all disabled:opacity-50"
                                                        title="Refresh section data"
                                                    >
                                                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                                    </button>

                                                    {/* Progress Indicator */}
                                                    {progress !== null ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right">
                                                                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Progress</div>
                                                                <div className={`text-sm font-bold ${progress > 75 ? 'text-emerald-600 dark:text-emerald-400' :
                                                                        progress > 40 ? 'text-blue-600 dark:text-blue-400' :
                                                                            'text-orange-600 dark:text-orange-400'
                                                                    }`}>{progress}%</div>
                                                            </div>
                                                            <CircularProgress
                                                                percentage={progress}
                                                                size={32}
                                                                strokeWidth={3}
                                                                color={progress > 75 ? 'emerald' : progress > 40 ? 'blue' : 'orange'}
                                                            />
                                                        </div>
                                                    ) : isLoading ? null : (
                                                        <div className="text-xs text-gray-400 italic">
                                                            No data
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            {progress !== null && (
                                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${progress > 75 ? 'bg-emerald-500' :
                                                                    progress > 40 ? 'bg-blue-500' :
                                                                        'bg-orange-500'
                                                                }`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
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