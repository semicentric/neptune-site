if (window.UnicornStudio) {
    UnicornStudio.init();
} else {
    window.addEventListener('load', function () {
        if (window.UnicornStudio) UnicornStudio.init();
    });
}

document.getElementById('installBtn').addEventListener('click', function () {
    var btn = this;
    navigator.clipboard.writeText('cargo install neptune').then(function () {
        btn.classList.add('copied');
        setTimeout(function () {
            btn.classList.remove('copied');
        }, 1600);
    });
});
