<script>
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import DotParticleCanvas from '$lib/components/DotParticleCanvas.svelte';
  import { supabase } from '$lib/supabaseClient'; 
  import ConsultationDrawer from '$lib/components/ConsultationDrawer.svelte';
  import LogsDashboard from '$lib/components/LogsDashboard.svelte'; 
  import InventoryDashboard from '$lib/components/InventoryDashboard.svelte';
  import Logo from '$lib/components/Logo.svelte';
  import { fade } from 'svelte/transition';

  let containerRef;
  let headerRef;
  let centerHeroRef;
  let searchContainerRef;
  let dockRef;
  let profileRef;
  let regDrawerBackdropRef; 
  
  let searchQuery = $state('');
  let isProfileVisible = $state(false);
  let isSearching = $state(false); 
  
  // View States
  let isDrawerOpen = $state(false); 
  let isLogsOpen = $state(false); 
  let isInventoryOpen = $state(false);
  
  let isNotFound = $state(false);
  let isRegistrationDrawerOpen = $state(false);
  let isSavingProfile = $state(false); 
  let isDispensingMeds = $state(false);
  
  let regFormRegNo = $state('');
  let regFormFirstName = $state('');
  let regFormLastName = $state('');
  let regFormAllergies = $state(''); 
  
  let studentData = $state(null);
  let currentWorkflowState = $state('clear'); 

  onMount(() => {
    const ctx = gsap.context(() => {
      gsap.set([headerRef, dockRef], { opacity: 0 });
      gsap.set(centerHeroRef, { y: 20, opacity: 0 });
      gsap.set(searchContainerRef, { y: 20, opacity: 0 });
      gsap.set(profileRef, { autoAlpha: 0, y: 40 });
      gsap.set(regDrawerBackdropRef, { autoAlpha: 0 });
      gsap.set('#registration-panel', { x: '100%' });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.to(headerRef, { opacity: 1, duration: 0.8 }, 0)
        .to(centerHeroRef, { y: 0, opacity: 1, duration: 0.8 }, 0.2)
        .to(searchContainerRef, { y: 0, opacity: 1, duration: 0.8 }, 0.3)
        .to(dockRef, { opacity: 1, duration: 0.8 }, 0.5);
    }, containerRef);

    return () => ctx.revert();
  });

  // --- VIEW MANAGER FUNCTIONS ---
  function openSearch() {
    isLogsOpen = false;
    isInventoryOpen = false;
  }

  function openLogs() {
    isLogsOpen = true;
    isInventoryOpen = false;
  }

  function openInventory() {
    isInventoryOpen = true;
    isLogsOpen = false;
  }

  function clearDashboard() {
    searchQuery = '';
    isProfileVisible = false;
    isNotFound = false;
    studentData = null;
    currentWorkflowState = 'clear';

    gsap.to(profileRef, { autoAlpha: 0, y: 40, duration: 0.4, ease: 'power3.in' });
    gsap.to(searchContainerRef, { y: 0, duration: 0.8, ease: 'power4.out' });
    gsap.to(centerHeroRef, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power4.out', delay: 0.2 });
  }

  async function handleInput() {
    if (searchQuery.length < 3) {
      if (isProfileVisible) clearDashboard();
      return; 
    }

    if (supabase) {
      isSearching = true;
      
      let trimmedQuery = searchQuery.trim();
      let orQueryString = `reg_no.ilike.%${trimmedQuery}%,first_name.ilike.%${trimmedQuery}%,last_name.ilike.%${trimmedQuery}%`;

      if (trimmedQuery.includes(' ')) {
        const nameParts = trimmedQuery.split(/\s+/);
        const part1 = nameParts[0];
        const part2 = nameParts.slice(1).join(' ');

        orQueryString += `,and(first_name.ilike.%${part1}%,last_name.ilike.%${part2}%)`;
        orQueryString += `,and(first_name.ilike.%${part2}%,last_name.ilike.%${part1}%)`;
      }

      const { data, error } = await supabase
        .from('students')
        .select(`*, prescriptions (*)`)
        .or(orQueryString)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (searchQuery.length < 3) {
        isSearching = false;
        return; 
      }

      if (data) {
        data.prescriptions = data.prescriptions ? data.prescriptions.filter(p => p.status === 'active') : [];
        studentData = data;
        isNotFound = false;
        determineWorkflowState(studentData.prescriptions);
      } else {
        studentData = null;
        isNotFound = true;
      }
      
      if (!isProfileVisible) {
        isProfileVisible = true;
        gsap.to(centerHeroRef, { autoAlpha: 0, y: -40, duration: 0.4, ease: 'power2.inOut' });
        gsap.to(searchContainerRef, { y: -160, duration: 0.8, ease: 'power4.out' });
        gsap.to(profileRef, { autoAlpha: 1, y: -140, duration: 0.8, ease: 'power4.out', delay: 0.1 });
      }
      isSearching = false;
    }
  }

  function determineWorkflowState(prescriptions) {
    if (!prescriptions || prescriptions.length === 0) {
      currentWorkflowState = 'clear';
      return;
    }

    const now = new Date();
    const isDefaulter = prescriptions.some(rx => {
       const dueDate = new Date(rx.next_dose_due);
       return (now - dueDate > 2 * 60 * 60 * 1000); 
    });

    const isDue = prescriptions.some(rx => {
       const dueDate = new Date(rx.next_dose_due);
       return (now >= dueDate || (dueDate - now < 1 * 60 * 60 * 1000)); 
    });

    if (isDefaulter) {
      currentWorkflowState = 'defaulter';
    } else if (isDue) {
      currentWorkflowState = 'dose-due';
    } else {
      currentWorkflowState = 'waiting'; 
    }
  }

  async function dispenseAllDueMeds() {
     if (!studentData || !studentData.prescriptions || studentData.prescriptions.length === 0) return;
     
     isDispensingMeds = true;

     const logsToInsert = studentData.prescriptions.map(rx => ({
        student_id: studentData.id,
        drug_name: rx.drug_name,
        action: 'Dispensed',
        notes: `Dosage: ${rx.dosage}`
     }));

     const nextDueTime = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
     
     const updates = studentData.prescriptions.map(rx => {
        return supabase
          .from('prescriptions')
          .update({ next_dose_due: nextDueTime })
          .eq('id', rx.id);
     });

     try {
        await supabase.from('dispense_logs').insert(logsToInsert);
        await Promise.all(updates);

        studentData.prescriptions.forEach(rx => {
           rx.next_dose_due = nextDueTime;
        });
        
        determineWorkflowState(studentData.prescriptions);
     } catch (err) {
        console.error("Failed to log dispensation:", err);
        alert("Failed to log dispensation.");
     }

     isDispensingMeds = false;
  }

  function toggleRegistrationDrawer() {
    if (!isRegistrationDrawerOpen) {
      const query = searchQuery.trim();
      if (/[0-9\/]/.test(query)) {
        regFormRegNo = query;
        regFormFirstName = '';
        regFormLastName = '';
      } else {
        regFormRegNo = '';
        const nameParts = query.split(/\s+/);
        regFormFirstName = nameParts[0] || '';
        regFormLastName = nameParts.slice(1).join(' ') || '';
      }
      regFormAllergies = ''; 
      isRegistrationDrawerOpen = true;
      gsap.to(regDrawerBackdropRef, { autoAlpha: 1, duration: 0.3 });
      gsap.to('#registration-panel', { x: 0, duration: 0.5, ease: 'power4.out' });
    } else {
      gsap.to(regDrawerBackdropRef, { autoAlpha: 0, duration: 0.3 });
      gsap.to('#registration-panel', { x: '100%', duration: 0.4, ease: 'power3.in', onComplete: () => isRegistrationDrawerOpen = false });
    }
  }

  async function saveStudentProfile() {
    if (!regFormRegNo || !regFormFirstName || !regFormLastName) return;
    isSavingProfile = true;
    let allergiesArray = [];
    if (regFormAllergies.trim().length > 0 && regFormAllergies.trim().toLowerCase() !== 'n/a') {
      allergiesArray = regFormAllergies.split(',').map(item => item.trim());
    }

    const { data, error } = await supabase
      .from('students')
      .insert([{
        reg_no: regFormRegNo,
        first_name: regFormFirstName,
        last_name: regFormLastName,
        known_allergies: allergiesArray
      }])
      .select(`*, prescriptions (*)`)
      .single();

    isSavingProfile = false;

    if (!error && data) {
      studentData = data;
      isNotFound = false;
      determineWorkflowState(data.prescriptions);
      searchQuery = data.reg_no;
      toggleRegistrationDrawer();
    }
  }
</script>

<div bind:this={containerRef} class="h-screen w-screen bg-app-base overflow-hidden flex flex-col relative">
  
  <DotParticleCanvas />

  <header bind:this={headerRef} class="h-16 w-full bg-white/80 backdrop-blur-md border-b border-rx-peach flex items-center justify-between px-6 shrink-0 z-30 relative pointer-events-auto">
    <div class="flex items-center gap-3">
      <Logo class="w-6 h-6" cutoutColor="#ffffff" />
      <span class="font-display font-bold text-lg tracking-tight text-rx-green">RxIndex</span>
    </div>
    
    <div class="flex items-center gap-4 text-rx-green/70">
      {#if searchQuery.trim().length > 0}
        <div transition:fade={{ duration: 200 }} class="flex bg-rx-cream p-1 rounded-lg text-xs font-semibold mr-4">
          <button onclick={clearDashboard} class="px-3 py-1.5 rounded-md transition-colors bg-white shadow-sm text-rx-green hover:text-rx-green/80">Clear Search</button>
        </div>
      {/if}
      <div class="h-8 w-8 rounded-full bg-rx-cream border border-rx-peach flex items-center justify-center cursor-pointer hover:border-rx-green/50 transition-colors">
        <span class="text-xs font-bold text-rx-green">NJ</span>
      </div>
    </div>
  </header>

  <main class="flex-1 w-full flex flex-col items-center justify-center relative px-6 z-20 pointer-events-none">
    
    <div class="transition-opacity duration-500 w-full flex flex-col items-center justify-center {isLogsOpen || isInventoryOpen ? 'pointer-events-none' : ''}" style="opacity: {isLogsOpen || isInventoryOpen ? 0 : 1}">
      
      <div bind:this={centerHeroRef} class="text-center mb-8 absolute top-1/3 -translate-y-1/2">
        <div class="flex justify-center mb-4 pointer-events-auto">
          <Logo class="w-16 h-16" cutoutColor="#F7F6DF" />
        </div>
        <h1 class="text-heading text-4xl mb-2 pointer-events-auto">RxIndex.it</h1>
        <p class="text-subheading pointer-events-auto">Find student health records and prescriptions.</p>
      </div>

      <div bind:this={searchContainerRef} class="w-full max-w-2xl relative z-20 mt-16 pointer-events-auto">
        <div class="bg-white border border-rx-peach shadow-sm rounded-xl p-4 flex items-center gap-4 transition-all duration-300 focus-within:shadow-md focus-within:border-rx-green">
          {#if isSearching}
            <svg class="w-6 h-6 text-rx-yellow animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          {:else}
            <svg class="w-6 h-6 text-rx-green/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          {/if}
          <input 
            type="text" 
            bind:value={searchQuery}
            oninput={handleInput}
            placeholder="Search by Registration No. or Name..." 
            class="input-search"
            autofocus
            disabled={isLogsOpen || isInventoryOpen}
          />
        </div>
      </div>

      <div bind:this={profileRef} class="absolute top-1/2 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-10 invisible mt-8 pointer-events-auto">
         <div class="card-base shadow-lg overflow-y-auto max-h-[calc(100vh-350px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            
            {#if isNotFound}
              <div class="flex flex-col items-center justify-center py-2 text-center">
                <div class="w-14 h-14 bg-rx-cream rounded-full flex items-center justify-center mb-4 border border-rx-peach">
                  <svg class="w-6 h-6 text-rx-green/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                </div>
                <h2 class="text-heading text-2xl mb-2">No records found</h2>
                <p class="text-subheading text-sm mb-6">We couldn't find a student matching <span class="font-bold text-rx-green">"{searchQuery}"</span> in the database.</p>
                <button onclick={toggleRegistrationDrawer} class="btn-primary px-8 py-3 !rounded-xl">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                  Create Student Profile
                </button>
              </div>
            
            {:else if studentData}
              <div class="flex justify-between items-start mb-8 pb-6 border-b border-rx-peach">
                <div class="flex items-center gap-5">
                  <div class="w-14 h-14 rounded-full bg-rx-cream flex items-center justify-center text-rx-green font-display font-bold text-xl border border-rx-peach uppercase shrink-0">
                    {studentData.first_name.charAt(0)}
                  </div>
                  <div>
                    <h2 class="text-heading text-2xl">{studentData.first_name} {studentData.last_name}</h2>
                    <p class="text-subheading text-sm mt-1">{studentData.reg_no}</p>
                  </div>
                </div>
                
                <div class="flex gap-3 shrink-0">
                  {#if currentWorkflowState === 'clear'}
                    <button onclick={() => isDrawerOpen = true} class="btn-primary">
                      Start Consultation
                    </button>
                  
                  {:else if currentWorkflowState === 'dose-due' || currentWorkflowState === 'defaulter'}
                    <button onclick={() => isDrawerOpen = true} class="btn-ghost">
                      New Consult
                    </button>
                    <button onclick={dispenseAllDueMeds} disabled={isDispensingMeds} class="{currentWorkflowState === 'defaulter' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20 text-white px-5 py-2.5 rounded-lg font-sans font-semibold text-sm transition-all shadow-sm flex items-center gap-2' : 'btn-primary'}">
                      {#if isDispensingMeds}
                        <svg class="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Logging...
                      {:else}
                        <span class="w-2 h-2 rounded-full {currentWorkflowState === 'defaulter' ? 'bg-white' : 'bg-rx-yellow'} animate-pulse"></span>
                        Log & Dispense All
                      {/if}
                    </button>

                  {:else if currentWorkflowState === 'waiting'}
                    <button onclick={() => isDrawerOpen = true} class="btn-ghost">
                      New Consult
                    </button>
                    <button class="bg-rx-cream text-rx-green/40 px-5 py-2.5 rounded-lg font-sans font-semibold text-sm cursor-not-allowed border border-rx-peach">
                      Doses Not Due
                    </button>
                  {/if}
                </div>
              </div>
              
              <div class="grid grid-cols-[1.5fr_1fr] gap-6">
                
                <div class={currentWorkflowState === 'clear' ? 'opacity-50' : 'opacity-100'}>
                  <h3 class="tag-badge text-rx-green/50 mb-3 flex items-center justify-between">
                     Active Prescriptions
                     {#if studentData.prescriptions?.length > 0}
                        <span class="bg-rx-cream text-rx-green/70 px-2 py-0.5 rounded text-[10px]">{studentData.prescriptions.length} Active</span>
                     {/if}
                  </h3>
                  
                  {#if currentWorkflowState === 'clear'}
                     <div class="bg-rx-cream border border-rx-peach rounded-xl p-4">
                       <p class="text-subheading text-sm">No active routines.</p>
                     </div>
                  {:else}
                     <div class="flex flex-col gap-2 max-h-56 overflow-y-auto pr-2 pb-4">
                       {#each studentData.prescriptions as rx}
                          <div class="bg-rx-cream border border-rx-peach rounded-xl p-3 flex justify-between items-center group">
                             <div>
                                <p class="text-rx-green font-semibold font-sans text-sm leading-snug">{rx.drug_name}</p>
                                <p class="text-xs text-rx-green/70 font-medium mt-0.5">{rx.dosage}</p>
                             </div>
                             <div class="text-right shrink-0">
                                {#if new Date() - new Date(rx.next_dose_due) > 2 * 60 * 60 * 1000}
                                   <span class="tag-badge text-red-600 bg-red-100">Overdue</span>
                                {:else if new Date() >= new Date(rx.next_dose_due) || new Date(rx.next_dose_due) - new Date() < 1 * 60 * 60 * 1000}
                                   <span class="tag-badge text-rx-green bg-rx-yellow">Due Now</span>
                                {:else}
                                   <span class="tag-badge text-rx-green/40">Waiting</span>
                                {/if}
                             </div>
                          </div>
                       {/each}
                     </div>
                  {/if}
                </div>

                <div>
                  <h3 class="tag-badge text-rx-green/50 mb-3">Known Allergies</h3>
                  <div class="bg-red-50 border border-red-100 rounded-xl p-4">
                    <p class="text-red-900 font-semibold font-sans">
                      {#if studentData.known_allergies && studentData.known_allergies.length > 0}
                        {studentData.known_allergies.join(', ')}
                      {:else}
                        None recorded
                      {/if}
                    </p>
                    <p class="text-sm text-red-700/70 mt-1 font-medium">Flagged on Admission</p>
                  </div>
                </div>
              </div>
            {/if}

          </div>
      </div>
    </div>
  </main>

  <ConsultationDrawer 
    isOpen={isDrawerOpen} 
    studentData={studentData} 
    onClose={() => isDrawerOpen = false} 
    onSaveSuccess={(newPrescriptions) => {
      if (studentData) {
        studentData.prescriptions = [...(studentData.prescriptions || []), ...newPrescriptions];
        determineWorkflowState(studentData.prescriptions);
      }
    }}
  />

  <LogsDashboard 
    isOpen={isLogsOpen} 
    onClose={() => isLogsOpen = false} 
  />

  <InventoryDashboard 
    isOpen={isInventoryOpen} 
    onClose={() => isInventoryOpen = false} 
  />

  <div class="fixed inset-0 z-50 pointer-events-none flex justify-end" style="visibility: {isRegistrationDrawerOpen ? 'visible' : 'hidden'}">
    <div bind:this={regDrawerBackdropRef} class="drawer-backdrop absolute inset-0 pointer-events-auto" onclick={toggleRegistrationDrawer}></div>
    
    <div id="registration-panel" class="modal-panel relative w-full max-w-md h-full flex flex-col pointer-events-auto translate-x-full">
      <div class="p-6 border-b border-rx-peach flex justify-between items-center bg-rx-cream/50">
        <div>
          <h2 class="text-heading text-xl">New Student Registration</h2>
          <p class="text-subheading text-sm mt-1">Add profile to database</p>
        </div>
        <button onclick={toggleRegistrationDrawer} class="p-2 text-rx-green/50 hover:text-rx-green hover:bg-rx-cream rounded-full transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <div>
          <label class="block tag-badge text-rx-green/50 mb-2 !px-0">Registration Number</label>
          <input type="text" bind:value={regFormRegNo} placeholder="e.g. I21/3708/2022" class="input-standard" />
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block tag-badge text-rx-green/50 mb-2 !px-0">First Name</label>
            <input type="text" bind:value={regFormFirstName} placeholder="e.g. Manoah" class="input-standard" />
          </div>
          <div>
            <label class="block tag-badge text-rx-green/50 mb-2 !px-0">Last Name</label>
            <input type="text" bind:value={regFormLastName} placeholder="e.g. Kipngeno" class="input-standard" />
          </div>
        </div>

        <div>
          <label class="block tag-badge text-rx-green/50 mb-2 !px-0">Known Allergies (Optional)</label>
          <input type="text" bind:value={regFormAllergies} placeholder="e.g. Penicillin, Dust" class="input-standard" />
        </div>
      </div>
      
      <div class="p-6 border-t border-rx-peach bg-white">
        <button onclick={saveStudentProfile} disabled={isSavingProfile} class="btn-primary w-full py-3 !rounded-xl">
          {#if isSavingProfile}
            <svg class="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Saving...
          {:else}
            Save Profile
          {/if}
        </button>
      </div>
    </div>
  </div>

  <nav bind:this={dockRef} class="fixed bottom-8 left-1/2 -translate-x-1/2 dock-container z-40 pointer-events-auto">
    
    <button onclick={openSearch} class="group {!isLogsOpen && !isInventoryOpen ? 'nav-item-active' : 'nav-item'}">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      <span class="nav-tooltip">Search</span>
    </button>
    
    <button onclick={openLogs} class="group {isLogsOpen ? 'nav-item-active' : 'nav-item'}">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
      <span class="nav-tooltip">Logs</span>
    </button>
    
    <button onclick={openInventory} class="group {isInventoryOpen ? 'nav-item-active' : 'nav-item'}">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
      <span class="nav-tooltip">Inventory</span>
    </button>
    
    <div class="w-px h-6 bg-rx-peach mx-2"></div>
    
    <div class="relative group flex items-center justify-center p-3 pr-4 cursor-help">
      <div class="relative flex h-2.5 w-2.5">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
      </div>
      <span class="nav-tooltip !text-emerald-400">API Online</span>
    </div>
  </nav>

</div>