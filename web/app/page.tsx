const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="text-center space-y-4 max-w-lg">
        <h1 className="text-4xl font-bold tracking-tight">Panopticon</h1>
        <p className="text-lg text-gray-600">
          Weekly goal tracking through social accountability. The awareness of
          being observed drives self-regulation.
        </p>
      </div>

      <a
        href={`${API_BASE}/auth/google`}
        className="rounded-lg bg-gray-900 px-6 py-3 text-white font-medium hover:bg-gray-700 transition-colors"
      >
        Sign in with Google
      </a>
    </main>
  );
}
