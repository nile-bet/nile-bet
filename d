[1mdiff --git a/components/bettor/BetSlipSidebar.tsx b/components/bettor/BetSlipSidebar.tsx[m
[1mindex 14baff8..0c828dd 100644[m
[1m--- a/components/bettor/BetSlipSidebar.tsx[m
[1m+++ b/components/bettor/BetSlipSidebar.tsx[m
[36m@@ -114,7 +114,7 @@[m [mexport function BetSlipSidebar({[m
               s.matchId === updated.id ? { ...s, matchStatus: updated.status } : s[m
             )[m
             useBetSlipStore.setState({ selections: newSelections })[m
[31m-            toast.warning(`⚠️ ${matchName} has started — remove it to place your bet`)[m
[32m+[m[32m            toast.warning(`${matchName} has started — remove it to place your bet`)[m
           }[m
         }[m
       })[m
[36m@@ -395,7 +395,7 @@[m [mexport function BetSlipSidebar({[m
                             : 'text-nile-danger hover:text-nile-danger/80'[m
                         )}[m
                       >[m
[31m-                        ✕[m
[32m+[m[32m                        <X className="w-3.5 h-3.5" />[m
                       </button>[m
                     </div>[m
                   </div>[m
[36m@@ -592,7 +592,7 @@[m [mexport function BetSlipSidebar({[m
                   : 'bg-white/10 text-white/30 cursor-not-allowed'[m
               )}[m
             >[m
[31m-              {generatingCode ? 'Generating...' : slipCode ? '🔄 Regenerate Code' : '🎟️ Place Bet'}[m
[32m+[m[32m              {generatingCode ? 'Generating...' : slipCode ? (<span className="inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Regenerate Code</span>) : (<span className="inline-flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5" /> Place Bet</span>)}[m
             </button>[m
           ) : ([m
             <button[m
[1mdiff --git a/components/bettor/MatchDetailClient.tsx b/components/bettor/MatchDetailClient.tsx[m
[1mindex fc989f6..ef165ce 100644[m
[1m--- a/components/bettor/MatchDetailClient.tsx[m
[1m+++ b/components/bettor/MatchDetailClient.tsx[m
[36m@@ -2,7 +2,7 @@[m
 [m
 import { useState } from 'react'[m
 import { useRouter } from 'next/navigation'[m
[31m-import { ArrowLeft, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'[m
[32m+[m[32mimport { ArrowLeft, AlertTriangle, ChevronUp, ChevronDown, ClipboardList} from 'lucide-react'[m
 import { OddButton } from './OddButton'[m
 import { formatKickOff } from '@/lib/utils/formatCurrency'[m
 import { FlagImage } from '@/components/shared/FlagImage'[m
[36m@@ -262,7 +262,7 @@[m [mexport function MatchDetailClient({ match }: { match: MatchWithMarkets }) {[m
       <div className="flex-1 overflow-y-auto">[m
         {activeMarkets.length === 0 ? ([m
           <div className="flex flex-col items-center justify-center py-20 text-center">[m
[31m-            <span className="text-3xl mb-3">📋</span>[m
[32m+[m[32m            <ClipboardList className="w-8 h-8 mb-3 text-white/30" />[m
             <p className="text-white/30 text-sm">No market list here</p>[m
             <p className="text-white/20 text-xs mt-1">{activeCategory} markets not available for this match</p>[m
           </div>[m
[1mdiff --git a/components/bettor/MatchRow.tsx b/components/bettor/MatchRow.tsx[m
[1mindex ecef2e2..d9a8679 100644[m
[1m--- a/components/bettor/MatchRow.tsx[m
[1m+++ b/components/bettor/MatchRow.tsx[m
[36m@@ -4,7 +4,7 @@[m [mimport { useState, useRef } from 'react'[m
 import { cn } from '@/lib/utils'[m
 import { OddButton } from './OddButton'[m
 import { useBetSlipStore } from '@/lib/stores/betSlipStore'[m
[31m-import { ChevronDown, ChevronUp } from 'lucide-react'[m
[32m+[m[32mimport { ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'[m
 import type { MatchWithMarkets } from '@/types/database.types'[m
 [m
 const CATEGORY_ORDER = [[m
[36m@@ -210,7 +210,7 @@[m [mexport function MatchRow({ match, isEven, basePath = '' }: MatchRowProps) {[m
           {/* ── Markets list or empty state ── */}[m
           {!hasMarkets ? ([m
             <div className="flex flex-col items-center justify-center py-8 text-center px-4">[m
[31m-              <span className="text-3xl mb-2">📋</span>[m
[32m+[m[32m              <ClipboardList className="w-8 h-8 mb-2 text-white/30" />[m
               <p className="text-white/30 text-xs font-semibold">[m
                 No market list here[m
               </p>[m
