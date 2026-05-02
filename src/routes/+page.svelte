<script>
  import HeroScroll from '$lib/components/HeroScroll.svelte';
  import DotParticleCanvas from '$lib/components/DotParticleCanvas.svelte'; // Reusing your premium app background
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

  if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  let featuresSectionRef;
  let mockupRef;

  onMount(() => {
    const ctx = gsap.context(() => {
      // Keeping your exact original scroll animations!
      gsap.fromTo('.feature-card', 
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.15, scrollTrigger: { trigger: featuresSectionRef, start: 'top 80%' } }
      );
      gsap.fromTo('.dashboard-mockup',
        { y: 150, scale: 0.95, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: mockupRef, start: 'top 85%' } }
      );
    });
    return () => ctx.revert();
  });
</script>

<svelte:head>
  <title>RxIndex | Smart Sanatorium Management</title>
</svelte:head>

<main class="bg-[#FAFAFA] overflow-hidden font-sans relative min-h-screen text-slate-900">
  
  <div class="absolute inset-0 z-0 pointer-events-none opacity-60">
    <DotParticleCanvas />
  </div>
  
  <div class="relative z-10">
    <HeroScroll />
  </div>

  <section class="py-10 bg-white border-y border-slate-200 flex flex-col items-center relative z-10">
    <h3 class="text-center font-sans text-xs font-bold text-slate-400 tracking-widest uppercase mb-8">
      Compliant with leading educational health standards
    </h3>
    <div class="flex flex-wrap justify-center items-center gap-12 md:gap-24 px-6">
      <div class="flex items-center gap-3 opacity-60 grayscale pointer-events-none">
        <svg class="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path stroke-linecap="round" stroke-linejoin="round" d="M8 12l3 3 5-5"></path></svg>
        <span class="font-display font-bold text-sm tracking-widest uppercase text-slate-900">MOH Compliant</span>
      </div>
      <div class="flex items-center gap-3 opacity-60 grayscale pointer-events-none">
        <svg class="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        <span class="font-display font-bold text-sm tracking-widest uppercase text-slate-900">End-to-End Encrypted</span>
      </div>
      <div class="flex items-center gap-3 opacity-60 grayscale pointer-events-none">
        <svg class="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
        <span class="font-display font-bold text-sm tracking-widest uppercase text-slate-900">Local Data Residency</span>
      </div>
    </div>
  </section>

  <section bind:this={featuresSectionRef} class="relative overflow-hidden min-h-screen flex flex-col items-center justify-center bg-transparent py-32 px-6 z-10">
    <div class="max-w-5xl text-center relative z-10 w-full">
      <h2 class="font-display text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight leading-tight">Offline-First Reliability.</h2>
      <p class="font-sans text-lg md:text-xl text-slate-500 mb-16 max-w-3xl mx-auto font-medium leading-relaxed">
        Designed specifically for environments with unpredictable networks. RxIndex caches data locally and syncs securely when a connection is restored.
      </p>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div class="feature-card bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-8 rounded-2xl relative z-10 flex flex-col items-start">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6 border border-emerald-100">
            <div class="w-4 h-4 rounded-full bg-emerald-500"></div>
          </div>
          <h3 class="font-display text-xl font-bold text-slate-900 mb-3 tracking-tight">Local Storage</h3>
          <p class="font-sans text-sm text-slate-500 font-medium leading-relaxed">Log prescriptions and medical records instantly on the device without waiting for network requests.</p>
        </div>
        
        <div class="feature-card bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-8 rounded-2xl relative z-10 flex flex-col items-start">
          <div class="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-6 border border-slate-200">
            <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </div>
          <h3 class="font-display text-xl font-bold text-slate-900 mb-3 tracking-tight">Auto-Sync</h3>
          <p class="font-sans text-sm text-slate-500 font-medium leading-relaxed">Background workers encrypt and push your offline data the moment a 3G or WiFi signal is detected.</p>
        </div>
        
        <div class="feature-card bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-8 rounded-2xl relative z-10 flex flex-col items-start">
          <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6 border border-blue-100">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <h3 class="font-display text-xl font-bold text-slate-900 mb-3 tracking-tight">Encrypted Vault</h3>
          <p class="font-sans text-sm text-slate-500 font-medium leading-relaxed">All local patient data is cryptographically secured, ensuring maximum compliance on-device.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="min-h-screen relative overflow-hidden py-32 px-6 flex flex-col items-center z-10">
    <div class="text-center z-20 mb-16 relative w-full px-4">
      <h2 class="font-display text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight leading-tight">Command Center for Student Health.</h2>
      <p class="font-sans text-lg text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
        A meticulously designed interface that gives nursing staff instant clarity on adherence, inventory, and automated alerts.
      </p>
    </div>

    <div bind:this={mockupRef} class="dashboard-mockup w-full max-w-5xl aspect-video relative z-20 bg-white border border-slate-200 rounded-[2rem] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col">
      
      <div class="h-12 w-full border-b border-slate-100 flex items-center px-6 gap-2 bg-[#FAFAFA]">
        <div class="w-3 h-3 rounded-full bg-slate-300"></div>
        <div class="w-3 h-3 rounded-full bg-slate-300"></div>
        <div class="w-3 h-3 rounded-full bg-slate-300"></div>
      </div>
      
      <div class="flex-1 bg-[#FAFAFA] flex flex-col items-center justify-center relative p-8">
        
        <div class="w-10 h-10 rounded bg-slate-900 mb-4 flex items-center justify-center">
           <div class="w-3 h-3 bg-white rounded-sm"></div>
        </div>
        <div class="w-48 h-8 bg-slate-800 rounded-md mb-2"></div>
        <div class="w-64 h-4 bg-slate-300 rounded-md mb-12"></div>

        <div class="w-full max-w-xl bg-white border border-slate-200 shadow-sm rounded-xl p-3 flex items-center gap-3 mb-6">
          <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <div class="h-5 w-48 bg-slate-100 rounded"></div>
        </div>

        <div class="w-full max-w-xl bg-white border border-slate-200 shadow-md rounded-2xl p-6 relative">
          <div class="flex gap-4 items-center mb-6 pb-6 border-b border-slate-100">
            <div class="w-12 h-12 rounded-full bg-slate-100"></div>
            <div class="flex-1">
              <div class="w-32 h-5 bg-slate-800 rounded mb-2"></div>
              <div class="w-24 h-3 bg-slate-400 rounded"></div>
            </div>
            <div class="w-28 h-9 bg-slate-900 rounded-lg"></div>
          </div>
          <div class="grid grid-cols-2 gap-6">
             <div>
                <div class="w-32 h-2 bg-slate-200 rounded mb-3"></div>
                <div class="h-20 rounded-xl bg-slate-50 border border-slate-100 p-4">
                   <div class="w-24 h-3 bg-slate-800 rounded mb-2"></div>
                   <div class="w-16 h-2 bg-slate-400 rounded"></div>
                </div>
             </div>
             <div>
                <div class="w-32 h-2 bg-slate-200 rounded mb-3"></div>
                <div class="h-20 rounded-xl bg-red-50 border border-red-100 p-4">
                   <div class="w-20 h-3 bg-red-800 rounded mb-2"></div>
                   <div class="w-24 h-2 bg-red-400 rounded"></div>
                </div>
             </div>
          </div>
        </div>

        <div class="absolute bottom-8 bg-white/80 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-full px-2 py-2 flex items-center gap-1">
          <div class="w-10 h-10 rounded-full bg-slate-100"></div>
          <div class="w-10 h-10 rounded-full bg-transparent"></div>
          <div class="w-10 h-10 rounded-full bg-transparent"></div>
          <div class="w-px h-6 bg-slate-200 mx-1"></div>
          <div class="w-10 h-10 rounded-full bg-transparent flex items-center justify-center">
             <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
          </div>
        </div>

      </div>
    </div>
  </section>
</main>