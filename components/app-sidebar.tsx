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

  if (isPending || !session) {
    return <div>Loading...</div>;
  }
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex bg-primary-foreground aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                  <Image
                    src="/logo.svg"
                    alt="Fever.lol"
                    className="w-full h-full p-1 bg-primary rounded-sm"
                    width={64}
                    height={64}
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Fever.lol</span>
                  <span className="truncate text-xs">Event Management</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationData.navMain} />
        <NavSecondary items={navigationData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: session?.user?.name || "",
            email: session?.user?.email || "",
            avatar: session?.user?.image || "/avatars/default.png",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
