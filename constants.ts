
import { Company, PipelineColumn, Activity } from './types';

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: 'entry_point', title: 'Entry Point' },
  { id: 'exchange', title: 'Exchange' },
  { id: 'proposal', title: 'Proposal' },
  { id: 'validation', title: 'Validation' },
  { id: 'client_success', title: 'Client Success' },
];

// Checklist items now correspond 1:1 with Pipeline Stages
const DEFAULT_CHECKLIST = [
  { id: 'entry_point', label: 'Entry Point', completed: true, notes: 'Initial contact established.' },
  { id: 'exchange', label: 'Exchange', completed: false, notes: 'Understand client needs.' },
  { id: 'proposal', label: 'Proposal', completed: false, notes: 'Send commercial offer.' },
  { id: 'validation', label: 'Validation', completed: false, notes: 'Legal review and signing.' },
  { id: 'client_success', label: 'Client Success', completed: false, notes: 'Onboarding kickoff.' },
];

const MOCK_ACTIVITIES: Activity[] = [
  { id: 'a1', type: 'email', direction: 'outbound', title: 'Introductory Email', description: 'Sent capabilities deck.', date: '2023-10-20T09:00:00Z', user: 'John Doe', syncStatus: 'synced' },
  { id: 'a2', type: 'meeting', title: 'Discovery Call', description: 'Discussed seat requirements and budget.', date: '2023-10-22T14:00:00Z', user: 'John Doe', syncStatus: 'synced' },
  { id: 'a3', type: 'note', title: 'Internal Review', description: 'Client seems hesitant about pricing.', date: '2023-10-23T11:00:00Z', user: 'Jane Smith', syncStatus: 'none' },
  { id: 'a4', type: 'email', direction: 'inbound', title: 'Re: Proposal', description: 'Asking for clarification on SLA.', date: '2023-10-24T10:00:00Z', user: 'Alice Johnson', syncStatus: 'synced' },
];

export const MOCK_COMPANIES: Company[] = [
  {
    id: '1',
    name: 'TechFlow Solutions',
    type: 'PME',
    importance: 'high',
    pipelineStage: 'proposal',
    lastContactDate: '2023-10-24T10:00:00Z',
    website: 'techflow.example.com',
    team: [
      { id: 't1', name: 'John Doe', role: 'Account Manager' },
      { id: 't2', name: 'Sarah Connor', role: 'Tech Lead' }
    ],
    contacts: [
      { id: 'c1', name: 'Alice Johnson', emails: ['alice@techflow.com'], role: 'CTO', isMainContact: true }
    ],
    checklist: [
      { id: 'entry_point', label: 'Entry Point', completed: true, notes: 'Positive intro call.' },
      { id: 'exchange', label: 'Exchange', completed: true, notes: 'Needs 50 seats.' },
      { id: 'proposal', label: 'Proposal', completed: true, notes: 'Sent v1 on Monday.' },
      { id: 'validation', label: 'Validation', completed: false, notes: 'Waiting for legal review.' },
      { id: 'client_success', label: 'Client Success', completed: false, notes: '' },
    ],
    activities: [...MOCK_ACTIVITIES],
    documents: [
        { id: 'd1', name: 'Requirements.pdf', type: 'pdf', url: '#', addedBy: 'John Doe', createdAt: '2023-10-21T10:00:00Z' },
        { id: 'd2', name: 'Pricing_Sheet_v1.xlsx', type: 'sheet', url: '#', addedBy: 'John Doe', createdAt: '2023-10-23T14:00:00Z' }
    ],
    createdAt: '2023-09-01T00:00:00Z',
    generalComment: 'Key account for Q4. Focus on upsell potential.'
  },
  {
    id: '2',
    name: 'Global Corp',
    type: 'GE/ETI',
    importance: 'medium',
    pipelineStage: 'exchange',
    lastContactDate: '2023-10-20T14:30:00Z',
    website: 'globalcorp.example.com',
    team: [
        { id: 't3', name: 'Jane Smith', role: 'Account Manager' }
    ],
    contacts: [
      { id: 'c2', name: 'Bob Smith', emails: ['bsmith@global.com'], role: 'Procurement', isMainContact: true }
    ],
    checklist: [
      { id: 'entry_point', label: 'Entry Point', completed: true, notes: 'Met at conference.' },
      { id: 'exchange', label: 'Exchange', completed: true, notes: '' },
      { id: 'proposal', label: 'Proposal', completed: false, notes: '' },
      { id: 'validation', label: 'Validation', completed: false, notes: '' },
      { id: 'client_success', label: 'Client Success', completed: false, notes: '' },
    ],
    activities: [MOCK_ACTIVITIES[0]],
    documents: [],
    createdAt: '2023-08-15T00:00:00Z'
  },
  {
    id: '3',
    name: 'City Council',
    type: 'Public Services',
    importance: 'low',
    pipelineStage: 'entry_point',
    lastContactDate: '2023-09-30T09:15:00Z',
    website: 'city.gov',
    team: [
        { id: 't1', name: 'John Doe', role: 'Account Manager' }
    ],
    contacts: [],
    checklist: [...DEFAULT_CHECKLIST],
    activities: [],
    documents: [],
    createdAt: '2023-10-01T00:00:00Z'
  },
  {
    id: '4',
    name: 'InnovateX',
    type: 'PME',
    importance: 'high',
    pipelineStage: 'client_success',
    lastContactDate: '2023-10-25T16:45:00Z',
    team: [
        { id: 't3', name: 'Jane Smith', role: 'Account Manager' }
    ],
    contacts: [],
    checklist: DEFAULT_CHECKLIST.map(i => ({...i, completed: true, notes: 'Completed.'})),
    activities: [],
    documents: [],
    createdAt: '2023-07-20T00:00:00Z'
  },
  {
    id: '5',
    name: 'Alpha Dynamics',
    type: 'GE/ETI',
    importance: 'medium',
    pipelineStage: 'validation',
    lastContactDate: '2023-10-22T11:20:00Z',
    team: [
        { id: 't1', name: 'John Doe', role: 'Account Manager' }
    ],
    contacts: [],
    checklist: [
      { id: 'entry_point', label: 'Entry Point', completed: true, notes: '' },
      { id: 'exchange', label: 'Exchange', completed: true, notes: '' },
      { id: 'proposal', label: 'Proposal', completed: true, notes: '' },
      { id: 'validation', label: 'Validation', completed: true, notes: 'Negotiating terms.' },
      { id: 'client_success', label: 'Client Success', completed: false, notes: '' },
    ],
    activities: [],
    documents: [],
    createdAt: '2023-09-10T00:00:00Z'
  }
];
