"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import type {
  AdminJobsCsvImportState,
  AdminJobsCsvPreviewState,
} from "@/app/(admin)/admin/actions";
import {
  commitJobsCsvImportAction,
  previewJobsCsvImportAction,
} from "@/app/(admin)/admin/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const initialPreviewState: AdminJobsCsvPreviewState = {};
const initialImportState: AdminJobsCsvImportState = {};

const csvColumns = [
  "title",
  "company_name",
  "company_logo",
  "company_website",
  "city",
  "state",
  "salary_min",
  "salary_max",
  "salary_type",
  "experience_min",
  "experience_max",
  "education_required",
  "skills",
  "description",
  "responsibilities",
  "requirements",
  "apply_url",
  "source_url",
  "deadline",
  "job_type",
  "work_mode",
  "industry",
  "openings",
];

function PreviewButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="rounded-2xl bg-slate-100 px-5 text-slate-950 hover:bg-slate-800">
      <Upload className="size-4" />
      {pending ? "Validating CSV..." : "Validate and preview"}
    </Button>
  );
}

function ImportButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending} className="rounded-2xl bg-emerald-600 px-5 text-white hover:bg-emerald-700">
      <CheckCircle2 className="size-4" />
      {pending ? "Importing pending jobs..." : "Import valid rows to pending review"}
    </Button>
  );
}

function SummaryGrid({
  summary,
}: {
  summary: NonNullable<AdminJobsCsvPreviewState["summary"]>;
}) {
  const cards = [
    { label: "Total rows", value: summary.totalRows },
    { label: "Valid rows", value: summary.validRows },
    { label: "Invalid rows", value: summary.invalidRows },
    { label: "Duplicates", value: summary.duplicateRows },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">{card.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

export function AdminJobsImportPage() {
  const [previewState, previewAction] = useActionState(previewJobsCsvImportAction, initialPreviewState);
  const [importState, importAction] = useActionState(commitJobsCsvImportAction, initialImportState);
  const canImport = Boolean(previewState.payload);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">Admin intake</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Bulk import jobs from CSV</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            We validate the file first, preview the first 20 rows, flag duplicate title + company + city combinations, and only import valid rows into pending review.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white">
          <Link href="/admin?section=jobs&status=pending">
            <ArrowLeft className="size-4" />
            Back to review queue
          </Link>
        </Button>
      </div>

      <Card className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
        <CardHeader className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(14,165,233,0.1),rgba(255,255,255,0.96))]">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-sky-700" />
            Upload and validate
          </CardTitle>
          <CardDescription>
            Required columns must match exactly. Empty values inside a column are allowed, but the headers must be present.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <form action={previewAction} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-800" htmlFor="csvFile">
                CSV file
              </label>
              <input
                id="csvFile"
                name="csvFile"
                type="file"
                accept=".csv,text/csv"
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                required
              />
            </div>
            <PreviewButton />
          </form>

          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">Expected columns</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{csvColumns.join(", ")}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Use `|` to separate multiple values inside `skills`, `responsibilities`, and `requirements`.
            </p>
          </div>

          {previewState.message ? (
            <Alert variant={previewState.payload ? "default" : "destructive"} className={previewState.payload ? "border-sky-200 bg-sky-50" : "border-red-200 bg-red-50"}>
              <AlertCircle className="size-4" />
              <AlertTitle>{previewState.payload ? "Preview ready" : "Preview blocked"}</AlertTitle>
              <AlertDescription>{previewState.message}</AlertDescription>
            </Alert>
          ) : null}

          {previewState.headerErrors && previewState.headerErrors.length > 0 ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="size-4" />
              <AlertTitle>Header validation failed</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5">
                  {previewState.headerErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {previewState.summary ? (
        <Card className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle>Import summary</CardTitle>
            <CardDescription>
              {previewState.fileName ? `${previewState.fileName} validated.` : "Preview results for this CSV."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <SummaryGrid summary={previewState.summary} />

            <form action={importAction} className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4">
              <div>
                <p className="text-sm font-semibold text-emerald-950">Pending review only</p>
                <p className="mt-1 text-sm leading-6 text-emerald-900">
                  Valid rows will create companies automatically when needed and every imported job will stay pending until approved by an admin.
                </p>
              </div>
              <input type="hidden" name="payload" value={previewState.payload ?? ""} />
              <input type="hidden" name="summary" value={JSON.stringify(previewState.summary)} />
              <ImportButton disabled={!canImport} />
            </form>

            {importState.message ? (
              <Alert className={importState.importedCount ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}>
                <CheckCircle2 className="size-4" />
                <AlertTitle>Import status</AlertTitle>
                <AlertDescription>
                  {importState.message}
                  {typeof importState.importedCount === "number" ? (
                    <span className="block mt-2">
                      Imported: {importState.importedCount} rows. Skipped during final validation: {importState.skippedCount ?? 0}.
                    </span>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {previewState.rows && previewState.rows.length > 0 ? (
        <Card className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle>Preview first {previewState.rows.length} rows</CardTitle>
            <CardDescription>
              We validate every row in the file, but only the first 20 are shown here for quick review.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewState.rows.map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell className="font-medium text-slate-900">{row.title || "--"}</TableCell>
                    <TableCell>{row.companyName || "--"}</TableCell>
                    <TableCell>{row.city || "--"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={row.status === "valid" ? "default" : "destructive"}>{row.status}</Badge>
                        {row.duplicate ? <Badge variant="secondary">duplicate</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xl text-sm text-slate-600">
                      {row.errors.length > 0 ? row.errors.join(" ") : "Ready to import."}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
