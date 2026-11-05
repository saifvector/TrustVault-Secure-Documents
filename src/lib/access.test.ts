import { describe, expect, it } from "vitest";
import { canDelete, canDownload, canEditMetadata, canManageSharing, canUpload } from "./access";

describe("document access rules", () => {
  it("users with no grant cannot download", () => expect(canDownload(null)).toBe(false));
  it("READ grant allows download", () => expect(canDownload("read")).toBe(true));
  it("READ grant cannot edit", () => expect(canEditMetadata("read")).toBe(false));
  it("EDIT grant can edit but not share", () => {
    expect(canEditMetadata("edit")).toBe(true);
    expect(canManageSharing("edit")).toBe(false);
  });
  it("only owner can delete", () => {
    expect(canDelete("edit")).toBe(false);
    expect(canDelete("owner")).toBe(true);
  });
  it("viewers and admins cannot upload; owners can", () => {
    expect(canUpload(["viewer"])).toBe(false);
    expect(canUpload(["admin"])).toBe(false);
    expect(canUpload(["owner"])).toBe(true);
  });
});
