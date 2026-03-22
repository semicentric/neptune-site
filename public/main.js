if (window.UnicornStudio) UnicornStudio.init();

var DURATION = 400;
var EASE = 'cubic-bezier(0.19, 1, 0.22, 1)';
var MAX_FADE = 150;

function fadeDur(fraction) {
    return Math.min(DURATION * fraction, MAX_FADE);
}

function segmentText(value) {
    var chars = value.split('');
    var segments = [];
    var seen = {};

    for (var i = 0; i < chars.length; i++) {
        var ch = chars[i];
        var display = ch === ' ' ? '\u00A0' : ch;
        if (seen[ch]) {
            segments.push({ id: ch + '-' + i, string: display });
        } else {
            seen[ch] = true;
            segments.push({ id: ch, string: display });
        }
    }
    return segments;
}

function measureChildren(el) {
    var m = {};
    var children = el.children;
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.hasAttribute('torph-exiting')) continue;
        var key = child.getAttribute('torph-id') || 'c-' + i;
        m[key] = { x: child.offsetLeft, y: child.offsetTop };
    }
    return m;
}

function parseTranslate(el) {
    var t = getComputedStyle(el).transform;
    if (!t || t === 'none') return { tx: 0, ty: 0 };
    var match = t.match(/matrix\(([^)]+)\)/);
    if (!match) return { tx: 0, ty: 0 };
    var v = match[1].split(',').map(Number);
    return { tx: v[4] || 0, ty: v[5] || 0 };
}

function cancelAnims(el) {
    var p = parseTranslate(el);
    var opacity = Number(getComputedStyle(el).opacity) || 1;
    el.getAnimations().forEach(function(a) { a.cancel(); });
    return { tx: p.tx, ty: p.ty, opacity: opacity };
}

function delta(prev, curr, key) {
    var p = prev[key], c = curr[key];
    if (!p || !c) return { dx: 0, dy: 0 };
    return { dx: p.x - c.x, dy: p.y - c.y };
}

function nearestAnchor(idx, ids, persistent, dir) {
    var search = function(d) {
        if (d === 'back') {
            for (var j = idx - 1; j >= 0; j--) if (persistent[ids[j]]) return ids[j];
        } else {
            for (var j = idx + 1; j < ids.length; j++) if (persistent[ids[j]]) return ids[j];
        }
        return null;
    };
    if (dir === 'fwd') return search('fwd') || search('back');
    return search('back') || search('fwd');
}

