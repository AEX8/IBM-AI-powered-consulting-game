import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/actions/auth.actions'
import SignOutButton from './SignOutButton'

const teamMembers = [
  {
    name: 'Gayath Wethmin Kaluwahewa',
    role: 'Project Manager',
    image: '/team/Gayath.jpg',
    blurb: 'Organises the team, coordinates tasks, and keeps the project moving toward completion.',
    bio: "I'm a Computer Science student at RMIT with a strong interest in machine learning, AI, and data science. Outside of university, I enjoy exploring new technologies and spending my free time swimming or playing poker.",
    accent: 'border-[#78a9ff]',
    badge: 'bg-[#d0e2ff] text-[#001d6c]',
  },
  {
    name: 'Fatima Hubali',
    role: 'Business Analyst',
    image: '/team/Fatima.JPG',
    blurb:
      'Helps define project requirements and makes sure the team understands what needs to be built.',
    bio: "I'm a Computer Science student at RMIT University with a strong interest in the intersection of business and technology. I'm particularly interested in AI, data analytics, consulting, automation, and digital transformation, and how these areas can be used to solve real business problems and improve decision-making. I enjoy learning how emerging technologies can create practical value for people and organisations.",
    accent: 'border-[#a6c8ff]',
    badge: 'bg-[#edf5ff] text-[#001d6c]',
  },
  {
    name: 'Amritha Selvaganapathi',
    role: 'UX Designer',
    image: '/team/Amritha.jpg',
    blurb: 'Designs the user experience and creates clear, user-friendly layouts for the project.',
    bio: "I'm a Computer Science student at RMIT with a strong interest in UX/UI, product and business analysis, technology consulting, and client-facing roles that bridge users, business, and technology. Outside of university, I enjoy teaching yoga, going to Pilates, and exploring the city.",
    accent: 'border-[#78a9ff]',
    badge: 'bg-[#d0e2ff] text-[#001d6c]',
  },
  {
    name: 'Kashaf Fatima',
    role: 'Developer',
    image: '/team/Kashaf.PNG',
    blurb:
      'Builds and supports application features while helping turn the team’s designs into working code.',
    bio: "I'm a Computer Science student at RMIT University with a strong interest in the intersection of business and technology. I'm particularly interested in AI, data analytics, consulting, automation, and digital transformation, and how these areas can be used to solve real business problems and improve decision-making. I enjoy learning how emerging technologies can create practical value for people and organisations.",
    accent: 'border-[#a6c8ff]',
    badge: 'bg-[#edf5ff] text-[#001d6c]',
  },
  {
    name: 'Ibrahim Allouche',
    role: 'Developer',
    image: '/team/Ibrahim.PNG',
    blurb:
      'Develops application features and works on authentication, protected pages, and backend integration.',
    bio: "I'm passionate about cybersecurity and networking, with a strong focus on building secure and reliable systems. I also have a strong interest in entrepreneurship and creating new ideas that can grow into real opportunities. Outside of technology, I enjoy cars and learning how they are designed, built, and modified. I'm also fascinated by jet engineering and want to gain experience with companies involved in aircraft and engine development. I enjoy hands-on learning, challenging projects, and expanding my skills across technology, engineering, and business.",
    accent: 'border-[#78a9ff]',
    badge: 'bg-[#d0e2ff] text-[#001d6c]',
  },
]

export default async function TeamPage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#edf5ff] via-white to-[#d0e2ff] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex items-start justify-between gap-6">
          <div>
            <p className="mb-2 text-sm font-semibold tracking-[0.3em] text-[#002d9c] uppercase">
              Team 9 Garage
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-[#001d6c] sm:text-5xl">
              Meet the Team
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-600">
              Meet the people working together to design, build, and deliver the Team 9 Garage
              project.
            </p>
          </div>

          <SignOutButton />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {teamMembers.map((member) => (
            <article
              key={member.name}
              className="overflow-hidden rounded-3xl bg-[#001d6c] shadow-xl"
            >
              <div className="relative h-72 w-full bg-zinc-200">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                />
              </div>

              <div className="flex min-h-64 flex-col p-5 text-white">
                <h2 className="text-lg leading-tight font-bold">{member.name}</h2>

                <span className="mt-3 w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  {member.role}
                </span>

                <p className="mt-4 text-sm leading-6 text-[#d0e2ff]">{member.blurb}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-20">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold tracking-[0.3em] text-[#002d9c] uppercase">
              Get to know us
            </p>

            <h2 className="mt-2 text-3xl font-bold text-[#001d6c]">Our Team</h2>
          </div>

          <div className="mx-auto flex max-w-5xl flex-col gap-5">
            {teamMembers.map((member) => (
              <article
                key={`${member.name}-bio`}
                className="flex flex-col gap-6 rounded-3xl bg-white p-6 shadow-lg sm:flex-row sm:items-center"
              >
                <div
                  className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 ${member.accent}`}
                >
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="96px"
                  />
                </div>

                <div className="w-full sm:w-52 sm:shrink-0">
                  <h3 className="text-lg leading-tight font-bold text-[#001d6c]">{member.name}</h3>

                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${member.badge}`}
                  >
                    {member.role}
                  </span>
                </div>

                <p className="text-sm leading-6 text-zinc-600 sm:flex-1">{member.bio}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
