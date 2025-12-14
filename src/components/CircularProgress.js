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
            <svg className="transform -rotate-90 w-full h-full">
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
                    className={`${strokeColor} transition-all duration-1000 ease-out`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <span className="absolute text-[10px] font-bold text-gray-900 dark:text-white">{Math.round(percentage)}%</span>
        </div>
    );
};
