<script>
  import '../app.css';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { page } from '$app/stores';
  
  let { children } = $props();
</script>

{#if $page.url.pathname.startsWith('/app')}
  {@render children()}
{:else}
  <div class="flex flex-col min-h-screen">
    <Header />
    
    <main class="flex-grow pt-20">
      {@render children()}
    </main>
    
    <Footer />
  </div>
{/if}
