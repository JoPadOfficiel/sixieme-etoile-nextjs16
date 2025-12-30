"use client";

import { useState, useEffect, useCallback } from "react";
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
import type { DriverCalendarEvent, CalendarEventType } from "../types";
import { CalendarEventForm } from "./CalendarEventForm";

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
	const [events, setEvents] = useState<DriverCalendarEvent[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingEvent, setEditingEvent] = useState<DriverCalendarEvent | null>(null);
	const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const fetchEvents = useCallback(async () => {
		setIsLoading(true);
		try {
			// Get events for the next 90 days
			const startDate = new Date().toISOString();
			const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
			
			const response = await fetch(
				`/api/vtc/drivers/${driverId}/calendar-events?startDate=${startDate}&endDate=${endDate}&limit=50`
			);
			
			if (response.ok) {
				const data = await response.json();
				setEvents(data.data || []);
			} else {
				console.error("Failed to fetch calendar events");
			}
		} catch (error) {
			console.error("Error fetching calendar events:", error);
		} finally {
			setIsLoading(false);
		}
	}, [driverId]);

	useEffect(() => {
		fetchEvents();
	}, [fetchEvents]);

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
				fetchEvents();
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
		fetchEvents();
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
					{events.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
							<p>{t("fleet.calendar.noEvents")}</p>
							<p className="text-sm mt-1">{t("fleet.calendar.noEventsHint")}</p>
						</div>
					) : (
						<div className="space-y-3">
							{events.map((event) => {
								const config = eventTypeConfig[event.eventType];
								const Icon = config.icon;

								return (
									<div
										key={event.id}
										className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
									>
										<div className="flex items-center gap-3">
											<div className={`p-2 rounded-full ${config.color}`}>
												<Icon className="h-4 w-4" />
											</div>
											<div>
												<div className="flex items-center gap-2">
													<span className="font-medium">
														{event.title || config.label}
													</span>
													<Badge variant="outline" className={config.color}>
														{config.label}
													</Badge>
												</div>
												<p className="text-sm text-muted-foreground">
													{formatDateRange(event.startAt, event.endAt)}
												</p>
												{event.notes && (
													<p className="text-sm text-muted-foreground mt-1">
														{event.notes}
													</p>
												)}
											</div>
										</div>
										<div className="flex items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleEditEvent(event)}
											>
												<Edit className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => setDeletingEventId(event.id)}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>
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
