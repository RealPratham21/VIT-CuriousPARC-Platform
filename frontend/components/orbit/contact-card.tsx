'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Linkedin, MessageCircle, Mail, Phone, Star, Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastActions } from './toast-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Contact } from '@/lib/mock-data'

interface ContactCardProps {
  contact: Contact
  onEdit: () => void
  onDelete: () => void
}

export function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  const toast = useToastActions()
  const [copiedField, setCopiedField] = useState<'email' | 'phone' | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  const copyToClipboard = async (text: string, field: 'email' | 'phone') => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success(`${field === 'email' ? 'Email' : 'Phone'} copied!`)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const initials = contact.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const statusConfig = {
    active: { label: 'Active', class: 'badge-success' },
    inactive: { label: 'Inactive', class: 'badge-neutral' },
    churned: { label: 'Churned', class: 'badge-critical' },
  }

  // Use 'active' as default if status doesn't exist on contact
  const contactStatus = (contact as Contact & { status?: 'active' | 'inactive' | 'churned' }).status || 'active'
  const status = statusConfig[contactStatus]

  return (
    <motion.div
      className="card-surface p-4 relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      {/* Quick actions - top right on hover */}
      <motion.div
        className="absolute top-2 right-2 flex items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.15 }}
      >
        <button
          onClick={() => copyToClipboard(contact.email, 'email')}
          className="p-1.5 rounded-md bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Copy email"
        >
          {copiedField === 'email' ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
        {contact.linkedIn && (
          <a
            href={contact.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md bg-secondary/80 hover:bg-[#0077B5] hover:text-white text-muted-foreground transition-colors"
            title="LinkedIn"
          >
            <Linkedin className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={() => window.open(`mailto:${contact.email}`, '_blank')}
          className="p-1.5 rounded-md bg-secondary/80 hover:bg-primary hover:text-white text-muted-foreground transition-colors"
          title="Send email"
        >
          <Mail className="w-3.5 h-3.5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-md bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Avatar and info */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0',
          contact.isPrimary 
            ? 'bg-primary/10 text-primary ring-2 ring-primary/30' 
            : 'bg-muted text-muted-foreground'
        )}>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground truncate">{contact.name}</h4>
            {contact.isPrimary && (
              <Star className="w-3.5 h-3.5 text-primary fill-primary shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{contact.role}</p>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', status.class)}>
              {status.label}
            </span>
            {contact.isPrimary && (
              <span className="text-[10px] text-muted-foreground">
                Primary Contact
              </span>
            )}
            {contact.isChampion && (
              <span className="text-[10px] text-primary font-medium">
                Champion
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contact details - show on hover */}
      <motion.div
        className="mt-3 pt-3 border-t border-border/50 space-y-1.5"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: isHovered ? 1 : 0.6, height: 'auto' }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="w-3 h-3 shrink-0" />
          <span className="truncate">{contact.email}</span>
        </div>
        {contact.phone && (
          <button 
            onClick={() => copyToClipboard(contact.phone!, 'phone')}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          >
            <Phone className="w-3 h-3 shrink-0" />
            <span>{contact.phone}</span>
            {copiedField === 'phone' && (
              <Check className="w-3 h-3 text-success ml-auto" />
            )}
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}
