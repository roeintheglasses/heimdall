import Link from 'next/link'

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl font-bold mb-4">Heimdall Dashboard</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Real-time personal dashboard with over-engineered edge pipeline architecture
          </p>
          
          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            >
              View Dashboard
            </Link>
            
            <Link
              href="/api/health"
              className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
            >
              API Health Check
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm text-gray-500">
        <p>Built with Next.js, Go, and PostgreSQL</p>
      </footer>
    </div>
  )
}