// Keep this list in sync with the data-like-id values used in index.html and mobile.html.
export const allowedLikeIds = [
	"ppt-ai-impact-on-modern-life",
	"ppt-ai-and-life",
	"ppt-bill-gates-biography",
	"ppt-chips",
	"ppt-clocks",
	"ppt-cold-chain",
	"ppt-keys-and-locks",
	"ppt-medical-longevity",
	"ppt-science-of-garbage",
	"ppt-twenty-years",
	"ppt-canned-civilization",
	"ppt-pills-industrial-miracle",
	"ppt-tires",
	"ppt-wifi",
	"ppt-world-cup",
	"ppt-airplane",
	"ppt-elevator",
	"ppt-screws",
	"ppt-the-art-of-cinema",
	"ppt-credit",
	"ppt-insurance",
	"ppt-navigation",
	"ppt-weather-forecast",
	"ppt-jensen-huang",
	"ppt-queueing",
	"ppt-fiber-optics-glass-nervous-system",
	"ppt-lithium-battery-tetherless-world",
	"ppt-concrete-liquid-skeleton",
	"project-hardware-monitoring",
	"project-diskpulse",
	"project-seiya058904-github-io",
	"project-nutriflow",
] as const;

const allowedLikeIdSet = new Set<string>(allowedLikeIds);

export function isAllowedLikeId(itemId: string) {
	return allowedLikeIdSet.has(itemId);
}
