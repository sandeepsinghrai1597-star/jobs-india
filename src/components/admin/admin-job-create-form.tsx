"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import type {
  AdminJobCreateFormState,
  AdminJobUpdateFormState,
} from "@/app/(admin)/admin/actions";
import { createAdminJobFormAction } from "@/app/(admin)/admin/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SharedAdminJobFormState = AdminJobCreateFormState | AdminJobUpdateFormState;

export type AdminJobFormValues = {
  categorySlug: string;
  companyName: string;
  companyWebsite: string;
  companyDescription: string;
  companyLogoUrl: string;
  companyVerified: boolean;
  title: string;
  description: string;
  responsibilities: string;
  requirements: string;
  skills: string;
  city: string;
  state: string;
  country: string;
  workMode: "remote" | "hybrid" | "onsite";
  jobType: "full-time" | "part-time" | "contract" | "freelance" | "internship" | "walk-in";
  salaryType: "monthly" | "yearly" | "stipend";
  educationRequired: string;
  experienceRequired: string;
  experienceMin: string;
  experienceMax: string;
  industry: string;
  openings: string;
  deadline: string;
  salaryMin: string;
  salaryMax: string;
  applicationUrl: string;
  sourceUrl: string;
  sourceType: "admin" | "official" | "partner" | "employer";
  recruiterContact: string;
  noCandidatePayment: boolean;
  salaryDisclosed: boolean;
  governmentSourceVerified: boolean;
  featured: boolean;
  verified: boolean;
};

type ActionStateHandler = (
  previousState: SharedAdminJobFormState,
  formData: FormData,
) => Promise<SharedAdminJobFormState>;

const initialState: SharedAdminJobFormState = {};

