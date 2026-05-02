<script>
  import { drugIndexApi } from '$lib/drugIndexClient';
  import { supabase } from '$lib/supabaseClient'; 

  let {
    isOpen,
    studentData,
    onClose,
    onSaveSuccess 
  } = $props();

  let isSaving = $state(false);
  let vitalsTemp = $state('');
  let vitalsWeight = $state('');

  let symptoms = $state([]);
  let currentSymptomInput = $state('');
  let suggestedIngredients = $state([]);
  let isFetchingSuggestions = $state(false);

  let drugSearchQuery = $state('');
  let drugSearchResults = $state([]);
  let isSearchingDrugs = $state(false);
  let prescribedDrugs = $state([]); 
  let drugSearchDebounceTimer;
  
  let isCheckingSafety = $state(false); 
  let allergyWarning = $state(null);
  let interactionWarning = $state(null); 

  let pendingVariantSelection = $state(null); 
  let availableVariants = $state([]);
  let isLoadingVariants = $state(false);

  $effect(() => {
    if (!isOpen) {
      drugSearchQuery = '';
      drugSearchResults = [];
      prescribedDrugs = [];
      allergyWarning = null;
      interactionWarning = null;
      pendingVariantSelection = null;
      availableVariants = [];
      symptoms = [];
      currentSymptomInput = '';
      suggestedIngredients = [];
      vitalsTemp = '';
      vitalsWeight = '';
    }
  });

  // --- FREE-TEXT SYMPTOM LOGIC ---
  function handleSymptomKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSymptom(currentSymptomInput);
    }
  }

  function addSymptom(symptomText) {
    const text = symptomText.trim().charAt(0).toUpperCase() + symptomText.trim().slice(1).toLowerCase();
    
    if (text.length > 0 && !symptoms.includes(text)) {
      symptoms.push(text);
      fetchDrugSuggestionsForSymptoms();
    }
    currentSymptomInput = '';
  }

  function removeSymptom(index) {
    symptoms.splice(index, 1);
    fetchDrugSuggestionsForSymptoms();
  }

  async function fetchDrugSuggestionsForSymptoms() {
    if (symptoms.length === 0 || !drugIndexApi) {
      suggestedIngredients = [];
      return;
    }

    isFetchingSuggestions = true;

    const orQuery = symptoms.map(s => `indications.ilike.%${s}%`).join(',');

    const { data, error } = await drugIndexApi
      .from('active_ingredients')
      .select('ai_key, name, indications')
      .or(orQuery)
      .limit(6); 

    if (data) {
      const uniqueIngredients = [];
      const map = new Map();
      for (const item of data) {
        if (!map.has(item.name)) {
          map.set(item.name, true);
          uniqueIngredients.push(item);
        }
      }
      suggestedIngredients = uniqueIngredients;
    }
    
    isFetchingSuggestions = false;
  }

  // --- INSTANT GENERIC SELECTION WITH SAFETY CHECKS ---
  async function selectGenericDrug(ingredient) {
    allergyWarning = null;
    interactionWarning = null;
    isCheckingSafety = true;

    const ingredientNameLower = ingredient.name.toLowerCase();

    // 1. ALLERGY CHECK
    const studentAllergies = studentData?.known_allergies || [];
    const dangerousAllergy = studentAllergies.find(allergy => {
      return ingredientNameLower.includes(allergy.toLowerCase());
    });

    if (dangerousAllergy) {
      allergyWarning = `Contraindication found! Patient is allergic to "${dangerousAllergy}". Dispensing ${ingredient.name} has been blocked.`;
      isCheckingSafety = false;
      return; 
    }

    // 2. DDI (INTERACTION) CHECK
    const activePrescriptions = studentData?.prescriptions?.filter(p => p.status === 'active') || [];
    const activeAiKeys = [
      ...activePrescriptions.map(p => p.ai_key).filter(Boolean),
      ...prescribedDrugs.map(d => d.ai_key).filter(Boolean)
    ];

    if (activeAiKeys.length > 0 && ingredient.ai_key && drugIndexApi) {
      const { data: interactions } = await drugIndexApi
        .from('component_interactions') 
        .select('interaction_key, source_key, target_key') 
        .or(`source_key.eq.${ingredient.ai_key},target_key.eq.${ingredient.ai_key}`);

      if (interactions && interactions.length > 0) {
        const dangerousInteraction = interactions.find(interaction => 
          (interaction.source_key === ingredient.ai_key && activeAiKeys.includes(interaction.target_key)) ||
          (interaction.target_key === ingredient.ai_key && activeAiKeys.includes(interaction.source_key))
        );

        if (dangerousInteraction) {
          let warningMessage = `Severe Interaction Alert: Dispensing ${ingredient.name} alongside this patient's current medications poses a severe health risk.`;
          if (dangerousInteraction.interaction_key) {
             const { data: descData } = await drugIndexApi
               .from('interaction_descriptions')
               .select('*') 
               .eq('interaction_key', dangerousInteraction.interaction_key)
               .maybeSingle();
             if (descData && (descData.description || descData.narrative)) {
                warningMessage = descData.description || descData.narrative;
             }
          }
          interactionWarning = warningMessage;
          isCheckingSafety = false;
          return; 
        }
      }
    }

    isCheckingSafety = false;

    // 3. SAFE TO ADD DIRECTLY TO CART AS GENERIC
    finalizeDrugSelection({
      name: ingredient.name,
      ai_key: ingredient.ai_key,
      brand_key: `gen_${ingredient.ai_key}` 
    }, "Generic");
  }

  // --- BRAND DRUG SEARCH LOGIC ---
  function handleDrugInput(e) {
    drugSearchQuery = e.target.value || e.target.value === '' ? e.target.value : drugSearchQuery;
    allergyWarning = null; 
    interactionWarning = null;
    pendingVariantSelection = null; 
    availableVariants = [];
    clearTimeout(drugSearchDebounceTimer);

    if (drugSearchQuery.trim().length < 2) {
      drugSearchResults = [];
      isSearchingDrugs = false;
      return;
    }

    isSearchingDrugs = true;

    drugSearchDebounceTimer = setTimeout(async () => {
      if (!drugIndexApi) {
        isSearchingDrugs = false;
        return;
      }
      
      const { data } = await drugIndexApi
        .from('brands')
        .select('brand_key, name, manufacturer_key, ai_key')
        .ilike('name', `%${drugSearchQuery}%`)
        .limit(6);

      if (data) drugSearchResults = data;
      isSearchingDrugs = false;
    }, 300);
  }

  async function selectDrugBase(drug) {
    allergyWarning = null;
    interactionWarning = null;
    isCheckingSafety = true;
    drugSearchQuery = drug.name; 
    drugSearchResults = [];

    let ingredientName = '';
    
    if (drug.ai_key && drugIndexApi) {
      const { data } = await drugIndexApi
        .from('active_ingredients')
        .select('name') 
        .eq('ai_key', drug.ai_key)
        .maybeSingle();

      if (data && data.name) {
        ingredientName = data.name.toLowerCase();
      }
    }

    const drugNameLower = drug.name.toLowerCase();
    const studentAllergies = studentData?.known_allergies || [];
    const dangerousAllergy = studentAllergies.find(allergy => {
      const allergyLower = allergy.toLowerCase();
      return ingredientName.includes(allergyLower) || drugNameLower.includes(allergyLower);
    });

    if (dangerousAllergy) {
      allergyWarning = `Contraindication found! Patient is allergic to "${dangerousAllergy}". Dispensing ${drug.name} has been blocked.`;
      isCheckingSafety = false;
      return; 
    }

    const activePrescriptions = studentData?.prescriptions?.filter(p => p.status === 'active') || [];
    const activeAiKeys = [
      ...activePrescriptions.map(p => p.ai_key).filter(Boolean),
      ...prescribedDrugs.map(d => d.ai_key).filter(Boolean)
    ];

    if (activeAiKeys.length > 0 && drug.ai_key && drugIndexApi) {
      const { data: interactions } = await drugIndexApi
        .from('component_interactions') 
        .select('interaction_key, source_key, target_key') 
        .or(`source_key.eq.${drug.ai_key},target_key.eq.${drug.ai_key}`);

      if (interactions && interactions.length > 0) {
        const dangerousInteraction = interactions.find(interaction => 
          (interaction.source_key === drug.ai_key && activeAiKeys.includes(interaction.target_key)) ||
          (interaction.target_key === drug.ai_key && activeAiKeys.includes(interaction.source_key))
        );

        if (dangerousInteraction) {
          let warningMessage = `Severe Interaction Alert: Dispensing ${drug.name} alongside this patient's current medications poses a severe health risk.`;
          if (dangerousInteraction.interaction_key) {
             const { data: descData } = await drugIndexApi
               .from('interaction_descriptions')
               .select('*') 
               .eq('interaction_key', dangerousInteraction.interaction_key)
               .maybeSingle();
             if (descData && (descData.description || descData.narrative)) {
                warningMessage = descData.description || descData.narrative;
             }
          }
          interactionWarning = warningMessage;
          isCheckingSafety = false;
          return; 
        }
      }
    }

    isCheckingSafety = false;
    pendingVariantSelection = drug; 
    fetchVariants(drug.brand_key);
  }

  async function fetchVariants(brandKey) {
    isLoadingVariants = true;
    const { data } = await drugIndexApi
      .from('variants')
      .select('variant_key, brand_key, dosage_form, strength') 
      .eq('brand_key', brandKey);

    if (data && data.length > 0) {
      availableVariants = data;
    } else {
      finalizeDrugSelection(pendingVariantSelection, "Standard Formulation");
    }
    isLoadingVariants = false;
  }

  function selectVariant(variant) {
    const formulation = `${variant.strength || ''} ${variant.dosage_form || ''}`.trim();
    finalizeDrugSelection(pendingVariantSelection, formulation, variant.variant_key);
  }

  function finalizeDrugSelection(baseDrug, formulation, variantKey = null) {
    if (!prescribedDrugs.find(d => d.brand_key === baseDrug.brand_key && d.formulation === formulation)) {
      prescribedDrugs.push({
        ...baseDrug,
        formulation: formulation,
        variant_key: variantKey,
        dosage: '', 
        days: ''    
      });
    }
    drugSearchQuery = '';
    pendingVariantSelection = null;
    availableVariants = [];
  }

  function cancelVariantSelection() {
    drugSearchQuery = '';
    pendingVariantSelection = null;
    availableVariants = [];
  }

  function removeDrug(index) {
    prescribedDrugs.splice(index, 1);
  }

  async function saveAndDispense() {
    if (prescribedDrugs.length === 0) {
      alert("Please select at least one drug to dispense.");
      return;
    }

    for (const drug of prescribedDrugs) {
      if (!drug.dosage || !drug.days) {
        alert(`Please specify the Dosage and Days for ${drug.name}.`);
        return;
      }
    }

    if (!studentData || !studentData.id) {
      alert("Error: No student selected.");
      return;
    }

    isSaving = true;

    const notesStr = symptoms.length > 0 ? `Symptoms: ${symptoms.join(', ')}` : 'No symptoms logged';

    const prescriptionsToInsert = prescribedDrugs.map(drug => ({
      student_id: studentData.id,
      drug_name: `${drug.name} (${drug.formulation})`, 
      ai_key: drug.ai_key,
      dosage: `${drug.dosage} for ${drug.days} days`, 
      doses_remaining: 1, 
      next_dose_due: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), 
      status: 'active',
      notes: notesStr 
    }));

    const { data, error } = await supabase
      .from('prescriptions')
      .insert(prescriptionsToInsert)
      .select();

    isSaving = false;

    if (error) {
      console.error("Error saving prescriptions:", error);
      alert("Failed to save prescriptions to database. (Did you add the 'notes' column?)");
    } else {
      prescribedDrugs = []; 
      onClose(); 
      if (onSaveSuccess) onSaveSuccess(data); 
    }
  }
