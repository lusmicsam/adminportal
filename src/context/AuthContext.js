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
    const checkSession = async () => {
        try {
            // Don't show loading on every check if we already have a user, 
            // but initial load needs it.
            if (!user) setLoading(true);

            // Use verify endpoint from centralized config
            const url = `${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.me}`;
            const res = await apiCall(url, { method: "GET" });

            if (res.ok) {
                const data = await res.json();
                setUser(data.user || data); // Store user data
            } else {
                setUser(null);
                // If we are on a protected route, redirect to login
                if (pathname.startsWith("/admin/dashboard")) {
                    router.push("/admin/login");
                }
            }
        } catch (error) {
            console.error("Session check failed:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSession();
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
            await apiCall(url, { method: "POST" });
            setUser(null);
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
