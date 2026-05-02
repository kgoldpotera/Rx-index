<script>
  let { class: className = "w-10 h-10", cutoutColor = "#ffffff" } = $props();
</script>

<svg viewBox="0 0 110 60" fill="none" xmlns="http://www.w3.org/2000/svg" class={className}>
  <!-- Left Ring -->
  <circle cx="40" cy="30" r="20" stroke="#064124" stroke-width="8" />
  
  <!-- Right Ring -->
  <circle cx="70" cy="30" r="20" stroke="#10b981" stroke-width="8" />

  <!-- Pill in the center -->
  <g transform="translate(55, 30) rotate(-40)">
    <!-- Pill Background Cutout -->
    <rect x="-21" y="-13" width="42" height="26" rx="13" fill={cutoutColor} />
    
    <!-- Pill Left/Bottom Half (Dark Green) -->
    <path d="M -16 -8 L 0 -8 L 0 8 L -16 8 A 8 8 0 0 1 -16 -8 Z" fill="#064124" />
    
    <!-- Pill Right/Top Half (Light Green) -->
    <path d="M 0 -8 L 16 -8 A 8 8 0 0 1 16 8 L 0 8 Z" fill="#10b981" />
    
    <!-- Highlight -->
    <path d="M 3 -3 L 9 -3" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </g>
</svg>
