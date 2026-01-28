import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, FileText, HelpCircle, Layout, Loader2, PlayCircle, Folder, AlertCircle } from 'lucide-react';
import { API_CONFIG } from '../utils/api';

export default function CourseDetailView({ course, onBack }) {
    const [structure, setStructure] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedUnits, setExpandedUnits] = useState({});
    const [expandedLectures, setExpandedLectures] = useState({});
    const [selectedContent, setSelectedContent] = useState(null);

    // Fetch Course Details
    useEffect(() => {
        const fetchCourseContent = async () => {
            const cacheKey = `course_content_${course.course_id}`;
            const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

            // Check cache first
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    const now = Date.now();

                    // Check if cache is valid (has timestamp and is within duration)
                    if (parsed.timestamp && (now - parsed.timestamp < CACHE_DURATION) && parsed.data && parsed.data.units) {
                        setStructure(parsed.data);
                        setLoading(false);
                        return; // Use cached version
                    }
                }
            } catch (e) {
                console.warn("Failed to read from cache", e);
            }

            setLoading(true);
            try {
                const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getCourseContent}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ course_id: course.course_id }),
                    credentials: 'include'
                });
                const data = await res.json();

                if (data.success || Array.isArray(data) || Array.isArray(data.data)) {
                    let units = [];
                    if (Array.isArray(data)) units = data;
                    else if (Array.isArray(data.data)) units = data.data;
                    else if (data.units) units = data.units;

                    const newStructure = { units };
                    setStructure(newStructure);

                    // Save to cache with timestamp
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify({
                            data: newStructure,
                            timestamp: Date.now()
                        }));
                    } catch (e) {
                        console.warn("Failed to save to cache", e);
                    }
                } else {
                    setError("Failed to load course content");
                }
            } catch (err) {
                console.error("Error fetching course content:", err);
                setError("An error occurred while loading course content");
            } finally {
                setLoading(false);
            }
        };

        if (course?.course_id) {
            fetchCourseContent();
        }
    }, [course]);

    const toggleUnit = (unitId) => {
        setExpandedUnits(prev => ({
            ...prev,
            [unitId]: !prev[unitId]
        }));
    };

    const toggleLecture = (lectureId) => {
        setExpandedLectures(prev => ({
            ...prev,
            [lectureId]: !prev[lectureId]
        }));
    };

    // Helper to extract content items from a subItem, grouping questions
    const getContentItems = (subItem) => {
        const items = [];

        // Group MCQs
        if (subItem.mcq_questions && typeof subItem.mcq_questions === 'object') {
            const mcqs = Object.entries(subItem.mcq_questions).map(([id, q]) => ({ ...q, id, type: 'mcq', parentTitle: subItem.title }));
            if (mcqs.length > 0) {
                items.push({ type: 'mcq-group', title: 'Practice MCQs', count: mcqs.length, items: mcqs, parentTitle: subItem.title });
            }
        }

        // Group Coding Questions
        if (subItem.coding_questions && typeof subItem.coding_questions === 'object') {
            const coding = Object.entries(subItem.coding_questions).map(([id, q]) => ({ ...q, id, type: 'coding', parentTitle: subItem.title }));
            if (coding.length > 0) {
                items.push({ type: 'coding-group', title: 'Coding Challenges', count: coding.length, items: coding, parentTitle: subItem.title });
            }
        }

        if (subItem.video_url) items.push({ type: 'video', title: 'Video Lecture', url: subItem.video_url, parentTitle: subItem.title });

        // Handle PDFs
        const pdfs = [];
        if (subItem.sub_unit_pdf) pdfs.push({ label: 'Material 1', url: subItem.sub_unit_pdf });
        if (subItem.sub_unit_pdf2) pdfs.push({ label: 'Material 2', url: subItem.sub_unit_pdf2 });
        if (subItem.pdf_material && !pdfs.some(p => p.url === subItem.pdf_material)) {
            pdfs.push({ label: 'Additional PDF', url: subItem.pdf_material });
        }

        if (pdfs.length > 0) {
            items.push({ type: 'pdf', title: 'Lecture Notes', pdfs: pdfs, parentTitle: subItem.title });
        }

        return items;
    };

    const renderSidebarItem = (contentItem, idx) => {
        const type = contentItem.type || 'unknown';
        const title = contentItem.title || 'Untitled';
        const isSelected = selectedContent === contentItem;

        return (
            <button
                key={idx}
                onClick={() => setSelectedContent(contentItem)}
                className={`w-full text-left p-2 rounded-lg text-xs mb-1 flex items-center gap-2 transition-colors ${isSelected
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
            >
                {(type === 'mcq' || type === 'mcq-group') && <HelpCircle className="w-3 h-3" />}
                {(type === 'coding' || type === 'coding-group') && <FileText className="w-3 h-3" />}
                {type === 'video' && <PlayCircle className="w-3 h-3" />}
                {type === 'pdf' && <BookOpen className="w-3 h-3" />}
                <span className="truncate flex-1">{title}</span>
                {contentItem.count && <span className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-bold">{contentItem.count}</span>}
                {isSelected && <ChevronRight className="w-3 h-3" />}
            </button>
        );
    };

    const PaginationControls = ({ current, total, onNext, onPrev, onSelect }) => (
        <div className="sticky top-0 space-y-4">
            <div className="p-4 bg-white dark:bg-[#0f1523] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Navigate</span>
                    <span className="text-xs text-gray-500 font-mono">{current + 1} / {total}</span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                    {Array.from({ length: total }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => onSelect(i)}
                            className={`aspect-square rounded-lg text-xs font-bold transition-all flex items-center justify-center ${current === i
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-500 ring-offset-2 dark:ring-offset-[#0f1523]'
                                : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:scale-105'
                                }`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onPrev}
                        disabled={current === 0}
                        className="flex-1 p-2 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-100 isabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onNext}
                        disabled={current === total - 1}
                        className="flex-1 p-2 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    // Main Content Renderer Wrapper to handle state isolation
    const MainContentArea = ({ content }) => {
        const [currentIndex, setCurrentIndex] = useState(0);
        const [activePdfIndex, setActivePdfIndex] = useState(0);

        useEffect(() => {
            setCurrentIndex(0);
            setActivePdfIndex(0);
        }, [content]);

        if (!content) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Layout className="w-16 h-16 mb-4 opacity-20" />
                    <p>Select an item from the sidebar to view details</p>
                </div>
            );
        }

        const type = content.type;
        const isGroup = type === 'mcq-group' || type === 'coding-group';
        const currentItem = isGroup ? content.items[currentIndex] : content;

        // Determine display title
        const displayTitle = currentItem.question || currentItem.header || currentItem.title || currentItem.name || content.title;

        // Render functions for specific types
        const renderMCQ = (item) => (
            <div className="space-y-6">
                {item.images && item.images.length > 0 && (
                    <img
                        src={item.images[0].url}
                        alt="Question Figure"
                        className="max-h-80 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm"
                    />
                )}
                <div className="grid gap-3">
                    {item.options && item.options.map((opt, idx) => (
                        <div
                            key={idx}
                            className={`p-4 rounded-xl border text-base flex items-center justify-between transition-all ${opt.isAnswer
                                ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-300 shadow-sm'
                                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            <span>{opt.option}</span>
                            {opt.isAnswer && <span className="ml-4 shrink-0 px-2 py-1 bg-green-200 dark:bg-green-500/20 text-green-800 dark:text-green-200 text-xs font-bold rounded uppercase">Correct Answer</span>}
                        </div>
                    ))}
                </div>
            </div>
        );

        const renderCoding = (item) => {
            const getCode = (codeField) => {
                if (!codeField) return '// No code provided';
                if (typeof codeField === 'string') return codeField;
                return codeField.code || '// No code provided';
            };

            return (
                <div className="space-y-8">
                    {/* Problem Header */}
                    <div className="bg-white dark:bg-[#0f1523] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-4 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Problem Description
                        </h3>
                        <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                            <div className="whitespace-pre-wrap leading-relaxed font-medium">
                                {item['question-description']}
                            </div>
                        </div>
                    </div>

                    {/* Code Sections */}
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Solution Code</h3>
                            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-500/20">Reference</span>
                        </div>
                        <div className="flex-1 bg-[#0a1512] group relative rounded-xl border border-emerald-900/30 shadow-2xl overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-8 bg-emerald-500/5 border-b border-emerald-500/10 flex items-center px-4 gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20"></div>
                            </div>
                            <div className="p-4 pt-10 overflow-x-auto custom-scrollbar">
                                <pre className="text-xs font-mono text-emerald-50 leading-relaxed font-medium">{getCode(item['compiler-code'])}</pre>
                            </div>
                        </div>
                    </div>

                    {/* Test Cases */}
                    {(item['sample-input-output'] || item['hidden-test-cases']) && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4 rotate-180" /> Test Cases
                            </h3>

                            <div className="grid gap-4">
                                {[...(item['sample-input-output'] || []).map(tc => ({ ...tc, type: 'Sample' })),
                                ...(item['hidden-test-cases'] || []).map(tc => ({ ...tc, type: 'Hidden' }))
                                ].map((tc, i) => (
                                    <div key={i} className="group bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-white/5 rounded-xl p-1 hover:border-cyan-500/30 transition-colors shadow-sm">
                                        <div className="flex items-center gap-3 p-3 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] rounded-t-lg">
                                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md shadow-sm ${tc.type === 'Sample'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-purple-500 text-white'
                                                }`}>
                                                {tc.type} Case {i + 1}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 font-mono text-xs">
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider pl-1">Input</span>
                                                <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-lg border border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-300 min-h-[3rem] whitespace-pre-wrap">
                                                    {tc.input}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider pl-1">Expected Output</span>
                                                <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-lg border border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-300 min-h-[3rem] whitespace-pre-wrap">
                                                    {tc.output}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        const renderPDF = (item) => (
            <div className="h-full flex flex-col">
                {/* PDF Toggles */}
                <div className="flex gap-2 mb-4 bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
                    {item.pdfs.map((pdf, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActivePdfIndex(idx)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activePdfIndex === idx
                                    ? 'bg-white dark:bg-[#0f1523] text-cyan-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            {pdf.label || `PDF ${idx + 1}`}
                        </button>
                    ))}
                </div>

                {/* PDF Iframe */}
                <div className="flex-1 bg-white dark:bg-[#0f1523] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm relative">
                    <iframe
                        src={item.pdfs[activePdfIndex].url}
                        className="w-full h-full border-none"
                        title="PDF Viewer"
                    />
                </div>
            </div>
        );

        return (
            <div className="h-full overflow-y-auto custom-scrollbar p-8">
                <div className={`mx-auto h-full ${isGroup ? 'max-w-6xl flex gap-8' : 'max-w-5xl flex flex-col'}`}>

                    {/* Content Section - grows to fill space minus sidebar */}
                    <div className="flex-1 min-w-0 flex flex-col">
                        <div className="mb-6 pb-6 border-b border-slate-200 dark:border-white/10 shrink-0">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                                    {type.replace('-group', '').toUpperCase()}
                                </span>
                                {content.parentTitle && <span className="text-sm text-gray-400">in {content.parentTitle}</span>}
                                {isGroup && <span className="text-sm text-gray-400">• {currentIndex + 1} of {content.items.length}</span>}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white line-clamp-2">{displayTitle}</h2>
                        </div>

                        {(type === 'mcq-group' || type === 'mcq') && renderMCQ(currentItem)}
                        {(type === 'coding-group' || type === 'coding') && renderCoding(currentItem)}
                        {type === 'pdf' && renderPDF(content)}

                        {type === 'video' && content.url && (
                            <div className="flex flex-col items-center justify-center p-10 bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-gray-300 dark:border-white/10">
                                <PlayCircle className="w-16 h-16 text-blue-500 mb-4 opacity-80" />
                                <h3 className="text-xl font-bold mb-2">Video Resource</h3>
                                <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                    Click to Open Video Link
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Right Side Navigation for Groups */}
                    {isGroup && content.items.length > 1 && (
                        <div className="w-64 shrink-0 hidden xl:block">
                            <PaginationControls
                                current={currentIndex}
                                total={content.items.length}
                                onNext={() => setCurrentIndex(c => Math.min(c + 1, content.items.length - 1))}
                                onPrev={() => setCurrentIndex(c => Math.max(c - 1, 0))}
                                onSelect={setCurrentIndex}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-[#0B0F19] animate-in fade-in slide-in-from-bottom-5 duration-300 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#0B0F19] shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                            {course.course_name || 'Course Details'}
                        </h2>
                        {course.course_code && <span className="text-xs text-gray-500 font-mono">{course.course_code}</span>}
                    </div>
                </div>
            </div>

            {/* Split View Container */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-[350px] bg-white dark:bg-[#0f1523] border-r border-gray-200 dark:border-white/5 flex flex-col overflow-hidden shrink-0">
                    <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-transparent">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Course Structure</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {loading ? (
                            <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500" /></div>
                        ) : error ? (
                            <div className="p-4 text-center text-red-500 text-sm">{error}</div>
                        ) : (
                            <div className="space-y-2">
                                {structure && structure.units && structure.units.map((unit, uIdx) => (
                                    <div key={uIdx} className="overflow-hidden">
                                        <button
                                            onClick={() => toggleUnit(uIdx)}
                                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs font-bold">
                                                    {uIdx + 1}
                                                </div>
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 line-clamp-1">{unit.unit_title || unit.title || 'Unit ' + (uIdx + 1)}</span>
                                            </div>
                                            {expandedUnits[uIdx] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />}
                                        </button>

                                        {expandedUnits[uIdx] && (
                                            <div className="ml-3 pl-3 border-l border-gray-200 dark:border-white/5 space-y-1 mt-1">
                                                {(unit.sub_units || unit.subunits || []).map((sub, sIdx) => {
                                                    const subKey = `${uIdx}-${sIdx}`;
                                                    const items = getContentItems(sub);

                                                    return (
                                                        <div key={sIdx}>
                                                            <button
                                                                onClick={() => toggleLecture(subKey)}
                                                                className="w-full text-left py-2 px-2 rounded hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 group"
                                                            >
                                                                {expandedLectures[subKey] ? <ChevronDown className="w-3 h-3 text-gray-300" /> : <ChevronRight className="w-3 h-3 text-gray-300" />}
                                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 line-clamp-1">{sub.title || 'Subunit'}</span>
                                                                <span className="text-[10px] text-gray-400 ml-auto">{items.length}</span>
                                                            </button>

                                                            {expandedLectures[subKey] && items.length > 0 && (
                                                                <div className="ml-5 space-y-0.5 mb-2">
                                                                    {items.map((item, iIdx) => renderSidebarItem(item, iIdx))}
                                                                </div>
                                                            )}
                                                            {expandedLectures[subKey] && items.length === 0 && (
                                                                <div className="ml-6 py-1 text-[10px] text-gray-400 italic">Empty</div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 bg-slate-50 dark:bg-[#0B0F19] relative">
                    <div className="absolute inset-0">
                        <MainContentArea content={selectedContent} />
                    </div>
                </div>
            </div>
        </div>
    );
}
