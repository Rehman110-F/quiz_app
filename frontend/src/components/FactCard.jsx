const colors = [
  'bg-amber-50 border-amber-200 text-amber-800',
  'bg-teal-50 border-teal-200 text-teal-800',
  'bg-violet-50 border-violet-200 text-violet-800',
]

export default function FactCard({ fact, index }) {
  return (
    <div className={`border rounded-2xl px-5 py-4 text-sm font-medium leading-relaxed ${colors[index % colors.length]}`}>
      <span className="mr-2 text-base">💡</span>
      {fact}
    </div>
  )
}