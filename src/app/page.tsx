import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-bg-light min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-7xl font-bold font-heading text-text-dark tracking-tight mb-8">
          Welcome to <span className="text-primary">KICK</span><span className="text-cta">OFF</span>
        </h1>
        <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto font-body mb-10">
          The ultimate platform for esports competitors and gaming enthusiasts. 
          Join tournaments, track your stats, and connect with players worldwide.
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/register" className="btn-primary text-lg px-8 py-4">
            Get Started Now
          </Link>
          <Link href="/login" className="btn-secondary text-lg px-8 py-4">
            Sign In
          </Link>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-primary font-bold">1</span>
            </div>
            <h3 className="text-xl font-heading text-text-dark mb-2">Compete</h3>
            <p className="text-gray-600">Join daily tournaments and climb the global leaderboards.</p>
          </div>
          <div className="card text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-primary font-bold">2</span>
            </div>
            <h3 className="text-xl font-heading text-text-dark mb-2">Connect</h3>
            <p className="text-gray-600">Find teammates, build your squad, and chat with friends.</p>
          </div>
          <div className="card text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-primary font-bold">3</span>
            </div>
            <h3 className="text-xl font-heading text-text-dark mb-2">Conquer</h3>
            <p className="text-gray-600">Win prizes, earn badges, and prove your skills to the world.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
