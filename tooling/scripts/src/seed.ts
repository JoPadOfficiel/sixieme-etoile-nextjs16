import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { nanoid } from "nanoid";

async function main() {
	logger.log("Seeding application...");

	const authContext = await auth.$context;
	const adminEmail = "admin@example.com";
	const adminPassword = nanoid(16);
	const hashedPassword = await authContext.password.hash(adminPassword);
	const adminUser = await db.user.upsert({
		where: {
			email: adminEmail,
		},
		update: {},
		create: {
			id: nanoid(),
			email: adminEmail,
			name: "Adam Admin",
			role: "admin",
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			onboardingComplete: true,
		},
		include: {
			accounts: true,
		},
	});
	if (
		!adminUser?.accounts.some((account) => account.providerId === "credential")
	) {
		await db.account.create({
			data: {
				id: nanoid(),
				userId: adminUser.id,
				accountId: adminUser.id,
				providerId: "credential",
				createdAt: new Date(),
				updatedAt: new Date(),
				password: hashedPassword,
			},
		});
	}

	logger.success("Application seeded successfully!");
	logger.info(
		`Admin user created: ${adminUser.email} (${adminUser.id}) - PW: ${
			adminPassword
		}`,
	);
}

main();
