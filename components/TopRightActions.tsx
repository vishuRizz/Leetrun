"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Registry = {
  register: (id: string, node: React.ReactNode) => void;
  unregister: (id: string) => void;
};

const TopRightActionsContext = createContext<Registry | null>(null);

export function TopRightActionsProvider({
  children,
  notification,
}: {
  children: React.ReactNode;
  notification: React.ReactNode;
}) {
  const [slots, setSlots] = useState<Record<string, React.ReactNode>>({});

  const registry = useMemo<Registry>(
    () => ({
      register: (id, node) =>
        setSlots((prev) => ({ ...prev, [id]: node })),
      unregister: (id) =>
        setSlots((prev) => {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        }),
    }),
    []
  );

  const actions = Object.values(slots);

  return (
    <TopRightActionsContext.Provider value={registry}>
      {children}
      <div className="fixed top-3 right-3 z-[60] flex items-center gap-2">
        {actions}
        {notification}
      </div>
    </TopRightActionsContext.Provider>
  );
}

/** Renders children in the fixed top-right bar, left of the notification bell. */
export function TopRightAction({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const registry = useContext(TopRightActionsContext);

  useEffect(() => {
    if (!registry) return;
    registry.register(id, children);
    return () => registry.unregister(id);
  }, [registry, id, children]);

  return null;
}
