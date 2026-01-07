

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { User } from '@/types';
import { useToast } from './use-toast';
import { apiFetch } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    loading: boolean;
    users: User[];
    createUser: (username: string, password: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const { toast } = useToast();

    const { data: users = [], isLoading: isUsersLoading } = useQuery<User[]>({
        queryKey: ['users'],
        queryFn: () => apiFetch('/api/users'),
    });

    useEffect(() => {
        const initializeAuth = () => {
            try {
                const storedUser = sessionStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                sessionStorage.removeItem('user');
            } finally {
                setAuthLoading(false);
            }
        };
        initializeAuth();
    }, []);

    const loginMutation = useMutation({
        mutationFn: (credentials: {username: string, password: string}) => apiFetch<User>('/api/auth/login', {
            method: 'POST',
            body: credentials,
        }),
        onSuccess: (authenticatedUser) => {
            setUser(authenticatedUser);
            sessionStorage.setItem('user', JSON.stringify(authenticatedUser));
            toast({ title: 'Login Successful', description: 'Welcome back!' });
        },
        onError: () => {
             toast({
                variant: 'destructive',
                title: 'Login Failed',
                description: 'Invalid username or password.',
            });
        }
    });

    const createUserMutation = useMutation({
        mutationFn: (credentials: {username: string, password: string}) => apiFetch<User>('/api/users', {
            method: 'POST',
            body: credentials,
        }),
        onSuccess: (newUser) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast({
                title: 'User Added',
                description: `User '${newUser.username}' has been created successfully.`,
            });
        },
        onError: (error: any) => {
             toast({
                variant: 'destructive',
                title: 'Failed to Add User',
                description: error.message || 'An unexpected error occurred.',
            });
            throw error;
        }
    });

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            await loginMutation.mutateAsync({ username, password });
            return true;
        } catch (error) {
            return false;
        }
    };
    
    const logout = () => {
        setUser(null);
        sessionStorage.removeItem('user');
        queryClient.clear();
        router.push('/login');
    };
    
    const createUser = (username: string, password: string) => {
        return createUserMutation.mutateAsync({ username, password });
    }

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated: !!user, 
            user, 
            loading: authLoading || isUsersLoading, 
            login, 
            logout, 
            users, 
            createUser 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
