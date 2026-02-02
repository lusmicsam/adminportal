import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Users, TrendingUp, AlertCircle, Search, ArrowUpDown, UserX, UserCheck, Loader2 } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { Skeleton, SectionDetailSkeleton } from './Skeletons';
import { API_CONFIG } from '../utils/api';
import { getAdminToken } from '../utils/cookies';

export default function SectionDetailView({ section, teachers = [], onBack, onStudentSelect, user, cache = {}, onUpdateCache }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'student_name', direction: 'asc' });

    const getInitialCompletions = () => {
        const sectionName = typeof section === 'string' ? section : section.section_name || section;
        return cache[sectionName] || {};
    };

    const [courseCompletions, setCourseCompletions] = useState(getInitialCompletions());
    const [examDataMap, setExamDataMap] = useState({});

    // Progress Loading State
    const [progressData, setProgressData] = useState({});
    const [loadingProgress, setLoadingProgress] = useState(false);
    const [progressLoaded, setProgressLoaded] = useState(false);
    const [progressCount, setProgressCount] = useState({ current: 0, total: 0 });

    const sectionName = typeof section === 'string' ? section : section?.section_name || '';
    const userId = user?.university_id || user?.universityId || user?.id;

    // Helper functions
    const getStudentDisplayName = (student) => {
        if (student.student_name && student.student_name.trim()) {
            return student.student_name;
        }
        return null;
    };

    const isStudentRegistered = (student) => {
        return student.student_name && student.student_name.trim() !== '';
    };

    // Fetch Progress Function
    const fetchProgress = async (courses) => {
        if (!courses || courses.length === 0) return;

        setLoadingProgress(true);
        setProgressCount({ current: 0, total: courses.length });

        try {
            const newProgressData = {};
            const CONCURRENT_LIMIT = 5;
            let processedCount = 0;

            for (let i = 0; i < courses.length; i += CONCURRENT_LIMIT) {
                const batch = courses.slice(i, i + CONCURRENT_LIMIT);

                await Promise.all(batch.map(async (course) => {
                    try {
                        const token = getAdminToken();
                        const headers = { 'Content-Type': 'application/json' };
                        if (token) headers['Authorization'] = `Bearer ${token}`;

                        const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.sectionCompletion}`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                section_name: sectionName,
                                course_id: course.course_id,
                                university_id: userId
                            }),
                            credentials: 'include'
                        });

                        const json = await res.json();
                        if (json.success && json.data && json.data.student_performance) {
                            newProgressData[course.course_id] = {};
                            json.data.student_performance.forEach(student => {
                                if (student.student_name) {
                                    newProgressData[course.course_id][student.student_name] = student.progress || 0;
                                }
                            });
                        }
                    } catch (err) {
                        console.error(`Error loading progress for course ${course.course_id}`, err);
                    }
                }));

                processedCount += batch.length;
                setProgressCount({ current: processedCount, total: courses.length });
            }

            setProgressData(newProgressData);
            setProgressLoaded(true);
        } catch (e) {
            console.error("Progress loading failed:", e);
        } finally {
            setLoadingProgress(false);
        }
    };

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!sectionName) return;

            setLoading(true);
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

                if (json.success) {
                    setData(json.data);

                    // Track which courses are exams vs regular
                    const newExamMap = {};
                    const regularCoursesTemp = [];

                    if (json.data.course_performance && userId) {
                        const newCompletions = { ...courseCompletions };
                        let hasCompUpdates = false;

                        await Promise.all(json.data.course_performance.map(async (course) => {
                            try {
                                // Check Exam Status
                                const examHeaders = { 'Content-Type': 'application/json' };
                                if (token) {
                                    examHeaders['Authorization'] = `Bearer ${token}`;
                                }
                                const examRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.examDetails}`, {
                                    method: 'POST',
                                    headers: examHeaders,
                                    body: JSON.stringify({
                                        section_name: sectionName,
                                        course_id: course.course_id
                                    }),
                                    credentials: 'include'
                                });
                                const examJson = await examRes.json();

                                if (examJson.success && examJson.data && Array.isArray(examJson.data.students) && examJson.data.students.length > 0) {
                                    newExamMap[course.course_id] = examJson.data;
                                } else {
                                    newExamMap[course.course_id] = null;
                                    regularCoursesTemp.push(course); // Track regular courses
                                }

                                // Fetch Completion for non-exam courses
                                if (!newExamMap[course.course_id] && newCompletions[course.course_id] === undefined) {
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
                                        const val = compData.data.overall_section_completion || compData.data.completion || 0;
                                        newCompletions[course.course_id] = val;
                                        if (onUpdateCache) onUpdateCache(sectionName, course.course_id, val);
                                        hasCompUpdates = true;
                                    }
                                }
                            } catch (e) {
                                console.error("Failed analytics fetch item", e);
                            }
                        }));

                        if (hasCompUpdates) setCourseCompletions(newCompletions);
                        setExamDataMap(newExamMap);

                        // Auto-fetch progress for regular courses
                        if (regularCoursesTemp.length > 0) {
                            fetchProgress(regularCoursesTemp);
                        } else {
                            setProgressLoaded(true); // No regular courses, mark as loaded
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch section analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [sectionName, userId]);

    // Derived Analytics
    const regularCourses = React.useMemo(() => {
        if (!data?.course_performance) return [];
        return data.course_performance.filter(c => !examDataMap[c.course_id]);
    }, [data, examDataMap]);

    const examCourses = React.useMemo(() => {
        if (!data?.course_performance) return [];
        return data.course_performance.filter(c => examDataMap[c.course_id]);
    }, [data, examDataMap]);

    const [inspectingTest, setInspectingTest] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Sorted and categorized students
    const sortedStudents = React.useMemo(() => {
        if (!data?.student_performance) return { registered: [], unregistered: [] };

        let filtered = data.student_performance;

        // Filter by Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(s => {
                const name = s.student_name || '';
                const regId = s.uni_reg_id || '';
                return name.toLowerCase().includes(query) || regId.toLowerCase().includes(query);
            });
        }

        // Separate registered and unregistered students
        const registeredStudents = filtered.filter(s => s.student_name && s.student_name.trim() !== '');
        const unregisteredStudents = filtered.filter(s => !s.student_name || s.student_name.trim() === '');

        // Sort registered students
        let sortableRegistered = [...registeredStudents];
        if (sortConfig.key) {
            sortableRegistered.sort((a, b) => {
                let aVal, bVal;

                if (progressLoaded && progressData[sortConfig.key]) {
                    const courseProgress = progressData[sortConfig.key];
                    aVal = courseProgress[a.student_name] ?? -1;
                    bVal = courseProgress[b.student_name] ?? -1;
                } else {
                    aVal = a[sortConfig.key] || '';
                    bVal = b[sortConfig.key] || '';
                }

                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Sort unregistered students by reg ID
        let sortableUnregistered = [...unregisteredStudents];
        sortableUnregistered.sort((a, b) => {
            const aVal = (a.uni_reg_id || '').toLowerCase();
            const bVal = (b.uni_reg_id || '').toLowerCase();
            return aVal.localeCompare(bVal);
        });

        return { registered: sortableRegistered, unregistered: sortableUnregistered };
    }, [data, sortConfig, searchQuery, progressData, progressLoaded]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Export Logic
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const handleExport = async () => {
        if (!data) return;
        setIsExporting(true);
        setExportProgress(0);

        try {
            const XLSX = await import('xlsx');
            const allStudents = [...(sortedStudents.registered || []), ...(sortedStudents.unregistered || [])];
            const totalStudents = allStudents.length;
            let processedCount = 0;

            const exportRows = [];
            const CONCURRENT_LIMIT = 5;

            for (let i = 0; i < allStudents.length; i += CONCURRENT_LIMIT) {
                const batch = allStudents.slice(i, i + CONCURRENT_LIMIT);

                await Promise.all(batch.map(async (student) => {
                    const isRegistered = isStudentRegistered(student);

                    const row = {
                        'Student Name': student.student_name || 'Not Registered',
                        'Reg ID': student.uni_reg_id,
                        'Section': data.section_metadata?.section_name || '',
                        'Registration Status': isRegistered ? 'Registered' : 'Not Registered'
                    };

                    // Add loaded progress data if available (only for registered students)
                    if (progressLoaded && isRegistered) {
                        regularCourses.forEach(course => {
                            const courseProgress = progressData[course.course_id];
                            const studentProgress = courseProgress?.[student.student_name] ?? 'N/A';
                            row[`${course.course_name} - Progress (%)`] = studentProgress;
                        });
                    } else if (progressLoaded) {
                        regularCourses.forEach(course => {
                            row[`${course.course_name} - Progress (%)`] = 'Not Registered';
                        });
                    }

                    // Only fetch detailed data for registered students
                    if (isRegistered) {
                        try {
                            const lookupRes = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.student.lookup}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'uni_reg_id',
                                    value: student.uni_reg_id,
                                    university_id: userId
                                }),
                                credentials: 'include'
                            });
                            const lookupJson = await lookupRes.json();
                            const fullStudent = Array.isArray(lookupJson.data) ? lookupJson.data[0] : lookupJson.data;

                            if (fullStudent) {
                                const studentId = fullStudent.student_id || fullStudent.uuid || fullStudent.id;
                                const batchId = fullStudent.batch_id || fullStudent.batch;

                                if (batchId) {
                                    const coursesRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getPracticeCoursesByBatch}`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ batch_id: batchId }),
                                        credentials: 'include'
                                    });
                                    const coursesJson = await coursesRes.json();
                                    let studentCourses = [];
                                    if (coursesJson.success && coursesJson.data) {
                                        if (Array.isArray(coursesJson.data)) studentCourses = coursesJson.data;
                                        else if (coursesJson.data.courses) studentCourses = coursesJson.data.courses;
                                    }

                                    for (const sectionCourse of regularCourses) {
                                        const enrolled = studentCourses.find(sc => sc.course_id === sectionCourse.course_id);
                                        if (enrolled) {
                                            const structRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.courseStructure(sectionCourse.course_id)}`, { credentials: 'include' });
                                            const structJson = await structRes.json();
                                            const units = structJson.data || [];

                                            let courseTotalComp = 0;

                                            if (units.length > 0) {
                                                const token = getAdminToken();
                                                const headers = { 'Content-Type': 'application/json' };
                                                if (token) headers['Authorization'] = `Bearer ${token}`;

                                                await Promise.all(units.map(async (unit) => {
                                                    try {
                                                        const cwRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.unitCompletion}`, {
                                                            method: 'POST',
                                                            headers,
                                                            body: JSON.stringify({
                                                                student_id: studentId,
                                                                course_id: sectionCourse.course_id,
                                                                unit_id: unit.unit_id
                                                            }),
                                                            credentials: 'include'
                                                        });
                                                        const cwJson = await cwRes.json();
                                                        const unitVal = cwJson.success && cwJson.data ? (cwJson.data.overall_unit_completion || 0) : 0;

                                                        row[`${sectionCourse.course_name} - ${unit.unit_title || unit.unit_name || 'Unit'} (%)`] = unitVal;
                                                        courseTotalComp += unitVal;

                                                        if (cwJson.data && Array.isArray(cwJson.data.sub_unit_breakdown)) {
                                                            cwJson.data.sub_unit_breakdown.forEach((sub, subIndex) => {
                                                                const colName = `${sectionCourse.course_name} - ${unit.unit_title || unit.unit_name} - Subunit ${subIndex + 1} (%)`;
                                                                row[colName] = sub.progress_percentage || 0;
                                                            });
                                                        }

                                                    } catch (e) {
                                                        row[`${sectionCourse.course_name} - ${unit.unit_title || 'Unit'} (%)`] = 0;
                                                    }
                                                }));

                                                const avgCourse = Math.round(courseTotalComp / units.length);
                                                row[`${sectionCourse.course_name} - Overall (%)`] = avgCourse;
                                            } else {
                                                row[`${sectionCourse.course_name} - Overall (%)`] = 0;
                                            }
                                        } else {
                                            row[`${sectionCourse.course_name} - Overall (%)`] = 'N/A';
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            console.error(`Error processing student ${student.uni_reg_id}`, err);
                        }
                    }

                    // Add exam data if available
                    if (data.course_performance) {
                        data.course_performance.forEach(c => {
                            if (examDataMap[c.course_id]) {
                                const examData = examDataMap[c.course_id];
                                const examStudent = examData?.students?.find(es => es.uni_reg_id === student.uni_reg_id);
                                row[`${c.course_name} - Score`] = examStudent ? examStudent.total_marks : '-';
                                row[`${c.course_name} - Status`] = examStudent ? `${examStudent.exam_completion_percentage}%` : '-';
                            }
                        });
                    }

                    exportRows.push(row);
                }));

                processedCount += batch.length;
                setExportProgress(Math.round((processedCount / totalStudents) * 100));
            }

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportRows);

            const colWidths = Object.keys(exportRows[0] || {}).map(key => ({ wch: Math.max(key.length + 2, 12) }));
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, "Section Report");

            const date = new Date().toISOString().split('T')[0];
            const fileName = `${data.section_metadata?.section_name}_Detailed_Report_${date}.xlsx`;

            XLSX.writeFile(wb, fileName);

        } catch (e) {
            console.error("Export Failed", e);
            alert("Failed to export data. Please try again.");
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    if (loading) {
        return <SectionDetailSkeleton />;
    }

    if (!data) return null;

    const { section_metadata, course_performance, student_performance } = data;
    const totalStudents = (sortedStudents.registered?.length || 0) + (sortedStudents.unregistered?.length || 0);

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-[#0B0F19] animate-in fade-in slide-in-from-right duration-300 overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-[100px] pointer-events-none opacity-50 dark:opacity-100" />
            <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-gradient-to-tr from-violet-500/10 to-purple-500/10 blur-[100px] pointer-events-none opacity-30 dark:opacity-100" />

            {/* Header */}
            <div className="relative flex items-center justify-between p-6 px-8 border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl shrink-0 z-20 transition-all duration-300">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="group p-3 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 active:scale-95">
                        <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:-translate-x-1 transition-transform duration-300" />
                    </button>

                    <div className="space-y-1">
                        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                            {section_metadata?.section_name || sectionName}
                        </h2>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium flex-wrap">
                            {/* Total Students */}
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-white/5 rounded-full border border-gray-200 dark:border-white/5 shadow-sm">
                                <Users className="w-3.5 h-3.5 text-gray-500" />
                                {totalStudents} Total
                            </span>
                            {/* Registered */}
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-200 dark:border-emerald-500/20 shadow-sm text-emerald-700 dark:text-emerald-400">
                                <UserCheck className="w-3.5 h-3.5" />
                                {sortedStudents.registered?.length || 0} Registered
                            </span>
                            {/* Unregistered */}
                            {(sortedStudents.unregistered?.length || 0) > 0 && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-500/10 rounded-full border border-orange-200 dark:border-orange-500/20 shadow-sm text-orange-700 dark:text-orange-400">
                                    <UserX className="w-3.5 h-3.5" />
                                    {sortedStudents.unregistered?.length || 0} Pending
                                </span>
                            )}
                            {/* Courses */}
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-white/5 rounded-full border border-gray-200 dark:border-white/5 shadow-sm">
                                <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                                {course_performance?.length || 0} Courses
                            </span>
                            {/* Progress Loading Indicator */}
                            {loadingProgress && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-200 dark:border-blue-500/20 shadow-sm text-blue-700 dark:text-blue-400">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Loading Progress ({progressCount.current}/{progressCount.total})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleExport}
                        disabled={isExporting || loadingProgress}
                        className="group flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        {isExporting ? <CircularProgress percentage={exportProgress} size={18} strokeWidth={3} color="white" /> : <ArrowUpDown className="w-4 h-4 group-hover:animate-bounce" />}
                        <span className="font-bold text-sm tracking-wide">{isExporting ? 'Exporting...' : 'Export Report'}</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative z-10">
                {/* LEFT: Course Performance Sidebar */}
                <div className="w-full md:w-[380px] p-6 border-r border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#0f1523] overflow-y-auto custom-scrollbar shrink-0 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            Course Performance
                        </h3>
                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-white/10 rounded-md text-[10px] font-bold text-gray-500 dark:text-gray-300">{regularCourses.length + examCourses.length} Courses</span>
                    </div>

                    <div className="space-y-4">
                        {regularCourses.map(course => {
                            let avgProgress = null;
                            let studentCount = 0;
                            if (progressLoaded && progressData[course.course_id]) {
                                const courseProgressData = progressData[course.course_id];
                                const progressValues = Object.values(courseProgressData).filter(p => typeof p === 'number');
                                if (progressValues.length > 0) {
                                    const sum = progressValues.reduce((acc, val) => acc + val, 0);
                                    avgProgress = Math.round(sum / progressValues.length);
                                    studentCount = progressValues.length;
                                }
                            }

                            return (
                                <div key={course.course_id} className="group p-5 rounded-2xl bg-white dark:bg-[#1A1F2E] border border-gray-200 dark:border-white/5 hover:border-cyan-500/30 dark:hover:border-cyan-500/30 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-bl-full -mr-4 -mt-4 transition-all group-hover:scale-110" />

                                    <div className="relative z-10">
                                        <div className="mb-4">
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{course.course_name}</h4>
                                            {progressLoaded && studentCount > 0 && (
                                                <p className="text-xs text-gray-400 mt-1">{studentCount} students with progress</p>
                                            )}
                                        </div>

                                        {loadingProgress ? (
                                            <div className="flex items-center gap-2 text-xs text-blue-500 bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Loading progress...</span>
                                            </div>
                                        ) : progressLoaded && avgProgress !== null ? (
                                            <div className="space-y-3">
                                                <div className="flex items-end justify-between">
                                                    <div>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-1">Avg. Completion</span>
                                                        <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">{avgProgress}%</span>
                                                    </div>
                                                    <CircularProgress percentage={avgProgress} size={40} strokeWidth={4} color={avgProgress > 75 ? 'emerald' : avgProgress > 40 ? 'blue' : 'orange'} />
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-1000 ${avgProgress > 75 ? 'bg-emerald-500' : avgProgress > 40 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${avgProgress}%` }} />
                                                </div>
                                            </div>
                                        ) : progressLoaded ? (
                                            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
                                                <AlertCircle className="w-3.5 h-3.5" /> No progress data available
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}

                        {/* EXAM COURSES */}
                        {examCourses.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/5">
                                <h3 className="text-sm font-extrabold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-4 flex items-center gap-2">
                                    Examinations
                                </h3>
                                <div className="space-y-3">
                                    {examCourses.map(course => (
                                        <div key={course.course_id} className="p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10 border border-violet-100 dark:border-violet-500/20 relative overflow-hidden group">
                                            <div className="relative z-10">
                                                <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-3">{course.course_name}</h4>
                                                <button
                                                    onClick={() => setInspectingTest(examDataMap[course.course_id])}
                                                    className="w-full py-2.5 bg-white dark:bg-white/10 hover:bg-violet-50 dark:hover:bg-violet-500/20 text-violet-600 dark:text-violet-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm border border-violet-100 dark:border-violet-500/20 flex items-center justify-center gap-2"
                                                >
                                                    View Results <ArrowLeft className="w-3 h-3 rotate-180" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Student Table */}
                <div className="flex-1 p-8 overflow-hidden flex flex-col bg-slate-50 dark:bg-[#0B0F19]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="p-2 bg-violet-100 dark:bg-violet-500/20 rounded-lg text-violet-600 dark:text-violet-400">
                                <Users className="w-5 h-5" />
                            </div>
                            Student Performance
                            {loadingProgress && (
                                <span className="flex items-center gap-1.5 text-sm font-normal text-blue-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading...
                                </span>
                            )}
                        </h3>

                        <div className="relative w-72 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by name or Reg ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1A1F2E] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-sm text-gray-900 dark:text-white placeholder-gray-400 transition-all shadow-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden border border-gray-200 dark:border-white/5 rounded-2xl bg-white dark:bg-[#1A1F2E] shadow-sm flex flex-col">
                        <div className="overflow-auto custom-scrollbar flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/80 dark:bg-black/20 sticky top-0 backdrop-blur-md z-10 border-b border-gray-200 dark:border-white/5">
                                    <tr>
                                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('student_name')}>
                                            <div className="flex items-center gap-2">
                                                Student Name
                                                <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === 'student_name' ? 'text-cyan-500' : 'opacity-50'}`} />
                                            </div>
                                        </th>
                                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('uni_reg_id')}>
                                            <div className="flex items-center gap-2">
                                                Reg ID
                                                <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === 'uni_reg_id' ? 'text-cyan-500' : 'opacity-50'}`} />
                                            </div>
                                        </th>
                                        <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        {progressLoaded && regularCourses.map(course => (
                                            <th
                                                key={course.course_id}
                                                className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
                                                title={course.course_name}
                                                onClick={() => requestSort(course.course_id)}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    {course.course_name.length > 15 ? course.course_name.substring(0, 12) + '...' : course.course_name}
                                                    <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === course.course_id ? 'text-cyan-500' : 'opacity-0 group-hover:opacity-50'} transition-opacity`} />
                                                </div>
                                            </th>
                                        ))}
                                        {loadingProgress && (
                                            <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                                    Loading...
                                                </div>
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {/* Registered Students Section */}
                                    {sortedStudents.registered?.length > 0 && (
                                        <>
                                            <tr className="bg-emerald-50/50 dark:bg-emerald-500/5">
                                                <td colSpan={3 + (progressLoaded ? regularCourses.length : 0) + (loadingProgress ? 1 : 0)} className="p-3 px-5">
                                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                                        <UserCheck className="w-3.5 h-3.5" />
                                                        Registered Students ({sortedStudents.registered.length})
                                                    </div>
                                                </td>
                                            </tr>
                                            {sortedStudents.registered.map((student, idx) => (
                                                <tr key={student.student_id || student.uni_reg_id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                                                    <td className="p-4 px-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${['bg-red-100 text-red-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-yellow-100 text-yellow-600', 'bg-violet-100 text-violet-600'][idx % 5]}`}>
                                                                {student.student_name?.[0]?.toUpperCase() || 'S'}
                                                            </div>
                                                            <div
                                                                className="font-semibold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors cursor-pointer"
                                                                onClick={() => onStudentSelect && onStudentSelect(student)}
                                                            >
                                                                {student.student_name}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 px-5 text-sm text-gray-500 dark:text-gray-400 font-mono">{student.uni_reg_id}</td>
                                                    <td className="p-4 px-5">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                                            <UserCheck className="w-3 h-3" />
                                                            Active
                                                        </span>
                                                    </td>
                                                    {progressLoaded && regularCourses.map(course => {
                                                        const courseProgress = progressData[course.course_id];
                                                        const studentProgress = courseProgress?.[student.student_name] ?? null;

                                                        return (
                                                            <td key={course.course_id} className="p-4 px-5 text-center">
                                                                {studentProgress !== null ? (
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <CircularProgress
                                                                            percentage={studentProgress}
                                                                            size={30}
                                                                            strokeWidth={3}
                                                                            color={studentProgress > 80 ? 'emerald' : studentProgress > 40 ? 'blue' : 'orange'}
                                                                        />
                                                                        <span className={`text-xs font-bold ${studentProgress > 80 ? 'text-emerald-600' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                            {studentProgress}%
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-gray-300 dark:text-gray-700">-</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    {loadingProgress && (
                                                        <td className="p-4 px-5 text-center">
                                                            <Loader2 className="w-4 h-4 animate-spin text-blue-500 mx-auto" />
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </>
                                    )}

                                    {/* Unregistered Students Section */}
                                    {sortedStudents.unregistered?.length > 0 && (
                                        <>
                                            <tr className="bg-orange-50/50 dark:bg-orange-500/5">
                                                <td colSpan={3 + (progressLoaded ? regularCourses.length : 0) + (loadingProgress ? 1 : 0)} className="p-3 px-5">
                                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                                        <UserX className="w-3.5 h-3.5" />
                                                        Not Yet Registered ({sortedStudents.unregistered.length})
                                                        <span className="font-normal text-orange-500/70 ml-2">— Students who haven't completed registration</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {sortedStudents.unregistered.map((student, idx) => (
                                                <tr key={student.student_id || student.uni_reg_id || `unreg-${idx}`} className="hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-colors">
                                                    <td className="p-4 px-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gray-100 dark:bg-white/10 text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600">
                                                                ?
                                                            </div>
                                                            <div className="text-gray-400 dark:text-gray-500 italic">
                                                                Not Registered
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 px-5 text-sm text-gray-500 dark:text-gray-400 font-mono">
                                                        {student.uni_reg_id}
                                                    </td>
                                                    <td className="p-4 px-5">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                                                            <UserX className="w-3 h-3" />
                                                            Pending
                                                        </span>
                                                    </td>
                                                    {progressLoaded && regularCourses.map(course => (
                                                        <td key={course.course_id} className="p-4 px-5 text-center">
                                                            <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                                                        </td>
                                                    ))}
                                                    {loadingProgress && (
                                                        <td className="p-4 px-5 text-center">
                                                            <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </>
                                    )}

                                    {/* Empty State */}
                                    {(!sortedStudents.registered?.length && !sortedStudents.unregistered?.length) && (
                                        <tr>
                                            <td colSpan={3 + (progressLoaded ? regularCourses.length : 0) + (loadingProgress ? 1 : 0)} className="p-12 text-center">
                                                <div className="flex flex-col items-center gap-3 text-gray-400">
                                                    <Users className="w-12 h-12 opacity-30" />
                                                    <span className="text-sm font-medium">No students found</span>
                                                    {searchQuery && (
                                                        <button
                                                            onClick={() => setSearchQuery('')}
                                                            className="text-xs text-cyan-500 hover:text-cyan-600 underline"
                                                        >
                                                            Clear search
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Test Detail Overlay */}
            {inspectingTest && (
                <TestDetailOverlay
                    test={inspectingTest}
                    students={student_performance}
                    sectionMetadata={section_metadata}
                    onClose={() => setInspectingTest(null)}
                />
            )}
        </div>
    );
}

function TestDetailOverlay({ test, students, sectionMetadata, onClose }) {
    const examStudents = test?.students || [];

    const handleExport = async () => {
        try {
            const XLSX = await import('xlsx');
            const exportData = examStudents.map(s => ({
                'Student Name': s.student_name || 'Not Registered',
                'Reg ID': s.uni_reg_id,
                'Completion (%)': s.exam_completion_percentage,
                'Total Marks': s.total_marks,
                'Coding Marks': s.marks_breakdown?.coding_marks || 0,
                'MCQ Marks': s.marks_breakdown?.mcq_marks || 0,
                'OS': s.debug_configs?.start_config?.os?.platform || '-',
                'Hostname': s.debug_configs?.start_config?.os?.hostname || '-'
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            const colWidths = Object.keys(exportData[0] || {}).map(key => ({ wch: key.length + 5 }));
            ws['!cols'] = colWidths;
            XLSX.utils.book_append_sheet(wb, ws, "Exam Results");
            XLSX.writeFile(wb, `${test?.section_name || 'Exam'}_Results.xlsx`);
        } catch (e) {
            console.error("Export failed", e);
            alert("Failed to export exam results");
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex flex-col bg-gray-50/50 dark:bg-[#0B0F19]/90 animate-in slide-in-from-right duration-300 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-6 px-8 border-b border-gray-200 dark:border-white/5 bg-white shadow-lg dark:bg-[#0f1523] shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5 hover:border-violet-500/30 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all hover:scale-105 active:scale-95 shadow-sm">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="text-xs text-violet-600 dark:text-violet-400 uppercase tracking-wider font-extrabold mb-1">Detailed Results</div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-3">
                            {test?.section_name || 'Exam Details'}
                            <span className="text-sm font-normal text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">{examStudents.length} Students</span>
                        </h2>
                        <div className="text-sm text-gray-500">{sectionMetadata?.section_name}</div>
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0"
                >
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-bold">Export Results</span>
                </button>
            </div>

            <div className="flex-1 p-8 overflow-auto bg-slate-50 dark:bg-[#0B0F19]">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white dark:bg-[#1A1F2E] rounded-3xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-xl">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/5">
                                <tr>
                                    <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student Name</th>
                                    <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reg ID</th>
                                    <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Completion</th>
                                    <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Marks (Total)</th>
                                    <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Breakdown</th>
                                    <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">System Info</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {examStudents.map((student, i) => {
                                    const isRegistered = student.student_name && student.student_name.trim() !== '';

                                    return (
                                        <tr key={student.uni_reg_id || i} className={`hover:bg-violet-50/50 dark:hover:bg-violet-500/5 transition-colors ${!isRegistered ? 'opacity-60' : ''}`}>
                                            <td className="p-5">
                                                {isRegistered ? (
                                                    <span className="font-bold text-gray-900 dark:text-white">{student.student_name}</span>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gray-100 dark:bg-white/10 text-gray-400 border border-dashed border-gray-300 dark:border-gray-600">
                                                            ?
                                                        </div>
                                                        <span className="text-gray-400 dark:text-gray-500 italic text-sm">Not Registered</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-5 text-sm text-gray-500 font-mono">{student.uni_reg_id}</td>
                                            <td className="p-5 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${student.exam_completion_percentage === 100
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'
                                                    }`}>
                                                    {student.exam_completion_percentage}%
                                                </span>
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className="text-lg font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-lg">
                                                    {student.total_marks}
                                                </span>
                                            </td>
                                            <td className="p-5 text-center text-xs text-gray-500">
                                                <div className="flex flex-col gap-1.5 items-center justify-center">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-16 text-right text-cyan-600 dark:text-cyan-400 font-medium">Coding</span>
                                                        <div className="h-1.5 w-24 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-cyan-500" style={{ width: '100%' }}></div>
                                                        </div>
                                                        <span className="font-bold">{student.marks_breakdown?.coding_marks || 0}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-16 text-right text-violet-600 dark:text-violet-400 font-medium">MCQ</span>
                                                        <div className="h-1.5 w-24 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-violet-500" style={{ width: '100%' }}></div>
                                                        </div>
                                                        <span className="font-bold">{student.marks_breakdown?.mcq_marks || 0}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5 text-center text-xs font-mono text-gray-400">
                                                {student.debug_configs?.start_config?.os?.platform || '-'} / {student.debug_configs?.start_config?.os?.hostname || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}