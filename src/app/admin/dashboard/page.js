'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_CONFIG } from '../../../utils/api';
import { BatchSkeleton, TeacherSkeleton, ListSkeleton, Skeleton, SectionSkeleton, DashboardSkeleton } from '../../../components/Skeletons';
import StudentDetailView from '../../../components/StudentDetailView';
import TeacherDetailView from '../../../components/TeacherDetailView'; // Added
import { Users, LayoutGrid, Layers, GraduationCap, Loader2, LogOut, ChevronRight, Search, FileText, Clock, AlertCircle, Sun, Moon } from "lucide-react";
import Link from 'next/link';
import SectionDetailView from '../../../components/SectionDetailView';
import BatchDetailView from '../../../components/BatchDetailView';
import { useTheme } from '../../../context/ThemeContext';

export default function DeepDiveDashboard() {
    const { user, logout, loading: authLoading } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const [view, setView] = useState('batches');
    const [searchQuery, setSearchQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showError, setShowError] = useState(false);

    // Primary Data Lists
    const [batches, setBatches] = useState([]);
    const [sections, setSections] = useState([]);
    const [masterSections, setMasterSections] = useState([]); // Cache for client-side search
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [masterTeachers, setMasterTeachers] = useState([]); // Cache for client-side search

    // --- Deep Dive States ---
    const [inspectingStudent, setInspectingStudent] = useState(null);
    const [inspectingTeacher, setInspectingTeacher] = useState(null);
    const [inspectingSection, setInspectingSection] = useState(null);
    const [inspectingBatch, setInspectingBatch] = useState(null);

    // 1. Batch/Course Navigation
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [batchCourses, setBatchCourses] = useState([]);

    // 2. Section Navigation
    const [selectedSection, setSelectedSection] = useState(null);
    const [sectionStudents, setSectionStudents] = useState([]);

    // 3. Cache for Section Completion
    const [sectionCompletionCache, setSectionCompletionCache] = useState({}); // { sectionName: { courseId: completion% } }

    const updateSectionCache = (sectionName, courseId, completion) => {
        setSectionCompletionCache(prev => ({
            ...prev,
            [sectionName]: {
                ...(prev[sectionName] || {}),
                [courseId]: completion
            }
        }));
    };


    // Initial Data Fetch
    useEffect(() => {
        if (!authLoading && user) {
            // Only fetch if empty to persist data across tab switches (unless explicit refresh needed)
            if (view === 'teachers' && teachers.length === 0) fetchTeachers();
            if (view === 'batches' && batches.length === 0) fetchBatches();
            if (view === 'sections' && sections.length === 0) fetchSections();
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
        const list = Array.isArray(data) ? data : [];
        setTeachers(list);
        setMasterTeachers(list);
    };

    const fetchBatches = async () => {
        const data = await fetchWithAuth(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.myBatches}`);
        setBatches(Array.isArray(data) ? data : []);
    };

    const fetchSections = async () => {
        const data = await fetchWithAuth(`${API_CONFIG.baseUrl.student}${API_CONFIG.masters.sections}`);
        const list = Array.isArray(data) ? data : [];
        setSections(list);
        setMasterSections(list);
    };

    const handleSearch = async (e) => {
        e.preventDefault();

        // Handle Empty Search (Reset)
        if (!searchQuery.trim()) {
            if (view === 'teachers') setTeachers(masterTeachers);
            if (view === 'sections') setSections(masterSections);
            return;
        }

        setLoading(true);
        setHasSearched(true);

        try {
            if (view === 'students') {
                const res = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.student.lookup}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'uni_reg_id', value: searchQuery }),
                    credentials: 'include'
                });
                const data = await res.json();
                const found = data.data || data;

                // Normalization Helper
                const normalizeStudent = (s) => {
                    if (!s) return null;
                    return {
                        ...s,
                        student_id: s.student_id || s.uuid || s._id,
                        uni_reg_id: s.uni_reg_id || s.reg_id
                    };
                };

                // Strict check: if no ID, it's not a valid student
                if (Array.isArray(found)) {
                    setStudents(found.map(normalizeStudent).filter(s => s && (s.uni_reg_id || s.student_id)));
                } else if (found && (found.uni_reg_id || found.reg_id || found.student_id || found.uuid)) {
                    setStudents([normalizeStudent(found)]);
                } else {
                    setStudents([]);
                    setShowError(true);
                }
            } else if (view === 'teachers') {
                // Client-side filtering for teachers
                const lowerQuery = searchQuery.toLowerCase();
                const filteredTeachers = masterTeachers.filter(t =>
                    (t.teacher_name && t.teacher_name.toLowerCase().includes(lowerQuery)) ||
                    (t.uni_reg_id && String(t.uni_reg_id).toLowerCase().includes(lowerQuery)) ||
                    (t.teacher_email && t.teacher_email.toLowerCase().includes(lowerQuery))
                );
                setTeachers(filteredTeachers);
            } else if (view === 'sections') {
                // Client-side filtering for sections
                const lowerQuery = searchQuery.toLowerCase();
                const filteredSections = masterSections.filter(s =>
                    String(s).toLowerCase().includes(lowerQuery)
                );
                setSections(filteredSections);
            }
        } catch (e) { console.error("Search Error", e); }
        finally { setLoading(false); }
    };

    const handleSectionClick = (sectionName) => {
        setInspectingSection({ section_name: sectionName, batch_name: 'Active Sections' });
    };

    const handleBatchClick = (batch) => {
        setInspectingBatch(batch);
    };

    // --- Deep Dive Actions ---

    const loadBatchCourses = async (batchId) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getPracticeCoursesByBatch}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batch_id: batchId }),
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success && data.data) {
                if (Array.isArray(data.data)) return data.data;
                if (data.data.courses) return data.data.courses;
            }
            return [];
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

    const startStudentInspection = (student) => {
        setInspectingStudent(student);
    };

    const closeAll = () => {
        setSelectedBatch(null);
        setSelectedSection(null);
        setInspectingStudent(null);
    };

    // --- Render Helpers ---
    const getBatchStatus = (endDate) => {
        const isActive = new Date(endDate) > new Date();
        return isActive ?
            { label: 'Active', color: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' } :
            { label: 'Completed', color: 'text-slate-500 border-slate-500/20 bg-slate-500/10' };
    };

    if (authLoading) {
        return <DashboardSkeleton />;
    }

    if (!user) return null;

    // RENDER: Student Detail View Overhead
    if (inspectingStudent) {
        return <StudentDetailView student={inspectingStudent} onBack={() => setInspectingStudent(null)} />;
    }

    return (
        <div className="min-h-screen bg-slate-200 dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 font-sans selection:bg-cyan-500/30">
            {/* Deep Dive Views (Overlay) */}

            {/* LEVEL 1: Batch Detail View */}
            {inspectingBatch && !inspectingSection && !inspectingStudent && (
                <BatchDetailView
                    batch={inspectingBatch}
                    onBack={() => setInspectingBatch(null)}
                    onSectionSelect={(sectionName) => handleSectionClick(sectionName)}
                />
            )}

            {inspectingTeacher && (
                <TeacherDetailView
                    teacher={inspectingTeacher}
                    onBack={() => setInspectingTeacher(null)}
                    onSectionSelect={(section) => handleSectionClick(section)}
                    cache={sectionCompletionCache}
                    onUpdateCache={updateSectionCache}
                    user={user}
                />
            )}

            {inspectingStudent && (
                <StudentDetailView
                    student={inspectingStudent}
                    onBack={() => setInspectingStudent(null)}
                />
            )}

            {inspectingSection && !inspectingStudent && (
                <SectionDetailView
                    section={inspectingSection}
                    teachers={teachers.filter(t =>
                        t.assigned_section?.includes(
                            typeof inspectingSection === 'string' ? inspectingSection : inspectingSection.section_name
                        )
                    )}
                    onBack={() => setInspectingSection(null)}
                    onStudentSelect={setInspectingStudent}
                    user={user}
                    cache={sectionCompletionCache}
                    onUpdateCache={updateSectionCache}
                />
            )}

            {/* Background Effects */}
            <div className="fixed -top-40 -left-48 h-[38rem] w-[38rem] bg-cyan-500/10 blur-3xl rounded-full pointer-events-none opacity-50 dark:opacity-100" />
            <div className="fixed -bottom-44 -right-40 h-[42rem] w-[42rem] bg-indigo-500/10 blur-3xl rounded-full pointer-events-none opacity-50 dark:opacity-100" />

            {/* Main Dashboard Content */}
            <div className={`transition-all duration-300 ${(inspectingStudent || inspectingSection) ? 'opacity-0 pointer-events-none scale-95 fixed inset-0' : 'opacity-100 scale-100'}`}>
                <div className="relative text-gray-900 dark:text-white p-6 md:p-10 font-sans">

                    <div className="max-w-7xl mx-auto relative z-10 space-y-8">

                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between gap-6 glass-panel p-6 rounded-2xl">
                            <div>
                                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">
                                    Admin Control Center
                                </h1>
                                <p className="text-gray-500 dark:text-gray-300 mt-2 flex items-center gap-3 text-lg font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                    {user.name || 'Administrator'}
                                </p>
                            </div>
                            <div className="flex gap-3 items-center">
                                <button
                                    onClick={toggleTheme}
                                    className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition text-gray-500 dark:text-gray-400"
                                >
                                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                </button>
                                <button onClick={logout} className="px-6 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/20 hover:bg-red-500/20 transition flex items-center gap-2">
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
                                            ? `bg-${item.color}-100 dark:bg-${item.color}-500/10 border-${item.color}-300 dark:border-${item.color}-500/20 shadow-md dark:shadow-[0_0_10px_rgba(var(--${item.color}-rgb),0.1)]`
                                            : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl mb-3 flex items-center justify-center transition-colors
                                ${view === item.id ? `bg-${item.color}-500/20 text-${item.color}-600 dark:text-${item.color}-400` : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <span className={`block text-xl font-bold ${view === item.id ? `text-${item.color}-600 dark:text-${item.color}-400` : 'text-gray-900 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
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
                                    {(view === 'students' || view === 'teachers' || view === 'sections') && (
                                        <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
                                            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                                            <input
                                                type="text"
                                                placeholder={
                                                    view === 'teachers' ? "Search by Name or Reg ID..." :
                                                        view === 'sections' ? "Search Section Name..." :
                                                            "Search by Uni Reg ID..."
                                                }
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-base focus:border-cyan-500/50 outline-none transition-colors text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-sm"
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
                                            <div key={idx} className="p-6 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/5 flex flex-col justify-between h-full hover:border-cyan-500/30 transition-all group shadow-sm dark:shadow-none">
                                                <div>
                                                    <div className="flex items-center gap-4 mb-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold shrink-0 text-xl shadow-lg border border-gray-100 dark:border-white/5">
                                                            {t.teacher_name ? t.teacher_name[0] : 'T'}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <h3 className="font-bold text-lg truncate text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" title={t.teacher_name}>{t.teacher_name || 'Unknown'}</h3>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono mt-1" title={t.teacher_email}>{t.teacher_email || 'No email'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3 mb-6 bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                                                        <div className="text-sm text-gray-400 flex justify-between items-center">
                                                            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Reg ID</span>
                                                            <span className="font-mono text-gray-700 dark:text-white">{t.uni_reg_id || 'N/A'}</span>
                                                        </div>

                                                        {/* Assigned Sections */}
                                                        <div>
                                                            <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Sections</div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {t.assigned_section && Array.isArray(t.assigned_section) && t.assigned_section.length > 0 ? (
                                                                    t.assigned_section.map((sec, i) => (
                                                                        <span key={i} className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-medium">
                                                                            {sec}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-gray-600 italic">No sections</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setInspectingTeacher(t)}
                                                    className="w-full py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 text-sm font-medium border border-cyan-500/20 hover:bg-cyan-500/20 mt-auto transition-all flex items-center justify-center gap-2">
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
                                                        onClick={() => handleBatchClick(batch)}
                                                        className="text-left w-full h-full glass-panel p-5 rounded-2xl border border-slate-300 dark:border-white/5 hover:border-purple-500/30 hover:bg-purple-50 dark:hover:bg-purple-500/5 transition-all group relative overflow-hidden bg-slate-100 dark:bg-transparent shadow-sm dark:shadow-none"
                                                    >
                                                        {/* Decor */}
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-[80px] transition-all group-hover:bg-purple-500/10 pointer-events-none" />

                                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center shadow-lg mt-2 text-purple-600 dark:text-purple-400">
                                                                <LayoutGrid className="w-6 h-6" />
                                                            </div>
                                                            <span className={`absolute top-0 right-0 m-4 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${status.color}`}>
                                                                {status.label}
                                                            </span>
                                                        </div>

                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" title={batch.batch_name}>
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
                                            <button key={idx} onClick={() => handleSectionClick(sec)} className="p-6 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all text-center shadow-sm dark:shadow-none">
                                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{sec}</h3>
                                                <p className="text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Section</p>
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
                                                <div key={idx} className="flex justify-between items-center p-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/5 shadow-sm dark:shadow-none">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 dark:text-white">{student.student_name || student.name}</h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">{student.uni_reg_id || student.reg_id}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => startStudentInspection(student)}
                                                        className="px-4 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition"
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
                    {/* --- ERROR MODAL --- */}
                    {showError && (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-[#1a1f3c] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-red-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Student Not Found</h3>
                                <p className="text-gray-400 text-sm mb-6">The Registration ID you entered does not exist in our records.</p>
                                <button
                                    onClick={() => setShowError(false)}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-medium w-full"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}

                </div>

                {/* Student Deep Dive Overlay */}
                {inspectingStudent && (
                    <StudentDetailView
                        student={inspectingStudent}
                        onBack={() => setInspectingStudent(null)}
                    />
                )}
            </div>
        </div>
    );
}
