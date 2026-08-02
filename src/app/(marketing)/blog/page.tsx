import { Search } from "lucide-react";
import { blogCategories, blogPosts, filterBlogPosts } from "@/lib/data/blog";
import { buildCollectionPageSchema, buildMetadata } from "@/lib/seo";
import { BreadcrumbsNav } from "@/components/seo/breadcrumbs";
import { SchemaScript } from "@/components/shared/schema-script";
import { SectionHeading } from "@/components/shared/section-heading";
import { BlogPostCard } from "@/components/blog/blog-post-card";

export const metadata = buildMetadata({
  title: "Career Blog for Freshers, Students and Job Seekers",
  description:
    "Browse SEO-friendly career guides, resume tips, interview help, and job search advice for freshers in India.",
  path: "/blog",
});

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const posts = filterBlogPosts(q, category);
  const selectedCategory = category?.trim() ?? "";
  const selectedQuery = q?.trim() ?? "";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <SchemaScript
        data={buildCollectionPageSchema({
          name: "JobPulse India Blog",
          description:
            "Career blog covering resumes, interviews, fresher jobs, and practical career roadmaps.",
          path: "/blog",
        })}
      />

      <BreadcrumbsNav items={[{ label: "Home", href: "/" }, { label: "Blog" }]} />

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(240,249,255,0.92))] p-8 shadow-sm">
        <SectionHeading
          eyebrow="Blog"
          title="Career advice built for search and action"
          description="Search by topic, filter by category, and move from content into resumes, jobs, and AI-guided next steps."
          as="h1"
        />
        <form className="mt-8 grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 md:grid-cols-[1.4fr_0.8fr_auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Search articles</span>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Search className="size-4 text-slate-500" />
              <input
                type="search"
                name="q"
                defaultValue={selectedQuery}
                placeholder="Search resume, interview, roadmap, fresher jobs..."
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500"
              />
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Category</span>
            <select
              name="category"
              defaultValue={selectedCategory}
              className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            >
              <option value="">All categories</option>
              {blogCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-[42px] self-end rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Find articles
          </button>
        </form>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
          <span>{posts.length} articles found</span>
          <span>{blogPosts.length} starter posts live</span>
          <span>Topics across jobs, resumes, interviews, and career planning</span>
        </div>
      </section>

      <section className="mt-10">
        {posts.length ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {posts.map((post) => (
              <BlogPostCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="font-heading text-2xl font-semibold text-slate-950">No articles matched</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Try a broader keyword or switch back to all categories to explore more career content.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
