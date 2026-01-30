
import { User } from '../types';

export const MOCK_USERS = [
    {
        name: 'Mathis',
        email: 'mathis@sapro.fr',
        role: 'Account Executive',
        avatarUrl: 'https://ui-avatars.com/api/?name=Mathis&background=ea580c&color=fff'
    },
    {
        name: 'Martial',
        email: 'martial@sapro.fr',
        role: 'Sales Manager',
        avatarUrl: 'https://ui-avatars.com/api/?name=Martial&background=1e293b&color=fff'
    },
    {
        name: 'Hugo',
        email: 'hugo@sapro.fr',
        role: 'Customer Success',
        avatarUrl: 'https://ui-avatars.com/api/?name=Hugo&background=059669&color=fff'
    }
];

export const authService = {
    login: async (email: string, pass: string): Promise<User> => {
         // Mock Login
         await new Promise(r => setTimeout(r, 600)); // Simulate delay
         
         // Check if we have a stored session to preserve preferences like "isAway"
         const stored = localStorage.getItem('lexia_mock_session');
         let existingUser = stored ? JSON.parse(stored) : null;

         const demoUser = MOCK_USERS.find(u => u.email === email);
         
         const user: User = {
             id: demoUser ? email : 'mock-user-id',
             email: email,
             name: demoUser?.name || email.split('@')[0],
             avatarUrl: demoUser?.avatarUrl || `https://ui-avatars.com/api/?name=${email}`,
             role: demoUser?.role || 'User',
             // Preserve existing flags or default
             isAway: existingUser?.email === email ? existingUser.isAway : false,
             returnDate: existingUser?.email === email ? existingUser.returnDate : undefined,
             lastLoginDate: new Date().toISOString(), // Update login time
             customAppLogo: existingUser?.email === email ? existingUser.customAppLogo : undefined
         };

         localStorage.setItem('lexia_mock_session', JSON.stringify(user));
         window.dispatchEvent(new Event('user-updated'));
         return user;
    },

    signUp: async (email: string, pass: string, name: string): Promise<User> => {
        // Mock Sign Up
        await new Promise(r => setTimeout(r, 600));
        const user: User = {
            id: `mock-${Date.now()}`,
            email,
            name,
            avatarUrl: `https://ui-avatars.com/api/?name=${name}`,
            role: 'User',
            lastLoginDate: new Date().toISOString()
        };
        localStorage.setItem('lexia_mock_session', JSON.stringify(user));
        window.dispatchEvent(new Event('user-updated'));
        return user;
    },

    updateProfile: async (updates: Partial<User>): Promise<User> => {
        const current = authService.getCurrentUser();
        if (!current) throw new Error("No session");
        
        const updatedUser = { ...current, ...updates };
        localStorage.setItem('lexia_mock_session', JSON.stringify(updatedUser));
        
        // Notify app to refresh UI
        window.dispatchEvent(new Event('user-updated'));
        
        return updatedUser;
    },

    logout: async () => {
        localStorage.removeItem('lexia_mock_session');
        window.location.reload();
    },

    getCurrentUser: (): User | null => {
        const stored = localStorage.getItem('lexia_mock_session');
        return stored ? JSON.parse(stored) : null;
    }
};
