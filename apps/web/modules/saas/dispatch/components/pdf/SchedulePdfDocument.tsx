/**
 * SchedulePdfDocument Component
 *
 * Story 27.14: Export Schedule
 *
 * React-PDF document component for generating a printable daily schedule.
 * Displays a list of drivers with their missions for a selected date.
 * Format: A4 Landscape for optimal readability of time slots.
 */

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import type { GanttDriver, GanttMission } from "../gantt/types";

// Translations type for PDF (passed as props since react-pdf is server-side)
export interface SchedulePdfTranslations {
	title: string;
	date: string;
	generatedAt: string;
	driver: string;
	departure: string;
	arrival: string;
	pickup: string;
	dropoff: string;
	client: string;
	noMissions: string;
	noMissionsForDriver: string;
	page: string;
	of: string;
}

export interface SchedulePdfDocumentProps {
	drivers: GanttDriver[];
	date: Date;
	organizationName: string;
	translations: SchedulePdfTranslations;
	localeCode: string;
}

// Styles for the PDF document
const styles = StyleSheet.create({
	page: {
		flexDirection: "column",
		backgroundColor: "#ffffff",
		padding: 30,
		fontFamily: "Helvetica",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
		paddingBottom: 15,
		borderBottomWidth: 2,
		borderBottomColor: "#1e3a5f",
		borderBottomStyle: "solid",
	},
	headerLeft: {
		flexDirection: "column",
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#1e3a5f",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 12,
		color: "#64748b",
	},
	organizationName: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#334155",
	},
	driverSection: {
		marginBottom: 20,
	},
	driverHeader: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f1f5f9",
		padding: 10,
		marginBottom: 8,
		borderRadius: 4,
	},
	driverName: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#1e293b",
	},
	driverMissionCount: {
		fontSize: 10,
		color: "#64748b",
		marginLeft: 10,
	},
	table: {
		flexDirection: "column",
		borderWidth: 1,
		borderColor: "#e2e8f0",
		borderRadius: 4,
	},
	tableHeader: {
		flexDirection: "row",
		backgroundColor: "#1e3a5f",
		padding: 8,
	},
	tableHeaderCell: {
		fontSize: 9,
		fontWeight: "bold",
		color: "#ffffff",
		textTransform: "uppercase",
	},
	tableRow: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#e2e8f0",
		borderBottomStyle: "solid",
		padding: 8,
		minHeight: 32,
	},
	tableRowAlt: {
		backgroundColor: "#f8fafc",
	},
	tableCell: {
		fontSize: 10,
		color: "#334155",
	},
	// Column widths for landscape A4
	colDeparture: { width: "12%" },
	colArrival: { width: "12%" },
	colPickup: { width: "28%" },
	colDropoff: { width: "28%" },
	colClient: { width: "20%" },
	noMissionsRow: {
		padding: 15,
		alignItems: "center",
	},
	noMissionsText: {
		fontSize: 11,
		color: "#94a3b8",
		fontStyle: "italic",
	},
	footer: {
		position: "absolute",
		bottom: 20,
		left: 30,
		right: 30,
		flexDirection: "row",
		justifyContent: "space-between",
		fontSize: 8,
		color: "#94a3b8",
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 100,
	},
	emptyStateText: {
		fontSize: 16,
		color: "#64748b",
	},
});

/**
 * Format time from Date object
 */
function formatTime(date: Date): string {
	return format(date, "HH:mm");
}

/**
 * Truncate text to fit in column
 * Note: Limits (45, 25) are optimized for Helvetica 10pt in A4 Landscape columns
 */
function truncateText(text: string | undefined, maxLength: number): string {
	if (!text) return "-";
	if (text.length <= maxLength) return text;
	return `${text.substring(0, maxLength - 3)}...`;
}

/**
 * Mission Row Component
 */
function MissionRow({
	mission,
	isAlternate,
}: {
	mission: GanttMission;
	isAlternate: boolean;
}) {
	return (
		<View style={[styles.tableRow, isAlternate ? styles.tableRowAlt : {}]}>
			<View style={styles.colDeparture}>
				<Text style={styles.tableCell}>{formatTime(mission.startAt)}</Text>
			</View>
			<View style={styles.colArrival}>
				<Text style={styles.tableCell}>{formatTime(mission.endAt)}</Text>
			</View>
			<View style={styles.colPickup}>
				<Text style={styles.tableCell}>
					{truncateText(mission.pickupAddress, 45)}
				</Text>
			</View>
			<View style={styles.colDropoff}>
				<Text style={styles.tableCell}>
					{truncateText(mission.dropoffAddress, 45)}
				</Text>
			</View>
			<View style={styles.colClient}>
				<Text style={styles.tableCell}>
					{truncateText(mission.clientName, 25)}
				</Text>
			</View>
		</View>
	);
}

