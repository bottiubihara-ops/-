"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "入力" },
  { href: "/records", label: "一覧" },
] as const;

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 bg-white shadow-sm">
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 pt-3">
        <h1 className="text-lg font-bold">📦 棚卸し</h1>
        <nav className="ml-auto flex gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-t-lg px-5 py-2 text-sm font-semibold ${
                pathname === tab.href
                  ? "border-b-2 border-blue-600 text-blue-700"
                  : "text-gray-500"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
