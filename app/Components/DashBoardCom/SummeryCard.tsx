import { SummeryData } from "@/app/Types/DashboardTypes";








function SummeryCard(Props: SummeryData) {
  return (<>
  <div>
    <h3>{Props.summerynumber}</h3>
    <small>{Props.status}</small>
  </div>
  </>
    
  );
}

export { SummeryCard };


