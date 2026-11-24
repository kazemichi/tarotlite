const DEFAULT_DECK_ID = 'PhantomStar';
const currentLang = getPreferredLang();
const localeFile = `./locales/${currentLang}.json`;
const decksFolder = './decks';
const decksIndexFile = `${decksFolder}/deck-index.json`;

// 内存缓存池：确保同一份 JSON 在页面生命周期内只 fetch 一次
let cachedResourcesPromise = null;

/**
 * 读取 JSON 文件
 * @param {string} url 文件地址
 * @returns {Promise<object>} JSON 对象
 */
async function loadJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`加载失败 (${res.status}): ${url}`);
    return res.json();
}

/**
 * 获取当前首选语言，返回 'zh-cn' / 'en'
 * @returns {string} 'zh-cn' / 'en'
 */
function getPreferredLang() {
    const langTag = navigator.language || navigator.languages?.[0] || 'en';
    const base = langTag.toLowerCase();
    if (base === 'zh-cn') return 'zh-cn';
    return 'en';
}

/**
 * 预加载并缓存所有静态配置（卡组索引、当前语言包、当前卡组数据）
 */
function getCachedResources(deckId = DEFAULT_DECK_ID) {
    if (!cachedResourcesPromise) {
        cachedResourcesPromise = (async () => {
            // 先并行加载卡组索引和当前语言包
            const [deckIndex, localeData] = await Promise.all([
                loadJson(decksIndexFile),
                loadJson(localeFile)
            ]);

            const targetDeckMeta = deckIndex[deckId];
            if (!targetDeckMeta) {
                throw new Error(`找不到卡组配置: ${deckId}`);
            }

            // 再加载对应卡组的牌面路径映射
            const deckData = await loadJson(targetDeckMeta.path);

            return { targetDeckMeta, localeData, deckData };
        })().catch((err) => {
            // 如果某次网络失败，清空缓存以便下次点击可以重试
            cachedResourcesPromise = null;
            throw err;
        });
    }
    return cachedResourcesPromise;
}

/**
 * 安全拼接图片路径，自动处理多余或缺失的斜杠
 */
function joinPath(...segments) {
    return segments
        .map((seg, i) => {
            if (i === 0) return seg.replace(/\/+$/, '');
            return seg.replace(/^\/+|\/+$/g, '');
        })
        .filter(Boolean)
        .join('/');
}

/**
 * 获取指定编号的语言包和卡牌图片路径
 * @param {number} randNum 随机数 (1 ~ 78)
 * @returns {Promise<{localeData: object, uiLangData: object, deckData: string}>}
 */
async function loadDeckAndLocale(randNum) {
    if (!Number.isInteger(randNum) || randNum < 1 || randNum > 78) {
        throw new Error(`卡牌编号超出有效范围 (1-78): ${randNum}`);
    }

    // 首次抽牌会发起网络请求，之后每次抽牌直接读内存缓存
    const { targetDeckMeta, localeData, deckData } = await getCachedResources();
    const key = String(randNum);

    const cardLocale = localeData.cards?.[key];
    const cardImgRelPath = deckData?.[key];

    if (!cardLocale || !cardImgRelPath) {
        throw new Error(`卡牌 #${key} 的数据或图片路径缺失`);
    }

    return {
        localeData: cardLocale,
        uiLangData: localeData.ui,
        deckData: joinPath(decksFolder, targetDeckMeta.deckId, cardImgRelPath)
    };
}