"use client";

import { useCallback, useEffect, useState } from "react";

import type { PortalContentKind, PortalContentMap } from "@/lib/portalContent";

async function parseJsonResponse<T>(response: Response) {
  const raw = await response.text();

  if (!raw) {
    return null as T | null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("The server returned an invalid response.");
  }
}

export function usePortalContent<K extends PortalContentKind>(
  kind: K,
  fallback: PortalContentMap[K][]
) {
  const [items, setItems] = useState<PortalContentMap[K][]>(fallback);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/portal-content/${kind}`, {
        cache: "no-store",
      });
      const data = await parseJsonResponse<{ items?: PortalContentMap[K][] }>(response);

      if (response.ok && data?.items) {
        setItems(data.items);
      }
    } finally {
      setIsLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, setItems, isLoading, refresh };
}

export async function savePortalContentItem<K extends PortalContentKind>(
  kind: K,
  item: PortalContentMap[K]
) {
  const response = await fetch(`/api/portal-content/${kind}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ item }),
  });

  const data = await parseJsonResponse<{
    item?: PortalContentMap[K];
    error?: string;
  }>(response);

  if (!response.ok || !data?.item) {
    throw new Error(data?.error || "Unable to save content.");
  }

  return data.item;
}

export async function deletePortalContent(kind: PortalContentKind, id: string) {
  const response = await fetch(`/api/portal-content/${kind}/${id}`, {
    method: "DELETE",
  });
  const data = await parseJsonResponse<{ error?: string }>(response);

  if (!response.ok) {
    throw new Error(data?.error || "Unable to delete content.");
  }
}

export async function readPortalContentClientItem<K extends PortalContentKind>(
  kind: K,
  id: string
) {
  const response = await fetch(`/api/portal-content/${kind}/${id}`, {
    cache: "no-store",
  });
  const data = await parseJsonResponse<{
    item?: PortalContentMap[K];
    error?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(data?.error || "Not found.");
  }

  return data?.item;
}
