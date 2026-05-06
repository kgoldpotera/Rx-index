<script>
  import Logo from '$lib/components/Logo.svelte';
</script>

<header class="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-rx-peach/60 transition-all duration-300">
  <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
    
    <div class="flex items-center gap-2 cursor-pointer">
      <Logo class="w-8 h-8" cutoutColor="#ffffff" />
      <span class="text-heading text-2xl">RxIndex</span>
    </div>

    <nav class="hidden md:flex items-center gap-8">
      <a href="#features" class="font-sans text-sm font-semibold text-rx-green/70 hover:text-rx-green transition-colors">Features</a>
      <a href="#security" class="font-sans text-sm font-semibold text-rx-green/70 hover:text-rx-green transition-colors">Security</a>
      <!-- <a href="#pricing" class="font-sans text-sm font-semibold text-rx-green/70 hover:text-rx-green transition-colors">Pricing</a> -->
      <a href="#about" class="font-sans text-sm font-semibold text-rx-green/70 hover:text-rx-green transition-colors">About</a>
    </nav>

    <div class="flex items-center gap-4">
      <a href="/app" class="hidden md:block font-sans text-sm font-bold text-rx-green hover:text-rx-green/70 transition-colors px-4">
        Sign In
      </a>
      <a href="mailto:hello@rxindex.it?subject=Demo Request" class="btn-primary !rounded-full hover:-translate-y-0.5 inline-block">
        Request Demo
      </a>
    </div>

  </div>
</header>