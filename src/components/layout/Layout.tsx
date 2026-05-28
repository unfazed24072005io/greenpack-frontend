// Greenpack Pro — Main Layout with Sidebar (Firebase Version)
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Plus, ClipboardList, BookTemplate,
  Package, FileText, Settings, LogOut, HelpCircle,
  ChevronLeft, ChevronRight, Wifi, WifiOff, Grid3x3, Layers,
  Palette, ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/new-inspection', icon: Plus, label: 'New Inspection', highlight: true },
  { to: '/multi-up/new', icon: Layers, label: 'Multi-Up Sheet', highlight: true },
  { to: '/prepress/trial', icon: ShieldCheck, label: 'Prepress (Trial)', highlight: true, badge: 'NEW' },
  { to: '/prepress/pantone', icon: Palette, label: 'Pantone ID', highlight: true, badge: 'NEW' },
  { to: '/jobs', icon: ClipboardList, label: 'All Jobs' },
  { to: '/templates', icon: BookTemplate, label: 'Templates' },
  { to: '/batch', icon: Package, label: 'Batch Queue' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [online, setOnline] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Check online status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch user data from Firestore
  useEffect(() => {
    async function fetchUserData() {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (err) {
          console.error('Failed to fetch user data:', err);
        }
      }
    }
    fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get user display name
  const userDisplayName = userData?.full_name || userData?.companyName || user?.email || 'User';
  const userInitial = userDisplayName.charAt(0).toUpperCase();
  const userRole = userData?.role || 'operator';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col bg-[#0D1B2A] text-white transition-all duration-200 shrink-0',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className="flex items-center px-4 py-4 border-b border-white/10 h-16">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#00C2CB] rounded-lg flex items-center justify-center text-black font-bold text-sm">GP</div>
              <span className="font-bold text-white text-sm">Greenpack Pro</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-[#00C2CB] rounded-lg flex items-center justify-center text-black font-bold text-sm mx-auto">GP</div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, highlight, badge }: any) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#1A73E8] text-white'
                    : highlight
                    ? 'bg-[#00C2CB]/20 text-[#00C2CB] hover:bg-[#00C2CB]/30'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-yellow-400 text-black rounded">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Status + User */}
        <div className="border-t border-white/10 p-3 space-y-2">
          {/* Connection status - Firebase is always "online" if connected */}
          <div className={clsx('flex items-center gap-2 text-xs px-2', collapsed && 'justify-center')}>
            {online ? (
              <><Wifi size={14} className="text-green-400" />{!collapsed && <span className="text-green-400">Online</span>}</>
            ) : (
              <><WifiOff size={14} className="text-yellow-400" />{!collapsed && <span className="text-yellow-400">Offline</span>}</>
            )}
          </div>

          {/* User */}
          {!collapsed && (
            <div className="flex items-center gap-2 px-2">
              <div className="w-7 h-7 rounded-full bg-[#1A73E8] flex items-center justify-center text-xs font-bold">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{userDisplayName}</div>
                <div className="text-xs text-gray-400 capitalize">{userRole}</div>
              </div>
              <button onClick={handleLogout} className="text-gray-400 hover:text-white p-1">
                <LogOut size={14} />
              </button>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-1 text-gray-400 hover:text-white"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}