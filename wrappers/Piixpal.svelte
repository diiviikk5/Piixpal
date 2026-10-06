<!-- Svelte: drop this anywhere once (e.g. in your root layout) and use the tags freely.
     <Piixpal />  then  <h1>Hello <piix-pal pal="bitbug"></piix-pal></h1> -->
<script>
  import { onMount } from 'svelte';
  import { loadPiixpal } from './load.js';
  export let src = undefined;
  onMount(() => { loadPiixpal(src); });
</script>
