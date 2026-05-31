export default function SectionCard({ title, description, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-7 py-5 border-b border-gray-50">
        <h2 className="text-sm font-semibold text-[#1a1a2e]">{title}</h2>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-7 py-6">{children}</div>
    </div>
  )
}
