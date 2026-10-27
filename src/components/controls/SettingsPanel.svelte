<script lang="ts">
	// 统一的「设置」面板：主题切换 + 特效开关都收在这里，挂在导航栏右侧
	//
	// 用 float-panel 的既有约定（data-floating-panel / data-floating-panel-trigger），
	// 和音乐面板、搜索面板共用同一套开合逻辑，不用额外的显示/隐藏代码。
	import { onMount } from "svelte";
	import Icon from "@/components/common/Icon.svelte";
	import { DARK_MODE, LIGHT_MODE, SYSTEM_MODE } from "@/constants/constants";
	import I18nKey from "@/i18n/i18nKey";
	import { i18n } from "@/i18n/translation";
	import type { LIGHT_DARK_MODE } from "@/types/config";
	import {
		applyThemeToDocument,
		getStoredCursorGlowEnabled,
		getStoredPointerLinksEnabled,
		getStoredStarfieldEnabled,
		getStoredTheme,
		setCursorGlowEnabled,
		setPointerLinksEnabled,
		setStarfieldEnabled,
		setTheme,
	} from "@/utils/setting-utils";

	let open = $state(false);
	let panelEl: HTMLDivElement | undefined = $state();
	let mode: LIGHT_DARK_MODE = $state(LIGHT_MODE);
	let starfield = $state(true);
	let glow = $state(true);
	let pointerLinks = $state(true);

	const themeOptions: Array<{
		value: LIGHT_DARK_MODE;
		label: string;
		icon: string;
	}> = [
		{
			value: LIGHT_MODE,
			label: i18n(I18nKey.lightMode),
			icon: "material-symbols:wb-sunny-outline-rounded",
		},
		{
			value: DARK_MODE,
			label: i18n(I18nKey.darkMode),
			icon: "material-symbols:dark-mode-outline-rounded",
		},
		{
			value: SYSTEM_MODE,
			label: i18n(I18nKey.systemMode),
			icon: "material-symbols:brightness-auto-outline-rounded",
		},
	];

	function switchTheme(next: LIGHT_DARK_MODE) {
		mode = next;
		setTheme(next);
		applyThemeToDocument(next);
	}

	function toggleStarfield() {
		starfield = !starfield;
		setStarfieldEnabled(starfield);
	}

	function toggleGlow() {
		glow = !glow;
		setCursorGlowEnabled(glow);
	}

	function togglePointerLinks() {
		pointerLinks = !pointerLinks;
		setPointerLinksEnabled(pointerLinks);
	}

	// 面板开合：维护 float-panel 的 class 与可访问性属性
	$effect(() => {
		if (!panelEl) return;
		panelEl.classList.toggle("float-panel-closed", !open);
		panelEl.inert = !open;
		panelEl.setAttribute("aria-hidden", String(!open));
		document
			.getElementById("site-settings-switch")
			?.setAttribute("aria-expanded", String(open));
	});

	onMount(() => {
		mode = getStoredTheme();
		starfield = getStoredStarfieldEnabled();
		glow = getStoredCursorGlowEnabled();
		pointerLinks = getStoredPointerLinksEnabled();

		// 别处（例如旧的星空按钮、设置面板里的同名开关）改了值也同步
		const onStarfield = (event: Event) => {
			const detail = (event as CustomEvent<{ enabled: boolean }>).detail;
			if (detail) starfield = detail.enabled;
		};
		const onGlow = (event: Event) => {
			const detail = (event as CustomEvent<{ enabled: boolean }>).detail;
			if (detail) glow = detail.enabled;
		};
		const onLinks = (event: Event) => {
			const detail = (event as CustomEvent<{ enabled: boolean }>).detail;
			if (detail) pointerLinks = detail.enabled;
		};
		const onTheme = (event: Event) => {
			const detail = (event as CustomEvent<{ theme: LIGHT_DARK_MODE }>).detail;
			if (detail?.theme) mode = detail.theme;
		};
		window.addEventListener("starfieldToggle", onStarfield);
		window.addEventListener("cursorGlowToggle", onGlow);
		window.addEventListener("pointerLinksToggle", onLinks);
		window.addEventListener("theme-change", onTheme);

		// 点面板以外的地方、或按 Esc 收起
		const onDocClick = (event: MouseEvent) => {
			if (!open) return;
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (panelEl?.contains(target)) return;
			const trigger = document.getElementById("site-settings-switch");
			if (trigger?.contains(target)) return;
			open = false;
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape" && open) open = false;
		};
		document.addEventListener("click", onDocClick);
		document.addEventListener("keydown", onKey);

		return () => {
			document.removeEventListener("click", onDocClick);
			document.removeEventListener("keydown", onKey);
			window.removeEventListener("starfieldToggle", onStarfield);
			window.removeEventListener("cursorGlowToggle", onGlow);
			window.removeEventListener("pointerLinksToggle", onLinks);
			window.removeEventListener("theme-change", onTheme);
		};
	});
</script>

<div class="z-50">
	<button
		aria-label="设置"
		aria-haspopup="dialog"
		aria-controls="site-settings-panel"
		aria-expanded="false"
		class="btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90"
		id="site-settings-switch"
		title="设置"
		onclick={() => {
			open = !open;
		}}
	>
		<Icon icon="material-symbols:settings-outline-rounded" class="text-[1.25rem]"></Icon>
	</button>

	<div
		bind:this={panelEl}
		id="site-settings-panel"
		class="float-panel float-panel-closed absolute transition-all top-21 right-4 z-50 w-72 p-3 text-neutral-900 dark:text-neutral-100"
		role="dialog"
		aria-labelledby="site-settings-switch"
		data-floating-panel
		data-floating-panel-trigger="site-settings-switch"
		inert
		aria-hidden="true"
	>
		<!-- 主题 -->
		<div class="settings-block">
			<p class="settings-title">主题</p>
			<div class="settings-segment">
				{#each themeOptions as option (option.value)}
					<button
						type="button"
						class="settings-segment-item"
						data-active={mode === option.value}
						onclick={() => switchTheme(option.value)}
						title={option.label}
					>
						<Icon icon={option.icon} class="text-[1.05rem]"></Icon>
						<span>{option.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- 特效开关 -->
		<div class="settings-block">
			<p class="settings-title">特效</p>

			<label class="settings-row">
				<span class="settings-row-label">
					<Icon icon="material-symbols:auto-awesome-outline" class="text-[1.05rem]"></Icon>
					星空背景
				</span>
				<input type="checkbox" class="settings-switch" checked={starfield} onchange={toggleStarfield} />
			</label>

			<label class="settings-row">
				<span class="settings-row-label">
					<Icon icon="material-symbols:blur-on-rounded" class="text-[1.05rem]"></Icon>
					指针光晕
				</span>
				<input type="checkbox" class="settings-switch" checked={glow} onchange={toggleGlow} />
			</label>

			<label class="settings-row">
				<span class="settings-row-label">
					<Icon icon="material-symbols:line-start-circle" class="text-[1.05rem]"></Icon>
					指针连线
				</span>
				<input
					type="checkbox"
					class="settings-switch"
					checked={pointerLinks}
					onchange={togglePointerLinks}
				/>
			</label>

			<p class="settings-hint">星空与连线在暗色主题下才可见。</p>
		</div>
	</div>
</div>

<style>
	.settings-block + .settings-block {
		margin-top: 0.25rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--card-border);
	}

	.settings-title {
		margin: 0 0 0.5rem;
		padding: 0 0.35rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: color-mix(in oklch, currentColor 55%, transparent);
	}

	.settings-segment {
		display: flex;
		gap: 0.25rem;
		padding: 0.2rem;
		border-radius: 0.85rem;
		background-color: var(--btn-regular-bg);
	}

	.settings-segment-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		padding: 0.45rem 0.25rem;
		border-radius: 0.65rem;
		font-size: 0.68rem;
		color: color-mix(in oklch, currentColor 70%, transparent);
		transition:
			background-color 160ms ease,
			color 160ms ease;
	}

	.settings-segment-item:hover {
		background-color: var(--btn-regular-bg-hover);
	}

	.settings-segment-item[data-active="true"] {
		background-color: var(--primary);
		color: var(--on-primary);
	}

	.settings-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0.45rem;
		border-radius: 0.7rem;
		cursor: pointer;
		transition: background-color 160ms ease;
	}

	.settings-row:hover {
		background-color: var(--btn-plain-bg-hover);
	}

	.settings-row-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
	}

	.settings-hint {
		margin: 0.4rem 0.45rem 0;
		font-size: 0.66rem;
		line-height: 1.5;
		color: color-mix(in oklch, currentColor 50%, transparent);
	}
</style>
