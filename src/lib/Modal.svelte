<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { X } from "lucide-svelte";

  // Svelte 5 Props
  let { isOpen, onClose, title, children } = $props<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: any;
  }>();
</script>

{#if isOpen}
  <!-- Removed items-end to enforce centered display everywhere, prevents off-screen push -->
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      transition:fade={{ duration: 200 }}
      onclick={onClose}
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      aria-hidden="true"
    ></div>

    <!-- Modal Content: Material + Glassmorphism enforced -->
    <div
      transition:scale={{ start: 0.95, duration: 250 }}
      class="w-full max-w-md relative z-10 overflow-hidden flex flex-col
             bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl
             rounded-[2rem] max-h-[85dvh]"
    >
      <!-- Header (sticky) -->
      <div
        class="flex justify-between items-center p-5 pb-3 flex-shrink-0 border-b border-white/10 bg-black/10"
      >
        <h3 class="text-xl font-black tracking-tight text-white">{title}</h3>
        <button
          onclick={onClose}
          class="p-2 bg-white/5 hover:bg-white/20 rounded-full transition-all flex-shrink-0 border border-white/10 text-white shadow-sm"
        >
          <X size={18} />
        </button>
      </div>

      <!-- Scrollable body (Fully respects internal flex shrinking) -->
      <div
        class="overflow-y-auto overscroll-contain flex-1 p-5 scrollbar-hide text-white"
      >
        {@render children()}
      </div>
    </div>
  </div>
{/if}
