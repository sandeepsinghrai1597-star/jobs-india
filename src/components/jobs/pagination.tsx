"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function Pagination({ total, page, perPage }: { total: number; page: number; perPage: number }) {
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  return (
    <nav className="flex items-center gap-2">
      {pages.map((p) => {
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        params.set("page", String(p));
        const href = `/jobs?${params.toString()}`;
        return (
          <Link key={p} href={href} className={`px-3 py-1 rounded-full ${p === page ? "bg-white" : "bg-transparent"}`}>
            {p}
          </Link>
        );
      })}
    </nav>
  );
}
