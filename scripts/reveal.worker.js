let revealCanvas, revealCtx, sparkCanvas, sparkCtx, maskCanvas, maskCtx, tempCanvas, tempCtx;
let oldBitmap = null, newBitmap = null;
let oldReversed = false, newReversed = false;
let spriteCanvas;
let w = 0, h = 0, dpr = 1, sweepY = 0, particles = [], animId = null;

// 预渲染一颗带光晕的金粉贴图
function createSparkSprite() {
    const c = new OffscreenCanvas(32, 32);
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(253, 224, 71, 1)');
    grad.addColorStop(0.3, 'rgba(245, 158, 11, 0.8)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return c;
}

class GoldParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 9 + 4;
        this.size = (Math.random() * 2.5 + 1) * 6;
        this.vx = (Math.random() - 0.5) * 1.6;
        this.vy = Math.random() * 2.2 + 0.6;
        this.alpha = 1;
        this.decay = Math.random() * 0.025 + 0.015;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
    }
}

// 支持逆位垂直翻转的绘制辅助函数
function drawCardBitmap(ctx, bitmap, width, height, isReversed) {
    if (!bitmap) return;
    ctx.save();
    if (isReversed) {
        ctx.translate(0, height);
        ctx.scale(1, -1);
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    ctx.restore();
}

self.onmessage = function (e) {
    const {
        type, canvasReveal, canvasSpark,
        prevSnapshot, nextSnapshot, prevReversed, nextReversed,
        width, height, devicePixelRatio
    } = e.data;

    if (type === 'INIT') {
        revealCanvas = canvasReveal;
        revealCtx = revealCanvas.getContext('2d');
        sparkCanvas = canvasSpark;
        sparkCtx = sparkCanvas.getContext('2d');
        maskCanvas = new OffscreenCanvas(1, 1);
        maskCtx = maskCanvas.getContext('2d');
        tempCanvas = new OffscreenCanvas(1, 1);
        tempCtx = tempCanvas.getContext('2d');
        spriteCanvas = createSparkSprite();
    }

    if (type === 'START') {
        if (animId) self.cancelAnimationFrame(animId);
        if (oldBitmap) oldBitmap.close();
        if (newBitmap) newBitmap.close();

        oldBitmap = prevSnapshot || null;
        newBitmap = nextSnapshot;
        oldReversed = !!prevReversed;
        newReversed = !!nextReversed;

        w = width;
        h = height;
        dpr = devicePixelRatio || 1;
        const pw = Math.max(1, Math.round(w * dpr));
        const ph = Math.max(1, Math.round(h * dpr));

        [revealCanvas, sparkCanvas, maskCanvas, tempCanvas].forEach(c => {
            c.width = pw;
            c.height = ph;
        });
        [revealCtx, sparkCtx, maskCtx, tempCtx].forEach(ctx => {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        });

        sweepY = -10;
        particles = [];
        loop(); // 先立刻画出第 1 帧（此时画布上 100% 是旧牌）
        self.postMessage({ type: 'READY' }); // 通知主线程：画布已就绪，可以安全显示了
    }
};

function loop() {
    maskCtx.clearRect(0, 0, w, h);
    sparkCtx.clearRect(0, 0, w, h);

    // 绘制渐变扫光遮罩
    if (sweepY > 0) {
        const grad = maskCtx.createLinearGradient(0, sweepY - 30, 0, sweepY + 10);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        maskCtx.fillStyle = '#ffffff';
        maskCtx.fillRect(0, 0, w, Math.max(0, sweepY - 30));
        maskCtx.fillStyle = grad;
        maskCtx.fillRect(0, Math.max(0, sweepY - 30), w, 40);
    }

    // 生成新粒子
    if (sweepY < h + 40) {
        for (let i = 0; i < 18; i++) {
            particles.push(new GoldParticle(Math.random() * w, sweepY + (Math.random() - 0.5) * 24));
        }
        sweepY += 5.5;
    }

    // 更新与绘制粒子
    maskCtx.fillStyle = '#ffffff';
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
        }
        maskCtx.globalAlpha = p.alpha;
        maskCtx.beginPath();
        maskCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        maskCtx.fill();

        sparkCtx.globalAlpha = p.alpha;
        sparkCtx.drawImage(spriteCanvas, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    maskCtx.globalAlpha = 1;
    sparkCtx.globalAlpha = 1;

    // 裁剪出新牌已显现部分
    tempCtx.globalCompositeOperation = 'source-over';
    tempCtx.clearRect(0, 0, w, h);
    tempCtx.drawImage(maskCanvas, 0, 0, w, h);
    tempCtx.globalCompositeOperation = 'source-in';
    drawCardBitmap(tempCtx, newBitmap, w, h, newReversed);

    // 先铺旧牌，再盖新牌
    revealCtx.clearRect(0, 0, w, h);
    drawCardBitmap(revealCtx, oldBitmap, w, h, oldReversed);
    revealCtx.drawImage(tempCanvas, 0, 0, w, h);

    if (sweepY <= h + 40 || particles.length > 0) {
        animId = self.requestAnimationFrame(loop);
    } else {
        if (oldBitmap) { oldBitmap.close(); oldBitmap = null; }
        if (newBitmap) { newBitmap.close(); newBitmap = null; }
        self.postMessage({ type: 'DONE' });
    }
}