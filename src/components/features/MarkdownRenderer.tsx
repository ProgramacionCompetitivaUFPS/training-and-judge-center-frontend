import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import type { Components } from 'react-markdown'
import { cn } from '@/lib/utils'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/stackoverflow-light.css'
import './markdown.css'

interface MarkdownRendererProps {
  content: string
  className?: string
}

const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/
const VIMEO_REGEX = /vimeo\.com\/(\d+)/

function extractVideoId(url: string): { type: 'youtube' | 'vimeo'; id: string } | null {
  const yt = YOUTUBE_REGEX.exec(url)
  if (yt) return { type: 'youtube', id: yt[1] }
  const vm = VIMEO_REGEX.exec(url)
  if (vm) return { type: 'vimeo', id: vm[1] }
  return null
}

const components: Components = {
  a({ href, children, ...props }) {
    if (!href) return <a {...props}>{children}</a>
    const video = extractVideoId(href)
    if (video) {
      const src = video.type === 'youtube'
        ? `https://www.youtube-nocookie.com/embed/${video.id}`
        : `https://player.vimeo.com/video/${video.id}`
      return (
        <span className="block my-6">
          <iframe
            src={src}
            className="w-full aspect-video rounded-xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={typeof children === 'string' ? children : 'Video'}
            loading="lazy"
          />
        </span>
      )
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    )
  },
  img({ src, alt, ...props }) {
    return <img src={src} alt={alt ?? ''} loading="lazy" {...props} />
  },
}

/**
 * Normalizes LaTeX delimiters to the $...$ / $$...$$ format
 * that remark-math expects.
 * Handles \(...\) → $...$ and \[...\] → $$...$$
 * Supports both single and double backslash variants.
 */
function normalizeLatex(text: string): string {
  return text
    .replace(/\\{1,2}\[([\s\S]*?)\\{1,2}\]/g, (_match, p1) => `$$${p1.trim()}$$`)
    .replace(/\\{1,2}\(([\s\S]*?)\\{1,2}\)/g, (_match, p1) => `$${p1.trim()}$`)
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], [])
  const rehypePlugins = useMemo(() => [rehypeKatex, rehypeHighlight], [])
  const normalized = useMemo(() => normalizeLatex(content), [content])

  return (
    <div className={cn('markdown-body', className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {normalized}
      </ReactMarkdown>
    </div>
  )
}
