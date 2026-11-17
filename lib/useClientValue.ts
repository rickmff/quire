"use client";

import { useSyncExternalStore } from "react";

const subscribeNothing = () => () => {};

export function useClientValue<T>(readInBrowser: () => T, onServer: T) {
  return useSyncExternalStore(subscribeNothing, readInBrowser, () => onServer);
}
