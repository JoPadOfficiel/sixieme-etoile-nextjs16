"use client";

/**
 * OrganizationProviders
 *
 * Story 10.1: Fix Google Maps Integration for Quotes & Dispatch
 *
 * Client-side providers wrapper for organization-scoped pages.
 * This component wraps children with providers that require client-side
 * functionality, such as Google Maps.
 */

import type { ReactNode } from "react";
import { GoogleMapsProvider } from "../providers/GoogleMapsProvider";

interface OrganizationProvidersProps {
  children: ReactNode;
}

export function OrganizationProviders({ children }: OrganizationProvidersProps) {
  return (
    <GoogleMapsProvider>
      {children}
    </GoogleMapsProvider>
  );
}

export default OrganizationProviders;
