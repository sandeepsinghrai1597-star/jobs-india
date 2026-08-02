import { parseSelectColumns } from "@/lib/db/mysql";

describe("parseSelectColumns", () => {
  it("returns plain columns when there are no embeds", () => {
    const result = parseSelectColumns("id, title, company_name");
    expect(result.baseColumns).toEqual(["id", "title", "company_name"]);
    expect(result.embeds).toEqual([]);
  });

  it("parses an embed with an explicit foreign-key column", () => {
    const result = parseSelectColumns("id, status, jobs:job_id (slug, title)");

    expect(result.baseColumns).toEqual(["id", "status"]);
    expect(result.embeds).toHaveLength(1);
    expect(result.embeds[0]).toMatchObject({
      key: "jobs",
      table: "jobs",
      foreignKey: "job_id",
      inner: false,
      columns: ["slug", "title"],
    });
  });

  it("marks !inner embeds and infers the foreign key", () => {
    const result = parseSelectColumns("id, job_id, jobs!inner(id, employer_id)");

    expect(result.embeds[0]).toMatchObject({
      key: "jobs",
      table: "jobs",
      foreignKey: "job_id",
      inner: true,
      columns: ["id", "employer_id"],
    });
  });

  it("extracts the foreign key from a constraint name", () => {
    const result = parseSelectColumns("id, amount, users!payments_user_id_fkey(name, email)");

    expect(result.embeds[0]).toMatchObject({
      key: "users",
      table: "users",
      foreignKey: "user_id",
      columns: ["name", "email"],
    });
  });

  it("infers foreign keys for profile tables", () => {
    const result = parseSelectColumns("id, candidate_profiles(full_name, city)");

    expect(result.embeds[0]).toMatchObject({
      table: "candidate_profiles",
      foreignKey: "candidate_id",
    });
  });

  it("handles several embeds alongside base columns", () => {
    const result = parseSelectColumns(
      "id, status, jobs!inner(id, title, employer_id), candidate_profiles(full_name, skills)",
    );

    expect(result.baseColumns).toEqual(["id", "status"]);
    expect(result.embeds.map((embed) => embed.table)).toEqual(["jobs", "candidate_profiles"]);
    // Aliases must stay distinct so joined columns don't collide.
    expect(new Set(result.embeds.map((embed) => embed.alias)).size).toBe(2);
  });

  it("does not split on commas inside an embed body", () => {
    const result = parseSelectColumns("id, jobs:job_id (a, b, c), status");

    expect(result.baseColumns).toEqual(["id", "status"]);
    expect(result.embeds[0]?.columns).toEqual(["a", "b", "c"]);
  });
});
