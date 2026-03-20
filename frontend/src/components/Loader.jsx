export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm font-medium">Analyzing your image...</p>
      <p className="text-gray-400 text-xs">The AI is generating your quiz!</p>
    </div>
  )
}