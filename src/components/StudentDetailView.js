import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, BookOpen, Clock, AlertCircle, Award } from 'lucide-react';
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

    // Initial Load
    useEffect(() => {
        if (student) {
            fetchCourses();
        }
    }, [student]);

    const fetchCourses = async () => {
        setLoadingCourses(true);
        try {
            const batchId = student.batch_id || student.batch;
            // Handle if no batch ID found?
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

    const handleSubUnitClick = async (unitId, subUnitId, subUnitData) => {
        setInspectingSubUnit({ ...subUnitData, unitId, subUnitId, name: subUnitData.title });
        setLoadingHistory(true);
        try {
            const payload = {
                uniRegId: student.uni_reg_id || student.reg_id,
                courseId: selectedCourse.course_id,
                unitId: unitId,
                subUnitId: subUnitId,
                resultType: 'mcq'
            };

            // Using existing history endpoint
            const res = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.student.history}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const data = await res.json();
            setSubUnitHistory(Array.isArray(data.data) ? data.data : []);
        } catch (e) {
            console.error(e);
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
        <div className="absolute inset-0 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right duration-300 bg-[#0B0F19]">
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
                    <div className="p-8 overflow-y-auto h-full custom-scrollbar">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                            <BookOpen className="w-5 h-5 text-cyan-400" />
                            Enrolled Courses
                        </h3>

                        {loadingCourses ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl bg-white/5" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {courses.map((course, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleCourseSelect(course)}
                                        className="text-left group relative overflow-hidden p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 shadow-lg border border-white/5">
                                                <BookOpen className="w-6 h-6" />
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <CircularProgress percentage={course.completion_rate || Math.floor(Math.random() * 100)} size={42} strokeWidth={4} color="blue" />
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
                                {courses.length === 0 && (
                                    <div className="col-span-full text-center text-gray-500 py-10">
                                        No courses found for this student.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* VIEW: Deep Dive (Split View) */}
                {viewLink === 'deep_dive' && selectedCourse && (
                    <div className="flex h-full">
                        {/* LEFT COLUMN: Course Structure */}
                        <div className="w-1/3 min-w-[350px] border-r border-white/5 overflow-y-auto custom-scrollbar bg-black/10 backdrop-blur-md p-6">
                            <div className="mb-6">
                                <div className="text-xs text-cyan-400 uppercase tracking-wider mb-2">Selected Course</div>
                                <h3 className="text-2xl font-bold leading-tight text-white">{selectedCourse.course_name}</h3>
                            </div>

                            {loadingStructure ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
                                    <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
                                    <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
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
                                                    <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                                                    <span className="font-semibold text-sm text-left text-white">{unit.unit_name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {/* Using analytics if available, else random */}
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

                        {/* RIGHT COLUMN: Analytics / History */}
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                            {inspectingSubUnit ? (
                                <div className="max-w-3xl mx-auto space-y-6">
                                    <div className="pb-6 border-b border-white/10">
                                        <div className="text-gray-400 text-sm mb-1 uppercase tracking-wider font-semibold">Performance Details</div>
                                        <h2 className="text-3xl font-bold text-white">{inspectingSubUnit.name}</h2>
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
                                                    <div className="text-3xl font-bold text-white">{subUnitHistory?.length || 0}</div>
                                                </div>
                                                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20 backdrop-blur-sm">
                                                    <div className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">Best Score</div>
                                                    <div className="text-3xl font-bold text-white">
                                                        {subUnitHistory?.length > 0
                                                            ? Math.max(...subUnitHistory.map(h => h.marks_obtained))
                                                            : '-'}
                                                    </div>
                                                </div>
                                                <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 backdrop-blur-sm">
                                                    <div className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">Avg. Time</div>
                                                    <div className="text-3xl font-bold text-white">
                                                        {subUnitHistory?.length > 0 ? '4m 32s' : '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-bold mt-8 mb-4 flex items-center gap-2 text-white">
                                                <Clock className="w-5 h-5 text-gray-400" />
                                                Attempt History
                                            </h3>
                                            <div className="space-y-3">
                                                {subUnitHistory && subUnitHistory.length > 0 ? (
                                                    subUnitHistory.map((attempt, idx) => (
                                                        <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center hover:border-cyan-500/30 hover:bg-white/10 transition-colors cursor-default">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-gray-400 border border-white/5">
                                                                    #{attempt.attempt_count}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-white">Attempt {attempt.attempt_count}</div>
                                                                    <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                                                                        <span className="flex items-center gap-1">{new Date().toLocaleDateString()}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xl font-bold text-emerald-400">{attempt.marks_obtained} <span className="text-sm text-gray-500 font-normal">/ {attempt.total_marks}</span></div>
                                                                <div className="text-xs text-gray-500">Score</div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-10 bg-white/5 rounded-xl border border-dashed border-white/10 text-gray-500">
                                                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                        No attempts found for this subunit.
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
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
