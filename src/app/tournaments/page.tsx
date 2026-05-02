"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Tournaments() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    const res = await fetch("/api/tournaments");
    if (res.ok) setTournaments(await res.json());
    setLoading(false);
  };

  const handleJoin = async (id: string) => {
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }
    
    const res = await fetch(`/api/tournaments/${id}/register`, {
      method: "POST"
    });
    
    if (res.ok) {
      alert("Successfully registered for the tournament!");
      fetchTournaments(); // Refresh numbers
    } else {
      const data = await res.json();
      alert(data.message || "Failed to register");
    }
  };

  return (
    <div className="py-10 bg-bg-light min-h-screen">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold font-heading text-text-dark uppercase tracking-wide">
          Active <span className="text-primary">Tournaments</span>
        </h1>
        <p className="mt-2 text-gray-600 font-body">Join the battlefield and claim your prize.</p>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20 card">
            <h2 className="text-2xl text-gray-600">No active tournaments right now.</h2>
            <p className="text-gray-400 mt-2">Check back later or wait for admins to deploy one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tournaments.map((t: any) => (
              <div key={t.id} className="card flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {t.game}
                    </span>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                      {t.status}
                    </span>
                  </div>
                  <h3 className="text-2xl font-heading text-text-dark mb-2">{t.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{t.description}</p>
                  
                  <div className="flex items-center justify-between mb-4 border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Prize Pool</p>
                      <p className="text-lg font-bold text-cta">{t.prizePool}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Players</p>
                      <p className="text-lg font-bold text-secondary">
                        {t._count?.registrations || 0} <span className="text-gray-400 text-sm">/ {t.maxPlayers}</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleJoin(t.id)}
                  className="btn-primary w-full mt-4 flex justify-center items-center gap-2"
                  disabled={t._count?.registrations >= t.maxPlayers}
                >
                  {t._count?.registrations >= t.maxPlayers ? "Tournament Full" : "Join Tournament"}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