const emptyValues: AdminJobFormValues = {
  categorySlug: "",
  companyName: "",
  companyWebsite: "",
  companyDescription: "",
  companyLogoUrl: "",
  companyVerified: false,
  title: "",
  description: "",
  responsibilities: "",
  requirements: "",
  skills: "",
  city: "",
  state: "",
  country: "India",
  workMode: "onsite",
  jobType: "full-time",
  salaryType: "yearly",
  educationRequired: "",
  experienceRequired: "",
  experienceMin: "",
  experienceMax: "",
  industry: "",
  openings: "1",
  deadline: "",
  salaryMin: "0",
  salaryMax: "0",
  applicationUrl: "",
  sourceUrl: "",
  sourceType: "admin",
  recruiterContact: "",
  noCandidatePayment: true,
  salaryDisclosed: true,
  governmentSourceVerified: false,
  featured: false,
  verified: false,
};

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2" htmlFor={htmlFor}>
      <span className="block text-sm font-medium text-slate-800">{label}</span>
      {children}
      {error ? <span className="block text-sm text-red-600">{error}</span> : null}
      {!error && hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function NativeSelect({
  className = "",
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={`h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 ${className}`.trim()}
    />
  );
}

function CheckboxField({
  name,
  label,
  hint,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
      <input type="hidden" name={name} value="false" />
      <input className="mt-1 size-4" type="checkbox" name={name} value="true" defaultChecked={defaultChecked} />
      <span>
        <span className="block font-medium">{label}</span>
        {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      </span>
    </label>
  );
}

function SubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 rounded-2xl bg-slate-100 px-5 text-slate-950 hover:bg-slate-800"
    >
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

function AdminJobForm({
  action,
  backHref,
  backLabel,
  eyebrow,
  title,
  description,
  submitLabel,
  pendingLabel,
  successTone,
  initialValues,
}: {
  action: ActionStateHandler;
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  submitLabel: string;
  pendingLabel: string;
  successTone: string;
  initialValues?: Partial<AdminJobFormValues>;
}) {
  const values = { ...emptyValues, ...initialValues };
  const [state, formAction] = useActionState(action, initialState);
  const urlError = state.fieldErrors?.applicationUrl || state.fieldErrors?.sourceUrl;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
        </Button>
      </div>

      {state.message ? (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertCircle className="size-4" />
          <AlertTitle>Job not saved</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="returnTo" value="/admin/jobs/review" />

        <Card className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
          <CardHeader className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(14,165,233,0.1),rgba(255,255,255,0.96))]">
            <CardTitle>Company and role</CardTitle>
            <CardDescription>Start with the public-facing company profile and job basics.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
            <Field label="Category slug" htmlFor="categorySlug" hint="Optional">
              <Input id="categorySlug" name="categorySlug" defaultValue={values.categorySlug} />
            </Field>
            <Field label="Company name" htmlFor="companyName" error={state.fieldErrors?.companyName}>
              <Input
                id="companyName"
                name="companyName"
                required
                defaultValue={values.companyName}
                aria-invalid={Boolean(state.fieldErrors?.companyName)}
              />
            </Field>
            <Field label="Job title" htmlFor="title" error={state.fieldErrors?.title}>
              <Input
                id="title"
                name="title"
                required
                defaultValue={values.title}
                aria-invalid={Boolean(state.fieldErrors?.title)}
              />
            </Field>
            <Field label="Company logo URL" htmlFor="companyLogoUrl" hint="Optional">
              <Input
                id="companyLogoUrl"
                name="companyLogoUrl"
                type="url"
                placeholder="https://company.com/logo.png"
                defaultValue={values.companyLogoUrl}
              />
            </Field>
            <Field label="Company website" htmlFor="companyWebsite" hint="Optional">
              <Input
                id="companyWebsite"
                name="companyWebsite"
                type="url"
                placeholder="https://company.com"
                defaultValue={values.companyWebsite}
              />
            </Field>
            <div className="md:col-span-2">
              <CheckboxField
                name="companyVerified"
                label="Company verified"
                hint="Use this when the company record should be marked verified right away."
                defaultChecked={values.companyVerified}
              />
            </div>
            <Field label="Company description" htmlFor="companyDescription" hint="Optional">
              <Textarea id="companyDescription" name="companyDescription" className="min-h-28" defaultValue={values.companyDescription} />
            </Field>
            <Field label="Description" htmlFor="description" error={state.fieldErrors?.description}>
              <Textarea
                id="description"
                name="description"
                required
                className="min-h-36"
                defaultValue={values.description}
                aria-invalid={Boolean(state.fieldErrors?.description)}
              />
            </Field>
            <Field label="Responsibilities" htmlFor="responsibilities" hint="One per line or comma-separated">
              <Textarea id="responsibilities" name="responsibilities" className="min-h-36" defaultValue={values.responsibilities} />
            </Field>
            <Field label="Requirements" htmlFor="requirements" hint="One per line or comma-separated">
              <Textarea id="requirements" name="requirements" className="min-h-36" defaultValue={values.requirements} />
            </Field>
            <Field label="Skills" htmlFor="skills" hint="One per line or comma-separated">
              <Textarea id="skills" name="skills" className="min-h-36" defaultValue={values.skills} />
            </Field>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle>Job details</CardTitle>
            <CardDescription>Capture location, pay, seniority, and hiring context.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
            <Field label="City" htmlFor="city" error={state.fieldErrors?.city}>
              <Input id="city" name="city" required defaultValue={values.city} aria-invalid={Boolean(state.fieldErrors?.city)} />
            </Field>
            <Field label="State" htmlFor="state">
              <Input id="state" name="state" defaultValue={values.state} />
            </Field>
            <Field label="Country" htmlFor="country">
              <Input id="country" name="country" defaultValue={values.country} />
            </Field>
            <Field label="Industry" htmlFor="industry">
              <Input id="industry" name="industry" defaultValue={values.industry} />
            </Field>
            <Field label="Salary min" htmlFor="salaryMin" error={state.fieldErrors?.salaryMin}>
              <Input
                id="salaryMin"
                name="salaryMin"
                type="number"
                min="0"
                defaultValue={values.salaryMin}
                aria-invalid={Boolean(state.fieldErrors?.salaryMin)}
              />
            </Field>
            <Field label="Salary max" htmlFor="salaryMax" error={state.fieldErrors?.salaryMax}>
              <Input
                id="salaryMax"
                name="salaryMax"
                type="number"
                min="0"
                defaultValue={values.salaryMax}
                aria-invalid={Boolean(state.fieldErrors?.salaryMax)}
              />
            </Field>
            <Field label="Salary type" htmlFor="salaryType">
              <NativeSelect id="salaryType" name="salaryType" defaultValue={values.salaryType}>
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
                <option value="stipend">Stipend</option>
              </NativeSelect>
            </Field>
            <Field label="Job type" htmlFor="jobType">
              <NativeSelect id="jobType" name="jobType" defaultValue={values.jobType}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="freelance">Freelance</option>
                <option value="internship">Internship</option>
                <option value="walk-in">Walk-in</option>
              </NativeSelect>
            </Field>
            <Field label="Work mode" htmlFor="workMode">
              <NativeSelect id="workMode" name="workMode" defaultValue={values.workMode}>
                <option value="onsite">Onsite</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </NativeSelect>
            </Field>
            <Field label="Openings" htmlFor="openings" error={state.fieldErrors?.openings}>
              <Input id="openings" name="openings" type="number" min="1" defaultValue={values.openings} aria-invalid={Boolean(state.fieldErrors?.openings)} />
            </Field>
            <Field label="Experience summary" htmlFor="experienceRequired">
              <Input id="experienceRequired" name="experienceRequired" defaultValue={values.experienceRequired} />
            </Field>
            <Field label="Experience min" htmlFor="experienceMin" error={state.fieldErrors?.experienceMin}>
              <Input id="experienceMin" name="experienceMin" type="number" min="0" defaultValue={values.experienceMin} aria-invalid={Boolean(state.fieldErrors?.experienceMin)} />
            </Field>
            <Field label="Experience max" htmlFor="experienceMax" error={state.fieldErrors?.experienceMax}>
              <Input id="experienceMax" name="experienceMax" type="number" min="0" defaultValue={values.experienceMax} aria-invalid={Boolean(state.fieldErrors?.experienceMax)} />
            </Field>
            <Field label="Education required" htmlFor="educationRequired">
              <Input id="educationRequired" name="educationRequired" defaultValue={values.educationRequired} />
            </Field>
            <Field label="Deadline" htmlFor="deadline" error={state.fieldErrors?.deadline}>
              <Input id="deadline" name="deadline" type="date" defaultValue={values.deadline} aria-invalid={Boolean(state.fieldErrors?.deadline)} />
            </Field>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle>Publishing controls</CardTitle>
            <CardDescription>Define where candidates apply and how the listing is labeled.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
            <Field label="Apply URL" htmlFor="applicationUrl" error={urlError}>
              <Input
                id="applicationUrl"
                name="applicationUrl"
                type="url"
                placeholder="https://company.com/jobs/apply"
                defaultValue={values.applicationUrl}
                aria-invalid={Boolean(urlError)}
              />
            </Field>
            <Field label="Source URL" htmlFor="sourceUrl" error={urlError}>
              <Input
                id="sourceUrl"
                name="sourceUrl"
                type="url"
                placeholder="https://source.example.com/listing"
                defaultValue={values.sourceUrl}
                aria-invalid={Boolean(urlError)}
              />
            </Field>
            <Field label="Source type" htmlFor="sourceType">
              <NativeSelect id="sourceType" name="sourceType" defaultValue={values.sourceType}>
                <option value="admin">Admin</option>
                <option value="official">Official</option>
                <option value="partner">Partner</option>
                <option value="employer">Employer</option>
              </NativeSelect>
            </Field>
            <Field label="Recruiter contact" htmlFor="recruiterContact" hint="Optional">
              <Input id="recruiterContact" name="recruiterContact" defaultValue={values.recruiterContact} />
            </Field>
            <div className="grid gap-3 md:col-span-2 lg:grid-cols-3">
              <CheckboxField
                name="featured"
                label="Featured"
                hint="Marks the job for featured placement in the admin queue."
                defaultChecked={values.featured}
              />
              <CheckboxField
                name="verified"
                label="Verified"
                hint="Marks the job listing itself as verified."
                defaultChecked={values.verified}
              />
              <CheckboxField
                name="salaryDisclosed"
                label="Salary disclosed"
                hint="If turned off, keep both salary values at 0."
                defaultChecked={values.salaryDisclosed}
              />
              <CheckboxField
                name="noCandidatePayment"
                label="No candidate payment"
                hint="Listings that ask candidates for money are not allowed."
                defaultChecked={values.noCandidatePayment}
              />
              <CheckboxField
                name="governmentSourceVerified"
                label="Government source verified"
                hint="Use only when a public-sector source is verified."
                defaultChecked={values.governmentSourceVerified}
              />
              <div className={`rounded-2xl border px-4 py-3 text-sm ${successTone}`}>
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4" />
                  Review flow
                </div>
                <p className="mt-2 text-xs leading-5">
                  Saving keeps the admin moderation path intact, preserves trust fields, and refreshes the review queue automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            Validation rules: title, company, city, and description are required. At least one of Apply URL or Source URL must be present.
          </p>
          <SubmitButton idleLabel={submitLabel} pendingLabel={pendingLabel} />
        </div>
      </form>
    </div>
  );
}

export function AdminJobCreateForm() {
  return (
    <AdminJobForm
      action={createAdminJobFormAction}
      backHref="/admin/jobs/review"
      backLabel="Back to review queue"
      eyebrow="Admin intake"
      title="Create a new job listing"
      description="New admin-created jobs are saved with pending status and sent straight to the review queue."
      submitLabel="Create pending job"
      pendingLabel="Saving..."
      successTone="border-emerald-200 bg-emerald-50 text-emerald-900"
    />
  );
}

export function AdminJobEditForm({
  action,
  initialValues,
}: {
  action: ActionStateHandler;
  initialValues: Partial<AdminJobFormValues>;
}) {
  return (
    <AdminJobForm
      action={action}
      backHref="/admin/jobs/review"
      backLabel="Back to review queue"
      eyebrow="Admin review"
      title="Edit job listing"
      description="Update the listing before approval, rejection, or re-publication."
      submitLabel="Save changes"
      pendingLabel="Saving..."
      successTone="border-sky-200 bg-sky-50 text-sky-900"
      initialValues={initialValues}
    />
  );
}
