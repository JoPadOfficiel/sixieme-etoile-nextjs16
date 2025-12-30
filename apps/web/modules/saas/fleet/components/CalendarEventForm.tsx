"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Textarea } from "@ui/components/textarea";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import { Calendar } from "@ui/components/calendar";
import { useToast } from "@ui/hooks/use-toast";
import { cn } from "@ui/lib";
import type { DriverCalendarEvent, CalendarEventType } from "../types";

interface CalendarEventFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	driverId: string;
	driverName: string;
	event?: DriverCalendarEvent | null;
	onSuccess: () => void;
}

const eventTypes: { value: CalendarEventType; label: string }[] = [
	{ value: "HOLIDAY", label: "Congés" },
	{ value: "SICK", label: "Maladie" },
	{ value: "PERSONAL", label: "Personnel" },
	{ value: "TRAINING", label: "Formation" },
	{ value: "OTHER", label: "Autre" },
];

const formSchema = z
	.object({
		eventType: z.enum(["HOLIDAY", "SICK", "PERSONAL", "TRAINING", "OTHER"]),
		title: z.string().max(200).optional().nullable(),
		notes: z.string().max(1000).optional().nullable(),
		startAt: z.date(),
		endAt: z.date(),
	})
	.refine((data) => data.startAt < data.endAt, {
		message: "La date de début doit être avant la date de fin",
		path: ["startAt"],
	});

type FormData = z.infer<typeof formSchema>;

export function CalendarEventForm({
	open,
	onOpenChange,
	driverId,
	driverName,
	event,
	onSuccess,
}: CalendarEventFormProps) {
	const t = useTranslations();
	const { toast } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			eventType: event?.eventType || "HOLIDAY",
			title: event?.title || "",
			notes: event?.notes || "",
			startAt: event?.startAt ? new Date(event.startAt) : new Date(),
			endAt: event?.endAt
				? new Date(event.endAt)
				: new Date(Date.now() + 24 * 60 * 60 * 1000),
		},
	});

	const onSubmit = async (data: FormData) => {
		setIsSubmitting(true);
		try {
			const url = event
				? `/api/vtc/drivers/${driverId}/calendar-events/${event.id}`
				: `/api/vtc/drivers/${driverId}/calendar-events`;

			const response = await fetch(url, {
				method: event ? "PATCH" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					eventType: data.eventType,
					title: data.title || null,
					notes: data.notes || null,
					startAt: data.startAt.toISOString(),
					endAt: data.endAt.toISOString(),
				}),
			});

			if (response.ok) {
				toast({
					title: event
						? t("fleet.calendar.eventUpdated")
						: t("fleet.calendar.eventCreated"),
				});
				onSuccess();
			} else {
				const errorData = await response.json().catch(() => ({}));
				toast({
					title: t("fleet.calendar.saveError"),
					description: errorData.message || undefined,
					variant: "error",
				});
			}
		} catch (error) {
			console.error("Error saving calendar event:", error);
			toast({
				title: t("fleet.calendar.saveError"),
				variant: "error",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{event
							? t("fleet.calendar.editEvent")
							: t("fleet.calendar.addEvent")}
					</DialogTitle>
					<DialogDescription>
						{t("fleet.calendar.formDescription", { name: driverName })}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="eventType"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("fleet.calendar.eventType")}</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder={t("fleet.calendar.selectType")} />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{eventTypes.map((type) => (
												<SelectItem key={type.value} value={type.value}>
													{type.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("fleet.calendar.eventTitle")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t("fleet.calendar.titlePlaceholder")}
											{...field}
											value={field.value || ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="startAt"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel>{t("fleet.calendar.startDate")}</FormLabel>
										<Popover>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														className={cn(
															"w-full pl-3 text-left font-normal",
															!field.value && "text-muted-foreground"
														)}
													>
														{field.value ? (
															format(field.value, "dd/MM/yyyy")
														) : (
															<span>{t("fleet.calendar.pickDate")}</span>
														)}
														<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
													</Button>
												</FormControl>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0" align="start">
												<Calendar
													mode="single"
													selected={field.value}
													onSelect={field.onChange}
													initialFocus
												/>
											</PopoverContent>
										</Popover>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="endAt"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel>{t("fleet.calendar.endDate")}</FormLabel>
										<Popover>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														className={cn(
															"w-full pl-3 text-left font-normal",
															!field.value && "text-muted-foreground"
														)}
													>
														{field.value ? (
															format(field.value, "dd/MM/yyyy")
														) : (
															<span>{t("fleet.calendar.pickDate")}</span>
														)}
														<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
													</Button>
												</FormControl>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0" align="start">
												<Calendar
													mode="single"
													selected={field.value}
													onSelect={field.onChange}
													initialFocus
												/>
											</PopoverContent>
										</Popover>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("fleet.calendar.notes")}</FormLabel>
									<FormControl>
										<Textarea
											placeholder={t("fleet.calendar.notesPlaceholder")}
											className="resize-none"
											rows={3}
											{...field}
											value={field.value || ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isSubmitting}
							>
								{t("common.cancel")}
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								{event ? t("common.save") : t("common.create")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
