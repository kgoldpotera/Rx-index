<script>
  import { onMount } from 'svelte';

  let { 
    particleColor = "148, 163, 184", 
    animationSpeed = 0.006 
  } = $props();

  let canvas;
  let requestId;
  let time = 0;
  
  const particles = [];

  function resizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }

  function handleMouseDown(e) {
    if (!canvas) return;
    const numParticles = 25 + Math.random() * 15;

    for (let i = 0; i < numParticles; i++) {
      const angle = (Math.PI * 2 * i) / numParticles + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: e.clientX + (Math.random() - 0.5) * 10,
        y: e.clientY + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 2000 + Math.random() * 3000,
        size: 1 + Math.random() * 3,
        angle: angle,
      });
    }
  }

  function animate() {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    time += animationSpeed;
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.life += 16; 
      p.x += p.vx;
      p.y += p.vy;

      p.vy += 0.02; 
      p.vx *= 0.995; 
      p.vy *= 0.995;

      p.x += Math.sin(time + p.angle) * 0.3;
      p.y += Math.cos(time + p.angle * 0.7) * 0.2;

      const lifeProgress = p.life / p.maxLife;
      const alpha = Math.max(0, (1 - lifeProgress) * 0.8);

      if (alpha > 0) {
        ctx.fillStyle = `rgba(${particleColor}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - lifeProgress * 0.3), 0, 2 * Math.PI);
        ctx.fill();
      }

      if (
        p.life >= p.maxLife ||
        p.x < -50 || p.x > canvas.clientWidth + 50 ||
        p.y < -50 || p.y > canvas.clientHeight + 50
      ) {
        particles.splice(i, 1);
      }
    }
    requestId = requestAnimationFrame(animate);
  }

  onMount(() => {
    resizeCanvas();
    animate();
    return () => {
      if (requestId) cancelAnimationFrame(requestId);
      particles.length = 0;
    };
  });
</script>

<svelte:window onresize={resizeCanvas} onmousedown={handleMouseDown} />

<canvas 
  bind:this={canvas} 
  class="fixed inset-0 w-full h-full z-0 select-none outline-none pointer-events-none"
></canvas>