function createMorph(el) {
    el.setAttribute('torph-root', '');
    var state = { currentText: '', prevMeasures: {}, isFirst: true };

    function update(value) {
        if (value === state.currentText) return;
        state.currentText = value;

        var segments = segmentText(value);
        state.prevMeasures = measureChildren(el);

        var oldChildren = Array.from(el.children);
        var newIds = {};
        segments.forEach(function(s) { newIds[s.id] = true; });

        var exiting = [];
        var exitingSet = new Set();
        oldChildren.forEach(function(child) {
            var id = child.getAttribute('torph-id');
            if (!newIds[id] && !child.hasAttribute('torph-exiting')) {
                exiting.push(child);
                exitingSet.add(child);
            }
        });

        var oldIds = oldChildren.map(function(c) { return c.getAttribute('torph-id'); });
        var persistentOld = {};
        oldIds.forEach(function(id, i) {
            if (newIds[id] && !exitingSet.has(oldChildren[i])) persistentOld[id] = true;
        });

        var exitAnchorMap = new Map();
        exiting.forEach(function(child) {
            var idx = oldChildren.indexOf(child);
            exitAnchorMap.set(child, nearestAnchor(idx, oldIds, persistentOld, 'fwd'));
        });

        var snapshots = exiting.map(function(child) {
            var tr = parseTranslate(child);
            var op = Number(getComputedStyle(child).opacity) || 1;
            child.getAnimations().forEach(function(a) { a.cancel(); });
            return { left: child.offsetLeft + tr.tx, top: child.offsetTop + tr.ty, width: child.offsetWidth, height: child.offsetHeight, opacity: op };
        });
        exiting.forEach(function(child, i) {
            var s = snapshots[i];
            child.setAttribute('torph-exiting', '');
            child.style.position = 'absolute';
            child.style.pointerEvents = 'none';
            child.style.left = s.left + 'px';
            child.style.top = s.top + 'px';
            child.style.width = s.width + 'px';
            child.style.height = s.height + 'px';
            child.style.opacity = String(s.opacity);
        });

        var reusable = {};
        oldChildren.forEach(function(child) {
            var id = child.getAttribute('torph-id');
            if (newIds[id] && !child.hasAttribute('torph-exiting')) {
                reusable[id] = child;
                child.remove();
            }
        });

        Array.from(el.childNodes).forEach(function(node) {
            if (node.nodeType === Node.TEXT_NODE) node.remove();
        });

        segments.forEach(function(seg) {
            var existing = reusable[seg.id];
            if (existing) {
                existing.textContent = seg.string;
                el.appendChild(existing);
            } else {
                var span = document.createElement('span');
                span.setAttribute('torph-item', '');
                span.setAttribute('torph-id', seg.id);
                span.textContent = seg.string;
                el.appendChild(span);
            }
        });

        var currentMeasures = measureChildren(el);

        exiting.forEach(function(child) {
            if (state.isFirst) { child.remove(); return; }
            var anchor = exitAnchorMap.get(child);
            var d = anchor ? delta(currentMeasures, state.prevMeasures, anchor) : { dx: 0, dy: 0 };

            child.animate({ transform: 'translate(' + d.dx + 'px,' + d.dy + 'px) scale(0.95)', offset: 1 }, { duration: DURATION, easing: EASE, fill: 'both' });
            var fade = child.animate({ opacity: 0, offset: 1 }, { duration: fadeDur(0.25), easing: 'linear', fill: 'both' });
            fade.onfinish = function() { child.remove(); };
        });

        if (state.isFirst) {
            state.isFirst = false;
            return;
        }

        var segIds = segments.map(function(s) { return s.id; });
        var persistentNew = {};
        segIds.forEach(function(id) { if (state.prevMeasures[id]) persistentNew[id] = true; });

        var children = Array.from(el.children);
        children.forEach(function(child, i) {
            if (child.hasAttribute('torph-exiting')) return;
            var key = child.getAttribute('torph-id') || 'c-' + i;
            var isNew = !state.prevMeasures[key];

            var dKey = isNew ? nearestAnchor(segIds.indexOf(key), segIds, persistentNew, 'back') : key;
            var d = dKey ? delta(state.prevMeasures, currentMeasures, dKey) : { dx: 0, dy: 0 };

            var prev = cancelAnims(child);
            var sx = d.dx + prev.tx;
            var sy = d.dy + prev.ty;
            var startOp = (isNew && prev.opacity >= 1) ? 0 : prev.opacity;

            child.animate([
                { transform: 'translate(' + sx + 'px,' + sy + 'px) scale(' + (isNew ? 0.95 : 1) + ')' },
                { transform: 'none' }
            ], { duration: DURATION, easing: EASE, fill: 'both' });

            if (startOp < 1) {
                child.animate(
                    [{ opacity: startOp }, { opacity: 1 }],
                    { duration: fadeDur(isNew ? 0.5 : 0.25), delay: isNew ? fadeDur(0.25) : 0, easing: 'linear', fill: 'both' }
                );
            }
        });
    }

    return update;
}

var installMorph = createMorph(document.getElementById('morphText'));
installMorph('cargo install neptune');

var morphTimeout = null;
document.getElementById('installBtn').addEventListener('click', function () {
    var btn = this;
    navigator.clipboard.writeText('cargo install neptune').then(function () {
        if (morphTimeout) clearTimeout(morphTimeout);
        installMorph('copied');
        btn.classList.add('copied');
        morphTimeout = setTimeout(function () {
            installMorph('cargo install neptune');
            btn.classList.remove('copied');
            morphTimeout = null;
        }, 1600);
    });
});

var contactMorph = createMorph(document.getElementById('contactMorphText'));
contactMorph('Contact');

var contactBtn = document.getElementById('contactBtn');
var contactTimeout = null;
contactBtn.addEventListener('click', function () {
    navigator.clipboard.writeText('plyght@semicentric.co').then(function () {
        if (contactTimeout) clearTimeout(contactTimeout);
        contactMorph('copied');
        contactTimeout = setTimeout(function () {
            contactMorph('Contact');
            contactTimeout = null;
        }, 1600);
    });
});

var pricingOverlay = document.getElementById('pricingOverlay');
document.getElementById('pricingLink').addEventListener('click', function (e) {
    e.preventDefault();
    pricingOverlay.classList.add('open');
});
document.getElementById('pricingClose').addEventListener('click', function () {
    pricingOverlay.classList.remove('open');
});
pricingOverlay.addEventListener('click', function (e) {
    if (e.target === pricingOverlay) pricingOverlay.classList.remove('open');
});
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pricingOverlay.classList.contains('open')) {
        pricingOverlay.classList.remove('open');
    }
});
