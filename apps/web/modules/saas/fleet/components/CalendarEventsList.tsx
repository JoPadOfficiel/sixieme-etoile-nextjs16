"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Calendar,
	Plus,
	Trash2,
	Edit,
	Palmtree,
	Stethoscope,
	User,
	GraduationCap,
	MoreHorizontal,
	Loader2,
	Car,
	ExternalLink,
	MapPin,
} from "lucide-react";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@ui/components/alert-dialog";
import { useToast } from "@ui/hooks/use-toast";
import type { DriverCalendarEvent, CalendarEventType, DriverMission, CalendarItem } from "../types";
import { CalendarEventForm } from "./CalendarEventForm";
import Link from "next/link";
import { useParams } from "next/navigation";

interface CalendarEventsListProps {
	driverId: string;
	driverName: string;
}

const eventTypeConfig: Record<
	CalendarEventType,
	{ icon: typeof Calendar; color: string; label: string }
> = {
	HOLIDAY: { icon: Palmtree, color: "bg-green-100 text-green-800", label: "Congés" },
	SICK: { icon: Stethoscope, color: "bg-red-100 text-red-800", label: "Maladie" },
	PERSONAL: { icon: User, color: "bg-blue-100 text-blue-800", label: "Personnel" },
	TRAINING: { icon: GraduationCap, color: "bg-purple-100 text-purple-800", label: "Formation" },
	OTHER: { icon: MoreHorizontal, color: "bg-gray-100 text-gray-800", label: "Autre" },
};

