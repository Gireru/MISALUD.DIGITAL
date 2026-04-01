import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, Users, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/staff', label: 'Mission Control', icon: LayoutDashboard },
  { path: '/patients', label: 'Pacientes', icon: Users },
  { path: '/register', label: 'Registro', icon: QrCode },
];

export default function AppLayout() {
  const location = useLocation();

  // Patient-facing views have no sidebar
  if (location.pathname.startsWith('/patient/') || location.pathname === '/mis-trayectos') {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex bg-background font-body">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card p-6">
        <Link to="/staff" className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg leading-none">SD-NEXUS</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Atención 360°</p>
          </div>
        </Link>

        <nav className="space-y-1 flex-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t text-xs text-muted-foreground">
          <p>SD-NEXUS v1.0</p>
          <p className="mt-0.5">Salud Digna · 2026</p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-sm">SD-NEXUS</span>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t flex items-center justify-around z-40">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center gap-0.5">
              <Icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-[10px]', isActive ? 'text-primary font-medium' : 'text-muted-foreground')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:p-0 pt-14 pb-16 md:pt-0 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}