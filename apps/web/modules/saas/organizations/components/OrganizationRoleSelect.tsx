import type { OrganizationMemberRole } from "@repo/auth";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { useTranslations } from "next-intl";

export function OrganizationRoleSelect({
	value,
	onSelect,
	disabled,
}: {
	value: OrganizationMemberRole;
	onSelect: (value: OrganizationMemberRole) => void;
	disabled?: boolean;
}) {
	const t = useTranslations();

	const roleOptions: { label: string; value: OrganizationMemberRole }[] = [
		{
			label: t("organizations.roles.member"),
			value: "member",
		},
		{
			label: t("organizations.roles.owner"),
			value: "owner",
		},
		{
			label: t("organizations.roles.admin"),
			value: "admin",
		},
	];

	return (
		<Select value={value} onValueChange={onSelect} disabled={disabled}>
			<SelectTrigger>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{roleOptions.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