export function CalendarEventsList({ driverId, driverName }: CalendarEventsListProps) {
	const t = useTranslations();
	const { toast } = useToast();
	const params = useParams();
	const organizationSlug = params.organizationSlug as string;
	
	const [events, setEvents] = useState<DriverCalendarEvent[]>([]);
	const [missions, setMissions] = useState<DriverMission[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingEvent, setEditingEvent] = useState<DriverCalendarEvent | null>(null);
	const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const fetchData = useCallback(async () => {
		setIsLoading(true);
		try {
			// Get events and missions for the next 90 days
			const startDate = new Date().toISOString();
			const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
			
			// Fetch both events and missions in parallel
			const [eventsResponse, missionsResponse] = await Promise.all([
				fetch(
					`/api/vtc/drivers/${driverId}/calendar-events?startDate=${startDate}&endDate=${endDate}&limit=50`
				),
				fetch(
					`/api/vtc/drivers/${driverId}/missions?startDate=${startDate}&endDate=${endDate}&limit=50`
				),
			]);
			
			if (eventsResponse.ok) {
				const data = await eventsResponse.json();
				setEvents(data.data || []);
			} else {
				console.error("Failed to fetch calendar events");
			}
			
			if (missionsResponse.ok) {
				const data = await missionsResponse.json();
				setMissions(data.data || []);
			} else {
				console.error("Failed to fetch missions");
			}
		} catch (error) {
			console.error("Error fetching calendar data:", error);
		} finally {
			setIsLoading(false);
		}
	}, [driverId]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);
	
	// Combine and sort events and missions chronologically
	const calendarItems = useMemo((): CalendarItem[] => {
		const items: CalendarItem[] = [];
		
		// Convert events to CalendarItem
		for (const event of events) {
			items.push({
				type: "event",
				id: event.id,
				startAt: event.startAt,
				endAt: event.endAt,
				title: event.title || eventTypeConfig[event.eventType].label,
				eventType: event.eventType,
				notes: event.notes,
			});
		}
		
		// Convert missions to CalendarItem
		for (const mission of missions) {
			const endAt = mission.estimatedEndAt || 
				new Date(new Date(mission.pickupAt).getTime() + 2 * 60 * 60 * 1000).toISOString();
			
			items.push({
				type: "mission",
				id: mission.id,
				startAt: mission.pickupAt,
				endAt,
				title: mission.contact.name,
				subtitle: mission.dropoffAddress 
					? `${mission.pickupAddress} → ${mission.dropoffAddress}`
					: mission.pickupAddress,
				quoteId: mission.id,
				status: mission.status,
				tripType: mission.tripType,
				pickupAddress: mission.pickupAddress,
				dropoffAddress: mission.dropoffAddress,
				contactName: mission.contact.name,
				vehicleCategoryName: mission.vehicleCategory.name,
			});
		}
		
		// Sort by start date
		items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
		
		return items;
	}, [events, missions]);

	const handleAddEvent = () => {
		setEditingEvent(null);
		setIsFormOpen(true);
	};

	const handleEditEvent = (event: DriverCalendarEvent) => {
		setEditingEvent(event);
		setIsFormOpen(true);
	};

	const handleDeleteEvent = async () => {
		if (!deletingEventId) return;

		setIsDeleting(true);
		try {
			const response = await fetch(
				`/api/vtc/drivers/${driverId}/calendar-events/${deletingEventId}`,
				{ method: "DELETE" }
			);

			if (response.ok) {
				toast({
					title: t("fleet.calendar.eventDeleted"),
				});
				fetchData();
			} else {
				toast({
					title: t("fleet.calendar.deleteError"),
					variant: "error",
				});
			}
		} catch (error) {
			console.error("Error deleting event:", error);
			toast({
				title: t("fleet.calendar.deleteError"),
				variant: "error",
			});
		} finally {
			setIsDeleting(false);
			setDeletingEventId(null);
		}
	};

	const handleFormSuccess = () => {
		setIsFormOpen(false);
		setEditingEvent(null);
		fetchData();
	};

	const formatDateRange = (startAt: string, endAt: string) => {
		const start = parseISO(startAt);
		const end = parseISO(endAt);
		const days = differenceInDays(end, start) + 1;

		if (days === 1) {
			return format(start, "d MMM yyyy", { locale: fr });
		}
		return `${format(start, "d MMM", { locale: fr })} - ${format(end, "d MMM yyyy", { locale: fr })} (${days} jours)`;
	};
	
	const formatMissionTime = (startAt: string, endAt: string) => {
		const start = parseISO(startAt);
		const end = parseISO(endAt);
		return `${format(start, "d MMM yyyy HH:mm", { locale: fr })} → ${format(end, "HH:mm", { locale: fr })}`;
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						{t("fleet.calendar.title")}
					</CardTitle>
				</CardHeader>
				<CardContent className="flex items-center justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="h-5 w-5" />
								{t("fleet.calendar.title")}
							</CardTitle>
							<CardDescription>
								{t("fleet.calendar.description")}
							</CardDescription>
						</div>
						<Button size="sm" onClick={handleAddEvent}>
							<Plus className="h-4 w-4 mr-1" />
							{t("fleet.calendar.addEvent")}
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{calendarItems.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
							<p>{t("fleet.calendar.noEvents")}</p>
							<p className="text-sm mt-1">{t("fleet.calendar.noEventsHint")}</p>
						</div>
					) : (
						<div className="space-y-3">
							{calendarItems.map((item) => {
								if (item.type === "event" && item.eventType) {
									// Render calendar event
									const config = eventTypeConfig[item.eventType];
									const Icon = config.icon;
									const originalEvent = events.find(e => e.id === item.id);

									return (
										<div
											key={`event-${item.id}`}
											className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
										>
											<div className="flex items-center gap-3">
												<div className={`p-2 rounded-full ${config.color}`}>
													<Icon className="h-4 w-4" />
												</div>
												<div>
													<div className="flex items-center gap-2">
														<span className="font-medium">
															{item.title}
														</span>
														<Badge variant="outline" className={config.color}>
															{config.label}
														</Badge>
													</div>
													<p className="text-sm text-muted-foreground">
														{formatDateRange(item.startAt, item.endAt)}
													</p>
													{item.notes && (
														<p className="text-sm text-muted-foreground mt-1">
															{item.notes}
														</p>
													)}
												</div>
											</div>
											<div className="flex items-center gap-1">
												{originalEvent && (
													<>
														<Button
															variant="ghost"
															size="icon"
															onClick={() => handleEditEvent(originalEvent)}
														>
															<Edit className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															onClick={() => setDeletingEventId(item.id)}
														>
															<Trash2 className="h-4 w-4 text-destructive" />
														</Button>
													</>
												)}
											</div>
										</div>
									);
								}
								
								// Render mission
								return (
									<div
										key={`mission-${item.id}`}
										className="flex items-center justify-between p-3 rounded-lg border bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors"
									>
										<div className="flex items-center gap-3">
											<div className="p-2 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
												<Car className="h-4 w-4" />
											</div>
											<div>
												<div className="flex items-center gap-2">
													<span className="font-medium">
														{item.contactName || item.title}
													</span>
													<Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
														{t("fleet.calendar.mission")}
													</Badge>
													{item.vehicleCategoryName && (
														<Badge variant="secondary" className="text-xs">
															{item.vehicleCategoryName}
														</Badge>
													)}
												</div>
												<p className="text-sm text-muted-foreground">
													{formatMissionTime(item.startAt, item.endAt)}
												</p>
												{item.pickupAddress && (
													<p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
														<MapPin className="h-3 w-3" />
														{item.dropoffAddress 
															? `${item.pickupAddress} → ${item.dropoffAddress}`
															: item.pickupAddress
														}
													</p>
												)}
											</div>
										</div>
										<div className="flex items-center gap-1">
											<Link href={`/app/${organizationSlug}/quotes/${item.quoteId}`}>
												<Button variant="ghost" size="sm">
													<ExternalLink className="h-4 w-4 mr-1" />
													{t("fleet.calendar.viewQuote")}
												</Button>
											</Link>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Add/Edit Form Dialog */}
			<CalendarEventForm
				open={isFormOpen}
				onOpenChange={setIsFormOpen}
				driverId={driverId}
				driverName={driverName}
				event={editingEvent}
				onSuccess={handleFormSuccess}
			/>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={!!deletingEventId}
				onOpenChange={(open) => !open && setDeletingEventId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("fleet.calendar.deleteConfirmTitle")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("fleet.calendar.deleteConfirmDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>
							{t("common.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteEvent}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							) : (
								<Trash2 className="h-4 w-4 mr-2" />
							)}
							{t("common.delete")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
