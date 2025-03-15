'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  LayoutDashboard,
  ListChecks,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Search,
} from 'lucide-react';

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Listings',
    href: '/dashboard/listings',
    icon: Package,
  },
  {
    title: 'Orders',
    href: '/dashboard/orders',
    icon: ShoppingCart,
  },
  {
    title: 'Search',
    href: '/dashboard/search',
    icon: Search,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    title: 'Customers',
    href: '/dashboard/customers',
    icon: Users,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="grid items-start gap-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'transparent text-muted-foreground'
            )}
          >
            <item.icon className="mr-3 h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
} 