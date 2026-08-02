import { connect, createDb, loadEnvFiles } from "./lib/mysql-client.mjs";

loadEnvFiles([".env.local", ".env"]);

const connection = await connect();
const supabase = createDb(connection);

const sizeRanges = ["11-50", "51-200", "201-500", "501-1000"];
const extraSkills = [
  "Problem Solving",
  "Stakeholder Communication",
  "Agile",
  "Documentation",
  "Customer Empathy",
  "Data Visualization",
  "API Integrations",
  "Operations Excellence",
];

const companies = [
  ["AstraNova Technologies", "Software", "Bengaluru", "Karnataka", "https://astranova.tech"],
  ["NimbusIQ Labs", "Analytics", "Pune", "Maharashtra", "https://nimbusiq.ai"],
  ["HelioStack Systems", "SaaS", "Hyderabad", "Telangana", "https://heliostack.io"],
  ["Meridian Cloudworks", "Cloud Services", "Chennai", "Tamil Nadu", "https://meridiancloud.in"],
  ["Northstar Commerce", "E-commerce", "Gurugram", "Haryana", "https://northstarcommerce.in"],
  ["BluePeak Finance", "Fintech", "Mumbai", "Maharashtra", "https://bluepeakfinance.in"],
  ["CedarWave Health", "Healthcare", "Noida", "Uttar Pradesh", "https://cedarwavehealth.com"],
  ["OrbitNest Mobility", "Logistics", "Ahmedabad", "Gujarat", "https://orbitnest.in"],
  ["BrightPath Education", "EdTech", "Jaipur", "Rajasthan", "https://brightpathedu.in"],
  ["SignalBridge Telecom", "Telecom", "Kolkata", "West Bengal", "https://signalbridge.in"],
  ["VerdeGrid Energy", "Energy", "Indore", "Madhya Pradesh", "https://verdegrid.in"],
  ["PulseForge Media", "Media", "Chandigarh", "Chandigarh", "https://pulseforge.media"],
  ["QuickLift Retail", "Retail", "Lucknow", "Uttar Pradesh", "https://quickliftretail.in"],
  ["ForgeAxis Manufacturing", "Manufacturing", "Coimbatore", "Tamil Nadu", "https://forgeaxis.in"],
  ["CivicSpring Services", "Business Services", "Bhubaneswar", "Odisha", "https://civicspring.in"],
  ["DeltaCore Security", "Cybersecurity", "Kochi", "Kerala", "https://deltacore.security"],
  ["SummitScale Ventures", "Consulting", "Delhi", "Delhi", "https://summitscale.in"],
  ["RivetWorks AI", "Artificial Intelligence", "Bengaluru", "Karnataka", "https://rivetworks.ai"],
  ["HarborLine Support", "Customer Service", "Mohali", "Punjab", "https://harborline.support"],
  ["FreshOrbit Foods", "FoodTech", "Surat", "Gujarat", "https://freshorbitfoods.in"],
];

