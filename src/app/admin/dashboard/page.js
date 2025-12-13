'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_CONFIG } from '../../../utils/api';
import { BatchSkeleton, TeacherSkeleton, ListSkeleton, Skeleton, SectionSkeleton } from '../../../components/Skeletons';
import { Users, LayoutGrid, Layers, GraduationCap, Loader2, LogOut, ChevronRight, Search, FileText, Clock, AlertCircle } from "lucide-react";

export default function DeepDiveDashboard() {
    const { user, logout, loading: authLoading } = useAuth();
    const [view, setView] = useState('batches');
    const [searchQuery, setSearchQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);

    // Primary Data Lists
    const [batches, setBatches] = useState([]);
    const [sections, setSections] = useState([]);
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);

    // --- Deep Dive States ---

    // 1. Batch/Course Navigation
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [batchCourses, setBatchCourses] = useState([]);

    // 2. Section Navigation
    const [selectedSection, setSelectedSection] = useState(null);
    const [sectionStudents, setSectionStudents] = useState([]);

    // 3. Student Result Wizard
    const [inspectingStudent, setInspectingStudent] = useState(null); // The student being drilled into
    const [wizardStep, setWizardStep] = useState('COURSE_SELECT'); // COURSE_SELECT | UNIT_SELECT | HISTORY | ATTEMPT

    // Wizard Data
    const [studentCourses, setStudentCourses] = useState([]); // Courses for the student's batch
    const [selectedCourse, setSelectedCourse] = useState(null);

    const [courseStructure, setCourseStructure] = useState({}); // Units/Subunits
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [selectedSubUnit, setSelectedSubUnit] = useState(null);

    const [studentHistory, setStudentHistory] = useState([]);
    const [selectedAttempt, setSelectedAttempt] = useState(null);
    const [attemptDetails, setAttemptDetails] = useState(null);

    // Initial Data Fetch
    useEffect(() => {
        if (!authLoading && user) {
            if (view === 'teachers') fetchTeachers();
            if (view === 'batches') fetchBatches();
            if (view === 'sections') fetchSections();
        }
    }, [authLoading, user, view]);

    // --- API Helpers ---

    const fetchWithAuth = async (url, options = {}) => {
        setLoading(true);
        try {
            const res = await fetch(url, { ...options, credentials: 'include' });
            const data = await res.json();
            return data.data || data || [];
        } catch (e) {
            console.error("API Error", e);
            return [];
        } finally {
            setLoading(false);
        }
    };

    // --- Top Level Fetches ---

    const fetchTeachers = async () => {
        const data = await fetchWithAuth(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.myTeachers}`);
        setTeachers(Array.isArray(data) ? data : []);
    };

    const fetchBatches = async () => {
        const data = await fetchWithAuth(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.myBatches}`);
        setBatches(Array.isArray(data) ? data : []);
    };

    const fetchSections = async () => {
        const data = await fetchWithAuth(`${API_CONFIG.baseUrl.student}${API_CONFIG.masters.sections}`);
        setSections(Array.isArray(data) ? data : []);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setHasSearched(true);
        if (view === 'students') {
            try {
                const res = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.student.lookup}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'uni_reg_id', value: searchQuery }),
                    credentials: 'include'
                });
                const data = await res.json();
                const found = data.data || data;
                // Strict check: if no ID, it's not a valid student
                if (Array.isArray(found)) {
                    setStudents(found.filter(s => s && (s.uni_reg_id || s.reg_id || s.student_id)));
                } else if (found && (found.uni_reg_id || found.reg_id || found.student_id)) {
                    setStudents([found]);
                } else {
                    setStudents([]);
                }
            } catch (e) { console.error(e); }
        }
        setLoading(false);
    };

    // --- Deep Dive Actions ---

    const loadBatchCourses = async (batchId) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.courses(batchId)}`);
            const data = await res.json();
            return data.data || data || [];
        } catch (e) { return []; }
        finally { setLoading(false); }
    };

    const openBatchModal = async (batchId) => {
        const courses = await loadBatchCourses(batchId);
        setBatchCourses(courses);
        setSelectedBatch(batchId);
    };

    const openSectionModal = async (section) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.student.lookup}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: section }), // Using heuristic lookup
                credentials: 'include'
            });
            const data = await res.json();
            setSectionStudents(Array.isArray(data.data) ? data.data : [data.data].filter(Boolean));
            setSelectedSection(section);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // --- Student Wizard Flow ---

    const startStudentInspection = async (student) => {
        setInspectingStudent(student);
        setWizardStep('COURSE_SELECT');

        // Fetch courses for student's batch
        // We assume student object has batch_id, or we try to guess/ask options
        const batchId = student.batch_id || student.batch;
        if (batchId) {
            const courses = await loadBatchCourses(batchId);
            setStudentCourses(courses);
        } else {
            // Fallback: If no batch ID in student object, maybe we are in a section view? 
            // For now, if no batch ID, show empty state or handle error
            setStudentCourses([]);
        }
    };

    const handleCourseSelect = async (course) => {
        setSelectedCourse(course);
        // Fetch structure
        setLoading(true);
        try {
            const res = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.structure(course.course_id)}`);
            const data = await res.json();
            setCourseStructure(data.data || data || {});
            setWizardStep('UNIT_SELECT');
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSubUnitSelect = async (unitId, subUnitId) => {
        setSelectedUnit(unitId);
        setSelectedSubUnit(subUnitId);

        // Fetch History
        setLoading(true);
        try {
            const payload = {
                uniRegId: inspectingStudent.uni_reg_id || inspectingStudent.reg_id,
                courseId: selectedCourse.course_id,
                unitId: unitId,
                subUnitId: subUnitId,
                resultType: 'mcq' // Defaulting to MCQ for demo, can add toggle
            };
            const res = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.student.history}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const data = await res.json();
            setStudentHistory(Array.isArray(data.data) ? data.data : []);
            setWizardStep('HISTORY');
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleAttemptSelect = async (attempt) => {
        setSelectedAttempt(attempt);
        // Fetch Attempt Details
        setLoading(true);
        try {
            const payload = {
                uniRegId: inspectingStudent.uni_reg_id || inspectingStudent.reg_id,
                courseId: selectedCourse.course_id,
                unitId: selectedUnit,
                subUnitId: selectedSubUnit,
                attempt: attempt.attempt_count || attempt.attempt,
                resultType: 'mcq'
            };
            const res = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.student.attemptDetails}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            const data = await res.json();
            setAttemptDetails(data.data || data);
            setWizardStep('ATTEMPT');
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const closeAll = () => {
        setSelectedBatch(null);
        setSelectedSection(null);
        setInspectingStudent(null);
        setWizardStep('COURSE_SELECT');
        setAttemptDetails(null);
    };

    // --- Render Helpers ---
    const getBatchStatus = (endDate) => {
        const isActive = new Date(endDate) > new Date();
        return isActive ?
            { label: 'Active', color: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' } :
            { label: 'Completed', color: 'text-slate-500 border-slate-500/20 bg-slate-500/10' };
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen relative overflow-hidden text-white p-6 md:p-10 font-sans custom-scrollbar">
            {/* Background Effects */}
            <div className="fixed -top-40 -left-48 h-[38rem] w-[38rem] bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="fixed -bottom-44 -right-40 h-[42rem] w-[42rem] bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between gap-6 glass-panel p-6 rounded-2xl">
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">
                            Admin Control Center
                        </h1>
                        <p className="text-gray-300 mt-2 flex items-center gap-3 text-lg font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                            {user.name || 'Administrator'}
                        </p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <button onClick={logout} className="px-6 py-2 rounded-xl bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 transition flex items-center gap-2">
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>

                {/* Main Navigation */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { id: 'batches', label: 'Batches', icon: LayoutGrid, color: 'purple' },
                        { id: 'sections', label: 'Sections', icon: Layers, color: 'emerald' },
                        { id: 'teachers', label: 'Teachers', icon: Users, color: 'cyan' },
                        { id: 'students', label: 'Students', icon: GraduationCap, color: 'blue' },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setView(item.id); setSearchQuery(''); }}
                            className={`p-5 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden group
                                ${view === item.id
                                    ? `bg-${item.color}-500/10 border-${item.color}-500/40 shadow-[0_0_30px_-5px_rgba(var(--${item.color}-rgb),0.3)]`
                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl mb-3 flex items-center justify-center transition-colors
                                ${view === item.id ? `bg-${item.color}-500/20 text-${item.color}-400` : 'bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-white/10'}`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <span className={`block text-xl font-bold ${view === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                {item.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* View Content */}
                <div className="glass-panel rounded-3xl p-6 md:p-8 min-h-[600px] shadow-2xl relative overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-white/5 pb-6">
                        <h2 className="text-2xl font-bold capitalize flex items-center gap-2">
                            {view} <span className="text-sm font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                                {view === 'teachers' && teachers.length}
                                {view === 'batches' && batches.length}
                                {view === 'sections' && sections.length}
                                {view === 'students' && students.length}
                            </span>
                        </h2>

                        <div className="flex-1 flex justify-center px-4 md:px-12 w-full">
                            {(view === 'students' || view === 'teachers') && (
                                <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
                                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                                    <input
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder={`Search ${view} ID...`}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-base focus:border-cyan-500/50 outline-none transition-colors"
                                    />
                                </form>
                            )}

                        </div>
                    </div>

                    {/* View: Teachers */}
                    {view === 'teachers' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? (
                                <>
                                    <TeacherSkeleton />
                                    <TeacherSkeleton />
                                    <TeacherSkeleton />
                                    <TeacherSkeleton />
                                    <TeacherSkeleton />
                                    <TeacherSkeleton />
                                </>
                            ) : (
                                teachers.map((t, idx) => (
                                    <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between h-full hover:border-cyan-500/30 transition-all group">
                                        <div>
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0 text-xl shadow-lg border border-white/5">
                                                    {t.teacher_name ? t.teacher_name[0] : 'T'}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <h3 className="font-bold text-lg truncate text-white group-hover:text-cyan-400 transition-colors" title={t.teacher_name}>{t.teacher_name || 'Unknown'}</h3>
                                                    <p className="text-xs text-gray-400 truncate font-mono mt-1" title={t.teacher_email}>{t.teacher_email || 'No email'}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3 mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                                                <div className="text-sm text-gray-400 flex justify-between">
                                                    <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Reg ID</span>
                                                    <span className="font-mono text-white">{t.uni_reg_id || 'N/A'}</span>
                                                </div>

                                            </div>
                                        </div>

                                        <button className="w-full py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 text-sm font-medium border border-cyan-500/20 hover:bg-cyan-500/20 mt-auto transition-all flex items-center justify-center gap-2">
                                            View Details <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                            {!loading && teachers.length === 0 && (
                                <div className="col-span-full text-center text-gray-500 py-20 flex flex-col items-center">
                                    <Users className="w-12 h-12 mb-4 opacity-20" />
                                    No teachers found.
                                </div>
                            )}
                        </div>
                    )}

                    {/* View: Batches */}
                    {view === 'batches' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? (
                                <>
                                    <BatchSkeleton />
                                    <BatchSkeleton />
                                    <BatchSkeleton />
                                    <BatchSkeleton />
                                    <BatchSkeleton />
                                    <BatchSkeleton />
                                </>
                            ) : (
                                batches.map((batch) => {
                                    const status = getBatchStatus(batch.ending_date);
                                    return (
                                        (
                                            <button
                                                key={batch.batch_id}
                                                onClick={() => openBatchModal(batch.batch_id)}
                                                className="text-left w-full h-full glass-panel p-5 rounded-2xl border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group relative overflow-hidden"
                                            >
                                                {/* Decor */}
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-[80px] transition-all group-hover:bg-purple-500/10 pointer-events-none" />

                                                <div className="flex justify-between items-start mb-4 relative z-10">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/20 flex items-center justify-center shadow-lg mt-2">
                                                        <LayoutGrid className="w-6 h-6 text-purple-400" />
                                                    </div>
                                                    <span className={`absolute top-0 right-0 m-4 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>

                                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-purple-400 transition-colors" title={batch.batch_name}>
                                                    {batch.batch_name}
                                                </h3>

                                                {/* Stats Grid */}
                                                <div className="grid grid-cols-2 gap-2 my-4">
                                                    <div className="bg-black/20 p-2 rounded-lg text-center">
                                                        <div className="text-lg font-bold text-white">{batch.batch_student_strength}</div>
                                                        <div className="text-[10px] text-gray-500 uppercase">Students</div>
                                                    </div>
                                                    <div className="bg-black/20 p-2 rounded-lg text-center">
                                                        <div className="text-lg font-bold text-white">{batch.registered_courses_id?.length || 0}</div>
                                                        <div className="text-[10px] text-gray-500 uppercase">Courses</div>
                                                    </div>
                                                </div>

                                                <div className="pt-3 mt-auto border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono pr-6">
                                                    <span>{new Date(batch.starting_date).toLocaleDateString()}</span>
                                                    <span className="text-gray-700">→</span>
                                                    <span>{new Date(batch.ending_date).toLocaleDateString()}</span>
                                                </div>

                                                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400">
                                                    <ChevronRight className="w-5 h-5" />
                                                </div>
                                            </button>
                                        ));
                                })
                            )}
                        </div>
                    )}

                    {/* View: Sections */}
                    {view === 'sections' && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {loading ? (
                                <>
                                    <SectionSkeleton />
                                    <SectionSkeleton />
                                    <SectionSkeleton />
                                    <SectionSkeleton />
                                    <SectionSkeleton />
                                    <SectionSkeleton />
                                    <SectionSkeleton />
                                    <SectionSkeleton />
                                    <SectionSkeleton />
                                    <SectionSkeleton />
                                </>
                            ) : (
                                sections.map((sec, idx) => (
                                    <button key={idx} onClick={() => openSectionModal(sec)} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-center">
                                        <h3 className="text-2xl font-bold">{sec}</h3>
                                        <p className="text-xs uppercase tracking-widest text-emerald-400">Section</p>
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {/* View: Students */}
                    {view === 'students' && (
                        <div className="space-y-4">
                            {loading ? (
                                <ListSkeleton />
                            ) : (
                                <>
                                    {students.length === 0 && (
                                        <div className="text-center text-gray-500 py-10">
                                            {hasSearched ? 'No student found with that ID.' : 'Use search to find students by Uni Reg ID'}
                                        </div>
                                    )}
                                    {students.map((student, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                                            <div>
                                                <h4 className="font-bold">{student.student_name || student.name}</h4>
                                                <p className="text-sm text-gray-400">{student.uni_reg_id || student.reg_id}</p>
                                            </div>
                                            <button
                                                onClick={() => startStudentInspection(student)}
                                                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition"
                                            >
                                                Deep Dive Result
                                            </button>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>



            {/* --- MODALS --- */}

            {/* Batch Courses Modal */}
            {selectedBatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm" onClick={closeAll}>
                    <div className="bg-[#1a1f3c] border border-white/10 rounded-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4">Courses in Batch</h3>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {batchCourses.map((c, i) => (
                                <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5 text-sm">{c.course_name}</div>
                            ))}
                        </div>
                        <button onClick={closeAll} className="mt-4 w-full py-2 bg-white/10 rounded-lg text-sm">Close</button>
                    </div>
                </div>
            )}

            {/* Section Students Modal */}
            {selectedSection && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm" onClick={closeAll}>
                    <div className="bg-[#1a1f3c] border border-white/10 rounded-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4">Section {selectedSection}</h3>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {sectionStudents.map((s, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                                    <span className="text-sm">{s.name} ({s.reg_id})</span>
                                    <button onClick={() => startStudentInspection(s)} className="text-xs text-blue-400 px-2 py-1 bg-blue-500/10 rounded">Inspect</button>
                                </div>
                            ))}
                        </div>
                        <button onClick={closeAll} className="mt-4 w-full py-2 bg-white/10 rounded-lg text-sm">Close</button>
                    </div>
                </div>
            )}

            {/* --- STUDENT DEEP DIVE WIZARD --- */}
            {inspectingStudent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={closeAll}>
                    <div className="bg-[#0f132b] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>

                        {/* Wizard Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white">Result Inspector</h3>
                                <p className="text-sm text-gray-400">Target: {inspectingStudent.name || inspectingStudent.student_name} ({inspectingStudent.uni_reg_id})</p>
                            </div>
                            <button onClick={closeAll} className="text-gray-400 hover:text-white px-3 py-1 bg-white/5 rounded">Close</button>
                        </div>

                        {/* Wizard Content */}
                        <div className="flex-1 overflow-y-auto p-6">

                            {/* STEP 1: Select Course */}
                            {wizardStep === 'COURSE_SELECT' && (
                                <div className="space-y-4">
                                    <h4 className="text-lg font-semibold text-cyan-400">Step 1: Select Enrolled Course</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {studentCourses.map((course, idx) => (
                                            <button key={idx} onClick={() => handleCourseSelect(course)} className="p-4 bg-white/5 border border-white/5 hover:border-cyan-500/50 rounded-xl text-left transition">
                                                <div className="font-bold">{course.course_name}</div>
                                                <div className="text-xs text-gray-500">{course.course_code}</div>
                                            </button>
                                        ))}
                                        {studentCourses.length === 0 && (
                                            <div className="col-span-full py-10 text-center text-gray-500">
                                                No courses found for this student's batch.
                                                <br />(Batch ID: {inspectingStudent.batch_id || 'Unknown'})
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Select Unit/SubUnit */}
                            {wizardStep === 'UNIT_SELECT' && (
                                <div className="space-y-6">
                                    <button onClick={() => setWizardStep('COURSE_SELECT')} className="text-sm text-gray-500 hover:text-white mb-2">← Back to Courses</button>
                                    <h4 className="text-lg font-semibold text-cyan-400">Step 2: Select Assessment Unit</h4>

                                    {Object.entries(courseStructure).map(([unitId, unitData]) => (
                                        <div key={unitId} className="mb-6">
                                            <h5 className="font-bold text-white mb-3 pl-2 border-l-2 border-cyan-500">{unitData['unit-name']}</h5>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {unitData['sub-units'] && Object.entries(unitData['sub-units']).map(([subId, subData]) => (
                                                    <button
                                                        key={subId}
                                                        onClick={() => handleSubUnitSelect(unitId, subId)}
                                                        className="p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-left text-sm"
                                                    >
                                                        {subData.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* STEP 3: History */}
                            {wizardStep === 'HISTORY' && (
                                <div className="space-y-6">
                                    <button onClick={() => setWizardStep('UNIT_SELECT')} className="text-sm text-gray-500 hover:text-white mb-2">← Back to Units</button>
                                    <h4 className="text-lg font-semibold text-cyan-400">Step 3: Attempt History</h4>

                                    <div className="w-full text-left border-collapse">
                                        {studentHistory.length > 0 ? studentHistory.map((attempt, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-4 bg-white/5 mb-2 rounded-lg border border-white/5">
                                                <div>
                                                    <div className="font-bold text-emerald-400">Attempt {attempt.attempt_count}</div>
                                                    <div className="text-xs text-gray-400">Score: {attempt.marks_obtained} / {attempt.total_marks}</div>
                                                </div>
                                                <button onClick={() => handleAttemptSelect(attempt)} className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs">
                                                    View Details
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="p-10 text-center text-gray-500 bg-white/5 rounded-xl">No attempts found for this unit.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Attempt Details */}
                            {wizardStep === 'ATTEMPT' && attemptDetails && (
                                <div className="space-y-6">
                                    <button onClick={() => setWizardStep('HISTORY')} className="text-sm text-gray-500 hover:text-white mb-2">← Back to History</button>
                                    <h4 className="text-lg font-semibold text-cyan-400">Step 4: Attempt Analysis</h4>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                            <div className="text-xs text-emerald-400 uppercase">Score</div>
                                            <div className="text-2xl font-bold">{attemptDetails.marks_obtained}</div>
                                        </div>
                                        <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                            <div className="text-xs text-blue-400 uppercase">Time Taken</div>
                                            <div className="text-2xl font-bold">{attemptDetails.analytics?.time_taken || 'N/A'}s</div>
                                        </div>
                                    </div>

                                    {/* Raw JSON Dump for now, or Question List if we had schema */}
                                    <div className="bg-black/30 p-4 rounded-xl border border-white/10 font-mono text-xs overflow-auto max-h-[300px]">
                                        <pre>{JSON.stringify(attemptDetails, null, 2)}</pre>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
