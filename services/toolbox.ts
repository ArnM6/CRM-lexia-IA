
export interface ToolboxItem {
    id: string;
    name: string;
    type: 'pdf' | 'image' | 'sheet' | 'doc' | 'other';
    url: string; // Base64 or URL
    size: string;
    createdAt: string;
}

const STORAGE_KEY = 'lexia_toolbox_items';

const MOCK_ITEMS: ToolboxItem[] = [
    { id: '1', name: 'Company_Brochure.pdf', type: 'pdf', url: '', size: '2.4 MB', createdAt: new Date().toISOString() },
    { id: '2', name: 'Service_Agreement_v2.docx', type: 'doc', url: '', size: '1.1 MB', createdAt: new Date().toISOString() },
    { id: '3', name: 'Pricing_2024.xlsx', type: 'sheet', url: '', size: '500 KB', createdAt: new Date().toISOString() }
];

export const toolboxService = {
    getAll: (): ToolboxItem[] => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : MOCK_ITEMS;
    },

    add: (file: File): Promise<ToolboxItem> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newItem: ToolboxItem = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    type: getFileType(file.type),
                    url: reader.result as string,
                    size: formatSize(file.size),
                    createdAt: new Date().toISOString()
                };
                const items = toolboxService.getAll();
                const newItems = [newItem, ...items];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
                resolve(newItem);
            };
            reader.readAsDataURL(file);
        });
    },

    delete: (id: string) => {
        const items = toolboxService.getAll().filter(i => i.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
};

function getFileType(mime: string): ToolboxItem['type'] {
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('image')) return 'image';
    if (mime.includes('sheet') || mime.includes('excel')) return 'sheet';
    if (mime.includes('word') || mime.includes('document')) return 'doc';
    return 'other';
}

function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
