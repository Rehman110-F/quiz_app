import { useState } from 'react'

export default function QuizCard({ question, index, onAnswer }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  function handleSelect(option) {
    if (revealed) return
    setSelected(option)
    setRevealed(true)
    const correct = option === question.correctAnswer
    onAnswer(correct)
  }

  const isCorrect = (option) => option === question.correctAnswer
  const isWrong = (option) => revealed && option === selected && option !== question.correctAnswer

  if (question.type === 'truefalse') {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-2">
          True or False
        </p>
        <p className="text-gray-800 font-medium mb-4">{index + 1}. {question.question}</p>
        <div className="flex gap-3">
          {['true', 'false'].map(opt => (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm capitalize transition-all
                ${!revealed ? 'bg-gray-50 border border-gray-200 hover:bg-violet-50 hover:border-violet-300 text-gray-700' : ''}
                ${revealed && isCorrect(opt) ? 'bg-green-100 border-2 border-green-400 text-green-800' : ''}
                ${isWrong(opt) ? 'bg-red-100 border-2 border-red-400 text-red-800' : ''}
                ${revealed && opt !== selected && !isCorrect(opt) ? 'bg-gray-50 border border-gray-200 text-gray-400' : ''}
              `}
            >
              {opt === 'true' ? '✓ True' : '✗ False'}
            </button>
          ))}
        </div>
        {revealed && (
          <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
            💬 {question.explanation}
          </p>
        )}
      </div>
    )
  }

  if (question.type === 'fillintheblank') {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-2">
          Fill in the blank
        </p>
        <p className="text-gray-800 font-medium mb-4">{index + 1}. {question.question}</p>
        {!revealed ? (
          <button
            onClick={() => { setRevealed(true); onAnswer(true) }}
            className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-all"
          >
            Show Answer
          </button>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-green-800 font-semibold text-sm">✓ {question.correctAnswer}</p>
            <p className="text-gray-500 text-sm mt-1">💬 {question.explanation}</p>
          </div>
        )}
      </div>
    )
  }

  // Default: MCQ
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-2">
        Multiple choice
      </p>
      <p className="text-gray-800 font-medium mb-4">{index + 1}. {question.question}</p>
      <div className="flex flex-col gap-2">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleSelect(opt)}
            className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all
              ${!revealed ? 'bg-gray-50 border border-gray-200 hover:bg-violet-50 hover:border-violet-300 text-gray-700' : ''}
              ${revealed && isCorrect(opt) ? 'bg-green-100 border-2 border-green-400 text-green-800' : ''}
              ${isWrong(opt) ? 'bg-red-100 border-2 border-red-400 text-red-800' : ''}
              ${revealed && opt !== selected && !isCorrect(opt) ? 'bg-gray-50 border border-gray-200 text-gray-400' : ''}
            `}
          >
            <span className="font-bold mr-2 text-gray-400">{String.fromCharCode(65 + i)}.</span>
            {opt}
          </button>
        ))}
      </div>
      {revealed && (
        <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
          💬 {question.explanation}
        </p>
      )}
    </div>
  )
}