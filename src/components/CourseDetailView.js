import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronRight, FileText,
  HelpCircle, Layout, Loader2, PlayCircle, AlertCircle,
  Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, Search,
  CheckCircle, Circle, RotateCcw, Copy, Check, ExternalLink,
  X, Clock, Zap, BookmarkPlus, ChevronUp, GripVertical
} from 'lucide-react';
import { API_CONFIG } from '../utils/api';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }, [key, value]);

  return [value, setValue];
};

const useKeyboardShortcut = (key, callback, deps = []) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === key && !e.ctrlKey && !e.metaKey &&
        !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, ...deps]);
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// Skeleton Loader
const SkeletonLoader = () => (
  <div className="p-4 space-y-4 animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i} className="space-y-2">
        <div className="h-12 bg-gray-200 dark:bg-white/5 rounded-xl" />
        <div className="ml-6 space-y-1">
          <div className="h-8 bg-gray-100 dark:bg-white/3 rounded-lg w-4/5" />
          <div className="h-8 bg-gray-100 dark:bg-white/3 rounded-lg w-3/4" />
        </div>
      </div>
    ))}
  </div>
);

// Progress Ring
const ProgressRing = ({ progress, size = 32, strokeWidth = 3 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        className="text-gray-200 dark:text-white/10"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="text-emerald-500 transition-all duration-500"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
      />
    </svg>
  );
};

