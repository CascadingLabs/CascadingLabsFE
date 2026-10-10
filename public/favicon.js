(function () {
    var _clFaviconCache = {};

    function _sanitizeSvg(text) {
        text = text.replace(/@import\s+url\([^)]*\)\s*;?/g, '');
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
            var link = document.getElementById('cl-favicon');
            if (link) link.href = canvas.toDataURL('image/png');
        };
        img.src = src;
    }

    function renderClFavicon() {
        var theme = document.documentElement.dataset.theme || 'dark';
        var path = '/favicon-cascading-labs-' + (theme === 'light' ? 'light' : 'dark') + '.svg';
        if (_clFaviconCache[path]) { _drawToFavicon(_clFaviconCache[path]); return; }
        fetch(path)
            .then(function (r) { return r.text(); })
            .then(function (text) {
                _clFaviconCache[path] = _sanitizeSvg(text);
                _drawToFavicon(_clFaviconCache[path]);
            });
    }

    renderClFavicon();

    new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].attributeName === 'data-theme') {
                renderClFavicon();
                break;
            }
        }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
