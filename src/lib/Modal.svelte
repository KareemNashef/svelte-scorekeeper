<script lang="ts">
  import { fade } from "svelte/transition";
  import { cubicOut, backOut, expoOut } from "svelte/easing";
  import { X } from "lucide-svelte";
  import type { Snippet } from "svelte";

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: Snippet;
  }

  let { isOpen, onClose, title, children }: Props = $props();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && isOpen) {
      onClose();
    }
  }

  function modalTransition(node: Element) {
    const theme = document.body.dataset.theme || "glass";

    if (theme === "glass") {
      return {
        duration: 220,
        css: (t: number) => {
          const eased = cubicOut(t);
          return `
            opacity: ${eased};
            transform: scale(${0.92 + 0.08 * eased}) translateY(${(1 - eased) * 12}px);
          `;
        },
      };
    }

    if (theme === "baize") {
      return {
        duration: 240,
        css: (t: number) => {
          const eased = cubicOut(t);
          return `
            opacity: ${eased};
            transform: translateY(${(1 - eased) * 20}px);
          `;
        },
      };
    }

    if (theme === "paper") {
      return {
        duration: 260,
        css: (t: number) => {
          const eased = backOut(t);
          return `
            opacity: ${Math.min(1, t * 1.5)};
            transform: scale(${0.88 + 0.12 * eased}) rotate(${(1 - eased) * -2}deg);
          `;
        },
      };
    }

    // pop theme: snappy punchy drop
    return {
      duration: 170,
      css: (t: number) => {
        const eased = expoOut(t);
        return `
          opacity: ${eased};
          transform: translateY(${(1 - eased) * 16}px) scale(${0.94 + 0.06 * eased});
        `;
      },
    };
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div
    class="sheet on"
    transition:fade={{ duration: 180 }}
    onclick={(event) => event.currentTarget === event.target && onClose()}
  >
    <div
      class="box"
      transition:modalTransition
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <div class="sh">
        <h2>{title}</h2>
        <button class="x" onclick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>
      </div>
      <div class="modal-body">
        {@render children()}
      </div>
    </div>
  </div>
{/if}
