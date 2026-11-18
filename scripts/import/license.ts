export type LicenseVerdict = { ok: true; spdx: string; file: string } | { ok: false; reason: string; file?: string };

const LICENSE_FILE = /^(licen[cs]e|copying)(\.(md|txt))?$/i;

const PERMISSIVE: [string, RegExp][] = [
  ["MIT", /permission is hereby granted, free of charge/i],
  ["Apache-2.0", /apache license[\s,]*version 2\.0/i],
  ["BSD-3-Clause", /redistribution and use in source and binary forms[\s\S]*neither the name/i],
  ["BSD-2-Clause", /redistribution and use in source and binary forms/i],
  ["ISC", /permission to use, copy, modify, and\/or distribute this software for any purpose/i],
  ["0BSD", /permission to use, copy, modify, and\/or distribute this software for any purpose[\s\S]*without fee/i],
  ["Unlicense", /this is free and unencumbered software released into the public domain/i],
];

const RESTRICTED: [string, RegExp][] = [
  ["Commons Clause", /commons clause/i],
  ["non-commercial terms", /non-?commercial/i],
  ["a paid or Pro tier", /\b(pro|premium|paid) (license|version|components)\b/i],
  [
    "a ban on redistribution",
    /may not (re)?distribute|must not (re)?distribute|redistribution is (not permitted|prohibited)/i,
  ],
];

export const licenseFiles = (files: string[]) =>
  files.filter((f) => !f.includes("/") && LICENSE_FILE.test(f)).sort((a, b) => a.length - b.length);

export function judgeLicense(text: string | undefined, file?: string, declared?: string): LicenseVerdict {
  if (!text?.trim()) return { ok: false, reason: "no LICENSE file at the root of the repository", file };
  for (const [name, re] of RESTRICTED)
    if (re.test(text)) return { ok: false, reason: `the license adds ${name}`, file };
  const hit = PERMISSIVE.find(([, re]) => re.test(text));
  if (!hit) return { ok: false, reason: "the license is not one Quire accepts (MIT, Apache-2.0, BSD, ISC)", file };
  if (declared && !/^(MIT|Apache-2\.0|BSD-[23]-Clause|ISC|0BSD|Unlicense)$/i.test(declared.trim()))
    return { ok: false, reason: `package.json declares "${declared}", which differs from the LICENSE file`, file };
  return { ok: true, spdx: hit[0], file: file ?? "LICENSE" };
}
