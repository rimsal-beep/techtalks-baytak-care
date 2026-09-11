import { prisma } from "./lib/prisma.js";

const property = await prisma.property.create({
  data: {
    address: "Beirut Apartment",
    ownerName: "Test Owner",
    caretakerName: "Test Caretaker",
  },
});

console.log("Created property with ID:", property.id);

await prisma.$disconnect();