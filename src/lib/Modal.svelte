<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { X } from 'lucide-svelte';

  // Svelte 5 Props
  let { isOpen, onClose, title, children } = $props<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: any;
  }>();
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      transition:fade={{ duration: 200 }}
      onclick={onClose}
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
    ></div>
    
    <!-- Modal Content -->
    <div
      transition:fly={{ y: 20, duration: 300, opacity: 0 }}
      class="glass-card w-full max-w-md relative z-10 overflow-hidden"
    >
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold tracking-tight">{title}</h3>
        <button onclick={onClose} class="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>
      {@render children()}
    </div>
  </div>
{/if}