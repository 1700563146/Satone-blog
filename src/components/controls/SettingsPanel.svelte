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
				<span class="neoToggle">
					<input type="checkbox" checked={starfield} onchange={toggleStarfield} aria-label="星空背景" />
					<span class="neoToggle-track" aria-hidden="true"></span>
				</span>
			</label>

			<label class="settings-row">
				<span class="settings-row-label">
					<Icon icon="material-symbols:flare-rounded" class="text-[1.05rem]"></Icon>
					指针光晕
				</span>
				<span class="neoToggle">
					<input type="checkbox" checked={glow} onchange={toggleGlow} aria-label="指针光晕" />
					<span class="neoToggle-track" aria-hidden="true"></span>
				</span>
			</label>

			<label class="settings-row">
				<span class="settings-row-label">
					<Icon icon="material-symbols:line-start-circle" class="text-[1.05rem]"></Icon>
					指针连线
				</span>
				<span class="neoToggle">
					<input
						type="checkbox"
						checked={pointerLinks}
						onchange={togglePointerLinks}
						aria-label="指针连线"
					/>
					<span class="neoToggle-track" aria-hidden="true"></span>
				</span>
			</label>

			<p class="settings-hint">星空与连线在暗色主题下才可见。</p>
		</div>
	</div>
</div>

<style>
	/* 面板底色压得实一点：背后是横幅视频时也能读清 */
	#site-settings-panel {
		background-color: color-mix(in oklch, var(--card-bg) 94%, transparent);
	}

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

	/* 拟物拨动开关：白色凹槽 + 金属渐变圆钮（参考 Uiverse 的 neomorphic toggle，缩到面板尺寸） */
	.neoToggle {
		position: relative;
		flex: none;
		display: inline-flex;
	}

	.neoToggle input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: pointer;
		z-index: 1;
	}

	.neoToggle-track {
		position: relative;
		display: block;
		width: 46px;
		height: 26px;
		border-radius: 9999px;
		background-color: color-mix(in oklch, var(--card-bg) 72%, white);
		box-shadow:
			inset 0 0 3px 2px rgba(255, 255, 255, 0.9),
			inset 0 0 8px 1px rgba(0, 0, 0, 0.42),
			inset 0 0 0 1.5px rgba(0, 0, 0, 0.28),
			0 1px 2px rgba(0, 0, 0, 0.12);
		transition: transform 0.4s ease;
	}

	.neoToggle-track::before {
		content: "";
		position: absolute;
		top: 3px;
		left: 3px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background-image: linear-gradient(130deg, #757272 10%, #ffffff 11%, #726f6f 62%);
		box-shadow:
			0 2px 1px rgba(0, 0, 0, 0.3),
			3px 3px 6px rgba(0, 0, 0, 0.28);
		transition:
			left 0.35s cubic-bezier(0.4, 0, 0.2, 1),
			background-image 0.35s ease;
	}

	.neoToggle input:checked + .neoToggle-track::before {
		left: 23px;
		background-image: linear-gradient(315deg, #0a0a0a 0%, #414141 70%);
	}

	/* 悬停时轻微倾斜，像真的实体开关被按住 */
	.neoToggle:hover .neoToggle-track {
		transform: perspective(100px) rotateX(5deg) rotateY(-5deg);
	}

	.neoToggle:hover input:checked + .neoToggle-track {
		transform: perspective(100px) rotateX(-5deg) rotateY(5deg);
	}

	.neoToggle input:focus-visible + .neoToggle-track {
		outline: 2px solid var(--primary);
		outline-offset: 3px;
	}

	/* 暗色下凹槽压低一点，别亮得像块白塑料 */
	:global(.dark) .neoToggle-track {
		/* 暗色下也保持「浅色凹槽 + 深色圆钮」，才看得出开关状态（和参考图一致） */
		background-color: color-mix(in oklch, var(--card-bg) 35%, #dfe3ec);
		box-shadow:
			inset 0 0 3px 2px rgba(255, 255, 255, 0.75),
			inset 0 0 9px 1px rgba(0, 0, 0, 0.55),
			inset 0 0 0 1.5px rgba(0, 0, 0, 0.35),
			0 1px 2px rgba(0, 0, 0, 0.45);
	}

	.settings-hint {
		margin: 0.4rem 0.45rem 0;
		font-size: 0.66rem;
		line-height: 1.5;
		color: color-mix(in oklch, currentColor 50%, transparent);
	}
</style>
