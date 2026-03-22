import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Components } from 'react-markdown'
import { cn } from '@/lib/utils'
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

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const plugins = useMemo(() => [remarkGfm], [])
  const rehypePlugins = useMemo(() => [rehypeHighlight], [])

  return (
    <div className={cn('markdown-body', className)}>
      <ReactMarkdown remarkPlugins={plugins} rehypePlugins={rehypePlugins} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
