function toast(content) {
    const current = document.querySelectorAll('.toast');
    current.forEach(node => {
        const bottom = node.computedStyleMap().get('bottom').value;
        node.style.bottom = `${bottom + 80}px`;
    })
    const bottom = 30 * (current.length + 1);
    const elem = document.createElement('div');
    elem.classList.add('toast');
    elem.innerHTML = content;
    setTimeout(() => document.body.appendChild(elem), current.length ? 400 : 0);
    
    setTimeout(() => {
        elem.style.opacity = '0';
        setTimeout(() => document.body.removeChild(elem), 500);
    }, 3000);
    return elem;
}

