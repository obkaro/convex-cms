import { useState, useCallback, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { CmsButton } from '~/components/cmsds/CmsButton'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '~/components/ui/command'
import { Badge } from '~/components/ui/badge'
import { Checkbox } from '~/components/ui/checkbox'
import { cn } from '~/lib/cn'
import { Tags, ChevronDown, X, Check } from 'lucide-react'

interface TaxonomyTerm {
  _id: string
  name: string
  slug: string
  color?: string
  usageCount: number
}

export interface TaxonomyFilterProps {
  selectedTermIds: string[]
  onChange: (termIds: string[]) => void
  taxonomyId?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TaxonomyFilter({
  selectedTermIds,
  onChange,
  taxonomyId,
  placeholder = 'Filter by tags...',
  disabled = false,
  className,
}: TaxonomyFilterProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const taxonomiesResult = useQuery(api.taxonomies.list, { isActive: true })
  const taxonomies = taxonomiesResult?.page ?? []

  const activeTaxonomy = useMemo(() => {
    if (taxonomyId) {
      return taxonomies.find((t) => t._id === taxonomyId)
    }
    return null
  }, [taxonomyId, taxonomies])

  const targetTaxonomyId = taxonomyId ?? taxonomies[0]?._id

  const termsResult = useQuery(
    api.taxonomies.listTerms,
    targetTaxonomyId
      ? {
          taxonomyId: targetTaxonomyId,
          paginationOpts: { numItems: 200, cursor: null },
        }
      : 'skip'
  )
  const terms = (termsResult?.page ?? []) as TaxonomyTerm[]

  const selectedTermsDetails = useMemo(() => {
    return terms.filter((t) => selectedTermIds.includes(t._id))
  }, [terms, selectedTermIds])

  const filteredTerms = useMemo(() => {
    if (!search.trim()) return terms
    const lowerSearch = search.toLowerCase()
    return terms.filter((term) => term.name.toLowerCase().includes(lowerSearch))
  }, [terms, search])

  const handleToggleTerm = useCallback(
    (termId: string) => {
      if (selectedTermIds.includes(termId)) {
        onChange(selectedTermIds.filter((id) => id !== termId))
      } else {
        onChange([...selectedTermIds, termId])
      }
    },
    [selectedTermIds, onChange]
  )

  const handleClear = useCallback(() => {
    onChange([])
    setOpen(false)
  }, [onChange])

  const handleRemoveTerm = useCallback(
    (termId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(selectedTermIds.filter((id) => id !== termId))
    },
    [selectedTermIds, onChange]
  )

  const displayTaxonomyName = activeTaxonomy?.displayName ?? taxonomies[0]?.displayName ?? 'Tags'
  const isLoading = taxonomiesResult === undefined || (!!targetTaxonomyId && termsResult === undefined)
  const hasNoTaxonomies = taxonomies.length === 0 && taxonomiesResult !== undefined

  if (hasNoTaxonomies) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <CmsButton
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            'h-9 min-w-[140px] justify-between gap-2',
            selectedTermIds.length > 0 && 'border-primary/50',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <Tags className="size-4 text-muted-foreground" />
            {selectedTermIds.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selectedTermIds.length === 1 ? (
              <span className="max-w-[100px] truncate">
                {selectedTermsDetails[0]?.name ?? 'Tag'}
              </span>
            ) : (
              <span>{selectedTermIds.length} tags</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selectedTermIds.length > 0 && (
              <Badge
                variant="secondary"
                className="size-5 rounded-full p-0 text-xs"
              >
                {selectedTermIds.length}
              </Badge>
            )}
            <ChevronDown className="size-4 text-muted-foreground" />
          </div>
        </CmsButton>
      </PopoverTrigger>

      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${displayTaxonomyName.toLowerCase()}...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filteredTerms.length === 0 ? (
              <CommandEmpty>
                {terms.length === 0 ? `No ${displayTaxonomyName.toLowerCase()} found` : 'No matches'}
              </CommandEmpty>
            ) : (
              <CommandGroup heading={displayTaxonomyName}>
                {filteredTerms.map((term) => (
                  <TermItem
                    key={term._id}
                    term={term}
                    isSelected={selectedTermIds.includes(term._id)}
                    onToggle={() => handleToggleTerm(term._id)}
                  />
                ))}
              </CommandGroup>
            )}
          </CommandList>

          {selectedTermIds.length > 0 && (
            <>
              <CommandSeparator />
              <div className="p-2">
                <div className="mb-2 flex flex-wrap gap-1">
                  {selectedTermsDetails.map((term) => (
                    <Badge
                      key={term._id}
                      variant="secondary"
                      className="gap-1 pr-1"
                      style={
                        term.color
                          ? { backgroundColor: term.color, color: '#fff' }
                          : undefined
                      }
                    >
                      {term.name}
                      <button
                        type="button"
                        className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
                        onClick={(e) => handleRemoveTerm(term._id, e)}
                        aria-label={`Remove ${term.name}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <CmsButton
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={handleClear}
                >
                  Clear all filters
                </CmsButton>
              </div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface TermItemProps {
  term: TaxonomyTerm
  isSelected: boolean
  onToggle: () => void
}

function TermItem({ term, isSelected, onToggle }: TermItemProps) {
  return (
    <CommandItem onSelect={onToggle} className="cursor-pointer">
      <Checkbox
        checked={isSelected}
        className="mr-2"
        aria-hidden="true"
        tabIndex={-1}
      />
      {term.color && (
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: term.color }}
        />
      )}
      <span className="flex-1 truncate">{term.name}</span>
      <span className="text-xs text-muted-foreground">{term.usageCount}</span>
      {isSelected && <Check className="ml-1 size-4 text-primary" />}
    </CommandItem>
  )
}
