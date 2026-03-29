// Overrides the version dropdown in archived pages with current version data.
// Loaded by archived HTML pages; latest pages use the inline script instead.
(function () {
	var VR = /^\d+\.\d+\.\d+[a-zA-Z]*\d*$/;
	function run() {
		var dd = document.getElementById('sl-version-dropdown');
		var lb = document.getElementById('sl-version-label');
		if (!dd) return;
		fetch('/versions.json')
			.then(function (r) { return r.json(); })
			.then(function (vs) {
				var segs = location.pathname.split('/').filter(Boolean);
				var cur = VR.test(segs[0] || '') ? segs[0] : '';
				if (cur && lb) lb.textContent = cur;
				dd.innerHTML = '';
				var li = document.createElement('li');
				li.className = 'sl-version__option' + (!cur ? ' sl-version__option--current' : '');
				li.setAttribute('role', 'option');
				li.setAttribute('aria-selected', String(!cur));
				li.dataset.slug = '';
				li.textContent = 'Latest';
				dd.appendChild(li);
				vs.forEach(function (v) {
					var l = document.createElement('li');
					l.className = 'sl-version__option' + (v.slug === cur ? ' sl-version__option--current' : '');
					l.setAttribute('role', 'option');
					l.setAttribute('aria-selected', String(v.slug === cur));
					l.dataset.slug = v.slug;
					l.textContent = v.label;
					dd.appendChild(l);
				});
				dd.onclick = function (e) {
					var o = e.target.closest('.sl-version__option');
					if (!o) return;
					var s = o.dataset.slug;
					var bp = cur ? location.pathname.replace(/^\/[^/]+/, '') || '/' : location.pathname;
					var t = s ? '/' + s + bp : bp;
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
