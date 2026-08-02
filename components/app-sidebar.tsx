"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Calendar,
  TicketIcon,
  Store,
  Settings,
  HelpCircle,
  Bell,
  MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/lib/auth-client";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";

const navigationData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Events",
      url: "/dashboard/events",
      icon: Calendar,
      items: [],
    },
    {
      title: "Venues",
      url: "/dashboard/venues",
      icon: MapPin,
      items: [],
    },
    {
      title: "Orders",
      url: "/dashboard/orders",
      icon: TicketIcon,
      items: [],
    },
    {
      title: "Attendees",
      url: "/dashboard/attendees",
      icon: Store,
      items: [],
    },

    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
      items: [],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "/dashboard/support",
      icon: HelpCircle,
    },
    {
      title: "Notifications",
      url: "/dashboard/notifications",
      icon: Bell,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Better Auth has no `required` option, so the redirect is explicit. It runs
  // in an effect rather than during render so it cannot fire mid-commit.
  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  // The chrome renders straight away and only the user block waits. Returning
  // nothing until the session resolved meant the whole sidebar appeared a beat
  // after the page, shifting everything sideways on every load.
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <LogoMark className="size-8 text-[hsl(var(--secondary))]" />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold tracking-tight">
                    Fever.lol
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    Event ticketing
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationData.navMain} />
        <NavSecondary items={navigationData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {isPending || !session ? (
          <div className="flex items-center gap-2 p-2">
            <div className="size-8 shrink-0 animate-pulse rounded-lg bg-sidebar-accent" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 animate-pulse rounded bg-sidebar-accent" />
              <div className="h-2.5 w-32 animate-pulse rounded bg-sidebar-accent" />
            </div>
          </div>
        ) : (
          <NavUser
            user={{
              name: session.user.name || "",
              email: session.user.email || "",
              avatar: session.user.image ?? "",
            }}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
