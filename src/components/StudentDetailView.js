import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, BookOpen, Clock, AlertCircle, Award, Activity, Globe, ArrowRight } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { API_CONFIG } from '../utils/api';
import { Skeleton } from './Skeletons';

export default function StudentDetailView({ student, onBack }) {
    const [viewLink, setViewLink] = useState('courses'); // courses | deep_dive
    const [courses, setCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(false);

    // Deep Dive State
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [courseStructure, setCourseStructure] = useState(null);
    const [loadingStructure, setLoadingStructure] = useState(false);

    const [selectedUnit, setSelectedUnit] = useState(null); // Expanded Unit ID
    const [subUnitHistory, setSubUnitHistory] = useState(null); // Data for right panel
    const [inspectingSubUnit, setInspectingSubUnit] = useState(null); // Which subunit is active
    const [loadingHistory, setLoadingHistory] = useState(false);

    // NEW: Result Type State
    const [resultType, setResultType] = useState('mcq'); // mcq | coding

    const [fullStudent, setFullStudent] = useState(student);

    // Initial Load & Lookup
    useEffect(() => {
        const init = async () => {
            let currentStudent = student;

            // Ensure we have the critical UUID (student_id). If missing, force lookup.
            // Also lookup if batch_id is missing.
            const needsLookup = !currentStudent.student_id && !currentStudent.uuid;

            if (needsLookup || (!currentStudent.batch_id && !currentStudent.batch)) {
                console.log("Missing ID/Batch, performing lookup for:", currentStudent.uni_reg_id || currentStudent.reg_id);
                try {
                    const lookupRes = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.student.lookup}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'uni_reg_id', value: currentStudent.uni_reg_id || currentStudent.reg_id }),
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
                fetchCourses(currentStudent.batch_id || currentStudent.batch);
            }
        };

        if (student) {
            init();
        }
    }, [student]);

    // Fetch history when result type changes (and we have a subunit selected)
    useEffect(() => {
        if (inspectingSubUnit && selectedCourse) {
            fetchHistory(inspectingSubUnit.unitId, inspectingSubUnit.subUnitId, resultType);
        }
    }, [resultType]);

    const fetchCourses = async (batchId) => {
        setLoadingCourses(true);
        try {
            if (!batchId) {
                setCourses([]);
                return;
            }
            const res = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.courses(batchId)}`);
            const data = await res.json();
            setCourses(data.data || data || []);
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

        try {
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.courseStructure(course.course_id)}`, { credentials: 'include' });
            const data = await res.json();
            setCourseStructure(data.data || []);
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
        setInspectingSubUnit({ ...subUnitData, unitId, subUnitId, name: subUnitData.title });
        // Default to MCQ when switching subunits, or maintain? Let's default to MCQ.
        setResultType('mcq');
        fetchHistory(unitId, subUnitId, 'mcq');
    };

    const handleResultTypeChange = (type) => {
        if (type !== resultType) {
            setResultType(type);
        }
    };

    const fetchHistory = async (unitId, subUnitId, type) => {
        setLoadingHistory(true);
        try {
            const payload = {
                student_id: fullStudent.student_id || fullStudent.uuid || fullStudent.uni_reg_id || fullStudent.reg_id,
                course_id: selectedCourse.course_id,
                unit_id: unitId,
                sub_unit_id: subUnitId,
                result_type: type
            };

            console.log("Fetching History Payload:", payload);
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.subUnitDetails}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error("History Fetch Error:", res.status, errText);
                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.error) alert(`Error: ${errJson.error}`); // Temporary feedback
                } catch (e) { /* ignore */ }
                throw new Error(`Server returned ${res.status}`);
            }

            const data = await res.json();
            if (data) {
                // Handle new Admin API structure: data.data.history_list
                const historyList = data.data?.history_list || (Array.isArray(data.data) ? data.data : []);
                setSubUnitHistory(historyList);
            } else {
                throw new Error("All fetch attempts failed");
            }
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
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right duration-300 bg-[#0B0F19]">
            {/* Background Effects (Matches Dashboard) */}
            <div className="fixed -top-40 -left-48 h-[38rem] w-[38rem] bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="fixed -bottom-44 -right-40 h-[42rem] w-[42rem] bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

            {/* Header */}
            <div className="flex items-center gap-4 p-6 border-b border-white/5 bg-white/5 backdrop-blur-xl sticky top-0 z-10 relative">
                <button
                    onClick={viewLink === 'deep_dive' ? handleBackToCourses : onBack}
                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        {student.name || student.student_name}
                        <span className="text-sm font-normal px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                            {student.uni_reg_id || student.reg_id}
                        </span>
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Batch: {student.batch_id || 'N/A'} • Enrolled Courses: {courses.length}
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
                        <div className="w-1/3 min-w-[350px] border-r border-white/5 overflow-y-auto custom-scrollbar bg-black/10 backdrop-blur-md p-6">
                            <div className="mb-6">
                                <div className="text-xs text-cyan-400 uppercase tracking-wider mb-2">Selected Course</div>
                                <h3 className="text-2xl font-bold leading-tight text-white mb-4">{selectedCourse.course_name}</h3>
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <CircularProgress percentage={selectedCourse.completion_rate || 0} size={48} strokeWidth={4} />
                                    <div>
                                        <div className="text-white font-bold">Overall Progress</div>
                                        <div className="text-xs text-gray-400">Based on completed units</div>
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
                                        <div key={unit.unit_id} className="rounded-xl border border-white/5 bg-white/5 overflow-hidden transition-all">
                                            {/* Unit Header */}
                                            <button
                                                onClick={() => toggleUnit(unit.unit_id)}
                                                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${selectedUnit === unit.unit_id ? 'bg-cyan-500 shadow-cyan-500/60' : 'bg-gray-600 shadow-transparent'}`} />
                                                    <span className={`font-semibold text-sm text-left ${selectedUnit === unit.unit_id ? 'text-white' : 'text-gray-300'}`}>{unit.unit_name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <CircularProgress percentage={unit.analytics?.completion_rate || 0} size={32} strokeWidth={3} />
                                                    {selectedUnit === unit.unit_id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                                </div>
                                            </button>

                                            {/* Subunits List */}
                                            {selectedUnit === unit.unit_id && (
                                                <div className="bg-black/20 border-t border-white/5 p-2 space-y-1">
                                                    {unit.sub_units && unit.sub_units.map((sub) => (
                                                        <button
                                                            key={sub.sub_unit_id}
                                                            onClick={() => handleSubUnitClick(unit.unit_id, sub.sub_unit_id, sub)}
                                                            className={`w-full text-left p-3 rounded-lg text-xs transition-all flex justify-between items-center group
                                                                ${inspectingSubUnit?.subUnitId === sub.sub_unit_id
                                                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium'
                                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'}`
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
                                    <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse border border-white/5">
                                        <Award className="w-10 h-10 opacity-20" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Course Overview</h3>
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
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                Enrolled Courses
            </h3>
            {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSelect(course)}
                            className="text-left group relative overflow-hidden p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 shadow-lg border border-white/5">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <CircularProgress percentage={course.completion_rate || 0} size={42} strokeWidth={4} color="blue" />
                                    <div className="bg-black/20 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono text-gray-500 border border-white/5">
                                        {course.course_code}
                                    </div>
                                </div>
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
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
                attempt: attempt.attempt || attempt.attempt_count // Ensure attempt number is passed
            };

            console.log("Fetching Attempt Details Payload:", payload);
            // UPDATE: Use Admin Endpoint for consistency as it supports proper student lookup
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.subUnitDetails}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    if (viewMode === 'detail') {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <button
                    onClick={() => setViewMode('history')}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to History
                </button>

                {loadingDetails ? (
                    <div className="space-y-6">
                        <Skeleton className="h-32 w-full rounded-2xl bg-white/5" />
                        <Skeleton className="h-96 w-full rounded-2xl bg-white/5" />
                    </div>
                ) : attemptDetails ? (
                    <>
                        {/* 1. Overview Card */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Score</div>
                                <div className="text-3xl font-bold text-emerald-400">
                                    {attemptDetails.overview.total_score} <span className="text-lg text-gray-500 font-normal">/ {attemptDetails.overview.max_score}</span>
                                </div>
                            </div>
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Status</div>
                                <div className={`text-xl font-bold ${attemptDetails.overview.status === 'Passed' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {attemptDetails.overview.status}
                                </div>
                            </div>
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Duration</div>
                                <div className="text-xl font-bold text-white">{attemptDetails.overview.duration_formatted}</div>
                            </div>
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Result Type</div>
                                <div className="text-xl font-bold text-cyan-400 capitalize">{resultType}</div>
                            </div>
                        </div>

                        {/* 2. Proctoring Metrics */}
                        {attemptDetails.proctoring_metrics && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-red-400" /> Warnings & Violations
                                    </h3>
                                    <div className="space-y-3">
                                        <MetricRow label="Face Warnings" value={attemptDetails.proctoring_metrics.face_warnings} isWarning={attemptDetails.proctoring_metrics.face_warnings > 0} />
                                        <MetricRow label="Focus Lost" value={attemptDetails.proctoring_metrics.focus_lost_count} isWarning={attemptDetails.proctoring_metrics.focus_lost_count > 0} />
                                        <MetricRow label="Tab Switches" value={attemptDetails.proctoring_metrics.tab_switches} isWarning={attemptDetails.proctoring_metrics.tab_switches > 0} />
                                        <MetricRow label="Blocked Seconds" value={attemptDetails.proctoring_metrics.blocked_seconds} suffix="s" />
                                    </div>
                                </div>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-blue-400" /> System Health
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

                        {/* 3. System & Network Logs */}
                        {attemptDetails.debug_configs && (
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-cyan-400" /> System & Network Logs
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                    {/* Start Config */}
                                    <div className="space-y-2">
                                        <div className="text-xs text-cyan-400 font-bold uppercase">Session Start</div>
                                        <div className="p-3 rounded-xl bg-black/20 space-y-1 font-mono text-xs text-gray-400">
                                            <div><span className="text-gray-500">IP:</span> {attemptDetails.debug_configs.start_config?.network?.interfaces?.[0]?.ip || 'Unknown'}</div>
                                            <div><span className="text-gray-500">MAC:</span> {attemptDetails.debug_configs.start_config?.network?.interfaces?.[0]?.mac || 'Unknown'}</div>
                                            <div><span className="text-gray-500">OS:</span> {attemptDetails.debug_configs.start_config?.os?.platform} {attemptDetails.debug_configs.start_config?.os?.release}</div>
                                        </div>
                                    </div>
                                    {/* End Config */}
                                    <div className="space-y-2">
                                        <div className="text-xs text-purple-400 font-bold uppercase">Session End</div>
                                        <div className="p-3 rounded-xl bg-black/20 space-y-1 font-mono text-xs text-gray-400">
                                            <div><span className="text-gray-500">IP:</span> {attemptDetails.debug_configs.end_config?.network?.interfaces?.[0]?.ip || 'Max'}</div>
                                            <div><span className="text-gray-500">Captured:</span> {new Date(attemptDetails.debug_configs.end_config?.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. Submissions / Questions */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-400" />
                                {resultType === 'coding' ? 'Code Submissions' : 'Question Responses'}
                            </h3>
                            {attemptDetails.submissions && attemptDetails.submissions.map((sub, idx) => (
                                <div key={idx} className="group rounded-2xl border border-white/5 bg-white/5 overflow-hidden">
                                    <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            {/* Hide generic titles */}
                                            {sub.question_title && sub.question_title !== "Question Details Fetched" && (
                                                <h4 className="text-gray-200 font-bold text-sm mb-2">{sub.question_title}</h4>
                                            )}

                                            {/* Description with formatting */}
                                            <div className="text-sm text-gray-400 whitespace-pre-wrap font-mono leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
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
                                                {sub.score_obtained} <span className="text-sm font-normal text-gray-500">/ {sub.max_score || '?'}</span>
                                            </div>
                                            <div className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-gray-300 font-mono">
                                                {sub.language || 'N/A'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Code Snippet */}
                                    {sub.submitted_code && (
                                        <div className="bg-[#0d1117] p-4 text-xs font-mono overflow-x-auto text-gray-300 border-t border-white/5 relative">
                                            <div className="absolute top-2 right-2 text-[10px] text-gray-500 uppercase flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${sub.score_obtained > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                Submitted Code
                                            </div>
                                            <pre>{sub.submitted_code}</pre>
                                        </div>
                                    )}

                                    {/* Test Cases */}
                                    {sub.test_cases && sub.test_cases.length > 0 && sub.test_cases[0].status !== 'N/A' && (
                                        <div className="p-4 bg-black/10 border-t border-white/5">
                                            <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">Test Cases</div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                                {sub.test_cases.map((tc, tci) => (
                                                    <div key={tci} className={`px-2 py-1.5 rounded text-[10px] border flex flex-col items-center justify-center text-center ${tc.status === 'Passed'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                        <span className="font-semibold mb-0.5">{tc.name}</span>
                                                        <span className="opacity-70">{tc.time}</span>
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

                <h2 className="text-3xl font-bold text-white mb-6">{subUnit.name}</h2>

                {/* TABS / SWITCH */}
                <div className="p-1 rounded-xl bg-white/5 border border-white/10 inline-flex">
                    <button
                        onClick={() => setResultType('mcq')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${resultType === 'mcq'
                            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        MCQ Progress
                    </button>
                    <button
                        onClick={() => setResultType('coding')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${resultType === 'coding'
                            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20 backdrop-blur-sm">
                            <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">Total Attempts</div>
                            <div className="text-3xl font-bold text-white">{history?.length || 0}</div>
                        </div>
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20 backdrop-blur-sm">
                            <div className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">Best Score</div>
                            <div className="text-3xl font-bold text-white">
                                {history?.length > 0
                                    ? Math.max(...history.map(h => h.score || h.marks_obtained || 0))
                                    : '-'}
                            </div>
                        </div>
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 backdrop-blur-sm">
                            <div className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">Avg. Time</div>
                            <div className="text-3xl font-bold text-white">
                                {history?.length > 0 ? '4m 32s' : '-'}
                            </div>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold mt-8 mb-4 flex items-center gap-2 text-white">
                        <Clock className="w-5 h-5 text-gray-400" />
                        Attempt History ({resultType.toUpperCase()})
                    </h3>
                    <div className="space-y-3">
                        {history && history.length > 0 ? (
                            history.map((attempt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAttemptClick(attempt)}
                                    className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center hover:border-cyan-500/30 hover:bg-white/10 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-gray-400 border border-white/5 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-colors">
                                            #{attempt.attempt || attempt.attempt_count}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white group-hover:text-cyan-400 transition-colors">Attempt {attempt.attempt_count}</div>
                                            <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                                                <span className="flex items-center gap-1">{new Date().toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <div>
                                            <div className="text-xl font-bold text-emerald-400">{attempt.marks_obtained} <span className="text-sm text-gray-500 font-normal">/ {attempt.total_marks}</span></div>
                                            <div className="text-xs text-gray-500">Score</div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-white/5 rounded-xl border border-dashed border-white/10 text-gray-500">
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
    <div className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition-colors">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <span className={`font-mono font-bold ${isWarning ? 'text-red-400' : 'text-white'}`}>
            {value}{suffix}
        </span>
    </div>
);
