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

export { Status };
export type { SummeryData,ItemData };
