import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Users, TrendingUp, AlertCircle, Search, ArrowUpDown } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { Skeleton, SectionDetailSkeleton } from './Skeletons';
import { API_CONFIG } from '../utils/api';
import { getAdminToken } from '../utils/cookies';

export default function SectionDetailView({ section, teachers = [], onBack, onStudentSelect, user, cache = {}, onUpdateCache }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'overall_progress', direction: 'asc' });

    // Initialize from cache if available
    const getInitialCompletions = () => {
        const sectionName = typeof section === 'string' ? section : section.section_name || section;
        return cache[sectionName] || {};
    };

    const [courseCompletions, setCourseCompletions] = useState(getInitialCompletions());
    const [examDataMap, setExamDataMap] = useState({});

    const sectionName = typeof section === 'string' ? section : section?.section_name || '';
    const userId = user?.university_id || user?.universityId || user?.id;

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!sectionName) return;

            setLoading(true);
            try {
                // 1. Fetch Basic Analytics (Students & Courses List)
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

                    if (json.data.course_performance && userId) {
                        const newCompletions = { ...courseCompletions };
                        const newExamMap = { ...examDataMap };
                        let hasCompUpdates = false;
                        let hasExamUpdates = false;

                        await Promise.all(json.data.course_performance.map(async (course) => {
                            // Parallel Fetch: Check Exam Status & Fetch Completion
                            try {
                                // A. Check Exam Status
                                if (newExamMap[course.course_id] === undefined) {
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
                                    console.log("Exam API Response:", course.course_name, examJson);

                                    // It is an exam ONLY if students array exists and has data.
                                    if (examJson.success && examJson.data && Array.isArray(examJson.data.students) && examJson.data.students.length > 0) {
                                        newExamMap[course.course_id] = examJson.data;
                                        hasExamUpdates = true;
                                        return; // It's an exam, skip completion fetch
                                    } else {
                                        newExamMap[course.course_id] = null; // Not an exam
                                        hasExamUpdates = true;
                                        // Continue to Block B to fetch completion
                                    }
                                }

                                // B. If NOT an exam, fetch Completion (if missing)
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
                        if (hasExamUpdates) setExamDataMap(newExamMap);
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

    // Derived Analytics from Sections
    const regularCourses = React.useMemo(() => {
        if (!data?.course_performance) return [];
        return data.course_performance.filter(c => !examDataMap[c.course_id]);
    }, [data, examDataMap]);

    const examCourses = React.useMemo(() => {
        if (!data?.course_performance) return [];
        return data.course_performance.filter(c => examDataMap[c.course_id]);
    }, [data, examDataMap]);

    const [inspectingTest, setInspectingTest] = useState(null);

    const sortedStudents = React.useMemo(() => {
        if (!data?.student_performance) return [];
        let sortable = [...data.student_performance];
        if (sortConfig.key) {
            sortable.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortable;
    }, [data, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // --- EXPORT LOGIC ---
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const handleExport = async () => {
        if (!data || !teachers) return;
        setIsExporting(true);
        setExportProgress(0);

        try {
            const XLSX = await import('xlsx');
            const students = sortedStudents; // Use currently sorted/filtered list
            const totalStudents = students.length;
            let processedCount = 0;

            const exportRows = [];
            const CONCURRENT_LIMIT = 5;

            // Helper for batch processing
            for (let i = 0; i < students.length; i += CONCURRENT_LIMIT) {
                const batch = students.slice(i, i + CONCURRENT_LIMIT);

                await Promise.all(batch.map(async (student) => {
                    const row = {
                        'Student Name': student.student_name,
                        'Reg ID': student.uni_reg_id,
                        'Section': section_metadata?.section_name || ''
                    };

                    try {
                        // 1. LOOKUP (to get official student_id/uuid)
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
                                // 2. FETCH PRACTICE COURSES
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

                                // 3. PROCESS EACH REGULAR COURSE
                                for (const sectionCourse of regularCourses) {
                                    const enrolled = studentCourses.find(sc => sc.course_id === sectionCourse.course_id);
                                    if (enrolled) {
                                        // A. Fetch Structure
                                        const structRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.courseStructure(sectionCourse.course_id)}`, { credentials: 'include' });
                                        const structJson = await structRes.json();
                                        const units = structJson.data || [];

                                        let courseTotalComp = 0;

                                        if (units.length > 0) {
                                            const token = getAdminToken();
                                            const headers = { 'Content-Type': 'application/json' };
                                            if (token) headers['Authorization'] = `Bearer ${token}`;

                                            // B. Fetch Unit Completions Parallel
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

                                                    // Add Unit Details to Row
                                                    row[`${sectionCourse.course_name} - ${unit.unit_title || unit.unit_name || 'Unit'} (%)`] = unitVal;
                                                    courseTotalComp += unitVal;

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

                    // Add existing Exam data if available
                    if (course_performance) {
                        course_performance.forEach(c => {
                            if (examDataMap[c.course_id]) {
                                const sCourse = student.courses.find(sc => sc.course_id === c.course_id);
                                row[`${c.course_name} - Score`] = sCourse ? sCourse.score : '-';
                                row[`${c.course_name} - Status`] = sCourse ? sCourse.status : '-';
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

            // Auto-width for columns
            const colWidths = Object.keys(exportRows[0] || {}).map(key => ({ wch: key.length + 5 }));
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, "Section Report");

            // Generate filename
            const date = new Date().toISOString().split('T')[0];
            const fileName = `${section_metadata?.section_name}_Detailed_Report_${date}.xlsx`;

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

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-gray-50 dark:bg-[#0B0F19] animate-in fade-in slide-in-from-right duration-300 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 h-[400px] w-[400px] bg-cyan-500/10 blur-[100px] pointer-events-none opacity-50 dark:opacity-100" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/5 bg-white/70 dark:bg-white/5 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="text-xs text-cyan-600 dark:text-cyan-400 uppercase tracking-wider font-semibold mb-1">Section Analytics</div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{section_metadata?.section_name}</h2>
                        <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> {section_metadata?.total_students} Students</span>
                            <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> {section_metadata?.total_courses} Courses</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isExporting && (
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Processing... {exportProgress}%</span>
                            <div className="w-32 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                    >
                        {isExporting ? <CircularProgress percentage={0} size={20} strokeWidth={3} color="white" /> : <TrendingUp className="w-4 h-4" />}
                        {isExporting ? 'Exporting...' : 'Export Excel'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* LEFT: Course Performance */}
                <div className="w-full md:w-80 p-6 border-r border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-black/20 overflow-y-auto custom-scrollbar shrink-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> Course Performance
                    </h3>
                    <div className="space-y-4">
                        {regularCourses.map(course => (
                            <div key={course.course_id} className="p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm max-w-[70%]">{course.course_name}</h4>
                                        <CircularProgress
                                            percentage={courseCompletions[course.course_id] || 0}
                                            size={40}
                                            strokeWidth={4}
                                            color="emerald"
                                        />
                                    </div>

                                    <div className="flex justify-between items-end mb-1 mt-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Score</span>
                                            <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{course.average_score}%</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Completion</span>
                                            <span className="text-sm font-bold text-emerald-500">{courseCompletions[course.course_id] || 0}%</span>
                                        </div>
                                    </div>

                                    <div className="w-full bg-gray-200 dark:bg-white/10 h-1 rounded-full overflow-hidden mt-2">
                                        <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${course.average_score}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* EXAM COURSES (No Progress, Just Action) */}
                        {examCourses.map(course => (
                            <div key={course.course_id} className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 shadow-sm relative overflow-hidden group">
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="font-bold text-purple-700 dark:text-purple-300 text-sm">{course.course_name}</h4>
                                </div>
                                <button
                                    onClick={() => setInspectingTest(examDataMap[course.course_id])}
                                    className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-purple-500/20"
                                >
                                    View Detailed Result
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Student Table */}
                <div className="flex-1 p-6 overflow-hidden flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500 dark:text-purple-400" /> Student Performance
                    </h3>

                    <div className="flex-1 overflow-auto custom-scrollbar border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-white/5 sticky top-0 backdrop-blur-md z-10">
                                <tr>
                                    <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5" onClick={() => requestSort('student_name')}>
                                        Student Name <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50" />
                                    </th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-300">Reg ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {sortedStudents.map(student => (
                                    <tr key={student.student_id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors pointer cursor-pointer" onClick={() => onStudentSelect(student)}>
                                                {student.student_name}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400 font-mono">{student.uni_reg_id}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
    // Note: 'test' here corresponds to the examDataMap entry which mimics the structure provided by user:
    // { section_name, students: [{ student_name, uni_reg_id, exam_completion_percentage, total_marks, marks_breakdown, ... }] }

    // We default to passed 'test' prop which is the real exam data object now.
    const examStudents = test?.students || [];

    const handleExport = async () => {
        try {
            const XLSX = await import('xlsx');
            const exportData = examStudents.map(s => ({
                'Student Name': s.student_name,
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
        <div className="fixed inset-0 z-[70] flex flex-col bg-gray-50 dark:bg-[#0B0F19] animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/5 bg-white/70 dark:bg-white/5 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wider font-semibold mb-1">Test Results</div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{test?.section_name || 'Exam Details'}</h2>
                        <div className="text-sm text-gray-500">{sectionMetadata?.section_name}</div>
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors shadow-lg shadow-purple-500/20"
                >
                    <TrendingUp className="w-4 h-4" /> Export Results
                </button>
            </div>

            <div className="flex-1 p-8 overflow-auto">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                                <tr>
                                    <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-300">Student Name</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-300">Reg ID</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-300 text-center">Completion</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-300 text-center">Marks (Total)</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-300 text-center">Breakdown</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-300 text-center">System Info</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {examStudents.map((student, i) => (
                                    <tr key={student.uni_reg_id || i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                        <td className="p-4 font-medium text-gray-900 dark:text-white">{student.student_name}</td>
                                        <td className="p-4 text-sm text-gray-500 font-mono">{student.uni_reg_id}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${student.exam_completion_percentage === 100 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'
                                                }`}>
                                                {student.exam_completion_percentage}%
                                            </span>
                                        </td>
                                        <td className="p-4 text-center font-bold text-gray-900 dark:text-white">
                                            {student.total_marks}
                                        </td>
                                        <td className="p-4 text-center text-xs text-gray-500">
                                            <div className="flex flex-col gap-1 items-center">
                                                <span className="text-cyan-600 dark:text-cyan-400">Coding: {student.marks_breakdown?.coding_marks || 0}</span>
                                                <span className="text-purple-600 dark:text-purple-400">MCQ: {student.marks_breakdown?.mcq_marks || 0}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center text-xs text-gray-400">
                                            {student.debug_configs?.start_config?.os ? (
                                                <div className="flex flex-col gap-1">
                                                    <span>{student.debug_configs.start_config.os.platform} / {student.debug_configs.start_config.os.arch}</span>
                                                    <span>{student.debug_configs.start_config.os.hostname}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
