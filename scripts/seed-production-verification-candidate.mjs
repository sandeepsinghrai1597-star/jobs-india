/**
 * Creates a throwaway verified candidate (user + profile + resume row) used to
 * exercise the apply flow against a live deployment.
 *
 *   node scripts/seed-production-verification-candidate.mjs [email] [password]
 */

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { connect, createDb, loadEnvFiles, randomUUID } from "./lib/mysql-client.mjs";

loadEnvFiles([".env.local", ".env"]);

const email = process.argv[2]?.trim().toLowerCase() || "candidate.verify@jobpulse.test";
const password = process.argv[3]?.trim() || `JobPulse!${crypto.randomBytes(9).toString("base64url")}`;

async function ensureCandidateUser(db, targetEmail, targetPassword) {
  const { data: existing, error: lookupError } = await db
    .from("users")
    .select("id")
    .eq("email", targetEmail)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  const fields = {
    name: "Verification Candidate",
    phone: "+91 9999999999",
    role: "candidate",
    password_hash: await bcrypt.hash(targetPassword, 10),
    email_verified: true,
    is_banned: false,
    app_metadata: { role: "candidate" },
  };

  if (existing) {
    const { error } = await db.from("users").update(fields).eq("id", existing.id);
    if (error) throw new Error(`Could not update ${targetEmail}: ${error.message}`);
    return existing.id;
  }

  const id = randomUUID();
  const { error } = await db.from("users").insert({ id, email: targetEmail, ...fields });
  if (error) throw new Error(`Could not create ${targetEmail}: ${error.message}`);
  return id;
}

async function ensureCandidateProfile(db, userId) {
  const payload = {
    user_id: userId,
    full_name: "Verification Candidate",
    phone: "+91 9999999999",
    headline: "Production verification candidate",
    bio: "Created temporarily to verify the production apply flow.",
    education: "Graduate",
    skills: ["QA", "Automation"],
    experience: "2 years",
    city: "Bengaluru",
    state: "Karnataka",
    preferred_roles: ["QA Engineer"],
    expected_salary: 900000,
    preferred_job_types: ["full-time"],
    language_preference: "English",
    resume_url: null,
    verified: true,
    verification_status: "verified",
    verified_at: new Date().toISOString(),
  };

  const { data: existing, error: lookupError } = await db
    .from("candidate_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  if (existing) {
    const { error } = await db.from("candidate_profiles").update(payload).eq("id", existing.id);
    if (error) throw new Error(`Could not update candidate profile: ${error.message}`);
    return existing.id;
  }

  const id = randomUUID();
  const { error } = await db.from("candidate_profiles").insert({ id, ...payload });
  if (error) throw new Error(`Could not create candidate profile: ${error.message}`);
  return id;
}

async function ensureResume(db, userId) {
  const title = "Verification Resume";
  const storagePath = `resumes/${userId}/verification-resume.pdf`;
  const payload = {
    user_id: userId,
    title,
    storage_path: storagePath,
    file_url: null,
    template_key: "verification",
    version: 1,
    content_json: {
      verified: true,
      generatedFor: "production-verification",
    },
  };

  // resumes has no unique (user_id, title) constraint, so this matches the
  // existing row explicitly rather than relying on upsert conflict handling.
  const { data: existing, error: lookupError } = await db
    .from("resumes")
    .select("id")
    .eq("user_id", userId)
    .eq("title", title)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  if (existing) {
    const { error } = await db.from("resumes").update(payload).eq("id", existing.id);
    if (error) throw new Error(`Could not update verification resume: ${error.message}`);
    return { id: existing.id, storage_path: storagePath };
  }

  const id = randomUUID();
  const { error } = await db.from("resumes").insert({ id, ...payload });
  if (error) throw new Error(`Could not create verification resume: ${error.message}`);
  return { id, storage_path: storagePath };
}

async function main() {
  const connection = await connect();
  const db = createDb(connection);

  try {
    const userId = await ensureCandidateUser(db, email, password);
    const profileId = await ensureCandidateProfile(db, userId);
    const resume = await ensureResume(db, userId);

    console.log(
      JSON.stringify(
        {
          email,
          password,
          userId,
          profileId,
          resumeId: resume.id,
          storagePath: resume.storage_path,
        },
        null,
        2,
      ),
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
