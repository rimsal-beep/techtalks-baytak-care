"use client";

import { useState, useEffect } from "react";
import DashboardLayout from'../Components/DashBoardCom/DashBoardLayout'
import { DisplayItemData } from '../Components/DashBoardCom/RequestsItem';
import { SummeryCard } from '../Components/DashBoardCom/SummeryCard';
import { Status } from '../Types/DashboardTypes';
import { MaintenanceRequest } from '../Types/DashboardTypes';
import { cookies } from "next/headers";
function Dashboard(){
  const propertyId = getpropertyId();
  const [items, setItems] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      if (!propertyId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/properties/${propertyId}/requests`);
        const json = await res.json();
        if (res.ok && json.success) {
          setItems(json.data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, [propertyId]);

  if (loading) return <p>Loading...</p>;


   return(<>
    
    <DashboardLayout><>
        <div>
        <SummeryCard status={Status.Total} summerynumber={items.length}/>
        <SummeryCard status={Status.Pending} summerynumber={items.filter((item) => item.status === "PENDING").length}/>
        <SummeryCard status={Status.Completed} summerynumber={items.filter((item) => item.status === "COMPLETED").length}/>
        </div>
       
       <div>
        {items.map((request) => (
            <DisplayItemData key={request.id} request={request}/>
        ))}
       </div>
        
        </>
    </DashboardLayout>
    </>);



}

async function getpropertyId(){

  const cookieStore = cookies();
  const propertyId = (await cookieStore).get("propertyId")?.value;
  return propertyId;
}





export {Dashboard}