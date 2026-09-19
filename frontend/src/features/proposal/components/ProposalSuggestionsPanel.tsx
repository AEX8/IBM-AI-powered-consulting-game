type ProposalSuggestionsPanelProps = {
    suggestions: string[]
  }
  
  export function ProposalSuggestionsPanel({ suggestions }: ProposalSuggestionsPanelProps) {
    if (suggestions.length === 0) return null
  
    return (
      <div className="bg-light-blue/15 border-light-blue/40 rounded-lg border p-5">
        <p className="text-charcoal text-sm font-extrabold">Suggestions for Improvements</p>
        <ul className="mt-2 flex flex-col gap-1.5 pl-4 text-sm text-zinc-700">
          {suggestions.map((suggestion) => (
            <li key={suggestion} className="list-disc">
              {suggestion}
            </li>
          ))}
        </ul>
      </div>
    )
  }