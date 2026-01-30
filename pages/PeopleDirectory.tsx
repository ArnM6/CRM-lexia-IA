
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyService } from '../services/supabase';
import { Contact, Company, CompanyType, Priority, Gender } from '../types';
import { Search, Mail, Building2, ChevronRight, Phone, Plus, X, Camera, Briefcase, User, Linkedin, Save, Trash2, ChevronDown, Check, UserPlus, Sparkles, Loader2 } from 'lucide-react';
import { getInitials } from '../lib/utils';
import { clsx } from 'clsx';

interface ContactWithCompany extends Contact {
    companyId: string;
    companyName: string;
    companyLogo?: string;
}

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
                className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-slate-50 dark:hover:bg-slate-900"
            >
                <span className={clsx("block truncate", !value && "text-slate-500")}>
                    {selectedLabel || placeholder || "Sélectionner..."}
                </span>
                <ChevronDown className={clsx("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-slate-100 shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
                    <div className="p-1.5">
                        {options.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => { onChange(option.value); setIsOpen(false); }}
                                className={clsx(
                                    "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-slate-100 dark:hover:bg-slate-800",
                                    value === option.value ? "bg-slate-100 dark:bg-slate-800 font-bold" : ""
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

export const PeopleDirectory: React.FC = () => {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);
    const [editingContact, setEditingContact] = useState<ContactWithCompany | null>(null);
    
    const [contactForm, setContactForm] = useState<Partial<Contact>>({ name: '', emails: [''], role: '', phone: '', avatarUrl: '', linkedinUrl: '', isMainContact: false, gender: 'not_specified' });
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [newCompanyForm, setNewCompanyForm] = useState<{name: string, type: CompanyType, importance: Priority}>({ name: '', type: 'PME', importance: 'medium' });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadData = async () => {
        setLoading(true);
        const allCompanies = await companyService.getAll();
        setCompanies(allCompanies);
        
        const allContacts: ContactWithCompany[] = allCompanies.flatMap(company => 
            company.contacts.map(contact => ({
                ...contact,
                companyId: company.id,
                companyName: company.name,
                companyLogo: company.logoUrl
            }))
        );
        allContacts.sort((a, b) => a.name.localeCompare(b.name));
        setContacts(allContacts);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const filteredContacts = contacts.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.emails.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setContactForm(prev => ({ ...prev, avatarUrl: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const handleAddEmailField = () => setContactForm(prev => ({ ...prev, emails: [...(prev.emails || []), ""] }));
    const handleEmailChange = (idx: number, val: string) => {
        const updatedEmails = [...(contactForm.emails || [])];
        updatedEmails[idx] = val;
        setContactForm({ ...contactForm, emails: updatedEmails });
    };
    const handleRemoveEmailField = (idx: number) => {
        const updatedEmails = (contactForm.emails || []).filter((_, i) => i !== idx);
        setContactForm({ ...contactForm, emails: updatedEmails.length ? updatedEmails : [""] });
    };

    const openCreateModal = () => {
        setEditingContact(null);
        setContactForm({ name: '', emails: [''], role: '', phone: '', avatarUrl: '', linkedinUrl: '', isMainContact: false, gender: 'not_specified' });
        setSelectedCompanyId('');
        setIsCreatingCompany(false);
        setIsModalOpen(true);
    };

    const openEditModal = (contact: ContactWithCompany) => {
        setEditingContact(contact);
        setContactForm({
            name: contact.name,
            emails: contact.emails.length ? [...contact.emails] : [''],
            role: contact.role,
            phone: contact.phone,
            avatarUrl: contact.avatarUrl,
            linkedinUrl: contact.linkedinUrl,
            isMainContact: contact.isMainContact,
            gender: contact.gender || 'not_specified'
        });
        setSelectedCompanyId(contact.companyId);
        setIsCreatingCompany(false);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const cleanedEmails = contactForm.emails?.filter(em => em.trim() !== "") || [];
            const finalData = { ...contactForm, emails: cleanedEmails };

            if (editingContact) {
                await companyService.updateContact(editingContact.companyId, editingContact.id, finalData);
            } else {
                let targetCompanyId = selectedCompanyId;
                if (isCreatingCompany) {
                    if (!newCompanyForm.name) return;
                    const newCo = await companyService.create(newCompanyForm);
                    targetCompanyId = newCo.id;
                }
                if (!targetCompanyId) return;
                await companyService.addContact(targetCompanyId, finalData);
            }
            setIsModalOpen(false);
            loadData();
            window.dispatchEvent(new Event('companies-updated'));
        } catch (error) { console.error(error); }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">Annuaire Contacts</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Gérez l'ensemble des relations stratégiques de votre portefeuille.</p>
                </div>
                 <button onClick={openCreateModal} className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-[0_10px_30px_rgba(234,88,12,0.3)] hover:scale-105 transition-all active:scale-95">
                    <Plus className="mr-2 h-4 w-4" /> Ajouter Contact
                </button>
            </div>

            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
                        <input type="text" placeholder="Rechercher par nom, email ou poste..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-11 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-500 border-b dark:border-slate-800">
                            <tr>
                                <th className="px-8 py-5 font-black uppercase tracking-[0.1em] text-[10px]">Nom Complet</th>
                                <th className="px-8 py-5 font-black uppercase tracking-[0.1em] text-[10px]">Rôle & Poste</th>
                                <th className="px-8 py-5 font-black uppercase tracking-[0.1em] text-[10px]">Entreprise</th>
                                <th className="px-8 py-5 font-black uppercase tracking-[0.1em] text-[10px]">Communication</th>
                                <th className="px-8 py-5 font-black uppercase tracking-[0.1em] text-[10px] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" /><p className="text-[10px] font-black uppercase tracking-widest">Chargement de l'annuaire</p></td></tr>
                            ) : filteredContacts.length === 0 ? (
                                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic font-medium">Aucun contact trouvé dans votre base Lexia.</td></tr>
                            ) : (
                                filteredContacts.map((contact) => (
                                    <tr key={contact.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer" onClick={() => openEditModal(contact)}>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-11 w-11 flex-shrink-0 rounded-[1rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm group-hover:border-primary/30 transition-all">
                                                    {contact.avatarUrl ? <img src={contact.avatarUrl} alt={contact.name} className="h-full w-full object-cover" /> : <span className="font-black text-slate-500 dark:text-slate-400 text-xs tracking-tighter">{getInitials(contact.name)}</span>}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">{contact.name}</div>
                                                    {contact.isMainContact && <span className="mt-1 text-[8px] bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 px-2 py-0.5 rounded-full uppercase font-black tracking-widest border border-orange-200/50 dark:border-orange-900/50 inline-block">Principal</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-slate-700 dark:text-slate-300 font-medium">{contact.role}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2.5 hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); navigate(`/company/${contact.companyId}`); }}>
                                                <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                                    {contact.companyLogo ? <img src={contact.companyLogo} className="h-full w-full object-cover" /> : <Building2 className="h-4 w-4 text-slate-400" />}
                                                </div>
                                                <span className="font-bold text-slate-600 dark:text-slate-200 group-hover:text-primary underline underline-offset-4 decoration-slate-200 dark:decoration-slate-800">{contact.companyName}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-1">
                                                {contact.emails.slice(0, 1).map((e, idx) => (
                                                    <span key={idx} className="text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate max-w-[200px]">{e}</span>
                                                ))}
                                                {contact.phone && <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold">{contact.phone}</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); navigate('/inbox', { state: { composeTo: contact.emails[0] } }); }} className="p-3 text-slate-400 hover:text-primary dark:hover:text-primary rounded-xl transition-all hover:bg-white dark:hover:bg-slate-800 shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                                <Mail className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de création / Edition */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="flex items-center justify-between p-7 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/30 dark:bg-slate-950/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 rounded-2xl">
                                    <UserPlus className="h-6 w-6 text-primary" />
                                </div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{editingContact ? 'Editer le Contact' : 'Nouveau Contact'}</h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"><X className="h-6 w-6" /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="overflow-y-auto p-8 space-y-8">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center gap-4">
                                <div onClick={() => fileInputRef.current?.click()} className="h-28 w-28 rounded-[2.5rem] bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-orange-50/30 dark:hover:bg-orange-950/10 overflow-hidden relative group transition-all">
                                    {contactForm.avatarUrl ? <img src={contactForm.avatarUrl} alt="Preview" className="h-full w-full object-cover" /> : <Camera className="h-10 w-10 text-slate-300 dark:text-slate-800 group-hover:text-primary transition-colors" />}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[10px] text-white font-black uppercase tracking-[0.2em]">Changer</span></div>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Nom complet du contact</label>
                                    <input required type="text" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} className="w-full h-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="ex: Jean Dupont" />
                                </div>

                                <div className="space-y-3 md:col-span-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Emails Professionnels</label>
                                        <button type="button" onClick={handleAddEmailField} className="text-[10px] font-black text-primary hover:underline uppercase tracking-tighter">+ Ajouter</button>
                                    </div>
                                    <div className="space-y-3">
                                        {contactForm.emails?.map((email, idx) => (
                                            <div key={idx} className="flex gap-3 animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                                <input required type="email" value={email} onChange={e => handleEmailChange(idx, e.target.value)} className="flex-1 h-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" placeholder="contact@entreprise.fr" />
                                                <button type="button" onClick={() => handleRemoveEmailField(idx)} className="p-3.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all"><Trash2 className="h-5 w-5" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Poste & Titre</label>
                                    <input required type="text" value={contactForm.role} onChange={e => setContactForm({...contactForm, role: e.target.value})} className="w-full h-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="ex: Directeur Commercial" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
                                    <input type="tel" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} className="w-full h-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="01 23 45 67 89" />
                                </div>

                                <div className="pt-4 md:col-span-2 border-t dark:border-slate-800">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-4 block">Entreprise Ratachée</label>
                                    {editingContact ? (
                                        <div className="p-5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-3 shadow-inner">
                                            <div className="h-8 w-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border dark:border-slate-800">
                                                <Building2 className="h-4 w-4 text-primary" />
                                            </div>
                                            {editingContact.companyName}
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            <CustomSelect value={selectedCompanyId} onChange={setSelectedCompanyId} options={companies.map(c => ({ value: c.id, label: c.name }))} placeholder="Sélectionner une entreprise existante..." />
                                            <div className="flex items-center gap-3 p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <input type="checkbox" id="isNew" checked={isCreatingCompany} onChange={e => setIsCreatingCompany(e.target.checked)} className="h-5 w-5 rounded-lg border-slate-300 dark:border-slate-700 text-primary transition-all cursor-pointer" />
                                                <label htmlFor="isNew" className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter cursor-pointer">Créer une nouvelle entité entreprise</label>
                                            </div>
                                            {isCreatingCompany && (
                                                <div className="p-6 bg-primary/5 dark:bg-primary/10 rounded-3xl border border-primary/20 animate-in slide-in-from-top-3 duration-400 space-y-4">
                                                    <input required type="text" placeholder="Nom de l'entreprise..." value={newCompanyForm.name} onChange={e => setNewCompanyForm({...newCompanyForm, name: e.target.value})} className="w-full h-11 px-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/30 shadow-sm" />
                                                    <div className="flex items-center gap-2 text-[9px] font-black text-primary uppercase tracking-[0.2em] px-1"><Sparkles className="h-3 w-3" /> Intelligence Lexia activée</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-4 pt-8 border-t border-slate-100 dark:border-slate-800 shrink-0">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all">Annuler</button>
                                <button type="submit" className="px-12 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-white bg-slate-900 dark:bg-primary rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all">Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
