import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppSidebar />
      {children}
    </>
  );
}