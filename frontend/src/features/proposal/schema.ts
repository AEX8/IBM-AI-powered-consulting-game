import { z } from 'zod'

export const proposalFormSchema = z.object({
  solutionScope: z
    .string()
    .trim()
    .min(20, 'Describe the proposed solution in a couple of sentences (at least 20 characters).')
    .max(1500, 'Keep the solution under 1,500 characters.'),
  timeline: z
    .array(
      z.object({
        label: z.string().trim().max(200, 'Keep each phase under 200 characters.'),
      })
    )
    .refine((rows) => rows.some((row) => row.label.length > 0), {
      message: 'Add at least one timeline phase.',
    }),
  investment: z
    .string()
    .trim()
    .min(1, 'Enter the proposed investment, for example $25,000 AUD.')
    .max(100, 'Keep the investment under 100 characters.'),
  nextSteps: z
    .string()
    .trim()
    .min(1, 'Explain the next steps or terms.')
    .max(500, 'Keep the next steps under 500 characters.'),
})