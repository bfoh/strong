'use client';
import {useEffect,useRef} from 'react';
import {useMarketing} from './MarketingProvider';
export default function PropertyView({id,category,region}:{id:string;category:string;region:string}) {
 const {track,analyticsReady}=useMarketing(),sent=useRef('');
 useEffect(()=>{if(!analyticsReady||sent.current===id)return;sent.current=id;track('property_view',{property_id:id,category,region});},[analyticsReady,id,category,region,track]);
 return null;
}
