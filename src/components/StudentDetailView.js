import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, BookOpen, Clock, AlertCircle, Award, Activity, Globe, ArrowRight, TrendingUp } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { API_CONFIG } from '../utils/api';
import { getAdminToken } from '../utils/cookies';
import { Skeleton } from './Skeletons';
import { useAuth } from '../context/AuthContext';

export default function StudentDetailView({ student, onBack }) {
    const [viewLink, setViewLink] = useState('courses'); // courses | deep_dive
    const [courses, setCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const { user } = useAuth();

    // Deep Dive State
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [courseStructure, setCourseStructure] = useState(null);
    const [loadingStructure, setLoadingStructure] = useState(false);

    const [selectedUnit, setSelectedUnit] = useState(null); // Expanded Unit ID
    const [subUnitHistory, setSubUnitHistory] = useState(null); // Data for right panel
    const [inspectingSubUnit, setInspectingSubUnit] = useState(null); // Which subunit is active

    // Missing States Restored
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [resultType, setResultType] = useState('mcq'); // mcq | coding
    const [fullStudent, setFullStudent] = useState(student);

    // State for Unit Analytics
    const [unitCompletions, setUnitCompletions] = useState({}); // { unitId: progress_percentage }
    const [overallCourseProgress, setOverallCourseProgress] = useState(0);

    // Initial Load & Lookup
    useEffect(() => {
        const init = async () => {
            console.log("StudentDetailView: Init with student", student);
            let currentStudent = student;

            // Ensure we have the critical UUID (student_id). If missing, force lookup.
            // Also lookup if batch_id is missing.
            const needsLookup = !currentStudent.student_id && !currentStudent.uuid;
            const needsBatch = !currentStudent.batch_id && !currentStudent.batch;

            if (needsLookup || needsBatch) {
                console.log("Missing ID/Batch, performing lookup for:", currentStudent.uni_reg_id || currentStudent.reg_id);
                try {
                    const lookupRes = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.student.lookup}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'uni_reg_id',
                            value: currentStudent.uni_reg_id || currentStudent.reg_id,
                            university_id: user?.university_id || user?.universityId || user?.id
                        }),
                        credentials: 'include'
                    });
                    const lookupJson = await lookupRes.json();

                    const found = Array.isArray(lookupJson.data) ? lookupJson.data[0] : lookupJson.data;

                    if (found) {
                        console.log("Lookup successful:", found);
                        currentStudent = { ...currentStudent, ...found };
                        setFullStudent(currentStudent);
                    } else {
                        console.warn("Lookup returned no data");
                    }
                } catch (e) {
                    console.error("Lookup failed", e);
                }
            } else {
                setFullStudent(student);
            }

            if (currentStudent.batch_id || currentStudent.batch) {
                console.log("Fetching courses for batch:", currentStudent.batch_id || currentStudent.batch);
                fetchCourses(currentStudent.batch_id || currentStudent.batch);
            } else {
                console.error("Cannot fetch courses: Missing batch_id", currentStudent);
            }
        };

        if (student) {
            init();
        }
    }, [student]);

    // Fetch history when result type changes OR subunit changes
    useEffect(() => {
        if (inspectingSubUnit && selectedCourse) {
            fetchHistory(inspectingSubUnit.unitId, inspectingSubUnit.subUnitId, resultType);
        }
    }, [resultType, inspectingSubUnit]);

    // NEW: Fetch and calculate granular unit completion
    const fetchUnitCompletion = async (studentData, courseId, units) => {
        if (!units || units.length === 0) return;

        const completions = {};
        let totalCompletion = 0;
        let fetchedCount = 0;

        // Fetch completion for each unit in parallel
        await Promise.all(units.map(async (unit) => {
            try {
                const payload = {
                    student_id: studentData.student_id || studentData.uuid || studentData.uni_reg_id || studentData.reg_id,
                    course_id: courseId,
                    unit_id: unit.unit_id
                };
                const token = getAdminToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.unitCompletion}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                    credentials: 'include'
                });

                const data = await res.json();
                if (data.success && data.data) {
                    const progress = data.data.overall_unit_completion || 0;
                    completions[unit.unit_id] = progress;
                    totalCompletion += progress;
                    fetchedCount++;
                } else {
                    completions[unit.unit_id] = 0;
                }
            } catch (e) {
                console.error(`Failed to fetch completion for unit ${unit.unit_id}`, e);
                completions[unit.unit_id] = 0;
            }
        }));

        setUnitCompletions(completions);
        // Calculate average course progress based on units
        // If fetchedCount is 0, keep 0.
        // If we want detailed average: sum(unit%)/totalUnits
        const calculatedOverall = units.length > 0 ? Math.round(totalCompletion / units.length) : 0;
        setOverallCourseProgress(calculatedOverall);
    };

    const fetchCourses = async (batchId) => {
        setLoadingCourses(true);
        try {
            if (!batchId) {
                setCourses([]);
                return;
            }
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getPracticeCoursesByBatch}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batch_id: batchId }),
                credentials: 'include'
            });
            const data = await res.json();

            let list = [];
            if (data.success && data.data) {
                if (Array.isArray(data.data)) list = data.data;
                else if (data.data.courses) list = data.data.courses;
            }
            setCourses(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingCourses(false);
        }
    };

    const handleCourseSelect = async (course) => {
        setSelectedCourse(course);
        setViewLink('deep_dive');
        setLoadingStructure(true);
        setSubUnitHistory(null);
        setInspectingSubUnit(null);
        setUnitCompletions({});
        setOverallCourseProgress(0);

        try {
            const token = getAdminToken();
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.courseStructure(course.course_id)}`, {
                credentials: 'include',
                headers
            });
            const data = await res.json();
            const structure = data.data || [];
            setCourseStructure(structure);

            // Trigger unit completion fetch
            fetchUnitCompletion(fullStudent, course.course_id, structure);

        } catch (e) {
            console.error(e);
            setCourseStructure([]);
        } finally {
            setLoadingStructure(false);
        }
    };

    const handleBackToCourses = () => {
        setViewLink('courses');
        setSelectedCourse(null);
        setCourseStructure(null);
        setSubUnitHistory(null);
    };

    const handleSubUnitClick = (unitId, subUnitId, subUnitData) => {
        // Just update state; useEffect will handle the fetch (preserving current resultType)
        setInspectingSubUnit({ ...subUnitData, unitId, subUnitId, name: subUnitData.title });
    };

    const handleResultTypeChange = (type) => {
        if (type !== resultType) {
            setResultType(type);
        }
    };

    const fetchHistory = async (unitId, subUnitId, type) => {
        setLoadingHistory(true);
        const MAX_ATTEMPTS = 5;
        const allAttempts = [];

        try {
            for (let i = 1; i <= MAX_ATTEMPTS; i++) {
                const payload = {
                    student_id: fullStudent.student_id || fullStudent.uuid || fullStudent.uni_reg_id || fullStudent.reg_id,
                    course_id: selectedCourse.course_id,
                    unit_id: unitId,
                    sub_unit_id: subUnitId,
                    result_type: type,
                    attempt: i
                };

                // console.log(`Fetching Attempt ${i} Payload:`, payload);
                const token = getAdminToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                try {
                    const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.subUnitDetails}`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(payload),
                        credentials: 'include'
                    });

                    // If request fails physically (500, 404, etc.), we likely stop unless it's just 'not found' which comes as 200 { success: false } usually?
                    // But if API returns 404 for no data, we catch it. 
                    // Let's assume API returns 200 with success:false if no data, based on user input.

                    if (!res.ok) {
                        // If it's a real server error, we might want to stop
                        break;
                    }

                    const data = await res.json();

                    if (!data.success) {
                        // Check message for "No data found" signal
                        if (data.message && data.message.includes("No data found")) {
                            break; // Stop loop, no more attempts
                        }
                    }

                    if (data && data.success && data.data) {
                        // Handle Detail Response (Single Object) -> Wrap in List
                        let summaryItem = null;

                        if (data.data.overview) {
                            const detail = data.data;
                            summaryItem = {
                                ...detail, // CACHE: Preserve full details 
                                attempt: detail.overview.attempt_number || i,
                                attempt_count: detail.overview.attempt_number || i,
                                marks_obtained: detail.overview.total_score,
                                total_marks: detail.overview.max_score,
                                score: detail.overview.total_score,
                            };
                        } else if (Array.isArray(data.data) && data.data.length > 0) {
                            // If it returned a list (legacy behavior?), just take the first if we asked for specific attempt? 
                            // Or maybe it's the history list itself. Use caution.
                            // Given the payload asks for `attempt: i`, we expect a specific attempt detail.
                            // If the API ignores `attempt` param and returns ALL, we would just setSubUnitHistory(data.data) and break.
                            // BUT user said "fetching attempty 1 by default", implies we need explicit loop.
                            summaryItem = data.data[0];
                        }

                        if (summaryItem) {
                            allAttempts.push(summaryItem);
                        }
                    } else {
                        break; // No data or success:false without specific message
                    }

                } catch (innerErr) {
                    console.warn(`Attempt ${i} fetch failed`, innerErr);
                    break;
                }
            }

            // Sort attempts descending (newest first)
            allAttempts.sort((a, b) => (b.attempt || 0) - (a.attempt || 0));
            setSubUnitHistory(allAttempts);

        } catch (e) {
            console.error(e);
            setSubUnitHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Toggle Unit Accordion
    const toggleUnit = (unitId) => {
        if (selectedUnit === unitId) setSelectedUnit(null);
        else setSelectedUnit(unitId);
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right duration-300 bg-gray-50 dark:bg-[#0B0F19]">
            {/* Background Effects (Matches Dashboard) */}
            <div className="fixed -top-40 -left-48 h-[38rem] w-[38rem] bg-cyan-500/10 blur-3xl rounded-full pointer-events-none opacity-50 dark:opacity-100" />
            <div className="fixed -bottom-44 -right-40 h-[42rem] w-[42rem] bg-indigo-500/10 blur-3xl rounded-full pointer-events-none opacity-50 dark:opacity-100" />

            {/* Header */}
            <div className="flex items-center gap-4 p-6 border-b border-gray-200 dark:border-white/5 bg-white/70 dark:bg-white/5 backdrop-blur-xl sticky top-0 z-10 relative">
                <button
                    onClick={viewLink === 'deep_dive' ? handleBackToCourses : onBack}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        {student.name || student.student_name}
                        <span className="text-sm font-normal px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-mono">
                            {student.uni_reg_id || student.reg_id}
                        </span>
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Batch: {
                            (student.batch_name || student.batch)
                                ? (student.batch_name || student.batch)
                                : (student.batch_id && student.batch_id.length < 10 ? student.batch_id : 'N/A')
                        } • Enrolled Courses: {courses.length}
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative z-10">
                {/* VIEW: Course Grid */}
                {viewLink === 'courses' && (
                    <CoursesGridView
                        courses={courses}
                        loading={loadingCourses}
                        onSelect={handleCourseSelect}
                    />
                )}

                {/* VIEW: Deep Dive (Split View) */}
                {viewLink === 'deep_dive' && selectedCourse && (
                    <div className="flex h-full">
                        {/* LEFT COLUMN: Course Structure */}
                        <div className="w-1/3 min-w-[350px] border-r border-gray-200 dark:border-white/5 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-black/10 backdrop-blur-md p-6">
                            <div className="mb-6">
                                <div className="text-xs text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-2">Selected Course</div>
                                <h3 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white mb-4">{selectedCourse.course_name}</h3>
                                <div className="flex items-center gap-3 p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
                                    <CircularProgress percentage={overallCourseProgress} size={48} strokeWidth={4} />
                                    <div>
                                        <div className="text-gray-900 dark:text-white font-bold">Overall Progress</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Based on completed units</div>
                                    </div>
                                </div>
                            </div>

                            {loadingStructure ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl bg-white/5" />)}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {courseStructure && Array.isArray(courseStructure) && courseStructure.map((unit) => (
                                        <div key={unit.unit_id} className="rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-white/5 overflow-hidden transition-all shadow-sm dark:shadow-none">
                                            {/* Unit Header */}
                                            <button
                                                onClick={() => toggleUnit(unit.unit_id)}
                                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${selectedUnit === unit.unit_id ? 'bg-cyan-500 shadow-cyan-500/60' : 'bg-gray-400 dark:bg-gray-600 shadow-transparent'}`} />
                                                    <span className={`font-semibold text-sm text-left ${selectedUnit === unit.unit_id ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-300'}`}>{unit.unit_name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <CircularProgress percentage={unitCompletions[unit.unit_id] || 0} size={32} strokeWidth={3} />
                                                    {selectedUnit === unit.unit_id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                                </div>
                                            </button>

                                            {/* Subunits List */}
                                            {selectedUnit === unit.unit_id && (
                                                <div className="bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5 p-2 space-y-1">
                                                    {unit.sub_units && unit.sub_units.map((sub) => (
                                                        <button
                                                            key={sub.sub_unit_id}
                                                            onClick={() => handleSubUnitClick(unit.unit_id, sub.sub_unit_id, sub)}
                                                            className={`w-full text-left p-3 rounded-lg text-xs transition-all flex justify-between items-center group
                                                                ${inspectingSubUnit?.subUnitId === sub.sub_unit_id
                                                                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 font-medium'
                                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}`
                                                            }
                                                        >
                                                            <span>{sub.title}</span>
                                                            {inspectingSubUnit?.subUnitId === sub.sub_unit_id && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Analytics / History / Detail */}
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
                            {inspectingSubUnit ? (
                                <DeepDiveRightPanel
                                    student={student}
                                    courseId={selectedCourse.course_id}
                                    subUnit={inspectingSubUnit}
                                    history={subUnitHistory}
                                    loadingHistory={loadingHistory}
                                    resultType={resultType}
                                    setResultType={handleResultTypeChange}
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                                    <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-6 animate-pulse border border-gray-200 dark:border-white/5">
                                        <Award className="w-10 h-10 opacity-20" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Course Overview</h3>
                                    <p className="max-w-md mx-auto text-gray-400">Select a subunit from the left panel to view detailed performance metrics, attempt history, and scores.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}

// Sub-components

const CoursesGridView = ({ courses, loading, onSelect }) => {
    if (loading) {
        return (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl bg-white/5" />)}
            </div>
        );
    }
    return (
        <div className="p-8 overflow-y-auto h-full custom-scrollbar">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Enrolled Courses
            </h3>
            {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSelect(course)}
                            className="text-left group relative overflow-hidden p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-cyan-500/30 hover:bg-gray-50 dark:hover:bg-white/10 transition-all duration-300 backdrop-blur-sm shadow-sm dark:shadow-none"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 shadow-lg border border-white/5">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="bg-black/20 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono text-gray-500 border border-white/5">
                                        {course.course_code}
                                    </div>
                                </div>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                {course.course_name}
                            </h4>
                            <div className="mt-4 flex items-center text-sm text-gray-500 group-hover:text-cyan-500/70 transition-colors">
                                View Performance <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 py-10">
                    No courses found for this student.
                </div>
            )}
        </div>
    );
};

const DeepDiveRightPanel = ({ student, courseId, subUnit, history, loadingHistory, resultType, setResultType }) => {
    const [viewMode, setViewMode] = useState('history'); // history | detail
    const [selectedAttempt, setSelectedAttempt] = useState(null);
    const [attemptDetails, setAttemptDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Reset view mode when subunit changes
    useEffect(() => {
        setViewMode('history');
        setSelectedAttempt(null);
        setAttemptDetails(null);
    }, [subUnit.subUnitId, subUnit.unitId]);

    const handleAttemptClick = async (attempt) => {
        // OPTIMIZATION: If we already have the full details (which we do for the default attempt 1 fetch), use it!
        if (attempt.overview && attempt.submissions) {
            console.log("Using cached attempt details", attempt);
            setAttemptDetails(attempt);
            setViewMode('detail');
            return;
        }

        setSelectedAttempt(attempt);
        setViewMode('detail');
        setLoadingDetails(true);

        try {
            const payload = {
                student_id: student.student_id || student.uuid || student.uni_reg_id || student.reg_id,
                course_id: courseId,
                unit_id: subUnit.unitId,
                sub_unit_id: subUnit.subUnitId,
                result_type: resultType,
                attempt: attempt.attempt || attempt.attempt_count
            };

            // ... (rest of fetch logic remains for non-cached attempts) ...

            console.log("Fetching Attempt Details Payload:", payload);
            // UPDATE: Use Admin Endpoint for consistency as it supports proper student lookup
            const token = getAdminToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.subUnitDetails}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error("Attempt Details Fetch Error:", res.status, errText);
            }

            const data = await res.json();

            if (data.success) {
                setAttemptDetails(data.data);
            } else {
                console.error("Failed to load details", data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleExportAttempt = async () => {
        if (!attemptDetails) return;
        try {
            const XLSX = await import('xlsx');

            // Sheet 1: Overview
            const overviewData = [
                { Metric: 'Student Name', Value: student.name || student.student_name },
                { Metric: 'Reg ID', Value: student.uni_reg_id || student.reg_id },
                { Metric: 'Sub Unit', Value: subUnit.name || subUnit.title },
                { Metric: '', Value: '' },
                { Metric: 'Attempt Number', Value: attemptDetails.overview.attempt_number },
                { Metric: 'Score', Value: `${attemptDetails.overview.total_score} / ${attemptDetails.overview.max_score}` },
                { Metric: 'Percentage', Value: `${attemptDetails.overview.percentage}%` },
                { Metric: 'Status', Value: attemptDetails.overview.status },
                { Metric: 'Result Type', Value: resultType },
                { Metric: 'Start Time', Value: new Date(attemptDetails.overview.start_time).toLocaleString() },
                { Metric: 'End Time', Value: new Date(attemptDetails.overview.end_time).toLocaleString() },
            ];

            if (attemptDetails.proctoring_metrics) {
                overviewData.push({ Metric: '', Value: '' });
                overviewData.push({ Metric: 'PROCTORING METRICS', Value: '' });
                Object.entries(attemptDetails.proctoring_metrics).forEach(([k, v]) => {
                    overviewData.push({ Metric: k, Value: v });
                });
            }

            const wsOverview = XLSX.utils.json_to_sheet(overviewData);

            // Sheet 2: Submissions
            let submissionsData = [];
            if (attemptDetails.submissions) {
                submissionsData = attemptDetails.submissions.map((sub, i) => {
                    const row = {
                        'Q#': i + 1,
                        'Title': sub.question_title || 'Question',
                        'Description': sub.question_desc ? sub.question_desc.substring(0, 100) + '...' : '',
                        'Score': sub.score_obtained,
                        // 'Max Score': resultType === 'coding' ? ((sub.test_cases?.length || 0) * 10) : 1,
                    };

                    if (resultType === 'mcq') {
                        row['Selected Index'] = sub.submitted_answer_index;
                        row['Selected Text'] = sub.submitted_answer_text;
                    } else {
                        row['Language'] = sub.language;
                        row['Code'] = sub.submitted_code || sub.submitted_answer;
                    }
                    return row;
                });
            }
            const wsSubmissions = XLSX.utils.json_to_sheet(submissionsData);

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");
            XLSX.utils.book_append_sheet(wb, wsSubmissions, "Submissions");

            const safeName = (student.name || 'Student').replace(/[^a-z0-9]/gi, '_');
            const safeSubUnit = (subUnit.name || 'Unit').replace(/[^a-z0-9]/gi, '_');
            const fileName = `${safeName}_${safeSubUnit}_Attempt_${attemptDetails.overview.attempt_number}.xlsx`;

            XLSX.writeFile(wb, fileName);
        } catch (e) {
            console.error("Export Error", e);
            alert("Failed to export attempt details.");
        }
    };

    if (viewMode === 'detail') {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={() => setViewMode('history')}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to History
                    </button>
                    {!loadingDetails && attemptDetails && (
                        <button
                            onClick={handleExportAttempt}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <TrendingUp className="w-4 h-4" /> Export Details
                        </button>
                    )}
                </div>

                {loadingDetails ? (
                    <div className="space-y-6">
                        <Skeleton className="h-32 w-full rounded-2xl bg-white dark:bg-white/5" />
                        <Skeleton className="h-96 w-full rounded-2xl bg-white dark:bg-white/5" />
                    </div>
                ) : attemptDetails ? (
                    <>
                        {/* 1. Overview Card */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
                                <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Attempt</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    #{attemptDetails.overview.attempt_number || '-'}
                                </div>
                            </div>
                            <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
                                <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Score</div>
                                <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">
                                    {attemptDetails.overview.total_score} <span className="text-sm text-gray-400 dark:text-gray-500 font-normal">/ {attemptDetails.overview.max_score}</span>
                                </div>
                            </div>
                            <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
                                <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Percentage</div>
                                <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">
                                    {attemptDetails.overview.percentage}%
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
                                <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Result Type</div>
                                <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400 capitalize">{resultType}</div>
                            </div>
                        </div>

                        {/* 1.5 Completion Stats */}
                        {attemptDetails.completion_stats && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                                    <div className="text-xs text-purple-500 font-bold uppercase">Total Questions</div>
                                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                        {attemptDetails.completion_stats.total_coding || attemptDetails.completion_stats.total_mcq || 0}
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                    <div className="text-xs text-blue-500 font-bold uppercase">Showing</div>
                                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                        {attemptDetails.completion_stats.total_coding_show || attemptDetails.completion_stats.total_mcq_show || 0}
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                    <div className="text-xs text-emerald-500 font-bold uppercase">Submitted</div>
                                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {attemptDetails.completion_stats.user_submitted_count || 0}
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                                    <div className="text-xs text-cyan-500 font-bold uppercase">Completion</div>
                                    <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                                        {attemptDetails.completion_stats.question_completion_percentage}%
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. Proctoring Metrics */}
                        {attemptDetails.proctoring_metrics && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" /> Warnings & Violations
                                    </h3>
                                    <div className="space-y-3">
                                        <MetricRow label="Face Warnings" value={attemptDetails.proctoring_metrics.face_warnings} isWarning={attemptDetails.proctoring_metrics.face_warnings > 0} />
                                        <MetricRow label="Focus Lost" value={attemptDetails.proctoring_metrics.focus_lost_count} isWarning={attemptDetails.proctoring_metrics.focus_lost_count > 0} />
                                        <MetricRow label="Tab Switches" value={attemptDetails.proctoring_metrics.tab_switches} isWarning={attemptDetails.proctoring_metrics.tab_switches > 0} />
                                        <MetricRow label="Blocked Seconds" value={attemptDetails.proctoring_metrics.blocked_seconds} suffix="s" />
                                    </div>
                                </div>
                                <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" /> System Health
                                    </h3>
                                    <div className="space-y-3">
                                        <MetricRow label="Network Health" value={attemptDetails.proctoring_metrics.network_health} />
                                        <MetricRow label="Disconnects" value={attemptDetails.proctoring_metrics.network_disconnects} isWarning={attemptDetails.proctoring_metrics.network_disconnects > 0} />
                                        <div className="pt-2 border-t border-white/10 mt-2">
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Session timestamps</div>
                                            <div className="flex justify-between text-xs text-gray-400">
                                                <span>{new Date(attemptDetails.overview.start_time).toLocaleTimeString()}</span>
                                                <ArrowRight className="w-3 h-3" />
                                                <span>{new Date(attemptDetails.overview.end_time).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. System & Network Logs (Highlighted) */}
                        {attemptDetails.debug_configs && (
                            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden">
                                {/* Decorative Glow */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />

                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                                    <Globe className="w-5 h-5 text-cyan-400" /> System & Network Logs
                                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 ml-2">Debug Info</span>
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm relative z-10">
                                    {/* Start Config */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Session Start</div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 font-mono text-xs text-gray-300">
                                            <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
                                                <span className="text-gray-500">Timestamp</span>
                                                <span className="text-white">{new Date(attemptDetails.debug_configs.start_config?.timestamp || Date.now()).toLocaleString()}</span>
                                            </div>
                                            <div className="grid grid-cols-[60px_1fr] gap-2">
                                                <span className="text-gray-500">IP:</span>
                                                <span className="truncate" title={attemptDetails.debug_configs.start_config?.network?.interfaces?.[0]?.ip}>{attemptDetails.debug_configs.start_config?.network?.interfaces?.[0]?.ip || 'Unknown'}</span>

                                                <span className="text-gray-500">MAC:</span>
                                                <span className="truncate" title={attemptDetails.debug_configs.start_config?.network?.interfaces?.[0]?.mac}>{attemptDetails.debug_configs.start_config?.network?.interfaces?.[0]?.mac || 'Unknown'}</span>

                                                <span className="text-gray-500">OS:</span>
                                                <span className="truncate">{attemptDetails.debug_configs.start_config?.os?.platform} {attemptDetails.debug_configs.start_config?.os?.release}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* End Config */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-purple-400" />
                                            <div className="text-xs text-purple-400 font-bold uppercase tracking-wider">Session End</div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 font-mono text-xs text-gray-300">
                                            <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
                                                <span className="text-gray-500">Captured</span>
                                                <span className="text-white">{new Date(attemptDetails.debug_configs.end_config?.capturedAt || attemptDetails.debug_configs.end_config?.timestamp || Date.now()).toLocaleString()}</span>
                                            </div>
                                            <div className="grid grid-cols-[60px_1fr] gap-2">
                                                <span className="text-gray-500">IP:</span>
                                                <span className="truncate" title={attemptDetails.debug_configs.end_config?.network?.interfaces?.[0]?.ip}>{attemptDetails.debug_configs.end_config?.network?.interfaces?.[0]?.ip || 'Unknown'}</span>

                                                <span className="text-gray-500">MAC:</span>
                                                <span className="truncate" title={attemptDetails.debug_configs.end_config?.network?.interfaces?.[0]?.mac}>{attemptDetails.debug_configs.end_config?.network?.interfaces?.[0]?.mac || 'Unknown'}</span>

                                                <span className="text-gray-500">Hostname:</span>
                                                <span className="truncate">{attemptDetails.debug_configs.end_config?.os?.hostname || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. Submissions / Questions */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                {resultType === 'coding' ? 'Code Submissions' : 'Question Responses'}
                            </h3>
                            {attemptDetails.submissions && attemptDetails.submissions.map((sub, idx) => (
                                <div key={idx} className="group rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-white/5 overflow-hidden shadow-sm dark:shadow-none">
                                    <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5 flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            {/* Hide generic titles */}
                                            {sub.question_title && sub.question_title !== "Question Details Fetched" && (
                                                <h4 className="text-gray-900 dark:text-gray-200 font-bold text-sm mb-2">{sub.question_title}</h4>
                                            )}

                                            {/* Description with formatting */}
                                            <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed bg-gray-100 dark:bg-black/20 p-3 rounded-lg border border-gray-200 dark:border-white/5">
                                                {sub.question_desc}
                                            </div>

                                            {/* Input/Output Formats */}
                                            {(sub.input_format || sub.output_format) && (
                                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {sub.input_format && (
                                                        <div className="text-xs text-gray-500">
                                                            <span className="font-bold text-gray-400 block mb-1">Input Format</span>
                                                            {sub.input_format}
                                                        </div>
                                                    )}
                                                    {sub.output_format && (
                                                        <div className="text-xs text-gray-500">
                                                            <span className="font-bold text-gray-400 block mb-1">Output Format</span>
                                                            {sub.output_format}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-2 min-w-[120px]">
                                            <div className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                                                {resultType === 'coding' ? 'Coding Score' : 'MCQ Score'}
                                            </div>
                                            <div className={`text-2xl font-bold ${sub.score_obtained > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {resultType === 'coding' ? sub.score_obtained : sub.score_obtained}
                                                <span className="text-sm font-normal text-gray-500">
                                                    / {resultType === 'coding'
                                                        ? (sub.test_cases?.filter(tc => tc.name?.toLowerCase().includes('hidden')).length || 0)
                                                        : 1}
                                                </span>
                                            </div>
                                            <div className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-gray-300 font-mono">
                                                {sub.language || 'N/A'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* MCQ Options */}
                                    {sub.options && (
                                        <div className="p-4 bg-white/5 space-y-2">
                                            {sub.options.map((opt, i) => {
                                                // ROBUST CHECK: Match by Index OR Text (in case index is missing/wrong)
                                                const isSelected = i === sub.submitted_answer_index ||
                                                    (sub.submitted_answer_text && opt.option === sub.submitted_answer_text);
                                                const isCorrect = opt.isAnswer;

                                                let styleClass = 'bg-white/5 border-white/5 text-gray-400'; // Default
                                                if (isCorrect) styleClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                                                else if (isSelected) styleClass = 'bg-red-500/10 border-red-500/30 text-red-400';

                                                return (
                                                    <div key={i} className={`p-3 rounded-lg border text-sm flex justify-between items-center ${styleClass}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center
                                                                ${isSelected || isCorrect ? 'border-current' : 'border-gray-500'}`}>
                                                                {isSelected && <div className="w-2 h-2 rounded-full bg-current" />}
                                                            </div>
                                                            <span>{opt.option}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {isSelected && <span className="text-[10px] font-bold uppercase tracking-wider border border-current px-1.5 py-0.5 rounded">Your Answer</span>}
                                                            {isCorrect && <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 px-1.5 py-0.5 rounded">Correct</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Code Snippet */}
                                    {(sub.submitted_code || sub.submitted_answer) && resultType === 'coding' && (
                                        <div className="bg-[#0d1117] p-4 text-xs font-mono overflow-x-auto text-gray-300 border-t border-white/5 relative">
                                            <div className="absolute top-2 right-2 text-[10px] text-gray-500 uppercase flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${sub.score_obtained > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                Submitted Code
                                            </div>
                                            <pre>{sub.submitted_code || sub.submitted_answer}</pre>
                                        </div>
                                    )}

                                    {/* Test Cases (Coding) - Detailed Input/Output View */}
                                    {sub.test_cases && sub.test_cases.length > 0 && (
                                        <div className="p-4 bg-gray-50 dark:bg-black/10 border-t border-gray-200 dark:border-white/5">
                                            <div className="text-[10px] font-bold text-gray-500 uppercase mb-3">Test Cases Details</div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {sub.test_cases.map((tc, tci) => (
                                                    <div key={tci} className="p-3 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-cyan-500/30 transition-colors">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-xs text-gray-900 dark:text-gray-200">{tc.name}</span>
                                                                {tc.name?.toLowerCase().includes('hidden') && (
                                                                    <span className="text-[9px] uppercase tracking-wider bg-gray-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">Hidden</span>
                                                                )}
                                                                {(() => {
                                                                    const isHidden = tc.name?.toLowerCase().includes('hidden');
                                                                    if (isHidden && sub.formattedResult) {
                                                                        // Parse "Hidden Case X"
                                                                        const parts = tc.name.match(/Hidden Case (\d+)/i);
                                                                        if (parts && parts[1]) {
                                                                            const caseNum = parts[1];
                                                                            const resultKey = `testCase${caseNum}`;
                                                                            // Find the result object
                                                                            const resultObj = sub.formattedResult.find(r => r[resultKey]);
                                                                            if (resultObj) {
                                                                                const passed = resultObj[resultKey]?.testCasePassed;
                                                                                return passed ? (
                                                                                    <span className="text-[9px] uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Passed</span>
                                                                                ) : (
                                                                                    <span className="text-[9px] uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">Failed</span>
                                                                                );
                                                                            }
                                                                        }
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div>
                                                                <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Input</div>
                                                                <div className="bg-gray-100 dark:bg-black/30 p-2 rounded text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                                                                    {tc.input || '-'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Expected Output</div>
                                                                <div className="bg-gray-100 dark:bg-black/30 p-2 rounded text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                                                                    {tc.expected_output || '-'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center text-gray-500">No details available.</div>
                )}
            </div>
        );
    }

    // HISTORY VIEW
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="pb-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-gray-400 text-sm uppercase tracking-wider font-semibold">Performance Details</div>
                </div>

                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{subUnit.name}</h2>

                {/* TABS / SWITCH */}
                <div className="p-1 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 inline-flex shadow-sm dark:shadow-none">
                    <button
                        onClick={() => setResultType('mcq')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${resultType === 'mcq'
                            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                    >
                        MCQ Progress
                    </button>
                    <button
                        onClick={() => setResultType('coding')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${resultType === 'coding'
                            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                    >
                        Coding / Questions
                    </button>
                </div>
            </div>

            {loadingHistory ? (
                <div className="space-y-4">
                    <Skeleton className="h-20 w-full rounded-xl bg-white/5" />
                    <Skeleton className="h-20 w-full rounded-xl bg-white/5" />
                </div>
            ) : (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-white dark:bg-white/5 dark:bg-gradient-to-br dark:from-emerald-500/10 dark:to-green-500/5 border border-gray-200 dark:border-emerald-500/20 backdrop-blur-sm shadow-sm dark:shadow-none">
                            <div className="text-gray-500 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">Total Attempts</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{history?.length || 0}</div>
                        </div>
                        <div className="p-5 rounded-2xl bg-white dark:bg-white/5 dark:bg-gradient-to-br dark:from-blue-500/10 dark:to-indigo-500/5 border border-gray-200 dark:border-blue-500/20 backdrop-blur-sm shadow-sm dark:shadow-none">
                            <div className="text-gray-500 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">Best Score</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                {history?.length > 0
                                    ? Math.max(...history.map(h => h.score || h.marks_obtained || 0))
                                    : '-'}
                            </div>
                        </div>

                    </div>

                    <h3 className="text-xl font-bold mt-8 mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Clock className="w-5 h-5 text-gray-400" />
                        Attempt History ({resultType.toUpperCase()})
                    </h3>
                    <div className="space-y-3">
                        {history && history.length > 0 ? (
                            history.map((attempt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAttemptClick(attempt)}
                                    className="w-full text-left p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 flex justify-between items-center hover:border-cyan-500/30 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors group shadow-sm dark:shadow-none"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center font-bold text-gray-400 border border-gray-200 dark:border-white/5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-colors">
                                            #{attempt.attempt || attempt.attempt_count}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">Attempt {attempt.attempt_count}</div>
                                            <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                                                <span className="flex items-center gap-1">{new Date().toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <div>
                                            <div className="text-xl font-bold text-emerald-500 dark:text-emerald-400">{attempt.marks_obtained} <span className="text-sm text-gray-500 font-normal">/ {attempt.total_marks}</span></div>
                                            <div className="text-xs text-gray-500">Score</div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-white dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-gray-500">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                No attempts found for this subunit in {resultType}.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const MetricRow = ({ label, value, suffix = '', isWarning = false }) => (
    <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
        <span className={`font-mono font-bold ${isWarning ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {value}{suffix}
        </span>
    </div>
);
