// 仅在支持鼠标精确悬停的桌面设备上启用 3D 倾斜交互，手机/平板自动跳过
const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (cardLeft && supportsHover) {
    let rafId = null;
    let enterTimer = null;

    // 鼠标进入：前 120ms 保留平滑过渡，防止鼠标刚碰边缘时角度瞬间跳变导致边缘逃离指针
    cardLeft.addEventListener('mouseenter', () => {
        clearTimeout(enterTimer);
        cardLeft.style.transition = 'transform 0.15s ease-out, box-shadow 0.45s ease';
        cardLeft.style.setProperty('--glare-opacity', '0.85');

        enterTimer = setTimeout(() => {
            cardLeft.style.transition = 'box-shadow 0.45s ease';
        }, 150);
    });

    // 鼠标移动：基于父级未旋转坐标与元素原始尺寸计算，绝不受 3D 变形投影扭曲影响
    cardLeft.addEventListener('mousemove', (e) => {
        if (rafId) cancelAnimationFrame(rafId);

        rafId = requestAnimationFrame(() => {
            // 使用 offsetWidth / offsetHeight 获取未变形的原始物理尺寸，避免 3D 旋转后边界缩水引发抖动
            const rect = cardLeft.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // 限制归一化范围严格落在 [-1, 1] 之间
            const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (cardLeft.offsetWidth / 2)));
            const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (cardLeft.offsetHeight / 2)));

            // 7.5° 是塔罗牌最优雅且绝不会让边角脱离鼠标指针的黄金倾角
            const rotateY = (normX * 7.5).toFixed(2);
            const rotateX = (-normY * 7.5).toFixed(2);

            cardLeft.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

            // 同步更新高光位置
            const glareX = (((normX + 1) / 2) * 100).toFixed(1);
            const glareY = (((normY + 1) / 2) * 100).toFixed(1);
            cardLeft.style.setProperty('--glare-x', `${glareX}%`);
            cardLeft.style.setProperty('--glare-y', `${glareY}%`);
        });
    });

    // 鼠标离开：清理定时器，丝滑弹性回正
    cardLeft.addEventListener('mouseleave', () => {
        clearTimeout(enterTimer);
        if (rafId) cancelAnimationFrame(rafId);

        cardLeft.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.45s ease';
        cardLeft.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        cardLeft.style.setProperty('--glare-x', '30%');
        cardLeft.style.setProperty('--glare-y', '20%');
        cardLeft.style.setProperty('--glare-opacity', '0.5');
    });
}