"use client";

import { createAgent, registerTools } from "@ui-sdk/react/agent";
import { createDialogController } from "@ui-sdk/react/dialog";

export const agent = typeof window === "undefined" ? null : createAgent({ allow: (step) => !step.confirm });

export function registerAgent() {
  if (!agent) return () => {};
  return registerTools(agent, { allow: (step) => !step.confirm });
}

export const commandDialog = createDialogController();
