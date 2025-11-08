/**
 * Dashboard Template Component
 * 
 * Grid-based layout for dashboard pages with cards, widgets, and analytics.
 * This template provides a consistent structure for all dashboard-type pages.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageMetadata } from '@/services/PageRegistry';

interface DashboardTemplateProps {
  pageMetadata: PageMetadata;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  sidebarContent?: React.ReactNode;
  quickStats?: Array<{
    label: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
  }>;
  className?: string;
}

export function DashboardTemplate({
  pageMetadata,
  children,
  headerActions,
  sidebarContent,
  quickStats,
  className = ''
}: DashboardTemplateProps) {
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Dashboard Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {pageMetadata.title}
              </h1>
              {pageMetadata.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {pageMetadata.description}
                </p>
              )}
            </div>
            {pageMetadata.isCorePage && (
              <Badge variant="secondary" className="text-xs">
                Core
              </Badge>
            )}
          </div>
          <div className="ml-auto flex items-center space-x-2">
            {headerActions}
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="flex flex-1">
        {/* Sidebar (if provided) */}
        {sidebarContent && (
          <aside className="w-64 border-r bg-muted/10 p-6">
            {sidebarContent}
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 space-y-6">
          {/* Quick Stats Row */}
          {quickStats && quickStats.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {quickStats.map((stat, index) => (
                <Card key={index} className="p-4">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </CardTitle>
                    {stat.trend && (
                      <div className={`text-xs flex items-center ${
                        stat.trend === 'up' 
                          ? 'text-green-600' 
                          : stat.trend === 'down' 
                            ? 'text-red-600' 
                            : 'text-muted-foreground'
                      }`}>
                        {stat.change}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Dashboard Content Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Dashboard Card Component - Reusable card for dashboard widgets
export function DashboardCard({
  title,
  description,
  children,
  actions,
  className = '',
  loading = false
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  loading?: boolean;
}) {
  return (
    <Card className={`relative ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {description}
            </CardDescription>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// Empty State Component for dashboard widgets
export function DashboardEmptyState({
  title,
  description,
  action,
  icon
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="font-medium text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}