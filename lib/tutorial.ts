export const TUTORIAL_VERSION = 3;

export type TutorialStatus = "in_progress" | "completed" | "skipped" | "paused";
export type TutorialProgress = { status: TutorialStatus; currentStep: number; completedAt: string | null; version: number };
export type TutorialStep = {
  id: string; route: string; target: string | null; title: string; text: string;
  action: "next" | "navigate" | "finish"; expectedRoute?: string; instruction?: string; fallback: string;
};

export function getTutorialFeatureRoute(stepId:string):keyof typeof import("@/lib/theme-navigation").CANONICAL_FEATURES|null {
  if(stepId.includes("stats"))return "/stats"; if(stepId.includes("tasks")||stepId==="negative-actions")return "/tasks";
  if(stepId.includes("quests"))return "/quests"; if(stepId.includes("boss"))return "/bosses";
  if(stepId.includes("reviews"))return "/reviews"; if(stepId.includes("analytics"))return "/analytics";
  if(stepId.includes("settings"))return "/settings"; if(stepId==="return-home"||stepId==="welcome"||stepId==="complete")return "/";
  return null;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { id:"welcome",route:"/",target:"dashboard",title:"Welcome to your Awaken system",text:"Your dashboard combines overall level, growth path, quick actions, quests, and the weekly challenge.",action:"next",fallback:"Continue with the dashboard overview." },
  { id:"open-stats",route:"/",target:"nav-stats",title:"Open Stats",text:"Use the real navigation to explore Awaken.",instruction:"Click Stats in the navigation.",action:"navigate",expectedRoute:"/stats",fallback:"Stats is unavailable; use Next to continue." },
  { id:"stats",route:"/stats",target:"stats-growth",title:"Five stats, one evolving character",text:"Strength, Intelligence, Vitality, Wealth, and Charisma level independently. Their combined XP determines overall level and rank.",action:"next",fallback:"The stat cards are unavailable; continue to learn the XP rules." },
  { id:"open-tasks",route:"/stats",target:"nav-tasks",title:"Open Tasks",text:"Tasks connect real-world actions to progression.",instruction:"Click Tasks in the navigation.",action:"navigate",expectedRoute:"/tasks",fallback:"Tasks is unavailable; use Next to continue." },
  { id:"tasks",route:"/tasks",target:"positive-tasks",title:"Positive habits and XP previews",text:"Every positive habit shows its linked stat and expected XP before logging. A completion can also advance quests and damage the weekly boss.",action:"next",fallback:"The positive-task panel is unavailable; continue with its XP explanation." },
  { id:"negative-actions",route:"/tasks",target:"negative-actions",title:"Negative actions and penalties",text:"Negative actions show their penalty before logging. Recording one can reduce its linked stat and heal the weekly boss, giving you honest feedback about patterns.",action:"next",fallback:"The negative-action panel is unavailable; continue with the penalty explanation." },
  { id:"open-quests",route:"/tasks",target:"nav-quests",title:"Open Quests",text:"Quests turn your selected habits into focused daily objectives.",instruction:"Click Quests in the navigation.",action:"navigate",expectedRoute:"/quests",fallback:"Quests is unavailable; use Next to continue." },
  { id:"quests",route:"/quests",target:"quests-board",title:"Quest objectives and rewards",text:"Quests are generated from your arc, priorities, weak stats, and habits. Linked task activity completes requirements and unlocks the displayed rewards.",action:"next",fallback:"No quest board is available today; continue with the explanation." },
  { id:"open-bosses",route:"/quests",target:"nav-bosses",title:"Open Bosses",text:"Your weekly boss turns consistency into a longer challenge.",instruction:"Click Bosses in the navigation.",action:"navigate",expectedRoute:"/bosses",fallback:"Bosses is unavailable; use Next to continue." },
  { id:"boss",route:"/bosses",target:"boss-panel",title:"Damage, healing, and boss rewards",text:"Aligned positive tasks damage the boss. Negative patterns can heal it. Defeat it before the week ends to unlock its rewards.",action:"next",fallback:"The weekly boss is unavailable; continue with the combat explanation." },
  { id:"open-reviews",route:"/bosses",target:"nav-reviews",title:"Open Reviews",text:"Reflection turns activity into a better plan.",instruction:"Click Reviews in the navigation.",action:"navigate",expectedRoute:"/reviews",fallback:"Reviews is unavailable; use Next to continue." },
  { id:"reviews",route:"/reviews",target:"reviews-overview",title:"Review what actually happened",text:"Daily reviews capture wins, setbacks, energy, mood, and tomorrow's focus. Weekly reflection helps you change strategy instead of repeating patterns.",action:"next",fallback:"Review panels are unavailable; continue with the reflection overview." },
  { id:"open-analytics",route:"/reviews",target:"nav-analytics",title:"Open Analytics",text:"Analytics reveals patterns across your activity.",instruction:"Click Analytics in the navigation.",action:"navigate",expectedRoute:"/analytics",fallback:"Analytics is unavailable; use Next to continue." },
  { id:"analytics",route:"/analytics",target:"analytics-overview",title:"Turn progress into insight",text:"Compare XP, quest clears, boss performance, and reviews to learn what is helping—not merely what you intended.",action:"next",fallback:"Analytics panels are unavailable; continue with the insight overview." },
  { id:"open-settings",route:"/analytics",target:"nav-settings",title:"Open Settings",text:"Your system should evolve with you.",instruction:"Click Settings in the navigation.",action:"navigate",expectedRoute:"/settings",fallback:"Settings is unavailable; use Next to continue." },
  { id:"settings",route:"/settings",target:"settings-profile",title:"Adjust Awaken without losing progress",text:"Change ideal build, main arc, priorities, difficulty, schedule, theme, reminders, backups, and account options here. You can also restart this tutorial.",action:"next",fallback:"The profile settings are unavailable; continue to the summary." },
  { id:"return-home",route:"/settings",target:"nav-home",title:"Return to the dashboard",text:"Bring the complete loop back to your daily command center.",instruction:"Click Home in the navigation.",action:"navigate",expectedRoute:"/",fallback:"Home is unavailable; use Next to finish." },
  { id:"complete",route:"/",target:"dashboard",title:"The Awaken loop",text:"Choose tasks → earn XP → improve stats → complete quests → fight bosses → review progress → adjust your system.",action:"finish",fallback:"You are ready to use Awaken." }
] as const;

