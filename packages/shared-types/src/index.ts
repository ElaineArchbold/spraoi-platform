export type ModuleName = 'coach'|'journey'|'challenge'|'blitz'|'connect'|'club';
export type ActivitySource = 'coaching_plan'|'manual'|'challenge_library';
export interface JourneyActivity { id:string; teamId:string; playerId?:string; source:ActivitySource; sourceId?:string; title:string; instructions:string; xp:number; isOptional:boolean; isVisible:boolean; startsAt:string; dueAt?:string; }
