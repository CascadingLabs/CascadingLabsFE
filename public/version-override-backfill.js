// Overrides the version dropdown in archived pages with current version data.
// Loaded by archived HTML pages; latest pages use the inline script instead.
(function () {
	var VR = /^\d+\.\d+\.\d+[a-zA-Z]*\d*$/;
	var PRODUCTS = { yosoi: true, voidcrawl: true, opensesame: true };
	function info() {
		var path = location.pathname.charAt(0) === '/' ? location.pathname : '/' + location.pathname;
		var segs = path.split('/').filter(Boolean);
		var product = PRODUCTS[segs[0]] ? segs[0] : '';
		if (product && segs[1] === 'versions' && segs[2]) {
			var bare = '/' + [product].concat(segs.slice(3)).filter(Boolean).join('/');
			if (path.endsWith('/') && bare !== '/') bare += '/';
			return { cur: segs[2], product: product, bare: bare };
		}
		var legacy = VR.test(segs[0] || '');
		return {
			cur: legacy ? segs[0] : '',
			product: product,
			bare: legacy ? path.replace(/^\/[^/]+/, '') || '/' : path,
		};
	}
	function targetFor(pathInfo, slug) {
		if (!slug) return pathInfo.bare;
		if (!pathInfo.product) return '/' + slug + (pathInfo.bare === '/' ? '' : pathInfo.bare);
		var root = '/' + pathInfo.product;
		var suffix = pathInfo.bare === root ? '' : pathInfo.bare.slice(root.length);
		return root + '/versions/' + slug + suffix;
	}
	function run() {
		var dd = document.getElementById('sl-version-dropdown');
		var lb = document.getElementById('sl-version-label');
		if (!dd) return;
		fetch('/versions.json')
			.then(function (r) { return r.json(); })
			.then(function (vs) {
				var pathInfo = info();
				if (pathInfo.cur && lb) lb.textContent = pathInfo.cur;
				dd.innerHTML = '';
				var li = document.createElement('li');
				li.className = 'sl-version__option' + (!pathInfo.cur ? ' sl-version__option--current' : '');
				li.setAttribute('role', 'option');
				li.setAttribute('aria-selected', String(!pathInfo.cur));
				li.dataset.slug = '';
				li.textContent = 'Latest';
				dd.appendChild(li);
				vs.forEach(function (v) {
					var l = document.createElement('li');
					l.className = 'sl-version__option' + (v.slug === pathInfo.cur ? ' sl-version__option--current' : '');
					l.setAttribute('role', 'option');
					l.setAttribute('aria-selected', String(v.slug === pathInfo.cur));
					l.dataset.slug = v.slug;
					l.textContent = v.label;
					dd.appendChild(l);
				});
				dd.onclick = function (e) {
					var o = e.target.closest('.sl-version__option');
					if (!o) return;
					var s = o.dataset.slug;
					var t = targetFor(info(), s || '');
					var btn = document.getElementById('sl-version-btn');
					if (btn) btn.setAttribute('aria-expanded', 'false');
					dd.hidden = true;
					if (t !== location.pathname) location.href = t;
				};
			})
			.catch(function () {});
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', run);
	} else {
		run();
	}
})();
