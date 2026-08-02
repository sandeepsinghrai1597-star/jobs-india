import Link from "next/link";
import type { BlogPost } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="block">
      <Card className="h-full rounded-[1.75rem] border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">
              {post.category}
            </Badge>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {formatDate(post.publishedAt)}
            </p>
          </div>
          <div className="space-y-3">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-950">
              {post.title}
            </h2>
            <p className="text-sm leading-6 text-slate-600">{post.excerpt}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>{post.author?.name}</span>
            <span>{post.readTimeMinutes} min read</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

