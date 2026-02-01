import React from 'react';

export const CircularProgress = ({ percentage = 0, size = 40, strokeWidth = 4, color = 'cyan' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    const colors = {
        cyan: 'text-cyan-500',
        emerald: 'text-emerald-500',
        purple: 'text-purple-500',
        blue: 'text-blue-500',
        orange: 'text-orange-500'
    };

    const strokeColor = colors[color] || colors.cyan;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Definitions for Gradients */}
            <svg className="absolute w-0 h-0">
                <defs>
                    <linearGradient id={`${color}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" className={`${colors[color]?.replace('text-', 'stop-') || 'stop-cyan-500'}`} stopOpacity="1" />
                        <stop offset="100%" className={`${(colors[color]?.replace('text-', 'stop-') || 'stop-cyan-500').replace('500', '400')}`} stopOpacity="0.8" />
                    </linearGradient>
                </defs>
            </svg>

            <svg className="transform -rotate-90 w-full h-full">
                {/* Background Circle */}
                <circle
                    className="text-gray-100 dark:text-white/5"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Progress Circle with Gradient Stroke */}
                <circle
                    className={`${colors[color]} transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke={colors[color]?.startsWith('#') ? colors[color] : "currentColor"}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    style={{ filter: `drop-shadow(0 0 2px ${colors[color]?.replace('text-', 'var(--color-')})` }}
                />
            </svg>
            <span className={`absolute font-bold text-gray-900 dark:text-white ${size < 40 ? 'text-[9px]' : 'text-xs'}`}>
                {Math.round(percentage)}%
            </span>
        </div>
    );
};
