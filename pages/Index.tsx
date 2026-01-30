import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, Building2, TrendingUp, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { companyService } from '../services/supabase';
import { authService } from '../services/auth';
import { Company, User } from '../types';
import { UrgencyBadge } from '../components/ui/Badge';
import { formatDate } from '../lib/utils';
import { CatchUpModal, CatchUpWidget } from '../components/CatchUpModal';

const StatCard: React.FC<{ title: string; value: string; icon: any; trend?: string }> = ({ title, value, icon: Icon, trend }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
            <div className="p-2 bg-orange-50 rounded-lg dark:bg-slate-800">
                <Icon className="h-5 w-5 text-orange-600" />
            </div>
        </div>
        <div className="mt-4">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
            {trend && <p className="text-xs text-green-600 mt-1 font-medium">{trend}</p>}
        </div>
    </div>
);

export const Dashboard: React.FC = () => {
    const [companies, setCompanies] = React.useState<Company[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [showCatchUpModal, setShowCatchUpModal] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    const refreshData = () => {
        companyService.getAll().then((data) => {
            setCompanies(data);
            setLoading(false);
        });
    };

    React.useEffect(() => {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        
        refreshData();

        // Listen for data updates
        window.addEventListener('companies-updated', refreshData);

        // Trigger modal only if user is strictly marked as away
        if (currentUser?.isAway) {
            setShowCatchUpModal(true);
        }

        return () => window.removeEventListener('companies-updated', refreshData);
    }, []);

    const pipelineData = [
        { name: 'Entry', value: companies.filter(c => c.pipelineStage === 'entry_point').length },
        { name: 'Exchange', value: companies.filter(c => c.pipelineStage === 'exchange').length },
        { name: 'Proposal', value: companies.filter(c => c.pipelineStage === 'proposal').length },
        { name: 'Validation', value: companies.filter(c => c.pipelineStage === 'validation').length },
        { name: 'Success', value: companies.filter(c => c.pipelineStage === 'client_success').length },
    ];

    const COLORS = ['#94a3b8', '#60a5fa', '#818cf8', '#f97316', '#22c55e'];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Dashboard</h1>
                    <p className="text-slate-500 dark:text-slate-400">Welcome back, here's your onboarding overview.</p>
                </div>
                <button 
                    onClick={() => setShowCatchUpModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-md shadow hover:opacity-90 transition-opacity"
                >
                    <Sparkles className="h-4 w-4 text-yellow-300" /> Full Briefing
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title="Total Companies" 
                    value={companies.length.toString()} 
                    icon={Building2} 
                />
                <StatCard 
                    title="Active Onboardings" 
                    value={companies.filter(c => c.pipelineStage !== 'client_success' && c.pipelineStage !== 'entry_point').length.toString()} 
                    icon={Clock} 
                />
                <StatCard 
                    title="Client Success" 
                    value={companies.filter(c => c.pipelineStage === 'client_success').length.toString()} 
                    icon={CheckCircle2} 
                />
                <StatCard 
                    title="Total Contacts" 
                    value={companies.reduce((acc, curr) => acc + curr.contacts.length, 0).toString()} 
                    icon={Users} 
                />
            </div>

            <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
                {/* Embedded Catch Up Widget */}
                <div className="xl:col-span-1">
                     <CatchUpWidget embedded />
                </div>

                <div className="xl:col-span-2 grid gap-6">
                    {/* Recent Priority Actions */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-50">Urgent Follow-ups</h3>
                        <div className="space-y-4">
                            {loading ? <p>Loading...</p> : companies
                                .sort((a,b) => new Date(a.lastContactDate).getTime() - new Date(b.lastContactDate).getTime()) // Oldest first
                                .slice(0, 5)
                                .map(company => (
                                    <div key={company.id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                                                {company.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{company.name}</p>
                                                <p className="text-xs text-slate-500">Last: {formatDate(company.lastContactDate)}</p>
                                            </div>
                                        </div>
                                        <UrgencyBadge lastContactDate={company.lastContactDate} />
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-50">Pipeline Distribution</h3>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pipelineData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {pipelineData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {showCatchUpModal && (
                <CatchUpModal onClose={() => setShowCatchUpModal(false)} />
            )}
        </div>
    );
};