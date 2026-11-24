const DECK_LENGTH = 78; // 牌组长度

// 预先缓存静态 DOM 引用
const cardDom = {
    wrap: document.querySelector('.card-stack'),
    img: document.querySelector('.card-stack img.card-img'),
    name: document.querySelector('.card-stack .card-name'),
    pos: document.querySelector('.card-stack .card-pos'),
    attrItems: document.querySelectorAll('.card-stack .card-attrs .attr-item'),
    upright: document.querySelector('.card-stack .upright'),
    reversed: document.querySelector('.card-stack .reversed'),
    meaningTitle: document.querySelector('.card-stack .meaning-block h4'),
    meaningText: document.querySelector('.card-stack .meaning-text'),
};

// 属性展示顺序映射
const ATTR_KEYS = [
    'code',
    'numerology',
    'element',
    'astrology',
    'kabbalistic_path',
    'timing',
];

/**
 * 绘制牌面展示结果
 */
function renderCard(localeData, uiLangData, deckData, reversed) {
    const { wrap, img, name, pos, attrItems, upright, reversed: reversedNode, meaningTitle, meaningText } = cardDom;

    const posText = reversed ? `(${uiLangData.reversed})` : `(${uiLangData.upright})`;
    const meaning = reversed ? localeData.reversed_meaning : localeData.upright_meaning;
    const keywords = (reversed ? localeData.reversed_keywords : localeData.upright_keywords) || [];

    wrap.classList.remove('hidden');

    // 更新卡牌图片与正逆位翻转
    img.src = deckData;
    img.style.transform = reversed ? 'scaleY(-1)' : 'scaleY(1)';

    // 更新标题与正逆位
    name.textContent = localeData.name;
    pos.textContent = posText;

    // 循环填充卡牌属性
    ATTR_KEYS.forEach((key, index) => {
        const item = attrItems[index];
        if (!item) return;
        item.querySelector('.label').textContent = `${uiLangData[key]}: `;
        item.querySelector('.val').textContent = localeData[key] || '-';
    });

    // 更新关键词标签
    upright.innerHTML = '';
    reversedNode.innerHTML = '';
    const targetNode = reversed ? reversedNode : upright;
    const fragment = document.createDocumentFragment();
    for (const word of keywords) {
        const newTag = document.createElement('span');
        newTag.className = 'tag';
        newTag.textContent = word;
        fragment.appendChild(newTag);
    }
    targetNode.appendChild(fragment);

    // 更新牌意解读并重置滚动条位置
    meaningTitle.textContent = uiLangData.meaning;
    meaningText.textContent = meaning || '-';
    meaningText.scrollTop = 0;
}


/**
 * 获取密码学安全随机数
 * @returns {{randNum: number, reversed: boolean}}
 */
function getRandCard() {
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    const MAX_UINT32 = 0x100000000;
    // 第一个随机数：1 ~ DECK_LENGTH 的整数
    const randNum = Math.floor(arr[0] / MAX_UINT32  * DECK_LENGTH) + 1;
    // 第二个随机数：大于 0.5 则逆位
    const reversed = arr[1] / MAX_UINT32  > 0.5;
    return { randNum, reversed };
}

// 点击触发抽牌
const drawBtn = document.querySelector('.draw-btn');
let isDrawing = false;

drawBtn.addEventListener('click', async () => {
    // 动画或请求进行中，拦截重复点击
    if (isDrawing) return;
    isDrawing = true;
    drawBtn.disabled = true;

    try {
        const { randNum, reversed } = getRandCard();
        const { localeData, uiLangData, deckData } = await loadDeckAndLocale(randNum);

        await drawAndRevealCard(() => {
            renderCard(localeData, uiLangData, deckData, reversed);
        });

        isReversed = reversed;
    } finally {
        // 重置状态
        isDrawing = false;
        drawBtn.disabled = false;
    }
})