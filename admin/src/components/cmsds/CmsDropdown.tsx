import * as React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { CmsButton } from './CmsButton'
import { MoreHorizontal } from 'lucide-react'

export interface CmsDropdownAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

export interface CmsDropdownProps {
  actions: (CmsDropdownAction | 'separator')[]
  trigger?: React.ReactNode
  align?: 'start' | 'center' | 'end'
}

export function CmsDropdown({ actions, trigger, align = 'end' }: CmsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <CmsButton variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open menu</span>
          </CmsButton>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        {actions.map((action, index) => {
          if (action === 'separator') {
            return <DropdownMenuSeparator key={`sep-${index}`} />
          }

          return (
            <DropdownMenuItem
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              className={
                action.variant === 'danger'
                  ? 'text-destructive focus:text-destructive'
                  : undefined
              }
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