/**
 * Driver Section Component
 */
function DriverSection({
	driver,
	translations,
}: {
	driver: GanttDriver;
	translations: SchedulePdfTranslations;
}) {
	const missions = driver.missions || [];
	const sortedMissions = [...missions].sort(
		(a, b) => a.startAt.getTime() - b.startAt.getTime(),
	);

	return (
		<View style={styles.driverSection} wrap={false}>
			<View style={styles.driverHeader}>
				<Text style={styles.driverName}>👤 {driver.name}</Text>
				<Text style={styles.driverMissionCount}>
					({missions.length} mission{missions.length > 1 ? "s" : ""})
				</Text>
			</View>

			<View style={styles.table}>
				{/* Table Header */}
				<View style={styles.tableHeader}>
					<View style={styles.colDeparture}>
						<Text style={styles.tableHeaderCell}>{translations.departure}</Text>
					</View>
					<View style={styles.colArrival}>
						<Text style={styles.tableHeaderCell}>{translations.arrival}</Text>
					</View>
					<View style={styles.colPickup}>
						<Text style={styles.tableHeaderCell}>{translations.pickup}</Text>
					</View>
					<View style={styles.colDropoff}>
						<Text style={styles.tableHeaderCell}>{translations.dropoff}</Text>
					</View>
					<View style={styles.colClient}>
						<Text style={styles.tableHeaderCell}>{translations.client}</Text>
					</View>
				</View>

				{/* Mission Rows */}
				{sortedMissions.length > 0 ? (
					sortedMissions.map((mission, index) => (
						<MissionRow
							key={mission.id}
							mission={mission}
							isAlternate={index % 2 === 1}
						/>
					))
				) : (
					<View style={styles.noMissionsRow}>
						<Text style={styles.noMissionsText}>
							{translations.noMissionsForDriver}
						</Text>
					</View>
				)}
			</View>
		</View>
	);
}

/**
 * Main PDF Document Component
 */
export function SchedulePdfDocument({
	drivers,
	date,
	organizationName,
	translations,
	localeCode,
}: SchedulePdfDocumentProps) {
	// Map locale code to date-fns locale object
	const dateLocale = localeCode === "en" ? enUS : fr;

	const formattedDate = format(date, "EEEE d MMMM yyyy", {
		locale: dateLocale,
	});
	const generatedAt = format(new Date(), "dd/MM/yyyy à HH:mm", {
		locale: dateLocale,
	});

	// Filter drivers with missions for the selected date
	const driversWithMissions = drivers.filter(
		(driver) => driver.missions && driver.missions.length > 0,
	);

	// If no drivers have missions, show all active drivers
	const displayDrivers =
		driversWithMissions.length > 0 ? driversWithMissions : drivers;

	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.headerLeft}>
						<Text style={styles.title}>📅 {translations.title}</Text>
						<Text style={styles.subtitle}>
							{translations.date}: {formattedDate}
						</Text>
					</View>
					<Text style={styles.organizationName}>{organizationName}</Text>
				</View>

				{/* Content */}
				{/* Note: This empty state is primarily defensive. The parent component usually handles
				    the empty state before rendering this button/component. */}
				{displayDrivers.length === 0 ? (
					<View style={styles.emptyState}>
						<Text style={styles.emptyStateText}>{translations.noMissions}</Text>
					</View>
				) : (
					displayDrivers.map((driver) => (
						<DriverSection
							key={driver.id}
							driver={driver}
							translations={translations}
						/>
					))
				)}

				{/* Footer */}
				<View style={styles.footer} fixed>
					<Text>
						{translations.generatedAt}: {generatedAt}
					</Text>
					<Text
						render={({ pageNumber, totalPages }) =>
							`${translations.page} ${pageNumber} ${translations.of} ${totalPages}`
						}
					/>
				</View>
			</Page>
		</Document>
	);
}

export default SchedulePdfDocument;
