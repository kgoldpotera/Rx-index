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

<main class="bg-app-base overflow-hidden font-sans relative min-h-screen">
  
  <div class="absolute inset-0 z-0 pointer-events-none opacity-60">
    <DotParticleCanvas />
  </div>
  
  <div class="relative z-10">
    <HeroScroll />
  </div>

  <section class="py-10 bg-transparent flex flex-col items-center relative z-10">
    <h3 class="text-center font-sans text-xs font-bold text-rx-green/60 tracking-widest uppercase mb-8">
      Compliant with leading educational health standards
    </h3>
    <div class="flex flex-wrap justify-center items-center gap-12 md:gap-24 px-6">
      <div class="flex items-center gap-3 opacity-60 grayscale pointer-events-none">
        <svg class="w-6 h-6 text-rx-green" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path stroke-linecap="round" stroke-linejoin="round" d="M8 12l3 3 5-5"></path></svg>
        <span class="font-display font-bold text-sm tracking-widest uppercase text-rx-green">MOH Compliant</span>
      </div>
      <div class="flex items-center gap-3 opacity-60 grayscale pointer-events-none">
        <svg class="w-6 h-6 text-rx-green" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        <span class="font-display font-bold text-sm tracking-widest uppercase text-rx-green">End-to-End Encrypted</span>
      </div>
      <div class="flex items-center gap-3 opacity-60 grayscale pointer-events-none">
        <svg class="w-6 h-6 text-rx-green" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
        <span class="font-display font-bold text-sm tracking-widest uppercase text-rx-green">Local Data Residency</span>
      </div>
    </div>
  </section>

  <section id="features" bind:this={featuresSectionRef} class="relative overflow-hidden min-h-screen flex flex-col items-center justify-center bg-rx-cream py-32 px-6 z-10">
    <div class="max-w-5xl text-center relative z-10 w-full">
      <h2 class="text-heading text-4xl md:text-5xl mb-6">Offline-First Reliability.</h2>
      <p class="text-subheading text-lg md:text-xl mb-16 max-w-3xl mx-auto">
        Designed specifically for environments with unpredictable networks. RxIndex caches data locally and syncs securely when a connection is restored.
      </p>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div class="feature-card card-base relative z-10 flex flex-col items-start hover:shadow-md hover:border-rx-green/30">
          <div class="w-12 h-12 rounded-xl bg-rx-cream flex items-center justify-center mb-6 border border-rx-peach">
            <div class="w-4 h-4 rounded-full bg-rx-yellow"></div>
          </div>
          <h3 class="text-heading text-xl mb-3">Local Storage</h3>
          <p class="text-subheading text-sm">Log prescriptions and medical records instantly on the device without waiting for network requests.</p>
        </div>
        
        <div class="feature-card card-base relative z-10 flex flex-col items-start hover:shadow-md hover:border-rx-green/30">
          <div class="w-12 h-12 rounded-xl bg-rx-cream flex items-center justify-center mb-6 border border-rx-peach">
            <svg class="w-5 h-5 text-rx-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </div>
          <h3 class="text-heading text-xl mb-3">Auto-Sync</h3>
          <p class="text-subheading text-sm">Background workers encrypt and push your offline data the moment a 3G or WiFi signal is detected.</p>
        </div>
        
        <div class="feature-card card-base relative z-10 flex flex-col items-start hover:shadow-md hover:border-rx-green/30">
          <div class="w-12 h-12 rounded-xl bg-rx-cream flex items-center justify-center mb-6 border border-rx-peach">
            <svg class="w-5 h-5 text-rx-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <h3 class="text-heading text-xl mb-3">Encrypted Vault</h3>
          <p class="text-subheading text-sm">All local patient data is cryptographically secured, ensuring maximum compliance on-device.</p>
        </div>
      </div>
    </div>
  </section>

  <section id="security" class="py-32 px-6 w-full bg-white relative z-10 flex flex-col items-center border-t border-rx-peach/30">
    <div class="max-w-4xl w-full text-center mb-16">
      <h2 class="font-display text-3xl md:text-4xl font-bold text-rx-green mb-4 tracking-tight">Enterprise-Grade Security.</h2>
      <p class="font-sans text-lg text-rx-green/70 font-medium">Student health data is sensitive. RxIndex protects it with military-grade encryption and strict MOH compliance.</p>
    </div>
    <div class="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="p-8 rounded-2xl bg-rx-cream/30 border border-rx-peach/50 flex flex-col items-start">
        <div class="w-10 h-10 rounded-full bg-rx-cream flex items-center justify-center text-rx-green mb-4">
           <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <h3 class="font-display font-bold text-xl text-rx-green mb-2">End-to-End Encryption</h3>
        <p class="font-sans text-sm text-rx-green/70 leading-relaxed">All data is encrypted at rest using AES-256 and in transit via TLS 1.3. Even when offline, local IndexedDB caches are cryptographically secured.</p>
      </div>
      <div class="p-8 rounded-2xl bg-rx-cream/30 border border-rx-peach/50 flex flex-col items-start">
        <div class="w-10 h-10 rounded-full bg-rx-cream flex items-center justify-center text-rx-green mb-4">
           <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
        </div>
        <h3 class="font-display font-bold text-xl text-rx-green mb-2">Role-Based Access</h3>
        <p class="font-sans text-sm text-rx-green/70 leading-relaxed">Strict access controls ensure that only authorized nursing staff and administrators can view or modify prescription and consultation records.</p>
      </div>
    </div>
  </section>

  <!-- Pricing Section Hidden Temporarily 
  <section id="pricing" class="py-32 px-6 w-full bg-rx-cream relative z-10 flex flex-col items-center">
    <div class="max-w-3xl w-full text-center mb-16">
      <h2 class="font-display text-3xl md:text-4xl font-bold text-rx-green mb-4 tracking-tight">Simple, Transparent Pricing.</h2>
      <p class="font-sans text-lg text-rx-green/70 font-medium">Designed for educational institutions. No hidden fees, no per-student limits.</p>
    </div>
    <div class="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="bg-white rounded-3xl p-8 border border-rx-peach shadow-sm flex flex-col">
        <h3 class="font-display font-bold text-2xl text-rx-green mb-2">Campus Standard</h3>
        <p class="font-sans text-sm text-rx-green/60 mb-6">Perfect for single-campus high schools.</p>
        <div class="text-4xl font-display font-bold text-rx-green mb-8">KES 15,000<span class="text-lg text-rx-green/50 font-medium">/mo</span></div>
        <ul class="space-y-4 mb-8 flex-1">
          <li class="flex items-center gap-3 text-sm text-rx-green/80 font-medium"><svg class="w-5 h-5 text-rx-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Unlimited Student Profiles</li>
          <li class="flex items-center gap-3 text-sm text-rx-green/80 font-medium"><svg class="w-5 h-5 text-rx-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Offline-First Dispensing</li>
          <li class="flex items-center gap-3 text-sm text-rx-green/80 font-medium"><svg class="w-5 h-5 text-rx-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Basic Inventory Tracking</li>
        </ul>
        <a href="mailto:hello@rxindex.it" class="w-full py-3 rounded-xl border-2 border-rx-green text-rx-green text-center font-bold text-sm hover:bg-rx-green hover:text-white transition-colors">Get Started</a>
      </div>
      <div class="bg-rx-green rounded-3xl p-8 shadow-xl flex flex-col relative overflow-hidden">
        <div class="absolute top-0 right-0 bg-rx-yellow text-rx-green text-xs font-bold px-4 py-1 rounded-bl-xl uppercase tracking-wider">Most Popular</div>
        <h3 class="font-display font-bold text-2xl text-white mb-2">Institution Pro</h3>
        <p class="font-sans text-sm text-rx-cream/70 mb-6">For multi-campus schools and complex sanatoriums.</p>
        <div class="text-4xl font-display font-bold text-white mb-8">KES 35,000<span class="text-lg text-rx-cream/50 font-medium">/mo</span></div>
        <ul class="space-y-4 mb-8 flex-1">
          <li class="flex items-center gap-3 text-sm text-rx-cream font-medium"><svg class="w-5 h-5 text-rx-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Everything in Standard</li>
          <li class="flex items-center gap-3 text-sm text-rx-cream font-medium"><svg class="w-5 h-5 text-rx-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Automated Stock Alerts</li>
          <li class="flex items-center gap-3 text-sm text-rx-cream font-medium"><svg class="w-5 h-5 text-rx-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Parent SMS Integrations</li>
        </ul>
        <a href="mailto:hello@rxindex.it" class="w-full py-3 rounded-xl bg-rx-yellow text-rx-green text-center font-bold text-sm hover:bg-white transition-colors">Contact Sales</a>
      </div>
    </div>
  </section>
  -->

  <section id="about" class="py-32 px-6 w-full bg-rx-cream relative z-10 flex flex-col items-center border-t border-rx-peach/30">
    <div class="max-w-3xl w-full text-center">
      <h2 class="font-display text-3xl md:text-4xl font-bold text-rx-green mb-6 tracking-tight">Built for the frontline of school healthcare.</h2>
      <p class="font-sans text-lg text-rx-green/80 leading-relaxed mb-8">
        We noticed a critical flaw in existing sanatorium management software: it assumes the internet always works. In reality, school networks drop, power fluctuates, and nurses are left unable to dispense critical medication.
      </p>
      <p class="font-sans text-lg text-rx-green/80 leading-relaxed">
        RxIndex was engineered from the ground up to solve this. By prioritizing local data residency and background synchronization, we ensure that uninterrupted care is not just a promise, but a technical certainty.
      </p>
    </div>
  </section>
  <section class="min-h-screen relative overflow-hidden py-32 px-6 flex flex-col items-center z-10">
    <div class="text-center z-20 mb-16 relative w-full px-4">
      <h2 class="text-heading text-4xl md:text-5xl mb-6">Command Center for Student Health.</h2>
      <p class="text-subheading text-lg max-w-2xl mx-auto">
        A meticulously designed interface that gives nursing staff instant clarity on adherence, inventory, and automated alerts.
      </p>
    </div>

    <div bind:this={mockupRef} class="dashboard-mockup dashboard-panel w-full max-w-5xl aspect-video relative z-20 flex flex-col">
      
      <div class="h-12 w-full border-b border-rx-peach flex items-center px-6 gap-2 bg-rx-cream">
        <div class="w-3 h-3 rounded-full bg-rx-peach"></div>
        <div class="w-3 h-3 rounded-full bg-rx-peach"></div>
        <div class="w-3 h-3 rounded-full bg-rx-peach"></div>
      </div>
      
      <div class="flex-1 bg-rx-cream flex flex-col items-center justify-center relative p-8">
        
        <div class="w-10 h-10 rounded bg-rx-green mb-4 flex items-center justify-center">
           <div class="w-3 h-3 bg-white rounded-sm"></div>
        </div>
        <div class="w-48 h-8 bg-rx-green/90 rounded-md mb-2"></div>
        <div class="w-64 h-4 bg-rx-peach rounded-md mb-12"></div>

        <div class="w-full max-w-xl card-base flex items-center gap-3 mb-6 !p-3">
          <svg class="w-5 h-5 text-rx-green/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <div class="h-5 w-48 bg-rx-cream rounded"></div>
        </div>

        <div class="w-full max-w-xl card-base relative">
          <div class="flex gap-4 items-center mb-6 pb-6 border-b border-rx-peach">
            <div class="w-12 h-12 rounded-full bg-rx-cream"></div>
            <div class="flex-1">
              <div class="w-32 h-5 bg-rx-green rounded mb-2"></div>
              <div class="w-24 h-3 bg-rx-green/40 rounded"></div>
            </div>
            <div class="w-28 h-9 bg-rx-green rounded-lg"></div>
          </div>
          <div class="grid grid-cols-2 gap-6">
             <div>
                <div class="w-32 h-2 bg-rx-peach rounded mb-3"></div>
                <div class="h-20 rounded-xl bg-rx-cream border border-rx-peach p-4">
                   <div class="w-24 h-3 bg-rx-green rounded mb-2"></div>
                   <div class="w-16 h-2 bg-rx-green/40 rounded"></div>
                </div>
             </div>
             <div>
                <div class="w-32 h-2 bg-rx-peach rounded mb-3"></div>
                <div class="h-20 rounded-xl bg-rx-yellow/10 border border-rx-yellow/30 p-4">
                   <div class="w-20 h-3 bg-rx-yellow rounded mb-2"></div>
                   <div class="w-24 h-2 bg-rx-yellow/60 rounded"></div>
                </div>
             </div>
          </div>
        </div>


      </div>
    </div>
  </section>
</main>