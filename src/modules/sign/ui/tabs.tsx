"use client";

import * as React from "react";
import { Tabs, TabsContent as ProductTabsContent, TabsList as ProductTabsList, TabsTrigger as ProductTabsTrigger } from "@/components/product-ui";
import { cn } from "@/lib/utils";

/** product-ui Tabs (site look: dark list, yellow active tab) with 44px triggers and a solid focus ring. */
export { Tabs };

export const TabsList = React.forwardRef<
  React.ElementRef<typeof ProductTabsList>,
  React.ComponentPropsWithoutRef<typeof ProductTabsList>
>(function TabsList({ className, ...props }, ref) {
  return <ProductTabsList ref={ref} className={cn("h-auto max-w-full overflow-x-auto scrollbar-none", className)} {...props} />;
});

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof ProductTabsTrigger>,
  React.ComponentPropsWithoutRef<typeof ProductTabsTrigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <ProductTabsTrigger
      ref={ref}
      className={cn(
        "min-h-11 px-4 font-semibold focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422] motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  );
});

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof ProductTabsContent>,
  React.ComponentPropsWithoutRef<typeof ProductTabsContent>
>(function TabsContent({ className, ...props }, ref) {
  return <ProductTabsContent ref={ref} className={cn("rounded-xl focus-visible:ring-2", className)} {...props} />;
});
