import { getSidebarContent } from '@/lib/docs';
import DocsSidebar from '@/components/DocsSidebar';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = getSidebarContent();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black text-white relative">
      <DocsSidebar sidebar={sidebar} />

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto w-full">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
