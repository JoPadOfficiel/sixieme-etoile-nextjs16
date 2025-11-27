"use client";

/**
 * DocumentsTable Component
 * Story 7.5: Document Generation & Storage
 *
 * Displays a list of generated documents with filters and download actions.
 */

import { useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import {
	DownloadIcon,
	FileTextIcon,
	Loader2Icon,
	SearchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useDocuments, getDocumentDownloadUrl } from "../hooks/useDocuments";
import {
	formatDate,
	getDocumentTypeLabel,
	getDocumentTypeBadgeVariant,
} from "../types";

interface DocumentsTableProps {
	initialFilters?: {
		type?: string;
		search?: string;
	};
}

export function DocumentsTable({ initialFilters }: DocumentsTableProps) {
	const t = useTranslations();
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState(initialFilters?.search || "");
	const [typeFilter, setTypeFilter] = useState(initialFilters?.type || "all");

	const { data, isLoading, error } = useDocuments({
		page,
		limit: 20,
		type: typeFilter !== "all" ? typeFilter : undefined,
		search: search || undefined,
	});

	const handleDownload = (documentId: string) => {
		const url = getDocumentDownloadUrl(documentId);
		window.open(url, "_blank");
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2Icon className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-12">
				<p className="text-destructive">{t("documents.error")}</p>
			</div>
		);
	}

	const documents = data?.data || [];
	const meta = data?.meta;

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="relative flex-1">
					<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						placeholder={t("documents.search")}
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						className="pl-10"
					/>
				</div>
				<Select
					value={typeFilter}
					onValueChange={(value) => {
						setTypeFilter(value);
						setPage(1);
					}}
				>
					<SelectTrigger className="w-[200px]">
						<SelectValue placeholder={t("documents.filters.allTypes")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("documents.filters.allTypes")}</SelectItem>
						<SelectItem value="QUOTE_PDF">{t("documents.types.QUOTE_PDF")}</SelectItem>
						<SelectItem value="INVOICE_PDF">{t("documents.types.INVOICE_PDF")}</SelectItem>
						<SelectItem value="MISSION_ORDER">{t("documents.types.MISSION_ORDER")}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			{documents.length === 0 ? (
				<div className="text-center py-12 border rounded-lg">
					<FileTextIcon className="mx-auto size-12 text-muted-foreground mb-4" />
					<p className="text-muted-foreground">
						{search ? t("documents.noResults") : t("documents.empty")}
					</p>
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("documents.columns.type")}</TableHead>
								<TableHead>{t("documents.columns.reference")}</TableHead>
								<TableHead>{t("documents.columns.client")}</TableHead>
								<TableHead>{t("documents.columns.createdAt")}</TableHead>
								<TableHead className="text-right">{t("documents.columns.actions")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{documents.map((doc) => (
								<TableRow key={doc.id}>
									<TableCell>
										<Badge variant={getDocumentTypeBadgeVariant(doc.documentType.code)}>
											{getDocumentTypeLabel(doc.documentType.code)}
										</Badge>
									</TableCell>
									<TableCell>
										{doc.invoice ? (
											<span className="font-mono text-sm">{doc.invoice.number}</span>
										) : doc.quoteId ? (
											<span className="font-mono text-sm">{doc.quoteId.slice(-8).toUpperCase()}</span>
										) : (
											<span className="text-muted-foreground">-</span>
										)}
									</TableCell>
									<TableCell>
										{doc.invoice?.contact?.displayName || (
											<span className="text-muted-foreground">-</span>
										)}
									</TableCell>
									<TableCell>{formatDate(doc.createdAt)}</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleDownload(doc.id)}
										>
											<DownloadIcon className="size-4 mr-2" />
											{t("documents.actions.download")}
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Pagination */}
			{meta && meta.totalPages > 1 && (
				<div className="flex items-center justify-between">
					<p className="text-sm text-muted-foreground">
						{t("common.pagination.showing", {
							from: (page - 1) * meta.limit + 1,
							to: Math.min(page * meta.limit, meta.total),
							total: meta.total,
						})}
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={page === 1}
							onClick={() => setPage(page - 1)}
						>
							{t("common.pagination.previous")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={page === meta.totalPages}
							onClick={() => setPage(page + 1)}
						>
							{t("common.pagination.next")}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

export default DocumentsTable;
