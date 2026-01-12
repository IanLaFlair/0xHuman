import React from 'react';
import ReactMarkdown from 'react-markdown';
import { getDocContent } from '@/lib/docs';
import { notFound } from 'next/navigation';
import remarkGfm from 'remark-gfm';
import RoadmapTimeline from '@/components/RoadmapTimeline';

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  
  // Special case: roadmap page uses custom timeline component
  if (slug && slug.length === 1 && slug[0] === 'roadmap') {
    return (
      <article className="max-w-none">
        <RoadmapTimeline />
      </article>
    );
  }

  const doc = getDocContent(slug || []);

  if (!doc) {
    notFound();
  }

  return (
    <article className="max-w-none">
      {/* 
        We can optionally render the title from frontmatter if it exists, 
        but usually the markdown has a # Title 
      */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom components to match the cyberpunk vibe
          h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-primary mb-6 tracking-tight" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-2xl font-semibold text-white mt-8 mb-4 border-b border-gray-800 pb-2" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-xl font-medium text-accent-green mt-6 mb-3" {...props} />,
          p: ({node, ...props}) => <p className="text-gray-300 leading-relaxed mb-4" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 mb-4 text-gray-300" {...props} />,
          li: ({node, ...props}) => <li className="marker:text-primary" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic text-gray-400 my-4 bg-gray-900/50 p-4 rounded-r" {...props} />,
          code: ({node, ...props}) => {
             // @ts-ignore
             const {inline, className, children} = props;
             if (inline) {
               return <code className="bg-gray-800 text-primary px-1 py-0.5 rounded text-sm font-mono" {...props} />
             }
             return <code className="block bg-black border border-gray-800 p-4 rounded text-sm font-mono overflow-x-auto text-gray-300 my-4" {...props} />
          },
          img: ({node, ...props}) => <img className="rounded-lg border border-gray-800 shadow-lg my-6" {...props} />,
          a: ({node, ...props}) => <a className="text-primary hover:underline transition-colors" {...props} />,
          table: ({node, ...props}) => <div className="overflow-x-auto my-6"><table className="min-w-full divide-y divide-gray-800" {...props} /></div>,
          th: ({node, ...props}) => <th className="px-6 py-3 bg-gray-900 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" {...props} />,
          td: ({node, ...props}) => <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 border-b border-gray-800" {...props} />,
        }}
      >
        {doc.content}
      </ReactMarkdown>
    </article>
  );
}
