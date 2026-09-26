import Link from 'next/link'

type TeamMember = {
  name: string
  role: string
}

const TEAM: TeamMember[] = [
  { name: 'Gayath Wethmin Kaluwahewa', role: 'Project Manager & Developer' },
  { name: 'Kashaf Fatima', role: 'Developer' },
  { name: 'Amritha Selvaganapathi', role: 'UX/UI Designer' },
  { name: 'Fatima Hubail', role: 'Business Analyst' },
  { name: 'Ibrahim Allouche', role: 'Developer' },
]

// First letter of the first and last name parts, e.g. "Gayath Wethmin
// Kaluwahewa" -> "GK". Good enough for a five-person team without needing
// photos yet.
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-gradient-to-b from-[#edf5ff] via-[#f7fafc] to-white px-6 py-16">
      {/* Decorative background shapes — purely visual. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#0f62fe]/10 blur-2xl" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-[#0f62fe]/10 blur-2xl" />
        <div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-[#002d9c]/10 blur-2xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center">
        {/*
         * Logo placeholder. Once a real logo exists, swap this block for:
         *   <Image src="/assets/logo.png" alt="IBM Consultancy 101" width={96} height={96} />
         */}
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-[4px] border-[#161616] bg-white shadow-[6px_6px_0_#161616]">
          <span className="text-3xl font-extrabold text-[#0f62fe]">IBM</span>
        </div>

        <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-[#161616] sm:text-5xl">
          IBM Consultancy 101
        </h1>

        <p className="mt-4 max-w-xl text-base font-medium text-[#3d3d3d] sm:text-lg">
          An AI-powered consulting training simulation. Work a real engagement end to end —
          find a lead, win the meeting, and close the deal.
        </p>

        <Link
          href="/auth/signin"
          className="mt-10 inline-flex items-center gap-2 rounded-lg border-[3px] border-[#161616] bg-[#0f62fe] px-8 py-4 text-lg font-extrabold text-white shadow-[5px_5px_0_#161616] transition hover:-translate-y-0.5 hover:bg-[#0043ce] hover:shadow-[7px_7px_0_#161616] active:translate-y-0 active:shadow-[3px_3px_0_#161616]"
        >
          Start Playing
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <section className="relative z-10 mt-20 w-full max-w-4xl">
        <h2 className="text-center text-sm font-extrabold tracking-[0.2em] text-[#0043ce] uppercase">
          Built by Team 9
        </h2>

        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {TEAM.map((member) => (
            <li
              key={member.name}
              className="flex flex-col items-center gap-3 rounded-xl border-[3px] border-[#161616] bg-white px-4 py-5 text-center shadow-[4px_4px_0_#161616] transition hover:-translate-y-1"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#161616] bg-[#0f62fe] text-lg font-extrabold text-white">
                {initialsFor(member.name)}
              </span>
              <span className="text-sm font-extrabold text-[#161616]">{member.name}</span>
              <span className="text-xs font-semibold text-[#0043ce]">{member.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
