"use client";

import Image from "next/image";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Branded Markdown renderer. Styles are applied via component overrides so we
 * don't depend on the Tailwind typography plugin. */
const components: Components = {
  h1: ({ children }) => (
    <h2 className="font-heading mt-10 mb-4 text-2xl font-bold text-navy">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h2 className="font-heading mt-10 mb-4 text-2xl font-bold text-navy">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-heading mt-8 mb-3 text-xl font-semibold text-navy">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-5 text-base leading-relaxed text-[#2D2D2D]">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-5 ml-5 list-disc space-y-2 text-[#2D2D2D]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 ml-5 list-decimal space-y-2 text-[#2D2D2D]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-navy">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-4 border-gold bg-secondary/40 px-5 py-3 text-lg italic text-navy">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => {
    const url = href ?? "#";
    if (url.startsWith("/")) {
      return (
        <Link href={url} className="font-medium text-gold underline underline-offset-2">
          {children}
        </Link>
      );
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-gold underline underline-offset-2"
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => {
    if (typeof src !== "string") return null;
    return (
      <figure className="my-8">
        <Image
          src={src}
          alt={alt ?? ""}
          width={1200}
          height={700}
          unoptimized
          sizes="(max-width: 768px) 100vw, 768px"
          loading="lazy"
          className="h-auto w-full rounded-xl border border-[#EDE9E3] object-cover"
        />
        {alt ? (
          <figcaption className="mt-2 text-center text-sm text-[#9CA3AF]">
            {alt}
          </figcaption>
        ) : null}
      </figure>
    );
  },
  hr: () => <hr className="my-8 border-border" />,
  code: ({ children }) => (
    <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm text-navy">
      {children}
    </code>
  ),
};

export function BlogContent({ content }: { content: string }) {
  return (
    <div className="blog-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