// Content Type Badge
const ContentTypeBadge = ({ type, className = "" }) => {
  const config = {
    'mcq': { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300', label: 'MCQ' },
    'mcq-group': { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300', label: 'MCQs' },
    'coding': { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300', label: 'Code' },
    'coding-group': { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300', label: 'Coding' },
    'video': { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-300', label: 'Video' },
    'pdf': { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300', label: 'Notes' },
  };

  const c = config[type] || config['mcq'];

  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text} ${className}`}>
      {c.label}
    </span>
  );
};

// Search Bar Component
const SearchBar = ({ value, onChange, onClear }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search content..."
      className="w-full pl-9 pr-8 py-2.5 bg-gray-100 dark:bg-white/5 rounded-xl text-sm 
                 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50
                 border border-transparent focus:border-blue-500/30 transition-all"
    />
    {value && (
      <button
        onClick={onClear}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
      >
        <X className="w-3 h-3 text-gray-400" />
      </button>
    )}
  </div>
);

// Breadcrumb Component
const Breadcrumb = ({ items }) => (
  <nav className="flex items-center gap-1 text-xs text-gray-500 overflow-x-auto hide-scrollbar">
    {items.filter(Boolean).map((item, idx) => (
      <React.Fragment key={idx}>
        {idx > 0 && <ChevronRight className="w-3 h-3 shrink-0" />}
        <span className={`truncate max-w-[120px] ${idx === items.length - 1 ? 'text-gray-900 dark:text-white font-medium' : ''}`}>
          {item}
        </span>
      </React.Fragment>
    ))}
  </nav>
);

// Copy Button with feedback
const CopyButton = ({ text, className = "" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${copied
        ? 'bg-emerald-500 text-white'
        : 'bg-white/10 hover:bg-white/20 text-gray-300'
        } ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function CourseDetailView({ course, onBack }) {
  // Core State
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI State
  const [expandedUnits, setExpandedUnits] = useState({});
  const [expandedLectures, setExpandedLectures] = useState({});
  const [selectedContent, setSelectedContent] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Progress State (persisted)
  //   const [completedItems, setCompletedItems] = useLocalStorage(
  //     `course_progress_${course?.course_id}`,
  //     {}
  //   );
  const completedItems = {};
  const setCompletedItems = () => { };
  const [lastViewed, setLastViewed] = useLocalStorage(
    `course_last_${course?.course_id}`,
    null
  );

  // Refs
  const contentRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchCourseContent = useCallback(async (forceRefresh = false) => {
    const cacheKey = `course_content_${course.course_id}`;
    const CACHE_DURATION = 5 * 60 * 1000;

    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION && data?.units) {
            setStructure(data);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn("Cache read failed", e);
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getCourseContent}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ course_id: course.course_id }),
          credentials: 'include'
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      let units = [];

      if (Array.isArray(data)) units = data;
      else if (Array.isArray(data.data)) units = data.data;
      else if (data.units) units = data.units;
      else if (data.success === false) throw new Error(data.message || 'Failed to load');

      const newStructure = { units };
      setStructure(newStructure);

      localStorage.setItem(cacheKey, JSON.stringify({
        data: newStructure,
        timestamp: Date.now()
      }));

      // Auto-expand first unit
      if (units.length > 0) {
        setExpandedUnits({ 0: true });
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to load course content");
    } finally {
      setLoading(false);
    }
  }, [course?.course_id]);

  useEffect(() => {
    if (course?.course_id) {
      fetchCourseContent();
    }
  }, [course?.course_id, fetchCourseContent]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTENT HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  const getContentItems = useCallback((subItem) => {
    const items = [];
    const parentTitle = subItem.title;

    // MCQs
    if (subItem.mcq_questions && typeof subItem.mcq_questions === 'object') {
      const mcqs = Object.entries(subItem.mcq_questions).map(([id, q]) => ({
        ...q, id, type: 'mcq', parentTitle
      }));
      if (mcqs.length > 0) {
        items.push({
          type: 'mcq-group',
          title: 'Practice MCQs',
          count: mcqs.length,
          items: mcqs,
          parentTitle,
          id: `mcq-${parentTitle}`
        });
      }
    }

    // Coding
    if (subItem.coding_questions && typeof subItem.coding_questions === 'object') {
      const coding = Object.entries(subItem.coding_questions).map(([id, q]) => ({
        ...q, id, type: 'coding', parentTitle
      }));
      if (coding.length > 0) {
        items.push({
          type: 'coding-group',
          title: 'Coding Challenges',
          count: coding.length,
          items: coding,
          parentTitle,
          id: `coding-${parentTitle}`
        });
      }
    }

    // Video
    if (subItem.video_url) {
      items.push({
        type: 'video',
        title: 'Video Lecture',
        url: subItem.video_url,
        parentTitle,
        id: `video-${parentTitle}`
      });
    }

    // PDFs
    const pdfs = [];
    if (subItem.sub_unit_pdf) pdfs.push({ label: 'Material 1', url: subItem.sub_unit_pdf });

    Object.keys(subItem).forEach(key => {
      if (key.startsWith('sub_unit_pdf') && key !== 'sub_unit_pdf' && subItem[key]) {
        const num = key.match(/\d+$/)?.[0] || '';
        pdfs.push({ label: `Material ${num}`, url: subItem[key] });
      }
    });

    if (subItem.pdf_material) {
      pdfs.push({ label: 'Additional PDF', url: subItem.pdf_material });
    }

    // Deduplicate
    const uniquePdfs = pdfs.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);

    if (uniquePdfs.length > 0) {
      items.push({
        type: 'pdf',
        title: 'Lecture Notes',
        pdfs: uniquePdfs,
        parentTitle,
        id: `pdf-${parentTitle}`
      });
    }

    return items;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────────

  //   const { flattenedContent, stats } = useMemo(() => {
  //     if (!structure?.units) return { flattenedContent: [], stats: { total: 0, completed: 0 } };

  //     const items = [];
  //     let total = 0;
  //     let completed = 0;

  //     structure.units.forEach((unit, uIdx) => {
  //       (unit.sub_units || unit.subunits || []).forEach((sub, sIdx) => {
  //         const contentItems = getContentItems(sub);
  //         contentItems.forEach(item => {
  //           items.push({
  //             ...item,
  //             unitIndex: uIdx,
  //             subIndex: sIdx,
  //             unitTitle: unit.unit_title || unit.title,
  //             searchText: `${unit.unit_title || ''} ${sub.title || ''} ${item.title || ''}`.toLowerCase()
  //           });
  //           total++;
  //           if (completedItems[item.id]) completed++;
  //         });
  //       });
  //     });

  //     return { flattenedContent: items, stats: { total, completed } };
  //   }, [structure, getContentItems, completedItems]);

  const { flattenedContent, stats } = useMemo(() => {
    if (!structure?.units) return { flattenedContent: [], stats: { total: 0, completed: 0 } };

    const items = [];
    let total = 0;
    let completed = 0;

    structure.units.forEach((unit, uIdx) => {
      (unit.sub_units || unit.subunits || []).forEach((sub, sIdx) => {
        const contentItems = getContentItems(sub);
        contentItems.forEach(item => {
          items.push({
            ...item,
            unitIndex: uIdx,
            subIndex: sIdx,
            unitTitle: unit.unit_title || unit.title,
            searchText: `${unit.unit_title || ''} ${sub.title || ''} ${item.title || ''}`.toLowerCase()
          });
          total++;
          // ✅ FIXED: Use logical OR to check if item is completed
          if (completedItems[item.id] || item.is_completed) {
            completed++;
          }
        });
      });
    });

    return { flattenedContent: items, stats: { total, completed } };
  }, [structure, getContentItems, completedItems]);


  const filteredContent = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return flattenedContent.filter(item => item.searchText.includes(query));
  }, [searchQuery, flattenedContent]);

  //   const progressPercent = stats.total > 0 
  //     ? Math.round((stats.completed / stats.total) * 100) 
  //     : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const toggleLecture = (lectureId) => {
    setExpandedLectures(prev => {
      if (prev[lectureId]) return { [lectureId]: false };
      return { [lectureId]: true };
    });
  };

  const selectContent = (content) => {
    setSelectedContent(content);
    setLastViewed(content?.id || null);

    // Auto-close sidebar on mobile
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  //   const markComplete = (itemId) => {
  //     setCompletedItems(prev => ({ ...prev, [itemId]: true }));
  //   };

  //   const markIncomplete = (itemId) => {
  //     setCompletedItems(prev => {
  //       const { [itemId]: _, ...rest } = prev;
  //       return rest;
  //     });
  //   };

  // Keyboard shortcuts
  useKeyboardShortcut('Escape', () => {
    if (selectedContent) setSelectedContent(null);
    else onBack();
  }, [selectedContent, onBack]);

  useKeyboardShortcut('b', () => setIsSidebarOpen(prev => !prev), []);

  // ─────────────────────────────────────────────────────────────────────────────
  // SIDEBAR ITEM RENDERER
  // ─────────────────────────────────────────────────────────────────────────────

  // REPLACE THE ENTIRE renderSidebarItem WITH THIS:
  const renderSidebarItem = (contentItem, idx) => {
    const isSelected = selectedContent?.id === contentItem.id;
    const type = contentItem.type;

    const icons = {
      'mcq': HelpCircle,
      'mcq-group': HelpCircle,
      'coding': FileText,
      'coding-group': FileText,
      'video': PlayCircle,
      'pdf': BookOpen
    };
    const Icon = icons[type] || FileText;

    return (
      <button
        key={contentItem.id || idx}
        onClick={() => selectContent(contentItem)}
        className={`group w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2.5 
                  transition-all duration-200 relative overflow-hidden
                  ${isSelected
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]'
            : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
          }`}
      >
        <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all
                      ${isSelected ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10'}`}>
          <Icon className="w-3 h-3" />
        </div>

        <span className="flex-1 truncate font-medium">
          {contentItem.title}
        </span>

        {contentItem.count && (
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums
                        ${isSelected ? 'bg-white/20' : 'bg-gray-200 dark:bg-white/10'}`}>
            {contentItem.count}
          </span>
        )}

        {isSelected && (
          <ChevronRight className="w-3.5 h-3.5 animate-pulse" />
        )}
      </button>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN CONTENT AREA
  // ─────────────────────────────────────────────────────────────────────────────

  const MainContentArea = ({ content }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activePdfIndex, setActivePdfIndex] = useState(0);
    const [pdfExpanded, setPdfExpanded] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showExplanation, setShowExplanation] = useState(false);

    // Reset state when content changes
    useEffect(() => {
      setCurrentIndex(0);
      setActivePdfIndex(0);
      setPdfExpanded(false);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }, [content]);

    // Empty state
    if (!content) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-violet-100 
                          dark:from-blue-500/10 dark:to-violet-500/10 rounded-3xl 
                          flex items-center justify-center mb-8 shadow-inner">
              <Layout className="w-12 h-12 text-gray-300 dark:text-gray-600" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full 
                          flex items-center justify-center animate-bounce shadow-lg">
              <Zap className="w-4 h-4 text-white" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Ready to Learn?
          </h3>
          <p className="text-center text-gray-500 max-w-md mb-6">
            Select an item from the sidebar to view videos, practice problems, or read notes.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 rounded-lg text-xs font-mono">
              B
            </kbd>
            <span className="text-xs text-gray-400">Toggle sidebar</span>
            <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 rounded-lg text-xs font-mono">
              Esc
            </kbd>
            <span className="text-xs text-gray-400">Go back</span>
          </div>
        </div>
      );
    }

    const type = content.type;
    const isGroup = type === 'mcq-group' || type === 'coding-group';
    const currentItem = isGroup ? content.items[currentIndex] : content;
    const displayTitle = currentItem?.question || currentItem?.header || currentItem?.title || content.title;

    // ─────────────────────────────────────────────────────────────────────────
    // MCQ Renderer
    // ─────────────────────────────────────────────────────────────────────────
    const renderMCQ = (item) => {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

      return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
          {/* Question Image */}
          {item.images?.[0] && (
            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-lg">
              <img
                src={item.images[0].url}
                alt="Question figure"
                className="w-full h-auto max-h-80 object-contain bg-white dark:bg-[#0f1523]"
              />
            </div>
          )}

          {/* Question Card */}
          <div className="bg-white dark:bg-[#0f1523] rounded-2xl p-8 shadow-sm 
                        border border-gray-100 dark:border-white/5 relative overflow-hidden">
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl 
                          from-violet-500/5 to-transparent rounded-bl-full -mr-10 -mt-10" />

            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white 
                         leading-relaxed relative z-10 mb-8">
              {displayTitle}
            </h3>

            <div className="space-y-3 relative z-10">
              {item.options?.map((opt, idx) => {
                const isCorrect = opt.isAnswer;
                const isSelected = selectedAnswer === idx;
                const showResult = showExplanation;

                let optionClass = 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10';

                if (showResult) {
                  if (isCorrect) {
                    optionClass = 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20';
                  } else if (isSelected && !isCorrect) {
                    optionClass = 'bg-red-50 dark:bg-red-500/10 border-red-500';
                  }
                } else if (isSelected) {
                  optionClass = 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedAnswer(idx);
                      if (!showExplanation) setShowExplanation(true);
                    }}
                    disabled={showExplanation}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300
                              ${optionClass} ${!showExplanation ? 'hover:scale-[1.01] cursor-pointer' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center 
                                     text-sm font-bold transition-all
                                     ${showResult && isCorrect
                          ? 'bg-emerald-500 text-white'
                          : showResult && isSelected
                            ? 'bg-red-500 text-white'
                            : isSelected
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                        }`}>
                        {showResult && isCorrect ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : showResult && isSelected ? (
                          <X className="w-5 h-5" />
                        ) : (
                          letters[idx]
                        )}
                      </div>

                      <span className={`flex-1 pt-1.5 font-medium
                                      ${showResult && isCorrect
                          ? 'text-emerald-900 dark:text-emerald-100'
                          : 'text-gray-700 dark:text-gray-300'
                        }`}>
                        {opt.option}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Reset/Retry Button */}
            {showExplanation && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => {
                    setSelectedAnswer(null);
                    setShowExplanation(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 
                           dark:bg-white/10 text-gray-600 dark:text-gray-400 
                           hover:bg-gray-200 dark:hover:bg-white/20 transition-colors text-sm font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Coding Renderer
    // ─────────────────────────────────────────────────────────────────────────
    const renderCoding = (item) => {
      const getCode = (field) => {
        if (!field) return '// No solution provided';
        if (typeof field === 'string') return field;
        return field.code || '// No solution provided';
      };

      const code = getCode(item['compiler-code']);
      const lines = code.split('\n');

      return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
          {/* Problem Card */}
          <div className="bg-white dark:bg-[#0f1523] rounded-2xl p-6 md:p-8 
                        border border-gray-200 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 
                            rounded-xl shadow-lg shadow-blue-500/20">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Problem Description
                </h3>
                <p className="text-xs text-gray-500">Read carefully before coding</p>
              </div>
            </div>

            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {item['question-description']}
              </p>
            </div>

            {item.images?.[0] && (
              <div className="mt-6 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
                <img src={item.images[0].url} alt="Problem figure" className="w-full h-auto" />
              </div>
            )}
          </div>

          {/* Code Editor */}
          <div className="rounded-2xl overflow-hidden shadow-2xl bg-[#1e1e1e] 
                        border border-gray-800 ring-1 ring-white/5">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-3 
                          bg-[#252526] border-b border-[#3e3e42]">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-[#1e1e1e] 
                              rounded-t text-xs text-gray-300">
                  <span className="text-yellow-400">⚡</span>
                  solution.cpp
                </div>
              </div>
              <CopyButton text={code} />
            </div>

            {/* Code Content */}
            <div className="flex overflow-x-auto p-4 max-h-[500px] overflow-y-auto custom-scrollbar-dark">
              {/* Line Numbers */}
              <div className="flex flex-col text-right pr-4 border-r border-white/10 
                            select-none text-gray-600 font-mono text-sm leading-6">
                {lines.map((_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
              {/* Code */}
              <pre className="flex-1 pl-4 font-mono text-sm leading-6 text-gray-300">
                <code>{code}</code>
              </pre>
            </div>
          </div>

          {/* Test Cases */}
          {(item['sample-input-output'] || item['hidden-test-cases']) && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Test Cases
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ...(item['sample-input-output'] || []).map(tc => ({ ...tc, variant: 'sample' })),
                  ...(item['hidden-test-cases'] || []).map(tc => ({ ...tc, variant: 'hidden' }))
                ].map((tc, i) => (
                  <div key={i} className="bg-white dark:bg-[#0f1523] rounded-xl 
                                        border border-gray-200 dark:border-white/5 
                                        overflow-hidden shadow-sm">
                    <div className="px-4 py-2 bg-gray-50/50 dark:bg-white/5 
                                  border-b border-gray-100 dark:border-white/5 
                                  flex justify-between items-center">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded
                                      ${tc.variant === 'sample'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                          : 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                        }`}>
                        {tc.variant} #{i + 1}
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Input</div>
                        <div className="p-2 bg-gray-50 dark:bg-black/20 rounded 
                                      border border-gray-200 dark:border-white/5">
                          {tc.input}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Output</div>
                        <div className="p-2 bg-gray-50 dark:bg-black/20 rounded 
                                      border border-gray-200 dark:border-white/5">
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

    // ─────────────────────────────────────────────────────────────────────────
    // PDF Renderer
    // ─────────────────────────────────────────────────────────────────────────
    const renderPDF = () => {
      return (
        <>
          {/* Fullscreen Modal */}
          {pdfExpanded && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl 
                      flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="w-full h-full bg-white dark:bg-[#0f1523] rounded-2xl 
                        shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b 
                          border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-amber-100 dark:bg-amber-500/20 
                              text-amber-600 dark:text-amber-400 rounded-lg">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {content.title}
                      </h3>
                      <div className="flex gap-2 mt-1">
                        {content.pdfs.map((pdf, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActivePdfIndex(idx)}
                            className={`px-2 py-0.5 rounded text-xs font-medium transition-all
                                  ${activePdfIndex === idx
                                ? 'bg-amber-500 text-white'
                                : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                              }`}
                          >
                            {pdf.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setPdfExpanded(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 
                         rounded-full transition-colors"
                  >
                    <Minimize2 className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex-1 bg-gray-100 dark:bg-black/20 p-2">
                  <iframe
                    src={content.pdfs[activePdfIndex].url}
                    className="w-full h-full rounded-xl bg-white"
                    title="PDF Viewer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Inline View - FIXED HEIGHT */}
          <div className="animate-in fade-in-50 duration-500">
            {/* Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-wrap">
                {content.pdfs.map((pdf, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePdfIndex(idx)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all
                          ${activePdfIndex === idx
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                  >
                    {pdf.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPdfExpanded(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white 
                     dark:bg-white/5 text-gray-600 dark:text-gray-400 
                     hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-xs font-medium"
              >
                <Maximize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
            </div>

            {/* PDF Container - FIXED VIEWPORT HEIGHT */}
            <div
              className="bg-white dark:bg-[#0f1523] rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden"
              style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}
            >
              <iframe
                src={content.pdfs[activePdfIndex].url}
                className="w-full h-full border-0"
                title="PDF Viewer"
                style={{ height: '100%', width: '100%' }}
              />
            </div>
          </div>
        </>
      );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Video Renderer
    // ─────────────────────────────────────────────────────────────────────────
    const renderVideo = () => (
      <div className="flex flex-col items-center justify-center p-16 bg-white 
                    dark:bg-[#0f1523] rounded-3xl border border-gray-200 
                    dark:border-white/5 shadow-sm animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-purple-100 
                      dark:from-rose-500/20 dark:to-purple-500/20 rounded-full 
                      flex items-center justify-center mb-8 shadow-inner">
          <PlayCircle className="w-12 h-12 text-rose-500" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Video Lecture
        </h3>
        <p className="text-gray-500 mb-8 max-w-md text-center">
          Watch the lecture video to understand the core concepts.
        </p>
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-3.5 rounded-full bg-gradient-to-r from-rose-500 to-purple-600 
                   text-white font-bold shadow-lg shadow-rose-500/30 
                   hover:shadow-xl hover:shadow-rose-500/40 hover:scale-105 
                   transition-all flex items-center gap-2"
        >
          <PlayCircle className="w-5 h-5" />
          Watch Now
          <ExternalLink className="w-4 h-4 opacity-60" />
        </a>
      </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Pagination
    // ─────────────────────────────────────────────────────────────────────────
    const renderPagination = () => {
      if (!isGroup || content.items.length <= 1) return null;

      return (
        <div className="w-64 shrink-0 hidden xl:block">
          <div className="sticky top-6 space-y-4">
            <div className="p-5 bg-white dark:bg-[#0f1523] border border-gray-200 
                          dark:border-white/5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                  Questions
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {currentIndex + 1} / {content.items.length}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-4">
                {content.items.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`aspect-square rounded-lg text-xs font-bold transition-all 
                              flex items-center justify-center
                              ${currentIndex === i
                        ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#0f1523]'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentIndex(c => Math.max(0, c - 1))}
                  disabled={currentIndex === 0}
                  className="flex-1 p-2.5 flex items-center justify-center rounded-xl 
                           bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 
                           hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 
                           disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentIndex(c => Math.min(content.items.length - 1, c + 1))}
                  disabled={currentIndex === content.items.length - 1}
                  className="flex-1 p-2.5 flex items-center justify-center rounded-xl 
                           bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 
                           hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 
                           disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mark Complete Button */}

          </div>
        </div>
      );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Main Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
      <div ref={contentRef} className="h-full overflow-y-auto custom-scrollbar p-6 md:p-10">
        <div className={`mx-auto h-full ${isGroup ? 'max-w-[1400px] flex gap-8' : 'max-w-4xl'}`}>
          <div className="flex-1 min-w-0">
            {/* Header Bar */}
            <div className="sticky top-0 z-20 -mx-6 -mt-6 px-6 py-4 mb-8
                          bg-slate-50/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl 
                          border-b border-gray-200 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <ContentTypeBadge type={type} />
                  <Breadcrumb items={[content.parentTitle, content.title]} />
                </div>

                {isGroup && (
                  <div className="flex items-center gap-2 xl:hidden">
                    <button
                      onClick={() => setCurrentIndex(c => Math.max(0, c - 1))}
                      disabled={currentIndex === 0}
                      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 
                               disabled:opacity-30 transition"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-mono text-gray-500">
                      {currentIndex + 1}/{content.items.length}
                    </span>
                    <button
                      onClick={() => setCurrentIndex(c => Math.min(content.items.length - 1, c + 1))}
                      disabled={currentIndex === content.items.length - 1}
                      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 
                               disabled:opacity-30 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            {(type === 'mcq-group' || type === 'mcq') && renderMCQ(currentItem)}
            {(type === 'coding-group' || type === 'coding') && renderCoding(currentItem)}
            {type === 'pdf' && renderPDF()}
            {type === 'video' && renderVideo()}
          </div>

          {renderPagination()}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-[#0B0F19] 
                  animate-in fade-in slide-in-from-bottom-3 duration-300 overflow-hidden">

      {/* ─────────────────────────────────────────────────────────────────────────
          HEADER
          ───────────────────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between p-4 px-6 border-b 
                       border-gray-200 dark:border-white/5 bg-white dark:bg-[#0B0F19] shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 
                     rounded-xl transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-900 
                                dark:group-hover:text-white transition-colors" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
              {course.course_name || 'Course Details'}
            </h2>
            <div className="flex items-center gap-3 mt-0.5">
              {course.course_code && (
                <span className="text-xs text-gray-500 font-mono">{course.course_code}</span>
              )}
              {/* {stats.total > 0 && (
                <div className="flex items-center gap-2">
                  <ProgressRing progress={progressPercent} size={18} strokeWidth={2} />
                  <span className="text-xs text-gray-500">{progressPercent}% complete</span>
                </div>
              )} */}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={() => fetchCourseContent(true)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 
                     transition-colors text-gray-500"
            title="Refresh content"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Focus Mode Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all
                      ${!isSidebarOpen
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            <span className="hidden md:inline">{isSidebarOpen ? 'Focus Mode' : 'Show Sidebar'}</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────
          MAIN SPLIT VIEW
          ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <aside className={`bg-white dark:bg-[#0f1523] border-r border-gray-200 
                        dark:border-white/5 flex flex-col overflow-hidden shrink-0 
                        transition-all duration-300 ease-out
                        ${isSidebarOpen
            ? 'w-[320px] lg:w-[360px] opacity-100'
            : 'w-0 opacity-0 border-r-0'
          }`}>

          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-100 dark:border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Course Content
              </h3>
              {/* <span className="text-xs text-gray-400">
                {stats.completed}/{stats.total} done
              </span> */}
            </div>

            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
            />
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {loading ? (
              <SkeletonLoader />
            ) : error ? (
              <div className="p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-sm text-red-500 mb-4">{error}</p>
                <button
                  onClick={() => fetchCourseContent(true)}
                  className="px-4 py-2 bg-red-100 dark:bg-red-500/20 text-red-600 
                           dark:text-red-400 rounded-lg text-sm font-medium 
                           hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredContent ? (
              // Search Results
              <div className="space-y-2">
                <div className="px-2 py-1 text-xs text-gray-500">
                  {filteredContent.length} result{filteredContent.length !== 1 ? 's' : ''} found
                </div>
                {filteredContent.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="px-2 text-[10px] text-gray-400 truncate">
                      {item.unitTitle} / {item.parentTitle}
                    </div>
                    {renderSidebarItem(item, idx)}
                  </div>
                ))}
                {filteredContent.length === 0 && (
                  <div className="py-8 text-center text-gray-400 text-sm">
                    No matching content found
                  </div>
                )}
              </div>
            ) : (
              // Normal Tree View
              <div className="space-y-2">
                {structure?.units?.map((unit, uIdx) => (
                  <div key={uIdx} className="overflow-hidden">
                    <button
                      onClick={() => toggleUnit(uIdx)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl 
                                transition-all text-left group
                                ${expandedUnits[uIdx]
                          ? 'bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30'
                          : 'hover:bg-gray-50 dark:hover:bg-white/5 border-2 border-transparent'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br 
                                      from-cyan-500 to-blue-600 text-white 
                                      flex items-center justify-center text-xs font-bold shadow-sm">
                          {uIdx + 1}
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
                          {unit.unit_title || unit.title || `Unit ${uIdx + 1}`}
                        </span>
                      </div>
                      {expandedUnits[uIdx]
                        ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 opacity-0 group-hover:opacity-100" />
                      }
                    </button>

                    {/* Sub-units */}
                    {expandedUnits[uIdx] && (
                      <div className="ml-4 pl-4 border-l-2 border-gray-200 dark:border-white/10 
                                    space-y-1 mt-2 animate-in slide-in-from-top-2 duration-200">
                        {(unit.sub_units || unit.subunits || []).map((sub, sIdx) => {
                          const subKey = `${uIdx}-${sIdx}`;
                          const items = getContentItems(sub);

                          return (
                            <div key={sIdx}>
                              <button
                                onClick={() => toggleLecture(subKey)}
                                className={`w-full text-left py-2.5 px-3 rounded-lg flex items-center 
                                          gap-2.5 transition-all
                                          ${expandedLectures[subKey]
                                    ? 'bg-blue-100 dark:bg-blue-500/20 border-l-2 border-blue-500'
                                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                  }`}
                              >
                                {expandedLectures[subKey]
                                  ? <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                                  : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                }
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 
                                              flex-1 truncate">
                                  {sub.title || 'Subunit'}
                                </span>
                                <span className="text-[10px] text-gray-400 bg-gray-100 
                                              dark:bg-white/10 px-1.5 py-0.5 rounded-full">
                                  {items.length}
                                </span>
                              </button>

                              {/* Content Items */}
                              {expandedLectures[subKey] && (
                                <div className="ml-6 space-y-1 py-2 animate-in slide-in-from-top-1 duration-150">
                                  {items.length > 0 ? (
                                    items.map((item, iIdx) => renderSidebarItem(item, iIdx))
                                  ) : (
                                    <div className="py-2 text-[10px] text-gray-400 italic pl-2">
                                      No content available
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-slate-50 dark:bg-[#0B0F19] relative overflow-hidden">
          <div className="absolute inset-0">
            <MainContentArea content={selectedContent} />
          </div>
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          GLOBAL STYLES
          ───────────────────────────────────────────────────────────────────────── */}
      {/* <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .custom-scrollbar-dark::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar-dark::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style> */}
    </div>
  );
}