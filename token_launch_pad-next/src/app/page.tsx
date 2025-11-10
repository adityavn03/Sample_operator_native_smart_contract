'use client'
import dynamic from "next/dynamic"


const Tokenlaunchpad=dynamic(()=>import("./wallethandling/page"),{ssr:false});
export default function Home(){
  return(
    <div>
      <Tokenlaunchpad/>
    </div>
  )
}