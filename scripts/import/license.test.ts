import { describe, expect, it } from "vitest";
import { judgeLicense, licenseFiles } from "./license";

const MIT = `MIT License

Copyright (c) 2025 Someone

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction.`;

describe("judgeLicense", () => {
  it("accepts MIT", () => {
    expect(judgeLicense(MIT, "LICENSE.md")).toEqual({ ok: true, spdx: "MIT", file: "LICENSE.md" });
  });

  it("accepts Apache-2.0", () => {
    expect(judgeLicense("Apache License\nVersion 2.0, January 2004", "LICENSE")).toMatchObject({
      ok: true,
      spdx: "Apache-2.0",
    });
  });

  it("refuses MIT with the Commons Clause", () => {
    const v = judgeLicense(`"Commons Clause" License Condition v1.0\n\n${MIT}`, "LICENSE");
    expect(v).toMatchObject({ ok: false });
    expect(!v.ok && v.reason).toContain("Commons Clause");
  });

  it("refuses a missing license", () => {
    expect(judgeLicense(undefined)).toMatchObject({ ok: false });
  });

  it("refuses an unknown license", () => {
    expect(judgeLicense("All rights reserved.", "LICENSE")).toMatchObject({ ok: false });
  });

  it("refuses a package.json that disagrees with the file", () => {
    expect(judgeLicense(MIT, "LICENSE", "SEE LICENSE IN EULA")).toMatchObject({ ok: false });
  });
});

describe("licenseFiles", () => {
  it("finds license files at the root only", () => {
    expect(licenseFiles(["LICENSE.md", "packages/x/LICENSE", "README.md", "license"])).toEqual([
      "license",
      "LICENSE.md",
    ]);
  });
});
