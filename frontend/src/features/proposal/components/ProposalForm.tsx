'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { proposalFormSchema } from '../schema'
import { ProposalSuggestionsPanel } from './ProposalSuggestionsPanel'
import type { ProposalFormValues } from '../types'

const TIMELINE_PLACEHOLDERS = [
  'Phase 1 — e.g. Week 1-2: what happens first',
  'Phase 2 — e.g. Week 3-4: what happens next',
  'Phase 3 — e.g. Week 5-6: how it wraps up',
]

type ProposalFormProps = {
  clientCompany: string
  objectives: string[]
  defaultValues: ProposalFormValues
  suggestions?: string[]
  onSubmit: (values: ProposalFormValues) => void
}

export function ProposalForm({
  clientCompany,
  objectives,
  defaultValues,
  suggestions = [],
  onSubmit,
}: ProposalFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues,
  })
  const { fields } = useFieldArray({ control, name: 'timeline' })

  const timelineError = errors.timeline?.message ?? errors.timeline?.root?.message

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-3xl flex-col gap-7">
      <h1 className="text-charcoal text-3xl font-extrabold">Proposal Builder</h1>

      <div className="flex flex-col gap-2">
        <label htmlFor="solutionScope" className="text-charcoal text-sm font-bold">
          Proposed Solution / Scope
        </label>
        <textarea
          id="solutionScope"
          rows={3}
          placeholder={`Describe the engagement you would run for ${clientCompany} and the business problem it solves.`}
          aria-invalid={Boolean(errors.solutionScope)}
          {...register('solutionScope')}
          className="border-charcoal focus:ring-dark-blue/30 rounded-md border-2 bg-white px-4 py-3 text-sm focus:ring-2 focus:outline-none"
        />
        {errors.solutionScope && (
          <p role="alert" className="text-xs font-semibold text-red-600">
            {errors.solutionScope.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-charcoal text-sm font-bold">Objectives Addressed</p>
        <div className="flex flex-wrap gap-2">
          {objectives.map((objective) => (
            <span
              key={objective}
              className="bg-honey-wood text-charcoal rounded-full px-3 py-1.5 text-sm font-semibold"
            >
              {objective}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-charcoal text-sm font-bold">Timeline</p>
        <ul className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <li key={field.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className="bg-honey-wood h-1.5 w-1.5 shrink-0 rounded-full"
                  aria-hidden="true"
                />
                <input
                  aria-label={`Timeline phase ${index + 1}`}
                  placeholder={TIMELINE_PLACEHOLDERS[index] ?? 'Describe this phase'}
                  aria-invalid={Boolean(errors.timeline?.[index]?.label)}
                  {...register(`timeline.${index}.label` as const)}
                  className="border-charcoal/30 w-full rounded-md border bg-white px-2 py-1 text-sm focus:outline-none"
                />
              </div>
              {errors.timeline?.[index]?.label && (
                <p role="alert" className="pl-3.5 text-xs font-semibold text-red-600">
                  {errors.timeline[index]?.label?.message}
                </p>
              )}
            </li>
          ))}
        </ul>
        {timelineError && (
          <p role="alert" className="text-xs font-semibold text-red-600">
            {timelineError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="investment" className="text-charcoal text-sm font-bold">
            Investment / Pricing
          </label>
          <input
            id="investment"
            placeholder="e.g. $25,000 AUD"
            aria-invalid={Boolean(errors.investment)}
            {...register('investment')}
            className="border-charcoal rounded-md border-2 bg-white px-4 py-3 text-sm font-bold focus:outline-none"
          />
          {errors.investment && (
            <p role="alert" className="text-xs font-semibold text-red-600">
              {errors.investment.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="nextSteps" className="text-charcoal text-sm font-bold">
            Next Steps / Terms
          </label>
          <input
            id="nextSteps"
            placeholder="What happens after this proposal is accepted?"
            aria-invalid={Boolean(errors.nextSteps)}
            {...register('nextSteps')}
            className="border-charcoal rounded-md border-2 bg-white px-4 py-3 text-sm focus:outline-none"
          />
          {errors.nextSteps && (
            <p role="alert" className="text-xs font-semibold text-red-600">
              {errors.nextSteps.message}
            </p>
          )}
        </div>
      </div>

      <ProposalSuggestionsPanel suggestions={suggestions} />

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-plant-green hover:bg-dark-blue rounded-lg px-6 py-3 text-sm font-extrabold text-white transition"
        >
          Review Proposal →
        </button>
      </div>
    </form>
  )
}