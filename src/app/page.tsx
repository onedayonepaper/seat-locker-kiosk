import Link from "next/link";

const pages = [
  {
    title: "키오스크",
    description: "좌석 체크인/체크아웃 및 사물함 배정을 위한 고객용 키오스크",
    href: "/kiosk",
    icon: "🖥️",
    color: "bg-blue-500",
  },
  {
    title: "관리자",
    description: "좌석 및 사물함 현황을 모니터링하고 관리하는 대시보드",
    href: "/admin",
    icon: "👤",
    color: "bg-purple-500",
  },
  {
    title: "설정",
    description: "좌석 배치, 사물함 구성 및 시스템 설정 관리",
    href: "/settings",
    icon: "⚙️",
    color: "bg-gray-500",
  },
  {
    title: "라벨 출력",
    description: "좌석 및 사물함용 QR코드 라벨 생성 및 출력",
    href: "/labels",
    icon: "🏷️",
    color: "bg-green-500",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-zinc-900 dark:text-white">
            Seat & Locker Kiosk
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            좌석 및 사물함 관리 시스템
          </p>
        </header>

        {/* Navigation Cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          {pages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 dark:bg-zinc-800"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${page.color} text-2xl`}
                >
                  {page.icon}
                </div>
                <div className="flex-1">
                  <h2 className="mb-1 text-xl font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {page.title}
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {page.description}
                  </p>
                </div>
                <div className="text-zinc-400 transition-transform group-hover:translate-x-1">
                  →
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-zinc-500 dark:text-zinc-500">
          <p>개발 모드로 실행 중</p>
        </footer>
      </div>
    </div>
  );
}
