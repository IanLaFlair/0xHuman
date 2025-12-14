import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const docsDirectory = path.join(process.cwd(), 'docs');

export interface DocSection {
    title: string;
    href?: string;
    items: {
        title: string;
        href: string;
    }[];
}

export function getSidebarContent(): DocSection[] {
    const summaryPath = path.join(docsDirectory, 'SUMMARY.md');

    if (!fs.existsSync(summaryPath)) {
        return [];
    }

    const fileContents = fs.readFileSync(summaryPath, 'utf8');
    const lines = fileContents.split('\n');

    const sections: DocSection[] = [];
    let currentSection: DocSection | null = null;

    lines.forEach(line => {
        const trimmed = line.trim();

        if (trimmed.startsWith('* [')) {
            const match = trimmed.match(/\* \[(.*?)\]\((.*?)\)/);
            if (match) {
                const title = match[1];
                const href = match[2].replace('README.md', '').replace('.md', '');
                const fullHref = href === 'README' || href === '' ? '/docs' : `/docs/${href}`;

                if (!line.startsWith('    ')) {
                    // Top level section
                    currentSection = {
                        title,
                        href: fullHref,
                        items: []
                    };
                    sections.push(currentSection);
                } else if (currentSection) {
                    // Sub-item
                    currentSection.items.push({
                        title,
                        href: fullHref
                    });
                }
            }
        }
    });

    return sections;
}

export function getDocContent(slug: string[]) {
    // If slug is empty or undefined, it's the root README
    const isRoot = !slug || slug.length === 0;

    let relativePath = '';
    if (isRoot) {
        relativePath = 'README.md';
    } else {
        // Check if it's a directory (needs README.md) or a file
        const potentialPath = slug.join('/');

        // Try file.md
        if (fs.existsSync(path.join(docsDirectory, `${potentialPath}.md`))) {
            relativePath = `${potentialPath}.md`;
        }
        // Try directory/README.md
        else if (fs.existsSync(path.join(docsDirectory, potentialPath, 'README.md'))) {
            relativePath = path.join(potentialPath, 'README.md');
        }
        else {
            return null;
        }
    }

    const fullPath = path.join(docsDirectory, relativePath);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    const { content, data } = matter(fileContents);

    return {
        content,
        frontmatter: data
    };
}
