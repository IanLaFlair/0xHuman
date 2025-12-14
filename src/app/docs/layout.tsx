import Link from 'next/link';
import { getSidebarContent } from '@/lib/docs';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = getSidebarContent();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-gray-800 p-6 flex-shrink-0">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-primary tracking-wider mb-2">DOCS</h2>
          <div className="h-0.5 w-12 bg-primary"></div>
        </div>
        
        <nav className="space-y-8">
          {sidebar.map((section, idx) => (
            <div key={idx}>
              {section.href ? (
                 <Link href={section.href} className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 hover:text-primary transition-colors">
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
                        className="text-sm text-gray-300 hover:text-primary transition-colors block py-1"
                      >
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

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
