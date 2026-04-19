// 主布局组件

import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Filter,
  Bell,
  Settings,
  TrendingUp,
  Cloud,
  CloudOff,
  LogOut,
  User,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: '总览', icon: LayoutDashboard },
  { path: '/portfolio', label: '持仓', icon: Briefcase },
  { path: '/analysis', label: '分析', icon: Sparkles },
  { path: '/screener', label: '筛选', icon: Filter },
  { path: '/alerts', label: '提醒', icon: Bell },
  { path: '/settings', label: '设置', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, authMode, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">投资助手</span>
          </Link>

          <div className="flex items-center gap-4">
            {/* GitHub 链接 */}
            <a
              href="https://github.com/gallifreycar/stock-helper"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-900 transition-colors"
              title="GitHub 仓库"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23.975 1.635 2.595 1.185 3.225.9.105-.72.42-1.185.765-1.455-2.67-.3-5.37-1.35-5.37-5.955 0-1.32.48-2.4 1.23-3.24-.12-.3-.54-1.56.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.88.12 3.18.765.84 1.23 1.92 1.23 3.24 0 4.635-2.715 5.655-5.37 5.955.42.36.81 1.08.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>

            {/* 用户信息 / 同步状态 */}
            {authMode === 'online' && user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <Cloud className="w-4 h-4" />
                  <span>云端同步</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{user.email}</span>
                </div>
                <button
                  onClick={signOut}
                  className="text-gray-500 hover:text-red-600"
                  title="登出"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <CloudOff className="w-4 h-4" />
                <span>离线模式</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <ul className="flex gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}