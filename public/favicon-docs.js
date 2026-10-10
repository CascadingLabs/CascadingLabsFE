// Set data-brand on <html> based on URL path for per-section accent colors
function setBrand() {
	var p = location.pathname;
	var brand = 'yosoi'; // default
	// Root home page uses Cascading Labs identity
	if (p === '/' || p === '') brand = 'cascading-labs';
	// Cross-reference pages use the target project's brand
	else if (p.startsWith('/yosoi/voidcrawl')) brand = 'voidcrawl';
	else if (p.startsWith('/yosoi/qscrape')) brand = 'qscrape';
	else if (p.startsWith('/voidcrawl/yosoi')) brand = 'yosoi';
	else if (p.startsWith('/voidcrawl/qscrape')) brand = 'qscrape';
	else if (p.startsWith('/qscrape')) brand = 'qscrape';
	else if (p.startsWith('/voidcrawl')) brand = 'voidcrawl';
	document.documentElement.dataset.brand = brand;
	renderFavicon(brand);
	updateTitle(brand);
}

function updateTitle(brand) {
	var siteName = brand === 'voidcrawl' ? 'VoidCrawl'
		: brand === 'qscrape' ? 'QScrape'
		: brand === 'cascading-labs' ? 'Cascading Labs'
		: 'Yosoi';
	var t = document.title || '';
	var stripped = t.replace(/\s*\|\s*(Yosoi|VoidCrawl|QScrape|Cascading Labs)\s*$/, '');
	document.title = stripped && stripped !== siteName
		? stripped + ' | ' + siteName
		: siteName;
}

var _svgCache = {};

function _getFaviconPath(brand, theme) {
	var t = theme === 'light' ? 'light' : 'dark';
	return '/favicon-' + brand + '-' + t + '.svg';
}

function _sanitizeSvg(text) {
	// Strip Google Fonts @import; external resources taint the canvas
	text = text.replace(/@import\s+url\([^)]*\)\s*;?/g, '');
	// Replace width="100%" with explicit dims so canvas can size the image
	text = text.replace(/\bwidth="100%"/, 'width="500" height="500"');
	return text;
}

function _drawToFavicon(svgText) {
	var canvas = document.createElement('canvas');
	canvas.width = 32;
	canvas.height = 32;
	var ctx = canvas.getContext('2d');
	// Use data: URL (allowed by CSP) instead of blob: (blocked)
	var src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
	var img = new Image();
	img.onload = function () {
		ctx.drawImage(img, 0, 0, 32, 32);
		var link =
			document.querySelector('link[rel="icon"]') ||
			document.querySelector('link[rel="shortcut icon"]');
		if (link) link.href = canvas.toDataURL('image/png');
	};
	img.src = src;
}

function renderFavicon(brand) {
	var theme = document.documentElement.dataset.theme || 'dark';
	var path = _getFaviconPath(brand, theme);
	if (_svgCache[path]) {
		_drawToFavicon(_svgCache[path]);
		return;
	}
	fetch(path)
		.then(function (r) { return r.text(); })
		.then(function (text) {
			_svgCache[path] = _sanitizeSvg(text);
			_drawToFavicon(_svgCache[path]);
		});
}

// Re-render when data-theme changes (user toggles light/dark)
new MutationObserver(function (mutations) {
	for (var i = 0; i < mutations.length; i++) {
		if (mutations[i].attributeName === 'data-theme') {
			renderFavicon(document.documentElement.dataset.brand || 'yosoi');
			break;
		}
	}
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

setBrand();
document.addEventListener('astro:page-load', setBrand);
