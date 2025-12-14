export const API_CONFIG = {
    // Base URLs (Proxy Paths)
    baseUrl: {
        admin: '/api/proxy/admin',
        student: '/api/proxy/student',
        teacher: '/api/proxy/teacher',
    },

    // Admin Endpoints
    admin: {
        login: '/api/university/auth/login',
        logout: '/api/university/auth/logout',
        me: '/api/university/auth/me',
        myBatches: '/api/university/admin/my-batches',
        myTeachers: '/api/university/admin/my-teachers',
        courseStructure: (courseId) => `/api/university/admin/course-structure/${courseId}`,
        sectionAnalytics: (sectionName) => `/api/university/admin/section-analytics/${sectionName}`,
        subUnitDetails: '/api/university/admin/analytics/sub-unit-details',
    },

    // Master Data
    masters: {
        sections: '/api/masters/sections',
        batches: '/api/masters/batches',
    },

    // Course & Structure
    courses: (batchId) => `/api/courses/${batchId}`,
    structure: (courseId) => `/api/structure/${courseId}`,

    // Student Data
    student: {
        lookup: '/api/lookup',
        history: '/api/student/history',
        attemptDetails: '/api/student/attempt-details',
    },

    // Analytics & Export
    analytics: {
        summary: '/api/analytics/summary',
        export: '/api/export/excel',
    }
};
