import type { StaticImageData } from "next/image";

enum Status {
  Total = "Total",
  Pending = "Pending",
  Completed = "Completed",
  InProgress = "In Progress",
  Rejected = "Rejected",
}

interface SummeryData {
  summerynumber: number;
  status: Status;
}
interface ItemData {
  img: StaticImageData;
  Title:string;
  Date:string;
  cost:number;
  status:Status;
}
interface MaintenanceRequest {
  id: string;
  title: string;
  description?: string;
  requestType: string;
  photoUrl?: string;
  estimatedCost?: number;
  status: "PENDING" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  propertyId: string;
  createdAt: string;
  updatedAt: string;
}

interface Cookie{
  propertyId:string;
}
export { Status };
export type { SummeryData,ItemData,MaintenanceRequest,Cookie };
