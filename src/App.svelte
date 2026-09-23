<script lang="ts">
  import { onMount } from "svelte";
  import { fade, fly, scale } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { CARD_VALUES, THEMES } from "./lib/constants";
  import type { Player, Round, Theme, Group, AppSettings } from "./lib/types";
  import Modal from "./lib/Modal.svelte";

  import {
    Users,
    History,
    Settings as SettingsIcon,
    Plus,
    Trash2,
    ChevronRight,
    Trophy,
    RotateCcw,
    UserPlus,
    Check,
    X,
    CreditCard,
    Crown,
    Edit2,
    Layers,
    FolderPlus,
    ArrowRightLeft,
  } from "lucide-svelte";

  // --- STATE (Runes) ---
  let activeTab = $state<"players" | "history" | "settings">("players");
  let groups = $state<Group[]>([]);
  let settings = $state<AppSettings>({
    winnerScore: -30,
    theme: "vibrant",
    currentGroupId: "",
  });

  // Derived state
  let currentGroup = $derived(
    groups.find((g) => g.id === settings.currentGroupId) || null,
  );
  let players = $derived(currentGroup?.players || []);
  let rounds = $derived(currentGroup?.rounds || []);
  let theme = $derived(settings.theme);

  // Modals & Temp States
  let isAddPlayerOpen = $state(false);
  let isRenamePlayerOpen = $state(false);
  let isDeleteConfirmOpen = $state(false);
  let isScoreDialogOpen = $state(false);
  let isAddGroupOpen = $state(false);
  let isRenameGroupOpen = $state(false);
  let isDeleteGroupOpen = $state(false);
  let isFullResetOpen = $state(false);

  let selectedPlayerId = $state<string | null>(null);
  let playerToEdit = $state<Player | null>(null);
  let playerToDelete = $state<Player | null>(null);
  let groupToEdit = $state<Group | null>(null);
  let groupToDelete = $state<Group | null>(null);

  // Input binds
  let inputName = $state("");
  let tempScores = $state<Record<string, number>>({});
  let isHand = $state(false);
  let winnerId = $state<string | null>(null);
  let selectedCards = $state<number[]>([]);
  let manualScoreInput = $state<number | null>(null);

  // Page title derived from activeTab
  let pageTitle = $derived(
    activeTab === "players"
      ? "SCOREKEEPER"
      : activeTab === "history"
        ? "SCORE HISTORY"
        : "SETTINGS",
  );

  // Load Data on Mount
  let mounted = $state(false);
  onMount(() => {
    const savedGroups = localStorage.getItem("rummy_groups_v2");
    const savedSettings = localStorage.getItem("rummy_settings_v2");

    if (savedGroups) {
      groups = JSON.parse(savedGroups);
    } else {
      const initialGroup: Group = {
        id: "default",
        name: "Main Session",
        players: [],
        rounds: [],
        createdAt: Date.now(),
      };
      groups = [initialGroup];
      settings.currentGroupId = "default";
    }

    if (savedSettings) {
      settings = JSON.parse(savedSettings);
    }
    mounted = true;
  });

  // Auto-Save Effect
  $effect(() => {
    if (mounted && groups.length > 0) {
      localStorage.setItem("rummy_groups_v2", JSON.stringify(groups));
    }
    if (mounted) {
      localStorage.setItem("rummy_settings_v2", JSON.stringify(settings));
    }
  });

  // --- Helper Functions ---
  function updateCurrentGroup(updates: Partial<Group>) {
    groups = groups.map((g) =>
      g.id === settings.currentGroupId ? { ...g, ...updates } : g,
    );
  }

  function addPlayer() {
    if (!inputName.trim()) return;
    const newPlayer: Player = {
      id: Math.random().toString(36).substring(2, 9),
      name: inputName.trim(),
    };
    updateCurrentGroup({ players: [...players, newPlayer] });
    isAddPlayerOpen = false;
    inputName = "";
  }

  function renamePlayer() {
    if (!inputName.trim() || !playerToEdit) return;
    updateCurrentGroup({
      players: players.map((p) =>
        p.id === playerToEdit!.id ? { ...p, name: inputName.trim() } : p,
      ),
    });
    isRenamePlayerOpen = false;
    playerToEdit = null;
  }

  function removePlayer() {
    if (!playerToDelete) return;
    updateCurrentGroup({
      players: players.filter((p) => p.id !== playerToDelete!.id),
    });
    isDeleteConfirmOpen = false;
    playerToDelete = null;
  }

  function addGroup() {
    if (!inputName.trim()) return;
    const newGroup: Group = {
      id: Math.random().toString(36).substring(2, 9),
      name: inputName.trim(),
      players: [],
      rounds: [],
      createdAt: Date.now(),
    };
    groups = [...groups, newGroup];
    settings.currentGroupId = newGroup.id;
    isAddGroupOpen = false;
    inputName = "";
  }

  function renameGroup() {
    if (!inputName.trim() || !groupToEdit) return;
    groups = groups.map((g) =>
      g.id === groupToEdit!.id ? { ...g, name: inputName.trim() } : g,
    );
    isRenameGroupOpen = false;
    groupToEdit = null;
  }

  function deleteGroup(id: string) {
    if (groups.length <= 1) return;
    groups = groups.filter((g) => g.id !== id);
    if (settings.currentGroupId === id) settings.currentGroupId = groups[0].id;
    isDeleteGroupOpen = false;
    groupToDelete = null;
  }

  function confirmDeleteGroup(group: Group) {
    groupToDelete = group;
    isDeleteGroupOpen = true;
  }

  function resetGame() {
    localStorage.clear();
    window.location.reload();
  }

  function openScoreDialog(playerId: string) {
    selectedPlayerId = playerId;
    selectedCards = [];
    manualScoreInput = null;
    isScoreDialogOpen = true;
  }

  function applyCardScore() {
    if (selectedPlayerId) {
      let total = selectedCards.reduce((a, b) => a + b, 0);
      if (manualScoreInput !== null) total = manualScoreInput; // Override if manual typed
      tempScores = { ...tempScores, [selectedPlayerId]: total };
      isScoreDialogOpen = false;
    }
  }

  let playerRanks = $derived.by(() => {
    const scores = players.map((p) => ({
      id: p.id,
      total: calculateTotalScore(p.id),
    }));
    scores.sort((a, b) => a.total - b.total);
    const ranks: Record<string, number> = {};
    scores.forEach((s, i) => {
      ranks[s.id] = i + 1;
    });
    return ranks;
  });

  function calculateTotalScore(playerId: string) {
    return rounds.reduce(
      (total, round) => total + (round.scores[playerId] || 0),
      0,
    );
  }

  function getRankColor(rank: number) {
    return rank === 1 ? "text-yellow-400" : "text-white/60";
  }
  function getRankBg(rank: number) {
    return rank === 1
      ? "bg-yellow-400/10 border-yellow-400/20"
      : "bg-white/5 border-white/10";
  }

  function calculateRoundChange(playerId: string) {
    if (!winnerId) return 0;
    if (playerId === winnerId)
      return isHand ? settings.winnerScore * 2 : settings.winnerScore;
    const points = tempScores[playerId] || 0;
    return isHand ? points * 2 : points;
  }

  function handleAdvanceRound() {
    if (!winnerId || players.length < 2) return;
    const roundScores: Record<string, number> = {};

    players.forEach((player) => {
      if (player.id === winnerId) {
        roundScores[player.id] = isHand
          ? settings.winnerScore * 2
          : settings.winnerScore;
      } else {
        const points = tempScores[player.id] || 0;
        roundScores[player.id] = isHand ? points * 2 : points;
      }
    });

    const newRound: Round = {
      id: rounds.length + 1,
      scores: roundScores,
      isHand,
      winnerId,
    };
    updateCurrentGroup({ rounds: [...rounds, newRound] });
    tempScores = {};
    winnerId = null;
    isHand = false;
  }

  function undoLastRound() {
    if (rounds.length === 0) return;
    updateCurrentGroup({ rounds: rounds.slice(0, -1) });
  }

  const winnerScoreOptions = [0, -30, -50, -100];
