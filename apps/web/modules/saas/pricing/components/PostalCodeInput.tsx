"use client";

/**
 * PostalCodeInput - Story 11.2
 *
 * Multi-select input for entering postal codes with validation.
 * Supports French postal codes (5 digits) with real-time validation.
 */

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { cn } from "@ui/lib";
import { AlertCircleIcon, Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

interface PostalCodeValidation {
	postalCode: string;
	isValid: boolean;
	error?: string;
	isLoading?: boolean;
}

interface PostalCodeInputProps {
	value: string[];
	onChange: (postalCodes: string[]) => void;
	onValidationChange?: (validations: PostalCodeValidation[]) => void;
	countryCode?: string;
	onCountryCodeChange?: (countryCode: string) => void;
	maxCodes?: number;
	disabled?: boolean;
	className?: string;
}

// French postal code regex (5 digits)
const FRENCH_POSTAL_CODE_REGEX = /^[0-9]{5}$/;

// Validate French postal code format
function validateFrenchPostalCode(code: string): { isValid: boolean; error?: string } {
	const trimmed = code.trim();

	if (!FRENCH_POSTAL_CODE_REGEX.test(trimmed)) {
		return {
			isValid: false,
			error: "French postal codes must be exactly 5 digits",
		};
	}

	// Validate department code
	const department = parseInt(trimmed.substring(0, 2), 10);
	if (department === 0 || (department > 95 && department < 97) || department > 98) {
		if (department !== 20) {
			// Corsica exception
			return {
				isValid: false,
				error: "Invalid French department code",
			};
		}
	}

	return { isValid: true };
}

export function PostalCodeInput({
	value,
	onChange,
	onValidationChange,
	countryCode = "FR",
	onCountryCodeChange,
	maxCodes = 20,
	disabled = false,
	className,
}: PostalCodeInputProps) {
	const t = useTranslations();
	const [inputValue, setInputValue] = useState("");
	const [validations, setValidations] = useState<Map<string, PostalCodeValidation>>(new Map());
	const [inputError, setInputError] = useState<string | null>(null);

	// Add a postal code
	const addPostalCode = useCallback(() => {
		const trimmed = inputValue.trim();

		if (!trimmed) {
			return;
		}

		// Check if already added
		if (value.includes(trimmed)) {
			setInputError(t("pricing.zones.postalCodes.alreadyAdded"));
			return;
		}

		// Check max limit
		if (value.length >= maxCodes) {
			setInputError(t("pricing.zones.postalCodes.maxReached", { max: maxCodes }));
			return;
		}

		// Validate format
		const validation = validateFrenchPostalCode(trimmed);
		if (!validation.isValid) {
			setInputError(validation.error || t("pricing.zones.postalCodes.invalidFormat"));
			return;
		}

		// Add the postal code
		const newValue = [...value, trimmed];
		onChange(newValue);

		// Update validations
		const newValidations = new Map(validations);
		newValidations.set(trimmed, {
			postalCode: trimmed,
			isValid: true,
		});
		setValidations(newValidations);

		if (onValidationChange) {
			onValidationChange(Array.from(newValidations.values()));
		}

		// Clear input
		setInputValue("");
		setInputError(null);
	}, [inputValue, value, maxCodes, onChange, validations, onValidationChange, t]);

	// Remove a postal code
	const removePostalCode = useCallback(
		(postalCode: string) => {
			const newValue = value.filter((code) => code !== postalCode);
			onChange(newValue);

			// Update validations
			const newValidations = new Map(validations);
			newValidations.delete(postalCode);
			setValidations(newValidations);

			if (onValidationChange) {
				onValidationChange(Array.from(newValidations.values()));
			}
		},
		[value, onChange, validations, onValidationChange]
	);

	// Handle input change
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value.replace(/[^0-9]/g, "").slice(0, 5);
		setInputValue(newValue);
		setInputError(null);
	};

	// Handle key press
	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			addPostalCode();
		}
	};

	// Handle paste (support multiple codes separated by comma, space, or newline)
	const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const pastedText = e.clipboardData.getData("text");
		const codes = pastedText
			.split(/[,\s\n]+/)
			.map((code) => code.trim())
			.filter((code) => code.length > 0);

		const newCodes: string[] = [];
		const newValidations = new Map(validations);

		for (const code of codes) {
			if (value.length + newCodes.length >= maxCodes) {
				break;
			}

			if (value.includes(code) || newCodes.includes(code)) {
				continue;
			}

			const validation = validateFrenchPostalCode(code);
			if (validation.isValid) {
				newCodes.push(code);
				newValidations.set(code, {
					postalCode: code,
					isValid: true,
				});
			}
		}

		if (newCodes.length > 0) {
			onChange([...value, ...newCodes]);
			setValidations(newValidations);

			if (onValidationChange) {
				onValidationChange(Array.from(newValidations.values()));
			}
		}
	};

	return (
		<div className={cn("space-y-4", className)}>
			{/* Country selector */}
			<div className="space-y-2">
				<Label>{t("pricing.zones.postalCodes.country")}</Label>
				<Select
					value={countryCode}
					onValueChange={onCountryCodeChange}
					disabled={disabled || !onCountryCodeChange}
				>
					<SelectTrigger className="w-[200px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="FR">🇫🇷 France</SelectItem>
						{/* Future: Add more countries */}
					</SelectContent>
				</Select>
				<p className="text-muted-foreground text-xs">
					{t("pricing.zones.postalCodes.countryHelp")}
				</p>
			</div>

			{/* Postal code input */}
			<div className="space-y-2">
				<Label>{t("pricing.zones.postalCodes.label")}</Label>
				<div className="flex gap-2">
					<Input
						value={inputValue}
						onChange={handleInputChange}
						onKeyPress={handleKeyPress}
						onPaste={handlePaste}
						placeholder={t("pricing.zones.postalCodes.placeholder")}
						disabled={disabled || value.length >= maxCodes}
						className={cn(inputError && "border-destructive")}
						maxLength={5}
					/>
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={addPostalCode}
						disabled={disabled || !inputValue || value.length >= maxCodes}
					>
						<PlusIcon className="h-4 w-4" />
					</Button>
				</div>
				{inputError && (
					<p className="flex items-center gap-1 text-destructive text-sm">
						<AlertCircleIcon className="h-4 w-4" />
						{inputError}
					</p>
				)}
				<p className="text-muted-foreground text-xs">
					{t("pricing.zones.postalCodes.inputHelp", {
						count: value.length,
						max: maxCodes,
					})}
				</p>
			</div>

			{/* Selected postal codes */}
			{value.length > 0 && (
				<div className="space-y-2">
					<Label>{t("pricing.zones.postalCodes.selected")}</Label>
					<div className="flex flex-wrap gap-2">
						{value.map((code) => {
							const validation = validations.get(code);
							const isInvalid = validation && !validation.isValid;
							const isLoading = validation?.isLoading;

							return (
								<Badge
									key={code}
									variant={isInvalid ? "destructive" : "secondary"}
									className="flex items-center gap-1 pr-1"
								>
									{isLoading && <Loader2Icon className="h-3 w-3 animate-spin" />}
									{code}
									{isInvalid && (
										<span title={validation.error}>
											<AlertCircleIcon className="h-3 w-3" />
										</span>
									)}
									<button
										type="button"
										onClick={() => removePostalCode(code)}
										disabled={disabled}
										className="ml-1 rounded-full p-0.5 hover:bg-muted"
									>
										<XIcon className="h-3 w-3" />
									</button>
								</Badge>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
