import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Shirt, Heart, LogOut, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Minha Coleção', href: '/collection', icon: Shirt },
    { name: 'Wishlist', href: '/wishlist', icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile menu */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-card border-b border-border px-4 py-3 text-foreground">
          <span className="text-xl font-bold tracking-tight">Meu Armário</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        
        {isMobileMenuOpen && (
          <div className="absolute inset-x-0 top-[52px] z-50 bg-card border-b border-border px-4 pb-4 shadow-xl">
            <nav className="flex flex-col space-y-2 mt-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut size={20} />
                <span>Sair</span>
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-card lg:pt-5 lg:pb-4">
        <div className="flex flex-shrink-0 items-center justify-between px-6">
          <span className="text-2xl font-bold tracking-tight text-foreground">Meu Armário</span>
          <ThemeToggle />
        </div>
        <div className="mt-8 flex flex-1 flex-col overflow-y-auto">
          <nav className="flex-1 space-y-1 px-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center space-x-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Icon 
                    size={20} 
                    className={cn(
                      "flex-shrink-0",
                      isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )} 
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-shrink-0 border-t border-border p-4">
          <div className="group block w-full flex-shrink-0">
            <div className="flex items-center">
              <div>
                <img
                  className="inline-block h-9 w-9 rounded-full"
                  src={user?.photoURL || 'https://via.placeholder.com/150'}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground group-hover:text-foreground/80">
                  {user?.displayName || 'Usuário'}
                </p>
                <button
                  onClick={logout}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <main className="flex-1 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
