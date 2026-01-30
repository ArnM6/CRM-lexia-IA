import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PIPELINE_COLUMNS } from '../constants';
import { companyService } from '../services/supabase';
import { Company, PipelineStage } from '../types';
import { PriorityBadge, TypeBadge, UrgencyBadge } from '../components/ui/Badge';
import { MoreHorizontal, Plus, ArrowRightLeft, Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export const Kanban: React.FC = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const refreshData = () => {
        companyService.getAll().then(setCompanies);
    };

    useEffect(() => {
        refreshData();
        // Listen for data updates
        window.addEventListener('companies-updated', refreshData);
        return () => window.removeEventListener('companies-updated', refreshData);
    }, []);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggingId(id);
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, stageId: PipelineStage) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (id) {
            updateCompanyStage(id, stageId);
        }
        setDraggingId(null);
    };

    const updateCompanyStage = async (id: string, stageId: PipelineStage) => {
        // Optimistic update
        setCompanies(prev => prev.map(c => 
            c.id === id ? { ...c, pipelineStage: stageId } : c
        ));
        await companyService.updateStage(id, stageId);
        setOpenMenuId(null);
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
             <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Pipeline</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Drag and drop companies to move them through the onboarding process.</p>
            </div>

            <div className="flex-1 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory px-1 scrollbar-hide">
                {PIPELINE_COLUMNS.map((col) => {
                    const colItems = companies.filter(c => c.pipelineStage === col.id);
                    return (
                        <div 
                            key={col.id} 
                            className="w-[85vw] sm:w-80 flex-shrink-0 flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60 dark:bg-slate-900/50 dark:border-slate-800 snap-center"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <div className="p-3 flex items-center justify-between border-b border-slate-200/50">
                                <h3 className="font-semibold text-slate-700 text-sm dark:text-slate-200">{col.title}</h3>
                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold dark:bg-slate-800 dark:text-slate-400">
                                    {colItems.length}
                                </span>
                            </div>
                            
                            <div className="flex-1 p-2 space-y-3 overflow-y-auto min-h-[100px]">
                                {colItems.map((company) => (
                                    <div
                                        key={company.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, company.id)}
                                        className={cn(
                                            "group bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all dark:bg-slate-900 dark:border-slate-800 relative",
                                            draggingId === company.id ? "opacity-50" : "opacity-100"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs text-slate-400 font-mono">#{company.id}</span>
                                            
                                            {/* Mobile Actions Menu */}
                                            <div className="relative">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === company.id ? null : company.id); }}
                                                    className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded dark:hover:bg-slate-800"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </button>
                                                
                                                {openMenuId === company.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100 dark:border-slate-700">
                                                                Move to stage...
                                                            </div>
                                                            {PIPELINE_COLUMNS.map(column => (
                                                                <button
                                                                    key={column.id}
                                                                    disabled={column.id === company.pipelineStage}
                                                                    onClick={() => updateCompanyStage(company.id, column.id)}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed",
                                                                        column.id === company.pipelineStage ? "text-slate-400" : "text-slate-700 dark:text-slate-200"
                                                                    )}
                                                                >
                                                                    {column.title}
                                                                    {column.id === company.pipelineStage && <Check className="h-3 w-3" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <Link to={`/company/${company.id}`} className="block">
                                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 hover:text-orange-600 transition-colors">{company.name}</h4>
                                        </Link>
                                        
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <UrgencyBadge lastContactDate={company.lastContactDate} />
                                            <TypeBadge type={company.type} />
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between dark:border-slate-800">
                                            <div className="text-xs text-slate-500">
                                               {company.contacts.length > 0 ? (
                                                  <span className="flex items-center gap-1">
                                                     <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                                                        {company.contacts[0].name[0]}
                                                     </div>
                                                     <span className="truncate max-w-[80px]">{company.contacts[0].name}</span>
                                                  </span>
                                               ) : 'No contact'}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                {new Date(company.lastContactDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};