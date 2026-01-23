import React, { useState } from 'react';
import { Lock, X, Eye, EyeOff } from 'lucide-react';
import { API_CONFIG } from '@/utils/api';
import { getAdminToken } from '@/utils/cookies';

export default function ChangePasswordModal({ isOpen, onClose }) {
    const [formData, setFormData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [showPassword, setShowPassword] = useState({
        old: false,
        new: false
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.new_password !== formData.confirm_password) {
            setStatus({ type: 'error', message: "New passwords don't match" });
            return;
        }

        if (formData.new_password.length < 6) {
            setStatus({ type: 'error', message: "Password must be at least 6 characters" });
            return;
        }

        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            const token = getAdminToken();
            const response = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.updatePassword}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    old_password: formData.old_password,
                    new_password: formData.new_password
                })
            });

            const data = await response.json();

            if (response.ok) {
                setStatus({ type: 'success', message: 'Password updated successfully' });
                setFormData({ old_password: '', new_password: '', confirm_password: '' });
                setTimeout(() => {
                    onClose();
                    setStatus({ type: '', message: '' });
                }, 2000);
            } else {
                setStatus({ type: 'error', message: data.message || 'Failed to update password' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Connection failed' });
        } finally {
            setLoading(false);
        }
    };

    const togglePassword = (field) => {
        setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-cyan-500" />
                    Change Password
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Old Password */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Current Password</label>
                        <div className="relative group">
                            <input
                                type={showPassword.old ? "text" : "password"}
                                value={formData.old_password}
                                onChange={(e) => setFormData({ ...formData, old_password: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-cyan-500/50 outline-none transition-all placeholder-gray-400"
                                placeholder="Enter current password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => togglePassword('old')}
                                className="absolute right-3 top-3 text-gray-400 hover:text-cyan-500 transition-colors"
                            >
                                {showPassword.old ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">New Password</label>
                        <div className="relative group">
                            <input
                                type={showPassword.new ? "text" : "password"}
                                value={formData.new_password}
                                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-cyan-500/50 outline-none transition-all placeholder-gray-400"
                                placeholder="Enter new password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => togglePassword('new')}
                                className="absolute right-3 top-3 text-gray-400 hover:text-cyan-500 transition-colors"
                            >
                                {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Confirm Password</label>
                        <input
                            type="password"
                            value={formData.confirm_password}
                            onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-cyan-500/50 outline-none transition-all placeholder-gray-400"
                            placeholder="Confirm new password"
                            required
                        />
                    </div>

                    {/* Status Message */}
                    {status.message && (
                        <div className={`p-3 rounded-lg text-sm text-center animate-in slide-in-from-top-1 ${status.type === 'error'
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            }`}>
                            {status.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
