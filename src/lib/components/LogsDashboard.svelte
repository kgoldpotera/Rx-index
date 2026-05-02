<script>
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';

  let {
    isOpen,
    onClose
  } = $props();

  let activeTab = $state('feed'); // 'feed', 'defaulters', 'analytics'
  let isLoading = $state(false);

  // Data states
  let activityLogs = $state([]);
  let defaultersList = $state([]);
  let inventoryBurn = $state({});
  let morbidityTrends = $state({});

  // Fetch data whenever the drawer opens or tab changes
  $effect(() => {
    if (isOpen) {
      loadTabData(activeTab);
    }
  });

  async function loadTabData(tab) {
    isLoading = true;
    if (tab === 'feed') await fetchActivityLogs();
    if (tab === 'defaulters') await fetchDefaulters();
    if (tab === 'analytics') await fetchAnalytics();
    isLoading = false;
  }

  // --- TAB 1: ACTIVITY FEED ---
  async function fetchActivityLogs() {
    // Note: This assumes dispense_logs has a foreign key to students. 
    // If not, it will just show the raw log data.
    const { data, error } = await supabase
      .from('dispense_logs')
      .select(`
        *,
        students (first_name, last_name, reg_no)
      `)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (data) activityLogs = data;
  }

  // --- TAB 2: DEFAULTER TRACKING (ADHERENCE ENGINE) ---
  async function fetchDefaulters() {
    const now = new Date().toISOString();
    
    // Find active prescriptions where the due date is in the past
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        students (first_name, last_name, reg_no)
      `)
      .eq('status', 'active')
      .lt('next_dose_due', now)
      .order('next_dose_due', { ascending: true });

    if (data) defaultersList = data;
  }

  // --- TAB 3: ANALYTICS (BURN RATE & MORBIDITY) ---
  async function fetchAnalytics() {
    // 1. Calculate Inventory Burn Rate from recent dispense_logs
    const { data: logs } = await supabase
      .from('dispense_logs')
      .select('drug_name')
      .limit(500); // Look at last 500 actions

    const burn = {};
    if (logs) {
      logs.forEach(log => {
        // Clean up the string to just get the base drug name for grouping
        const baseName = log.drug_name.split('(')[0].trim();
        burn[baseName] = (burn[baseName] || 0) + 1;
      });
    }
    
    // Sort by most used
    inventoryBurn = Object.entries(burn)
      .sort((a, b) => b[1] - a[1])
      .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

    // 2. Calculate Morbidity Trends from prescription 'notes' (Symptoms)
    const { data: prescriptions } = await supabase
      .from('prescriptions')
      .select('notes')
      .limit(200);

    const trends = {};
    if (prescriptions) {
      prescriptions.forEach(rx => {
        if (rx.notes && rx.notes.startsWith('Symptoms:')) {
          const symptomsList = rx.notes.replace('Symptoms:', '').split(',').map(s => s.trim());
          symptomsList.forEach(symptom => {
             if(symptom && symptom !== 'No symptoms logged') {
                trends[symptom] = (trends[symptom] || 0) + 1;
             }
          });
        }
      });
    }
    
    morbidityTrends = Object.entries(trends)
      .sort((a, b) => b[1] - a[1])
      .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});
  }

  // Formatter for timestamps
  function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
  }
</script>

<div class="fixed inset-0 z-40 pointer-events-none flex items-center justify-center" style="visibility: {isOpen ? 'visible' : 'hidden'}">
  <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-500" onclick={onClose} style="opacity: {isOpen ? 1 : 0}"></div>
  
  <div class="relative w-full max-w-5xl h-[85vh] bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col pointer-events-auto transition-all duration-500 ease-out {isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'} overflow-hidden">
    
    <div class="px-8 pt-6 bg-slate-50 border-b border-slate-200 flex flex-col gap-6 shrink-0">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="font-display font-bold text-2xl text-slate-900 tracking-tight">System Logs & Analytics</h2>
          <p class="text-sm text-slate-500 font-medium mt-1">Sanatorium Command Center</p>
        </div>
        <button onclick={onClose} class="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <div class="flex gap-8 relative">
        <button onclick={() => activeTab = 'feed'} class="pb-3 text-sm font-bold tracking-wide transition-colors {activeTab === 'feed' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}">Activity Feed</button>
        <button onclick={() => activeTab = 'defaulters'} class="pb-3 text-sm font-bold tracking-wide transition-colors {activeTab === 'defaulters' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'} flex items-center gap-2">
          Action Required
          {#if defaultersList.length > 0 && !isLoading}
            <span class="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] animate-pulse">{defaultersList.length}</span>
          {/if}
        </button>
        <button onclick={() => activeTab = 'analytics'} class="pb-3 text-sm font-bold tracking-wide transition-colors {activeTab === 'analytics' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}">Inventory & Morbidity</button>
        
        <div class="absolute bottom-0 h-0.5 bg-emerald-500 transition-all duration-300 rounded-t-md" 
             style="width: 80px; transform: translateX({activeTab === 'feed' ? '0px' : activeTab === 'defaulters' ? '112px' : '265px'}); {activeTab === 'defaulters' ? 'background-color: #ef4444;' : ''}">
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-8 bg-[#FAFAFA]">
      
      {#if isLoading}
        <div class="h-full w-full flex flex-col items-center justify-center gap-4 text-slate-400">
          <svg class="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p class="text-sm font-bold uppercase tracking-widest">Querying Database...</p>
        </div>

      {:else if activeTab === 'feed'}
        <div class="max-w-3xl mx-auto flex flex-col gap-4">
          {#if activityLogs.length === 0}
            <p class="text-center text-slate-400 font-medium py-10">No recent activity found.</p>
          {/if}
          
          {#each activityLogs as log}
            <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start gap-4 hover:border-slate-300 transition-colors">
              <div class="mt-1 w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0">
                <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <div class="flex-1">
                <div class="flex justify-between items-start">
                  <p class="text-sm font-semibold text-slate-900">
                    <span class="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 font-bold mr-2 uppercase tracking-wider">{log.action || 'Dispensed'}</span>
                    {log.drug_name}
                  </p>
                  <span class="text-xs font-medium text-slate-400 shrink-0">{formatTime(log.created_at)}</span>
                </div>
                {#if log.students}
                  <p class="text-sm text-slate-600 mt-1.5 font-medium">To: <span class="font-bold text-slate-800">{log.students.first_name} {log.students.last_name}</span> ({log.students.reg_no})</p>
                {/if}
                {#if log.notes}
                  <p class="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-md border border-slate-100">{log.notes}</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>

      {:else if activeTab === 'defaulters'}
        <div class="max-w-4xl mx-auto">
          <div class="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 flex items-start gap-3">
             <svg class="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
             <div>
                <h4 class="text-sm font-bold text-red-900">Medication Adherence Engine</h4>
                <p class="text-sm text-red-700 font-medium mt-1">The following students have missed their scheduled medication windows and require immediate follow-up to prevent treatment failure.</p>
             </div>
          </div>

          {#if defaultersList.length === 0}
            <div class="bg-white border border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
               <div class="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                  <svg class="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
               </div>
               <h3 class="text-lg font-bold text-slate-900">All Clear</h3>
               <p class="text-sm text-slate-500 font-medium mt-1">100% medication adherence right now. No defaulters found.</p>
            </div>
          {/if}

          <div class="grid grid-cols-2 gap-4">
            {#each defaultersList as rx}
              <div class="bg-white border-l-4 border-l-red-500 border-y border-r border-slate-200 rounded-r-xl p-5 shadow-sm">
                <div class="flex justify-between items-start mb-3">
                   {#if rx.students}
                     <p class="font-bold text-slate-900">{rx.students.first_name} {rx.students.last_name}</p>
                   {:else}
                     <p class="font-bold text-slate-900">Unknown Student</p>
                   {/if}
                   <span class="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-100 px-2 py-1 rounded animate-pulse">Overdue</span>
                </div>
                <p class="text-sm font-semibold text-slate-700">{rx.drug_name}</p>
                <p class="text-xs text-slate-500 font-medium mt-1 bg-slate-50 inline-block px-2 py-1 rounded">{rx.dosage}</p>
                
                <div class="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                   <p class="text-xs font-bold text-slate-400">Due: {formatTime(rx.next_dose_due)}</p>
                   {#if rx.students}
                     <button class="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest transition-colors">Find Profile →</button>
                   {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>

      {:else if activeTab === 'analytics'}
        <div class="grid grid-cols-2 gap-8 max-w-5xl mx-auto">
           
           <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div class="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                 <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                 </div>
                 <h3 class="font-display font-bold text-lg text-slate-900">Inventory Burn Rate</h3>
              </div>
              <div class="p-6 flex-1 overflow-y-auto">
                 <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Dispensing Volume (Recent)</p>
                 <div class="flex flex-col gap-3">
                    {#each Object.entries(inventoryBurn) as [drug, count]}
                       <div class="flex items-center justify-between">
                          <span class="text-sm font-semibold text-slate-700 truncate pr-4">{drug}</span>
                          <span class="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full">{count} units</span>
                       </div>
                       <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                          <div class="h-full bg-blue-400 rounded-full" style="width: {Math.min((count / 50) * 100, 100)}%;"></div>
                       </div>
                    {/each}
                    {#if Object.keys(inventoryBurn).length === 0}
                       <p class="text-sm text-slate-500 font-medium">Not enough data to calculate burn rate.</p>
                    {/if}
                 </div>
              </div>
           </div>

           <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div class="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                 <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                 </div>
                 <h3 class="font-display font-bold text-lg text-slate-900">Morbidity Trends</h3>
              </div>
              <div class="p-6 flex-1 overflow-y-auto">
                 <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Symptom Frequency</p>
                 <div class="flex flex-wrap gap-2">
                    {#each Object.entries(morbidityTrends) as [symptom, count]}
                       <div class="px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center gap-3">
                          <span class="text-sm font-bold text-slate-700">{symptom}</span>
                          <span class="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{count} cases</span>
                       </div>
                    {/each}
                    {#if Object.keys(morbidityTrends).length === 0}
                       <p class="text-sm text-slate-500 font-medium">Not enough symptom data logged yet.</p>
                    {/if}
                 </div>
              </div>
           </div>

        </div>
      {/if}
    </div>
  </div>
</div>