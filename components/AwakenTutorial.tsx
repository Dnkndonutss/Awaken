"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { findVisibleTutorialTarget, getTutorialFeatureRoute, placeTutorialCard, shouldAutoStartTutorial, TUTORIAL_STEPS, type Box, type TutorialProgress } from "@/lib/tutorial";
import { useAwakenState } from "@/hooks/use-awaken-state";
import { getThemeFeaturePair } from "@/lib/theme-navigation";

type CardPosition={left:number;top:number;side:"top"|"bottom"|"left"|"right"};

export function AwakenTutorial(){
  const pathname=usePathname(); const router=useRouter(); const cardRef=useRef<HTMLElement>(null); const transitionRef=useRef(false);
  const awaken=useAwakenState();
  const [progress,setProgress]=useState<TutorialProgress|null>(null); const [loaded,setLoaded]=useState(false); const [ready,setReady]=useState(false); const [missing,setMissing]=useState(false); const [targetBox,setTargetBox]=useState<Box|null>(null); const [cardPosition,setCardPosition]=useState<CardPosition|null>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const step=progress?TUTORIAL_STEPS[progress.currentStep]:null;

  useEffect(()=>{void fetch("/api/tutorial").then(async r=>{const b=await r.json();if(r.ok)setProgress(b.tutorial??null)}).finally(()=>setLoaded(true))},[]);

  const recalculate=useCallback(()=>{
    const target=findVisibleTutorialTarget(step?.target??null); const card=cardRef.current;
    if(!target||!card)return;
    const rect=target.getBoundingClientRect(); const box={left:rect.left,top:rect.top,width:rect.width,height:rect.height};
    const cardRect=card.getBoundingClientRect();
    const sidebar=document.querySelector<HTMLElement>(".app-sidebar"); const sidebarRect=sidebar?.getBoundingClientRect();
    const topbar=document.querySelector<HTMLElement>(".app-topbar"); const topbarRect=topbar?.getBoundingClientRect();
    const leftInset=sidebarRect&&sidebarRect.width>0?sidebarRect.right+12:12; const topInset=topbarRect&&topbarRect.height>0?topbarRect.bottom+12:12;
    setTargetBox(box); setCardPosition(placeTutorialCard(box,{width:cardRect.width,height:cardRect.height},{width:window.innerWidth,height:window.innerHeight,leftInset,topInset,rightInset:20,bottomInset:20}));
  },[step?.target]);

  useEffect(()=>{
    if(!step||!shouldAutoStartTutorial(progress))return;
    let dispose=()=>{};
    const frame=window.requestAnimationFrame(()=>{
      setReady(false);setMissing(false);setTargetBox(null);setCardPosition(null);
      if(pathname!==step.route){setMissing(true);setReady(true);return;}
      if(progress?.currentStep===0)window.scrollTo({top:0,behavior:"auto"});
      const target=findVisibleTutorialTarget(step.target);
      if(!target){setMissing(Boolean(step.target));setReady(true);return;}
      const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const observer=new IntersectionObserver((entries)=>{if(entries.some(entry=>entry.isIntersecting)){recalculate();setReady(true);observer.disconnect();}},{threshold:0.55});
      observer.observe(target);target.scrollIntoView({behavior:reduced?"auto":"smooth",block:progress?.currentStep===0?"start":"center",inline:"nearest"});
      const resize=new ResizeObserver(recalculate);resize.observe(target);if(cardRef.current)resize.observe(cardRef.current);
      window.addEventListener("resize",recalculate);window.addEventListener("scroll",recalculate,true);
      dispose=()=>{observer.disconnect();resize.disconnect();window.removeEventListener("resize",recalculate);window.removeEventListener("scroll",recalculate,true)};
    });
    return()=>{window.cancelAnimationFrame(frame);dispose()};
  },[pathname,progress,recalculate,step]);

  useEffect(()=>{
    if(!step||step.action!=="navigate"||pathname!==step.expectedRoute||transitionRef.current)return;
    const next=TUTORIAL_STEPS[(progress?.currentStep??0)+1]; if(!next)return;
    const confirm=()=>{const target=findVisibleTutorialTarget(next.target);if(!target)return false;transitionRef.current=true;void save("next",false).finally(()=>transitionRef.current=false);return true};
    if(confirm())return;
    const observer=new MutationObserver(()=>{if(confirm())observer.disconnect()}); observer.observe(document.body,{childList:true,subtree:true}); return()=>observer.disconnect();
  // save is intentionally driven only after the destination target exists.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pathname,step?.id]);

  async function save(action:"next"|"back"|"skip"|"exit"|"finish",navigateBack=true){
    if(!progress||busy)return; setBusy(true);setError("");
    try{const response=await fetch("/api/tutorial",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,operationId:crypto.randomUUID()})});const body=await response.json();if(!response.ok)throw new Error(body.error??"Tutorial progress could not be saved.");const next=body.tutorial as TutorialProgress;setProgress(next);if(action==="back"&&navigateBack)router.push(TUTORIAL_STEPS[next.currentStep].route);if(next.status!=="in_progress")window.location.assign("/");}
    catch(value){setError(value instanceof Error?value.message:"Tutorial progress could not be saved.");}finally{setBusy(false)}
  }

  if(!loaded||!progress||!shouldAutoStartTutorial(progress)||!step)return null;
  const explanatory=step.action==="next"; const last=step.action==="finish"; const allowFallback=missing||pathname!==step.route;
  const featureRoute=getTutorialFeatureRoute(step.id); const feature=featureRoute?getThemeFeaturePair(awaken.profile.arcThemeId,featureRoute):null;
  const title=feature&&step.action==="navigate"?`Open ${feature.display}`:feature&&feature.themed!==feature.canonical?`${feature.display}: ${step.title}`:step.title;
  const instruction=feature&&step.action==="navigate"?`Click ${feature.themed} in the navigation. ${feature.themed} is this theme's name for ${feature.canonical}.`:step.instruction;
  return <div className="pointer-events-none fixed inset-0 z-50" aria-live="polite">
    <div className="pointer-events-none absolute inset-0 bg-slate-950/60"/>
    {targetBox&&ready&&<div aria-hidden="true" className="pointer-events-none fixed rounded-xl border-2 border-cyan-300 shadow-[0_0_0_9999px_rgba(2,6,23,.42),0_0_32px_rgba(103,232,249,.55)]" style={{left:targetBox.left-6,top:targetBox.top-6,width:targetBox.width+12,height:targetBox.height+12}}/>}
    <section ref={cardRef} role="dialog" aria-modal="false" aria-labelledby="tutorial-title" className={`pointer-events-auto fixed w-[min(24rem,calc(100vw-24px))] max-h-[min(32rem,calc(100vh-24px))] overflow-y-auto rounded-2xl border border-cyan-300/30 bg-[#0c111d] p-5 text-slate-100 shadow-2xl transition-opacity ${ready?"opacity-100":"opacity-0"}`} style={cardPosition??{left:12,top:12}}>
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-cyan-200"><span>Guided tour</span><span>{progress.currentStep+1} / {TUTORIAL_STEPS.length}</span></div>
      <div className="my-3 h-1.5 overflow-hidden rounded bg-white/10"><div className="h-full bg-cyan-300" style={{width:`${((progress.currentStep+1)/TUTORIAL_STEPS.length)*100}%`}}/></div>
      <h2 id="tutorial-title" className="text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{step.text}</p>
      {feature&&feature.themed!==feature.canonical&&step.action!=="navigate"&&<p className="mt-3 rounded-lg border border-violet-300/20 bg-violet-300/10 p-3 text-sm text-violet-100"><strong>{feature.themed}</strong> is the {awaken.profile.arcThemeId.replace("_"," ")} theme&apos;s name for <strong>{feature.canonical}</strong>. They are the same feature.</p>}
      {instruction&&<p className="mt-4 rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3 font-semibold text-cyan-100">{instruction}</p>}
      {step.action==="navigate"&&!allowFallback&&<p className="mt-3 text-xs text-slate-400">Waiting for you to use the highlighted control…</p>}
      {allowFallback&&<p className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-slate-400">{step.fallback}</p>}
      {error&&<p role="alert" className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2"><div className="flex gap-3 text-xs"><button className="underline text-slate-400" disabled={busy} onClick={()=>void save("skip")}>Skip tutorial</button><button className="underline text-slate-400" disabled={busy} onClick={()=>void save("exit")}>Exit</button></div><div className="flex gap-2"><button disabled={busy||progress.currentStep===0} className="rounded border border-white/20 px-3 py-2 disabled:opacity-30" onClick={()=>void save("back")}>Back</button>{(explanatory||last||allowFallback)&&<button disabled={busy} className="rounded bg-cyan-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" onClick={()=>void save(last?"finish":"next")}>{last?"Finish":allowFallback&&step.action==="navigate"?"Continue":"Next"}</button>}</div></div>
    </section>
  </div>
}
