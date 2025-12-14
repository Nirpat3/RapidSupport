import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'customer';
  status: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check if user is already authenticated on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    console.log('[Login] Attempting login for:', email);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      console.log('[Login] Response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('[Login] Success! User:', data.user?.email);
        setUser(data.user);
        toast({
          title: "Login successful",
          description: `Welcome back, ${data.user.name}!`
        });
        // Use wouter navigation instead of full page reload to avoid 404 flash
        setLocation('/dashboard');
        return true;
      } else {
        const errorData = await response.json();
        console.log('[Login] Failed:', response.status, errorData);
        toast({
          title: "Login failed",
          description: errorData.error || "Invalid credentials",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('[Login] Network error:', error);
      toast({
        title: "Login failed",
        description: "Network error. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast, setLocation]);

  const logout = async (): Promise<void> => {
    try {
      await apiRequest('/api/auth/logout', 'POST');
      
      setUser(null);
      queryClient.clear();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
