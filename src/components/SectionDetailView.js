import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Users, TrendingUp, AlertCircle, Search, ArrowUpDown } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { Skeleton } from './Skeletons';

export default function SectionDetailView({ section, onBack, onStudentSelect }) {
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' for seeing who is behind (low %)

    // Mock Data Load (Replace with real API)
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await new Promise(r => setTimeout(r, 800)); // Simulate delay

            // 1. Mock Active Courses
            setCourses([
                { id: 1, name: 'Intro to Programming', code: 'CS101', active_students: 45 },
                { id: 2, name: 'Data Structures', code: 'CS102', active_students: 42 },
                { id: 3, name: 'Web Development', code: 'CS201', active_students: 38 },
            ]);

            // 2. Mock Students with Progress
            const mockStudents = Array.from({ length: 20 }).map((_, i) => ({
                id: `STU${1000 + i}`,
                name: `Student ${i + 1}`,
                completion: Math.floor(Math.random() * 100),
                courses_completed: Math.floor(Math.random() * 5),
                last_active: '2 hours ago'
            }));
            setStudents(mockStudents);
            setLoading(false);
        };
        loadData();
    }, [section]);

    // Sorting Logic
    const sortedStudents = [...students].sort((a, b) => {
        return sortOrder === 'asc' ? a.completion - b.completion : b.completion - a.completion;
    });

    return (
        <div className="absolute inset-0 z-50 flex flex-col bg-[#0B0F19] animate-in fade-in slide-in-from-right duration-300">
            {/* Background Effects (Matches Dashboard) */}
            <div className="fixed -top-40 -left-48 h-[38rem] w-[38rem] bg-pink-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="fixed -bottom-44 -right-40 h-[42rem] w-[42rem] bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-xl sticky top-0 z-10 relative">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="text-xs text-pink-400 uppercase tracking-wider font-semibold mb-1">Section Analytics</div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            {section.section_name || 'Section Name'}
                            <span className="text-sm font-normal px-3 py-1 rounded-full bg-white/5 text-gray-300 border border-white/10 font-mono">
                                {section.batch_name || 'Batch A'}
                            </span>
                        </h2>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative z-10">

                {/* LEFT: Active Courses Summary */}
                <div className="w-full md:w-1/3 p-6 border-r border-white/5 overflow-y-auto custom-scrollbar bg-black/10 backdrop-blur-md">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-pink-400" />
                        Active Courses
                    </h3>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />)}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {courses.map(course => (
                                <div key={course.id} className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/5 hover:border-pink-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-white">{course.name}</div>
                                        <span className="text-xs font-mono text-gray-500 bg-black/20 px-2 py-0.5 rounded">{course.code}</span>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        Active Students: <span className="text-white">{course.active_students}</span>
                                    </div>
                                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                                        <div className="bg-pink-500 h-full rounded-full" style={{ width: '65%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT: Student Progress List */}
                <div className="flex-1 p-6 overflow-hidden flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-purple-400" />
                                Student Progress
                            </h3>
                            <p className="text-gray-400 text-sm">Identifying students who might be falling behind.</p>
                        </div>

                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
                            <span className="text-xs text-gray-500 font-medium px-3">Sort by Progress:</span>
                            <button
                                onClick={() => setSortOrder('asc')}
                                className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1.5 ${sortOrder === 'asc' ? 'bg-pink-500/20 text-pink-400' : 'text-gray-400 hover:text-white'}`}
                            >
                                <ArrowUpDown className="w-3.5 h-3.5" /> Lowest First
                            </button>
                            <button
                                onClick={() => setSortOrder('desc')}
                                className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1.5 ${sortOrder === 'desc' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'}`}
                            >
                                <ArrowUpDown className="w-3.5 h-3.5" /> Highest First
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {loading ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {sortedStudents.map(student => (
                                    <button
                                        key={student.id}
                                        onClick={() => onStudentSelect(student)}
                                        className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-pink-500/30 transition-all text-left"
                                    >
                                        <div className="relative">
                                            <CircularProgress
                                                percentage={student.completion}
                                                size={56}
                                                strokeWidth={4}
                                                color={student.completion < 30 ? 'orange' : student.completion < 70 ? 'blue' : 'emerald'}
                                            />
                                            {student.completion < 30 && (
                                                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border border-[#0B0F19]">!</div>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-white group-hover:text-pink-400 transition-colors">{student.name}</h4>
                                                <span className="text-xs text-gray-500 font-mono bg-black/20 px-1.5 py-0.5 rounded">{student.id}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Courses Completed: <span className="text-white">{student.courses_completed}</span> • Active: {student.last_active}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
