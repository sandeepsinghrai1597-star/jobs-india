import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { connect, createDb, loadEnvFiles, randomUUID } from "./lib/mysql-client.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const generatedDir = path.join(projectRoot, "e2e", ".generated");
const fixturePath = path.join(generatedDir, "fixtures.json");

loadEnvFiles([".env.local", ".env"]);

const password = "JobPulse123";
const users = {
  candidate: {
    email: "candidate.demo@jobpulse.test",
    password,
    role: "candidate",
    name: "Demo Candidate",
    phone: "+91 9876543210",
  },
  candidateAlt: {
    email: "candidate.alt@jobpulse.test",
    password,
    role: "candidate",
    name: "Alt Candidate",
    phone: "+91 9876543213",
  },
  employer: {
    email: "employer.demo@jobpulse.test",
    password,
    role: "employer",
    name: "Demo Employer",
    phone: "+91 9876543211",
  },
  employerAlt: {
    email: "employer.alt@jobpulse.test",
    password,
    role: "employer",
    name: "Alt Employer",
    phone: "+91 9876543214",
  },
  admin: {
    email: "admin.demo@jobpulse.test",
    password,
    role: "admin",
    name: "Demo Admin",
    phone: "+91 9876543212",
  },
};

async function ensureUser(db, user) {
  const { data: existing, error: lookupError } = await db
    .from("users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  const fields = {
    name: user.name,
    phone: user.phone,
    role: user.role,
    password_hash: await bcrypt.hash(user.password, 10),
    email_verified: true,
    is_banned: false,
    app_metadata: { role: user.role },
  };

  let id = existing?.id;

  if (id) {
    const { error } = await db.from("users").update(fields).eq("id", id);
    if (error) throw new Error(`Could not update ${user.email}: ${error.message}`);
  } else {
    id = randomUUID();
    const { error } = await db.from("users").insert({ id, email: user.email, ...fields });
    if (error) throw new Error(`Could not create ${user.email}: ${error.message}`);
  }

  if (user.role === "candidate") {
    await ensureVerifiedCandidateProfile(db, id);
  }

  return {
    id,
    email: user.email,
    password: user.password,
    role: user.role,
    name: user.name,
  };
}

/**
 * POST /api/jobs/[id]/apply rejects unverified candidates with 403, and
 * `verified` is only ever set by an admin approving a verification request —
 * PUT /api/candidate/profile deliberately preserves the existing value. So a
 * candidate driven purely through the UI can never reach the apply flow, and
 * the spec would fail on a real product gate rather than a defect.
 *
 * Pre-verify the fixture candidates instead. The onboarding save carries the
 * flag through untouched, so this survives fillCandidateOnboarding().
 */
async function ensureVerifiedCandidateProfile(db, userId) {
  const { data: existing, error: lookupError } = await db
    .from("candidate_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  const verification = { verified: true, verification_status: "verified" };

  if (existing?.id) {
    const { error } = await db
      .from("candidate_profiles")
      .update(verification)
      .eq("id", existing.id);
    if (error) throw new Error(`Could not verify candidate profile: ${error.message}`);
    return;
  }

  const { error } = await db
    .from("candidate_profiles")
    .insert({ id: randomUUID(), user_id: userId, ...verification });
  if (error) throw new Error(`Could not create candidate profile: ${error.message}`);
}

async function main() {
  fs.mkdirSync(generatedDir, { recursive: true });

  const connection = await connect();
  const db = createDb(connection);

  try {
    const ensuredUsers = {};
    for (const [key, user] of Object.entries(users)) {
      ensuredUsers[key] = await ensureUser(db, user);
    }

    const fixtures = {
      baseUrl: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
      database: process.env.MYSQL_DATABASE,
      users: ensuredUsers,
    };

    fs.writeFileSync(fixturePath, `${JSON.stringify(fixtures, null, 2)}\n`, "utf8");
    console.log(`Wrote E2E fixtures to ${fixturePath}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
