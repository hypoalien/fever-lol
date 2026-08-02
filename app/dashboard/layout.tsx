"use client";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import SessionWrapper from "@/components/session-wrapper";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { QueryProvider } from "@/lib/query/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionWrapper>
    <QueryProvider>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <NuqsAdapter>{children}</NuqsAdapter>
        </main>
      </SidebarInset>
    </SidebarProvider>
    </QueryProvider>
    </SessionWrapper>
  );
}
