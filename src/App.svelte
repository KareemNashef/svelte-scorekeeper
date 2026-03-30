<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { CARD_VALUES, THEMES } from './lib/constants';
  import type { Player, Round, Theme, Group, AppSettings } from './lib/types';
  import Modal from './lib/Modal.svelte';
  
  import {
    Users, History, Settings as SettingsIcon, Plus, Trash2, ChevronRight,
    Trophy, RotateCcw, UserPlus, Check, X, CreditCard, Crown, Edit2,
    Layers, FolderPlus, ArrowRightLeft
  } from 'lucide-svelte';

  // --- STATE (Runes replacing useState) ---
  let activeTab = $state<'players' | 'history' | 'settings'>('players');
  let groups = $state<Group[]>([]);
  let settings = $state<AppSettings>({
    winnerScore: -30,
    theme: 'vibrant',
    currentGroupId: ''
  });

  // Derived state (replacing useMemo)
  let currentGroup = $derived(groups.find(g => g.id === settings.currentGroupId) || null);
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

  let selectedPlayerId = $state<string | null>(null);
  let playerToEdit = $state<Player | null>(null);
  let playerToDelete = $state<Player | null>(null);
  let groupToEdit = $state<Group | null>(null);
  
  // Input binds
  let inputName = $state('');
  let tempScores = $state<Record<string, number>>({});
  let isHand = $state(false);
  let winnerId = $state<string | null>(null);
  let selectedCards = $state<number[]>([]);
  let manualScoreInput = $state<number | null>(null);

  // Load Data on Mount
  let mounted = $state(false);
  onMount(() => {
    const savedGroups = localStorage.getItem('rummy_groups_v2');
    const savedSettings = localStorage.getItem('rummy_settings_v2');
    
    if (savedGroups) {
      groups = JSON.parse(savedGroups);
    } else {
      const initialGroup: Group = {
        id: 'default', name: 'Main Session', players: [], rounds: [], createdAt: Date.now()
      };
      groups = [initialGroup];
      settings.currentGroupId = 'default';
    }

    if (savedSettings) {
      settings = JSON.parse(savedSettings);
    }
    mounted = true;
  });

  // Auto-Save Effect
  $effect(() => {
    if (mounted && groups.length > 0) {
      localStorage.setItem('rummy_groups_v2', JSON.stringify(groups));
    }
    if (mounted) {
      localStorage.setItem('rummy_settings_v2', JSON.stringify(settings));
    }
  });

  // --- Helper Functions ---
  function updateCurrentGroup(updates: Partial<Group>) {
    groups = groups.map(g => g.id === settings.currentGroupId ? { ...g, ...updates } : g);
  }

  function addPlayer() {
    if (!inputName.trim()) return;
    const newPlayer: Player = { id: Math.random().toString(36).substring(2, 9), name: inputName.trim() };
    updateCurrentGroup({ players: [...players, newPlayer] });
    isAddPlayerOpen = false;
    inputName = '';
  }

  function renamePlayer() {
    if (!inputName.trim() || !playerToEdit) return;
    updateCurrentGroup({ players: players.map(p => p.id === playerToEdit!.id ? { ...p, name: inputName.trim() } : p) });
    isRenamePlayerOpen = false;
    playerToEdit = null;
  }

  function removePlayer() {
    if (!playerToDelete) return;
    updateCurrentGroup({ players: players.filter(p => p.id !== playerToDelete!.id) });
    isDeleteConfirmOpen = false;
    playerToDelete = null;
  }

  function addGroup() {
    if (!inputName.trim()) return;
    const newGroup: Group = {
      id: Math.random().toString(36).substring(2, 9), name: inputName.trim(), players: [], rounds: [], createdAt: Date.now()
    };
    groups = [...groups, newGroup];
    settings.currentGroupId = newGroup.id;
    isAddGroupOpen = false;
    inputName = '';
  }

  function renameGroup() {
    if (!inputName.trim() || !groupToEdit) return;
    groups = groups.map(g => g.id === groupToEdit!.id ? { ...g, name: inputName.trim() } : g);
    isRenameGroupOpen = false;
    groupToEdit = null;
  }

  function deleteGroup(id: string) {
    if (groups.length <= 1) return;
    groups = groups.filter(g => g.id !== id);
    if (settings.currentGroupId === id) settings.currentGroupId = groups[0].id;
  }

  function calculateTotalScore(playerId: string) {
    return rounds.reduce((total, round) => total + (round.scores[playerId] || 0), 0);
  }

  function handleAdvanceRound() {
    if (!winnerId || players.length < 2) return;
    const roundScores: Record<string, number> = {};
    
    players.forEach(player => {
      if (player.id === winnerId) {
        roundScores[player.id] = isHand ? settings.winnerScore * 2 : settings.winnerScore;
      } else {
        const points = tempScores[player.id] || 0;
        roundScores[player.id] = isHand ? points * 2 : points;
      }
    });

    const newRound: Round = { id: rounds.length + 1, scores: roundScores, isHand, winnerId };
    updateCurrentGroup({ rounds: [...rounds, newRound] });
    tempScores = {};
    winnerId = null;
    isHand = false;
  }

  function undoLastRound() {
    if (rounds.length === 0) return;
    updateCurrentGroup({ rounds: rounds.slice(0, -1) });
  }

  function resetGame() {
    if (window.confirm('Are you sure you want to reset EVERYTHING?')) {
      localStorage.clear();
      window.location.reload();
    }
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
    const scores = players.map(p => ({ id: p.id, total: calculateTotalScore(p.id) }));
    scores.sort((a, b) => a.total - b.total);
    const ranks: Record<string, number> = {};
    scores.forEach((s, i) => { ranks[s.id] = i + 1; });
    return ranks;
  });

  function getRankColor(rank: number) { return rank === 1 ? 'text-yellow-400' : 'text-white/60'; }
  function getRankBg(rank: number) { return rank === 1 ? 'bg-yellow-400/10 border-yellow-400/20' : 'bg-white/5 border-white/10'; }

  function calculateRoundChange(playerId: string) {
    if (!winnerId) return 0;
    if (playerId === winnerId) return isHand ? settings.winnerScore * 2 : settings.winnerScore;
    const points = tempScores[playerId] || 0;
    return isHand ? points * 2 : points;
  }
