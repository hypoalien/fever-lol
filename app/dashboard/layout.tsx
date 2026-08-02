"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";

import { AppSidebar } from "@/components/app-sidebar";
import {
  CommandPaletteProvider,
  CommandTrigger,
} from "@/components/command-palette";
import SessionWrapper from "@/components/session-wrapper";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { QueryProvider } from "@/lib/query/client";

/**
 * The dashboard frame.
 *
 * The header used to carry a breadcrumb that read "Dashboard" on every single
 * page — it named the app, not the location. Now that each page states its own
 * name in an h1, that space belongs to the thing an organizer actually needs
 * from anywhere: search.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionWrapper>
      <QueryProvider>
        <NuqsAdapter>
          <CommandPaletteProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset className="flex min-h-screen flex-col overflow-hidden">
                <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background/80 px-4 backdrop-blur">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-1 h-4" />
                  <CommandTrigger />
                </header>
                <main className="flex-1 overflow-auto">{children}</main>
              </SidebarInset>
            </SidebarProvider>
          </CommandPaletteProvider>
        </NuqsAdapter>
      </QueryProvider>
    </SessionWrapper>
  );
}
