'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Don't check auth on login page
    if (pathname === '/admin') {
      setIsChecking(false);
      return;
    }

    // Check if admin is authenticated
    const checkAuth = () => {
      const authenticated = localStorage.getItem('admin_authenticated');
      const authTime = localStorage.getItem('admin_auth_time');
      
      if (!authenticated || authenticated !== 'true') {
        router.push('/admin');
        return;
      }

      // Check if session is still valid (24 hours)
      if (authTime) {
        const authTimestamp = parseInt(authTime);
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (now - authTimestamp > twentyFourHours) {
          localStorage.removeItem('admin_authenticated');
          localStorage.removeItem('admin_auth_time');
          router.push('/admin');
          return;
        }
      }

      setIsAuthenticated(true);
      setIsChecking(false);
    };

    checkAuth();
  }, [pathname, router]);

  if (pathname === '/admin') {
    return <>{children}</>;
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Проверка доступа...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

