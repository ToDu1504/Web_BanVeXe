import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from './input'

// Native <input type="date|datetime-local"> renders in the browser's UI locale
// (often mm/dd/yyyy) and can't be forced to dd/mm/yyyy. This component is a
// masked text field typed as dd/mm/yyyy [HH:mm], plus a calendar button that
// opens the native picker. Its value/onChange use the same format as the native
// input (yyyy-MM-dd / yyyy-MM-ddTHH:mm), so it's a drop-in replacement and also
// works with react-hook-form's register() (pass value={watch(name)} alongside).

const pad = (n) => String(n).padStart(2, '0')

function isoToText(value, withTime) {
  if (!value) return ''
  const [datePart, timePart] = String(value).split('T')
  const [y, m, d] = datePart.split('-')
  if (!y || !m || !d) return ''
  const date = `${d}/${m}/${y}`
  return withTime && timePart ? `${date} ${timePart.slice(0, 5)}` : date
}

// Inserts separators as the user types digits: ddmmyyyyHHmm → dd/mm/yyyy HH:mm
function maskDigits(digits, withTime) {
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
  let out = parts[0]
  if (digits.length > 2) out += '/' + parts[1]
  if (digits.length > 4) out += '/' + parts[2]
  if (withTime && digits.length > 8) {
    out += ' ' + digits.slice(8, 10)
    if (digits.length > 10) out += ':' + digits.slice(10, 12)
  }
  return out
}

// Returns the ISO-ish value once the text is a complete, real date; '' otherwise.
function textToIso(digits, withTime) {
  if (digits.length !== (withTime ? 12 : 8)) return ''
  const d = Number(digits.slice(0, 2))
  const m = Number(digits.slice(2, 4))
  const y = Number(digits.slice(4, 8))
  const check = new Date(y, m - 1, d)
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) return ''
  const date = `${y}-${pad(m)}-${pad(d)}`
  if (!withTime) return date
  const hh = Number(digits.slice(8, 10))
  const mm = Number(digits.slice(10, 12))
  if (hh > 23 || mm > 59) return ''
  return `${date}T${pad(hh)}:${pad(mm)}`
}

function DateInput({ className, type = 'date', value, onChange, name, id, ref, min, max, disabled, onBlur, ...props }) {
  const withTime = type === 'datetime-local'
  const [innerValue, setInnerValue] = React.useState(value ?? '')
  const current = value !== undefined ? value : innerValue
  const [text, setText] = React.useState(() => isoToText(current, withTime))
  const lastEmitted = React.useRef(current ?? '')
  const pickerRef = React.useRef(null)

  // Sync text when the value changes from outside (reset(), setValue, picker)
  React.useEffect(() => {
    if ((current ?? '') !== lastEmitted.current) {
      lastEmitted.current = current ?? ''
      setText(isoToText(current, withTime))
    }
  }, [current, withTime])

  const emit = (iso) => {
    lastEmitted.current = iso
    setInnerValue(iso)
    onChange?.({ target: { name, value: iso }, type: 'change' })
  }

  const handleTextChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, withTime ? 12 : 8)
    setText(maskDigits(digits, withTime))
    const iso = textToIso(digits, withTime)
    if (iso !== lastEmitted.current) emit(iso)
  }

  const openPicker = () => {
    const el = pickerRef.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      el.focus()
    }
  }

  return (
    <div className="relative w-full">
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={withTime ? 'dd/mm/yyyy hh:mm' : 'dd/mm/yyyy'}
        value={text}
        onChange={handleTextChange}
        onBlur={onBlur}
        disabled={disabled}
        className={cn('pr-9', className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={openPicker}
        disabled={disabled}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        aria-label="Chọn ngày"
      >
        <CalendarIcon className="h-4 w-4" />
      </button>
      {/* Hidden native input: only used for its picker popup, and as the ref target for react-hook-form */}
      <input
        ref={(el) => {
          pickerRef.current = el
          if (typeof ref === 'function') ref(el)
          else if (ref) ref.current = el
        }}
        type={type}
        name={name}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden="true"
        value={current ?? ''}
        onChange={(e) => {
          setText(isoToText(e.target.value, withTime))
          emit(e.target.value)
        }}
        className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
      />
    </div>
  )
}

export { DateInput }
