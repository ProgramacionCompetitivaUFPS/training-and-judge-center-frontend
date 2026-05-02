import { ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Code2 } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

const imageModules = import.meta.glob('@/assets/carrusel/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
})
const IMAGES = Object.values(imageModules) as string[]


export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent(prev => (prev + 1) % IMAGES.length)
    }, 20000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-x-hidden overflow-y-auto">
      {/* Background carousel */}
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${src})`,
            opacity: i === current ? 1 : 0,
          }}
        />
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-neutral-text-primary/60" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-xl">

        <div className="space-y-6">
          <div className="text-center">
            <Link
              to={ROUTES.HOME}
              className="inline-flex items-center gap-3"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.7))' }}
            >
              <Code2 className="h-9 w-9 text-brand-primary" />
              <span className="text-3xl font-extrabold text-white tracking-tight">Training Center</span>
            </Link>
          </div>

          <div className="bg-dot-grid shadow-elevation-3 rounded-none p-10 animate-fade-in-up">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-extrabold text-neutral-text-primary">{title}</h1>
              {subtitle && (
                <p className="mt-1.5 text-sm text-neutral-text-muted">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
