import "dotenv/config";
import { prisma } from "./lib/prisma";

async function main() {
  const property = await prisma.property.findFirst({
    where: { address: "Beirut Apartment" },
  });

  if (!property) {
    console.log("No property found — creating one.");
    const newProperty = await prisma.property.create({
      data: {
        address: "Beirut Apartment",
        ownerName: "Test Owner",
        caretakerName: "Test Caretaker",
      },
    });
    console.log("PROPERTY ID:", newProperty.id);
    return;
  }

  console.log("Using existing PROPERTY ID:", property.id);

  const user = await prisma.user.create({
    data: {
      email: "test@baytak.com",
      passwordHash: "$2b$10$dtP8IEUBv2pNCAal090xieVt77ppFm7bYY7KNTiBLh3PJ1kbWA2xy",
      role: "OWNER",
      propertyId: property.id,
    },
  });

  console.log("USER CREATED:", user.email, user.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });