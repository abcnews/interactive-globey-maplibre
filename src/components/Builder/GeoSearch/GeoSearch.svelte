<script lang="ts">
  import { Search } from 'svelte-bootstrap-icons';
  import { debounce } from 'throttle-debounce';
  import { searchGeoNames, type GeoNameResult } from './utils';

  interface Props {
    /** Callback fired when a location is selected */
    onselect?: (value: { name: string; coords: [number, number] }) => void;
    /** Optional placeholder text */
    placeholder?: string;
  }

  let { onselect, placeholder = 'Search location (e.g. Sydney, Tokyo)...' }: Props = $props();

  let searchTerm = $state('');
  let isSearching = $state(false);
  let results = $state<GeoNameResult[]>([]);
  let isDropdownOpen = $state(false);
  let containerEl = $state<HTMLDivElement>();

  async function performSearch(keyword: string) {
    if (!keyword.trim()) {
      results = [];
      isSearching = false;
      return;
    }

    isSearching = true;
    const currentSearchTerm = keyword;

    try {
      const searchResults = await searchGeoNames(keyword, progressResults => {
        if (searchTerm !== currentSearchTerm) return;
        results = progressResults.sort((a, b) => b.population - a.population).slice(0, 15);
      });

      if (searchTerm === currentSearchTerm) {
        results = searchResults.sort((a, b) => b.population - a.population).slice(0, 15);
        isSearching = false;
      }
    } catch (error) {
      console.error('GeoSearch error:', error);
      isSearching = false;
    }
  }

  const debouncedPerformSearch = debounce(300, performSearch);

  function handleInput(e: Event) {
    const val = (e.currentTarget as HTMLInputElement).value;
    searchTerm = val;
    if (val.trim()) {
      isDropdownOpen = true;
      debouncedPerformSearch(val);
    } else {
      results = [];
      isDropdownOpen = false;
    }
  }

  function handleSelect(row: GeoNameResult) {
    const value = {
      coords: [Number(row.longitude), Number(row.latitude)] as [number, number],
      name: row.name
    };
    searchTerm = '';
    results = [];
    isDropdownOpen = false;
    onselect?.(value);
  }

  function handleDocumentClick(e: MouseEvent) {
    if (containerEl && !containerEl.contains(e.target as Node)) {
      isDropdownOpen = false;
    }
  }
</script>

<svelte:document onclick={handleDocumentClick} />

<div class="geo-search-container" bind:this={containerEl}>
  <div class="input-wrapper">
    <Search class="search-icon" />
    <input
      type="text"
      value={searchTerm}
      oninput={handleInput}
      onfocus={() => {
        if (results.length > 0) isDropdownOpen = true;
      }}
      {placeholder}
      class="geo-search-input"
    />
  </div>

  {#if isDropdownOpen && (isSearching || results.length > 0 || searchTerm.trim().length > 1)}
    <div class="results-dropdown">
      {#if isSearching && results.length === 0}
        <div class="dropdown-status">Searching locations...</div>
      {:else if results.length === 0}
        <div class="dropdown-status">No matching locations found.</div>
      {:else}
        <ul class="results-list">
          {#each results as row (row.id)}
            <li>
              <button
                type="button"
                class="result-item"
                onclick={() => handleSelect(row)}
              >
                <div class="result-main">
                  <strong class="result-name">{row.name}</strong>
                  {#if row.countrycode}
                    <span class="result-country">{row.countrycode}</span>
                  {/if}
                </div>
                {#if row.population > 0}
                  <span class="result-pop">Pop: {row.population.toLocaleString()}</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      <div class="dropdown-footer">
        Geonames dataset (<a href="https://geonames.org/" target="_blank" rel="noopener noreferrer">geonames.org</a>)
      </div>
    </div>
  {/if}
</div>

<style>
  .geo-search-container {
    position: relative;
    width: 100%;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  :global(.search-icon) {
    position: absolute;
    left: 0.6rem;
    pointer-events: none;
    opacity: 0.6;
    font-size: 0.85rem;
  }

  .geo-search-input {
    width: 100%;
    padding: 0.45rem 0.6rem 0.45rem 2rem;
    background: var(--background-alt, #2c2c2f);
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    border-radius: 4px;
    color: var(--text, #ccc);
    font-size: 0.85rem;
  }

  .geo-search-input::-webkit-search-cancel-button,
  .geo-search-input::-webkit-search-decoration,
  .geo-search-input::-webkit-search-results-button,
  .geo-search-input::-webkit-search-results-decoration {
    -webkit-appearance: none;
    appearance: none;
    display: none;
  }

  .geo-search-input:focus {
    outline: none;
    border-color: #64b5f6;
    background: #252528;
  }

  .results-dropdown {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    right: 0;
    background: var(--background-alt, #2c2c2f);
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    border-radius: 4px;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    z-index: 200;
    max-height: 260px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .dropdown-status {
    padding: 0.6rem 0.75rem;
    font-size: 0.8rem;
    color: var(--text-light, #888);
    font-style: italic;
  }

  .results-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
  }

  .results-list li {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .results-list li:last-child {
    border-bottom: none;
  }

  .result-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.45rem 0.75rem;
    background: none;
    border: none;
    color: var(--text, #ccc);
    text-align: left;
    cursor: pointer;
    font-size: 0.82rem;
    border-radius: 0;
  }

  .result-item:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  .result-main {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .result-country {
    font-size: 0.75rem;
    color: var(--text-light, #888);
    background: rgba(255, 255, 255, 0.08);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
  }

  .result-pop {
    font-size: 0.75rem;
    color: var(--text-light, #888);
  }

  .dropdown-footer {
    padding: 0.3rem 0.6rem;
    font-size: 0.7rem;
    color: var(--text-light, #888);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(0, 0, 0, 0.15);
  }

  .dropdown-footer a {
    color: inherit;
    text-decoration: underline;
  }
</style>
