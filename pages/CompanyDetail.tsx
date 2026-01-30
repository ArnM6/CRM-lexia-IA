
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
// Added Loader2 to the lucide-react imports
import { ArrowLeft, Globe, Mail, Phone, Calendar, CheckSquare, MoreVertical, Plus, Edit2, X, Save, MessageSquare, Briefcase, User, ArrowUpRight, ArrowDownLeft, Clock, Upload, Linkedin, Camera, Trash2, Users, Circle, CheckCircle2, FileText, FileSpreadsheet, File, ExternalLink, Link as LinkIcon, RefreshCw, CalendarDays, Building, ChevronDown, Check, History, LayoutPanelLeft, ListTodo, Eye, Send, Inbox as InboxIcon, ChevronRight, Loader2 } from 'lucide-react';
import { companyService } from '../services/supabase';
import { gmailService, GmailMessage } from '../services/gmail';
import { Company, Contact, CompanyType, Priority, PipelineStage, TeamMember, Activity, CompanyDocument, Gender } from '../types';
import { PriorityBadge, TypeBadge } from '../components/ui/Badge';
import { formatDate, getInitials, cn } from '../lib/utils';
import { clsx } from 'clsx';
import { PIPELINE_COLUMNS } from '../constants';

// --- Custom Select Component ---
interface SelectOption { label: string; value: string; }
interface SelectProps {
    value: string;
    onChange: (val: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
}

const CustomSelect: React.FC<SelectProps> = ({ value, onChange, options, placeholder, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find(o => o.value === value)?.label;

    return (
        <div className={clsx("relative w-full", className)} ref={ref}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition-all hover:bg-slate-50 dark:hover:bg-slate-900"
            >
                <span className={clsx("block truncate", !value && "text-slate-500")}>
                    {selectedLabel || placeholder || "Select..."}
                </span>
                <ChevronDown className={clsx("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white text-slate-950 shadow-md animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
                    <div className="p-1">
                        {options.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => { onChange(option.value); setIsOpen(false); }}
                                className={clsx(
                                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 dark:hover:bg-slate-800",
                                    value === option.value ? "bg-slate-100 dark:bg-slate-800 font-medium" : ""
                                )}
                            >
                                <span className="flex-1 truncate">{option.label}</span>
                                {value === option.value && <Check className="ml-auto h-4 w-4 text-orange-600" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const CompanyDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'journey' | 'emails' | 'documents'>('overview');

    // Gmail Messages State
    const [emails, setEmails] = useState<GmailMessage[]>([]);
    const [emailsLoading, setEmailsLoading] = useState(false);
    const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

    // Modals & Forms State
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    // Internal Team Edit State
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [newTeamMember, setNewTeamMember] = useState<Partial<TeamMember>>({ name: '', role: '', avatarUrl: '' });
    
    // Activity Log State
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [newActivity, setNewActivity] = useState<Partial<Activity>>({ 
        type: 'meeting', 
        title: '', 
        description: '', 
        date: new Date().toISOString().split('T')[0], 
        syncStatus: 'pending',
        stageId: undefined
    });
    const [syncToCalendar, setSyncToCalendar] = useState(true);

    // Documents State
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [newDoc, setNewDoc] = useState<Partial<CompanyDocument>>({ name: '', url: '', type: 'other' });

    // Contact Form State
    const [editingContactId, setEditingContactId] = useState<string | null>(null);
    const [contactForm, setContactForm] = useState<Partial<Contact>>({ name: '', emails: [''], role: '', phone: '', avatarUrl: '', isMainContact: false, gender: 'not_specified' });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const teamFileInputRef = useRef<HTMLInputElement>(null);
    const companyLogoInputRef = useRef<HTMLInputElement>(null);
    
    // Edit Company State
    const [editForm, setEditForm] = useState<Partial<Company>>({});

    // Notes Edit State (Checklist)
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [tempNote, setTempNote] = useState('');

    // General Notes State
    const [isEditingGeneralNote, setIsEditingGeneralNote] = useState(false);
    const [generalNote, setGeneralNote] = useState('');

    const loadCompany = () => {
        if (id) {
            companyService.getById(id).then(data => {
                setCompany(data || null);
                setEditForm(data || {});
                setGeneralNote(data?.generalComment || '');
                setLoading(false);
            });
        }
    };

    const loadEmails = async () => {
        if (!company || company.contacts.length === 0) return;
        setEmailsLoading(true);
        try {
            // Collect all email addresses of all contacts
            const contactEmails = company.contacts.flatMap(c => c.emails).filter(e => !!e);
            if (contactEmails.length === 0) {
                setEmailsLoading(false);
                return;
            }

            // Build Gmail query
            // Example: (from:email1 OR to:email1 OR from:email2 OR to:email2)
            const query = `(${contactEmails.map(e => `from:${e} OR to:${e}`).join(' OR ')})`;
            
            await gmailService.load();
            if (gmailService.isAuthenticated) {
                const msgs = await gmailService.listMessages(20, query);
                setEmails(msgs);
            }
        } catch (error) {
            console.error("Error loading emails for company:", error);
        } finally {
            setEmailsLoading(false);
        }
    };

    useEffect(() => {
        loadCompany();
        window.addEventListener('companies-updated', loadCompany);
        return () => window.removeEventListener('companies-updated', loadCompany);
    }, [id]);

    useEffect(() => {
        if (activeTab === 'emails') {
            loadEmails();
        }
    }, [activeTab, company]);

    useEffect(() => {
        if (location.state && location.state.tab) {
            const tab = location.state.tab;
            if (tab === 'pipeline' || tab === 'timeline') {
                setActiveTab('journey');
            } else {
                setActiveTab(tab);
            }
        }
    }, [location.state]);

    const handleUpdateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;
        setLoading(true);
        const updated = await companyService.update(company.id, editForm);
        setCompany(updated);
        setIsEditModalOpen(false);
        setLoading(false);
    };

    const handleDeleteCompany = async () => {
        if (!company) return;
        if (window.confirm(`Are you sure you want to delete ${company.name}? This cannot be undone.`)) {
            await companyService.delete(company.id);
            navigate('/directory');
        }
    };

    const handleSaveGeneralNote = async () => {
        if (!company) return;
        const updated = await companyService.update(company.id, { generalComment: generalNote });
        setCompany(updated);
        setIsEditingGeneralNote(false);
    };

    const openActivityModalWithStage = (stageId?: PipelineStage) => {
        setNewActivity(prev => ({ 
            ...prev, 
            stageId: stageId,
            title: stageId ? `Update on ${stageId.replace('_', ' ')}` : ''
        }));
        setIsActivityModalOpen(true);
    };

    // Contacts management
    const openAddContact = () => {
        setEditingContactId(null);
        setContactForm({ name: '', emails: [''], role: '', phone: '', avatarUrl: '', isMainContact: false, gender: 'not_specified' });
        setIsContactModalOpen(true);
    };

    const openEditContact = (contact: Contact) => {
        setEditingContactId(contact.id);
        setContactForm({ ...contact, emails: contact.emails && contact.emails.length > 0 ? [...contact.emails] : [''] });
        setIsContactModalOpen(true);
    };

    const handleSaveContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;
        const cleanedEmails = contactForm.emails?.filter(em => em.trim() !== "") || [];
        const finalData = { ...contactForm, emails: cleanedEmails };
        
        if (editingContactId) {
            await companyService.updateContact(company.id, editingContactId, finalData);
        } else {
            await companyService.addContact(company.id, finalData);
        }
        setIsContactModalOpen(false);
        loadCompany(); 
    };

    const handleAddEmailField = () => {
        setContactForm(prev => ({ ...prev, emails: [...(prev.emails || []), ""] }));
    };

    const handleEmailChange = (idx: number, val: string) => {
        const updatedEmails = [...(contactForm.emails || [])];
        updatedEmails[idx] = val;
        setContactForm({ ...contactForm, emails: updatedEmails });
    };

    const handleRemoveEmailField = (idx: number) => {
        const updatedEmails = (contactForm.emails || []).filter((_, i) => i !== idx);
        setContactForm({ ...contactForm, emails: updatedEmails.length ? updatedEmails : [""] });
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'contact' | 'team' | 'company' = 'contact') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (type === 'team') setNewTeamMember(prev => ({ ...prev, avatarUrl: result }));
                else if (type === 'company') setEditForm(prev => ({ ...prev, logoUrl: result }));
                else setContactForm(prev => ({ ...prev, avatarUrl: result }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Team management
    const handleAddTeamMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;
        await companyService.addTeamMember(company.id, newTeamMember);
        setNewTeamMember({ name: '', role: '', avatarUrl: '' });
        loadCompany();
    };

    const handleRemoveTeamMember = async (memberId: string) => {
        if (!company) return;
        await companyService.removeTeamMember(company.id, memberId);
        loadCompany();
    };

    // Checklist / Notes Management
    const handleStageSelect = async (stageId: string) => {
        if (!company) return;
        const stageIndex = PIPELINE_COLUMNS.findIndex(c => c.id === stageId);
        const updatedChecklist = company.checklist.map(item => {
             const itemIndex = PIPELINE_COLUMNS.findIndex(c => c.id === item.id);
             return { ...item, completed: itemIndex !== -1 && itemIndex <= stageIndex };
        });
        setCompany({ ...company, pipelineStage: stageId as PipelineStage, checklist: updatedChecklist });
        await companyService.updateStage(company.id, stageId as PipelineStage);
    };

    const startEditingNote = (itemId: string, currentNote: string) => {
        setEditingNoteId(itemId);
        setTempNote(currentNote || '');
    };

    const saveNote = async (itemId: string) => {
        if (!company) return;
        const updatedChecklist = company.checklist.map(item => 
            item.id === itemId ? { ...item, notes: tempNote } : item
        );
        setCompany({ ...company, checklist: updatedChecklist });
        setEditingNoteId(null);
        await companyService.updateChecklistNote(company.id, itemId, tempNote);
    };

    // Activity Management
    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;
        await companyService.addActivity(company.id, {
            ...newActivity,
            syncStatus: syncToCalendar ? 'synced' : 'none'
        });
        setNewActivity({ type: 'meeting', title: '', description: '', date: new Date().toISOString().split('T')[0], syncStatus: 'pending', stageId: undefined });
        setIsActivityModalOpen(false);
        loadCompany();
    };

    // Document management
    const handleAddDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;
        await companyService.addDocument(company.id, newDoc);
        setNewDoc({ name: '', url: '', type: 'other' });
        setIsDocModalOpen(false);
        loadCompany();
    };

    const handleRemoveDocument = async (docId: string) => {
        if (!company) return;
        await companyService.removeDocument(company.id, docId);
        loadCompany();
    };

    const handleSendEmail = (specificEmail?: string) => {
        if (!company) return;
        const targetEmail = specificEmail || company.contacts.find(c => c.isMainContact)?.emails[0] || company.contacts[0]?.emails[0] || '';
        navigate('/inbox', { state: { composeTo: targetEmail, subject: `Re: ${company.name}`, companyId: company.id } });
    };

    const getEmailHeader = (msg: GmailMessage, name: string) => 
        msg.payload.headers.find((h: any) => h.name === name)?.value || '';

    if (loading) return <div className="p-8 text-center text-slate-500">Loading details...</div>;
    if (!company) return null;

    const currentStageIndex = PIPELINE_COLUMNS.findIndex(col => col.id === company.pipelineStage);

    return (
        <div className="max-w-6xl mx-auto space-y-6 relative pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-4 flex-1">
                    <button onClick={() => navigate(-1)} className="p-2 mt-1 hover:bg-slate-100 rounded-full dark:hover:bg-slate-800 transition-colors shrink-0">
                        <ArrowLeft className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="h-10 w-10 rounded bg-slate-200 border border-slate-300 dark:bg-slate-700 dark:border-slate-600 overflow-hidden flex items-center justify-center shrink-0">
                                {company.logoUrl ? (
                                    <img src={company.logoUrl} alt={company.name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="font-bold text-slate-500 text-sm dark:text-slate-300">{getInitials(company.name)}</span>
                                )}
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 truncate">{company.name}</h1>
                            <div className="flex gap-2">
                                <TypeBadge type={company.type} />
                                <PriorityBadge priority={company.importance} />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400 mt-2">
                            {company.website && (
                                <a href={`https://${company.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-orange-600">
                                    <Globe className="h-3 w-3" /> {company.website}
                                </a>
                            )}
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Last contact: {formatDate(company.lastContactDate)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="self-end sm:self-auto flex items-center gap-2">
                    <button onClick={handleDeleteCompany} className="p-2 border border-slate-200 rounded-md hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:border-slate-800 dark:hover:bg-red-900/30 dark:hover:border-red-800 dark:text-slate-400 dark:hover:text-red-400 transition-colors flex items-center gap-2 px-3">
                         <Trash2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setIsEditModalOpen(true)} className="p-2 border border-slate-200 rounded-md hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center gap-2 px-3">
                        <Edit2 className="h-4 w-4" /> <span className="hidden sm:inline">Edit Company</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs */}
                    <div className="border-b border-slate-200 dark:border-slate-800">
                        <nav className="-mb-px flex gap-6 overflow-x-auto scrollbar-hide">
                            {(['overview', 'contacts', 'journey', 'emails', 'documents'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`
                                        pb-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors whitespace-nowrap flex items-center gap-2
                                        ${activeTab === tab 
                                            ? 'border-orange-500 text-orange-600 dark:text-orange-500' 
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'}
                                    `}
                                >
                                    {tab === 'journey' && <History className="h-4 w-4" />}
                                    {tab === 'emails' && <Mail className="h-4 w-4" />}
                                    {tab === 'journey' ? 'Onboarding Journey' : tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 dark:bg-slate-900 dark:border-slate-800 min-h-[400px]">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="p-4 bg-slate-50 rounded-xl dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <Briefcase className="h-4 w-4" /> General Notes
                                        </h3>
                                        {!isEditingGeneralNote ? (
                                            <button onClick={() => setIsEditingGeneralNote(true)} className="text-xs text-orange-600 hover:underline font-medium">Edit Notes</button>
                                        ) : (
                                            <div className="flex gap-2">
                                                 <button onClick={() => setIsEditingGeneralNote(false)} className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400">Cancel</button>
                                                 <button onClick={handleSaveGeneralNote} className="text-xs text-orange-600 font-bold hover:text-orange-700">Save</button>
                                            </div>
                                        )}
                                    </div>
                                    {isEditingGeneralNote ? (
                                        <textarea 
                                            value={generalNote}
                                            onChange={(e) => setGeneralNote(e.target.value)}
                                            className="w-full text-sm p-3 rounded-md border border-slate-300 min-h-[100px] focus:ring-1 focus:ring-orange-500 focus:outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                                            placeholder="Add key details..."
                                        />
                                    ) : (
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            {company.generalComment || "No notes available."}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div onClick={() => setIsTeamModalOpen(true)} className="p-4 border border-slate-200 rounded-lg dark:border-slate-800 cursor-pointer hover:border-orange-300 transition-colors group relative bg-white dark:bg-slate-900">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider dark:text-slate-400">Lexia Team</p>
                                            <Edit2 className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                                        </div>
                                        <div className="mt-2 space-y-3">
                                            {company.team.map((member) => (
                                                <div key={member.id} className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border border-indigo-200 dark:bg-indigo-900 dark:border-indigo-800">
                                                        {member.avatarUrl ? (
                                                            <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span className="text-indigo-700 dark:text-indigo-300 font-bold text-xs">{getInitials(member.name)}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{member.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.role}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {company.team.length === 0 && <p className="text-sm text-slate-400 italic">No team members assigned</p>}
                                        </div>
                                    </div>
                                    <div className="p-4 border border-slate-200 rounded-lg dark:border-slate-800 bg-white dark:bg-slate-900">
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider dark:text-slate-400">Pipeline Stage</p>
                                        <div className="mt-2 font-medium capitalize text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${company.pipelineStage === 'client_success' ? 'bg-green-500' : 'bg-orange-500'}`} />
                                            {company.pipelineStage.replace('_', ' ')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Contacts Tab */}
                        {activeTab === 'contacts' && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Contacts</h3>
                                    <button onClick={openAddContact} className="text-sm font-medium text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-md flex items-center gap-1 shadow-sm transition-colors">
                                        <Plus className="h-4 w-4" /> Add Contact
                                    </button>
                                </div>
                                {company.contacts.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {company.contacts.map(contact => (
                                            <div key={contact.id} className="relative group bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-orange-200 transition-all shadow-sm">
                                                <div className="flex items-start gap-4">
                                                    <div className="relative">
                                                        <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 font-black overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                                                            {contact.avatarUrl ? <img src={contact.avatarUrl} alt={contact.name} className="h-full w-full object-cover" /> : <span className="dark:text-slate-100">{getInitials(contact.name)}</span>}
                                                        </div>
                                                        {contact.isMainContact && <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-900"><User className="h-2 w-2 text-black" /></div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-slate-900 dark:text-slate-100 truncate">{contact.name}</p>
                                                            {contact.isMainContact && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[8px] font-black uppercase rounded dark:bg-orange-900/30 dark:text-orange-400">Principal</span>}
                                                        </div>
                                                        <p className="text-xs font-bold text-orange-600 uppercase tracking-tight mt-0.5 dark:text-orange-500">{contact.role}</p>
                                                        <div className="mt-3 space-y-1.5">
                                                            {contact.emails.map((email, idx) => (
                                                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                                                                    <Mail className="h-3 w-3 shrink-0" />
                                                                    <span className="truncate" title={email}>{email}</span>
                                                                </div>
                                                            ))}
                                                            {contact.phone && <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><Phone className="h-3 w-3 shrink-0" /> <span>{contact.phone}</span></div>}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => openEditContact(contact)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all dark:hover:bg-slate-800"><Edit2 className="h-4 w-4" /></button>
                                                        <button onClick={() => handleSendEmail(contact.emails[0])} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all dark:hover:bg-slate-800"><Mail className="h-4 w-4" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
                                        <p className="text-slate-500 text-sm italic">No contacts listed.</p>
                                        <button onClick={openAddContact} className="mt-2 text-sm text-orange-600 hover:underline dark:text-orange-500">Add one now</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Unified Journey Tab (Pipeline + Timeline) */}
                        {activeTab === 'journey' && (
                            <div className="animate-in fade-in duration-300">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        Onboarding Timeline
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => openActivityModalWithStage()}
                                            className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
                                        >
                                            <Plus className="h-4 w-4" /> Log Global Activity
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-12 relative">
                                    {/* Continuous vertical line */}
                                    <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-800 z-0" />

                                    {PIPELINE_COLUMNS.map((col, index) => {
                                        const isCompleted = index <= currentStageIndex;
                                        const isActive = index === currentStageIndex;
                                        const checklistItem = company.checklist.find(item => item.id === col.id);
                                        const notes = checklistItem?.notes || '';
                                        
                                        // Filter activities for this stage
                                        const stageActivities = company.activities.filter(a => a.stageId === col.id);

                                        return (
                                            <div key={col.id} className="relative z-10 pl-12 group">
                                                {/* Status Marker */}
                                                <button 
                                                    onClick={() => handleStageSelect(col.id)}
                                                    className={cn(
                                                        "absolute left-0 top-0 h-10 w-10 rounded-full flex items-center justify-center transition-all border-4 border-white dark:border-slate-900 shadow-sm outline-none",
                                                        isCompleted ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-800 text-slate-300 border-slate-100 dark:border-slate-800"
                                                    )}
                                                >
                                                    {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                                                </button>

                                                <div className={cn(
                                                    "border rounded-2xl p-6 transition-all",
                                                    isActive 
                                                        ? "bg-orange-50/40 border-orange-200 dark:bg-orange-950/10 dark:border-orange-900/50 shadow-sm" 
                                                        : "bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800"
                                                )}>
                                                    {/* Step Header */}
                                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Step {index + 1}</span>
                                                                {isActive && <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">Current</span>}
                                                            </div>
                                                            <h4 className={cn("text-lg font-bold", isActive ? "text-orange-700 dark:text-orange-400" : "text-slate-900 dark:text-slate-100")}>
                                                                {col.title}
                                                            </h4>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => startEditingNote(col.id, notes)}
                                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                                                                title="Step Comments"
                                                            >
                                                                <MessageSquare className="h-5 w-5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => openActivityModalWithStage(col.id)}
                                                                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors dark:text-slate-100"
                                                            >
                                                                <Plus className="h-3.5 w-3.5" /> Log Interaction
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Step Notes/Comments */}
                                                    {editingNoteId === col.id ? (
                                                        <div className="mb-6 animate-in fade-in slide-in-from-top-1">
                                                            <textarea
                                                                value={tempNote}
                                                                onChange={(e) => setTempNote(e.target.value)}
                                                                className="w-full text-sm p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[100px]"
                                                                placeholder={`Commentaires pour ${col.title}...`}
                                                                autoFocus
                                                            />
                                                            <div className="flex justify-end gap-2 mt-2">
                                                                <button onClick={() => setEditingNoteId(null)} className="text-xs px-3 py-1.5 text-slate-500 font-medium">Cancel</button>
                                                                <button onClick={() => saveNote(col.id)} className="text-xs px-4 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold shadow-sm">
                                                                    Save Comments
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : notes && (
                                                        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700">
                                                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{notes}</p>
                                                        </div>
                                                    )}

                                                    {/* Nested Activities */}
                                                    <div className="space-y-4">
                                                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                                            <LayoutPanelLeft className="h-3 w-3" /> Step Activity History
                                                        </h5>
                                                        
                                                        {stageActivities.length > 0 ? (
                                                            <div className="space-y-3">
                                                                {stageActivities.map((act) => (
                                                                    <div key={act.id} className="flex gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:shadow-sm transition-shadow">
                                                                        <div className={cn(
                                                                            "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                                                                            act.type === 'email' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                                                                            act.type === 'meeting' ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" :
                                                                            "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                                        )}>
                                                                            {act.type === 'email' ? <Mail className="h-4 w-4" /> :
                                                                             act.type === 'meeting' ? <Calendar className="h-4 w-4" /> :
                                                                             act.type === 'call' ? <Phone className="h-4 w-4" /> :
                                                                             <MessageSquare className="h-4 w-4" />}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center justify-between mb-1">
                                                                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{act.title}</p>
                                                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{formatDate(act.date)}</span>
                                                                            </div>
                                                                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">{act.description}</p>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                                                                    <span className="text-[8px] font-bold dark:text-slate-300">{getInitials(act.user)}</span>
                                                                                </div>
                                                                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{act.user}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                                                <p className="text-xs text-slate-400 italic">No activity recorded for this stage yet.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    {/* General History (activities with no stage) */}
                                    {company.activities.filter(a => !a.stageId).length > 0 && (
                                        <div className="pt-8">
                                             <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 pl-12">
                                                <ListTodo className="h-4 w-4" /> General Activity History
                                             </h3>
                                             <div className="space-y-4 pl-12">
                                                {company.activities.filter(a => !a.stageId).map(act => (
                                                     <div key={act.id} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-xl">
                                                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                                            {act.type === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-baseline">
                                                                <p className="text-sm font-bold dark:text-slate-100">{act.title}</p>
                                                                <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatDate(act.date)}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{act.description}</p>
                                                        </div>
                                                     </div>
                                                ))}
                                             </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Emails Tab */}
                        {activeTab === 'emails' && (
                            <div className="animate-in fade-in duration-300">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        <Mail className="h-5 w-5 text-orange-500" /> Gmail Conversation History
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={loadEmails} 
                                            className="p-2 text-slate-400 hover:text-orange-600 transition-colors"
                                            title="Sync Emails"
                                        >
                                            <RefreshCw className={cn("h-4 w-4", emailsLoading && "animate-spin")} />
                                        </button>
                                        <button onClick={() => handleSendEmail()} className="px-4 py-2 bg-slate-900 text-white dark:bg-orange-600 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm">
                                            <Plus className="h-3.5 w-3.5" /> Compose New
                                        </button>
                                    </div>
                                </div>

                                {emailsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Retrieving conversations...</p>
                                    </div>
                                ) : emails.length > 0 ? (
                                    <div className="space-y-4">
                                        {emails.map((msg) => {
                                            const from = getEmailHeader(msg, 'From');
                                            const subject = getEmailHeader(msg, 'Subject');
                                            const date = new Date(parseInt(msg.internalDate)).toLocaleDateString();
                                            const isOutbound = msg.labelIds.includes('SENT');
                                            const isExpanded = expandedEmailId === msg.id;

                                            return (
                                                <div 
                                                    key={msg.id} 
                                                    className={cn(
                                                        "rounded-2xl border transition-all overflow-hidden",
                                                        isOutbound 
                                                            ? "bg-orange-50/30 border-orange-100 dark:bg-orange-950/10 dark:border-orange-900/30" 
                                                            : "bg-blue-50/30 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900/30"
                                                    )}
                                                >
                                                    <div 
                                                        onClick={() => setExpandedEmailId(isExpanded ? null : msg.id)}
                                                        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
                                                    >
                                                        <div className={cn(
                                                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                                            isOutbound ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                                        )}>
                                                            {isOutbound ? <Send className="h-5 w-5" /> : <InboxIcon className="h-5 w-5" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-4 mb-0.5">
                                                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                                                    {isOutbound ? "You" : from.split('<')[0].trim() || from}
                                                                </p>
                                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{date}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate">{subject || '(No Subject)'}</p>
                                                        </div>
                                                        <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform", isExpanded && "rotate-90")} />
                                                    </div>
                                                    
                                                    {isExpanded && (
                                                        <div className="px-4 pb-6 pt-2 animate-in slide-in-from-top-2">
                                                            <div className="p-5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                                                <div className="mb-4 flex items-center justify-between border-b dark:border-slate-800 pb-3">
                                                                    <div className="text-[10px] space-y-1">
                                                                        <p className="text-slate-400 uppercase font-black tracking-widest">From: <span className="text-slate-600 dark:text-slate-200">{from}</span></p>
                                                                        <p className="text-slate-400 uppercase font-black tracking-widest">To: <span className="text-slate-600 dark:text-slate-200">{getEmailHeader(msg, 'To')}</span></p>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => navigate('/inbox')}
                                                                        className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-orange-500 transition-all"
                                                                        title="View in Inbox"
                                                                    >
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                                                                    {msg.snippet}...
                                                                </p>
                                                                <div className="mt-6 flex justify-center">
                                                                    <button 
                                                                        onClick={() => navigate('/inbox')}
                                                                        className="text-[10px] font-black uppercase text-orange-600 hover:underline flex items-center gap-1 dark:text-orange-500"
                                                                    >
                                                                        View full message in Inbox <ArrowUpRight className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-2xl dark:bg-slate-900/50 dark:border-slate-800">
                                        <Mail className="h-12 w-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">No email history found for this company.</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Correspondence is automatically linked via contact email addresses.</p>
                                        <button onClick={() => handleSendEmail()} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest dark:bg-slate-100 dark:text-slate-900">Send First Email</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Documents Tab */}
                        {activeTab === 'documents' && (
                            <div className="animate-in fade-in duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-blue-500" /> Client Documents
                                    </h3>
                                    <button onClick={() => setIsDocModalOpen(true)} className="text-sm font-medium text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-md flex items-center gap-1 shadow-sm transition-colors">
                                        <Plus className="h-4 w-4" /> Add Document
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {company.documents && company.documents.length > 0 ? (
                                        company.documents.map((doc) => (
                                            <div key={doc.id} className="flex items-center p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/50 transition-colors group">
                                                <div className={clsx(
                                                    "h-10 w-10 rounded-lg flex items-center justify-center mr-4",
                                                    doc.type === 'pdf' ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : 
                                                    doc.type === 'sheet' ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
                                                    "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                                )}>
                                                    {doc.type === 'pdf' ? <FileText className="h-5 w-5" /> : 
                                                     doc.type === 'sheet' ? <FileSpreadsheet className="h-5 w-5" /> :
                                                     <File className="h-5 w-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-orange-600 truncate flex items-center gap-2">
                                                        {doc.name} <ExternalLink className="h-3 w-3 text-slate-400" />
                                                    </a>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Added by {doc.addedBy} • {formatDate(doc.createdAt)}</p>
                                                </div>
                                                <button onClick={() => handleRemoveDocument(doc.id)} className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Eye className="h-4 w-4" />
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-lg dark:bg-slate-900/50 dark:border-slate-800">
                                            <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                                            <p className="text-slate-500 dark:text-slate-400 text-sm italic">No documents linked yet.</p>
                                            <button onClick={() => setIsDocModalOpen(true)} className="mt-2 text-sm text-orange-600 hover:underline dark:text-orange-500">Link a Google Drive file</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Quick Access */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 dark:bg-slate-900 dark:border-slate-800">
                        <h3 className="font-bold text-slate-900 mb-4 dark:text-slate-100 uppercase text-xs tracking-widest">Client Quick Contact</h3>
                        <div className="space-y-3">
                            {company.contacts.length > 0 ? (
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs dark:text-slate-100">
                                            {getInitials(company.contacts[0].name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate dark:text-slate-100">{company.contacts[0].name}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{company.contacts[0].role}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleSendEmail()} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-primary rounded-lg hover:opacity-90 transition-opacity">
                                        <Mail className="h-3.5 w-3.5" /> Send Briefing
                                    </button>
                                </div>
                            ) : (
                                <button onClick={openAddContact} className="w-full py-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-500 hover:text-orange-600 hover:border-orange-500 transition-all dark:text-slate-400">
                                    + Add main contact
                                </button>
                            )}
                            
                            <div className="pt-2">
                                <button onClick={() => openActivityModalWithStage()} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 transition-all group shadow-sm">
                                    <div className="p-1.5 bg-blue-100 rounded text-blue-600 group-hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                    Log Interaction
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Modal */}
            {isContactModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{editingContactId ? 'Edit Contact' : 'Add Contact'}</h2>
                            <button onClick={() => setIsContactModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSaveContact} className="p-6 overflow-y-auto">
                            <div className="flex flex-col items-center gap-4 mb-6">
                                <div onClick={() => fileInputRef.current?.click()} className="h-20 w-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-50 overflow-hidden relative group dark:bg-slate-800 dark:border-slate-700">
                                    {contactForm.avatarUrl ? <img src={contactForm.avatarUrl} alt="Preview" className="h-full w-full object-cover" /> : <Camera className="h-8 w-8 text-slate-400" />}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-xs text-white font-medium">Change</span></div>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleAvatarUpload(e, 'contact')} />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block dark:text-slate-400">Name</label>
                                    <input required type="text" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-orange-500" />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block dark:text-slate-400">Email Addresses</label>
                                        <button type="button" onClick={handleAddEmailField} className="text-xs text-orange-600 font-bold hover:underline dark:text-orange-500">+ Add Email</button>
                                    </div>
                                    <div className="space-y-2">
                                        {contactForm.emails?.map((email, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input required type="email" value={email} onChange={e => handleEmailChange(idx, e.target.value)} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-orange-500" placeholder="email@example.com" />
                                                <button type="button" onClick={() => handleRemoveEmailField(idx)} className="p-3 text-slate-400 hover:text-red-500 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block dark:text-slate-400">Role</label>
                                        <input required type="text" value={contactForm.role} onChange={e => setContactForm({...contactForm, role: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-orange-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block dark:text-slate-400">Phone</label>
                                        <input type="tel" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-orange-500" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 mt-6">
                                <input type="checkbox" id="isMain" checked={contactForm.isMainContact} onChange={e => setContactForm({...contactForm, isMainContact: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
                                <label htmlFor="isMain" className="text-sm font-medium text-slate-700 dark:text-slate-300">Primary Contact</label>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setIsContactModalOpen(false)} className="px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" className="px-8 py-2.5 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-lg transition-all active:scale-95">Save Contact</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Edit Company</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleUpdateCompany} className="p-6 space-y-4 overflow-y-auto">
                            <div className="flex flex-col items-center gap-2 mb-4">
                                <div onClick={() => companyLogoInputRef.current?.click()} className="h-24 w-24 rounded-lg bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-50 overflow-hidden relative group dark:bg-slate-800 dark:border-slate-700 transition-all hover:border-orange-300">
                                    {editForm.logoUrl ? <img src={editForm.logoUrl} alt="Preview" className="h-full w-full object-cover" /> : (
                                        <div className="flex flex-col items-center text-slate-400">
                                            <Building className="h-8 w-8 mb-1" />
                                            <span className="text-[10px]">Upload</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs text-white font-medium">Change Logo</span>
                                    </div>
                                </div>
                                <input type="file" ref={companyLogoInputRef} className="hidden" accept="image/*" onChange={(e) => handleAvatarUpload(e, 'company')} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Company Name</label>
                                <input required type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-slate-700 dark:text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Type</label>
                                    <CustomSelect value={editForm.type || 'PME'} onChange={(val) => setEditForm({...editForm, type: val as CompanyType})} options={[{ value: 'PME', label: 'PME' }, { value: 'GE/ETI', label: 'GE/ETI' }, { value: 'Public Services', label: 'Public Services' }]} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Priority</label>
                                    <CustomSelect value={editForm.importance || 'medium'} onChange={(val) => setEditForm({...editForm, importance: val as Priority})} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Pipeline Stage</label>
                                <CustomSelect value={editForm.pipelineStage || 'entry_point'} onChange={(val) => setEditForm({...editForm, pipelineStage: val as PipelineStage})} options={PIPELINE_COLUMNS.map(col => ({ value: col.id, label: col.title }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Website</label>
                                <input type="text" value={editForm.website || ''} onChange={e => setEditForm({...editForm, website: e.target.value})} className="flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-slate-700 dark:text-white" placeholder="example.com" />
                            </div>
                            <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isActivityModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Log Activity</h2>
                            <button onClick={() => setIsActivityModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleAddActivity} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Type</label>
                                    <CustomSelect value={newActivity.type || 'note'} onChange={(v) => setNewActivity({...newActivity, type: v as any})} options={[{value:'email', label:'Email'}, {value:'meeting', label:'Meeting'}, {value:'call', label:'Call'}, {value:'note', label:'Note'}]} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date</label>
                                    <input type="date" value={newActivity.date} onChange={e => setNewActivity({...newActivity, date: e.target.value})} className="flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700 dark:text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Title</label>
                                <input required type="text" value={newActivity.title || ''} onChange={e => setNewActivity({...newActivity, title: e.target.value})} className="flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700 dark:text-white" placeholder="e.g. Discovery Call" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                                <textarea value={newActivity.description || ''} onChange={e => setNewActivity({...newActivity, description: e.target.value})} className="flex w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700 dark:text-white min-h-[100px]" placeholder="Summary of the interaction..." />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="sync" checked={syncToCalendar} onChange={e => setSyncToCalendar(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-orange-600" />
                                <label htmlFor="sync" className="text-sm text-slate-600 dark:text-slate-400">Sync to Calendar</label>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsActivityModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md">Save Activity</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDocModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Link Document</h2>
                            <button onClick={() => setIsDocModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleAddDocument} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Document Name</label>
                                <input required type="text" value={newDoc.name || ''} onChange={e => setNewDoc({...newDoc, name: e.target.value})} className="flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700 dark:text-white" placeholder="e.g. Master Services Agreement" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Google Drive Link</label>
                                <input required type="url" value={newDoc.url || ''} onChange={e => setNewDoc({...newDoc, url: e.target.value})} className="flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700 dark:text-white" placeholder="https://drive.google.com/..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Type</label>
                                <CustomSelect value={newDoc.type || 'other'} onChange={(v) => setNewDoc({...newDoc, type: v as any})} options={[{value:'pdf', label:'PDF'}, {value:'sheet', label:'Spreadsheet'}, {value:'doc', label:'Document'}, {value:'other', label:'Other'}]} />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsDocModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md">Add Document</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isTeamModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Manage Internal Team</h2>
                            <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest dark:text-slate-400">Assigned Members</h3>
                                {company.team.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs dark:text-slate-100">
                                                {getInitials(member.name)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold dark:text-slate-100">{member.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{member.role}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveTeamMember(member.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <form onSubmit={handleAddTeamMember} className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest dark:text-slate-400">Add Member</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <input required type="text" value={newTeamMember.name || ''} onChange={e => setNewTeamMember({...newTeamMember, name: e.target.value})} className="flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700 dark:text-white" placeholder="Name" />
                                    <input required type="text" value={newTeamMember.role || ''} onChange={e => setNewTeamMember({...newTeamMember, role: e.target.value})} className="flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700 dark:text-white" placeholder="Role (e.g. Sales)" />
                                </div>
                                <button type="submit" className="w-full py-2 text-sm font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-md">
                                    Assign Member
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
