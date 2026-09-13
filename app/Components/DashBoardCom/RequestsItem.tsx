import drainPipeLeak from "../../Images/Drain Pipe Leak.png";
import generatorNotStarting from "../../Images/generator not starting.png";
import lightBulb from "../../Images/Light bulb.png";
import waterHeater from "../../Images/water heater.png";
import { MaintenanceRequest } from "@/app/Types/DashboardTypes";


function DisplayItemData({ request }: { request: MaintenanceRequest }){
    const image = request.photoUrl || request.requestType === "Maintenance"
        ? waterHeater
        : request.title.toLowerCase().includes("light")
          ? lightBulb
          : request.title.toLowerCase().includes("generator")
            ? generatorNotStarting
            : drainPipeLeak;
    const status = request.status.replace("_", " ");
    const date = new Date(request.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    return(<>
    
    <div>
        <img alt={request.title} src={typeof image === "string" ? image : image.src}/>
        <div>
            <p>{request.title}</p>
            <small>{date}:{request.estimatedCost ?? 0}</small>
        </div>
        <p>{status}</p>
    </div>
    </>);


}
export {DisplayItemData}
