"use client";

import { useCallback, useEffect, useState } from "react";

import type { PortalContentKind, PortalContentMap } from "@/lib/portalContent";

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
      const data = (await response.json()) as { items?: PortalContentMap[K][] };

      if (response.ok && data.items) {
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

  const data = (await response.json()) as {
    item?: PortalContentMap[K];
    error?: string;
  };

  if (!response.ok || !data.item) {
    throw new Error(data.error || "Unable to save content.");
  }

  return data.item;
}

export async function deletePortalContent(kind: PortalContentKind, id: string) {
  const response = await fetch(`/api/portal-content/${kind}/${id}`, {
    method: "DELETE",
  });
  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Unable to delete content.");
  }
}

export async function readPortalContentClientItem<K extends PortalContentKind>(
  kind: K,
  id: string
) {
  const response = await fetch(`/api/portal-content/${kind}/${id}`, {
    cache: "no-store",
  });
  const data = (await response.json()) as {
    item?: PortalContentMap[K];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || "Not found.");
  }

  return data.item;
}
