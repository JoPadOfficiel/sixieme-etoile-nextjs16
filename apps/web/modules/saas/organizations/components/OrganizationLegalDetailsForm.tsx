"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SettingsItem } from "@saas/shared/components/SettingsItem";
import { Spinner } from "@shared/components/Spinner";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import { Input } from "@ui/components/input";
import { useToast } from "@ui/hooks/use-toast";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
	address: z.string().optional(),
	addressLine2: z.string().optional(),
	postalCode: z.string().optional(),
	city: z.string().optional(),
	country: z.string().optional(),
	phone: z.string().optional(),
	email: z.string().email().optional().or(z.literal("")),
	website: z.string().url().optional().or(z.literal("")),
	siret: z.string().optional(),
	vatNumber: z.string().optional(),
	iban: z.string().optional(),
	bic: z.string().optional(),
	bankName: z.string().optional(),
	rcs: z.string().optional(),
	ape: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function OrganizationLegalDetailsForm() {
	const { toast } = useToast();
	const queryClient = useQueryClient();

	// Initialize with empty strings to prevent "uncontrolled to controlled" error
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			address: "",
			addressLine2: "",
			postalCode: "",
			city: "",
			country: "France",
			phone: "",
			email: "",
			website: "",
			siret: "",
			vatNumber: "",
			iban: "",
			bic: "",
			bankName: "",
			rcs: "",
			ape: "",
		},
	});

	// Fetch existing details
	const { data, isLoading } = useQuery({
		queryKey: ["organization-details"],
		queryFn: async (): Promise<Partial<FormValues>> => {
			const res = await apiClient.vtc["organization-details"].$get();
			if (!res.ok) throw new Error("Failed to fetch details");
			return res.json() as Promise<Partial<FormValues>>;
		},
	});

	useEffect(() => {
		if (data) {
			form.reset({
				address: data.address || "",
				addressLine2: data.addressLine2 || "",
				postalCode: data.postalCode || "",
				city: data.city || "",
				country: data.country || "France",
				phone: data.phone || "",
				email: data.email || "",
				website: data.website || "",
				siret: data.siret || "",
				vatNumber: data.vatNumber || "",
				iban: data.iban || "",
				bic: data.bic || "",
				bankName: data.bankName || "",
				rcs: data.rcs || "",
				ape: data.ape || "",
			});
		}
	}, [data, form]);

	const mutation = useMutation({
		mutationFn: async (values: FormValues) => {
			const res = await apiClient.vtc["organization-details"].$patch({
				json: values,
			});
			if (!res.ok) throw new Error("Failed to update");
			return res.json();
		},
		onSuccess: () => {
			toast({
				variant: "success",
				title: "Détails légaux mis à jour",
				description: "Les informations de l'organisation ont été enregistrées.",
			});
			queryClient.invalidateQueries({ queryKey: ["organization-details"] });
		},
		onError: () => {
			toast({
				variant: "error",
				title: "Erreur",
				description: "Impossible de mettre à jour les détails.",
			});
		},
	});

	const onSubmit = (values: FormValues) => {
		mutation.mutate(values);
	};

	if (isLoading) return <Spinner />;

	return (
		<SettingsItem
			title="Détails Légaux & Coordonnées"
			description="Ces informations apparaîtront sur vos devis et factures."
		>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<FormField
							control={form.control}
							name="siret"
							render={({ field }) => (
								<FormItem>
									<FormLabel>SIRET</FormLabel>
									<FormControl>
										<Input placeholder="123 456 789 00012" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="vatNumber"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Numéro TVA</FormLabel>
									<FormControl>
										<Input placeholder="FR 12 123456789" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="rcs"
							render={({ field }) => (
								<FormItem>
									<FormLabel>RCS / RM</FormLabel>
									<FormControl>
										<Input placeholder="RCS Paris B 123 456 789" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="ape"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Code APE/NAF</FormLabel>
									<FormControl>
										<Input placeholder="4932Z" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="grid grid-cols-1 gap-4">
						<FormField
							control={form.control}
							name="address"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Adresse</FormLabel>
									<FormControl>
										<Input
											placeholder="123 Avenue des Champs-Elysées"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="addressLine2"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Complément d&apos;adresse</FormLabel>
									<FormControl>
										<Input placeholder="Bâtiment B" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="postalCode"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Code Postal</FormLabel>
										<FormControl>
											<Input placeholder="75008" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="city"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Ville</FormLabel>
										<FormControl>
											<Input placeholder="Paris" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-4 transition-all md:grid-cols-2">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email de contact</FormLabel>
									<FormControl>
										<Input placeholder="contact@company.com" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="phone"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Téléphone</FormLabel>
									<FormControl>
										<Input placeholder="+33 1 23 45 67 89" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="rounded-lg border bg-muted/20 p-4">
						<h4 className="mb-4 font-medium">Coordonnées Bancaires</h4>
						<div className="grid grid-cols-1 gap-4">
							<FormField
								control={form.control}
								name="bankName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Nom de la banque</FormLabel>
										<FormControl>
											<Input placeholder="BNP Paribas" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="iban"
								render={({ field }) => (
									<FormItem>
										<FormLabel>IBAN</FormLabel>
										<FormControl>
											<Input placeholder="FR76 ..." {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="bic"
								render={({ field }) => (
									<FormItem>
										<FormLabel>BIC / SWIFT</FormLabel>
										<FormControl>
											<Input placeholder="BNPAFRPP" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					<div className="flex justify-end">
						<Button type="submit" loading={mutation.isPending}>
							Enregistrer
						</Button>
					</div>
				</form>
			</Form>
		</SettingsItem>
	);
}
