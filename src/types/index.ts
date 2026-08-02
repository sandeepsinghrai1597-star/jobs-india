export type UserRole = "candidate" | "employer" | "admin";

export type WorkMode = "remote" | "hybrid" | "onsite";
export type JobType =
  | "full-time"
  | "part-time"
  | "contract"
  | "freelance"
  | "internship"
  | "walk-in";
export type SalaryType = "monthly" | "yearly" | "stipend";
export type JobStatus = "draft" | "pending" | "active" | "expired" | "rejected";

export interface Job {
  id: string;
  slug: string;
  categorySlug?: string;
  title: string;
  companyName: string;
  companyLogo: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  salaryMin: number;
  salaryMax: number;
  salaryType: SalaryType;
  location: string;
  city: string;
  state: string;
  country: string;
  workMode: WorkMode;
  experienceRequired: string;
  experienceMin?: number | null;
  experienceMax?: number | null;
  educationRequired: string;
  jobType: JobType;
  industry: string;
  openings: number;
  applicationDeadline: string;
  recruiterContact: string;
  applicationUrl: string;
  createdAt: string;
  updatedAt: string;
  status: JobStatus;
  featured?: boolean;
  noCandidatePayment?: boolean;
  salaryDisclosed?: boolean;
  governmentSourceVerified?: boolean;
  suspiciousFlags?: string[];
  isSuspicious?: boolean;
  moderationNotes?: string;
  sourceUrl?: string;
  sourceType?: "employer" | "admin" | "official" | "partner";
  sourceName?: string;
  importedAt?: string;
  officialVerified?: boolean;
  publishedAt?: string | null;
}

export interface JobMatchSummary {
  jobId: string;
  candidateId: string;
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  recommendation: string;
  reason: string;
}

export type CandidateVerificationStatus =
  | "draft"
  | "pending"
  | "verified"
  | "rejected";

export interface CandidateProfile {
  id?: string;
  userId?: string;
  fullName: string;
  phone: string;
  headline: string;
  bio: string;
  education: string;
  skills: string[];
  experience: string;
  city: string;
  state: string;
  preferredRoles: string[];
  expectedSalary: number | null;
  preferredJobTypes: string[];
  languagePreference: string;
  resumeUrl: string;
  verified: boolean;
  verificationStatus: CandidateVerificationStatus;
  verificationRequestedAt?: string | null;
  verifiedAt?: string | null;
  updatedAt?: string | null;
}

export interface EmployerProfile {
  id?: string;
  userId?: string;
  companyName: string;
  website: string;
  companyEmail?: string;
  companyEmailVerified?: boolean;
  domainVerificationStatus?: string;
  industry: string;
  city: string;
  state: string;
  logoUrl: string;
  recruiterName: string;
  recruiterPhone: string;
  approvalStatus?: string;
  verified?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CandidateApplication {
  id: string;
  status: string;
  appliedAt: string;
  updatedAt: string;
  employerNotes?: string | null;
  resumeUrl?: string | null;
  job: Pick<Job, "id" | "slug" | "title" | "companyName" | "location" | "applicationUrl">;
}

export interface GovernmentJob {
  id: string;
  slug: string;
  categorySlug?: string;
  title: string;
  department: string;
  category: string;
  state: string;
  eligibility: string;
  ageLimit: string;
  applicationFee?: string;
  lastDate: string;
  officialNotificationLink?: string;
  applyLink?: string;
  syllabus?: string;
  selectionProcess?: string;
  importantDates?: string[];
  summary: string;
  openings?: string;
  salary?: string;
  shortInformation?: string;
  overview?: Array<{
    label: string;
    value: string;
  }>;
  vacancyDetails?: Array<{
    label: string;
    value: string;
  }>;
  educationDetails?: Array<{
    label: string;
    value: string;
  }>;
  ageDetails?: Array<{
    label: string;
    value: string;
  }>;
  feeDetails?: Array<{
    label: string;
    value: string;
  }>;
  salaryDetails?: Array<{
    label: string;
    value: string;
  }>;
  selectionSteps?: Array<{
    title: string;
    bullets: string[];
  }>;
  documentsRequired?: Array<{
    title: string;
    bullets: string[];
  }>;
  howToApplySteps?: Array<{
    title: string;
    bullets: string[];
  }>;
  importantLinks?: Array<{
    label: string;
    href: string;
  }>;
  faq?: Array<{
    question: string;
    answer: string;
  }>;
  fees?: string;
  officialUrl?: string;
  notificationUrl?: string;
  officialApplyUrl?: string;
  sourceUrl?: string;
  /** Original publication date from the source listing, not the import time. */
  publishedAt?: string;
  status?: "pending_review" | "approved" | "rejected";
}

export interface GovernmentJobCategory {
  slug: string;
  name: string;
  intro: string;
  keywords: string[];
}

export interface Internship {
  id: string;
  slug: string;
  categorySlug?: string;
  title: string;
  company: string;
  companyLogo: string;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  stipend: string;
  stipendMin: number;
  stipendMax: number;
  duration: string;
  location: string;
  city: string;
  state: string;
  country: string;
  industry: string;
  skills: string[];
  applyUrl: string;
  deadline: string;
  isPaid: boolean;
  workMode: WorkMode;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  publishedAt: string;
  category: string;
  author?: {
    name: string;
    role: string;
  };
  readTimeMinutes?: number;
  tags?: string[];
  intro?: string;
  sections?: Array<{
    id: string;
    heading: string;
    content: string[];
    bullets?: string[];
  }>;
  faq?: SeoFaq[];
  ctaLinks?: Array<{
    href: string;
    label: string;
    description: string;
  }>;
}

export interface SeoFaq {
  question: string;
  answer: string;
}

export interface SeoPageFilter {
  city?: string;
  workModes?: WorkMode[];
  categorySlugs?: string[];
  educationIncludes?: string[];
  experienceIncludes?: string[];
  keywordIncludes?: string[];
  industries?: string[];
}

export interface CareerGuide {
  slug: string;
  title: string;
  summary: string;
  targetRole: string;
  duration: string;
  roleOverview: string;
  salaryRange: string;
  skills: string[];
  roadmap30Days: CareerRoadmapPhase[];
  roadmap90Days: CareerRoadmapPhase[];
  projects: CareerGuideProject[];
  freeResources: CareerGuideResource[];
  certifications: string[];
  jobsToApplyFor: string[];
  faqs: CareerGuideFaq[];
}

export interface CareerRoadmapPhase {
  label: string;
  focus: string;
  outcomes: string[];
}

export interface CareerGuideProject {
  title: string;
  description: string;
}

export interface CareerGuideResource {
  title: string;
  provider: string;
  href: string;
  description: string;
}

export interface CareerGuideFaq {
  question: string;
  answer: string;
}

export interface RoadmapGeneratorResult {
  targetCareer: string;
  skillsRequired: string[];
  weeklyPlan: Array<{
    week: string;
    focus: string;
    tasks: string[];
  }>;
  projects: string[];
  resumeKeywords: string[];
  interviewTopics: string[];
  note?: string;
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  audience: "candidate" | "employer";
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
}

export interface SeoPageDefinition {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  keywords: string[];
  faqs: SeoFaq[];
  filters?: SeoPageFilter;
  type:
    | "city"
    | "fresher"
    | "internship"
    | "category"
    | "qualification"
    | "remote"
    | "role";
  city?: string;
  category?: string;
}
