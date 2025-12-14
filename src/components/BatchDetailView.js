import React, { useState, useEffect } from 'react';
import { ArrowLeft, Layers, Users, TrendingUp, AlertCircle, Search, ArrowRight } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { Skeleton } from './Skeletons';
import { API_CONFIG } from '../utils/api';

export default function BatchDetailView({ batch, onBack, onSectionSelect }) {
    const [sections, setSections] = useState([]);
    const [courses, setCourses] = useState([]); // Added courses state
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchBatchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Sections
                const secRes = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.masters.sections}`, {
                    credentials: 'include'
                });
                const secData = await secRes.json();
                const allSections = Array.isArray(secData.data) ? secData.data : (Array.isArray(secData) ? secData : []);

                const batchSections = allSections.filter(sec =>
                    sec.batch_id === batch.batch_id ||
                    sec.batch === batch.batch_name ||
                    (sec.tags && sec.tags.includes(batch.batch_name))
                );

                setSections(batchSections);

                // 2. Fetch Courses
                // Endpoint: /api/courses/:batchId (Proxied via Student -> ap-q3q62i6z7...)
                const courseRes = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.courses(batch.batch_id)}`, {
                    credentials: 'include'
                });
                const courseData = await courseRes.json();
                // Handle response format variations
                const courseList = courseData.success ? (courseData.data || []) : (Array.isArray(courseData) ? courseData : []);
                setCourses(courseList);

            } catch (error) {
                console.error("Failed to fetch batch data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (batch) {
            fetchBatchData();
        }
    }, [batch]);

    // Derived Analytics from Sections
    const analytics = React.useMemo(() => {
        if (!sections.length) return null;
        return {
            totalSections: sections.length,
            totalStudents: sections.reduce((acc, sec) => acc + (sec.student_count || 0), 0),
            avgProgress: Math.round(sections.reduce((acc, sec) => acc + (sec.progress || 0), 0) / sections.length),
            totalCourses: courses.length
        };
    }, [sections, courses]);

    const filteredSections = sections.filter(sec =>
        sec.section_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0F19] animate-in fade-in slide-in-from-right duration-300 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 h-[400px] w-[400px] bg-purple-500/10 blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">{batch.batch_name}</h2>
                        <div className="flex gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                {batch.batch_student_strength || 0} Students
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-xs font-mono">
                                {new Date(batch.created_at || Date.now()).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT: Analytics Panel */}
                <div className="w-[400px] bg-black/20 border-r border-white/5 p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar">

                    {/* Key Metrics */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-400" />
                            Performance Overview
                        </h3>

                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden group">
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="text-gray-400 text-sm font-medium mb-1">Batch Progress</div>
                                    <div className="text-4xl font-bold text-white">{analytics?.avgProgress || 0}%</div>
                                </div>
                                <CircularProgress percentage={analytics?.avgProgress || 0} size={64} strokeWidth={6} color="purple" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="text-gray-400 text-xs uppercase mb-2">Total Sections</div>
                                <div className="text-2xl font-bold text-white">{analytics?.totalSections || 0}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="text-gray-400 text-xs uppercase mb-2">Total Students</div>
                                <div className="text-2xl font-bold text-white">{analytics?.totalStudents || 0}</div>
                            </div>
                        </div>
                    </div>

                    {/* Registered Courses List */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-cyan-400" />
                            Registered Courses ({courses.length})
                        </h3>
                        <div className="space-y-3">
                            {courses.length > 0 ? (
                                courses.map((course, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="font-bold text-white text-sm mb-1">{course.course_name || course.course_title || 'Untitled Course'}</div>
                                        <div className="text-xs text-gray-500 font-mono">{course.course_code || 'CODE-N/A'}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center text-gray-500 text-sm italic">
                                    No courses found for this batch.
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* RIGHT: Sections List */}
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-gradient-to-br from-black/0 to-purple-900/5">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Layers className="w-5 h-5 text-purple-400" />
                                Sections in Batch
                            </h3>
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Filter sections..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-black/30 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 w-64 transition-all"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredSections.length > 0 ? (
                                    filteredSections.map((sec, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => onSectionSelect(sec.section_name || sec.name)}
                                            className="text-left group p-5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all hover:-translate-y-1 duration-300"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-400 flex items-center justify-center font-bold text-lg border border-white/5">
                                                    {sec.section_name?.[0] || 'S'}
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 -translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                            <h4 className="font-bold text-white text-lg mb-1">{sec.section_name}</h4>
                                            <div className="flex items-center text-sm text-gray-400 gap-3">
                                                <span>{sec.student_count || 0} Students</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-600" />
                                                <span className={sec.progress >= 70 ? 'text-emerald-400' : 'text-amber-400'}>
                                                    {sec.progress || 0}% Avg
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
                                        <Layers className="w-12 h-12 mb-4 opacity-20" />
                                        <p>No sections found for this batch.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
