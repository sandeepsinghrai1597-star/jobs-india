import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { EmployerProfileForm } from "@/components/employer/employer-profile-form";
import { createClient } from "@/lib/supabase/server";
import { buildMetadata } from "@/lib/seo";

const profileSelect = `
  id,
  user_id,
  company_name,
  company_email,
  company_email_verified,
  domain_verification_status,
  logo_url,
  website,
  industry,
  city,
  state,
  recruiter_name,
  recruiter_phone,
  description,
  verified,
  approval_status,
  created_at,
  updated_at
`;

export const metadata = buildMetadata({
  title: "Employer profile",
  description: "Complete your employer onboarding by adding company and recruiter details.",
  path: "/employer/profile",
});

export default async function EmployerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = {
    companyName: "",
    website: "",
    companyEmail: "",
    industry: "",
    city: "",
    state: "",
    logoUrl: "",
    recruiterName: "",
    recruiterPhone: "",
  };

  if (user) {
    const { data } = await supabase
      .from("employer_profiles")
      .select(profileSelect)
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      profile = {
        companyName: data.company_name ?? "",
        website: data.website ?? "",
        companyEmail: data.company_email ?? "",
        industry: data.industry ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        logoUrl: data.logo_url ?? "",
        recruiterName: data.recruiter_name ?? "",
        recruiterPhone: data.recruiter_phone ?? "",
      };
    }
  }

  return (
    <DashboardShell
      role="employer"
      title="Employer onboarding"
      description="Set up your company profile, recruiter contact details, and onboarding information."
    >
      <EmployerProfileForm initialProfile={profile} />
    </DashboardShell>
  );
}
