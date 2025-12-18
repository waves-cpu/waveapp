'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateUser, addUser, fetchAllUsers, type User } from '@/lib/inventory-service';


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
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);

    const refreshUsers = useCallback(async () => {
        try {
            const allUsers = await fetchAllUsers();
            setUsers(allUsers);
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const storedUser = sessionStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.error("Failed to parse user from sessionStorage", error);
                sessionStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        };
        
        initializeAuth();
        refreshUsers();

    }, [refreshUsers]);

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const authenticatedUser = await authenticateUser(username, password);
            if (authenticatedUser) {
                setUser(authenticatedUser);
                sessionStorage.setItem('user', JSON.stringify(authenticatedUser));
                return true;
            }
            return false;
        } catch(error) {
            console.error("Login error:", error);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        sessionStorage.removeItem('user');
    };
    
    const createUser = async (username: string, password: string) => {
        const newUser = await addUser(username, password);
        await refreshUsers();
        return newUser;
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!user, user, loading, login, logout, users, createUser }}>
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
