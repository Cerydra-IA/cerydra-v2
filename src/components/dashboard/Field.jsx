export function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#1a1a2e] mb-1.5">
        {label}
        {hint && <span className="text-gray-400 font-normal ml-1.5">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

export const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#333] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-colors'

export const selectCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e] transition-colors bg-white'
