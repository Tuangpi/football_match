import * as React from 'react';
import { t } from '@/lib/language';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { highlightSegments, nextHighlightedIndex } from '@/lib/autocomplete';

export interface AutocompleteProps<T> {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  items: T[];
  itemToLabel: (item: T) => string;
  itemToValue?: (item: T) => string;
  onSelect: (item: T) => void;
  loading?: boolean;
  error?: string;
  placeholder?: string;
  ariaLabel: string;
  disabled?: boolean;
  limit?: number;
  /** Extra classes appended to the inner input's className (e.g. to fit a custom container). */
  inputClassName?: string;
  /** Optional external ref forwarded to the inner input (e.g. to focus it). */
  inputRef?: React.MutableRefObject<HTMLInputElement | null>;
  maxLength?: number;
}

function highlightMatch(label: string, query: string): React.ReactNode {
  const { before, match, after, found } = highlightSegments(label, query);
  if (!found) return label;

  return (
    <React.Fragment>
      {before}
      <span className="font-semibold bg-primary/10 rounded">{match}</span>
      {after}
    </React.Fragment>
  );
}

export function Autocomplete({
  id,
  value,
  onChange,
  items,
  itemToLabel,
  itemToValue,
  onSelect,
  loading = false,
  error,
  placeholder,
  ariaLabel,
  disabled = false,
  limit = 8,
  inputClassName,
  inputRef: inputRefProp,
  maxLength,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}: AutocompleteProps<any>) {
  useLanguage();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const fallbackInputRef = React.useRef<HTMLInputElement>(null);
  const inputRef = inputRefProp ?? fallbackInputRef;
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(-1);
  const visibleItems = React.useMemo(() => items.slice(0, limit), [
    items,
    limit,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getItemValue = (item: any): string =>
    itemToValue ? itemToValue(item) : itemToLabel(item);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectItem = (item: any) => {
    const val = getItemValue(item);
    onChange(val);
    onSelect(item);
    setOpen(false);
    setHighlighted(-1);
    inputRef.current?.blur();
  };

  // Close dropdown when clicking outside the container.
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setHighlighted(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape.
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setHighlighted(-1);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    onChange(next);
    setOpen(true);
    setHighlighted(-1);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!visibleItems.length) {
      if (e.key === 'Escape') {
        setOpen(false);
        setHighlighted(-1);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        setOpen(true);
        setHighlighted((prev) =>
          nextHighlightedIndex(e.key, prev, visibleItems.length)
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlighted >= 0 && highlighted < visibleItems.length) {
          selectItem(visibleItems[highlighted]);
        }
        setOpen(false);
        setHighlighted(-1);
        break;
      case 'Escape':
        setOpen(false);
        setHighlighted(-1);
        break;
      case 'Tab':
        setOpen(false);
        setHighlighted(-1);
        break;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleItemMouseDown = (item: any) => (e: React.MouseEvent) => {
    e.preventDefault();
    selectItem(item);
  };

  const handleItemMouseEnter = (index: number) => () => {
    setHighlighted(index);
  };

  return (
    <div ref={containerRef} className="relative w-full" role="none">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? 'autocomplete-listbox' : undefined}
        aria-activedescendant={
          open && highlighted >= 0
            ? `autocomplete-option-${highlighted}`
            : undefined
        }
        aria-autocomplete="list"
        aria-label={ariaLabel}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        onFocus={() => setOpen(!!visibleItems.length || loading)}
        onBlur={() => {
          setTimeout(() => {
            setOpen(false);
            setHighlighted(-1);
          }, 150);
        }}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          disabled && 'opacity-50 cursor-not-allowed',
          inputClassName
        )}
      />

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

      {open && (
        <ul
          id="autocomplete-listbox"
          role="listbox"
          className={cn(
            'absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-input bg-card shadow-lg',
            visibleItems.length === 0 && 'hidden'
          )}
        >
          {loading && (
            <li role="none" className="px-3 py-2 text-xs text-muted-foreground">
              {t("Loading…")}
            </li>
          )}

          {!loading && visibleItems.length === 0 && (
            <li role="none" className="px-3 py-2 text-xs text-muted-foreground">
              {t("No results")}
            </li>
          )}

          {!loading &&
            visibleItems.map((item, index) => {
              const isHighlighted = highlighted === index;
              const label = itemToLabel(item);
              const itemKey = getItemValue(item);
              return (
                <li
                  key={itemKey ? `${itemKey}-${index}` : index}
                  role="option"
                  id={`autocomplete-option-${index}`}
                  aria-selected={isHighlighted}
                  onMouseDown={handleItemMouseDown(item)}
                  onMouseEnter={handleItemMouseEnter(index)}
                  className={cn(
                    'px-3 py-2 text-sm cursor-pointer select-none',
                    isHighlighted
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  {highlightMatch(label, value)}
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}