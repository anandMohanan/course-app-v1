import { createContext, useContext } from "react";
import type { AdminWorkspace } from "./useAdminWorkspace";

const AdminWorkspaceContext = createContext<AdminWorkspace | null>(null);

export function AdminWorkspaceProvider({
  value,
  children,
}: {
  value: AdminWorkspace;
  children: React.ReactNode;
}) {
  return (
    <AdminWorkspaceContext.Provider value={value}>
      {children}
    </AdminWorkspaceContext.Provider>
  );
}

export function useAdminWorkspaceContext() {
  const context = useContext(AdminWorkspaceContext);

  if (!context) {
    throw new Error("useAdminWorkspaceContext must be used inside admin layout.");
  }

  return context;
}