const roleTemplates = [
  {
    title: "Frontend Developer",
    categorySlug: "it-jobs",
    jobType: "full-time",
    workMode: "hybrid",
    salaryType: "yearly",
    minSalary: 520000,
    maxSalary: 860000,
    experienceRequired: "1-3 years",
    experienceMin: 1,
    experienceMax: 3,
    educationRequired: "BTech / BCA / MCA",
    openings: 3,
    skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    responsibilities: [
      "Build responsive product experiences across dashboard and landing page surfaces.",
      "Work with backend engineers on APIs, auth flows, and release-ready UI states.",
      "Improve accessibility, performance, and cross-device consistency before launch.",
    ],
    requirements: [
      "Strong JavaScript and React fundamentals with production or internship experience.",
      "Comfort with component-driven development and Git-based workflows.",
      "Ability to debug layout, state, and API integration issues independently.",
    ],
    description:
      "Join a product engineering team shipping customer-facing web features with a strong focus on performance, accessibility, and polished UI delivery.",
  },
  {
    title: "Backend Developer",
    categorySlug: "it-jobs",
    jobType: "full-time",
    workMode: "hybrid",
    salaryType: "yearly",
    minSalary: 600000,
    maxSalary: 980000,
    experienceRequired: "2-4 years",
    experienceMin: 2,
    experienceMax: 4,
    educationRequired: "BTech / MCA / Graduate",
    openings: 2,
    skills: ["Node.js", "PostgreSQL", "REST APIs", "Redis"],
    responsibilities: [
      "Design and maintain APIs, background jobs, and data access layers.",
      "Improve reliability, query performance, and monitoring for core services.",
      "Collaborate with frontend and DevOps teams on full-stack delivery.",
    ],
    requirements: [
      "Hands-on backend development experience with a modern server-side stack.",
      "Solid SQL knowledge and familiarity with caching or queueing concepts.",
      "Ability to reason about performance, testing, and production debugging.",
    ],
    description:
      "Build resilient backend services that power search, analytics, and internal operations at scale.",
  },
  {
    title: "Data Analyst",
    categorySlug: "it-jobs",
    jobType: "full-time",
    workMode: "onsite",
    salaryType: "yearly",
    minSalary: 420000,
    maxSalary: 720000,
    experienceRequired: "0-2 years",
    experienceMin: 0,
    experienceMax: 2,
    educationRequired: "BSc / BCA / Graduate",
    openings: 4,
    skills: ["SQL", "Excel", "Power BI", "Reporting"],
    responsibilities: [
      "Prepare dashboards, recurring MIS reports, and ad hoc business analysis.",
      "Clean raw datasets and translate operational data into decision-ready insights.",
      "Partner with business teams to define KPIs and reporting cadences.",
    ],
    requirements: [
      "Strong spreadsheet and SQL basics with good analytical reasoning.",
      "Ability to communicate findings clearly to non-technical stakeholders.",
      "Internship, coursework, or portfolio work in analytics is a plus.",
    ],
    description:
      "Support data-driven decisions across operations, product, and growth teams by turning raw datasets into useful insights.",
  },
  {
    title: "Customer Support Associate",
    categorySlug: "fresher-jobs",
    jobType: "full-time",
    workMode: "onsite",
    salaryType: "yearly",
    minSalary: 220000,
    maxSalary: 340000,
    experienceRequired: "0-1 years",
    experienceMin: 0,
    experienceMax: 1,
    educationRequired: "12th pass / Graduate",
    openings: 8,
    skills: ["Customer Support", "CRM", "Communication", "Escalation Handling"],
    responsibilities: [
      "Resolve customer issues over phone, email, and chat with empathy and speed.",
      "Document cases accurately in CRM tools and flag repeat issues to team leads.",
      "Support onboarding and service guidance for new customers.",
    ],
    requirements: [
      "Clear spoken communication in English and Hindi.",
      "Comfort with shift-based operations and service quality targets.",
      "Freshers with strong communication skills are welcome.",
    ],
    description:
      "Help customers solve issues quickly while building trust through accurate communication and responsive service handling.",
  },
  {
    title: "Digital Marketing Executive",
    categorySlug: "fresher-jobs",
    jobType: "full-time",
    workMode: "hybrid",
    salaryType: "yearly",
    minSalary: 320000,
    maxSalary: 520000,
    experienceRequired: "0-2 years",
    experienceMin: 0,
    experienceMax: 2,
    educationRequired: "MBA / BBA / Graduate",
    openings: 3,
    skills: ["SEO", "Google Ads", "Content Marketing", "Analytics"],
    responsibilities: [
      "Execute SEO, paid media, and campaign reporting for growth initiatives.",
      "Coordinate briefs, landing pages, and channel calendars with internal teams.",
      "Track campaign performance and suggest optimization opportunities.",
    ],
    requirements: [
      "Basic digital marketing knowledge with strong writing and analytical skills.",
      "Ability to work across content, performance, and reporting workflows.",
      "Internship experience in marketing is preferred.",
    ],
    description:
      "Drive measurable growth through channel execution, reporting, and campaign coordination across digital programs.",
  },
  {
    title: "Sales Executive",
    categorySlug: "sales-jobs",
    jobType: "full-time",
    workMode: "onsite",
    salaryType: "monthly",
    minSalary: 26000,
    maxSalary: 42000,
    experienceRequired: "0-3 years",
    experienceMin: 0,
    experienceMax: 3,
    educationRequired: "12th pass / Graduate",
    openings: 6,
    skills: ["Sales", "Lead Generation", "CRM", "Negotiation"],
    responsibilities: [
      "Convert inbound and outbound leads into qualified business opportunities.",
      "Maintain follow-up hygiene and daily updates in the CRM.",
      "Coordinate with product or operations teams during onboarding.",
    ],
    requirements: [
      "Comfort with targets, outreach, and daily follow-up activity.",
      "Strong spoken communication and persuasive selling skills.",
      "Field or inside sales experience is a plus, but freshers can apply.",
    ],
    description:
      "Grow revenue by converting qualified leads, maintaining pipeline discipline, and supporting new customer onboarding.",
  },
];

