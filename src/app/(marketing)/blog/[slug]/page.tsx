import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, UserRound } from "lucide-react";
import { blogPosts, getBlogPostBySlug, getRelatedBlogPosts } from "@/lib/data/blog";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildMetadata,
} from "@/lib/seo";
import { BreadcrumbsNav } from "@/components/seo/breadcrumbs";
import { FaqSection } from "@/components/seo/faq-section";
import { InternalLinksSection } from "@/components/seo/internal-links-section";
import { SchemaScript } from "@/components/shared/schema-script";
import { BlogArticleCta } from "@/components/blog/blog-article-cta";
import { BlogPostCard } from "@/components/blog/blog-post-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return buildMetadata({
      title: "Article not found",
      description: "The requested article could not be found.",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: post.metaTitle,
    description: post.metaDescription,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
    type: "article",
    publishedTime: post.publishedAt,
  });
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedBlogPosts(post, 3);
  const faq = post.faq ?? [];
  const toc = post.sections ?? [];

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <SchemaScript data={buildArticleSchema(post)} />
      <SchemaScript
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />
      {faq.length ? <SchemaScript data={buildFaqSchema(faq)} /> : null}

      <BreadcrumbsNav
        items={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: post.title },
        ]}
      />

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.12),_transparent_30%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94))] p-8 shadow-sm">
        <div className="max-w-4xl space-y-5">
          <Badge variant="secondary" className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
            {post.category}
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            {post.title}
          </h1>
          <p className="text-lg leading-8 text-slate-600">{post.intro ?? post.excerpt}</p>
          <div className="flex flex-wrap gap-5 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <UserRound className="size-4" />
              {post.author?.name} · {post.author?.role}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4" />
              {formatDate(post.publishedAt)} · {post.readTimeMinutes} min read
            </span>
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-8">
          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="space-y-8 p-8">
              <div className="space-y-4">
                <h2 className="font-heading text-2xl font-semibold text-slate-950">Quick summary</h2>
                <p className="text-base leading-8 text-slate-700">{post.content}</p>
              </div>

              {toc.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-28 space-y-4">
                  <h2 className="font-heading text-2xl font-semibold text-slate-950">{section.heading}</h2>
                  <div className="space-y-4">
                    {section.content.map((paragraph) => (
                      <p key={paragraph} className="text-base leading-8 text-slate-700">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  {section.bullets?.length ? (
                    <ul className="space-y-3 pl-5 text-base leading-8 text-slate-700">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="list-disc">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}

              {post.tags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {faq.length ? <FaqSection faqs={faq} /> : null}
          <BlogArticleCta post={post} />

          {relatedPosts.length ? (
            <section className="space-y-4">
              <div className="space-y-2">
                <h2 className="font-heading text-2xl font-semibold text-slate-950">Related posts</h2>
                <p className="text-sm leading-6 text-slate-600">
                  Keep exploring connected topics across resumes, interviews, and fresher career growth.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                {relatedPosts.map((relatedPost) => (
                  <BlogPostCard key={relatedPost.slug} post={relatedPost} />
                ))}
              </div>
            </section>
          ) : null}

          <InternalLinksSection
            title="Useful next links"
            description="These internal links push readers from informational content into high-intent product and job discovery paths."
            links={[
              { href: "/resume-builder", label: "ATS resume builder" },
              { href: "/jobs", label: "Latest jobs" },
              { href: "/ai-career-agent", label: "AI career agent" },
              { href: "/career-guide", label: "Career guides" },
              { href: "/interview-preparation", label: "Interview preparation" },
            ]}
          />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card className="rounded-[1.75rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="space-y-4 p-6">
              <h2 className="font-heading text-xl font-semibold text-slate-950">Table of contents</h2>
              <nav aria-label="Table of contents">
                <ol className="space-y-3">
                  {toc.map((section, index) => (
                    <li key={section.id}>
                      <Link href={`#${section.id}`} className="text-sm leading-6 text-slate-600 transition hover:text-primary">
                        {index + 1}. {section.heading}
                      </Link>
                    </li>
                  ))}
                </ol>
              </nav>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200 bg-slate-100 text-slate-950 shadow-sm">
            <CardContent className="space-y-3 p-6">
              <h2 className="font-heading text-xl font-semibold">Need a personal plan?</h2>
              <p className="text-sm leading-6 text-slate-600">
                Use the AI career agent to turn this article into a role-specific action plan.
              </p>
              <Link
                href="/ai-career-agent"
                className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Open AI career agent
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </article>
  );
}

