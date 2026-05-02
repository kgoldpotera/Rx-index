<script>
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

  let sectionRef;
  let canvasRef;
  let card1, card2, card3, card4;
  
  const frameCount = 150;
  const images = [];
  let imagesLoaded = 0;

  onMount(() => {
    gsap.registerPlugin(ScrollTrigger);

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      img.src = `/sequence/ezgif-frame-${String(i).padStart(3, '0')}.jpg`; 
      
      img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === 1) renderFrame(0); 
      };
      images.push(img);
    }

    function renderFrame(index) {
      if (!images[index] || !canvasRef) return;
      const img = images[index];
      const context = canvasRef.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      
      canvasRef.width = window.innerWidth * dpr;
      canvasRef.height = window.innerHeight * dpr;
      context.scale(dpr, dpr);

      const scale = Math.max(window.innerWidth / img.width, window.innerHeight / img.height);
      const x = (window.innerWidth / 2) - (img.width / 2) * scale;
      const y = (window.innerHeight / 2) - (img.height / 2) * scale;
      
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      context.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

    const seq = { frame: 0 };
    const handleResize = () => renderFrame(Math.round(seq.frame));
    window.addEventListener('resize', handleResize);

    let ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: sectionRef, pin: true, scrub: 0.5, start: "top top", end: "+=4000" }
      });

      tl.to(seq, { frame: frameCount - 1, snap: "frame", ease: "none", onUpdate: () => renderFrame(Math.round(seq.frame)) }, 0);
      tl.to(card1, { opacity: 0, y: -50, duration: 0.1 }, 0.05);
      tl.fromTo(card2, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.1 }, 0.15).to(card2, { opacity: 0, y: -50, duration: 0.1 }, 0.4);
      tl.fromTo(card3, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.1 }, 0.5).to(card3, { opacity: 0, y: -50, duration: 0.1 }, 0.75);
      tl.fromTo(card4, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.1 }, 0.85);

    }, sectionRef);

    return () => {
      ctx.revert();
      window.removeEventListener('resize', handleResize);
    };
  });
</script>

<section bind:this={sectionRef} class="relative w-full h-screen bg-white overflow-hidden font-sans">
  <canvas bind:this={canvasRef} class="absolute inset-0 w-full h-full z-0"></canvas>
  
  <div bind:this={card1} class="absolute inset-0 m-auto flex flex-col justify-center items-center text-center z-20 pointer-events-none px-6 pt-32 pb-16 w-full">
    <h1 class="font-display text-5xl md:text-7xl font-bold text-rx-green tracking-tight mb-6 leading-[1.1]">
      Care without compromise.
    </h1>
    <p class="font-sans text-lg md:text-xl text-rx-green/80 max-w-xl mx-auto font-medium mb-10 leading-relaxed">
      The offline-first application for modern school sanatoriums.
    </p>
    <a href="/app" class="bg-rx-green hover:opacity-90 text-white px-8 py-3.5 rounded-xl font-sans font-bold text-sm transition-all shadow-sm pointer-events-auto">
      Enter Workspace
    </a>
  </div>

  <div bind:this={card2} class="absolute top-1/3 left-6 md:left-24 z-10 opacity-0 pointer-events-none bg-white/60 backdrop-blur-3xl border border-rx-peach/60 rounded-[2rem] shadow-2xl p-10 max-w-sm">
    <h2 class="text-heading text-3xl mb-3">Smart Dispensing.</h2>
    <p class="text-subheading text-lg">Eliminate manual errors with automated, offline-first prescription logging designed for secure environments.</p>
  </div>

  <div bind:this={card3} class="absolute top-1/3 right-6 md:right-24 z-10 opacity-0 pointer-events-none bg-white/60 backdrop-blur-3xl border border-rx-peach/60 rounded-[2rem] shadow-2xl p-10 max-w-sm">
    <h2 class="text-heading text-3xl mb-3">Continuous Adherence.</h2>
    <p class="text-subheading text-lg">Track every dose. Our system ensures students never miss critical medication, even when the network drops.</p>
  </div>

  <div bind:this={card4} class="absolute bottom-16 left-0 right-0 mx-auto z-10 opacity-0 pointer-events-none bg-white/60 backdrop-blur-3xl border border-rx-peach/60 rounded-[2rem] shadow-2xl p-10 max-w-md text-center flex flex-col items-center">
    <h2 class="text-heading text-3xl mb-3">RxIndex Secured.</h2>
    <p class="text-subheading text-lg">Cryptographically verified. Real-time API drug verification syncs the moment you are back online.</p>
    <div class="w-4 h-4 rounded-full bg-rx-green mt-6 shadow-[0_0_20px_rgba(6,65,36,0.5)]"></div>
  </div>
</section>