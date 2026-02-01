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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden ring-1 ring-white/20">

                {/* Decorative gradients */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center mb-4 border border-cyan-100 dark:border-cyan-500/20">
                        <Lock className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Change Password</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Please enter your current password and a new secure password.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    {/* Old Password */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Current Password</label>
                        <div className="relative group">
                            <input
                                type={showPassword.old ? "text" : "password"}
                                value={formData.old_password}
                                onChange={(e) => setFormData({ ...formData, old_password: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all placeholder-gray-400 font-medium"
                                placeholder="Enter current password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => togglePassword('old')}
                                className="absolute right-3 top-3.5 text-gray-400 hover:text-cyan-500 transition-colors"
                            >
                                {showPassword.old ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">New Password</label>
                        <div className="relative group">
                            <input
                                type={showPassword.new ? "text" : "password"}
                                value={formData.new_password}
                                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all placeholder-gray-400 font-medium"
                                placeholder="Enter new password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => togglePassword('new')}
                                className="absolute right-3 top-3.5 text-gray-400 hover:text-cyan-500 transition-colors"
                            >
                                {showPassword.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Confirm Password</label>
                        <input
                            type="password"
                            value={formData.confirm_password}
                            onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all placeholder-gray-400 font-medium"
                            placeholder="Confirm new password"
                            required
                        />
                    </div>

                    {/* Status Message */}
                    {status.message && (
                        <div className={`p-4 rounded-xl text-sm text-center animate-in slide-in-from-top-2 font-medium flex items-center justify-center gap-2 ${status.type === 'error'
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            }`}>
                            {status.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2"
                    >
                        {loading ? 'Updating Password...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
