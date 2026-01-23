export const motion = {
  fast: 'duration-100 ease-out',
  base: 'duration-200 ease-out',
  smooth: 'duration-300 ease-out',
  spring: 'duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
} as const

export const transitions = {
  fadeIn: 'animate-in fade-in',
  fadeOut: 'animate-out fade-out',
  slideInFromTop: 'animate-in slide-in-from-top-2',
  slideInFromBottom: 'animate-in slide-in-from-bottom-2',
  slideInFromLeft: 'animate-in slide-in-from-left-2',
  slideInFromRight: 'animate-in slide-in-from-right-2',
  zoomIn: 'animate-in zoom-in-95',
  zoomOut: 'animate-out zoom-out-95',
} as const

export const hover = {
  lift: 'hover:-translate-y-0.5 hover:shadow-md',
  glow: 'hover:shadow-[0_0_15px_-3px_var(--color-primary)]',
  scale: 'hover:scale-[1.02]',
  brighten: 'hover:brightness-110',
} as const

export const focus = {
  ring: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  subtle: 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
} as const
