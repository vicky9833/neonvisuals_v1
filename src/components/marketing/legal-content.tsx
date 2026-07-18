"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Prose style map for legal pages (Privacy / Terms) — server-data-free static content. */
const COMPONENTS: Components = {
  h2: ({ children }) => (
    <h2 className="font-heading mt-10 mb-3 text-2xl font-bold text-navy">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-heading mt-6 mb-2 text-lg font-semibold text-navy">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-4 text-base leading-[1.8] text-[#333333]">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-5 ml-5 list-disc space-y-2 text-[#333333]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 ml-5 list-decimal space-y-2 text-[#333333]">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-navy">{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} className="text-gold underline hover:text-gold/80">
      {children}
    </a>
  ),
};

export function LegalContent({ markdown }: { markdown: string }) {
  return (
    <div className="mt-8">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