const companyRows = companies.map(([name, industry, city, state, website], index) => ({
  name,
  slug: `seed-company-${slugify(name)}`,
  website,
  industry,
  city,
  state,
  country: "India",
  size_range: sizeRanges[index % sizeRanges.length],
  description: `${name} is hiring across ${industry.toLowerCase()} teams with a focus on practical skills, delivery ownership, and strong communication.`,
  verified: true,
}));

const { error: companyError } = await supabase
  .from("companies")
  .upsert(companyRows, { onConflict: "slug" });

if (companyError) {
  console.error("Failed to seed companies:", formatSeedError(companyError));
  process.exit(1);
}

// Read the ids back rather than trusting the upsert payload: rows that
// already existed keep their original id, which the payload does not carry.
const { data: storedCompanies, error: companyReadError } = await supabase
  .from("companies")
  .select("id, slug")
  .in(
    "slug",
    companyRows.map((company) => company.slug),
  );

if (companyReadError) {
  console.error("Failed to read seeded companies:", formatSeedError(companyReadError));
  process.exit(1);
}

const companyIdBySlug = new Map(storedCompanies.map((company) => [company.slug, company.id]));
const jobRows = [];

companyRows.forEach((company, companyIndex) => {
  roleTemplates.forEach((role, roleIndex) => {
    const variant = companyIndex + roleIndex;
    const postedDate = dayOffset(-(variant % 10));
    const deadline = dayOffset(10 + (variant % 25));
    const salaryStep = role.salaryType === "monthly" ? 1500 : 30000;
    const salaryMin = role.minSalary + (variant % 4) * salaryStep;
    const salaryMax = role.maxSalary + (variant % 4) * salaryStep;
    const website = company.website.replace(/\/$/, "");
    const workMode = role.title === "Frontend Developer" && companyIndex % 3 === 0 ? "remote" : role.workMode;
    const jobType = role.title === "Digital Marketing Executive" && companyIndex % 4 === 0 ? "contract" : role.jobType;
    const title = role.title === "Sales Executive" && company.industry === "Fintech" ? "Relationship Sales Executive" : role.title;

    jobRows.push({
      company_id: companyIdBySlug.get(company.slug) ?? null,
      category_slug: role.categorySlug,
      title,
      slug: `seed-${slugify(`${title}-${company.name}-${company.city}`)}`,
      company_name: company.name,
      description: `${company.name} is hiring a ${title.toLowerCase()} in ${company.city}. ${role.description} The role supports active hiring needs in ${company.industry.toLowerCase()} operations and offers a clear path for candidates who can execute consistently.`,
      responsibilities: role.responsibilities,
      requirements: role.requirements,
      skills: unique([...role.skills, extraSkills[variant % extraSkills.length]]).slice(0, 6),
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_type: role.salaryType,
      city: company.city,
      state: company.state,
      country: "India",
      location: `${company.city}, ${company.state}`,
      job_type: jobType,
      work_mode: workMode,
      education_required: role.educationRequired,
      experience_required: role.experienceRequired,
      experience_min: role.experienceMin,
      experience_max: role.experienceMax,
      industry: company.industry,
      openings: role.openings + (variant % 3),
      recruiter_contact: `hiring@${new URL(company.website).host}`,
      status: "active",
      approval_status: "approved",
      no_candidate_payment: true,
      salary_disclosed: true,
      government_source_verified: false,
      suspicious_flags: [],
      is_suspicious: false,
      is_verified: false,
      is_featured: variant % 7 === 0,
      apply_url: `${website}/careers/${slugify(title)}-${slugify(company.city)}`,
      application_url: `${website}/careers/${slugify(title)}-${slugify(company.city)}`,
      deadline,
      source_type: "admin",
      source_url: `${website}/careers`,
      created_at: `${postedDate}T09:00:00.000Z`,
      updated_at: `${postedDate}T09:00:00.000Z`,
      expires_at: `${deadline}T23:59:59.000Z`,
      published_at: `${postedDate}T09:00:00.000Z`,
    });
  });
});

const { error: jobsError } = await supabase
  .from("jobs")
  .upsert(jobRows, { onConflict: "slug" });

if (jobsError) {
  console.error("Failed to seed jobs:", formatSeedError(jobsError));
  process.exit(1);
}

console.log(`Seeded ${companyRows.length} companies and ${jobRows.length} active jobs.`);

await connection.end();


function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function dayOffset(offset) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function unique(values) {
  return [...new Set(values)];
}

function formatSeedError(error) {
  const message = error?.message ?? String(error);

  if (message.toLowerCase().includes("permission denied")) {
    return `${message}. Confirm the MySQL user has write access to this database, then rerun npm run seed:jobs.`;
  }

  return message;
}
