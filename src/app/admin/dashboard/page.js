'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_CONFIG } from '../../../utils/api';
import { getAdminToken } from '../../../utils/cookies';
import { BatchSkeleton, TeacherSkeleton, ListSkeleton, Skeleton, SectionSkeleton, DashboardSkeleton } from '../../../components/Skeletons';
import StudentDetailView from '../../../components/StudentDetailView';
import TeacherDetailView from '../../../components/TeacherDetailView';
import ChangePasswordModal from '../../../components/ChangePasswordModal';
import { Users, LayoutGrid, Layers, GraduationCap, Loader2, LogOut, ChevronRight, Search, FileText, Clock, AlertCircle, Sun, Moon, Key, BookOpen } from "lucide-react";
import Link from 'next/link';
import SectionDetailView from '../../../components/SectionDetailView';
import BatchDetailView from '../../../components/BatchDetailView';
import CourseDetailView from '../../../components/CourseDetailView'; // [NEW]
import { useTheme } from '../../../context/ThemeContext';

export default function DeepDiveDashboard() {
    const { user, logout, loading: authLoading } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const [view, setView] = useState('batches');
    const [searchQuery, setSearchQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showError, setShowError] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Primary Data Lists
    const [batches, setBatches] = useState([]);
    const [sections, setSections] = useState([]);
    const [masterSections, setMasterSections] = useState([]); // Cache for client-side search
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [masterTeachers, setMasterTeachers] = useState([]); // Cache for client-side search
    const [courses, setCourses] = useState([]); // [NEW] Courses List
    const [masterCourses, setMasterCourses] = useState([]); // [NEW] Cache for search

    // --- Deep Dive States ---
    const [inspectingStudent, setInspectingStudent] = useState(null);
    const [inspectingTeacher, setInspectingTeacher] = useState(null);
    const [inspectingSection, setInspectingSection] = useState(null);
    const [inspectingBatch, setInspectingBatch] = useState(null);
    const [inspectingCourse, setInspectingCourse] = useState(null); // [NEW] Deep dive for course

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
            if (view === 'courses' && courses.length === 0) fetchCourses(); // [NEW]
        }
    }, [authLoading, user, view]);

    // --- API Helpers ---

    const fetchWithAuth = async (url, options = {}) => {
        setLoading(true);
        try {
            const token = getAdminToken();
            const headers = {
                ...(options.headers || {})
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await fetch(url, {
                ...options,
                credentials: 'include',
                headers
            });
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
        const data = await fetchWithAuth(`${API_CONFIG.baseUrl.admin}${API_CONFIG.masters.sections}`);
        const list = Array.isArray(data) ? data : [];
        setSections(list);
        setMasterSections(list);
    };

    // [NEW] Fetch Courses
    const fetchCourses = async () => {
        setLoading(true);
        try {
            // Using uni_reg_id as the 'email' payload as per instruction "email is similar to admin registration number"
            // Fallback to actual email if reg_id is missing
            const identifier = user.uni_reg_id || user.email;

            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getAllCourses}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: identifier }),
                credentials: 'include'
            });
            const data = await res.json();

            // Handle various response structures
            let list = [];
            if (data.data && Array.isArray(data.data.courses)) {
                // Structure: { data: { courses: [...] } }
                list = data.data.courses;
            } else if (data.courses && Array.isArray(data.courses)) {
                // Structure: { courses: [...] }
                list = data.courses;
            } else if (Array.isArray(data.data)) {
                // Structure: { data: [...] }
                list = data.data;
            } else if (Array.isArray(data)) {
                // Structure: [...]
                list = data;
            }

            setCourses(list);
            setMasterCourses(list);
        } catch (e) {
            console.error("Failed to fetch courses:", e);
        } finally {
            setLoading(false);
        }
    };

    // Live Filtering Effect
    useEffect(() => {
        const lowerQuery = searchQuery.toLowerCase().trim();

        if (view === 'teachers') {
            if (!lowerQuery) setTeachers(masterTeachers);
            else {
                const filtered = masterTeachers.filter(t =>
                    (t.teacher_name && t.teacher_name.toLowerCase().includes(lowerQuery)) ||
                    (t.uni_reg_id && String(t.uni_reg_id).toLowerCase().includes(lowerQuery)) ||
                    (t.teacher_email && t.teacher_email.toLowerCase().includes(lowerQuery))
                );
                setTeachers(filtered);
            }
        } else if (view === 'sections') {
            if (!lowerQuery) setSections(masterSections);
            else {
                const filtered = masterSections.filter(s =>
                    String(s).toLowerCase().includes(lowerQuery)
                );
                setSections(filtered);
            }
        } else if (view === 'courses') {
            if (!lowerQuery) setCourses(masterCourses);
            else {
                const filtered = masterCourses.filter(c =>
                    (c.course_name && c.course_name.toLowerCase().includes(lowerQuery)) ||
                    (c.course_code && c.course_code.toLowerCase().includes(lowerQuery))
                );
                setCourses(filtered);
            }
        }
    }, [searchQuery, view, masterTeachers, masterSections, masterCourses]);

    // --- Auth Loading Guard ---
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const handleSearch = async (e) => {
        e.preventDefault();

        // Only Students require server-side search on Submit
        if (view !== 'students') return;

        // Handle Empty Search (Reset)
        if (!searchQuery.trim()) {
            setStudents([]);
            return;
        }

        setLoading(true);
        setHasSearched(true);

        try {
            const res = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.student.lookup}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'uni_reg_id',
                    value: searchQuery,
                    university_id: user.university_id || user.universityId || user.id
                }),
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
        } catch (e) {
            console.error("Search Error", e);
            setShowError(true);
        } finally {
            setLoading(false);
        }
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
                body: JSON.stringify({
                    type: 'section',
                    value: section,
                    university_id: user.university_id || user.universityId || user.id
                }),
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
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
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

            {/* [NEW] Course Detail View */}
            {inspectingCourse && (
                <CourseDetailView
                    course={inspectingCourse}
                    onBack={() => setInspectingCourse(null)}
                />
            )}

            {/* Background Effects */}
            <div className="fixed -top-40 -left-48 h-[38rem] w-[38rem] bg-cyan-500/10 blur-3xl rounded-full pointer-events-none opacity-50 dark:opacity-100" />
            <div className="fixed -bottom-44 -right-40 h-[42rem] w-[42rem] bg-indigo-500/10 blur-3xl rounded-full pointer-events-none opacity-50 dark:opacity-100" />

            {/* Main Dashboard Content */}
            <div className={`transition-all duration-300 ${(inspectingStudent || inspectingSection || inspectingCourse) ? 'opacity-0 pointer-events-none scale-95 fixed inset-0' : 'opacity-100 scale-100'}`}>
                <div className="relative text-gray-900 dark:text-white p-6 md:p-10 font-sans">

                    <div className="max-w-7xl mx-auto relative z-10 space-y-8">

                        {/* Header */}
                        <div className="glass-panel p-8 rounded-3xl shadow-xl border border-white/10">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                {/* Branding Section */}
                                <div className="flex items-center gap-6">
                                    {/* Animated Logo */}
                                    <div className="relative w-16 h-16 flex-shrink-0">
                                        {/* Rotating Glow */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-full opacity-20 blur-xl animate-spin-slow" />

                                        {/* Logo */}
                                        <div className="relative w-full h-full animate-float">
                                            <img
                                                src="/logo.png"
                                                alt="TheEduCode"
                                                className="w-full h-full object-contain drop-shadow-2xl"
                                            />
                                        </div>
                                    </div>

                                    {/* Title & Status */}
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                                            TheEduCode
                                        </h1>
                                        <p className="text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-2.5 text-base font-medium">
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
                                            </span>
                                            {user.name || 'Administrator'} • Admin Portal
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 items-center">
                                    {/* Theme Toggle */}
                                    <button
                                        onClick={toggleTheme}
                                        className="group p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-blue-500/20"
                                        title="Toggle Theme"
                                    >
                                        {theme === 'dark' ?
                                            <Sun className="w-5 h-5 text-amber-500 group-hover:rotate-90 transition-transform duration-300" /> :
                                            <Moon className="w-5 h-5 text-indigo-600 group-hover:-rotate-12 transition-transform duration-300" />
                                        }
                                    </button>

                                    {/* Change Password */}
                                    <button
                                        onClick={() => setIsPasswordModalOpen(true)}
                                        className="group px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 font-medium text-sm flex items-center gap-2 shadow-sm hover:shadow-md hover:shadow-blue-500/10"
                                        title="Change Password"
                                    >
                                        <Key className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                        <span className="hidden sm:inline">Password</span>
                                    </button>

                                    {/* Logout */}
                                    <button
                                        onClick={() => {
                                            localStorage.clear();
                                            document.cookie.split(";").forEach((c) => {
                                                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                                            });
                                            logout();
                                        }}
                                        className="group px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white border border-red-600/20 hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 flex items-center gap-2 font-medium"
                                    >
                                        <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                        <span className="hidden sm:inline">Logout</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Navigation */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                                { id: 'batches', label: 'Batches', icon: LayoutGrid, color: 'purple', gradient: 'from-purple-500 to-pink-500', count: batches.length },
                                { id: 'sections', label: 'Sections', icon: Layers, color: 'emerald', gradient: 'from-emerald-500 to-teal-500', count: sections.length },
                                { id: 'teachers', label: 'Teachers', icon: Users, color: 'cyan', gradient: 'from-cyan-500 to-blue-500', count: teachers.length },
                                { id: 'students', label: 'Students', icon: GraduationCap, color: 'blue', gradient: 'from-blue-500 to-indigo-500', count: students.length },
                                { id: 'courses', label: 'Courses', icon: BookOpen, color: 'orange', gradient: 'from-orange-500 to-amber-500', count: courses.length },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => { setView(item.id); setSearchQuery(''); }}
                                    className={`group relative p-6 rounded-2xl border transition-all duration-300 text-left overflow-hidden transform hover:scale-105 hover:-translate-y-1
                                ${view === item.id
                                            ? 'bg-gradient-to-br ' + item.gradient + ' text-white border-white/20 shadow-2xl shadow-' + item.color + '-500/30'
                                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-' + item.color + '-400 dark:hover:border-' + item.color + '-500 shadow-md hover:shadow-xl hover:shadow-' + item.color + '-500/20'
                                        }`}
                                >
                                    {/* Background Glow Effect */}
                                    {view !== item.id && (
                                        <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                                    )}

                                    {/* Icon Container */}
                                    <div className={`relative w-14 h-14 rounded-xl mb-4 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3
                                ${view === item.id
                                            ? 'bg-white/20 text-white shadow-lg'
                                            : 'bg-gradient-to-br ' + item.gradient + ' text-white shadow-md'
                                        }`}>
                                        <item.icon className="w-7 h-7" />
                                    </div>

                                    {/* Label & Count */}
                                    <div className="relative">
                                        <span className={`block text-lg font-bold mb-1 ${view === item.id ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                            {item.label}
                                        </span>
                                        {item.count > 0 && (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${view === item.id
                                                ? 'bg-white/20 text-white'
                                                : 'bg-gradient-to-r ' + item.gradient + ' text-white'
                                                }`}>
                                                {item.count} total
                                            </span>
                                        )}
                                    </div>

                                    {/* Active Indicator */}
                                    {view === item.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/50" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* View Content */}
                        <div className="glass-panel rounded-3xl p-8 md:p-10 min-h-[600px] shadow-2xl relative overflow-hidden border border-white/10">
                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 rounded-full blur-3xl" />

                            {/* Toolbar */}
                            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-white/10 pb-8">
                                {/* Title Section */}
                                <div className="flex items-center gap-4">
                                    <h2 className="text-3xl font-bold capitalize bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                                        {view}
                                    </h2>
                                    {view !== 'students' && (
                                        <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
                                            {view === 'teachers' && teachers.length}
                                            {view === 'batches' && batches.length}
                                            {view === 'sections' && sections.length}
                                            {view === 'courses' && courses.length}
                                            {' '}total
                                        </span>
                                    )}
                                </div>

                                {/* Search Bar */}
                                <div className="flex-1 flex justify-center w-full md:px-8">
                                    {(view === 'students' || view === 'teachers' || view === 'sections' || view === 'courses') && (
                                        <form onSubmit={handleSearch} className="relative w-full max-w-2xl group">
                                            {/* Animated Search Icon */}
                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />

                                            <input
                                                type="text"
                                                placeholder={
                                                    view === 'teachers' ? "Search by Name or Reg ID..." :
                                                        view === 'sections' ? "Search Section Name..." :
                                                            view === 'courses' ? "Search Course Name..." :
                                                                "Search by Uni Reg ID..."
                                                }
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-2xl pl-14 pr-5 py-4 text-base font-medium focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-md focus:shadow-xl focus:shadow-blue-500/20"
                                            />

                                            {/* Clear Button */}
                                            {searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</span>
                                                </button>
                                            )}
                                        </form>
                                    )}
                                </div>
                            </div>

                            {/* View: Teachers */}
                            {view === 'teachers' && (
                                <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                            <div key={idx} className="group relative p-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 flex flex-col justify-between h-full hover:border-cyan-400 dark:hover:border-cyan-500 hover:transform hover:scale-105 hover:-translate-y-2 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/20 overflow-hidden">
                                                {/* Background Gradient Glow */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/10 group-hover:to-blue-500/10 transition-all duration-300" />

                                                <div className="relative">
                                                    {/* Header with Avatar */}
                                                    <div className="flex items-center gap-4 mb-6">
    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0 shadow-xl group-hover:scale-110 transition-transform duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-white/10 rounded-2xl" />
        <span className="relative z-10 text-white font-bold text-2xl">
            {t.teacher_name 
                ? t.teacher_name
                    .split(' ')
                    .map(word => word[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'T'}
        </span>
    </div>
    <div className="overflow-hidden flex-1">
        <h3 className="font-bold text-lg truncate text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" title={t.teacher_name}>
            {t.teacher_name || 'Unknown'}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono mt-0.5" title={t.teacher_email}>
            {t.teacher_email || 'No email'}
        </p>
    </div>
</div>
                                                    

                                                    {/* Info Panel */}
                                                    <div className="space-y-4 mb-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900/50 dark:to-slate-900/30 p-5 rounded-xl border border-gray-200 dark:border-slate-700">
                                                        {/* Reg ID */}
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Reg ID</span>
                                                            <span className="font-mono text-sm font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                                                                {t.uni_reg_id || 'N/A'}
                                                            </span>
                                                        </div>

                                                        {/* Assigned Sections */}
                                                        <div>
                                                            <div className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2.5">Sections</div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {t.assigned_section && Array.isArray(t.assigned_section) && t.assigned_section.length > 0 ? (
                                                                    t.assigned_section.map((sec, i) => (
                                                                        <span key={i} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-shadow">
                                                                            {sec}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">No sections assigned</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* View Button */}
                                                <button
                                                    onClick={() => setInspectingTeacher(t)}
                                                    className="relative w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-cyan-500/40 flex items-center justify-center gap-2 group/btn"
                                                >
                                                    View Details
                                                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
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
                                <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                            const isActive = status.label === 'Active';
                                            return (
                                                <button
                                                    key={batch.batch_id}
                                                    onClick={() => handleBatchClick(batch)}
                                                    className="group relative text-left w-full p-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 hover:transform hover:scale-105 hover:-translate-y-2 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-purple-500/20 overflow-hidden"
                                                >
                                                    {/* Background Gradient Glow */}
                                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all duration-300" />

                                                    {/* Decorative Corner */}
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-bl-[100px] opacity-50 group-hover:opacity-100 transition-opacity" />

                                                    <div className="relative">
                                                        {/* Header with Icon and Status */}
                                                        <div className="flex justify-between items-start mb-5">
                                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                                                                <LayoutGrid className="w-7 h-7" />
                                                            </div>
                                                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md ${isActive
                                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                                                                : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                                                                }`}>
                                                                {status.label}
                                                            </span>
                                                        </div>

                                                        {/* Batch Name */}
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" title={batch.batch_name}>
                                                            {batch.batch_name}
                                                        </h3>

                                                        {/* Stats Grid */}
                                                        <div className="grid grid-cols-2 gap-3 mb-5">
                                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800/30 text-center">
                                                                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                                                    {batch.batch_student_strength}
                                                                </div>
                                                                <div className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold mt-1">Students</div>
                                                            </div>
                                                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800/30 text-center">
                                                                <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                                                    {batch.registered_courses_id?.length || 0}
                                                                </div>
                                                                <div className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold mt-1">Courses</div>
                                                            </div>
                                                        </div>

                                                        {/* Date Range */}
                                                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 font-medium pt-4 border-t border-gray-200 dark:border-slate-700">
                                                            <span>{new Date(batch.starting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                            <span className="text-gray-400">→</span>
                                                            <span>{new Date(batch.ending_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                        </div>

                                                        {/* Chevron */}
                                                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-purple-500">
                                                            <ChevronRight className="w-6 h-6" />
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                    {!loading && batches.length === 0 && (
                                        <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-20 flex flex-col items-center">
                                            <LayoutGrid className="w-16 h-16 mb-4 opacity-20" />
                                            <p className="text-lg font-medium">No batches found</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* View: Sections */}
                            {view === 'sections' && (
                                <div className="relative grid grid-cols-2 md:grid-cols-5 gap-4">
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
                                            <button
                                                key={idx}
                                                onClick={() => handleSectionClick(sec)}
                                                className="group relative p-8 rounded-2xl bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:transform hover:scale-110 hover:-translate-y-1 transition-all duration-300 text-center shadow-lg hover:shadow-2xl hover:shadow-emerald-500/20 overflow-hidden"
                                            >
                                                {/* Gradient Glow */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/10 group-hover:to-teal-500/10 transition-all duration-300" />

                                                <div className="relative">
                                                    {/* Section Icon */}
                                                    <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                        <Layers className="w-6 h-6 text-white" />
                                                    </div>

                                                    {/* Section Name */}
                                                    <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                                                        {sec}
                                                    </h3>
                                                    <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold">Section</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                    {!loading && sections.length === 0 && (
                                        <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-20 flex flex-col items-center">
                                            <Layers className="w-16 h-16 mb-4 opacity-20" />
                                            <p className="text-lg font-medium">No sections found</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* View: Students */}
                            {view === 'students' && (
                                <div className="relative space-y-4">
                                    {loading ? (
                                        <ListSkeleton />
                                    ) : (
                                        <>
                                            {students.length === 0 && (
                                                <div className="text-center text-gray-500 dark:text-gray-400 py-20 flex flex-col items-center">
                                                    <GraduationCap className="w-16 h-16 mb-4 opacity-20" />
                                                    <p className="text-lg font-medium">
                                                        {hasSearched ? 'No student found with that ID' : 'Use search to find students by Uni Reg ID'}
                                                    </p>
                                                </div>
                                            )}
                                            {students.map((student, idx) => (
                                                <div key={idx} className="group relative flex justify-between items-center p-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/20 overflow-hidden">
                                                    {/* Background Glow */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:to-indigo-500/5 transition-all duration-300" />

                                                    <div className="relative flex items-center gap-4">
                                                        {/* Avatar */}
                                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                                            {(student.student_name || student.name || 'S')[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                {student.student_name || student.name}
                                                            </h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                                                {student.uni_reg_id || student.reg_id}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => startStudentInspection(student)}
                                                        className="relative px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/40 flex items-center gap-2 group/btn"
                                                    >
                                                        View Details
                                                        <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                    </button>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* [NEW] View: Courses */}
                            {view === 'courses' && (
                                <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {loading ? (
                                        <>
                                            <BatchSkeleton />
                                            <BatchSkeleton />
                                            <BatchSkeleton />
                                            <BatchSkeleton />
                                        </>
                                    ) : (
                                        courses.map((course, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setInspectingCourse(course)}
                                                className="group relative text-left w-full p-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-500 hover:transform hover:scale-105 hover:-translate-y-2 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-orange-500/20 overflow-hidden"
                                            >
                                                {/* Background Gradient Glow */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-amber-500/0 group-hover:from-orange-500/10 group-hover:to-amber-500/10 transition-all duration-300" />

                                                {/* Decorative Corner */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-bl-[100px] opacity-50 group-hover:opacity-100 transition-opacity" />

                                                <div className="relative">
                                                    {/* Header with Icon */}
                                                    <div className="flex justify-between items-start mb-5">
                                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                                                            <BookOpen className="w-7 h-7" />
                                                        </div>
                                                    </div>

                                                    {/* Course Name */}
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors min-h-[3.5rem]" title={course.course_name}>
                                                        {course.course_name || 'Untitled Course'}
                                                    </h3>

                                                    {/* Course ID */}
                                                    {/* {course.course_id && (
                                                        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Course ID</p>
                                                            <p className="font-mono text-sm font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                                                                {course.course_id}
                                                            </p>
                                                        </div>
                                                    )} */}

                                                    {/* Chevron */}
                                                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-orange-500">
                                                        <ChevronRight className="w-6 h-6" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                    {!loading && courses.length === 0 && (
                                        <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-20 flex flex-col items-center">
                                            <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                                            <p className="text-lg font-medium">No courses found</p>
                                        </div>
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
