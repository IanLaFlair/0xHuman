'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';

interface SidebarItem {
  title: string;
  href: string;
}

interface SidebarSection {
  title: string;
  href?: string;
  items: SidebarItem[];
}

export default function DocsSidebar({ sidebar }: { sidebar: SidebarSection[] }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden p-4 border-b border-gray-800 flex items-center justify-between bg-black sticky top-0 z-30">
        <span className="font-bold text-primary tracking-wider">DOCS NAVIGATION</span>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-white hover:text-primary transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-[60px] md:top-0 left-0 h-[calc(100vh-60px)] md:h-screen w-full md:w-64 
        bg-black border-r border-gray-800 p-6 flex-shrink-0 overflow-y-auto transition-transform duration-300 z-20
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Back to main site */}
        <Link 
          href="/" 
          className="hidden md:flex items-center gap-2 text-xs text-gray-500 hover:text-primary transition-colors mb-6"
        >
          <span>←</span>
          <span>Back to 0xHuman</span>
        </Link>

        <div className="mb-8 hidden md:block">
          <h2 className="text-xl font-bold text-primary tracking-wider mb-2">DOCS</h2>
          <div className="h-0.5 w-12 bg-primary"></div>
        </div>
        
        <nav className="space-y-8 pb-20 md:pb-0">
          {sidebar.map((section, idx) => (
            <div key={idx}>
              {section.href ? (
                 <Link 
                   href={section.href} 
                   className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 hover:text-primary transition-colors"
                   onClick={() => setIsSidebarOpen(false)}
                 >
                   {section.title}
                 </Link>
              ) : (
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
              )}
              
              {section.items.length > 0 && (
                <ul className="space-y-2 ml-2 border-l border-gray-800 pl-4">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx}>
                      <Link 
                        href={item.href}
                        className="text-sm text-gray-300 hover:text-primary transition-colors block py-1 flex items-center gap-2"
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <ChevronRight className="w-3 h-3 text-gray-600" />
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
