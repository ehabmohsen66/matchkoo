"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [game, setGame] = useState("Valorant");
  const [description, setDescription] = useState("");
  const [prizePool, setPrizePool] = useState("$1000");
  const [maxPlayers, setMaxPlayers] = useState(64);
  const [startDate, setStartDate] = useState("");
  
  const [tournaments, setTournaments] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    } else {
      fetchTournaments();
      fetchUsers();
    }
  }, [session, status, router]);

  const fetchTournaments = async () => {
    const res = await fetch("/api/tournaments");
    if (res.ok) setTournaments(await res.json());
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, game, description, prizePool, maxPlayers, startDate }),
    });
    
    if (res.ok) {
      alert("Tournament created successfully!");
      fetchTournaments();
    } else {
      alert("Failed to create tournament.");
    }
  };

  if (status === "loading" || !session) return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="py-10">
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold leading-tight text-gray-900 font-heading">
            Admin Area
          </h1>
          <span className="bg-cta text-white px-3 py-1 rounded-full text-sm font-bold">
            Admin Privileges Active
          </span>
        </div>
      </header>
      
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 mt-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Create Tournament Form */}
            <div className="card">
              <h2 className="text-xl font-heading text-primary mb-4 border-b pb-2">Create New Tournament</h2>
              <form onSubmit={handleCreateTournament} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tournament Name</label>
                  <input type="text" required className="input mt-1" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Game</label>
                  <select className="input mt-1" value={game} onChange={e => setGame(e.target.value)}>
                    <option value="Valorant">Valorant</option>
                    <option value="League of Legends">League of Legends</option>
                    <option value="CS2">CS2</option>
                    <option value="Apex Legends">Apex Legends</option>
                    <option value="EAFC 24">EAFC 24</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea className="input mt-1" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prize Pool</label>
                    <input type="text" className="input mt-1" value={prizePool} onChange={e => setPrizePool(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Players</label>
                    <input type="number" className="input mt-1" value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input type="datetime-local" required className="input mt-1" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary w-full">Deploy Tournament</button>
              </form>
            </div>

            {/* Active Tournaments */}
            <div className="card">
              <h2 className="text-xl font-heading text-secondary mb-4 border-b pb-2">Active Tournaments</h2>
              <ul className="divide-y divide-gray-200 overflow-y-auto max-h-[500px]">
                {tournaments.length === 0 ? <p className="text-gray-500 py-4">No tournaments created yet.</p> : null}
                {tournaments.map((t: any) => (
                  <li key={t.id} className="py-4">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900">{t.name}</h4>
                        <p className="text-sm text-gray-500">{t.game} • {t.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-primary font-bold">{t.prizePool}</p>
                        <p className="text-xs text-gray-500">{t._count?.registrations || 0} / {t.maxPlayers} players</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* User Directory */}
          <div className="card">
            <h2 className="text-xl font-heading text-text-dark mb-4 border-b pb-2">User Directory</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user: any) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
