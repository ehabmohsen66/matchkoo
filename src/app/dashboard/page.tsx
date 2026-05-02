import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  // Fetch the tournaments the user registered for
  const registrations = await prisma.registration.findMany({
    where: { userId: session.user.id },
    include: {
      tournament: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="py-10 bg-bg-light min-h-screen">
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900 font-heading">
            User Dashboard
          </h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 mt-8">
          <div className="card mb-8">
            <h2 className="text-xl font-semibold text-primary mb-4">Welcome back, {session.user?.name}!</h2>
            <p className="text-gray-600">
              Manage your esports career. View the tournaments you're competing in below.
            </p>
          </div>

          <h2 className="text-2xl font-bold font-heading text-text-dark mb-4">My Tournaments</h2>
          
          {registrations.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500 mb-4">You haven't joined any tournaments yet.</p>
              <Link href="/tournaments" className="btn-primary inline-block">
                Browse Tournaments
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {registrations.map((reg) => (
                <div key={reg.id} className="card border-l-4 border-l-primary">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-heading text-xl text-text-dark">{reg.tournament.name}</h3>
                      <p className="text-sm text-gray-500">{reg.tournament.game} • {new Date(reg.tournament.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold uppercase">
                        {reg.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600">Prize Pool: <span className="font-bold text-cta">{reg.tournament.prizePool}</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