</script>

<div class="fixed inset-0 z-50 pointer-events-none flex justify-end" style="visibility: {isOpen ? 'visible' : 'hidden'}">
  <div class="drawer-backdrop absolute inset-0 pointer-events-auto" onclick={onClose} style="opacity: {isOpen ? 1 : 0}"></div>
  
  <div class="modal-panel relative w-full max-w-md h-full flex flex-col pointer-events-auto transition-transform duration-500 ease-out {isOpen ? 'translate-x-0' : 'translate-x-full'}">
    <div class="p-6 border-b border-rx-peach flex justify-between items-center bg-rx-cream/50 shrink-0">
      <div>
        <h2 class="text-heading text-xl">New Consultation</h2>
        <p class="text-subheading text-sm mt-1">
          {#if studentData}
            {studentData.first_name} {studentData.last_name}
          {:else}
            Patient
          {/if}
        </p>
      </div>
      <button onclick={onClose} class="p-2 text-rx-green/50 hover:text-rx-green hover:bg-rx-cream rounded-full transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <div>
        <label class="block tag-badge text-rx-green/50 mb-2 !px-0">Vitals</label>
        <div class="grid grid-cols-2 gap-4">
          <input type="text" bind:value={vitalsTemp} placeholder="Temp (°C)" class="input-standard" />
          <input type="text" bind:value={vitalsWeight} placeholder="Weight (kg)" class="input-standard" />
        </div>
      </div>

      <div>
        <label class="block tag-badge text-rx-green/50 mb-2 !px-0 flex justify-between items-center">
          Signs & Symptoms
          {#if isFetchingSuggestions}
            <svg class="w-3 h-3 text-rx-yellow animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          {/if}
        </label>
        <div class="w-full bg-rx-cream border border-rx-peach rounded-lg p-2.5 flex flex-wrap gap-2 items-center focus-within:border-rx-green focus-within:shadow-sm transition-all min-h-[50px] relative">
          
          {#each symptoms as symptom, i}
            <div class="px-3 py-1.5 rounded-full bg-white border border-rx-peach shadow-sm flex items-center gap-1.5 text-sm font-bold text-rx-green animate-in zoom-in-95 duration-200">
              {symptom}
              <button onclick={() => removeSymptom(i)} class="text-rx-green/50 hover:text-red-500 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          {/each}

          <div class="relative flex-1 min-w-[160px]">
            <input 
              type="text" 
              bind:value={currentSymptomInput} 
              onkeydown={handleSymptomKeydown}
              placeholder={symptoms.length === 0 ? "Type symptom & press Enter..." : "Add another..."} 
              class="input-search !text-sm"
            />
          </div>
        </div>
      </div>
      
      <div class="mt-4 pt-6 border-t border-rx-peach">
        <label class="block tag-badge text-rx-green mb-2 !px-0 flex items-center justify-between">
          <span class="flex items-center gap-2">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            DrugIndex API Integration
          </span>
        </label>

        {#if suggestedIngredients.length > 0}
           <div class="mb-4 flex flex-wrap gap-2 animate-in slide-in-from-top-2">
             <span class="text-xs font-bold text-rx-green/50 uppercase tracking-widest w-full mb-0.5">Matched from DrugIndex:</span>
             {#each suggestedIngredients as ingredient}
                <button 
                  onclick={() => selectGenericDrug(ingredient)}
                  class="btn-ghost !py-1.5 !px-3 !text-xs !justify-start"
                >
                  <svg class="w-3 h-3 shrink-0 text-rx-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                  <span class="truncate max-w-[200px]">{ingredient.name}</span>
                </button>
             {/each}
           </div>
        {/if}
        
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {#if isSearchingDrugs || isCheckingSafety || isLoadingVariants}
              <svg class="w-4 h-4 text-rx-yellow animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {:else}
              <svg class="w-4 h-4 text-rx-green/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            {/if}
          </div>
          
          <input 
            type="text" 
            value={drugSearchQuery}
            oninput={handleDrugInput}
            placeholder="Search to add drug..." 
            disabled={pendingVariantSelection !== null}
            class="input-standard pl-10 pr-3 py-3 disabled:opacity-50 disabled:bg-rx-cream" 
          />

          {#if drugSearchResults.length > 0 && !pendingVariantSelection}
            <div class="absolute top-full left-0 w-full bg-white border border-rx-peach shadow-xl rounded-lg mt-2 z-50 overflow-hidden max-h-48 overflow-y-auto">
              {#each drugSearchResults as drug}
                <button 
                  onclick={() => selectDrugBase(drug)} 
                  class="w-full text-left px-4 py-3 hover:bg-rx-cream border-b border-rx-cream last:border-0 transition-colors flex items-center justify-between group"
                >
                  <span class="text-sm font-bold text-rx-green">{drug.name}</span>
                  <svg class="w-4 h-4 text-rx-green/30 group-hover:text-rx-green transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        {#if pendingVariantSelection && availableVariants.length > 0}
           <div class="mt-3 bg-rx-cream border border-rx-peach rounded-xl p-4 animate-in slide-in-from-top-2">
              <div class="flex justify-between items-center mb-3">
                 <h4 class="tag-badge text-rx-green/50 !px-0">Select Formulation</h4>
                 <button onclick={cancelVariantSelection} class="tag-badge text-rx-green/50 hover:text-rx-green !px-0">Cancel</button>
              </div>
              <div class="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                 {#each availableVariants as variant}
                    <button onclick={() => selectVariant(variant)} class="w-full text-left bg-white border border-rx-peach hover:border-rx-green hover:shadow-sm rounded-lg p-3 transition-all flex justify-between items-center group">
                       <div>
                          <p class="text-sm font-bold text-rx-green">{variant.strength || 'Standard'}</p>
                          <p class="text-xs font-medium text-rx-green/70 mt-0.5">{variant.dosage_form || 'Formulation'}</p>
                       </div>
                       <div class="w-6 h-6 rounded-full border border-rx-peach group-hover:border-rx-green group-hover:bg-rx-cream flex items-center justify-center transition-colors">
                          <div class="w-2.5 h-2.5 rounded-full bg-rx-green opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       </div>
                    </button>
                 {/each}
              </div>
           </div>
        {/if}

        {#if isCheckingSafety || isLoadingVariants}
           <p class="mt-3 text-xs font-bold text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-2">
             <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             {isCheckingSafety ? 'Running Safety Check...' : 'Loading Variants...'}
           </p>
        {/if}

        {#if allergyWarning}
          <div class="mt-3 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
            <div class="mt-0.5 bg-red-100 p-1.5 rounded-full">
              <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <div>
               <h4 class="text-sm font-bold text-red-900">Allergy Contraindication</h4>
               <p class="text-sm text-red-700 font-medium mt-1 leading-snug">{allergyWarning}</p>
            </div>
            <button onclick={() => allergyWarning = null} class="ml-auto p-1.5 text-red-400 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        {/if}

        {#if interactionWarning}
          <div class="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
            <div class="mt-0.5 bg-orange-100 p-1.5 rounded-full">
              <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <div>
               <h4 class="text-sm font-bold text-orange-900">Severe Drug Interaction</h4>
               <p class="text-sm text-orange-700 font-medium mt-1 leading-snug">{interactionWarning}</p>
            </div>
            <button onclick={() => interactionWarning = null} class="ml-auto p-1.5 text-orange-400 hover:text-orange-700 hover:bg-orange-100 rounded-md transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        {/if}

        {#if prescribedDrugs.length > 0}
          <div class="mt-4 flex flex-col gap-3">
            {#each prescribedDrugs as drug, i}
              <div class="flex flex-col bg-rx-cream border border-rx-peach p-3 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                <div class="flex items-start justify-between mb-2">
                  <div>
                     <p class="text-sm font-semibold text-rx-green leading-tight pr-2">{drug.name}</p>
                     <p class="text-xs font-medium text-rx-green/70 mt-0.5">({drug.formulation})</p>
                  </div>
                  <button onclick={() => removeDrug(i)} class="p-1.5 text-rx-green/60 hover:text-red-600 hover:bg-white rounded-md transition-colors shrink-0" title="Remove drug">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <div class="flex gap-2 mt-1">
                   <div class="flex-1">
                      <input type="text" bind:value={drug.dosage} placeholder="Dosage (e.g. 1x3)" class="input-standard !p-2 !text-xs" />
                   </div>
                   <div class="w-24 shrink-0">
                      <input type="number" bind:value={drug.days} placeholder="Days" class="input-standard !p-2 !text-xs" />
                   </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}

      </div>
    </div>
    <div class="p-6 border-t border-rx-peach bg-white shrink-0">
      <button onclick={saveAndDispense} disabled={isSaving} class="btn-primary w-full py-3 !rounded-xl">
        {#if isSaving}
          <svg class="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Saving Prescriptions...
        {:else}
          Save & Dispense
        {/if}
      </button>
    </div>
  </div>
</div>