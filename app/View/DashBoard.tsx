import DashboardLayout from'../Components/DashBoardCom/DashBoardLayout'
import { DisplayItemData } from '../Components/DashBoardCom/RequestsItem';
import { SummeryCard } from '../Components/DashBoardCom/SummeryCard';
import { Status } from '../Types/DashboardTypes';
import{ItemData} from '../Types/DashboardTypes';
import drainPipeLeak from "../Images/Drain Pipe Leak.png";
import generatorNotStarting from "../Images/generator not starting.png";
import lightBulb from "../Images/Light bulb.png";
import waterHeater from "../Images/water heater.png";
function Dashboard(){
    const fakeItems: ItemData[] = [
  {
    img: drainPipeLeak,
    Title: "Bathroom water leak",
    Date: "Sep 2, 2026",
    cost: 180,
    status: Status.Pending,
  },
  {
    img: generatorNotStarting,
    Title: "Generator not starting",
    Date: "Aug 15, 2026",
    cost: 130,
    status: Status.InProgress,
  },
  {
    img: lightBulb,
    Title: "Kitchen light fixture",
    Date: "Aug 20, 2026",
    cost: 45,
    status: Status.Completed,
  },
  {
    img: waterHeater,
    Title: "Water heater replacement",
    Date: "Aug 10, 2026",
    cost: 320,
    status: Status.Rejected,
  },
];
  
   
   return(<>
    
    <DashboardLayout><>
        <div>
        <SummeryCard status={Status.Total} summerynumber={4}/>
        <SummeryCard status={Status.Pending} summerynumber={1}/>
        <SummeryCard status={Status.Completed} summerynumber={4}/>
        </div>
       
       <div>
        {fakeItems.map((item,i)=>(
            <DisplayItemData key={i} {...item}/>
        ))}
       </div>
        
        </>
    </DashboardLayout>
    </>);



}






export {Dashboard}