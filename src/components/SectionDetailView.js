import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Users, TrendingUp, AlertCircle, Search, ArrowUpDown } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { Skeleton, SectionDetailSkeleton } from './Skeletons';
import { API_CONFIG } from '../utils/api';

export default function SectionDetailView({ section, onBack, onStudentSelect }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'overall_progress', direction: 'asc' });

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                // section is just the string name, e.g. "edutest02"
                // or if it's an object, access the name property
                const sectionName = typeof section === 'string' ? section : section.section_name || section;

                // Construct URL correctly with the base URL for admin proxy if needed, 
                // but usually API_CONFIG should handle full path or we prepend the base.
                // Assuming API_CONFIG.admin.sectionAnalytics returns the path.
                // We need to verify if we need to prepend strict base URL or if the proxy handles it.
                // Looking at api.js, 'admin' base is '/api/proxy/admin'. But the endpoints in 'admin' object are full paths?
                // Actually 'admin' object has full paths like '/api/university/admin/...'. 
                // Let's rely on the pattern used elsewhere.

                const url = `${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.sectionAnalytics(encodeURIComponent(sectionName))}`;
                console.log("Fetching Section Analytics URL:", url);
                const res = await fetch(url, {
                    credentials: 'include'
                });
                const json = await res.json();
                if (json.success) {
                    setData(json.data);
                }
            } catch (error) {
                console.error("Failed to fetch section analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        if (section) {
            fetchAnalytics();
        }
    }, [section]);

    // Sorting Logic
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

    if (loading) {
        return <SectionDetailSkeleton />;
    }

    if (!data) return null;

    const { section_metadata, course_performance, student_performance } = data;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0F19] animate-in fade-in slide-in-from-right duration-300 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 h-[400px] w-[400px] bg-cyan-500/10 blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="text-xs text-cyan-400 uppercase tracking-wider font-semibold mb-1">Section Analytics</div>
                        <h2 className="text-3xl font-bold text-white mb-2">{section_metadata?.section_name}</h2>
                        <div className="flex gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> {section_metadata?.total_students} Students</span>
                            <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> {section_metadata?.total_courses} Courses</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* LEFT: Course Performance */}
                <div className="w-full md:w-80 p-6 border-r border-white/5 bg-black/20 overflow-y-auto custom-scrollbar shrink-0">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-cyan-400" /> Course Performance
                    </h3>
                    <div className="space-y-4">
                        {course_performance?.map(course => (
                            <div key={course.course_id} className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <h4 className="font-bold text-white text-sm mb-2">{course.course_name}</h4>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-xs text-gray-500">Avg Score</span>
                                    <span className="text-xl font-bold text-cyan-400">{course.average_score}%</span>
                                </div>
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${course.average_score}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Student Table */}
                <div className="flex-1 p-6 overflow-hidden flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-400" /> Student Performance
                    </h3>

                    <div className="flex-1 overflow-auto custom-scrollbar border border-white/10 rounded-xl bg-white/5">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white/5 sticky top-0 backdrop-blur-md z-10">
                                <tr>
                                    <th className="p-4 text-sm font-semibold text-gray-300 cursor-pointer hover:bg-white/5" onClick={() => requestSort('student_name')}>
                                        Student Name <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50" />
                                    </th>
                                    <th className="p-4 text-sm font-semibold text-gray-300">Reg ID</th>
                                    <th className="p-4 text-sm font-semibold text-gray-300 text-center cursor-pointer hover:bg-white/5" onClick={() => requestSort('overall_progress')}>
                                        Progress <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50" />
                                    </th>
                                    {/* Dynamic Course Headers */}
                                    {course_performance?.map(c => (
                                        <th key={c.course_id} className="p-4 text-sm font-semibold text-gray-300 text-center border-l border-white/5">
                                            {c.course_name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {sortedStudents.map(student => (
                                    <tr key={student.student_id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-medium text-white group-hover:text-cyan-400 transition-colors pointer cursor-pointer" onClick={() => onStudentSelect(student)}>
                                                {student.student_name}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-400 font-mono">{student.uni_reg_id}</td>
                                        <td className="p-4 text-center">
                                            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                                                <div className={`w-2 h-2 rounded-full ${student.overall_progress > 75 ? 'bg-emerald-500' : student.overall_progress > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                                <span className="text-sm font-bold text-white">{student.overall_progress}%</span>
                                            </div>
                                        </td>
                                        {/* Dynamic Course Cells */}
                                        {course_performance?.map(c => {
                                            const courseData = student.courses.find(sc => sc.course_id === c.course_id);
                                            return (
                                                <td key={c.course_id} className="p-4 text-center border-l border-white/5">
                                                    {courseData ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-bold text-white">{courseData.score}</span>
                                                            {courseData.status !== 'N/A' && (
                                                                <span className={`text-[10px] px-1.5 rounded uppercase tracking-wider font-bold ${courseData.status === 'Pass' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                                                    }`}>
                                                                    {courseData.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : <span className="text-gray-600">-</span>}
                                                </td>
                                            );
                                        })}
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
