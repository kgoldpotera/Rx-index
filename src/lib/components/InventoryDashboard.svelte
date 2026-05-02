<script>
  import { supabase } from '$lib/supabaseClient';
  import { drugIndexApi } from '$lib/drugIndexClient';
  import { onMount } from 'svelte';

  let { isOpen, onClose } = $props();

  let inventoryItems = $state([]);
  let isLoading = $state(false);

  // Stock In States
  let isAddingStock = $state(false);
  let drugSearchQuery = $state('');
  let drugSearchResults = $state([]);
  let isSearchingDrugs = $state(false);
  let searchDebounce;
  
  let selectedDrug = $state(null);
  let addQuantity = $state('');
  let reorderLevel = $state(50);
  let isSavingStock = $state(false);

  $effect(() => {
    if (isOpen) {
      fetchInventory();
    } else {
      resetStockInForm();
    }
  });

  async function fetchInventory() {
    isLoading = true;
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('drug_name', { ascending: true });

    if (data) inventoryItems = data;
    isLoading = false;
  }

  // --- STOCK IN SEARCH LOGIC ---
  function handleSearchInput(e) {
    drugSearchQuery = e.target.value;
    selectedDrug = null;
    clearTimeout(searchDebounce);

    if (drugSearchQuery.trim().length < 2) {
      drugSearchResults = [];
      isSearchingDrugs = false;
      return;
    }

    isSearchingDrugs = true;

    searchDebounce = setTimeout(async () => {
      const { data } = await drugIndexApi
        .from('brands')
        .select('brand_key, name')
        .ilike('name', `%${drugSearchQuery}%`)
        .limit(6);

      if (data) drugSearchResults = data;
      isSearchingDrugs = false;
    }, 300);
  }

  function selectDrug(drug) {
    selectedDrug = drug;
    drugSearchQuery = drug.name;
    drugSearchResults = [];
  }

  function resetStockInForm() {
    isAddingStock = false;
    selectedDrug = null;
    drugSearchQuery = '';
    addQuantity = '';
    reorderLevel = 50;
  }

  // --- SAVE STOCK TO DATABASE ---
  async function saveStock() {
    if (!selectedDrug || !addQuantity || isNaN(addQuantity) || Number(addQuantity) <= 0) {
      alert("Please select a drug and enter a valid quantity.");
      return;
    }

    isSavingStock = true;
    const qtyToAdd = Number(addQuantity);

    // Check if this drug already exists in the inventory
    const existingItem = inventoryItems.find(item => item.drug_name === selectedDrug.name);

    if (existingItem) {
      // UPDATE existing stock
      const { error } = await supabase
        .from('inventory')
        .update({ total_stock: existingItem.total_stock + qtyToAdd })
        .eq('id', existingItem.id);
    } else {
      // INSERT new stock
      const { error } = await supabase
        .from('inventory')
        .insert([{
          drug_name: selectedDrug.name,
          total_stock: qtyToAdd,
          reorder_level: Number(reorderLevel)
        }]);
    }

    isSavingStock = false;
    resetStockInForm();
    await fetchInventory(); // Refresh the grid
  }
</script>

<div class="fixed inset-0 z-40 pointer-events-none flex items-center justify-center" style="visibility: {isOpen ? 'visible' : 'hidden'}">
  <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-500" onclick={onClose} style="opacity: {isOpen ? 1 : 0}"></div>
  
  <div class="relative w-full max-w-4xl h-[80vh] bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col pointer-events-auto transition-all duration-500 ease-out {isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'} overflow-hidden">
    
    <div class="px-8 py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
      <div>
        <h2 class="font-display font-bold text-2xl text-slate-900 tracking-tight">Pharmacy Inventory</h2>
        <p class="text-sm text-slate-500 font-medium mt-1">Manage stock and reorder levels</p>
      </div>
      <div class="flex items-center gap-4">
        {#if !isAddingStock}
          <button onclick={() => isAddingStock = true} class="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-sans font-semibold text-sm transition-all shadow-sm flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            Stock In
          </button>
        {/if}
        <button onclick={onClose} class="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-8 bg-[#FAFAFA] relative">
      
      {#if isAddingStock}
        <div class="mb-8 bg-white border border-emerald-200 shadow-sm rounded-xl p-6 animate-in slide-in-from-top-4">
          <div class="flex justify-between items-center mb-4">
             <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                New Shipment Entry
             </h3>
             <button onclick={resetStockInForm} class="text-xs font-bold text-slate-400 hover:text-slate-700 uppercase tracking-widest">Cancel</button>
          </div>
          
          <div class="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-start">
             <div class="relative">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Search DrugIndex</label>
                <input type="text" bind:value={drugSearchQuery} oninput={handleSearchInput} placeholder="Type brand or generic..." class="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition-all" />
                
                {#if drugSearchResults.length > 0 && !selectedDrug}
                  <div class="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-lg mt-1 z-50 overflow-hidden max-h-48 overflow-y-auto">
                    {#each drugSearchResults as drug}
                      <button onclick={() => selectDrug(drug)} class="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors text-sm font-bold text-slate-900">
                        {drug.name}
                      </button>
                    {/each}
                  </div>
                {/if}
             </div>
             
             <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Qty Received</label>
                <input type="number" bind:value={addQuantity} placeholder="e.g. 500" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 transition-all" />
             </div>
             
             <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Reorder Level</label>
                <input type="number" bind:value={reorderLevel} class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 transition-all" />
             </div>

             <div class="pt-6">
                <button onclick={saveStock} disabled={isSavingStock} class="h-10 bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-lg font-sans font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70">
                   {#if isSavingStock}
                      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   {:else}
                      Save
                   {/if}
                </button>
             </div>
          </div>
        </div>
      {/if}

      {#if isLoading}
        <div class="flex justify-center py-20">
           <svg class="w-8 h-8 text-slate-300 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </div>
      {:else if inventoryItems.length === 0}
        <div class="text-center py-20">
           <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
           </div>
           <h3 class="text-lg font-bold text-slate-900">Inventory Empty</h3>
           <p class="text-sm text-slate-500 font-medium mt-1">Click "Stock In" to log your first shipment.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each inventoryItems as item}
            <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
               <div class="flex justify-between items-start mb-3">
                  <h4 class="font-bold text-slate-900 pr-4 leading-tight">{item.drug_name}</h4>
                  
                  {#if item.total_stock <= 0}
                     <span class="shrink-0 bg-red-100 text-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse">Out of Stock</span>
                  {:else if item.total_stock <= item.reorder_level}
                     <span class="shrink-0 bg-amber-100 text-amber-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Low Stock</span>
                  {:else}
                     <span class="shrink-0 bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Healthy</span>
                  {/if}
               </div>
               
               <div class="flex items-end gap-3 mt-4">
                  <div>
                     <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Count</p>
                     <p class="text-2xl font-display font-bold text-slate-900">{item.total_stock}</p>
                  </div>
                  <div class="w-px h-8 bg-slate-200 mx-2"></div>
                  <div>
                     <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Reorder At</p>
                     <p class="text-lg font-display font-semibold text-slate-500">{item.reorder_level}</p>
                  </div>
               </div>
               
               <div class="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500 {item.total_stock <= item.reorder_level ? (item.total_stock <= 0 ? 'bg-red-500' : 'bg-amber-400') : 'bg-emerald-500'}" style="width: {Math.min((item.total_stock / (item.reorder_level * 3)) * 100, 100)}%;"></div>
               </div>
            </div>
          {/each}
        </div>
      {/if}

    </div>
  </div>
</div>