/**
 * Utility functions for cookie and token management
 */

/**
 * Get a specific cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 */
export function getCookie(name) {
    if (typeof document === 'undefined') return null;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }

    return null;
}

/**
 * Store the admin authentication token
 * @param {string} token - JWT token to store
 */
export function setAdminToken(token) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('admin_token', token);
}

/**
 * Get the admin authentication token
 * Checks localStorage first, then falls back to cookies
 * @returns {string|null} Admin token or null
 */
export function getAdminToken() {
    if (typeof window === 'undefined') return null;

    // Priority 1: Check localStorage (new method)
    const tokenFromStorage = localStorage.getItem('admin_token');
    if (tokenFromStorage) {
        // console.log('Token retrieved from localStorage:', tokenFromStorage); // DEBUG
        return tokenFromStorage;
    }

    // Priority 2: Fall back to cookie (old method)
    const cookieToken = getCookie('admin_token');
    // if (cookieToken) console.log('Token retrieved from cookies:', cookieToken); // DEBUG
    return cookieToken;
}

/**
 * Clear the admin authentication token
 */
export function clearAdminToken() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('admin_token');
}
