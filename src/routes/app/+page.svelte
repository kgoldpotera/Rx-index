<script>
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import DotParticleCanvas from '$lib/components/DotParticleCanvas.svelte';
  import { supabase } from '$lib/supabaseClient'; 
  import { db } from '$lib/db';
  import ConsultationDrawer from '$lib/components/ConsultationDrawer.svelte';
  import LogsDashboard from '$lib/components/LogsDashboard.svelte'; 
  import InventoryDashboard from '$lib/components/InventoryDashboard.svelte';
  import Logo from '$lib/components/Logo.svelte';
  import { fade, slide } from 'svelte/transition';

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
  let searchResults = $state([]); 
  
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

  onMount(async () => {
    const ctx = gsap.context(() => {
      gsap.set([headerRef, dockRef], { opacity: 0 });
      gsap.set(searchContainerRef, { y: 20, opacity: 0 });
      gsap.set(regDrawerBackdropRef, { autoAlpha: 0 });
      gsap.set('#registration-panel', { x: '100%' });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.to(headerRef, { opacity: 1, duration: 0.8 }, 0)
        .to(searchContainerRef, { y: 0, opacity: 1, duration: 0.8 }, 0.3)
        .to(dockRef, { opacity: 1, duration: 0.8 }, 0.5);
    }, containerRef);

    // Initial Data Sync: Supabase -> Local Dexie Cache
    try {
        const { data: studentsData, error: studentErr } = await supabase.from('students').select('*');
        if (studentsData) await db.students.bulkPut(studentsData);

        const { data: rxData, error: rxErr } = await supabase.from('prescriptions').select('*');
        if (rxData) await db.prescriptions.bulkPut(rxData);
        
        console.log("Local Dexie cache synchronized with Supabase.");
    } catch (error) {
        console.error("Failed to sync with Supabase. Operating in offline mode.", error);
    }

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
    searchResults = [];
    currentWorkflowState = 'clear';
  }

  async function handleInput() {
    if (searchQuery.trim().length >= 3) {
        isSearching = true;
        try {
            const queryLower = searchQuery.trim().toLowerCase();
            
            // Search local Dexie DB instantly
            const data = await db.students
                .filter(student => 
                    (student.reg_no && student.reg_no.toLowerCase().includes(queryLower)) ||
                    (student.first_name && student.first_name.toLowerCase().includes(queryLower)) ||
                    (student.last_name && student.last_name.toLowerCase().includes(queryLower)) ||
                    ((student.first_name || '') + ' ' + (student.last_name || '')).toLowerCase().includes(queryLower)
                )
                .limit(10)
                .toArray();

            // Fetch prescriptions locally for the found students
            for (let student of data) {
                student.prescriptions = await db.prescriptions
                    .where('student_id').equals(student.id)
                    .toArray();
            }

            // Execute the strict state logic previously implemented
            if (data && data.length === 1) {
                studentData = data[0];
                searchResults = [];
                isNotFound = false;
                studentData.prescriptions = studentData.prescriptions ? studentData.prescriptions.filter(p => p.status === 'active') : [];
                determineWorkflowState(studentData.prescriptions);
            } else if (data && data.length > 1) {
                searchResults = data;
                studentData = null;
                isNotFound = false;
            } else {
                searchResults = [];
                studentData = null;
                isNotFound = true;
            }

            if (!isProfileVisible && (studentData || searchResults.length > 0 || isNotFound)) {
                isProfileVisible = true;
            }
        } catch (error) {
            console.error("Local Search Error:", error);
        } finally {
            isSearching = false;
        }
    } else {
        if (isProfileVisible) clearDashboard();
    }
  }

  function selectStudent(student) {
    studentData = student;
    searchResults = [];
    studentData.prescriptions = studentData.prescriptions ? studentData.prescriptions.filter(p => p.status === 'active') : [];
    determineWorkflowState(studentData.prescriptions);
    
    if (!isProfileVisible) {
      isProfileVisible = true;
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

    const newStudent = {
        id: crypto.randomUUID(),
        reg_no: regFormRegNo,
        first_name: regFormFirstName,
        last_name: regFormLastName,
        known_allergies: allergiesArray,
        prescriptions: []
    };

    if (navigator.onLine) {
        try {
            const { prescriptions, ...studentPayload } = newStudent;
            const { error } = await supabase.from('students').insert([studentPayload]);
            if (error) throw error;
            
            await db.students.put(studentPayload);
        } catch (error) {
            console.error("Supabase Save Error:", error);
            await saveOffline(newStudent);
        }
    } else {
        await saveOffline(newStudent);
    }

    studentData = newStudent;
    isNotFound = false;
    searchResults = [];
    determineWorkflowState(newStudent.prescriptions);
    searchQuery = newStudent.reg_no;
    
    isSavingProfile = false;
    toggleRegistrationDrawer();
  }

  async function saveOffline(studentDataObj) {
      try {
          const { prescriptions, ...studentPayload } = studentDataObj;
          await db.students.put(studentPayload);
          
          await db.syncQueue.add({
              operation: 'INSERT_STUDENT',
              payload: studentPayload,
              timestamp: new Date().getTime()
          });
          console.log("Profile saved offline. Queued for synchronization.");
      } catch (error) {
          console.error("Dexie Offline Save Error:", error);
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
    
    <div class="h-[calc(100vh-4rem)] pt-8 pb-32 flex flex-col items-center overflow-y-auto w-full transition-all duration-500 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] {isLogsOpen || isInventoryOpen ? 'pointer-events-none' : 'pointer-events-auto'}" style="opacity: {isLogsOpen || isInventoryOpen ? 0 : 1}">
      
      <div class="w-full max-w-2xl flex flex-col gap-8 transition-all duration-500 {isProfileVisible ? 'justify-start' : 'justify-center h-full'}">
        
        {#if searchQuery.trim().length < 3 && !studentData && searchResults.length === 0}
          <div transition:slide={{ duration: 400 }} bind:this={centerHeroRef} class="flex flex-col items-center text-center mb-4">
            <div class="flex justify-center mb-4 pointer-events-auto">
              <Logo class="w-16 h-16" cutoutColor="#F7F6DF" />
            </div>
            <h1 class="font-display text-4xl font-bold text-rx-green tracking-tight mb-2 pointer-events-auto">RxIndex.it</h1>
            <p class="font-sans text-rx-green/70 font-medium pointer-events-auto">Find student health records and prescriptions.</p>
          </div>
        {/if}

        <div bind:this={searchContainerRef} class="w-full relative z-20 pointer-events-auto">
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

      {#if searchResults.length > 1 && !studentData && !isNotFound}
        <div transition:fade={{ duration: 200 }} class="w-full max-w-xl bg-white border border-rx-peach shadow-sm rounded-xl overflow-hidden flex flex-col relative z-20 self-center">
          <div class="px-4 py-3 bg-rx-cream/50 border-b border-rx-peach text-xs font-bold text-rx-green/50 uppercase tracking-widest">
            Select a Student ({searchResults.length} found)
          </div>
          <div class="max-h-[40vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-rx-peach [&::-webkit-scrollbar-thumb]:rounded-full">
            {#each searchResults as student}
              <button onclick={() => selectStudent(student)} class="w-full text-left p-4 border-b border-rx-peach/30 hover:bg-rx-cream transition-colors flex items-center justify-between group last:border-b-0">
                <div>
                  <p class="font-display font-bold text-rx-green text-lg">{student.first_name} {student.last_name}</p>
                  <p class="font-sans text-sm text-rx-green/70 font-medium">{student.reg_no}</p>
                </div>
                <div class="w-8 h-8 rounded-full bg-rx-cream flex items-center justify-center text-rx-green/40 group-hover:text-rx-green group-hover:bg-white border border-transparent group-hover:border-rx-peach transition-all">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if studentData && !isNotFound}
      <div transition:fade={{ duration: 200 }} bind:this={profileRef} class="w-full z-10 pointer-events-auto">
         <div class="card-base shadow-lg mb-20">
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
                     <div class="flex flex-col gap-2 pr-2 pb-4">
                       {#each studentData.prescriptions as rx}
                          {@const match = rx.dosage ? rx.dosage.match(/(\d+)\*(\d+)\s+for\s+(\d+)\s+days/i) : null}
                          {@const freq = match ? parseInt(match[2]) : 1}
                          {@const days = match ? parseInt(match[3]) : 1}
                          {@const totalDoses = freq * days}
                          {@const dosesTaken = Math.max(0, totalDoses - (rx.doses_remaining || 0))}
                          {@const percentage = Math.min(Math.round((dosesTaken / totalDoses) * 100), 100)}
                          <div class="bg-rx-cream border border-rx-peach rounded-xl p-3 flex justify-between items-center group">
                             <div class="flex-1 pr-4">
                                <p class="text-rx-green font-semibold font-sans text-sm leading-snug">{rx.drug_name}</p>
                                <div class="mt-4">
                                  <div class="flex justify-between items-end mb-1.5">
                                    <span class="font-sans text-xs font-bold text-rx-green/70 uppercase tracking-wider">
                                      {dosesTaken} of {totalDoses} Doses Dispensed
                                    </span>
                                    <span class="font-display text-sm font-bold text-rx-green">
                                      {percentage}%
                                    </span>
                                  </div>
                                  <!-- Progress Track -->
                                  <div class="w-full h-2 bg-rx-peach/30 rounded-full overflow-hidden">
                                    <!-- Progress Fill -->
                                    <div 
                                      class="h-full bg-rx-green rounded-full transition-all duration-1000 ease-out"
                                      style="width: {percentage}%"
                                    ></div>
                                  </div>
                                  <p class="font-sans text-xs text-rx-green/60 mt-2 font-medium">Instruction: {rx.dosage}</p>
                                </div>
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
         </div>
      </div>
      {/if}

      {#if isNotFound && searchQuery.trim().length >= 3}
        <div transition:fade={{ duration: 200 }} class="w-full max-w-xl bg-white border border-rx-peach shadow-sm rounded-2xl p-10 flex flex-col items-center justify-center text-center relative z-20 mt-4">
          <div class="w-16 h-16 rounded-full bg-rx-cream border border-rx-peach flex items-center justify-center text-rx-green mb-6">
             <svg class="w-8 h-8 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
          </div>
          <h3 class="font-display text-2xl font-bold text-rx-green mb-2 tracking-tight">No records found</h3>
          <p class="font-sans text-rx-green/70 mb-8 max-w-md font-medium">We couldn't find a student matching <span class="font-bold text-rx-green">"{searchQuery}"</span> in the database.</p>
          <button onclick={toggleRegistrationDrawer} class="bg-rx-green hover:opacity-90 text-white px-6 py-3 rounded-xl font-sans font-bold text-sm transition-all shadow-sm flex items-center gap-2">
             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
             Create Student Profile
          </button>
        </div>
      {/if}
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