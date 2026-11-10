<script lang="ts">
  import { onMount } from "svelte";
  import { flip } from "svelte/animate";
  import { cubicOut, cubicIn, backOut, expoOut } from "svelte/easing";
  import { CARD_VALUES, THEMES } from "./lib/constants";
  import type { Player, Round, Theme, Group, AppSettings } from "./lib/types";
  import Modal from "./lib/Modal.svelte";
  import {
    Plus,
    Trash2,
    ChevronRight,
    RotateCcw,
    UserPlus,
    Check,
    X,
    CreditCard,
    Crown,
    Pencil,
    MoreHorizontal,
  } from "lucide-svelte";

  const TAB_LIST = ["players", "history", "settings"] as const;
  type TabType = (typeof TAB_LIST)[number];

  let activeTab = $state<TabType>("players");
  let tabDirection = $state<number>(1);
  let groups = $state<Group[]>([]);
  let settings = $state<AppSettings>({
    winnerScore: -30,
    theme: "glass",
    currentGroupId: "",
  });

  let currentGroup = $derived(
    groups.find((group) => group.id === settings.currentGroupId) || null,
  );
  let players = $derived(currentGroup?.players || []);
  let rounds = $derived(currentGroup?.rounds || []);

  let isAddPlayerOpen = $state(false);
  let isRenamePlayerOpen = $state(false);
  let isDeleteConfirmOpen = $state(false);
  let isScoreDialogOpen = $state(false);
  let isAddGroupOpen = $state(false);
  let isRenameGroupOpen = $state(false);
  let isDeleteGroupOpen = $state(false);
  let isFullResetOpen = $state(false);
  let isNewGameOpen = $state(false);
  let isEditRoundOpen = $state(false);
  let isPlayerOptionsOpen = $state(false);
  let isGroupOptionsOpen = $state(false);

  let selectedPlayerId = $state<string | null>(null);
  let playerToEdit = $state<Player | null>(null);
  let playerToDelete = $state<Player | null>(null);
  let groupToEdit = $state<Group | null>(null);
  let groupToDelete = $state<Group | null>(null);
  let roundToEdit = $state<Round | null>(null);
  let playerForOptions = $state<Player | null>(null);
  let groupForOptions = $state<Group | null>(null);

  let inputName = $state("");
  let tempScores = $state<Record<string, number>>({});
  let isHand = $state(false);
  let winnerId = $state<string | null>(null);
  let selectedCards = $state<number[]>([]);
  let manualScoreInput = $state<number | null>(null);
  let editRoundScores = $state<Record<string, number>>({});
  let editWinnerId = $state<string | null>(null);
  let editIsHand = $state(false);
  let isUndoSpinning = $state(false);
  let mounted = $state(false);

  let pageTitle = $derived(
    activeTab === "players"
      ? "Scorekeeper"
      : activeTab === "history"
        ? "Score history"
        : "Settings",
  );

  onMount(() => {
    const savedGroups = localStorage.getItem("rummy_groups_v2");
    const savedSettings = localStorage.getItem("rummy_settings_v2");
    if (savedGroups) {
      groups = JSON.parse(savedGroups);
    } else {
      groups = [{
        id: "default",
        name: "Main Session",
        players: [],
        rounds: [],
        createdAt: Date.now(),
      }];
      settings.currentGroupId = "default";
    }
    if (savedSettings) settings = JSON.parse(savedSettings);
    if (!THEMES.some((theme) => theme.id === settings.theme)) {
      settings.theme = "glass";
    }
    mounted = true;
  });

  $effect(() => {
    document.body.dataset.theme = settings.theme;
  });

  $effect(() => {
    if (mounted && groups.length > 0) {
      localStorage.setItem("rummy_groups_v2", JSON.stringify(groups));
    }
    if (mounted) localStorage.setItem("rummy_settings_v2", JSON.stringify(settings));
  });

  function switchTab(newTab: TabType) {
    if (newTab === activeTab) return;
    const oldIdx = TAB_LIST.indexOf(activeTab);
    const newIdx = TAB_LIST.indexOf(newTab);
    tabDirection = newIdx >= oldIdx ? 1 : -1;
    activeTab = newTab;
  }

  /* Theme-specific tab entering transition */
  function tabIn(node: Element) {
    const theme = settings.theme;
    const dir = tabDirection;

    if (theme === "glass") {
      return {
        duration: 220,
        css: (t: number) => {
          const eased = cubicOut(t);
          return `
            opacity: ${eased};
            transform: translateY(${(1 - eased) * 12}px);
            filter: blur(${(1 - eased) * 4}px);
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
            transform: translateX(${(1 - eased) * 24 * dir}px);
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
            transform: translateY(${(1 - eased) * 16}px) rotate(${(1 - eased) * -1.2 * dir}deg);
          `;
        },
      };
    }

    // pop theme
    return {
      duration: 160,
      css: (t: number) => {
        const eased = expoOut(t);
        return `
          opacity: ${eased};
          transform: translateY(${(1 - eased) * 10}px) scale(${0.98 + 0.02 * eased});
        `;
      },
    };
  }

  /* Theme-specific tab exiting transition */
  function tabOut(node: Element) {
    const theme = settings.theme;
    const dir = tabDirection;

    if (theme === "glass") {
      return {
        duration: 150,
        css: (t: number) => {
          const eased = cubicIn(t);
          return `
            opacity: ${eased};
            transform: translateY(${(1 - eased) * -8}px);
            pointer-events: none;
          `;
        },
      };
    }

    if (theme === "baize") {
      return {
        duration: 150,
        css: (t: number) => {
          const eased = cubicIn(t);
          return `
            opacity: ${eased};
            transform: translateX(${(1 - eased) * -20 * dir}px);
            pointer-events: none;
          `;
        },
      };
    }

    if (theme === "paper") {
      return {
        duration: 140,
        css: (t: number) => {
          const eased = cubicIn(t);
          return `
            opacity: ${eased};
            transform: rotate(${(1 - eased) * 1 * dir}deg);
            pointer-events: none;
          `;
        },
      };
    }

    // pop theme
    return {
      duration: 100,
      css: (t: number) => {
        return `
          opacity: ${t};
          transform: scale(${0.98 + 0.02 * t});
          pointer-events: none;
        `;
      },
    };
  }

  function updateCurrentGroup(updates: Partial<Group>) {
    groups = groups.map((group) =>
      group.id === settings.currentGroupId ? { ...group, ...updates } : group,
    );
  }

  function addPlayer() {
    if (!inputName.trim()) return;
    updateCurrentGroup({
      players: [...players, {
        id: Math.random().toString(36).substring(2, 9),
        name: inputName.trim(),
      }],
    });
    isAddPlayerOpen = false;
    inputName = "";
  }

  function renamePlayer() {
    if (!inputName.trim() || !playerToEdit) return;
    updateCurrentGroup({
      players: players.map((player) =>
        player.id === playerToEdit!.id ? { ...player, name: inputName.trim() } : player,
      ),
    });
    isRenamePlayerOpen = false;
    playerToEdit = null;
  }

  function removePlayer() {
    if (!playerToDelete) return;
    updateCurrentGroup({
      players: players.filter((player) => player.id !== playerToDelete!.id),
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

  function startNewGameWithPlayers() {
    if (!currentGroup) return;
    const newGroup: Group = {
      id: Math.random().toString(36).substring(2, 9),
      name: inputName.trim() || currentGroup.name + " — Game " + (groups.length + 1),
      players: currentGroup.players.map((player) => ({ ...player })),
      rounds: [],
      createdAt: Date.now(),
    };
    groups = [...groups, newGroup];
    settings.currentGroupId = newGroup.id;
    inputName = "";
    isNewGameOpen = false;
    switchTab("players");
  }

  function renameGroup() {
    if (!inputName.trim() || !groupToEdit) return;
    groups = groups.map((group) =>
      group.id === groupToEdit!.id ? { ...group, name: inputName.trim() } : group,
    );
    isRenameGroupOpen = false;
    groupToEdit = null;
  }

  function deleteGroup(id: string) {
    if (groups.length <= 1) return;
    groups = groups.filter((group) => group.id !== id);
    if (settings.currentGroupId === id) settings.currentGroupId = groups[0].id;
    isDeleteGroupOpen = false;
    groupToDelete = null;
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
    if (!selectedPlayerId) return;
    let total = selectedCards.reduce((sum, value) => sum + value, 0);
    if (manualScoreInput !== null) total = manualScoreInput;
    tempScores = { ...tempScores, [selectedPlayerId]: total };
    isScoreDialogOpen = false;
  }

  let playerRanks = $derived.by(() => {
    const scores = players.map((player) => ({
      id: player.id,
      total: calculateTotalScore(player.id),
    }));
    scores.sort((left, right) => left.total - right.total);
    const ranks: Record<string, number> = {};
    scores.forEach((score, index) => { ranks[score.id] = index + 1; });
    return ranks;
  });

  function calculateTotalScore(playerId: string) {
    return rounds.reduce((total, round) => total + (round.scores[playerId] || 0), 0);
  }

  function calculateRoundChange(playerId: string) {
    if (playerId === winnerId) {
      return isHand ? settings.winnerScore * 2 : settings.winnerScore;
    }
    const points = tempScores[playerId] || 0;
    return isHand ? points * 2 : points;
  }

  function handleAdvanceRound() {
    if (!winnerId || players.length < 2) return;
    const roundScores: Record<string, number> = {};
    players.forEach((player) => {
      if (player.id === winnerId) {
        roundScores[player.id] = isHand ? settings.winnerScore * 2 : settings.winnerScore;
      } else {
        const points = tempScores[player.id] || 0;
        roundScores[player.id] = isHand ? points * 2 : points;
      }
    });
    updateCurrentGroup({
      rounds: [...rounds, { id: rounds.length + 1, scores: roundScores, isHand, winnerId }],
    });
    tempScores = {};
    winnerId = null;
    isHand = false;
  }

  function undoLastRound() {
    if (rounds.length === 0) return;
    isUndoSpinning = true;
    setTimeout(() => { isUndoSpinning = false; }, 400);
    updateCurrentGroup({ rounds: rounds.slice(0, -1) });
  }

  function openEditRound(round: Round) {
    roundToEdit = round;
    editRoundScores = Object.fromEntries(
      players.map((player) => [player.id, round.scores[player.id] ?? 0]),
    );
    editWinnerId = round.winnerId;
    editIsHand = round.isHand;
    isEditRoundOpen = true;
  }

  function chooseRoundWinner(playerId: string) {
    if (editWinnerId && editWinnerId !== playerId) {
      editRoundScores = { ...editRoundScores, [editWinnerId]: 0 };
    }
    editWinnerId = playerId;
  }

  function saveEditedRound() {
    if (!roundToEdit || !editWinnerId) return;
    const scores = { ...editRoundScores };
    scores[editWinnerId] = editIsHand ? settings.winnerScore * 2 : settings.winnerScore;
    updateCurrentGroup({
      rounds: rounds.map((round) =>
        round.id === roundToEdit!.id
          ? { ...round, scores, winnerId: editWinnerId!, isHand: editIsHand }
          : round,
      ),
    });
    isEditRoundOpen = false;
    roundToEdit = null;
  }

  function openPlayerOptions(player: Player) {
    playerForOptions = player;
    isPlayerOptionsOpen = true;
  }

  function openGroupOptions(group: Group) {
    groupForOptions = group;
    isGroupOptionsOpen = true;
  }

  function beginRenamePlayer() {
    if (!playerForOptions) return;
    playerToEdit = playerForOptions;
    inputName = playerForOptions.name;
    isPlayerOptionsOpen = false;
    isRenamePlayerOpen = true;
  }

  function beginDeletePlayer() {
    if (!playerForOptions) return;
    playerToDelete = playerForOptions;
    isPlayerOptionsOpen = false;
    isDeleteConfirmOpen = true;
  }

  function beginRenameGroup() {
    if (!groupForOptions) return;
    groupToEdit = groupForOptions;
    inputName = groupForOptions.name;
    isGroupOptionsOpen = false;
    isRenameGroupOpen = true;
  }

  function beginDeleteGroup() {
    if (!groupForOptions) return;
    groupToDelete = groupForOptions;
    isGroupOptionsOpen = false;
    isDeleteGroupOpen = true;
  }

  const winnerScoreOptions = [0, -30, -50, -100];
</script>

{#snippet tabButton(id: TabType, label: string)}
  <button onclick={() => switchTab(id)} class:on={activeTab === id}>{label}</button>
{/snippet}

<div class="app">
  <header>
    <h1>{pageTitle}</h1>
    <span class="sess">{currentGroup?.name}</span>
  </header>

  <nav>
    {@render tabButton("players", "Players")}
    {@render tabButton("history", "History")}
    {@render tabButton("settings", "Settings")}
  </nav>

  <main class="tab-viewport">
    {#if activeTab === "players"}
      <section class="pane pane-players" in:tabIn out:tabOut>
        <div class="round">
          <div class="rh">
            <h2>Round {rounds.length + 1}</h2>
            <button
              class="ic"
              onclick={undoLastRound}
              disabled={rounds.length === 0}
              aria-label="Undo last round"
              style:transform={isUndoSpinning ? "rotate(-360deg)" : "none"}
              style:transition="transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
            >
              <RotateCcw size={22} />
            </button>
          </div>
          <button class="hand" class:on={isHand} onclick={() => (isHand = !isHand)}>
            {isHand ? "Hand round (2x)" : "Regular round"}
          </button>
          <button class="fin" onclick={handleAdvanceRound} disabled={!winnerId || players.length < 2}>
            Finish round <ChevronRight size={22} />
          </button>
        </div>

        <div class="lh">
          <h3>Players</h3>
          <button class="add" onclick={() => { inputName = ""; isAddPlayerOpen = true; }}>+ Add player</button>
        </div>

        {#if players.length === 0}
          <div class="card empty">
            <UserPlus size={26} />
            <p>No players in this session</p>
          </div>
        {:else}
          <ul class="pl">
            {#each players as player, index (player.id)}
              {@const isWinner = winnerId === player.id}
              {@const roundChange = calculateRoundChange(player.id)}
              <li
                class="p"
                class:w={isWinner}
                animate:flip={{ duration: 350 }}
              >
                <button
                  class="rk"
                  onclick={() => (winnerId = isWinner ? null : player.id)}
                  aria-label="Set {player.name} as winner"
                >
                  {#if isWinner}<Crown size={22} />{:else}{index + 1}{/if}
                </button>
                <div class="nm">
                  <b>{player.name}</b>
                  <span>Total {calculateTotalScore(player.id)}</span>
                </div>
                <div class="dl" class:g={roundChange < 0} class:b={roundChange > 0}>
                  {roundChange > 0 ? "+" + roundChange : roundChange}
                </div>
                <button class="cb" onclick={() => openScoreDialog(player.id)} aria-label="Enter cards for {player.name}">
                  <CreditCard size={22} />
                </button>
                <button class="more" onclick={() => openPlayerOptions(player)} aria-label="Options for {player.name}">
                  <MoreHorizontal size={22} />
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {:else if activeTab === "history"}
      <section class="pane pane-history" in:tabIn out:tabOut>
        {#if rounds.length === 0}
          <div class="card empty">
            <p>No rounds played yet</p>
          </div>
        {:else}
          <div class="tw">
            <table>
              <thead>
                <tr>
                  <th></th>
                  {#each players as player}
                    <th class:lead={playerRanks[player.id] === 1}>{player.name}</th>
                  {/each}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {#each rounds as round}
                  <tr>
                    <td class="rn">#{round.id}{#if round.isHand}<span class="hd">2x</span>{/if}</td>
                    {#each players as player}
                      <td class:win={round.winnerId === player.id}>
                        {round.scores[player.id] > 0 ? "+" + round.scores[player.id] : round.scores[player.id]}
                      </td>
                    {/each}
                    <td><button class="ed" onclick={() => openEditRound(round)} aria-label="Edit round {round.id}"><Pencil size={20} /></button></td>
                  </tr>
                {/each}
              </tbody>
              <tfoot>
                <tr>
                  <td class="rn">Total</td>
                  {#each players as player}
                    <td>{calculateTotalScore(player.id)}</td>
                  {/each}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        {/if}
      </section>
    {:else if activeTab === "settings"}
      <section class="pane pane-settings" in:tabIn out:tabOut>
        <div class="card">
          <h3>Theme</h3>
          <p>Choose how the scoreboard looks.</p>
          <div class="themes">
            {#each THEMES as option}
              <button class="th" class:on={settings.theme === option.id} onclick={() => (settings.theme = option.id)}>
                <span class="sw" style:background={option.swatch}></span>
                {option.name}
              </button>
            {/each}
          </div>
        </div>

        <div class="card">
          <h3>Winner score</h3>
          <p>Points the winner gets each round.</p>
          <div class="chips">
            {#each winnerScoreOptions as option}
              <button class:on={settings.winnerScore === option} onclick={() => (settings.winnerScore = option)}>{option}</button>
            {/each}
          </div>
        </div>

        <div class="card">
          <div class="lh">
            <h3>Sessions</h3>
            <button class="add" onclick={() => { inputName = ""; isAddGroupOpen = true; }}>+ Session</button>
          </div>
          <p>Switch or manage scoreboards.</p>
          {#each groups as group}
            <div
              class="ses"
              class:on={settings.currentGroupId === group.id}
              role="button"
              tabindex="0"
              onclick={() => (settings.currentGroupId = group.id)}
              onkeydown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  settings.currentGroupId = group.id;
                }
              }}
            >
              <div>
                <b>{group.name}</b>
                <span>{group.players.length} players, {group.rounds.length} rounds</span>
              </div>
              <button class="more" onclick={(event) => { event.stopPropagation(); openGroupOptions(group); }} aria-label="Options for {group.name}">
                <MoreHorizontal size={22} />
              </button>
            </div>
          {/each}
        </div>

        <div class="btns">
          <button
            class="btn"
            disabled={!currentGroup || currentGroup.players.length === 0}
            onclick={() => {
              inputName = currentGroup ? currentGroup.name + " — Game " + (groups.length + 1) : "";
              isNewGameOpen = true;
            }}
          >New game with same players</button>
          <button class="btn danger" onclick={() => (isFullResetOpen = true)}>Reset all data</button>
        </div>
      </section>
    {/if}
  </main>
</div>

<!-- ==================== MODALS ==================== -->

<Modal isOpen={isPlayerOptionsOpen} onClose={() => (isPlayerOptionsOpen = false)} title={playerForOptions?.name || "Player options"}>
  <div class="btns">
    <button class="btn" onclick={beginRenamePlayer}>Rename player</button>
    <button class="btn danger" onclick={beginDeletePlayer}>Remove player</button>
  </div>
</Modal>

<Modal isOpen={isGroupOptionsOpen} onClose={() => (isGroupOptionsOpen = false)} title={groupForOptions?.name || "Session options"}>
  <div class="btns">
    <button class="btn" onclick={beginRenameGroup}>Rename session</button>
    {#if groups.length > 1}<button class="btn danger" onclick={beginDeleteGroup}>Remove session</button>{/if}
  </div>
</Modal>

<Modal isOpen={isAddPlayerOpen} onClose={() => (isAddPlayerOpen = false)} title="Add player">
  <form onsubmit={(event) => { event.preventDefault(); addPlayer(); }}>
    <input bind:value={inputName} placeholder="Enter player name..." />
    <button type="submit" class="fin">Add player</button>
  </form>
</Modal>

<Modal isOpen={isAddGroupOpen} onClose={() => (isAddGroupOpen = false)} title="New session">
  <form onsubmit={(event) => { event.preventDefault(); addGroup(); }}>
    <input bind:value={inputName} placeholder="Session name..." />
    <button type="submit" class="fin">Create session</button>
  </form>
</Modal>

<Modal isOpen={isNewGameOpen} onClose={() => (isNewGameOpen = false)} title="New game">
  <form onsubmit={(event) => { event.preventDefault(); startNewGameWithPlayers(); }}>
    <p class="modal-desc">Start a clean scoreboard with the same {players.length} players.</p>
    <input bind:value={inputName} placeholder="Game name..." />
    <button type="submit" class="fin">Start new game</button>
  </form>
</Modal>

<Modal isOpen={isRenameGroupOpen} onClose={() => { isRenameGroupOpen = false; groupToEdit = null; }} title="Rename session">
  <form onsubmit={(event) => { event.preventDefault(); renameGroup(); }}>
    <input bind:value={inputName} placeholder="New session name..." />
    <button type="submit" class="fin">Save changes</button>
  </form>
</Modal>

<Modal isOpen={isRenamePlayerOpen} onClose={() => { isRenamePlayerOpen = false; playerToEdit = null; }} title="Rename player">
  <form onsubmit={(event) => { event.preventDefault(); renamePlayer(); }}>
    <input bind:value={inputName} placeholder="New player name..." />
    <button type="submit" class="fin">Save changes</button>
  </form>
</Modal>

<Modal isOpen={isDeleteConfirmOpen} onClose={() => { isDeleteConfirmOpen = false; playerToDelete = null; }} title="Remove player?">
  <p class="modal-desc">Are you sure you want to remove <b>{playerToDelete?.name}</b>?</p>
  <div class="row2">
    <button class="btn" onclick={() => (isDeleteConfirmOpen = false)}>Cancel</button>
    <button class="btn danger" onclick={removePlayer}>Remove</button>
  </div>
</Modal>

<Modal isOpen={isDeleteGroupOpen} onClose={() => { isDeleteGroupOpen = false; groupToDelete = null; }} title="Remove session?">
  <p class="modal-desc">Are you sure you want to remove <b>{groupToDelete?.name}</b>? All rounds will be lost.</p>
  <div class="row2">
    <button class="btn" onclick={() => (isDeleteGroupOpen = false)}>Cancel</button>
    <button class="btn danger" onclick={() => groupToDelete && deleteGroup(groupToDelete.id)}>Remove</button>
  </div>
</Modal>

<Modal isOpen={isFullResetOpen} onClose={() => (isFullResetOpen = false)} title="Reset all data?">
  <p class="modal-desc">This permanently deletes all sessions, players, and game history.</p>
  <div class="row2">
    <button class="btn" onclick={() => (isFullResetOpen = false)}>Cancel</button>
    <button class="btn danger" onclick={resetGame}>Reset all</button>
  </div>
</Modal>

<Modal isOpen={isEditRoundOpen} onClose={() => { isEditRoundOpen = false; roundToEdit = null; }} title={"Edit round " + (roundToEdit?.id || "")}>
  <button class="hand" class:on={editIsHand} onclick={() => (editIsHand = !editIsHand)}>
    {editIsHand ? "Hand round (2x)" : "Regular round"}
  </button>
  <div class="edit-players-list">
    {#each players as player}
      {@const isEditedWinner = editWinnerId === player.id}
      <div class="edit-player-row">
        <button
          class="rk"
          class:on={isEditedWinner}
          onclick={() => chooseRoundWinner(player.id)}
          aria-label="Set {player.name} as winner"
        >
          {#if isEditedWinner}<Crown size={20} />{:else}<Check size={18} />{/if}
        </button>
        <div class="edit-player-name">
          <b>{player.name}</b>
          <span>{isEditedWinner ? "Winner" : "Player score"}</span>
        </div>
        {#if isEditedWinner}
          <b class="edit-winner-score">{editIsHand ? settings.winnerScore * 2 : settings.winnerScore}</b>
        {:else}
          <input
            type="number"
            class="edit-score-input"
            inputmode="numeric"
            value={editRoundScores[player.id] ?? 0}
            oninput={(event) => (editRoundScores = { ...editRoundScores, [player.id]: Number((event.currentTarget as HTMLInputElement).value) })}
            aria-label="Score for {player.name}"
          />
        {/if}
      </div>
    {/each}
  </div>
  <button class="fin" onclick={saveEditedRound} disabled={!editWinnerId}>Save round</button>
</Modal>

<Modal isOpen={isScoreDialogOpen} onClose={() => (isScoreDialogOpen = false)} title={"Score: " + (players.find((player) => player.id === selectedPlayerId)?.name || "")}>
  <div class="score-calc-header">
    <div class="sum">
      <span>Total round points</span>
      <b>{isHand ? selectedCards.reduce((sum, value) => sum + value, 0) * 2 : selectedCards.reduce((sum, value) => sum + value, 0)}</b>
    </div>
    {#if isHand}
      <span class="hd-badge">Hand (2x applied)</span>
    {/if}
  </div>

  <div>
    <div class="section-label">Tap card points to add:</div>
    <div class="cards">
      {#each CARD_VALUES as card}
        <button
          class="card-btn"
          onclick={() => (selectedCards = [...selectedCards, card.value])}
        >
          <span class="card-btn-label">{card.label}</span>
          <span class="card-btn-val">+{card.value}</span>
        </button>
      {/each}
    </div>
  </div>

  <button class="btn" onclick={() => (selectedCards = Array(10).fill(10))}>
    Full hand (+{isHand ? 200 : 100})
  </button>

  {#if selectedCards.length > 0}
    <div class="selected-cards-box">
      <div class="selected-cards-head">
        <span>Selected cards ({selectedCards.length}):</span>
        <button class="clear-btn" onclick={() => (selectedCards = [])}>Clear all</button>
      </div>
      <div class="selected-chips">
        {#each selectedCards as value, index}
          <button
            class="chip-tag"
            onclick={() => (selectedCards = selectedCards.filter((_, itemIndex) => itemIndex !== index))}
            aria-label="Remove card with value {value}"
          >
            <span>+{value}</span>
            <X size={13} />
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div>
    <div class="section-label">Or manual points override:</div>
    <input
      type="number"
      inputmode="numeric"
      bind:value={manualScoreInput}
      placeholder="Type custom score..."
    />
  </div>

  <button class="fin" onclick={applyCardScore}>Apply score</button>
</Modal>
