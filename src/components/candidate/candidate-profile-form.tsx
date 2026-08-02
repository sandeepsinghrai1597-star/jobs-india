"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, BadgeCheck, Clock3, ShieldAlert } from "lucide-react";
import {
  calculateProfileCompletion,
  canRequestVerification,
  parseListInput,
} from "@/lib/candidate/profile";
import type { CandidateProfile } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function getStatusCopy(profile: CandidateProfile) {
  if (profile.verified || profile.verificationStatus === "verified") {
    return {
      label: "Verified",
      icon: BadgeCheck,
      tone: "text-emerald-600",
      description: "Your profile is verified and ready for applications.",
    };
  }

  if (profile.verificationStatus === "pending") {
    return {
      label: "Pending Review",
      icon: Clock3,
      tone: "text-amber-500",
      description: "Your verification request is in review. Verified-only applications stay locked until approval.",
    };
  }

  if (profile.verificationStatus === "rejected") {
    return {
      label: "Needs Update",
      icon: ShieldAlert,
      tone: "text-rose-500",
      description: "Update the missing details and request verification again.",
    };
  }

  return {
    label: "Not Verified",
    icon: AlertCircle,
    tone: "text-cyan-400",
    description: "Complete this profile, add a resume on file or secure resume link, and request verification to unlock applications.",
  };
}

export function CandidateProfileForm({
  initialProfile,
  hasResumeOnFile = false,
}: {
  initialProfile: CandidateProfile;
  hasResumeOnFile?: boolean;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [skillsText, setSkillsText] = useState(initialProfile.skills.join(", "));
  const [rolesText, setRolesText] = useState(initialProfile.preferredRoles.join(", "));
  const [jobTypesText, setJobTypesText] = useState(initialProfile.preferredJobTypes.join(", "));
  const [requestVerification, setRequestVerification] = useState(
    initialProfile.verificationStatus === "pending",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draftProfile = {
    ...profile,
    skills: parseListInput(skillsText),
    preferredRoles: parseListInput(rolesText),
    preferredJobTypes: parseListInput(jobTypesText),
  };
  const completion = calculateProfileCompletion(draftProfile, { hasResumeOnFile });
  const verificationReady = canRequestVerification(draftProfile, { hasResumeOnFile });
  const status = getStatusCopy(profile);
  const StatusIcon = status.icon;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      ...profile,
      skills: parseListInput(skillsText),
      preferredRoles: parseListInput(rolesText),
      preferredJobTypes: parseListInput(jobTypesText),
      expectedSalary:
        typeof profile.expectedSalary === "number" && Number.isFinite(profile.expectedSalary)
          ? profile.expectedSalary
          : null,
      requestVerification,
    };

    const response = await fetch("/api/candidate/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as {
      message?: string;
      profile?: CandidateProfile;
    };

    if (!response.ok || !result.profile) {
      setError(result.message ?? "We could not save your profile.");
      setIsSaving(false);
      return;
    }

    setProfile(result.profile);
    setRequestVerification(result.profile.verificationStatus === "pending");
    setMessage(result.message ?? "Profile saved.");
    setIsSaving(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Candidate profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="Full name"
                value={profile.fullName}
                onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))}
              />
              <Input
                placeholder="Phone number"
                value={profile.phone}
                onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
              />
              <Input
                placeholder="Current city"
                value={profile.city}
                onChange={(event) => setProfile((current) => ({ ...current, city: event.target.value }))}
              />
              <Input
                placeholder="State"
                value={profile.state}
                onChange={(event) => setProfile((current) => ({ ...current, state: event.target.value }))}
              />
              <Input
                placeholder="Education"
                value={profile.education}
                onChange={(event) => setProfile((current) => ({ ...current, education: event.target.value }))}
              />
              <Input
                placeholder="Experience"
                value={profile.experience}
                onChange={(event) => setProfile((current) => ({ ...current, experience: event.target.value }))}
              />
              <Input
                placeholder="Headline"
                value={profile.headline}
                onChange={(event) => setProfile((current) => ({ ...current, headline: event.target.value }))}
                className="sm:col-span-2"
              />
              <Input
                placeholder="Secure resume URL (optional if uploaded in Resume Library)"
                type="url"
                value={profile.resumeUrl}
                onChange={(event) => setProfile((current) => ({ ...current, resumeUrl: event.target.value }))}
                className="sm:col-span-2"
              />
              <Input
                placeholder="Skills, comma separated"
                value={skillsText}
                onChange={(event) => setSkillsText(event.target.value)}
                className="sm:col-span-2"
              />
              <Input
                placeholder="Preferred roles, comma separated"
                value={rolesText}
                onChange={(event) => setRolesText(event.target.value)}
                className="sm:col-span-2"
              />
              <Input
                placeholder="Preferred job types, comma separated"
                value={jobTypesText}
                onChange={(event) => setJobTypesText(event.target.value)}
                className="sm:col-span-2"
              />
              <Input
                placeholder="Expected salary in INR"
                type="number"
                value={profile.expectedSalary ?? ""}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    expectedSalary: event.target.value ? Number(event.target.value) : null,
                  }))
                }
              />
              <Select
                value={profile.languagePreference}
                onValueChange={(value) =>
                  setProfile((current) => ({ ...current, languagePreference: value }))
                }
              >
                <SelectTrigger className="w-full rounded-2xl">
                  <SelectValue placeholder="Preferred language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                  <SelectItem value="English + Hindi">English + Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Textarea
              placeholder="Short professional summary"
              value={profile.bio}
              onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))}
              className="min-h-32"
            />

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={requestVerification}
                onChange={(event) => setRequestVerification(event.target.checked)}
                className="mt-1"
              />
              <span>
                Request candidate verification after saving this profile. Verification-ready:{" "}
                <strong>{verificationReady ? "Yes" : "Not yet"}</strong>
              </span>
            </label>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Profile not saved</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {message ? (
              <Alert>
                <AlertTitle>Profile updated</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" className="rounded-full" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save profile"}
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/jobs">Discover jobs</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-2xl font-semibold">Verification</h2>
              <Badge className="rounded-full">{completion}% complete</Badge>
            </div>
            <div className={`flex items-center gap-3 text-sm font-medium ${status.tone}`}>
              <StatusIcon className="size-4" />
              {status.label}
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{status.description}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Only verified candidates can submit job applications.</li>
              <li>Add an uploaded resume or secure resume URL, core skills, and target roles before requesting review.</li>
              <li>Once approved, the job detail page unlocks direct apply.</li>
            </ul>
            {hasResumeOnFile ? (
              <p className="text-sm text-emerald-700">
                A resume is already on file in your private resume library.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <CardContent className="space-y-4 p-6">
            <h2 className="font-heading text-2xl font-semibold">Discovery readiness</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Job discovery gets better when your skills, city, and preferred roles are complete.
            </p>
            <div className="flex flex-wrap gap-2">
              {parseListInput(skillsText).slice(0, 6).map((skill) => (
                <Badge key={skill} variant="secondary" className="rounded-full">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