</script>

<!-- Svelte Snippet for beautiful Segmented Control Nav -->
{#snippet tabButton(id: typeof activeTab, IconComponent: any, label: string)}
  <button
    onclick={() => (activeTab = id)}
    class="flex-1 flex flex-col items-center justify-center py-2.5 rounded-[1rem] transition-all duration-300 relative border backdrop-blur-sm {activeTab ===
    id
      ? 'bg-white/15 text-white border-white/30 shadow-lg'
      : 'bg-transparent text-white/50 border-transparent hover:text-white/90 hover:bg-white/5'}"
  >
    <IconComponent size={20} class="mb-1" />
    <span class="text-[10px] uppercase tracking-widest font-black">{label}</span
    >
  </button>
{/snippet}

<!-- Background Gradient (Fixed to prevent bottom cutoff!) -->
<div
  class="fixed inset-0 z-[-1] bg-gradient-to-br {THEMES[theme as Theme] ||
    'from-gray-900 to-black'} transition-colors duration-1000"
></div>

<div class="min-h-[100dvh] flex flex-col font-sans text-white">
  <!-- Header with Prominent Title Above the Appbar -->
  <header
    class="w-full pt-8 pb-3 px-6 max-w-2xl mx-auto flex items-center justify-between z-40 relative"
  >
    <div class="flex items-center gap-3.5">
      <div
        class="p-2.5 rounded-[1rem] bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl"
      >
        <Trophy class="text-yellow-400" size={24} />
      </div>
      <h1
        class="text-xl font-black tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 drop-shadow-sm"
      >
        {pageTitle}
      </h1>
    </div>
  </header>

  <!-- Modern Floating App Bar -->
  <nav class="sticky top-4 z-40 px-4 w-full max-w-2xl mx-auto mb-6">
    <div
      class="flex gap-1 p-1.5 rounded-[1.25rem] bg-black/20 backdrop-blur-2xl border border-white/10 shadow-2xl"
    >
      {@render tabButton("players", Users, "Players")}
      {@render tabButton("history", History, "History")}
      {@render tabButton("settings", SettingsIcon, "Settings")}
    </div>
  </nav>

  <!-- Main Content Wrapper using Grid to perfectly stack fading content -->
  <main
    class="flex-1 px-4 pb-12 w-full max-w-2xl mx-auto grid grid-cols-1 grid-rows-1 items-start relative z-10"
  >
    <!-- PLAYERS TAB -->
    {#if activeTab === "players"}
      <div
        transition:fade={{ duration: 200 }}
        class="col-start-1 row-start-1 w-full space-y-5"
      >
        <!-- Round Controls Glass Card -->
        <div
          class="p-5 rounded-[1.5rem] bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl"
        >
          <div class="flex items-center justify-between mb-5">
            <h2
              class="text-lg font-black tracking-tight flex items-center gap-2 text-white"
            >
              Round {rounds.length + 1}
            </h2>
            <button
              onclick={undoLastRound}
              disabled={rounds.length === 0}
              class="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl disabled:opacity-30 transition-all text-white"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          <div class="space-y-3">
            <button
              onclick={() => (isHand = !isHand)}
              class="w-full py-4 rounded-[1rem] font-black text-sm tracking-widest transition-all duration-500 border backdrop-blur-md {isHand
                ? 'bg-yellow-400/20 text-yellow-300 border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.2)]'
                : 'bg-black/20 text-white/80 border-white/10 hover:bg-white/10'}"
            >
              {isHand ? "HAND ROUND (2x)" : "REGULAR ROUND"}
            </button>
            <button
              onclick={handleAdvanceRound}
              disabled={!winnerId || players.length < 2}
              class="w-full py-4 rounded-[1rem] bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:bg-white/50 flex items-center justify-center gap-2 font-black tracking-tighter shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all active:scale-95"
            >
              FINISH ROUND <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <!-- Players List -->
        <div class="space-y-3">
          <div class="flex justify-between items-end px-1 mb-2">
            <h2
              class="text-xs font-black text-white/50 uppercase tracking-widest"
            >
              Active Players
            </h2>
            <button
              onclick={() => {
                inputName = "";
                isAddPlayerOpen = true;
              }}
              class="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold transition-all shadow-sm"
            >
              <Plus size={14} /> Add New
            </button>
          </div>

          {#if players.length === 0}
            <div
              class="p-10 rounded-[1.5rem] border border-white/10 bg-white/5 backdrop-blur-md text-center opacity-60 border-dashed"
            >
              <UserPlus class="mx-auto mb-3 text-white" size={36} />
              <p class="text-sm font-bold tracking-wide">
                No players in this session
              </p>
            </div>
          {:else}
            <div class="space-y-3">
              {#each players as player, index (player.id)}
                {@const isWinner = winnerId === player.id}
                {@const roundChange = calculateRoundChange(player.id)}
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <div
                  animate:flip={{ duration: 400 }}
                  transition:fly={{ y: 20, duration: 300, delay: index * 50 }}
                  onclick={() => !isWinner && openScoreDialog(player.id)}
                  class="p-4 rounded-[1.5rem] flex items-center justify-between group cursor-pointer transition-all duration-500 bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg hover:bg-white/20 hover:scale-[1.01] {isWinner
                    ? '!bg-emerald-500/20 !border-emerald-400/50 !shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : ''}"
                >
                  <div class="flex items-center gap-4">
                    <button
                      onclick={(e) => {
                        e.stopPropagation();
                        winnerId = isWinner ? null : player.id;
                      }}
                      class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 flex-shrink-0 shadow-inner {isWinner
                        ? 'bg-emerald-500 text-white shadow-emerald-500/50 scale-110'
                        : 'bg-black/20 text-white/50 border border-white/10 group-hover:text-white group-hover:bg-white/10'}"
                    >
                      {#if isWinner}
                        <Crown size={24} />
                      {:else}
                        <div class="text-lg font-black">{index + 1}</div>
                      {/if}
                    </button>
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="font-black text-lg text-white">
                          {player.name}
                        </h3>
                        <button
                          onclick={(e) => {
                            e.stopPropagation();
                            playerToEdit = player;
                            inputName = player.name;
                            isRenamePlayerOpen = true;
                          }}
                          class="p-1.5 rounded-lg bg-white/5 hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-all text-white/70"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                      <p
                        class="text-white/50 text-[10px] font-bold uppercase tracking-widest"
                      >
                        Change
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <div class="text-right">
                      {#key roundChange}
                        <div
                          in:scale={{ duration: 300 }}
                          class="text-2xl font-black tracking-tighter drop-shadow-sm {roundChange <
                          0
                            ? 'text-emerald-400'
                            : roundChange > 0
                              ? 'text-red-400'
                              : 'text-white/50'}"
                        >
                          {roundChange > 0
                            ? `+${roundChange}`
                            : roundChange === 0
                              ? "0"
                              : roundChange}
                        </div>
                      {/key}
                      <div
                        class="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-0.5"
                      >
                        Total: {calculateTotalScore(player.id)}
                      </div>
                    </div>
                    <div
                      class="p-2.5 rounded-2xl transition-all duration-500 {isWinner
                        ? 'bg-emerald-500/30 text-emerald-300'
                        : 'bg-white/5 text-white/50 group-hover:bg-white/10 group-hover:text-white'}"
                    >
                      <CreditCard size={20} />
                    </div>
                    <button
                      onclick={(e) => {
                        e.stopPropagation();
                        playerToDelete = player;
                        isDeleteConfirmOpen = true;
                      }}
                      class="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- HISTORY TAB -->
    {#if activeTab === "history"}
      <div
        transition:fade={{ duration: 200 }}
        class="col-start-1 row-start-1 w-full space-y-4"
      >
        {#if rounds.length === 0}
          <div
            class="p-10 rounded-[1.5rem] border border-white/10 bg-white/5 backdrop-blur-md text-center opacity-60 border-dashed"
          >
            <History class="mx-auto mb-4 text-white" size={48} />
            <p class="font-bold tracking-wide">No rounds played yet</p>
          </div>
        {:else}
          <div
            class="overflow-x-auto rounded-[1.5rem] bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
          >
            <table class="w-full border-collapse">
              <thead>
                <tr class="border-b border-white/20 bg-black/20">
                  <th
                    class="p-4 text-[10px] font-black uppercase tracking-widest text-white/50 text-center"
                    >Round</th
                  >
                  {#each players as p}
                    {@const rank = playerRanks[p.id]}
                    <th
                      class="p-4 text-[10px] font-black uppercase tracking-widest transition-colors duration-500 text-center {getRankColor(
                        rank,
                      )}"
                    >
                      <div class="flex flex-col items-center gap-1">
                        {#if rank === 1}
                          <Trophy
                            size={14}
                            class="text-yellow-400 drop-shadow-md"
                          />
                        {/if}
                        {p.name}
                      </div>
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each rounds as round}
                  <tr
                    class="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td
                      class="p-4 font-black text-white/60 text-center text-sm"
                    >
                      #{round.id}
                      {#if round.isHand}
                        <span
                          class="text-yellow-400 text-[9px] ml-1 bg-yellow-400/20 px-1.5 py-0.5 rounded-full"
                          >HAND</span
                        >
                      {/if}
                    </td>
                    {#each players as p}
                      {@const rank = playerRanks[p.id]}
                      <td
                        class="p-4 font-mono text-center transition-all duration-500 text-sm {getRankBg(
                          rank,
                        )} {round.winnerId === p.id
                          ? 'text-emerald-400 font-bold drop-shadow-sm'
                          : ''}"
                      >
                        {round.scores[p.id] > 0
                          ? `+${round.scores[p.id]}`
                          : round.scores[p.id]}
                      </td>
                    {/each}
                  </tr>
                {/each}
                <tr class="bg-white/20 backdrop-blur-md">
                  <td
                    class="p-4 font-black uppercase text-xs text-center tracking-widest"
                    >Total</td
                  >
                  {#each players as p}
                    {@const rank = playerRanks[p.id]}
                    <td
                      class="p-4 font-black text-lg tracking-tighter text-center transition-all duration-500 {getRankBg(
                        rank,
                      )} {getRankColor(rank)}"
                    >
                      {calculateTotalScore(p.id)}
                    </td>
                  {/each}
                </tr>
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}

    <!-- SETTINGS TAB -->
    {#if activeTab === "settings"}
      <div
        transition:fade={{ duration: 200 }}
        class="col-start-1 row-start-1 w-full space-y-6 pb-10"
      >
        <div
          class="space-y-4 bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-[1.5rem] shadow-xl"
        >
          <div>
            <h3
              class="text-sm font-black text-white/50 uppercase tracking-widest"
            >
              Winner Score
            </h3>
            <p class="text-xs text-white/40 mt-1">
              Points awarded to the winner each round.
            </p>
          </div>
          <div class="grid grid-cols-4 gap-2">
            {#each winnerScoreOptions as option}
              <button
                onclick={() => (settings.winnerScore = option)}
                class="py-3.5 rounded-[1rem] text-sm font-black transition-all duration-300 border {settings.winnerScore ===
                option
                  ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  : 'bg-black/20 border-white/10 text-white/70 hover:bg-white/10'}"
              >
                {option}
              </button>
            {/each}
          </div>
        </div>

        <div
          class="space-y-4 bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-[1.5rem] shadow-xl"
        >
          <div class="flex justify-between items-center">
            <div>
              <h3
                class="text-sm font-black text-white/50 uppercase tracking-widest"
              >
                Groups / Sessions
              </h3>
              <p class="text-xs text-white/40 mt-1">
                Switch or manage scoreboards.
              </p>
            </div>
            <button
              onclick={() => {
                inputName = "";
                isAddGroupOpen = true;
              }}
              class="p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all text-white shadow-sm"
            >
              <FolderPlus size={20} />
            </button>
          </div>
          <div class="space-y-2 mt-2">
            {#each groups as group}
              <div
                class="p-4 rounded-[1rem] flex items-center justify-between border-2 transition-all duration-500 {settings.currentGroupId ===
                group.id
                  ? 'border-white/50 bg-white/20 shadow-lg'
                  : 'border-white/10 bg-black/20 opacity-70'}"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 {settings.currentGroupId ===
                    group.id
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white'}"
                  >
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 class="font-black text-sm text-white">{group.name}</h4>
                    <p
                      class="text-[10px] text-white/50 uppercase font-bold tracking-widest mt-0.5"
                    >
                      {group.players.length} Players • {group.rounds.length} Rounds
                    </p>
                  </div>
                </div>
                <div class="flex gap-1.5">
                  {#if settings.currentGroupId !== group.id}
                    <button
                      onclick={() => (settings.currentGroupId = group.id)}
                      class="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10"
                    >
                      <ArrowRightLeft size={16} />
                    </button>
                  {/if}
                  <button
                    onclick={() => {
                      groupToEdit = group;
                      inputName = group.name;
                      isRenameGroupOpen = true;
                    }}
                    class="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10"
                  >
                    <Edit2 size={16} />
                  </button>
                  {#if groups.length > 1}
                    <button
                      onclick={() => confirmDeleteGroup(group)}
                      class="p-2.5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                    >
                      <Trash2 size={16} />
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div
          class="space-y-4 bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-[1.5rem] shadow-xl"
        >
          <h3
            class="text-sm font-black text-white/50 uppercase tracking-widest"
          >
            Visual Theme
          </h3>
          <div class="grid grid-cols-2 gap-3">
            {#each Object.keys(THEMES) as t}
              <button
                onclick={() => (settings.theme = t as Theme)}
                class="h-16 rounded-[1rem] bg-gradient-to-br {THEMES[
                  t as Theme
                ]} border-2 transition-all {theme === t
                  ? 'border-white scale-[1.03] shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  : 'border-transparent opacity-60 hover:opacity-100'}"
              >
                <span
                  class="bg-black/30 px-3 py-1.5 rounded-full text-[10px] text-white font-black uppercase tracking-widest backdrop-blur-md"
                  >{t}</span
                >
              </button>
            {/each}
          </div>
        </div>

        <div class="pt-6 border-t border-white/10">
          <button
            onclick={() => (isFullResetOpen = true)}
            class="w-full py-4 rounded-[1rem] bg-red-500/20 hover:bg-red-500/30 text-red-400 font-black tracking-wider flex items-center justify-center gap-2 transition-all border border-red-500/30 shadow-sm"
          >
            <Trash2 size={20} /> FULL APP RESET
          </button>
        </div>
      </div>
    {/if}
  </main>

  <!-- Modals using updated styles and text-[16px] for textboxes -->
  <Modal
    isOpen={isAddPlayerOpen}
    onClose={() => (isAddPlayerOpen = false)}
    title="Add Player"
  >
    <form
      onsubmit={(e) => {
        e.preventDefault();
        addPlayer();
      }}
      class="space-y-4"
    >
      <input
        bind:value={inputName}
        placeholder="Enter player name..."
        class="w-full bg-black/30 border border-white/20 rounded-[1rem] px-4 py-4 text-[16px] text-white placeholder-white/40 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all backdrop-blur-md"
      />
      <button
        type="submit"
        class="w-full py-4 rounded-[1rem] bg-white text-black hover:bg-gray-100 font-black tracking-tight shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
        >ADD PLAYER</button
      >
    </form>
  </Modal>

  <Modal
    isOpen={isAddGroupOpen}
    onClose={() => (isAddGroupOpen = false)}
    title="New Group"
  >
    <form
      onsubmit={(e) => {
        e.preventDefault();
        addGroup();
      }}
      class="space-y-4"
    >
      <input
        bind:value={inputName}
        placeholder="Session or Group name..."
        class="w-full bg-black/30 border border-white/20 rounded-[1rem] px-4 py-4 text-[16px] text-white placeholder-white/40 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all backdrop-blur-md"
      />
      <button
        type="submit"
        class="w-full py-4 rounded-[1rem] bg-white text-black hover:bg-gray-100 font-black tracking-tight shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
        >CREATE GROUP</button
      >
    </form>
  </Modal>

  <Modal
    isOpen={isRenameGroupOpen}
    onClose={() => {
      isRenameGroupOpen = false;
      groupToEdit = null;
    }}
    title="Rename Group"
  >
    <form
      onsubmit={(e) => {
        e.preventDefault();
        renameGroup();
      }}
      class="space-y-4"
    >
      <input
        bind:value={inputName}
        placeholder="New group name..."
        class="w-full bg-black/30 border border-white/20 rounded-[1rem] px-4 py-4 text-[16px] text-white placeholder-white/40 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all backdrop-blur-md"
      />
      <button
        type="submit"
        class="w-full py-4 rounded-[1rem] bg-white text-black hover:bg-gray-100 font-black tracking-tight shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
        >SAVE CHANGES</button
      >
    </form>
  </Modal>

  <Modal
    isOpen={isRenamePlayerOpen}
    onClose={() => {
      isRenamePlayerOpen = false;
      playerToEdit = null;
    }}
    title="Rename Player"
  >
    <form
      onsubmit={(e) => {
        e.preventDefault();
        renamePlayer();
      }}
      class="space-y-4"
    >
      <input
        bind:value={inputName}
        placeholder="New player name..."
        class="w-full bg-black/30 border border-white/20 rounded-[1rem] px-4 py-4 text-[16px] text-white placeholder-white/40 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all backdrop-blur-md"
      />
      <button
        type="submit"
        class="w-full py-4 rounded-[1rem] bg-white text-black hover:bg-gray-100 font-black tracking-tight shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
        >SAVE CHANGES</button
      >
    </form>
  </Modal>

  <Modal
    isOpen={isDeleteConfirmOpen}
    onClose={() => {
      isDeleteConfirmOpen = false;
      playerToDelete = null;
    }}
    title="Remove Player?"
  >
    <div class="space-y-6">
      <p class="text-white/70">
        Are you sure you want to remove <span class="text-white font-black"
          >{playerToDelete?.name}</span
        >?
      </p>
      <div class="flex gap-3">
        <button
          onclick={() => (isDeleteConfirmOpen = false)}
          class="flex-1 py-3.5 rounded-[1rem] bg-white/10 hover:bg-white/20 border border-white/20 font-bold transition-all"
          >Cancel</button
        >
        <button
          onclick={removePlayer}
          class="flex-1 py-3.5 rounded-[1rem] bg-red-500 hover:bg-red-600 text-white font-black shadow-lg shadow-red-500/30 transition-all"
          >Delete</button
        >
      </div>
    </div>
  </Modal>

  <Modal
    isOpen={isDeleteGroupOpen}
    onClose={() => {
      isDeleteGroupOpen = false;
      groupToDelete = null;
    }}
    title="Delete Group?"
  >
    <div class="space-y-6">
      <p class="text-white/70">
        Are you sure you want to delete <span class="text-white font-black"
          >"{groupToDelete?.name}"</span
        >? All history will be lost.
      </p>
      <div class="flex gap-3">
        <button
          onclick={() => {
            isDeleteGroupOpen = false;
            groupToDelete = null;
          }}
          class="flex-1 py-3.5 rounded-[1rem] bg-white/10 hover:bg-white/20 border border-white/20 font-bold transition-all"
          >Cancel</button
        >
        <button
          onclick={() => groupToDelete && deleteGroup(groupToDelete.id)}
          class="flex-1 py-3.5 rounded-[1rem] bg-red-500 hover:bg-red-600 text-white font-black shadow-lg shadow-red-500/30 transition-all"
          >Delete</button
        >
      </div>
    </div>
  </Modal>

  <Modal
    isOpen={isFullResetOpen}
    onClose={() => (isFullResetOpen = false)}
    title="Full Data Reset?"
  >
    <div class="space-y-6">
      <p class="text-white/70">
        This will <span class="text-red-400 font-black"
          >permanently delete all data</span
        > — all groups, players, and history. This cannot be undone.
      </p>
      <div class="flex gap-3">
        <button
          onclick={() => (isFullResetOpen = false)}
          class="flex-1 py-3.5 rounded-[1rem] bg-white/10 hover:bg-white/20 border border-white/20 font-bold transition-all"
          >Cancel</button
        >
        <button
          onclick={resetGame}
          class="flex-1 py-3.5 rounded-[1rem] bg-red-500 hover:bg-red-600 text-white font-black shadow-lg shadow-red-500/30 transition-all"
          >Reset All</button
        >
      </div>
    </div>
  </Modal>

  <!-- Score Dialog Redesigned for Mobile (Compact, Central) -->
  <Modal
    isOpen={isScoreDialogOpen}
    onClose={() => (isScoreDialogOpen = false)}
    title="Score: {players.find((p) => p.id === selectedPlayerId)?.name}"
  >
    <div class="space-y-4">
      <!-- Total Display Box -->
      <div
        class="p-4 rounded-[1.25rem] border backdrop-blur-md transition-all duration-500 {isHand
          ? 'bg-yellow-400/20 border-yellow-400/40 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
          : 'bg-black/30 border-white/10'}"
      >
        <div class="flex justify-between items-start mb-1.5">
          <span
            class="text-white/50 font-black uppercase text-[10px] tracking-[0.2em]"
            >Calculated Score</span
          >
          {#if isHand}
            <span
              class="bg-yellow-400 text-black text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-sm"
              >Hand (2x)</span
            >
          {/if}
        </div>
        <div class="flex items-baseline gap-3">
          <span
            class="text-4xl font-black tracking-tighter {isHand
              ? 'text-yellow-400 drop-shadow-md'
              : 'text-white'}"
          >
            {isHand
              ? selectedCards.reduce((a, b) => a + b, 0) * 2
              : selectedCards.reduce((a, b) => a + b, 0)}
          </span>
          <span class="text-white/30 font-bold text-sm"
            >({selectedCards.reduce((a, b) => a + b, 0)} raw)</span
          >
        </div>
      </div>

      <!-- Compact 5-col Grid for standard cards -->
      <div class="grid grid-cols-5 gap-1.5">
        {#each CARD_VALUES as card}
          {@const isHigh = card.value >= 10}
          <button
            onclick={() => (selectedCards = [...selectedCards, card.value])}
            class="py-2.5 rounded-[1rem] flex flex-col items-center justify-center transition-all active:scale-90 border backdrop-blur-md {isHigh
              ? 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30'
              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}"
          >
            <span class="text-[13px] font-black">{card.label}</span>
            <span class="text-[9px] font-bold opacity-50">{card.value}</span>
          </button>
        {/each}
      </div>

      <button
        onclick={() => (selectedCards = Array(10).fill(10))}
        class="w-full py-2.5 rounded-[1rem] bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-black uppercase tracking-widest transition-all text-white backdrop-blur-sm shadow-sm"
      >
        Full Hand (+{isHand ? 200 : 100})
      </button>

      {#if selectedCards.length > 0}
        <div
          class="flex flex-wrap gap-1.5 p-3 bg-black/30 rounded-[1rem] min-h-[44px] items-start border border-white/10"
        >
          {#each selectedCards as val, i}
            <button
              transition:scale={{ duration: 200 }}
              onclick={() =>
                (selectedCards = selectedCards.filter(
                  (_, index) => index !== i,
                ))}
              class="px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1.5 group transition-all {val >=
              10
                ? 'bg-red-500/30 text-red-200 border border-red-500/30'
                : 'bg-white/20 text-white border border-white/20'}"
            >
              {val}
              <X size={10} class="group-hover:scale-125 transition-transform" />
            </button>
          {/each}
        </div>
      {/if}

      <!-- Bottom controls wrapper -->
      <div class="pt-4 border-t border-white/10 space-y-3">
        <!-- text-[16px] is crucial here to prevent iOS Keyboard Zoom! -->
        <input
          type="number"
          inputmode="numeric"
          bind:value={manualScoreInput}
          placeholder="Or manual points override..."
          class="w-full bg-black/30 border border-white/20 rounded-[1rem] px-4 py-3 text-[16px] font-bold text-white placeholder-white/40 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all backdrop-blur-md"
        />
        <button
          onclick={applyCardScore}
          class="w-full py-4 rounded-[1rem] bg-white text-black hover:bg-gray-100 font-black tracking-tight shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
        >
          APPLY SCORE
        </button>
      </div>
    </div>
  </Modal>
</div>
