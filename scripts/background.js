(() => {
    const showCanvas = document.getElementById('startrail');
    if (!showCanvas || !showCanvas.transferControlToOffscreen) return;

    const offscreen = showCanvas.transferControlToOffscreen();
    const starWorker = new Worker(`${window.location.href}scripts/startrail.worker.js`);

    starWorker.onerror = (err) => {
        console.error('startrail.worker.js 运行异常:', err.message);
    };

    const getCanvasSize = () => ({
        width: showCanvas.offsetWidth || window.innerWidth,
        height: showCanvas.offsetHeight || Math.round(window.innerHeight * 1.2)
    });

    // 初始化星轨
    const initialSize = getCanvasSize();
    starWorker.postMessage(
        {
            type: 'INIT',
            canvas: offscreen,
            width: initialSize.width,
            height: initialSize.height
        },
        [offscreen]
    );

    // 监听与 CSS 相同的 720px 断点：仅在“手机尺寸 <-> 电脑尺寸”互相跨越时才触发一次
    const mobileQuery = window.matchMedia('(max-width: 720px)');
    mobileQuery.addEventListener('change', () => {
        // 稍微延迟一帧等待 CSS 布局切换稳定后再获取新宽高
        requestAnimationFrame(() => {
            const { width, height } = getCanvasSize();
            starWorker.postMessage({
                type: 'RESIZE',
                width,
                height
            });
        });
    });
})();