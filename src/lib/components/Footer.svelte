<script>
  import Logo from '$lib/components/Logo.svelte';
</script>

<footer class="bg-rx-green py-20">
  <div class="max-w-7xl mx-auto px-6">
    
    <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
      
      <div class="col-span-1 md:col-span-1">
        <div class="flex items-center gap-2 mb-6">
          <Logo class="w-8 h-8" cutoutColor="#064124" />
          <span class="font-display text-2xl font-bold text-rx-cream tracking-tight">RxIndex</span>
        </div>
        <p class="font-sans text-sm leading-relaxed text-rx-cream/70 mb-6 max-w-xs font-normal">
          The definitive offline-first platform for high school sanatoriums. Secure, reliable, and compliant.
        </p>
      </div>

      <div>
        <h4 class="font-display text-rx-cream font-bold tracking-tight mb-6">Product</h4>
        <ul class="space-y-4 font-sans text-sm text-rx-cream/70 font-medium">
          <li><a href="#" class="hover:text-white transition-colors">Web App</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Offline Client</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Developer API</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Integrations</a></li>
        </ul>
      </div>

      <div>
        <h4 class="font-display text-rx-cream font-bold tracking-tight mb-6">Compliance</h4>
        <ul class="space-y-4 font-sans text-sm text-rx-cream/70 font-medium">
          <li><a href="#" class="hover:text-white transition-colors">MOH Standards</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Data Privacy</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Encryption</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Security Overview</a></li>
        </ul>
      </div>

      <div>
        <h4 class="font-display text-rx-cream font-bold tracking-tight mb-6">Company</h4>
        <ul class="space-y-4 font-sans text-sm text-rx-cream/70 font-medium">
          <li><a href="#" class="hover:text-white transition-colors">About Us</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Contact Support</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Partners</a></li>
        </ul>
      </div>

    </div>

    <div class="pt-8 border-t border-rx-peach/30 flex flex-col md:flex-row items-center justify-between gap-4">
      <p class="font-sans text-sm text-rx-cream/70 font-normal">© 2026 RxIndex. All rights reserved.</p>
      
      <div class="flex items-center gap-2 font-sans text-sm font-semibold text-rx-cream bg-rx-green/50 py-2 px-4 rounded-full border border-rx-peach/30">
        <svg class="w-4 h-4 text-rx-peach" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd"></path></svg>
        SOC2 & HIPAA Compliant
      </div>
    </div>

  </div>
</footer>