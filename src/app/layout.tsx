import type { Metadata } from "next";
import { Open_Sans, Poppins } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/data/site";
import { buildOrganizationSchema, buildWebsiteSchema } from "@/lib/seo";
import { SchemaScript } from "@/components/shared/schema-script";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: {
    canonical: siteConfig.url,
  },
  keywords: [
    "jobs in India",
    "AI career assistant",
    "resume builder",
    "resume analyzer",
    "government jobs",
    "fresher jobs india",
    "remote jobs india",
    "internships india",
    "interview preparation",
    "job search india",
    "salary calculator india",
    "career guidance",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_IN",
    type: "website",
    images: [{ url: `${siteConfig.url}/api/og` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [`${siteConfig.url}/api/og`],
    creator: siteConfig.organization.twitterHandle,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" className={`h-full ${openSans.variable} ${poppins.variable}`}>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <SchemaScript data={buildOrganizationSchema()} />
        <SchemaScript data={buildWebsiteSchema()} />
        {children}
      </body>
    </html>
  );
}
