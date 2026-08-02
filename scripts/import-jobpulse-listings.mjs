import { connect, createDb, randomUUID } from "./lib/mysql-client.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const JOBPULSE_SITE_URL = "https://jobpulse.in";
const JOBPULSE_API_BASE = `${JOBPULSE_SITE_URL}/wp-json/wp/v2`;
const JOB_CATEGORY_IDS = [2, 525];
const USER_AGENT = "JobPulseIndiaImporter/1.0 (+https://jobpulseindia.in)";
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_DB_TABLE = "jobpulse_import_jobs";
const PUBLIC_JOB_TABLE = "jobs";

function decodeHtmlEntities(input) {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-")
    .replace(/&hellip;/gi, "...")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function fixCommonMojibake(input) {
  return String(input ?? "")
    .replace(/â‚¹/g, "₹")
    .replace(/â€“/g, "-")
    .replace(/â€”/g, "-")
    .replace(/â€˜|â€™/g, "'")
    .replace(/â€œ|â€�/g, '"')
    .replace(/Â/g, "");
}

function stripHtml(input) {
  return fixCommonMojibake(decodeHtmlEntities(
    String(input ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  ))
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

function titleCase(value) {
  return String(value ?? "")
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function normalizeLabel(value) {
  return stripHtml(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildSummary(excerpt, contentText) {
  const base = firstNonEmpty(stripHtml(excerpt), contentText);
  if (!base) {
    return "Imported from JobPulse.in. Verify all details on the official source before applying.";
  }

  return base.length <= 320 ? base : `${base.slice(0, 317)}...`;
}

function normalizeDate(value) {
  if (!value) return null;

  const normalized = value.replace(/\s+/g, " ").trim();
  const isoMatch = normalized.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  const dmyMatch = normalized.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  }

  const textualMatch = normalized.match(/\b(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})\b/);
  if (textualMatch) {
    const monthMap = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      sept: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };

    const month = monthMap[textualMatch[2].toLowerCase()];
    if (month) {
      return `${textualMatch[3]}-${month}-${textualMatch[1].padStart(2, "0")}`;
    }
  }

  return null;
}

function extractSalaryBounds(value) {
  if (!value) {
    return { min: 0, max: 0 };
  }

  const numbers = (String(value).match(/\d[\d,]*/g) ?? [])
    .map((entry) => Number.parseInt(entry.replace(/,/g, ""), 10))
    .filter((entry) => Number.isFinite(entry) && entry > 0);

  if (numbers.length === 0) {
    return { min: 0, max: 0 };
  }

  if (numbers.length === 1) {
    return { min: numbers[0], max: numbers[0] };
  }

  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  };
}

function inferPublicJobType(title, contentText, category) {
  const haystack = `${title} ${contentText} ${category}`.toLowerCase();

  if (/\b(apprentice|intern(ship)?)\b/.test(haystack)) return "internship";
  if (/\b(walk[\s-]?in)\b/.test(haystack)) return "walk-in";
  if (/\b(contract|outsource|temporary)\b/.test(haystack)) return "contract";
  if (/\b(part time|part-time)\b/.test(haystack)) return "part-time";

  return "full-time";
}

function inferPublicWorkMode(title, contentText) {
  const haystack = `${title} ${contentText}`.toLowerCase();

  if (/\b(remote|online|work from home|wfh)\b/.test(haystack)) return "remote";
  if (/\b(hybrid)\b/.test(haystack)) return "hybrid";

  return "onsite";
}

function buildPublicJobSkills(row) {
  return Array.from(
    new Set(
      [
        "Government Job",
        row.category,
        row.category_slug ? titleCase(row.category_slug) : null,
        row.state && row.state !== "All India" ? row.state : null,
      ].filter((value) => typeof value === "string" && value.trim()),
    ),
  );
}

function extractLabeledValue(text, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`\\b${label}\\b\\s*[:\\-]?\\s*([^|.;\\n]{2,180})`, "i");
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Some upstream posts contain hrefs with two URLs pasted together
 * (".../UPSC_Enhttps://jobpulse.in/...pdfforcement.pdf"). They parse as valid
 * URLs but resolve to nothing, so drop anything with a second scheme in it.
 */
function isSaneUrl(href) {
  if (!href || href.length > 600) return false;
  if (!/^https?:\/\//i.test(href)) return false;
  return (href.match(/https?:\/\//gi) ?? []).length === 1;
}

function extractLinks(html, baseUrl) {
  return Array.from(
    String(html ?? "").matchAll(/<a\b[^>]*href=(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi),
  )
    .map((match) => {
      try {
        const href = new URL(match[1] ?? match[2] ?? match[3] ?? "", baseUrl).toString();
        const text = stripHtml(match[4] ?? "");
        return isSaneUrl(href) ? { href, text } : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function extractTables(html) {
  return Array.from(String(html ?? "").matchAll(/<table\b[\s\S]*?<\/table>/gi)).map((tableMatch) => {
    const tableHtml = tableMatch[0];
    return Array.from(tableHtml.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)).map((rowMatch) =>
      Array.from(rowMatch[0].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi))
        .map((cellMatch) => stripHtml(cellMatch[1] ?? ""))
        .filter(Boolean),
    );
  });
}

function extractSections(html) {
  const sections = [];
  const matches = Array.from(String(html ?? "").matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi));

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const heading = stripHtml(current[2] ?? "");
    const start = (current.index ?? 0) + current[0].length;
    const end = next?.index ?? html.length;
    sections.push({
      level: Number.parseInt(current[1] ?? "2", 10),
      heading,
      contentHtml: html.slice(start, end),
      contentText: stripHtml(html.slice(start, end)),
    });
  }

  return sections;
}

function splitLines(value) {
  return stripHtml(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function rowsToKeyValueList(rows) {
  return rows
    .filter((row) => row.length >= 2)
    .map((row) => ({
      label: row[0],
      value: row.slice(1).join(" | "),
    }))
    .filter((row) => row.label && row.value);
}

function findSectionIndex(sections, aliases) {
  return sections.findIndex((section) => aliases.some((alias) => matchesHeadingAlias(section.heading, alias)));
}

function sectionBullets(section) {
  const bullets = [
    ...Array.from(section.contentHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)).map((match) => stripHtml(match[1] ?? "")),
    ...splitLines(section.contentText)
      .filter((line) => !line.startsWith(section.heading))
      .slice(0, 12),
  ]
    .map((line) => line.trim())
    .filter(Boolean);

  return Array.from(new Set(bullets));
}

function collectChildSections(sections, aliases) {
  const index = findSectionIndex(sections, aliases);
  if (index < 0) {
    return [];
  }

  const parent = sections[index];
  const items = [];

  for (let cursor = index + 1; cursor < sections.length; cursor += 1) {
    const section = sections[cursor];
    if (section.level <= parent.level) {
      break;
    }

    const uniqueBullets = sectionBullets(section);
    if (uniqueBullets.length > 0) {
      items.push({
        title: section.heading,
        bullets: uniqueBullets,
      });
    }
  }

  // Most source posts put the list directly under the heading with no
  // sub-headings at all. Without this fallback those sections import empty.
  if (items.length === 0) {
    const ownBullets = sectionBullets(parent);
    if (ownBullets.length > 0) {
      return [{ title: parent.heading, bullets: ownBullets.slice(0, 12) }];
    }
  }

  return items;
}

function extractSectionRowsByAliases(sections, aliases) {
  const index = findSectionIndex(sections, aliases);
  if (index < 0) {
    return [];
  }

  return extractTables(sections[index].contentHtml).flat();
}

/**
 * Table rows for a section, falling back to its bullet list when the source
 * post writes the detail as prose instead of a table. Bullets shaped like
 * "Post Name – Qualification" become {label, value}; plain bullets keep the
 * section heading as the label so the text still reaches the page.
 */
function extractSectionDetailRows(sections, aliases) {
  const tableRows = rowsToKeyValueList(extractSectionRowsByAliases(sections, aliases));
  if (tableRows.length > 0) {
    return tableRows;
  }

  const index = findSectionIndex(sections, aliases);
  if (index < 0) {
    return [];
  }

  const section = sections[index];
  const rows = [];

  for (const bullet of sectionBullets(section)) {
    if (bullet.length < 4 || bullet.length > 400) continue;

    const separator = bullet.match(/\s+[–—:-]\s+/);
    if (separator?.index !== undefined) {
      const label = bullet.slice(0, separator.index).trim();
      const value = bullet.slice(separator.index + separator[0].length).trim();
      if (label && value && label.length <= 120) {
        rows.push({ label, value });
        continue;
      }
    }

    rows.push({ label: section.heading, value: bullet });
  }

  return rows;
}

function extractSectionLinks(sections, aliases, baseUrl) {
  const index = findSectionIndex(sections, aliases);
  if (index < 0) {
    return [];
  }

  const links = extractLinks(sections[index].contentHtml, baseUrl);
  return links
    .map((link) => ({
      label: link.text || new URL(link.href).hostname,
      href: link.href,
    }))
    .filter((link) => link.href && link.label);
}

function extractShortInformation(contentText) {
  const match = contentText.match(/Short Information:\s*([\s\S]*?)(?:\n[A-Z][^\n]*:|\n##|\n###|$)/i);
  return match?.[1] ? stripHtml(match[1]) : null;
}

function extractIntroFacts(contentText) {
  const lines = splitLines(contentText).slice(0, 14);
  const facts = [];

  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator <= 0) {
      continue;
    }

    const label = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (label && value) {
      facts.push({ label, value });
    }
  }

  return facts;
}

function matchesHeadingAlias(heading, alias) {
  const normalizedHeading = normalizeLabel(heading);
  const normalizedAlias = normalizeLabel(alias);

  return (
    normalizedHeading === normalizedAlias ||
    normalizedHeading.startsWith(`${normalizedAlias} `) ||
    normalizedHeading.endsWith(` ${normalizedAlias}`) ||
    normalizedHeading.includes(` ${normalizedAlias} `)
  );
}

function buildRowLookup(tables) {
  const lookup = new Map();

  for (const table of tables) {
    for (const row of table) {
      if (row.length < 2) continue;
      const key = normalizeLabel(row[0]);
      const value = row.slice(1).join(" | ").trim();
      if (key && value && !lookup.has(key)) {
        lookup.set(key, value);
      }
    }
  }

  return lookup;
}

function readRowValue(lookup, aliases) {
  const normalizedAliases = aliases.map((alias) => normalizeLabel(alias)).filter(Boolean);

  for (const alias of normalizedAliases) {
    if (lookup.has(alias)) {
      return lookup.get(alias);
    }
  }

  for (const alias of normalizedAliases) {
    for (const [key, value] of lookup.entries()) {
      if (key.startsWith(`${alias} `) || key.startsWith(`${alias}:`)) {
        return value;
      }
    }
  }

  for (const alias of aliases) {
    const normalizedAlias = normalizeLabel(alias);
    for (const [key, value] of lookup.entries()) {
      if (normalizedAlias.length >= 8 && key.includes(normalizedAlias)) {
        return value;
      }
    }
  }

  return null;
}

function inferCategory(categories, title, contentText) {
  const categorySlugs = categories.map((entry) => entry.slug);
  const haystack = `${title} ${contentText}`.toLowerCase();

  if (categorySlugs.includes("ssc-jobs") || /\bssc\b/.test(haystack)) {
    return { category: "SSC", categorySlug: "ssc" };
  }
  if (categorySlugs.includes("bank-jobs") || /\b(bank|ibps|sbi|rbi|nabard)\b/.test(haystack)) {
    return { category: "Banking", categorySlug: "banking" };
  }
  if (categorySlugs.includes("railway-jobs") || /\b(rrb|railway|railways)\b/.test(haystack)) {
    return { category: "Railways", categorySlug: "railways" };
  }
  if (categorySlugs.includes("defence-jobs") || /\b(army|navy|air force|agniveer|defence|drdo)\b/.test(haystack)) {
    return { category: "Defence", categorySlug: "defence" };
  }
  if (categorySlugs.includes("police-jobs") || /\b(police|constable|si)\b/.test(haystack)) {
    return { category: "Police", categorySlug: "police" };
  }
  if (categorySlugs.includes("teaching-jobs") || /\b(teacher|teaching|lecturer|professor|tgt|pgt|prt)\b/.test(haystack)) {
    return { category: "Teaching", categorySlug: "teaching" };
  }
  if (categorySlugs.includes("haryana-govt-jobs") || categorySlugs.includes("hkrn") || categorySlugs.includes("dc-rate-jobs")) {
    return { category: "Haryana Jobs", categorySlug: "haryana-jobs" };
  }

  return { category: "State Government", categorySlug: "state-government" };
}

function inferState(title, categories, contentText) {
  const haystack = `${title} ${contentText}`.toLowerCase();
  const categorySlugs = categories.map((entry) => entry.slug);

  if (categorySlugs.includes("haryana-govt-jobs") || categorySlugs.includes("hkrn") || categorySlugs.includes("dc-rate-jobs") || haystack.includes("haryana")) {
    return "Haryana";
  }
  if (haystack.includes("punjab")) return "Punjab";
  if (haystack.includes("delhi")) return "Delhi";
  if (haystack.includes("uttar pradesh") || /\buppsc\b|\bupsssc\b/.test(haystack)) return "Uttar Pradesh";
  if (haystack.includes("rajasthan")) return "Rajasthan";
  if (haystack.includes("bihar")) return "Bihar";
  if (haystack.includes("maharashtra")) return "Maharashtra";
  if (haystack.includes("india")) return "All India";
  return "All India";
}

function extractSectionText(sections, aliases) {
  for (const section of sections) {
    if (aliases.some((alias) => matchesHeadingAlias(section.heading, alias))) {
      return section.contentText;
    }
  }

  return null;
}

function extractSectionTableRows(sections, aliases) {
  for (const section of sections) {
    if (aliases.some((alias) => matchesHeadingAlias(section.heading, alias))) {
      return extractTables(section.contentHtml).flat();
    }
  }

  return [];
}

function compactSectionValue(value, maxLength = 280) {
  const cleaned = stripHtml(value ?? "");
  if (!cleaned) {
    return null;
  }

  if (cleaned.length <= maxLength && cleaned.split("\n").length <= 6) {
    return cleaned;
  }

  const firstSentence = cleaned.split(/(?<=[.])\s+/)[0]?.trim();
  return firstSentence && firstSentence.length <= maxLength ? firstSentence : null;
}

function sanitizeExtractedField(value, options = {}) {
  const cleaned = stripHtml(value ?? "");
  if (!cleaned) {
    return null;
  }

  const normalized = cleaned.toLowerCase();
  const blockedSnippets = options.blockedSnippets ?? ["post title:", "post date / update:", " overview"];
  if (blockedSnippets.some((snippet) => normalized.includes(snippet))) {
    return null;
  }

  if (cleaned.length > (options.maxLength ?? 280)) {
    return null;
  }

  return cleaned;
}

function extractImportantDates(sections, lookup, contentText) {
  const rows = extractSectionTableRows(sections, ["important dates"]);
  const items = [];

  for (const row of rows) {
    if (row.length >= 2) {
      items.push(`${row[0]}: ${row.slice(1).join(" | ")}`);
    }
  }

  const lastDate = firstNonEmpty(
    readRowValue(lookup, ["last date", "last date to apply", "closing date", "application last date"]),
    extractLabeledValue(contentText, ["last date", "closing date", "apply by"]),
  );

  if (lastDate && !items.some((item) => item.toLowerCase().includes("last date"))) {
    items.push(`Last date: ${lastDate}`);
  }

  return items.length > 0 ? items : undefined;
}

/** WordPress `date`/`modified` are naive local strings; treat them as UTC. */
function normalizeTimestamp(value) {
  if (!value) return null;
  const raw = String(value);
  const parsed = new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(raw) ? raw : `${raw}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stripHash(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * True when `url` points back at the aggregator we scraped rather than at the
 * recruiting body. Those links must never be published as the official
 * notification / apply destination — candidates would land on a mirror of the
 * page they are already reading instead of the government portal.
 */
function isAggregatorUrl(url, sourcePageUrl) {
  const host = hostOf(url);
  if (!host) return true;
  const sourceHost = hostOf(sourcePageUrl);
  return host === sourceHost || host === "jobpulse.in";
}

function pickLink(links, patterns, options = {}) {
  const sourcePage = options.sourcePage ? stripHash(options.sourcePage) : null;

  return (
    links.find((link) => {
      if (!patterns.some((pattern) => pattern.test(`${link.text} ${link.href}`))) {
        return false;
      }

      if (sourcePage && stripHash(link.href) === sourcePage && link.href.includes("#")) {
        return false;
      }

      if (options.excludeAggregator && isAggregatorUrl(link.href, options.sourcePage)) {
        return false;
      }

      return true;
    })?.href ?? null
  );
}

const FAQ_HEADING_PATTERN = /\bfaq|frequently asked|common question|questions? and answers?\b/;

function cleanFaqQuestion(value) {
  // Source posts prefix questions inconsistently: "Q1.", "Q.2", "1)", "Q -".
  return stripHtml(value)
    .replace(/^q\s*[.\-:)]?\s*\d*\s*[.\-:)]?\s*/i, "")
    .replace(/^\d+\s*[.\-:)]\s*/, "")
    .trim();
}

function faqPairsFromHtml(html) {
  const pairs = [];

  // Heading-then-paragraph layout.
  for (const match of html.matchAll(
    /<h[2-6]\b[^>]*>([\s\S]*?)<\/h[2-6]>\s*((?:<(?:p|div|ul|ol)\b[\s\S]*?<\/(?:p|div|ul|ol)>\s*){1,3})/gi,
  )) {
    pairs.push({ question: cleanFaqQuestion(match[1] ?? ""), answer: stripHtml(match[2] ?? "") });
  }

  // <p><strong>Question</strong> answer</p> layout.
  for (const match of html.matchAll(
    /<p\b[^>]*>\s*<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>\s*([\s\S]*?)<\/p>/gi,
  )) {
    const answer = stripHtml(match[2] ?? "");
    if (answer) {
      pairs.push({ question: cleanFaqQuestion(match[1] ?? ""), answer });
    }
  }

  // <details><summary>Question</summary> answer</details> accordion layout.
  for (const match of html.matchAll(
    /<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi,
  )) {
    pairs.push({ question: cleanFaqQuestion(match[1] ?? ""), answer: stripHtml(match[2] ?? "") });
  }

  return pairs;
}

function extractFaq(sections) {
  const faqSections = sections.filter((section) => FAQ_HEADING_PATTERN.test(normalizeLabel(section.heading)));
  if (faqSections.length === 0) {
    return undefined;
  }

  const seen = new Set();
  const entries = [];

  for (const section of faqSections) {
    // A heading that is itself the question ("Q1. Who can apply?") carries its
    // answer in the section body rather than in a nested heading/paragraph.
    const ownQuestion = cleanFaqQuestion(section.heading);
    const ownAnswer = stripHtml(section.contentText);
    const candidates = faqPairsFromHtml(section.contentHtml);

    if (candidates.length === 0 && /\?/.test(section.heading) && ownAnswer) {
      candidates.push({ question: ownQuestion, answer: ownAnswer });
    }

    for (const entry of candidates) {
      const question = entry.question;
      const answer = entry.answer;

      if (!question || !answer || question.length < 8 || answer.length < 8) continue;
      if (question.length > 300 || answer.length > 1200) continue;
      if (normalizeLabel(question) === normalizeLabel(answer)) continue;

      const key = normalizeLabel(question);
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ question, answer });
    }
  }

  return entries.length > 0 ? entries.slice(0, 12) : undefined;
}

// Heading wording varies a lot between source posts; each list is the set of
// headings observed across the feed for one logical section.
const EDUCATION_ALIASES = [
  "educational qualification",
  "education qualification",
  "educational qualifications",
  "qualification",
  "qualifications",
  "eligibility",
  "eligibility criteria",
  "education details",
  "post wise eligibility",
  "post wise qualification",
];
const AGE_ALIASES = ["age limit", "age limits", "age criteria", "age details", "age limit as on"];
const FEE_ALIASES = ["application fee", "application fees", "fee details", "examination fee", "fees"];
const VACANCY_ALIASES = [
  "vacancy details",
  "vacancy detail",
  "post details",
  "post wise vacancy",
  "vacancy",
  "total vacancy",
  "total posts",
];
const SALARY_ALIASES = ["salary structure", "salary", "pay scale", "salary details", "pay matrix", "stipend"];
const DOCUMENTS_ALIASES = [
  "documents required",
  "required documents",
  "documents needed",
  "document required",
  "list of documents",
  "documents to carry",
  "required document",
];
const HOW_TO_APPLY_ALIASES = [
  "how to apply",
  "how to apply online",
  "application process",
  "how to fill the form",
  "steps to apply",
  "apply process",
  "how to apply for",
];
const SELECTION_ALIASES = [
  "selection process",
  "selection procedure",
  "selection criteria",
  "mode of selection",
  "recruitment process",
];

const OFFICIAL_DOMAIN_PATTERN = /(^|\.)(gov\.in|nic\.in|gov|edu\.in|ac\.in|org\.in)$/i;

/** Government portals and PSU sites we can safely treat as the official source. */
function isOfficialDomain(url) {
  const host = hostOf(url);
  if (!host) return false;
  if (OFFICIAL_DOMAIN_PATTERN.test(host)) return true;
  return /(^|\.)(ibps|sbi|rrbapply|rrcb|upsc|ssc|nta|joinindianarmy|indianrailways)\./i.test(host);
}

/**
 * Answers here only restate values already extracted from the notification —
 * nothing is inferred or invented, because a wrong eligibility or fee answer on
 * a recruitment page has real consequences for applicants.
 */
function buildFactualFaq({ title, openings, lastDate, eligibility, ageLimit, applicationFee, salary, selectionProcess, applyUrl, notificationUrl }) {
  const entries = [];
  const usable = (value) =>
    typeof value === "string" && value.trim().length >= 3 && !/^verify on official website$/i.test(value.trim());

  if (usable(eligibility)) {
    entries.push({
      question: `What is the educational qualification for ${title}?`,
      answer: `${eligibility.trim()} Confirm the exact qualification in the official notification before applying.`,
    });
  }
  if (usable(ageLimit)) {
    entries.push({ question: `What is the age limit for ${title}?`, answer: `${ageLimit.trim()} Age relaxation applies as per government rules.` });
  }
  if (usable(applicationFee)) {
    entries.push({ question: `What is the application fee?`, answer: applicationFee.trim() });
  }
  if (usable(openings)) {
    entries.push({ question: `How many vacancies are available?`, answer: `${openings.trim()} as announced in the notification.` });
  }
  if (usable(lastDate)) {
    entries.push({ question: `What is the last date to apply?`, answer: `The last date to apply is ${lastDate.trim()}. Apply before the deadline as it is rarely extended.` });
  }
  if (usable(salary)) {
    entries.push({ question: `What is the salary?`, answer: salary.trim() });
  }
  if (usable(selectionProcess)) {
    entries.push({ question: `What is the selection process?`, answer: selectionProcess.trim().slice(0, 600) });
  }
  if (applyUrl || notificationUrl) {
    entries.push({
      question: `How can I apply for ${title}?`,
      answer: applyUrl
        ? `Apply online through the official portal: ${applyUrl}`
        : `Read the official notification and follow the application instructions given in it: ${notificationUrl}`,
    });
  }

  return entries.slice(0, 8);
}

function parseJobPost(post, categoriesById) {
  const title = stripHtml(post.title?.rendered ?? "");
  const contentHtml = post.content?.rendered ?? "";
  const excerptHtml = post.excerpt?.rendered ?? "";
  const contentText = stripHtml(contentHtml);
  const sections = extractSections(contentHtml);
  const tables = extractTables(contentHtml);
  const lookup = buildRowLookup(tables);
  const links = extractLinks(contentHtml, post.link);
  const categories = (post.categories ?? [])
    .map((id) => categoriesById.get(id))
    .filter(Boolean);

  const categoryInfo = inferCategory(categories, title, contentText);
  const state = inferState(title, categories, contentText);
  const overviewRows = rowsToKeyValueList(
    extractSectionRowsByAliases(sections, ["overview", `${title} overview`]),
  );
  const importantDateRows = rowsToKeyValueList(
    extractSectionRowsByAliases(sections, ["important dates"]),
  );
  const feeRows = extractSectionDetailRows(sections, FEE_ALIASES);
  const ageRows = extractSectionDetailRows(sections, AGE_ALIASES);
  const vacancyRows = extractSectionDetailRows(sections, VACANCY_ALIASES);
  const educationRows = extractSectionDetailRows(sections, EDUCATION_ALIASES);
  const salaryRows = extractSectionDetailRows(sections, SALARY_ALIASES);
  const importantLinks = extractSectionLinks(sections, ["important links"], post.link);
  const shortInformation = extractShortInformation(contentText);
  const introFacts = extractIntroFacts(contentText);
  const jobLocation = firstNonEmpty(
    readRowValue(lookup, ["job location", "location"]),
    extractLabeledValue(contentText, ["job location", "location", "state"]),
  );
  const department = firstNonEmpty(
    readRowValue(lookup, ["department", "organization", "board", "commission", "conducting body"]),
    categories.find((entry) => entry.slug !== "latest-jobs" && entry.slug !== "government-jobs")?.name,
    title.split(":")[0],
  );

  const openings = firstNonEmpty(
    title.match(/\bfor\s+([\d,+]+)\s+posts?\b/i)?.[1],
    title.match(/\b([\d,+]+)\s+posts?\b/i)?.[1],
    readRowValue(lookup, ["total post", "total posts", "total vacancy", "total vacancies", "no of posts", "number of posts", "vacancy", "vacancy details"]),
    // Post-wise tables have no total row; sum the per-post counts instead.
    (() => {
      const counts = vacancyRows
        .map((row) => Number.parseInt(String(row.value).replace(/[^\d]/g, ""), 10))
        .filter((value) => Number.isFinite(value) && value > 0);
      const total = counts.reduce((sum, value) => sum + value, 0);
      return counts.length >= 2 && total > 0 ? String(total) : null;
    })(),
    contentText.match(/\b([\d,]{2,7})\s+(?:total\s+)?(?:posts?|vacanc(?:y|ies))\b/i)?.[1],
  );

  const eligibility = sanitizeExtractedField(firstNonEmpty(
    readRowValue(lookup, [...EDUCATION_ALIASES, "essential qualification"]),
    compactSectionValue(extractSectionText(sections, EDUCATION_ALIASES)),
    educationRows[0] ? `${educationRows[0].label}: ${educationRows[0].value}` : null,
    extractLabeledValue(contentText, ["eligibility", "qualification", "educational qualification"]),
  ));

  const ageLimit = firstNonEmpty(
    readRowValue(lookup, [...AGE_ALIASES, "minimum age", "maximum age"]),
    compactSectionValue(extractSectionText(sections, AGE_ALIASES)),
    ageRows[0] ? `${ageRows[0].label}: ${ageRows[0].value}` : null,
    extractLabeledValue(contentText, ["age limit", "age"]),
  );

  const applicationFee = firstNonEmpty(
    readRowValue(lookup, FEE_ALIASES),
    compactSectionValue(extractSectionText(sections, FEE_ALIASES)),
    feeRows[0] ? `${feeRows[0].label}: ${feeRows[0].value}` : null,
    extractLabeledValue(contentText, ["application fee"]),
  );

  const salary = sanitizeExtractedField(firstNonEmpty(
    readRowValue(lookup, SALARY_ALIASES),
    compactSectionValue(extractSectionText(sections, SALARY_ALIASES)),
    salaryRows[0] ? `${salaryRows[0].label}: ${salaryRows[0].value}` : null,
  ), { maxLength: 500, blockedSnippets: ["post title:", "post date / update:"] });

  const syllabus = sanitizeExtractedField(firstNonEmpty(
    compactSectionValue(extractSectionText(sections, ["syllabus", "exam pattern"]), 500),
    readRowValue(lookup, ["syllabus", "exam pattern"]),
  ), { maxLength: 700, blockedSnippets: ["post title:", "post date / update:"] });

  const importantDates = extractImportantDates(sections, lookup, contentText);
  const lastDateText = firstNonEmpty(
    readRowValue(lookup, ["last date", "last date to apply", "closing date"]),
    importantDates?.find((item) => item.toLowerCase().includes("last date"))?.split(":").slice(1).join(":").trim(),
    extractLabeledValue(contentText, ["last date", "closing date", "apply by"]),
  );
  const lastDate = normalizeDate(lastDateText);

  const officialLinkOptions = { sourcePage: post.link, excludeAggregator: true };
  const officialImportantLinks = importantLinks.filter((link) => !isAggregatorUrl(link.href, post.link));

  const notificationUrl = pickLink(
    links,
    [/official notification/i, /download notification/i, /notification pdf/i, /\.pdf(\?|$)/i],
    officialLinkOptions,
  );
  const applyUrl =
    officialImportantLinks.find((link) => /apply online|registration|apply link/i.test(link.label))?.href ??
    pickLink(links, [/apply online/i, /registration/i, /\bapply\b/i], officialLinkOptions);
  const officialWebsiteFromLinks =
    officialImportantLinks.find((link) => /official website/i.test(link.label))?.href ??
    pickLink(links, [/official website/i], officialLinkOptions);
  // Last resort: any outbound link on a recognised government domain. Many
  // posts link the portal by bare URL with no "official website" label.
  const officialDomainLink =
    officialImportantLinks.find((link) => isOfficialDomain(link.href))?.href ??
    links.find((link) => isOfficialDomain(link.href) && !isAggregatorUrl(link.href, post.link))?.href ??
    null;
  // Deliberately no `post.link` fallback: an aggregator URL presented as the
  // official website is worse than showing no official link at all.
  const officialUrl = firstNonEmpty(
    officialWebsiteFromLinks,
    notificationUrl,
    applyUrl,
    officialDomainLink,
  );

  const selectionSteps = collectChildSections(sections, SELECTION_ALIASES).map((section) => ({
    title: section.title,
    bullets: section.bullets.slice(0, 10),
  }));
  const documentsRequired = collectChildSections(sections, DOCUMENTS_ALIASES).map((section) => ({
    title: section.title,
    bullets: section.bullets.slice(0, 10),
  }));
  const howToApplySteps = collectChildSections(sections, HOW_TO_APPLY_ALIASES).map((section) => ({
    title: section.title,
    bullets: section.bullets.slice(0, 10),
  }));

  const selectionProcess = sanitizeExtractedField(firstNonEmpty(
    compactSectionValue(extractSectionText(sections, SELECTION_ALIASES), 1000),
    readRowValue(lookup, ["selection process"]),
  ), { maxLength: 2000, blockedSnippets: ["post title:", "post date / update:", "overview"] });

  const summary = buildSummary(excerptHtml, shortInformation || contentText);

  const overview = overviewRows.length > 0 ? overviewRows : introFacts;
  // Only official destinations here — an "Apply Online" row that points back at
  // the aggregator sends candidates in a circle.
  const importantLinksForMeta = officialImportantLinks.length > 0
    ? officialImportantLinks
    : [
        officialUrl ? { label: "Official Website", href: officialUrl } : null,
        notificationUrl ? { label: "Official Notification", href: notificationUrl } : null,
        applyUrl ? { label: "Apply Online", href: applyUrl } : null,
      ].filter(Boolean);

  const importantDateItems = importantDateRows.length > 0
    ? importantDateRows.map((row) => `${row.label}: ${row.value}`)
    : importantDates ?? [];

  const sanitizedOverview = overview.slice(0, 12);
  const sanitizedVacancies = vacancyRows.slice(0, 16);
  const sanitizedEducation = educationRows.slice(0, 16);
  const sanitizedAge = ageRows.slice(0, 16);
  const sanitizedFees = feeRows.slice(0, 16);
  const sanitizedSalary = salaryRows.slice(0, 12);

  const applyUrlFallback = pickLink(
    links,
    [/apply|online form|registration|recruitment portal/i],
    officialLinkOptions,
  );

  return {
    fetch_key: `jobpulse-wordpress:${post.id}`,
    slug: slugify(post.slug || title) || `jobpulse-${post.id}`,
    title,
    department: department || "JobPulse.in",
    category: categoryInfo.category,
    category_slug: categoryInfo.categorySlug,
    state: jobLocation || state,
    eligibility: eligibility || "Verify on official website",
    age_limit: ageLimit || "Verify on official website",
    fees: applicationFee || null,
    application_fee: applicationFee || null,
    last_date: lastDate,
    official_url: officialUrl,
    notification_url: notificationUrl,
    official_apply_url: applyUrl ?? applyUrlFallback ?? officialUrl,
    source_url: post.link,
    summary,
    metadata: {
      source: "jobpulse.in",
      shortInformation: shortInformation || null,
      openings: openings ? `${openings} Posts` : null,
      vacancy: openings ? `${openings} Posts` : null,
      salary: salary || null,
      syllabus: syllabus || null,
      selectionProcess: selectionProcess || null,
      overview: sanitizedOverview,
      vacancyDetails: sanitizedVacancies,
      educationDetails: sanitizedEducation,
      ageDetails: sanitizedAge,
      feeDetails: sanitizedFees,
      salaryDetails: sanitizedSalary,
      selectionSteps,
      documentsRequired,
      howToApplySteps,
      importantDates: importantDateItems,
      importantLinks: importantLinksForMeta,
      // Source posts carry no FAQ markup, so fall back to Q&A built strictly
      // from the fields extracted above.
      faq:
        extractFaq(sections) ??
        buildFactualFaq({
          title,
          openings: openings ? `${openings} Posts` : null,
          lastDate,
          eligibility,
          ageLimit,
          applicationFee,
          salary,
          selectionProcess,
          applyUrl: applyUrl ?? applyUrlFallback ?? null,
          notificationUrl,
        }),
      wordpressPostId: post.id,
      wordpressCategories: categories.map((entry) => ({
        id: entry.id,
        slug: entry.slug,
        name: entry.name,
      })),
      publishedAt: post.date ?? null,
      modifiedAt: post.modified ?? null,
    },
    official_last_checked_at: new Date().toISOString(),
    status: "approved",
  };
}

async function fetchJson(url) {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Fetch failed for ${url} with status ${response.status}`);
      }

      return {
        headers: response.headers,
        data: await response.json(),
      };
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1_000 * attempt));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Fetch failed for ${url}`);
}

async function fetchCategories() {
  const { data } = await fetchJson(`${JOBPULSE_API_BASE}/categories?per_page=100`);
  return new Map(
    data.map((entry) => [
      entry.id,
      {
        id: entry.id,
        slug: entry.slug,
        name: entry.name,
      },
    ]),
  );
}

async function fetchPostsForCategory(categoryId) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url =
      `${JOBPULSE_API_BASE}/posts?categories=${categoryId}` +
      `&per_page=${DEFAULT_BATCH_SIZE}&page=${page}` +
      "&_fields=id,date,modified,slug,link,title,content,excerpt,categories";
    const { headers, data } = await fetchJson(url);
    totalPages = Number.parseInt(headers.get("x-wp-totalpages") ?? "1", 10);
    items.push(...data);
    page += 1;
  } while (page <= totalPages);

  return items;
}

async function loadAllJobpulsePosts() {
  const byId = new Map();

  for (const categoryId of JOB_CATEGORY_IDS) {
    const posts = await fetchPostsForCategory(categoryId);
    for (const post of posts) {
      byId.set(post.id, post);
    }
  }

  return Array.from(byId.values()).sort((left, right) => {
    const leftDate = new Date(left.date ?? 0).getTime();
    const rightDate = new Date(right.date ?? 0).getTime();
    return rightDate - leftDate;
  });
}

async function getSourceId(supabase) {
  const { data: existing } = await supabase
    .from("job_sources")
    .select("id")
    .eq("source_url", JOBPULSE_SITE_URL)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const sourceId = randomUUID();
  const { error } = await supabase
    .from("job_sources")
    .insert({
      id: sourceId,
      name: "JobPulse.in WordPress Import",
      source_type: "partner",
      transport_type: "html",
      source_url: JOBPULSE_SITE_URL,
      status: "active",
      allow_auto_fetch: false,
      notes: "Imported from the JobPulse.in WordPress API. Verify official links and details periodically.",
      config: {
        sourceType: "company-career-page",
        companyName: "JobPulse.in",
        industry: "Job Aggregator",
        defaultCity: "Panipat",
        defaultState: "Haryana",
        fetchFrequencyMinutes: 1440,
      },
    });

  if (error) {
    throw new Error(error.message ?? "Unable to create job source row for JobPulse.in");
  }

  return sourceId;
}

function toJobpulseImportRow(row) {
  const meta = row.metadata ?? {};

  return {
    fetch_key: row.fetch_key,
    source_post_id: meta.wordpressPostId ?? null,
    slug: row.slug,
    title: row.title,
    department: row.department,
    category: row.category,
    category_slug: row.category_slug,
    state: row.state,
    eligibility: row.eligibility,
    age_limit: row.age_limit,
    fees: row.fees,
    application_fee: row.application_fee,
    last_date: row.last_date,
    official_url: row.official_url,
    notification_url: row.notification_url,
    official_apply_url: row.official_apply_url,
    source_url: row.source_url,
    summary: row.summary,
    openings: meta.openings ?? meta.vacancy ?? null,
    salary: meta.salary ?? null,
    syllabus: meta.syllabus ?? null,
    selection_process: meta.selectionProcess ?? null,
    important_dates: Array.isArray(meta.importantDates) ? meta.importantDates : [],
    faq: Array.isArray(meta.faq) ? meta.faq : [],
    metadata: meta,
    status: "approved",
  };
}

function toPublicJobRow(row) {
  const meta = row.metadata ?? {};
  const salary = extractSalaryBounds(meta.salary ?? null);
  const state = row.state || "All India";
  const deadline = row.last_date ?? null;
  const applicationUrl = row.official_apply_url ?? row.official_url ?? row.notification_url ?? row.source_url;
  const contentText = [row.title, row.summary, row.eligibility, meta.selectionProcess].filter(Boolean).join(" ");

  return {
    slug: row.slug,
    category_slug: null,
    title: row.title,
    company_name: row.department || "Government Department",
    description: row.summary || "Verify the official notification for complete details.",
    responsibilities: [
      "Read the official notification before applying.",
      ...(Array.isArray(meta.importantDates) ? meta.importantDates.slice(0, 2).map((entry) => `Important date: ${entry}`) : []),
      ...(meta.selectionProcess ? [`Selection process: ${meta.selectionProcess}`] : []),
    ],
    requirements: [
      `Eligibility: ${row.eligibility || "Verify on official website"}`,
      `Age limit: ${row.age_limit || "Verify on official website"}`,
      ...(row.application_fee || row.fees ? [`Application fee: ${row.application_fee || row.fees}`] : []),
    ],
    skills: buildPublicJobSkills(row),
    salary_min: salary.min,
    salary_max: salary.max,
    salary_type: "yearly",
    city: state,
    state,
    country: "India",
    job_type: inferPublicJobType(row.title, contentText, row.category),
    work_mode: inferPublicWorkMode(row.title, contentText),
    education_required: row.eligibility || "Verify on official website",
    experience_required: "Check official notification",
    industry: "Government",
    openings: Number.parseInt(String(meta.openings ?? meta.vacancy ?? "").replace(/[^\d]/g, ""), 10) || 1,
    recruiter_contact: "",
    status: "active",
    approval_status: "approved",
    is_featured: false,
    application_url: applicationUrl,
    deadline,
    source_type: "official",
    source_url: row.source_url ?? row.official_url ?? row.notification_url ?? null,
    // Without this every imported listing inherits `created_at` and the whole
    // board reads "Posted today" on each run.
    published_at: normalizeTimestamp(meta.publishedAt) ?? normalizeTimestamp(meta.modifiedAt),
  };
}

async function upsertRows(supabase, table, rows, onConflict = "slug") {
  const { error } = await supabase
    .from(table)
    .upsert(rows, { onConflict });

  if (error) {
    throw new Error(error.message);
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitIndex = process.argv.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number.parseInt(process.argv[limitIndex + 1] ?? "", 10) : null;
  const exportIndex = process.argv.indexOf("--export-json");
  const exportJsonPath = exportIndex >= 0 ? process.argv[exportIndex + 1] : null;
  const tableIndex = process.argv.indexOf("--table");
  const targetTable = tableIndex >= 0 ? process.argv[tableIndex + 1] : DEFAULT_DB_TABLE;

  // --export-json and --dry-run only read the upstream feed, so they must not
  // require database credentials.
  const needsDatabase = !exportJsonPath && !dryRun;
  const connection = needsDatabase ? await connect() : null;
  const supabase = connection ? createDb(connection) : null;

  const [categoriesById, posts] = await Promise.all([fetchCategories(), loadAllJobpulsePosts()]);
  const sourceId = supabase && targetTable === "government_jobs" ? await getSourceId(supabase) : null;
  const parsedJobs = posts
    .map((post) => parseJobPost(post, categoriesById))
    .filter((job) => job.title && job.summary)
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : undefined)
    .map((job) => (sourceId ? { ...job, source_id: sourceId } : job));

  console.log(`Prepared ${parsedJobs.length} JobPulse.in listings for import.`);

  if (exportJsonPath) {
    const outputPath = path.resolve(exportJsonPath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(parsedJobs, null, 2)}\n`, "utf8");
    console.log(`Exported ${parsedJobs.length} JobPulse.in listings to ${outputPath}.`);
    return;
  }

  if (dryRun) {
    const previewRows =
      targetTable === "jobpulse_import_jobs"
        ? parsedJobs.slice(0, 3).map(toJobpulseImportRow)
        : targetTable === PUBLIC_JOB_TABLE
          ? parsedJobs.slice(0, 3).map(toPublicJobRow)
        : parsedJobs.slice(0, 3);
    console.log(JSON.stringify(previewRows, null, 2));
    return;
  }

  if (targetTable === "jobpulse_import_jobs") {
    await upsertRows(
      supabase,
      targetTable,
      parsedJobs.map(toJobpulseImportRow),
      "slug",
    );
  } else if (targetTable === PUBLIC_JOB_TABLE) {
    await upsertRows(
      supabase,
      targetTable,
      parsedJobs.map(toPublicJobRow),
      "slug",
    );
  } else {
    await upsertRows(supabase, targetTable, parsedJobs, "fetch_key");
  }

  console.log(`Imported ${parsedJobs.length} JobPulse.in listings into ${targetTable}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  // Without this the open MySQL connection keeps the process alive.
  .finally(() => process.exit(process.exitCode ?? 0));
