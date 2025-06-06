import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '../types';
import users from '../data/users.json';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Find user with matching email and password
      const foundUser = users.users.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        u.password === password
      );
      
      if (!foundUser) {
        throw new Error('Invalid credentials');
      }

      const authenticatedUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        username: foundUser.email.split('@')[0],
        email: foundUser.email,
        isAdmin: foundUser.isAdmin,
        avatarUrl: `https://i.pravatar.cc/150?u=${foundUser.email}`
      };
      
      setUser(authenticatedUser);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const userExists = users.users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (!userExists) {
        throw new Error('User not found');
      }
      
      // In a real app, this would send a reset email
      console.log(`Password reset email would be sent to ${email}`);
    } catch (error) {
      console.error('Reset password failed:', error);
      throw new Error('Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      logout, 
      resetPassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
};