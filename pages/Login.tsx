import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { isSupabaseConfigured } from '../services/supabase';
import { Lock, Mail, Loader2, ArrowRight, UserPlus, Info, Database } from 'lucide-react';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // For signup
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    
    const isDemo = !isSupabaseConfigured();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            if (isLogin) {
                await authService.login(email, password);
                navigate('/');
            } else {
                await authService.signUp(email, password, name);
                setSuccessMsg("Account created! You can now log in.");
                setIsLogin(true);
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const fillDemo = (demoEmail: string, demoName: string) => {
        setEmail(demoEmail);
        setPassword('123456');
        setName(demoName);
        setError('');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-orange-500 to-red-600 w-full" />
                
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center mx-auto mb-4">
                            <Lock className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome to Lexia</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            {isLogin ? 'Sign in to your CRM workspace' : 'Create your account'}
                        </p>
                        {isDemo && (
                            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                <Database className="w-3 h-3 mr-1" /> Demo Mode (Offline)
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                                <div className="relative">
                                    <UserPlus className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-10 h-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none dark:bg-slate-950 dark:border-slate-700 dark:text-white transition-all"
                                        placeholder="e.g. Mathis"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 h-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none dark:bg-slate-950 dark:border-slate-700 dark:text-white transition-all"
                                    placeholder="name@sapro.fr"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                <input 
                                    type="password" 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 h-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none dark:bg-slate-950 dark:border-slate-700 dark:text-white transition-all"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2 animate-in fade-in">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 flex items-center gap-2 animate-in fade-in">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                {successMsg}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                isLogin ? <>Sign In <ArrowRight className="h-4 w-4" /></> : <>Create Account <UserPlus className="h-4 w-4" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                         <button 
                            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }}
                            className="text-sm text-slate-500 hover:text-orange-600 transition-colors"
                         >
                             {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                         </button>
                    </div>

                    {/* Demo Hints */}
                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-left">
                        <div className="flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-300">
                            <Info className="h-4 w-4 text-orange-500" />
                            <span className="text-xs font-bold uppercase tracking-wider">Demo Access</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">
                            Click below to auto-fill. You must <strong>Sign Up</strong> first if the account doesn't exist.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => fillDemo('mathis@sapro.fr', 'Mathis')}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600 hover:border-orange-300 hover:text-orange-600 transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400"
                            >
                                Mathis (Sales)
                            </button>
                            <button 
                                onClick={() => fillDemo('martial@sapro.fr', 'Martial')}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600 hover:border-orange-300 hover:text-orange-600 transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400"
                            >
                                Martial (Director)
                            </button>
                            <button 
                                onClick={() => fillDemo('hugo@sapro.fr', 'Hugo')}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600 hover:border-orange-300 hover:text-orange-600 transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400"
                            >
                                Hugo (CSM)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};