export function initialTutorialProgress(): TutorialProgress { return {status:"in_progress",currentStep:0,completedAt:null,version:TUTORIAL_VERSION}; }
export function shouldAutoStartTutorial(progress: TutorialProgress|null|undefined) { return Boolean(progress&&progress.version===TUTORIAL_VERSION&&progress.status==="in_progress"); }
export function moveTutorial(progress: TutorialProgress,direction:"next"|"back") { const d=direction==="next"?1:-1; return {...progress,currentStep:Math.max(0,Math.min(TUTORIAL_STEPS.length-1,progress.currentStep+d))}; }
export function finishTutorial(progress:TutorialProgress,status:"completed"|"skipped"|"paused",now=new Date().toISOString()):TutorialProgress { return {...progress,status,currentStep:status==="completed"?TUTORIAL_STEPS.length-1:progress.currentStep,completedAt:status==="paused"?null:now}; }

export function findVisibleTutorialTarget(target:string|null,root:ParentNode=document):HTMLElement|null {
  if(!target)return null;
  const candidates=[...root.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)];
  const headingNames:Record<string,string>={"settings-profile":"Your growth path","settings-notifications":"Notifications","settings-account":"Account"};
  if(!candidates.length&&headingNames[target]){const heading=[...root.querySelectorAll<HTMLElement>("h2")].find(el=>el.textContent?.trim()===headingNames[target]);if(heading?.parentElement)candidates.push(heading.parentElement)}
  return candidates.find(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0})??null;
}

export type Box={left:number;top:number;width:number;height:number};
export function placeTutorialCard(target:Box,card:{width:number;height:number},viewport:{width:number;height:number;leftInset?:number;topInset?:number;rightInset?:number;bottomInset?:number},gap=16):{left:number;top:number;side:"top"|"bottom"|"left"|"right"}{
  const margin=12; const minLeft=Math.max(margin,viewport.leftInset??margin); const minTop=Math.max(margin,viewport.topInset??margin); const maxRight=viewport.width-Math.max(margin,viewport.rightInset??margin); const maxBottom=viewport.height-Math.max(margin,viewport.bottomInset??margin); const candidates=[
    {side:"right" as const,left:target.left+target.width+gap,top:target.top+(target.height-card.height)/2},
    {side:"left" as const,left:target.left-card.width-gap,top:target.top+(target.height-card.height)/2},
    {side:"bottom" as const,left:target.left+(target.width-card.width)/2,top:target.top+target.height+gap},
    {side:"top" as const,left:target.left+(target.width-card.width)/2,top:target.top-card.height-gap}
  ];
  const fits=(p:{left:number;top:number})=>p.left>=minLeft&&p.top>=minTop&&p.left+card.width<=maxRight&&p.top+card.height<=maxBottom;
  const picked=candidates.find(fits)??candidates.reduce((best,p)=>{const visible=Math.max(0,Math.min(p.left+card.width,maxRight)-Math.max(p.left,minLeft))*Math.max(0,Math.min(p.top+card.height,maxBottom)-Math.max(p.top,minTop));return visible>best.visible?{p,visible}:best},{p:candidates[2],visible:-1}).p;
  return {...picked,left:Math.max(minLeft,Math.min(picked.left,maxRight-card.width)),top:Math.max(minTop,Math.min(picked.top,maxBottom-card.height))};
}
