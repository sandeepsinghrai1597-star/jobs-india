import { getRoleFromAuthMetadata } from "./auth-errors";

describe("getRoleFromAuthMetadata", () => {
  it("uses the role from user metadata when app metadata is missing", () => {
    expect(getRoleFromAuthMetadata(undefined, "employer")).toBe("employer");
    expect(getRoleFromAuthMetadata(undefined, "candidate")).toBe("candidate");
    expect(getRoleFromAuthMetadata(undefined, "admin")).toBe("admin");
  });

  it("prefers app metadata role when present", () => {
    expect(getRoleFromAuthMetadata("admin", "candidate")).toBe("admin");
    expect(getRoleFromAuthMetadata("employer", "candidate")).toBe("employer");
  });
});
