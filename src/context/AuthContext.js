"use client";

import { createContext, useState, useEffect, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { API_CONFIG } from "../utils/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Helper for API calls to ensure consistent config
    const apiCall = async (url, options = {}) => {
        const defaultHeaders = {
            "Content-Type": "application/json",
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
            credentials: "include", // CRITICAL: Required for HttpOnly Cookies
        };

        return fetch(url, config);
    };

    // 1. Check Session (On Mount & Route Change)
    const checkSession = async (isBackground = false) => {
        try {
            // Don't show loading if it's a background check or we already have a user
            if (!user && !isBackground) setLoading(true);

            // Use verify endpoint from centralized config
            const url = `${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.me}`;

            // For cross-origin requests (Vercel backend), we might need different credentials settings
            // But relying on existing 'include' for cookies as per instructions.
            const res = await apiCall(url, { method: "GET" });

            if (res.ok) {
                const data = await res.json();
                // API returns: { email, name, universityId, isAuthenticated: true }
                if (data.isAuthenticated) {
                    setUser(data);
                } else {
                    // API might return success=true but isAuthenticated=false in some designs, 
                    // or just 401. If we get here and isAuthenticated is explicitly false:
                    handleLogout();
                }
            } else {
                // 401 or other error indicates invalid session
                handleLogout();
            }
        } catch (error) {
            console.error("Session check failed:", error);
            if (!isBackground) setUser(null); // Only clear on explicit check, retries handled by interval
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        // Only redirect if we are strictly in a protected route
        if (pathname.includes("/admin/dashboard")) {
            router.push("/admin/login");
        }
    };

    useEffect(() => {
        checkSession();

        // Background Session Check (every 60 seconds)
        const intervalId = setInterval(() => {
            checkSession(true);
        }, 60000);

        return () => clearInterval(intervalId);
    }, []); // Run once on mount

    // 2. Login Function
    const login = async (email, password) => {
        try {
            setLoading(true);
            const url = `${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.login}`;
            const res = await apiCall(url, {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            // Check if login was actually successful based on API response
            // Assuming simplified response as per user request or standard JWT set-cookie flow
            if (res.ok) {
                // Successful login
                await checkSession(); // Refresh user state immediately
                return { success: true };
            } else {
                return { success: false, error: data.message || "Invalid Credentials" };
            }
        } catch (error) {
            return { success: false, error: "Network error. Please try again." };
        } finally {
            setLoading(false);
        }
    };

    // 3. Logout Function
    const logout = async () => {
        try {
            setLoading(true);
            const url = `${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.logout}`;
            await apiCall(url, { method: "POST" }); // Assuming this clears the cookie
            handleLogout();
            router.push("/admin/login");
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkSession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