</script>

<!-- Svelte Snippets (Reusable inline UI components) -->
{#snippet tabButton(id: typeof activeTab, IconComponent: any, label: string)}
  <button
    onclick={() => activeTab = id}
    class="flex flex-col items-center justify-center py-2 px-4 transition-all duration-300 relative {activeTab === id ? 'text-white' : 'text-white/40'}"
  >
    <IconComponent size={20} class="mb-1" />
    <span class="text-[10px] uppercase tracking-widest font-bold">{label}</span>
    {#if activeTab === id}
      <div transition:fade={{ duration: 200 }} class="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></div>
    {/if}
  </button>
{/snippet}

<div class="min-h-screen bg-gradient-to-br {THEMES[theme as Theme]} transition-all duration-1000 flex flex-col">
  <!-- Header -->
  <header class="p-6 pt-12 flex justify-between items-center">
    <div>
      <h1 class="text-4xl font-black tracking-tighter italic">SCOREKEEPER</h1>
      <p class="text-white/60 text-xs font-bold tracking-widest uppercase">Hand Rummy Edition</p>
    </div>
    <div class="glass p-2 rounded-2xl">
      <Trophy class="text-yellow-400" size={24} />
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1 px-6 pb-32 max-w-2xl mx-auto w-full relative">
    {#if activeTab === 'players'}
      <div transition:fade={{ duration: 200 }} class="space-y-6 absolute w-[calc(100%-3rem)]">
        <!-- Round Controls -->
        <div class="glass-card bg-white/5 border-white/10">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold flex items-center gap-2">Round {rounds.length + 1}</h2>
            <button onclick={undoLastRound} disabled={rounds.length === 0} class="p-2 hover:bg-white/10 rounded-xl disabled:opacity-20 transition-colors">
              <RotateCcw size={18} />
            </button>
          </div>
          
          <div class="space-y-4">
            <button 
              onclick={() => isHand = !isHand}
              class="w-full py-4 rounded-2xl font-black text-sm tracking-widest transition-all duration-500 border-2 {isHand ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.3)]' : 'bg-transparent text-white border-white/20'}"
            >
              {isHand ? 'HAND ROUND (2x)' : 'REGULAR ROUND'}
            </button>
            <button
              onclick={handleAdvanceRound}
              disabled={!winnerId || players.length < 2}
              class="w-full glass-button bg-white/20 hover:bg-white/30 disabled:opacity-20 flex items-center justify-center gap-2 py-4 text-lg font-black tracking-tighter"
            >
              Finish Round <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <!-- Players List -->
        <div class="space-y-3">
          <div class="flex justify-between items-center px-1">
            <h2 class="text-sm font-bold text-white/60 uppercase tracking-widest">Players</h2>
            <button onclick={() => { inputName=''; isAddPlayerOpen=true; }} class="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-all flex items-center gap-1">
              <Plus size={14} /> Add
            </button>
          </div>

          {#if players.length === 0}
            <div class="glass-card text-center py-12 opacity-40">
              <UserPlus class="mx-auto mb-2" size={32} />
              <p class="text-sm">No players added yet</p>
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
                  class="glass-card flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all duration-500 border-2 {isWinner ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-white/5'}"
                >
                  <div class="flex items-center gap-4">
                    <button
                      onclick={(e) => { e.stopPropagation(); winnerId = isWinner ? null : player.id; }}
                      class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 {isWinner ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' : 'bg-white/5 hover:bg-white/10 text-white/40 hover:text-white'}"
                    >
                      {#if isWinner} <Crown size={24} /> {:else} <div class="text-xl font-black">{index + 1}</div> {/if}
                    </button>
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="font-bold text-lg">{player.name}</h3>
                        <button 
                          onclick={(e) => { e.stopPropagation(); playerToEdit = player; inputName = player.name; isRenamePlayerOpen = true; }}
                          class="p-1 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                      <p class="text-white/40 text-[10px] font-bold uppercase tracking-widest">Round Change</p>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-4">
                    <div class="text-right">
                      {#key roundChange}
                        <div in:scale={{ duration: 300 }} class="text-2xl font-black tracking-tighter {roundChange < 0 ? 'text-emerald-400' : roundChange > 0 ? 'text-red-400' : 'text-white/40'}">
                          {roundChange > 0 ? `+${roundChange}` : roundChange === 0 ? '0' : roundChange}
                        </div>
                      {/key}
                      <div class="text-[10px] font-bold text-white/20 uppercase tracking-tighter">Total: {calculateTotalScore(player.id)}</div>
                    </div>
                    <div class="p-3 rounded-2xl transition-all duration-500 {isWinner ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 group-hover:bg-white/10'}">
                      <CreditCard size={20} />
                    </div>
                    <button 
                      onclick={(e) => { e.stopPropagation(); playerToDelete = player; isDeleteConfirmOpen = true; }}
                      class="p-2 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
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

    {#if activeTab === 'history'}
      <div transition:fade={{ duration: 200 }} class="space-y-4 absolute w-[calc(100%-3rem)]">
        <h2 class="text-2xl font-black italic mb-6">SCORE HISTORY</h2>
        {#if rounds.length === 0}
          <div class="glass-card text-center py-20 opacity-40">
            <History class="mx-auto mb-4" size={48} />
            <p>No rounds played yet</p>
          </div>
        {:else}
          <div class="overflow-x-auto rounded-3xl glass border border-white/10 shadow-2xl">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-white/10">
                  <th class="p-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Round</th>
                  {#each players as p}
                    {@const rank = playerRanks[p.id]}
                    <th class="p-4 text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 {getRankColor(rank)}">
                      <div class="flex flex-col items-center">
                        {#if rank <= 3} <Trophy size={12} class="mb-1" /> {/if}
                        {p.name}
                      </div>
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each rounds as round}
                  <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td class="p-4 font-black text-white/60">
                      #{round.id} {#if round.isHand} <span class="text-yellow-400 text-[8px] ml-1">HAND</span> {/if}
                    </td>
                    {#each players as p}
                      {@const rank = playerRanks[p.id]}
                      <td class="p-4 font-mono transition-all duration-500 {getRankBg(rank)} {round.winnerId === p.id ? 'text-green-400 font-bold' : ''}">
                        {round.scores[p.id] > 0 ? `+${round.scores[p.id]}` : round.scores[p.id]}
                      </td>
                    {/each}
                  </tr>
                {/each}
                <tr class="bg-white/10">
                  <td class="p-4 font-black uppercase text-xs">Total</td>
                  {#each players as p}
                    {@const rank = playerRanks[p.id]}
                    <td class="p-4 font-black text-lg tracking-tighter transition-all duration-500 {getRankBg(rank)} {getRankColor(rank)}">
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

    {#if activeTab === 'settings'}
      <div transition:fade={{ duration: 200 }} class="space-y-8 absolute w-[calc(100%-3rem)]">
        <h2 class="text-2xl font-black italic mb-6">SETTINGS</h2>
        
        <div class="space-y-4">
          <h3 class="text-sm font-bold text-white/40 uppercase tracking-widest">Winner Score</h3>
          <div class="flex items-center gap-4">
            <input type="number" bind:value={settings.winnerScore} class="glass-input flex-1 py-4 font-black text-xl" />
            <div class="text-xs text-white/40 font-bold max-w-[120px]">Points awarded to the winner each round.</div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-bold text-white/40 uppercase tracking-widest">Groups / Sessions</h3>
            <button onclick={() => { inputName=''; isAddGroupOpen=true; }} class="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
              <FolderPlus size={18} />
            </button>
          </div>
          <div class="space-y-2">
            {#each groups as group}
              <div class="glass-card p-4 flex items-center justify-between border-2 transition-all duration-500 {settings.currentGroupId === group.id ? 'border-white/40 bg-white/10' : 'border-white/5 opacity-60'}">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center {settings.currentGroupId === group.id ? 'bg-white text-black' : 'bg-white/5'}">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 class="font-bold">{group.name}</h4>
                    <p class="text-[10px] text-white/40 uppercase font-bold tracking-widest">{group.players.length} Players • {group.rounds.length} Rounds</p>
                  </div>
                </div>
                <div class="flex gap-2">
                  {#if settings.currentGroupId !== group.id}
                    <button onclick={() => settings.currentGroupId = group.id} class="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <ArrowRightLeft size={16} />
                    </button>
                  {/if}
                  <button onclick={() => { groupToEdit = group; inputName = group.name; isRenameGroupOpen = true; }} class="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  {#if groups.length > 1}
                    <button onclick={() => { if(window.confirm(`Delete "${group.name}"?`)) deleteGroup(group.id); }} class="p-2 hover:bg-red-500/20 text-white/20 hover:text-red-400 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-bold text-white/40 uppercase tracking-widest">Theme</h3>
          <div class="grid grid-cols-2 gap-3">
            {#each Object.keys(THEMES) as t}
              <button onclick={() => settings.theme = t as Theme} class="h-16 rounded-2xl bg-gradient-to-br {THEMES[t as Theme]} border-2 transition-all {theme === t ? 'border-white scale-105 shadow-xl' : 'border-transparent opacity-60 hover:opacity-100'}">
                <span class="bg-black/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">{t}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="pt-8 border-t border-white/10">
          <button onclick={resetGame} class="w-full py-4 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold flex items-center justify-center gap-2 transition-all border border-red-500/20">
            <Trash2 size={20} /> Full Reset App
          </button>
        </div>
      </div>
    {/if}
  </main>

  <!-- Modals -->
  <Modal isOpen={isAddPlayerOpen} onClose={() => isAddPlayerOpen = false} title="Add New Player">
    <form onsubmit={(e) => { e.preventDefault(); addPlayer(); }} class="space-y-4">
      <input bind:value={inputName} placeholder="Enter name..." class="w-full glass-input text-lg py-4" autofocus />
      <button type="submit" class="w-full glass-button bg-white text-black hover:bg-white/90 font-black">Add Player</button>
    </form>
  </Modal>

  <Modal isOpen={isAddGroupOpen} onClose={() => isAddGroupOpen = false} title="New Playing Group">
    <form onsubmit={(e) => { e.preventDefault(); addGroup(); }} class="space-y-4">
      <input bind:value={inputName} placeholder="Group name..." class="w-full glass-input text-lg py-4" autofocus />
      <button type="submit" class="w-full glass-button bg-white text-black hover:bg-white/90 font-black">Create Group</button>
    </form>
  </Modal>

  <Modal isOpen={isRenameGroupOpen} onClose={() => { isRenameGroupOpen = false; groupToEdit = null; }} title="Rename Group">
    <form onsubmit={(e) => { e.preventDefault(); renameGroup(); }} class="space-y-4">
      <input bind:value={inputName} placeholder="New name..." class="w-full glass-input text-lg py-4" autofocus />
      <button type="submit" class="w-full glass-button bg-white text-black hover:bg-white/90 font-black">Save</button>
    </form>
  </Modal>

  <Modal isOpen={isRenamePlayerOpen} onClose={() => { isRenamePlayerOpen = false; playerToEdit = null; }} title="Rename Player">
    <form onsubmit={(e) => { e.preventDefault(); renamePlayer(); }} class="space-y-4">
      <input bind:value={inputName} placeholder="New name..." class="w-full glass-input text-lg py-4" autofocus />
      <button type="submit" class="w-full glass-button bg-white text-black hover:bg-white/90 font-black">Save</button>
    </form>
  </Modal>

  <Modal isOpen={isDeleteConfirmOpen} onClose={() => { isDeleteConfirmOpen = false; playerToDelete = null; }} title="Delete Player?">
    <div class="space-y-6">
      <p class="text-white/60">Are you sure you want to remove <span class="text-white font-bold">{playerToDelete?.name}</span>?</p>
      <div class="flex gap-3">
        <button onclick={() => isDeleteConfirmOpen = false} class="flex-1 glass-button bg-white/5 hover:bg-white/10">Cancel</button>
        <button onclick={removePlayer} class="flex-1 glass-button bg-red-500 text-white hover:bg-red-600 font-black">Delete</button>
      </div>
    </div>
  </Modal>

  <Modal isOpen={isScoreDialogOpen} onClose={() => isScoreDialogOpen = false} title="Score for {players.find(p => p.id === selectedPlayerId)?.name}">
    <div class="space-y-6">
      <div class="flex flex-col p-6 rounded-3xl border transition-all duration-500 {isHand ? 'bg-yellow-400/10 border-yellow-400/20' : 'bg-black/40 border-white/5'}">
        <div class="flex justify-between items-start mb-2">
          <span class="text-white/40 font-bold uppercase text-[10px] tracking-[0.2em]">Total Round Score</span>
          {#if isHand} <span class="bg-yellow-400 text-black text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Hand (2x)</span> {/if}
        </div>
        <div class="flex items-baseline gap-3">
          <span class="text-5xl font-black tracking-tighter {isHand ? 'text-yellow-400' : 'text-white'}">
            {isHand ? selectedCards.reduce((a, b) => a + b, 0) * 2 : selectedCards.reduce((a, b) => a + b, 0)}
          </span>
          <span class="text-white/20 font-bold text-sm">({selectedCards.reduce((a, b) => a + b, 0)} pts)</span>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-2">
        {#each CARD_VALUES as card}
          {@const isHigh = card.value >= 10}
          <button
            onclick={() => selectedCards = [...selectedCards, card.value]}
            class="h-16 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border-2 {isHigh ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-white/80'} hover:bg-white/20"
          >
            <span class="text-sm font-black">{card.label}</span>
            <span class="text-[8px] font-bold opacity-40">{card.value}</span>
          </button>
        {/each}
      </div>

      <button onclick={() => selectedCards = Array(10).fill(10)} class="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-widest transition-all">
        Full Hand (+{isHand ? 200 : 100})
      </button>

      {#if selectedCards.length > 0}
        <div class="flex flex-wrap gap-2 p-3 bg-black/40 rounded-2xl min-h-[60px] items-start border border-white/5">
          {#each selectedCards as val, i}
            <button
              transition:scale
              onclick={() => selectedCards = selectedCards.filter((_, index) => index !== i)}
              class="px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 group transition-all {val >= 10 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}"
            >
              {val} <X size={10} class="group-hover:scale-125 transition-transform" />
            </button>
          {/each}
        </div>
      {/if}

      <div class="pt-4 border-t border-white/10 space-y-3">
        <input type="number" bind:value={manualScoreInput} placeholder="Or type manual points..." class="w-full glass-input py-4 font-bold" />
        <button onclick={applyCardScore} class="w-full glass-button bg-white text-black font-black py-4 text-lg tracking-tight">APPLY SCORE</button>
      </div>
    </div>
  </Modal>

  <!-- Navigation Bar -->
  <nav class="fixed bottom-6 left-6 right-6 glass rounded-[2.5rem] p-2 flex justify-around items-center z-40">
    {@render tabButton('players', Users, 'Players')}
    {@render tabButton('history', History, 'History')}
    {@render tabButton('settings', SettingsIcon, 'Settings')}
  </nav>
</div>