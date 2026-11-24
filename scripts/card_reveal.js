const tarotDiv = document.getElementById('cardStack');
const cardLeft = tarotDiv.querySelector('.card-left');
const cardRight = tarotDiv.querySelector('.card-right');
const cardImg = document.querySelector('.card-img');
const revealCanvas = document.getElementById('revealCanvas');
const sparkCanvas = document.getElementById('sparkOverlay');

// 加载外部 Worker 文件（如放在子目录请修改路径，如 './js/reveal.worker.js'）
const worker = new Worker('scripts/reveal.worker.js');

// 监听 Worker 加载或运行错误，方便排查路径问题
worker.onerror = function (err) {
    console.error('reveal.worker.js 加载或运行出错:', err.message);
};

const offscreenReveal = revealCanvas.transferControlToOffscreen();
const offscreenSpark = sparkCanvas.transferControlToOffscreen();

worker.postMessage(
    { type: 'INIT', canvasReveal: offscreenReveal, canvasSpark: offscreenSpark },
    [offscreenReveal, offscreenSpark]
);

let hasPreviousCard = false;

worker.onmessage = function (e) {
    if (e.data.type === 'READY') {
        // Worker 已经把旧牌画在画布上了，此时再显示画布，100% 不会出现透明空窗期！
        revealCanvas.style.display = 'block';
        sparkCanvas.style.display = 'block';
        cardImg.style.opacity = '1';
    }
    if (e.data.type === 'DONE') {
        revealCanvas.style.display = 'none';
        sparkCanvas.style.display = 'none';
        hasPreviousCard = true;
    }
};

// 抽牌主入口函数
async function drawAndRevealCard(updateDomCallback) {
    let prevSnapshot = null;
    let prevReversed = false;

    const isFirstDraw = !hasPreviousCard || tarotDiv.classList.contains('hidden');

    if (!isFirstDraw && cardImg.complete && cardImg.naturalWidth > 0) {
        prevSnapshot = await createImageBitmap(cardImg);
        prevReversed = cardImg.style.transform.includes('-1');

        // 1. 已有旧牌时：先让右侧旧文字平滑淡出（耗时 280ms，正好并行等待新图片加载）
        cardRight.classList.add('is-fading');
    } else {
        cardImg.style.opacity = '0';
        cardRight.classList.add('is-fading'); // 首次抽牌也先设为淡出起点
        tarotDiv.classList.remove('hidden');
    }

    const oldSrc = cardImg.src;
    const oldTransform = cardImg.style.transform;

    // 稍微等待 180ms 让旧文字基本淡出后再替换新文字（如果是首次抽牌则无需等待）
    if (!isFirstDraw) {
        await new Promise((r) => setTimeout(r, 180));
    }

    // 2. 更新新牌文字和图片
    await updateDomCallback();

    const newSrc = cardImg.src;
    const newTransform = cardImg.style.transform;
    const nextReversed = newTransform.includes('-1');

    if (!isFirstDraw) {
        cardImg.src = oldSrc;
        cardImg.style.transform = oldTransform;
    }

    // 3. 后台加载并解码新图片
    const tempImg = new Image();
    tempImg.crossOrigin = cardImg.crossOrigin || null;
    tempImg.src = newSrc;

    if (!tempImg.complete) {
        await new Promise((resolve) => {
            tempImg.onload = resolve;
            tempImg.onerror = resolve;
        });
    }
    if (tempImg.decode) await tempImg.decode().catch(() => {});

    const nextSnapshot = await createImageBitmap(tempImg);

    const { width: w, height: h } = cardImg.getBoundingClientRect();

    cardImg.src = newSrc;
    cardImg.style.transform = newTransform;

    // 4. 启动左侧粒子扫光的同时，移除 is-fading 让右侧新文字柔和淡入浮现！
    requestAnimationFrame(() => {
        cardRight.classList.remove('is-fading');
    });

    const transferList = prevSnapshot ? [prevSnapshot, nextSnapshot] : [nextSnapshot];
    worker.postMessage(
        {
            type: 'START',
            prevSnapshot,
            nextSnapshot,
            prevReversed,
            nextReversed,
            width: w,
            height: h,
            devicePixelRatio: window.devicePixelRatio || 1,
        },
        transferList
    );
}