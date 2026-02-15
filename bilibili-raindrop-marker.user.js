// ==UserScript==
// @name         Bilibili Raindrop 收藏标记
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在 bilibili 收藏夹页面标记已收藏到 Raindrop 的视频
// @author       You
// @match        https://space.bilibili.com/*/favlist*
// @match        https://www.bilibili.com/medialist/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      api.raindrop.io
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置区域 ====================
    // 请在这里填入你的 Raindrop API Token
    // 获取方式：https://app.raindrop.io/settings/integrations
    const RAINDROP_TOKEN = GM_getValue('raindrop_token', '');

    // 如果没有配置 token，提示用户
    if (!RAINDROP_TOKEN) {
        console.log('[Bilibili-Raindrop] 请先配置 Raindrop API Token');
        console.log('[Bilibili-Raindrop] 在控制台执行: GM_setValue("raindrop_token", "你的token")');
        alert('请先配置 Raindrop API Token\n\n在浏览器控制台执行：\nGM_setValue("raindrop_token", "你的token")\n\n获取 token: https://app.raindrop.io/settings/integrations');
        return;
    }

    // ==================== 全局变量 ====================
    let raindropUrls = new Set(); // 存储 Raindrop 中的所有 bilibili 视频 URL
    let isLoading = false;

    // ==================== Raindrop API 相关 ====================

    /**
     * 获取单页 Raindrop 数据
     */
    function fetchRaindropPage(page, perPage = 50) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.raindrop.io/rest/v1/raindrops/0?search=bilibili.com&perpage=${perPage}&page=${page}`,
                headers: {
                    'Authorization': `Bearer ${RAINDROP_TOKEN}`
                },
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        resolve(data);
                    } catch (e) {
                        reject('解析 Raindrop 响应失败: ' + e.message);
                    }
                },
                onerror: function(error) {
                    reject('请求 Raindrop API 失败: ' + error);
                }
            });
        });
    }

    /**
     * 从 Raindrop 获取所有 bilibili 视频链接（支持分页）
     */
    async function fetchRaindropBookmarks() {
        try {
            console.log('[Bilibili-Raindrop] 开始获取 Raindrop 收藏...');

            const perPage = 50;

            // 获取第一页数据
            const firstPage = await fetchRaindropPage(0, perPage);

            if (!firstPage.items) {
                throw new Error('无法解析 Raindrop 数据');
            }

            // 提取第一页的 BV 号
            firstPage.items.forEach(item => {
                const url = item.link;
                const bvMatch = url.match(/BV[a-zA-Z0-9]+/);
                if (bvMatch) {
                    raindropUrls.add(bvMatch[0]);
                }
            });

            const totalCount = firstPage.count || 0;
            const totalPages = Math.ceil(totalCount / perPage);

            console.log(`[Bilibili-Raindrop] 总共 ${totalCount} 条收藏，需要获取 ${totalPages} 页`);

            // 如果有多页，继续获取剩余页面
            if (totalPages > 1) {
                const pagePromises = [];
                for (let page = 1; page < totalPages; page++) {
                    pagePromises.push(fetchRaindropPage(page, perPage));
                }

                // 并行获取所有页面
                const remainingPages = await Promise.all(pagePromises);

                // 提取所有页面的 BV 号
                remainingPages.forEach(pageData => {
                    if (pageData.items) {
                        pageData.items.forEach(item => {
                            const url = item.link;
                            const bvMatch = url.match(/BV[a-zA-Z0-9]+/);
                            if (bvMatch) {
                                raindropUrls.add(bvMatch[0]);
                            }
                        });
                    }
                });
            }

            console.log(`[Bilibili-Raindrop] 成功获取 ${raindropUrls.size} 个 bilibili 视频`);
            return raindropUrls;

        } catch (error) {
            console.error('[Bilibili-Raindrop] 获取失败:', error);
            throw error;
        }
    }

    // ==================== 页面标记相关 ====================

    /**
     * 创建蓝色对勾标记元素
     */
    function createCheckMark() {
        const checkMark = document.createElement('div');
        checkMark.className = 'raindrop-check-mark';
        checkMark.innerHTML = '✓';
        checkMark.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            width: 24px;
            height: 24px;
            background: #0084ff;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: bold;
            z-index: 100;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        checkMark.title = '已收藏到 Raindrop';
        return checkMark;
    }

    /**
     * 检查并标记视频元素
     */
    function markVideoElements() {
        // 查找所有视频卡片元素（根据实际的 bilibili 页面结构）
        const videoCards = document.querySelectorAll('.items__item');

        console.log(`[Bilibili-Raindrop] 找到 ${videoCards.length} 个视频卡片`);

        videoCards.forEach(card => {
            // 避免重复标记
            if (card.querySelector('.raindrop-check-mark')) {
                return;
            }

            // 查找视频链接
            const link = card.querySelector('a.bili-cover-card[href*="BV"]');
            if (!link) return;

            // 提取 BV 号
            const bvMatch = link.href.match(/BV[a-zA-Z0-9]+/);
            if (!bvMatch) return;

            const bvId = bvMatch[0];

            // 如果在 Raindrop 中找到了这个视频
            if (raindropUrls.has(bvId)) {
                console.log(`[Bilibili-Raindrop] 标记视频: ${bvId}`);

                // 找到视频封面容器
                const coverContainer = card.querySelector('.bili-video-card__cover');
                if (coverContainer) {
                    // 确保容器是相对定位
                    if (getComputedStyle(coverContainer).position === 'static') {
                        coverContainer.style.position = 'relative';
                    }
                    // 添加蓝色对勾
                    coverContainer.appendChild(createCheckMark());
                }
            }
        });
    }

    /**
     * 观察 DOM 变化，处理动态加载的内容
     */
    function observePageChanges() {
        const observer = new MutationObserver((mutations) => {
            // 当页面内容变化时，重新标记
            markVideoElements();
        });

        // 观察整个文档的变化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        return observer;
    }

    // ==================== 主逻辑 ====================

    /**
     * 初始化脚本
     */
    async function init() {
        if (isLoading) return;
        isLoading = true;

        try {
            // 获取 Raindrop 收藏
            await fetchRaindropBookmarks();

            // 标记当前页面的视频
            markVideoElements();

            // 监听页面变化
            observePageChanges();

            console.log('[Bilibili-Raindrop] 初始化完成');
        } catch (error) {
            console.error('[Bilibili-Raindrop] 初始化失败:', error);
            alert('Bilibili-Raindrop 脚本初始化失败\n\n' + error);
        } finally {
            isLoading = false;
        }
    }

    // 页面加载完成后启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
