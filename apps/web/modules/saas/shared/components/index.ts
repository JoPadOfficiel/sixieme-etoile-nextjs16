/**
 * Shared Components Barrel Export
 * 
 * Centralized exports for all shared components used across modules.
 * 
 * @see Story 6.7: Integrate TripTransparencyPanel & Profitability Indicator Across Screens
 */

// Layout components
export { AppWrapper } from "./AppWrapper";
export { AuthWrapper } from "./AuthWrapper";
export { Footer } from "./Footer";
export { NavBar } from "./NavBar";
export { PageHeader } from "./PageHeader";
export { SidebarContentLayout } from "./SidebarContentLayout";

// UI components
export { AddressAutocomplete } from "./AddressAutocomplete";
export { ConfirmationAlertProvider, useConfirmationAlert } from "./ConfirmationAlertProvider";
export { Pagination } from "./Pagination";
export { SettingsItem } from "./SettingsItem";
export { SettingsList } from "./SettingsList";
export { TabGroup } from "./TabGroup";
export { UserMenu } from "./UserMenu";

// Pricing & Trip Transparency components
export { ProfitabilityIndicator } from "./ProfitabilityIndicator";
export type { ProfitabilityIndicatorProps } from "./ProfitabilityIndicator";

export { TripTransparencyPreview } from "./TripTransparencyPreview";
export type { TripTransparencyPreviewProps } from "./TripTransparencyPreview";
