import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, BookOpen, Clock, AlertCircle, Award, Activity, Globe, ArrowRight, TrendingUp, Check, X, Trophy, Medal, Star, Calendar, Target, Zap, Timer, Flame, Code, FileText, Eye, EyeOff } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { API_CONFIG } from '../utils/api';
import { getAdminToken } from '../utils/cookies';
import { Skeleton } from './Skeletons';
import { useAuth } from '../context/AuthContext';

export default function StudentDetailView({ student, onBack }) {
    const [viewLink, setViewLink] = useState('courses');
    const [courses, setCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const { user } = useAuth();

    const [selectedCourse, setSelectedCourse] = useState(null);
    const [courseStructure, setCourseStructure] = useState(null);
    const [loadingStructure, setLoadingStructure] = useState(false);

    const [selectedUnit, setSelectedUnit] = useState(null);
    const [subUnitHistory, setSubUnitHistory] = useState(null);
    const [inspectingSubUnit, setInspectingSubUnit] = useState(null);

    const [loadingHistory, setLoadingHistory] = useState(false);
    const [resultType, setResultType] = useState('mcq');
    const [fullStudent, setFullStudent] = useState(student);

    const [unitCompletions, setUnitCompletions] = useState({}); // { unitId: progress_percentage }
    const [unitBreakdowns, setUnitBreakdowns] = useState({}); // { unitId: sub_unit_breakdown[] }
    const [overallCourseProgress, setOverallCourseProgress] = useState(0);

    useEffect(() => {
        const init = async () => {
            let currentStudent = student;

            const needsLookup = !currentStudent.student_id && !currentStudent.uuid;
            const needsBatch = !currentStudent.batch_id && !currentStudent.batch;

            if (needsLookup || needsBatch) {
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
                        currentStudent = { ...currentStudent, ...found };
                        setFullStudent(currentStudent);
                    }
                } catch (e) {
                    console.error("Lookup failed", e);
                }
            } else {
                setFullStudent(student);
            }

            if (currentStudent.batch_id || currentStudent.batch) {
                fetchCourses(currentStudent.batch_id || currentStudent.batch);
            }
        };

        if (student) init();
    }, [student]);

    useEffect(() => {
        if (inspectingSubUnit && selectedCourse) {
            fetchHistory(inspectingSubUnit.unitId, inspectingSubUnit.subUnitId, resultType);
        }
    }, [resultType, inspectingSubUnit]);

    // Fetch unit completion when a unit is expanded
    const fetchSingleUnitCompletion = async (unitId) => {
        if (unitBreakdowns[unitId]) return; // Already fetched

        try {
            const payload = {
                student_id: fullStudent.student_id || fullStudent.uuid || fullStudent.uni_reg_id || fullStudent.reg_id,
                course_id: selectedCourse.course_id,
                unit_id: unitId
            };
            const token = getAdminToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.unitCompletion}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            const data = await res.json();
            if (data.success && data.data) {
                setUnitCompletions(prev => ({
                    ...prev,
                    [unitId]: data.data.overall_unit_completion || 0
                }));
                setUnitBreakdowns(prev => ({
                    ...prev,
                    [unitId]: data.data.sub_unit_breakdown || []
                }));
            }
        } catch (e) {
            console.error(`Failed to fetch completion for unit ${unitId}`, e);
        }
    };

    // Initial course progress calculation
    const fetchInitialCourseProgress = async (studentData, courseId, units) => {
        if (!units || units.length === 0) return;

        let totalCompletion = 0;
        let fetchedCount = 0;

        await Promise.all(units.map(async (unit) => {
            try {
                const payload = {
                    student_id: studentData.student_id || studentData.uuid || studentData.uni_reg_id || studentData.reg_id,
                    course_id: courseId,
                    unit_id: unit.unit_id
                };
                const token = getAdminToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.unitCompletion}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                    credentials: 'include'
                });

                const data = await res.json();
                if (data.success && data.data) {
                    const progress = data.data.overall_unit_completion || 0;
                    setUnitCompletions(prev => ({ ...prev, [unit.unit_id]: progress }));
                    totalCompletion += progress;
                    fetchedCount++;
                }
            } catch (e) {
                console.error(`Failed to fetch completion for unit ${unit.unit_id}`, e);
            }
        }));

        setOverallCourseProgress(units.length > 0 ? Math.round(totalCompletion / units.length) : 0);
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
        setUnitBreakdowns({});
        setOverallCourseProgress(0);

        try {
            const token = getAdminToken();
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.courseStructure(course.course_id)}`, {
                credentials: 'include',
                headers
            });
            const data = await res.json();
            const structure = data.data || [];
            setCourseStructure(structure);
            fetchInitialCourseProgress(fullStudent, course.course_id, structure);
        } catch (e) {
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
        setSelectedUnit(null);
    };

    const handleSubUnitClick = (unitId, subUnitId, subUnitData) => {
        // Get breakdown info for this subunit
        const breakdown = unitBreakdowns[unitId]?.find(b => b.sub_unit_id === subUnitId);
        const details = breakdown?.details || subUnitData.details || {};

        // Determine available types
        const hasMCQ = details.has_mcq === true;
        const hasCoding = details.has_coding === true || (typeof details.has_coding === 'number' && details.has_coding > 0);

        let nextType = resultType;

        // Auto-switch type if the current one isn't available
        if (resultType === 'coding' && !hasCoding && hasMCQ) nextType = 'mcq';
        else if (resultType === 'mcq' && !hasMCQ && hasCoding) nextType = 'coding';
        else if (!hasMCQ && hasCoding) nextType = 'coding';
        else if (hasMCQ && !hasCoding) nextType = 'mcq';

        if (nextType !== resultType) setResultType(nextType);

        setInspectingSubUnit({
            ...subUnitData,
            unitId,
            subUnitId,
            name: subUnitData.title,
            breakdownDetails: details, // Pass the breakdown details
            hasMCQ,
            hasCoding
        });
    };

    const handleResultTypeChange = (type) => {
        if (type !== resultType) setResultType(type);
    };

    const fetchHistory = async (unitId, subUnitId, type) => {
        setLoadingHistory(true);
        const MAX_ATTEMPTS = 10;
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

                const token = getAdminToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                try {
                    const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.subUnitDetails}`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(payload),
                        credentials: 'include'
                    });

                    if (!res.ok) break;

                    let data;
                    try {
                        const text = await res.text();
                        data = JSON.parse(text);
                    } catch (e) {
                        break;
                    }

                    if (!data.success) {
                        if (data.message && data.message.includes("No data found")) break;
                    }

                    if (data && data.success && data.data) {
                        let summaryItem = null;

                        if (data.data.overview) {
                            const detail = data.data;
                            summaryItem = {
                                ...detail,
                                attempt: detail.overview.attempt_number || i,
                                attempt_count: detail.overview.attempt_number || i,
                                marks_obtained: detail.overview.total_score,
                                total_marks: detail.overview.max_score,
                                score: detail.overview.total_score,
                                max_score: detail.overview.max_score,
                            };
                        } else if (Array.isArray(data.data) && data.data.length > 0) {
                            summaryItem = data.data[0];
                        }

                        if (summaryItem) {
                            const hasSubmissions = summaryItem.submissions && Array.isArray(summaryItem.submissions) && summaryItem.submissions.length > 0;
                            if (hasSubmissions) allAttempts.push(summaryItem);
                        }
                    } else {
                        break;
                    }
                } catch (innerErr) {
                    break;
                }
            }

            allAttempts.sort((a, b) => (b.attempt || 0) - (a.attempt || 0));
            setSubUnitHistory(allAttempts);
        } catch (e) {
            setSubUnitHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const toggleUnit = (unitId) => {
        if (selectedUnit === unitId) {
            setSelectedUnit(null);
        } else {
            setSelectedUnit(unitId);
            // Fetch breakdown when unit is opened
            fetchSingleUnitCompletion(unitId);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right duration-300 bg-gray-50 dark:bg-[#0B0F19]">
            {/* Background Effects */}
            <div className="fixed -top-40 -left-48 h-[38rem] w-[38rem] bg-cyan-500/10 blur-3xl rounded-full pointer-events-none opacity-50 dark:opacity-100" />
            <div className="fixed -bottom-44 -right-40 h-[42rem] w-[42rem] bg-indigo-500/10 blur-3xl rounded-full pointer-events-none opacity-50 dark:opacity-100" />

            {/* Header */}
            <div className="relative flex items-center gap-6 p-8 border-b border-gray-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10 shadow-lg overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-10">
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1 h-12">
                        {[60, 40, 75, 50, 90, 30, 80, 55, 70, 45, 85, 65].map((h, i) => (
                            <div key={i} className="w-1.5 bg-cyan-500 rounded-full animate-pulse" style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }} />
                        ))}
                    </div>
                </div>

                <button
                    onClick={viewLink === 'deep_dive' ? handleBackToCourses : onBack}
                    className="group p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 hover:from-blue-500 hover:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600 text-gray-700 dark:text-gray-300 hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:scale-110 z-10"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>

                <div className="flex-1 z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg ring-2 ring-white/10">
                            {(student.name || student.student_name || 'S')[0].toUpperCase()}
                        </div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-3">
                            {student.name || student.student_name}
                        </h2>
                        <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 text-cyan-700 dark:text-cyan-400 border-2 border-cyan-500/30 font-mono text-sm font-bold shadow-md">
                            {student.uni_reg_id || student.reg_id}
                        </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium flex items-center gap-2">
                        {((student.batch_name || student.batch) || (student.batch_id && student.batch_id.length < 10)) && (
                            <>
                                <span className="px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-semibold">
                                    {(student.batch_name || student.batch) ? (student.batch_name || student.batch) : student.batch_id}
                                </span>
                                <span className="text-gray-400">•</span>
                            </>
                        )}
                        <span className="font-semibold">{courses.length} Enrolled Course{courses.length !== 1 ? 's' : ''}</span>
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative z-10">
                {viewLink === 'courses' && (
                    <CoursesGridView
                        courses={courses}
                        loading={loadingCourses}
                        onSelect={handleCourseSelect}
                    />
                )}

                {viewLink === 'deep_dive' && selectedCourse && (
                    <div className="flex h-full">
                        {/* LEFT COLUMN */}
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

                                            {selectedUnit === unit.unit_id && (
                                                <div className="bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5 p-2 space-y-1">
                                                    {unit.sub_units && unit.sub_units.map((sub) => {
                                                        // Get breakdown info for this subunit
                                                        const breakdown = unitBreakdowns[unit.unit_id]?.find(b => b.sub_unit_id === sub.sub_unit_id);
                                                        const progress = breakdown?.progress_percentage || 0;

                                                        return (
                                                            <button
                                                                key={sub.sub_unit_id}
                                                                onClick={() => handleSubUnitClick(unit.unit_id, sub.sub_unit_id, sub)}
                                                                className={`w-full text-left p-3 rounded-lg text-xs transition-all flex justify-between items-center group
                                                                    ${inspectingSubUnit?.subUnitId === sub.sub_unit_id
                                                                        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-2 border-blue-500/70 font-bold shadow-lg shadow-blue-500/30'
                                                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5 border-2 border-transparent'}`
                                                                }
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span>{sub.title}</span>
                                                                    {progress === 100 && (
                                                                        <Check className="w-3 h-3 text-emerald-500" />
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {breakdown && (
                                                                        <span className="text-[10px] text-gray-400">{progress}%</span>
                                                                    )}
                                                                    {inspectingSubUnit?.subUnitId === sub.sub_unit_id && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
                            {inspectingSubUnit ? (
                                <DeepDiveRightPanel
                                    student={fullStudent}
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
        </div>
    );
}

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
    const [viewMode, setViewMode] = useState('history');
    const [selectedAttempt, setSelectedAttempt] = useState(null);
    const [attemptDetails, setAttemptDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Get available types from subUnit
    const hasMCQ = subUnit.hasMCQ;
    const hasCoding = subUnit.hasCoding;
    const hasOnlyOne = (hasMCQ && !hasCoding) || (!hasMCQ && hasCoding);
    const hasNeither = !hasMCQ && !hasCoding;

    useEffect(() => {
        setViewMode('history');
        setSelectedAttempt(null);
        setAttemptDetails(null);
    }, [subUnit.subUnitId, subUnit.unitId]);

    const handleAttemptClick = async (attempt) => {
        if (attempt.overview && attempt.submissions) {
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

            const token = getAdminToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.subUnitDetails}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (!res.ok) return;

            const data = await res.json();
            if (data.success) setAttemptDetails(data.data);
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
            ];

            if (attemptDetails.proctoring_metrics) {
                overviewData.push({ Metric: '', Value: '' });
                overviewData.push({ Metric: 'PROCTORING METRICS', Value: '' });
                Object.entries(attemptDetails.proctoring_metrics).forEach(([k, v]) => {
                    overviewData.push({ Metric: k, Value: v });
                });
            }

            const wsOverview = XLSX.utils.json_to_sheet(overviewData);

            let submissionsData = [];
            if (attemptDetails.submissions) {
                submissionsData = attemptDetails.submissions.map((sub, i) => {
                    const row = {
                        'Q#': i + 1,
                        'Title': sub.question_title || 'Question',
                        'Score': sub.score_obtained,
                    };

                    if (resultType === 'mcq') {
                        row['Selected Answer'] = sub.submitted_answer_text;
                        row['Is Correct'] = sub.is_correct ? 'Yes' : 'No';
                    } else {
                        row['Test Cases Passed'] = sub.formattedResult?.filter(r => {
                            const key = Object.keys(r)[0];
                            return r[key]?.testCasePassed;
                        }).length || 0;
                        row['Total Hidden Cases'] = sub.formattedResult?.length || 0;
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

    // Helper to calculate scores correctly
    const getQuestionMaxScore = (sub) => {
        if (resultType === 'mcq') return 1;
        return sub.formattedResult?.length || sub.test_cases?.filter(tc => tc.name.toLowerCase().includes('hidden')).length || 0;
    };

    const getQuestionScore = (sub) => {
        if (resultType === 'mcq') return sub.is_correct ? 1 : 0;
        return sub.formattedResult?.filter(r => {
            const key = Object.keys(r)[0];
            return r[key]?.testCasePassed;
        }).length || 0;
    };

    if (viewMode === 'detail') {
        const isPassed = attemptDetails?.overview?.status?.toLowerCase() === 'passed' ||
            (attemptDetails?.overview?.percentage >= 60);

        return (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                {/* Navigation Bar */}
                <div className="sticky top-0 z-30 flex justify-between items-center p-4 rounded-xl bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 shadow-lg">
                    <button
                        onClick={() => setViewMode('history')}
                        className="group flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="font-medium">Back to Timeline</span>
                    </button>
                    {!loadingDetails && attemptDetails && (
                        <button
                            onClick={handleExportAttempt}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 px-5 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 flex items-center gap-2"
                        >
                            <TrendingUp className="w-4 h-4" /> Export Report
                        </button>
                    )}
                </div>

                {loadingDetails ? (
                    <div className="space-y-6">
                        <Skeleton className="h-64 w-full rounded-3xl bg-white dark:bg-white/5" />
                        <div className="grid grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl bg-white dark:bg-white/5" />)}
                        </div>
                    </div>
                ) : attemptDetails ? (
                    <div className="relative space-y-8">
                        {/* SCORE CARD - Fixed Layout */}
                        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 shadow-2xl">
                            {/* Header Band */}
                            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-8 py-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-2xl font-black text-white">Attempt Report</h2>
                                            {attemptDetails.overview.attempt_number === 1 && (
                                                <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider">First Try</span>
                                            )}
                                        </div>
                                        <p className="text-gray-400 text-sm flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded bg-white/10 text-xs font-bold uppercase">
                                                {resultType === 'mcq' ? 'MCQ' : 'Coding'}
                                            </span>
                                            <span>•</span>
                                            <span>Attempt #{attemptDetails.overview.attempt_number}</span>
                                        </p>
                                    </div>

                                    {/* Pass/Fail Icon Only */}
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isPassed
                                        ? 'bg-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                                        : 'bg-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
                                        }`}>
                                        {isPassed ? (
                                            <Check className="w-7 h-7 text-emerald-400" />
                                        ) : (
                                            <X className="w-7 h-7 text-red-400" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="p-8">
                                <div className="flex flex-col md:flex-row gap-8 items-center">
                                    {/* Score Circle */}
                                    <div className="relative shrink-0">
                                        <div className={`absolute inset-0 rounded-full blur-2xl opacity-30 ${isPassed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <div className="relative bg-gray-50 dark:bg-[#1a1a1a] rounded-full p-3 shadow-xl">
                                            <CircularProgress
                                                percentage={attemptDetails.overview.percentage}
                                                size={160}
                                                strokeWidth={10}
                                                color={isPassed ? "emerald" : "red"}
                                                trackColor="rgba(255,255,255,0.1)"
                                            />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Score</span>
                                                <span className={`text-2xl font-black mt-8 ${isPassed ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {attemptDetails.overview.total_score}/ {attemptDetails.overview.max_score}
                                                </span>
                                                {/* <span className="text-gray-400 text-sm font-medium"></span> */}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="flex-1 w-full">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                            <StatCard
                                                label="Percentage"
                                                value={`${attemptDetails.overview.percentage}%`}
                                                color={isPassed ? 'emerald' : 'red'}
                                            />
                                            <StatCard
                                                label={resultType === 'mcq' ? 'MCQ Questions' : 'Coding Problems'}
                                                value={resultType === 'mcq'
                                                    ? attemptDetails.completion_stats?.total_mcq_show
                                                    : attemptDetails.completion_stats?.total_coding_show}
                                                color="blue"
                                            />
                                            <StatCard
                                                label="Submitted"
                                                value={attemptDetails.completion_stats?.user_submitted_count}
                                                color="violet"
                                            />
                                            <StatCard
                                                label="Completion"
                                                value={`${attemptDetails.completion_stats?.question_completion_percentage}%`}
                                                color="cyan"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Proctoring Metrics */}
                        {attemptDetails.proctoring_metrics && (
                            <div className="rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 p-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                    <AlertCircle className="w-5 h-5 text-amber-500" /> Proctoring Metrics
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <MetricCard label="Network" value={attemptDetails.proctoring_metrics.network_health} />
                                    <MetricCard label="Face Warnings" value={attemptDetails.proctoring_metrics.face_warnings} isWarning={attemptDetails.proctoring_metrics.face_warnings > 0} />
                                    <MetricCard label="Focus Lost" value={attemptDetails.proctoring_metrics.focus_lost_count} isWarning={attemptDetails.proctoring_metrics.focus_lost_count > 0} />
                                    <MetricCard label="Tab Switches" value={attemptDetails.proctoring_metrics.tab_switches} isWarning={attemptDetails.proctoring_metrics.tab_switches > 0} />
                                    <MetricCard label="Blocked" value={`${attemptDetails.proctoring_metrics.blocked_seconds}s`} />
                                </div>
                            </div>
                        )}

                        {/* Submissions */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {resultType === 'mcq' ? (
                                    <><FileText className="w-5 h-5 text-blue-500" /> MCQ Analysis</>
                                ) : (
                                    <><Code className="w-5 h-5 text-emerald-500" /> Coding Analysis</>
                                )}
                            </h3>
                            <div className="rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden bg-white dark:bg-white/5">
                                {attemptDetails.submissions && attemptDetails.submissions.map((sub, idx) => (
                                    <SubmissionCard
                                        key={idx}
                                        sub={sub}
                                        idx={idx}
                                        resultType={resultType}
                                        getQuestionScore={getQuestionScore}
                                        getQuestionMaxScore={getQuestionMaxScore}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20">No details found.</div>
                )}
            </div>
        );
    }

    // HISTORY VIEW
    return (
        <div className="h-full flex flex-col relative z-0">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{subUnit.name || subUnit.title}</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Attempt History & Analytics</p>
                </div>

                {/* Only show toggle if both types are available */}
                {!hasNeither && !hasOnlyOne && (
                    <div className="flex bg-gray-100 dark:bg-black/40 p-1.5 rounded-xl">
                        {hasMCQ && (
                            <button
                                onClick={() => setResultType('mcq')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${resultType === 'mcq' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                <FileText className="w-4 h-4" /> MCQ
                            </button>
                        )}
                        {hasCoding && (
                            <button
                                onClick={() => setResultType('coding')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${resultType === 'coding' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                <Code className="w-4 h-4" /> Coding
                            </button>
                        )}
                    </div>
                )}

                {/* Show single type badge if only one available */}
                {hasOnlyOne && (
                    <div className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 text-sm font-bold flex items-center gap-2">
                        {hasMCQ ? <><FileText className="w-4 h-4" /> MCQ Only</> : <><Code className="w-4 h-4" /> Coding Only</>}
                    </div>
                )}
            </div>

            {/* No content available message */}
            {hasNeither ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-3xl bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <EyeOff className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Content Available</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm">This subunit doesn't have any MCQ or Coding questions configured.</p>
                </div>
            ) : loadingHistory ? (
                <div className="space-y-8 pl-8 border-l-2 border-gray-200 dark:border-white/10 ml-4 py-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="relative pl-8">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-200 dark:bg-white/10" />
                            <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
                        </div>
                    ))}
                </div>
            ) : history && history.length > 0 ? (
                <div className="relative pl-8 border-l-2 border-dashed border-gray-200 dark:border-white/10 ml-4 py-4 space-y-10">
                    {history.map((attempt, idx) => {
                        const maxScore = attempt.max_score || attempt.total_marks || attempt.overview?.max_score || 0;
                        const score = attempt.score || attempt.marks_obtained || attempt.overview?.total_score || 0;
                        const isBest = history.length > 0 && score === Math.max(...history.map(p => p.score || p.marks_obtained || p.overview?.total_score || 0));
                        const isRecent = idx === 0;
                        const isPassed = attempt.overview?.status?.toLowerCase() === 'passed';

                        return (
                            <div key={idx} className="relative group perspective-1000">
                                <div className={`absolute -left-[41px] top-6 z-10 w-6 h-6 rounded-full border-4 border-gray-50 dark:border-[#0B0F19] transition-all duration-300 ${isRecent ? 'bg-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-gray-300 dark:bg-gray-700 group-hover:bg-blue-400'}`} />

                                <button
                                    onClick={() => handleAttemptClick(attempt)}
                                    className="w-full text-left relative overflow-hidden bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 p-6 rounded-2xl hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full -mr-8 -mt-8 pointer-events-none" />

                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center font-bold text-gray-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                #{attempt.attempt || attempt.attempt_count}
                                            </div>
                                            <div>
                                                <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-0.5">Attempt Score</div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl font-black text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">
                                                        {score}
                                                    </span>
                                                    <span className="text-sm text-gray-400">/ {maxScore}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2">
                                                {isBest && (
                                                    <span className="px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-500 text-xs font-bold uppercase flex items-center gap-1">
                                                        <Trophy className="w-3 h-3" /> Best
                                                    </span>
                                                )}
                                                {isRecent && (
                                                    <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-bold uppercase flex items-center gap-1">
                                                        <Zap className="w-3 h-3" /> Latest
                                                    </span>
                                                )}
                                                {/* Pass/Fail indicator */}
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPassed
                                                    ? 'bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                                    : 'bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                                                    }`}>
                                                    {isPassed ? (
                                                        <Check className="w-4 h-4 text-emerald-500" />
                                                    ) : (
                                                        <X className="w-4 h-4 text-red-500" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-3xl bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Activity className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Attempts Yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm">The student hasn't attempted this subunit for {resultType.toUpperCase()} yet.</p>
                </div>
            )}
        </div>
    );
};

// Stat Card Component
const StatCard = ({ label, value, color = 'gray' }) => {
    const colorClasses = {
        emerald: 'text-emerald-500',
        red: 'text-red-500',
        blue: 'text-blue-500',
        violet: 'text-violet-500',
        cyan: 'text-cyan-500',
        gray: 'text-gray-900 dark:text-white'
    };

    return (
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
            <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
        </div>
    );
};

// Metric Card for Proctoring
const MetricCard = ({ label, value, isWarning }) => (
    <div className={`p-3 rounded-xl text-center ${isWarning ? 'bg-red-500/10 border border-red-500/20' : 'bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5'}`}>
        <div className={`text-xl font-bold ${isWarning ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{value}</div>
        <div className={`text-[10px] font-medium uppercase tracking-wider ${isWarning ? 'text-red-400' : 'text-gray-400'}`}>{label}</div>
    </div>
);

// Submission Card Component
const SubmissionCard = ({ sub, idx, resultType, getQuestionScore, getQuestionMaxScore }) => {
    const [expanded, setExpanded] = useState(false);

    const score = getQuestionScore(sub);
    const maxScore = getQuestionMaxScore(sub);
    const isCorrect = resultType === 'mcq' ? sub.is_correct : score === maxScore && maxScore > 0;

    return (
        <div className="border-b last:border-0 border-gray-100 dark:border-white/5">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex justify-between items-start text-left"
            >
                <div className="flex items-start gap-3 flex-1">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCorrect ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
                        }`}>
                        {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 dark:text-white mb-1">
                            {sub.question_title}
                        </div>
                        {sub.question_desc && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                {sub.question_desc}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className={`px-3 py-1 rounded-lg text-sm font-bold ${isCorrect ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {score} / {maxScore}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {resultType === 'mcq' ? (
                        <MCQSubmissionDetail sub={sub} />
                    ) : (
                        <CodingSubmissionDetail sub={sub} />
                    )}
                </div>
            )}
        </div>
    );
};

// MCQ Detail Component
const MCQSubmissionDetail = ({ sub }) => {
    return (
        <div className="space-y-2 pl-11">
            {sub.options && sub.options.map((option, optIdx) => {
                const optionText = typeof option === 'object' ? option.option : option;
                const isCorrectAnswer = typeof option === 'object' ? option.isAnswer === true : false;
                const isSelected = sub.submitted_answer_index === optIdx;

                let bgClass = 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5';
                let textClass = 'text-gray-700 dark:text-gray-300';

                if (isCorrectAnswer) {
                    bgClass = 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
                    textClass = 'text-emerald-700 dark:text-emerald-400';
                } else if (isSelected && !isCorrectAnswer) {
                    bgClass = 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
                    textClass = 'text-red-700 dark:text-red-400';
                }

                return (
                    <div
                        key={optIdx}
                        className={`p-3 rounded-lg border flex items-center justify-between ${bgClass}`}
                    >
                        <div className="flex flex-col">
                            <span className={`font-medium ${textClass}`}>
                                {optionText}
                            </span>
                            <div className="flex gap-2 mt-1">
                                {isSelected && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        (Your Answer)
                                    </span>
                                )}
                                {isCorrectAnswer && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                        (Correct Answer)
                                    </span>
                                )}
                            </div>
                        </div>
                        {isCorrectAnswer && <Check className="w-5 h-5 text-emerald-500" />}
                        {!isCorrectAnswer && isSelected && <X className="w-5 h-5 text-red-500" />}
                    </div>
                );
            })}
        </div>
    );
};

// Coding Detail Component
const CodingSubmissionDetail = ({ sub }) => {
    const sampleCases = sub.test_cases?.filter(tc => !tc.name.toLowerCase().includes('hidden')) || [];
    const hiddenCases = sub.test_cases?.filter(tc => tc.name.toLowerCase().includes('hidden')) || [];

    return (
        <div className="space-y-6 pl-11">
            {/* Sample Test Cases */}
            {sampleCases.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Sample Test Cases
                    </div>
                    <div className="space-y-2">
                        {sampleCases.map((tc, i) => (
                            <div key={i} className="p-3 rounded-lg border bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/5 text-xs font-mono">
                                <div className="font-bold text-gray-700 dark:text-gray-300 mb-2">{tc.name}</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[10px] text-gray-400 mb-0.5">Input</div>
                                        <div className="bg-white dark:bg-black/20 p-2 rounded border border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                            {tc.input || '(empty)'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-400 mb-0.5">Expected Output</div>
                                        <div className="bg-white dark:bg-black/20 p-2 rounded border border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                            {tc.expected_output}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Hidden Test Cases with Results */}
            {hiddenCases.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <EyeOff className="w-4 h-4" /> Hidden Test Cases (Evaluation)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {hiddenCases.map((tc, hiddenIdx) => {
                            const resultKey = `testCase${hiddenIdx + 1}`;
                            const executionResult = sub.formattedResult?.find(r => r[resultKey])?.[resultKey];
                            const isPassed = executionResult?.testCasePassed === true;

                            return (
                                <div
                                    key={hiddenIdx}
                                    className={`p-3 rounded-lg border ${isPassed
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                                        : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                                        }`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            {isPassed ? (
                                                <Check className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <X className="w-4 h-4 text-red-500" />
                                            )}
                                            <span className={`text-xs font-bold ${isPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                                {tc.name}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isPassed ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                            {isPassed ? 'Passed' : 'Failed'}
                                        </span>
                                    </div>

                                    {executionResult && (
                                        <div className="text-[10px] grid grid-cols-2 gap-2 bg-white dark:bg-black/20 p-2 rounded font-mono">
                                            <div>
                                                <span className="text-gray-400 block mb-0.5">Expected:</span>
                                                <span className="text-gray-600 dark:text-gray-300 break-all">
                                                    {executionResult.expectedOutput}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block mb-0.5">Your Output:</span>
                                                <span className={`break-all font-bold ${isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {executionResult.userOutput || '(no output)'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Submitted Code */}
            <div className="space-y-2">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Code className="w-4 h-4" /> Submitted Code
                </div>
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
                        <span className="text-gray-400 text-xs font-mono">C</span>
                    </div>
                    <pre className="p-4 text-gray-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-64">
                        {sub.submitted_answer || sub.submitted_code || '// No code submitted'}
                    </pre>
                </div>
            </div>

            {/* Correct Code Reference */}
            {sub.correct_code && (
                <div className="space-y-2">
                    <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                        <Check className="w-4 h-4" /> Reference Solution
                    </div>
                    <div className="bg-emerald-900/20 rounded-lg overflow-hidden border border-emerald-500/20">
                        <pre className="p-4 text-emerald-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-64">
                            {sub.correct_code}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

const MetricRow = ({ label, value, isWarning, suffix = '' }) => (
    <div className={`flex items-center justify-between p-3 rounded-lg ${isWarning ? 'bg-red-500/10 border border-red-500/20' : 'bg-transparent border border-gray-100 dark:border-white/5'}`}>
        <span className={`text-sm font-medium ${isWarning ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>{label}</span>
        <span className={`font-bold ${isWarning ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{value}{suffix}</span>
    </div>
);