import { Link, useLocation } from "wouter";
import { Palette, BarChart3, Mail, Settings, Home, Users, CreditCard, PackagePlus, Image, Building2, ScrollText, Bug, Star, DollarSign } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Colors", url: "/admin/colors", icon: Palette },
  { title: "Packages", url: "/admin/packages", icon: PackagePlus },
  { title: "Usage", url: "/admin/usage", icon: BarChart3 },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Payments", url: "/admin/payments", icon: CreditCard },
  { title: "Emails", url: "/admin/emails", icon: Mail },
  { title: "Renders", url: "/admin/renders", icon: Image },
  { title: "Partners", url: "/admin/partners", icon: Building2 },
  { title: "Ambassadors", url: "/admin/ambassadors", icon: Star },
  { title: "Payouts", url: "/admin/payouts", icon: DollarSign },
  { title: "Bug Reports", url: "/admin/bug-reports", icon: Bug },
  { title: "Audit Log", url: "/admin/audit-log", icon: ScrollText },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <Link href="/admin">
          <img src="/logo-wrapup.svg" alt="wrap-up" className="h-8 w-auto" />
        </Link>
        <span className="text-xs text-muted-foreground mt-1">Admin Dashboard</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || location.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={cn(isActive && "bg-sidebar-accent")}
                    >
                      <Link href={item.url} data-testid={`link-admin-${item.title.toLowerCase()}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/" data-testid="link-back-to-app">
                    <Home className="w-4 h-4" />
                    <span>Back to App</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
