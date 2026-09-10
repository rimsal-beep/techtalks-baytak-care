import { ItemData } from "@/app/Types/DashboardTypes";



function DisplayItemData(Props:ItemData){
    return(<>
    
    <div>
        <img alt="Not found" src={Props.img}/>
        <div>
            <p>{Props.Title}</p>
            <small>{Props.Date+":"+Props.cost}</small>
        </div>
        <p>{Props.status}</p>
    </div>
    </>);


}
export {DisplayItemData}
