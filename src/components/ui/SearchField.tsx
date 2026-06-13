import { HiOutlineSearch } from 'react-icons/hi'
import { cn } from '@/lib/utils'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchField({ value, onChange, placeholder = 'Search...', className }: SearchFieldProps) {
  return (
    <div className={cn('relative flex-1', className)}>
      <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-base pl-9"
      />
    </div>
  )
}
