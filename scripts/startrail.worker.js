// scripts/star.worker.js
let showCanvas, showCtx;
let helpCanvas, helpCtx;

let showWidth = 0, showHeight = 0, longSide = 0;
let drawTimes = 0;
const stars = [];
let animId = null;

function rand(min, max) {
    return min + Math.round(Math.random() * (max - min));
}

function randomColor() {
    const r = rand(130, 170);
    const g = rand(140, 170);
    const b = rand(200, 240);
    const a = rand(30, 100) / 100;
    return `rgba(${r},${g},${b},${a})`;
}

function createStar() {
    return {
        x: rand(-helpCanvas.width, helpCanvas.width),
        y: rand(-helpCanvas.height, helpCanvas.height),
        size: 1.2,
        color: randomColor()
    };
}

function drawAllStars() {
    helpCtx.clearRect(0, 0, helpCanvas.width, helpCanvas.height);
    let i = stars.length;
    while (i--) {
        const s = stars[i];
        helpCtx.beginPath();
        helpCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2, true);
        helpCtx.fillStyle = s.color;
        helpCtx.fill();
    }
}

function setupHelpCanvas() {
    longSide = Math.max(showWidth, showHeight);
    helpCanvas.width = Math.round(longSide * 2.6);
    helpCanvas.height = Math.round(longSide * 2.6);

    stars.length = 0;
    let count = 5000;
    while (count--) {
        stars.push(createStar());
    }
    drawAllStars();
}

function resetShowCanvas() {
    showCanvas.width = showWidth;
    showCanvas.height = showHeight;

    // 重置变换矩阵后再填充纯黑背景
    showCtx.setTransform(1, 0, 0, 1, 0, 0);
    showCtx.fillStyle = '#000';
    showCtx.fillRect(0, 0, showWidth, showHeight);
    drawTimes = 0;

    // 旋转时以左下角为原点
    showCtx.translate(0, showHeight);
}

function loop() {
    // 旋转叠印预渲染星图
    showCtx.drawImage(helpCanvas, -helpCanvas.width / 2, -helpCanvas.height / 2);

    drawTimes++;

    // 每隔 8 帧叠加半透明黑幕，产生长曝光星轨渐隐效果
    if (drawTimes > 200 && drawTimes % 8 === 0) {
        showCtx.fillStyle = 'rgba(0, 0, 0, .04)';
        showCtx.fillRect(-longSide * 3, -longSide * 3, longSide * 6, longSide * 6);
    }

    // 逆时针缓慢旋转
    showCtx.rotate(-0.025 * Math.PI / 180);

    animId = self.requestAnimationFrame(loop);
}

self.onmessage = function (e) {
    const { type, canvas, width, height } = e.data;

    if (type === 'INIT') {
        showCanvas = canvas;
        showCtx = showCanvas.getContext('2d', { alpha: false });
        // 在 Worker 内部创建离屏辅助画布
        helpCanvas = new OffscreenCanvas(1, 1);
        helpCtx = helpCanvas.getContext('2d');

        showWidth = width;
        showHeight = height;

        setupHelpCanvas();
        resetShowCanvas();
        loop();
    }

    if (type === 'RESIZE') {
        if (animId) self.cancelAnimationFrame(animId);
        showWidth = width;
        showHeight = height;
        setupHelpCanvas();
        resetShowCanvas();
        loop();
    }
};
