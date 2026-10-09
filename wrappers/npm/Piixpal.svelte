<!-- Svelte, from npm: put <Piixpal /> in your root layout once, then use the tags freely.
     import Piixpal from 'piixpal/svelte'
     <h1>Hello <piix-pal pal="bitbug"></piix-pal></h1> -->
<script>
  import { onMount } from 'svelte';
  import { loadPiixpal } from './load.js';
  onMount(() => { loadPiixpal(); });
</script>
