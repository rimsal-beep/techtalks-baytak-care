import React from "react";
import style from'../../Style/DashboardStyle.module.css'
type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  return (
    <div className={style.Body} >
      <header className={style.header}>
        <img alt="Not found" src={"#"} className={style.log}/>
        <h1 >Baytak Care Dashboard</h1>
      </header>

      <main>
        <small>BEIRUT APARTMENT</small>
        <h2>Requests </h2>
        {children}
      </main>

   
    </div>
  );
}
