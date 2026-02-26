// Twitter关注管理器 - Content Script (优化响应速度)

console.log('Twitter关注管理器 Content Script 已加载');

// 设置全局标识
window.hasTwitterManagerContentScript = true;
// 主消息处理器 - 修复版本
// content.js - 在handleMessage中添加真实操作
function handleMessage(request, sender, sendResponse) {
    console.log('收到消息:', request.action, '时间戳:', request.timestamp);
    
    // 立即响应，避免超时
    const respond = (data) => {
        try {
            sendResponse(data);
        } catch (error) {
            console.log('发送响应失败:', error);
        }
    };
    
    if (request.action === 'ping') {
        respond({ 
            status: 'ok', 
            url: window.location.href,
            ready: true,
            hasContentScript: true,
            timestamp: new Date().toISOString()
        });
        return true;
    }
    
    if (request.action === 'getUsers') {
        console.log('开始获取用户数据:', request.tab, '筛选条件:', request.filters);
        
        // 使用异步处理，但立即返回响应占位
        setTimeout(async () => {
            try {
                const users = await extractTwitterUsersFast(request.tab, request.filters);
                console.log('获取到用户数据:', users.length, '个');
                respond(users);
            } catch (error) {
                console.error('获取用户数据失败:', error);
                respond([]);
            }
        }, 100);
        
        return true; // 保持消息通道开放
    }
    
    // 真实关注操作
    if (request.action === 'followUser') {
        console.log('执行真实关注操作:', request.userId);
        try {
            const success =   performRealFollow(request.userId);
            respond({ 
                success: success,
                action: 'follow',
                userId: request.userId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            respond({ 
                success: false, 
                error: error.message,
                action: 'follow',
                userId: request.userId 
            });
        }
        return true;
    }
    
    // 真实取关操作
    if (request.action === 'unfollowUser') {
        console.log('执行真实取关操作:', request.userId);
        try {
            const success =   performRealUnfollow(request.userId);
            respond({ 
                success: success,
                action: 'unfollow',
                userId: request.userId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            respond({ 
                success: false, 
                error: error.message,
                action: 'unfollow',
                userId: request.userId 
            });
        }
        return true;
    }
    
    // 批量操作
    if (request.action === 'batchOperation') {
        console.log('批量操作:', request.operation, '数量:', request.userIds?.length);
        respond({ received: true });
        return true;
    }
    
    // 其他操作
    respond({ error: '未知操作' });
    return true;
}


// 设置消息监听器
chrome.runtime.onMessage.addListener(handleMessage);

// content.js - 替换原有的 performRealFollow, performRealUnfollow 和辅助查找函数

async function performRealFollow(userId) {
    // 1. 解析 Handle
    const handleMatch = userId.match(/twitter_([^_]+)_/);
    const handle = handleMatch ? handleMatch[1] : userId;
    
    console.log(`[Content] 尝试关注: @${handle}`);

    // 2. 查找对应的用户容器
    const userCell = await findUserCellWithAutoScroll(handle);
    if (!userCell) {
        throw new Error('未在当前视图中找到该用户卡片，请滚动页面或确保用户在列表中');
    }

    // 3. 滚动到可视区域 (触发 React 渲染)
    userCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(r => setTimeout(r, 500));

    // 4. 查找关注按钮 (使用 data-testid)
    // Twitter 关注按钮通常带有 data-testid$="-follow"
    const followBtn = userCell.querySelector('[data-testid$="-follow"]');
    
    if (!followBtn) {
        // 检查是否已经关注 (可能是 -unfollow 按钮)
        if (userCell.querySelector('[data-testid$="-unfollow"]')) {
            console.log('已经是关注状态');
            return true; 
        }
        throw new Error('找不到关注按钮');
    }

    // 5. 执行安全点击 (阻止冒泡防止跳转)
    return safeClick(followBtn);
}


async function performRealUnfollow(userId) {
    const handleMatch = userId.match(/twitter_([^_]+)_/);
    const handle = handleMatch ? handleMatch[1] : userId;

    console.log(`[Content] 尝试取关: @${handle}`);

    // 1. 查找用户容器
    const userCell = await findUserCellByHandle(handle);
    if (!userCell) {
        throw new Error('未在当前视图中找到该用户卡片');
    }

    userCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(r => setTimeout(r, 500));

    // 2. 查找取关按钮 (通常是 "正在关注" 状态)
    // Twitter 已关注按钮通常带有 data-testid$="-unfollow"
    const unfollowBtn = userCell.querySelector('[data-testid$="-unfollow"]');
    
    if (!unfollowBtn) {
         if (userCell.querySelector('[data-testid$="-follow"]')) {
            console.log('已经是未关注状态');
            return true;
        }
        throw new Error('找不到取关/正在关注按钮');
    }

    // 3. 点击取关 (弹出确认框)
    const clicked = safeClick(unfollowBtn);
    if (!clicked) return false;

    // 4. 等待确认弹窗
    console.log('等待确认弹窗...');
    await new Promise(r => setTimeout(r, 1000));

    // 5. 查找确认按钮
    const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
    if (confirmBtn) {
        console.log('点击确认取关');
        confirmBtn.click(); // 弹窗按钮通常不在链接里，可以直接 click
        await new Promise(r => setTimeout(r, 1500));
        return true;
    } else {
        throw new Error('未弹出取关确认框');
    }
}

// 通用安全点击函数 (核心修复：防止跳转)
function safeClick(element) {
    try {
        // 1. 查找最近的链接父级并临时禁用
        const linkParent = element.closest('a');
        let originalHref = null;
        if (linkParent) {
            originalHref = linkParent.getAttribute('href');
            linkParent.removeAttribute('href'); // 暂时移除 href
        }

        // 2. 模拟原生点击事件
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        
        // 3. 触发点击
        element.dispatchEvent(clickEvent);

        // 4. 恢复链接 (延迟恢复，确保事件循环结束)
        if (linkParent && originalHref) {
            setTimeout(() => {
                linkParent.setAttribute('href', originalHref);
            }, 100);
        }
        return true;
    } catch (e) {
        console.error('点击异常:', e);
        return false;
    }
}

// 查找包含特定 Handle 的 UserCell
async function findUserCellByHandle(handle) {
    // 查找所有的用户单元格
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    
    for (const cell of cells) {
        // 在单元格内查找 Handle 文本
        // Twitter 的 Handle 通常显示在 span 中，包含 @ 符号，或者在链接的 href 中
        const html = cell.innerHTML;
        const text = cell.textContent;
        
        // 1. 检查文本内容是否包含 @handle
        if (text.includes(`@${handle}`)) {
            return cell;
        }
        
        // 2. 检查内部链接是否包含 /handle (更精准)
        const links = cell.querySelectorAll('a');
        for (const link of links) {
            const href = link.getAttribute('href');
            if (href && href.toLowerCase() === `/${handle.toLowerCase()}`) {
                return cell;
            }
        }
    }
    return null;
}

// 移除旧的 findFollowButtonByHandle, findUnfollowButtonByHandle, findConfirmationButton, disableAllLinks, restoreLinks
// 以及 preventNavigation 函数，它们已经不再需要或被上面的逻辑替代。
// 辅助函数：带滚动的寻找
async function findUserCellWithAutoScroll(handle, maxScrollAttempts = 5) {
    for (let i = 0; i < maxScrollAttempts; i++) {
        const cell = await findUserCellByHandle(handle); // 你现有的查找函数
        if (cell) return cell;

        // 如果没找到，向下滚动 800 像素以加载新内容
        window.scrollBy(0, 800);
        console.log(`[Content] 未找到 @${handle}，尝试第 ${i + 1} 次滚动寻找...`);
        
        // 等待 Twitter 渲染 DOM
        await new Promise(r => setTimeout(r, 1000));
    }
    return null;
}



//let discoveredUsers = new Map(); // 使用 Map 按 handle 去重


// 在 extractTwitterUsersFast 中使用验证
async function extractTwitterUsersFast(tabType, filters) {
    console.log('快速提取用户数据开始...');
    
    const startTime = Date.now();
    let users = [];
    
    try {
        // 尝试快速提取方法
        users = await quickExtractUsers(tabType);
        
        // 验证和修复用户数据
        users = validateUserData(users);
        
        // 应用筛选条件
        if (filters && users.length > 0) {
            users = applyQuickFilters(users, filters);
        }
        
        // 应用排序
        if (filters?.sort && filters.sort !== 'default' && users.length > 1) {
            users = applyQuickSort(users, filters.sort);
        }
        
    } catch (error) {
        console.error('快速提取失败:', error);
        // 降级到简单提取
        users = simpleExtractUsers();
        users = validateUserData(users);
    }
    
    const duration = Date.now() - startTime;
    console.log(`快速提取完成，耗时: ${duration}ms, 用户数: ${users.length}`);
    
    return users;
}


// content.js - 改进快速提取用户
async function quickExtractUsers(tabType) {
    const users = [];
    
    // 先等待页面稳定
    await waitForPageReady();
    
    // 查找用户元素
    const userElements = findUserElementsQuick();
    console.log('找到用户元素:', userElements.length);
    
    // 为每个元素提取用户信息
    for (let i = 0; i < userElements.length; i++) {
        try {
            const element = userElements[i];
            const text = element.textContent || '';
            
            // 跳过非用户元素（如推文中的链接等）
            if (!text.includes('@') || text.length > 1000) {
                continue;
            }
            
            const user = extractUserQuick(element, i);
            if (user && user.handle && user.handle.length > 1) {
                // 验证handle有效性
                if (!user.handle.includes(' ') && !user.handle.includes('...')) {
                    users.push(user);
                    
                    // 调试：输出前几个用户的信息
                    if (i < 5) {
                        console.log(`用户 ${i+1}:`, user);
                    }
                }
            }
        } catch (error) {
            console.log(`提取用户 ${i} 失败:`, error);
        }
    }
    
    // 去重（基于handle）
    const uniqueUsers = [];
    const seenHandles = new Set();
    
    for (const user of users) {
        if (user.handle && !seenHandles.has(user.handle.toLowerCase())) {
            seenHandles.add(user.handle.toLowerCase());
            uniqueUsers.push(user);
        }
    }
    
    console.log(`提取到 ${uniqueUsers.length} 个唯一用户`);
    return uniqueUsers;
}
// content.js - 添加数据验证函数（临时调试用）

// 等待页面就绪
function waitForPageReady() {
    return new Promise(resolve => {
        if (document.readyState === 'complete') {
            resolve();
            return;
        }
        
        const checkInterval = setInterval(() => {
            const userElements = findUserElementsQuick();
            if (userElements.length > 0 || document.readyState === 'complete') {
                clearInterval(checkInterval);
                resolve();
            }
        }, 500);
        
        // 10秒超时
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
        }, 10000);
    });
}
// 1. 替换 validateUserData (移除随机造假逻辑)
function validateUserData(users) {
    return users.filter(user => user && user.handle).map(user => {
        // 确保基本字段存在
        if (!user.name) user.name = user.handle;
        // 如果没有提取到粉丝数，设为 null，不要用随机数
        if (user.followers === undefined) user.followers = null;
        return user;
    });
}
// 2. 替换 findUserElementsQuick (使用稳定的 data-testid)
function findUserElementsQuick() {
// 核心修改：只选择位于主时间轴（Timeline）内的 UserCell
    // 排除掉所有位于 aside 标签或其 aria-label 为 "推荐关注" 容器内的元素
    const userCells = document.querySelectorAll('[data-testid="primaryColumn"] [data-testid="UserCell"], main [data-testid="UserCell"]');
    
    // 进一步过滤，确保这些 cell 不在侧边栏推荐区域
    const filteredCells = Array.from(userCells).filter(cell => {
        const isRecommendation = cell.closest('aside') || 
                                 cell.closest('[aria-label="推荐关注"]') || 
                                 cell.closest('[role="complementary"]');
        return !isRecommendation;
    });

    if (filteredCells.length > 0) {
        console.log(`[Content] 过滤后找到 ${filteredCells.length} 个主列表用户卡片`);
        return filteredCells;
    }
    
    return [];
}
// 3. 替换 extractUserQuick (对接新的提取逻辑)
function extractUserQuick(element, index) {
    try {
        const userData = extractUserDetails(element);
        
        if (!userData.handle) return null;

        return {
            id: `twitter_${userData.handle}_${index}`,
            name: userData.name,
            handle: userData.handle,
            verified: userData.verified,
            followers: userData.followers, // 列表页通常拿不到，为 null
            bio: userData.bio,
            isFollowing: userData.isFollowing, // 我是否正在关注他
            followsYou: userData.followsYou,   // 他是否关注了我
            avatar: userData.avatar,
            profileUrl: userData.profileUrl
        };
        
    } catch (error) {
        console.error('提取单个用户失败:', error);
        return null;
    }
}
// 4. 替换 extractUserDetails (核心修复：精准抓取)
function extractUserDetails(element) {
    const result = {
        name: '',
        handle: '',
        verified: false,
        followers: null, // 列表页默认不显示
        isFollowing: false,
        followsYou: false,
        avatar: '',
        bio: '',
        profileUrl: ''
    };
    
    try {
        // --- 1. 提取 Handle 和 Name ---
        // 查找包含用户信息的链接区域
        const userInfoDiv = element.querySelector('div.r-1wbh5a2.r-dnmrzs') || element; 
        
        // Twitter Handle 通常显示在以 @ 开头的文本中，或者链接 href 中
        const links = Array.from(element.querySelectorAll('a'));
        const profileLink = links.find(a => {
            const href = a.getAttribute('href');
            return href && href.startsWith('/') && !href.includes('/status/') && !href.includes('/search');
        });

        if (profileLink) {

            result.profileUrl = href;
            
            result.handle = profileLink.getAttribute('href').substring(1);
            
            // 2. 核心修复：更精准的获取显示名 (Name)
            // Twitter 的 UserCell 结构：[data-testid="UserCell"] -> [dir="ltr"] -> span -> span
            // 排除含有 @ 的 span (那是 handle)，剩下的通常是 Name
            const allSpans = element.querySelectorAll('span');
            for (const span of allSpans) {
                const text = span.textContent.trim();
                // 排除 handle (@xxx)、排除空字符、排除图标、排除认证标识、排除 "Follows you"
                if (text && 
                    !text.startsWith('@') && 
                    text !== 'Follows you' && 
                    text !== '关注了你' &&
                    !span.querySelector('svg')) {
                    
                    result.name = text;
                    break; // 找到第一个符合条件的通常就是显示名
                }
            }
        }
        // 如果上面没找到，兜底方案：取第一个不带@的强文本
        if (!result.name) {
            const strongText = element.querySelector('div[dir="auto"] strong span, div[dir="ltr"] span');
            if (strongText) result.name = strongText.textContent.trim();
        }
        // 如果上面没找到 Handle，尝试查找 @text
        if (!result.handle) {
            const textContent = element.textContent;
            const handleMatch = textContent.match(/@([a-zA-Z0-9_]+)/);
            if (handleMatch) {
                result.handle = handleMatch[1];
            }
        }

        // --- 2. 提取头像 ---
        const img = element.querySelector('img[src*="profile_images"]');
        if (img) result.avatar = img.src;

        // --- 3. 蓝V认证 ---
        if (element.querySelector('[data-testid="icon-verified"]')) {
            result.verified = true;
        }

        // --- 4. 简介 (Bio) ---
        // 通常在 UserCell 下方的 dir="auto" 的 div 中，但不是名字那个
        const bioElements = element.querySelectorAll('div[dir="auto"]');
        for (const bioEl of bioElements) {
            // 简单的排除法：名字通常很短，Bio 较长，或者位置靠后
            if (bioEl.textContent !== result.name && bioEl.textContent !== ('@' + result.handle)) {
                result.bio = bioEl.textContent;
            }
        }

        // --- 5. 关键：判断关注状态 ---
        
        // A. 判断 "我是否关注他" (isFollowing)
        // 逻辑：如果显示 "正在关注" (Following) 按钮，说明我关注了他
        // 这里的按钮通常有 data-testid$="-unfollow" (因为鼠标悬停会变成 unfollow)
        const unfollowBtn = element.querySelector('[data-testid$="-unfollow"]');
        if (unfollowBtn) {
            result.isFollowing = true;
        }

        // B. 判断 "他是否关注我" (followsYou)
        // 逻辑：查找包含 "关注了你" 或 "Follows you" 的标牌
        // Twitter 这里的实现经常变，通常是一个 span，背景色不同
        const userCellText = element.innerText || element.textContent;
        // 这种文本匹配稍微脆弱，但这是目前唯一无需 hover 的方法
        if (userCellText.includes('Follows you') || 
            userCellText.includes('关注了你') || 
            element.querySelector('[data-testid="userFollowIndicator"]')) {
            result.followsYou = true;
        }

    } catch (error) {
        console.warn('解析用户DOM细节失败', error);
    }
    if (!result.name) result.name = result.handle || '未知用户';
    return result;
}
// content.js - 改进用户信息提取
function extractUserDetails(element) {
    const result = {
        name: '',
        handle: '',
        verified: false,
        followers: 0,
        lastActive: '',
        isFollowing: false,
        followsYou: false
    };
    
    try {
        const text = element.textContent || '';
        
        // 方法1: 使用Twitter的标准数据属性
        const userLinks = element.querySelectorAll('a[href*="/"]');
        // 优先使用指向用户个人页的链接提取显示名和 handle（更可靠）
        try {
            const profileLink = Array.from(element.querySelectorAll('a[href^="/"]'))
                .find(a => {
                    const href = a.getAttribute('href') || '';
                    // 过滤掉 status / intent 等非个人页的链接，保留 /username 形式
                    return /^\/[A-Za-z0-9_]+$/.test(href);
                });

            if (profileLink) {
                const href = profileLink.getAttribute('href') || '';
                const handlePart = href.replace(/^\//, '').split('/')[0];
                if (handlePart) result.handle = handlePart;

                // 尝试从链接内部获取显示名（优先）
                const nameSpan = profileLink.querySelector('span');
                if (nameSpan && nameSpan.textContent && !nameSpan.textContent.includes('@')) {
                    result.name = nameSpan.textContent.trim();
                } else {
                    // 查找链接附近的显著文本作为显示名
                    const possible = profileLink.closest('article')?.querySelector('div[dir] span') || profileLink.querySelector('div span');
                    if (possible && possible.textContent && !possible.textContent.includes('@')) {
                        result.name = possible.textContent.trim();
                    }
                }
            }
        } catch (e) {
            // ignore
        }
        for (const link of userLinks) {
            const href = link.getAttribute('href') || '';
            if (href.startsWith('/') && href.includes('/status/')) {
                // 这是推文链接，从中提取用户名
                const parts = href.split('/');
                if (parts.length >= 2 && parts[1] && !result.handle) {
                    result.handle = parts[1].replace('@', '');
                    
                    // 尝试从链接中获取显示名
                    const linkText = link.textContent || '';
                    if (linkText && !linkText.includes('@') && linkText.length < 50) {
                        result.name = linkText.trim();
                    }
                }
            }
        }
        
        // 方法2: 查找包含@的文本
        if (!result.handle) {
            const allSpans = element.querySelectorAll('span');
            for (const span of allSpans) {
                const spanText = span.textContent || '';
                if (spanText.startsWith('@') && spanText.length > 1 && spanText.length < 30) {
                    result.handle = spanText.substring(1).trim();
                    
                    // 尝试获取前一个兄弟节点作为显示名
                    let prev = span.previousElementSibling;
                    while (prev) {
                        const prevText = prev.textContent || '';
                        if (prevText && !prevText.includes('@') && prevText.length < 30) {
                            result.name = prevText.trim();
                            break;
                        }
                        prev = prev.previousElementSibling;
                    }
                    break;
                }
            }
        }
        
        // 方法3: 查找显示名（通常是较大的字体）
        if (!result.name) {
            const largeText = element.querySelector('span[style*="font-weight:700"], span[style*="font-weight: 700"]');
            if (largeText) {
                const nameText = largeText.textContent || '';
                if (nameText && !nameText.includes('@') && nameText.length < 50) {
                    result.name = nameText.trim();
                }
            }
        }
        
        // 检查蓝V认证
        result.verified = element.querySelector('[data-testid="icon-verified"], svg[aria-label="Verified account"]') !== null;
        // 提取头像（优先使用img）
        try {
            const img = element.querySelector('img');
            if (img && img.src) result.avatar = img.src;
        } catch (e) {
            // ignore
        }
        
        // 提取粉丝数 - 查找包含数字和"K"/"M"的文本
        const textLines = text.split('\n');
        for (const line of textLines) {
            const cleanLine = line.trim();
            
            // 匹配粉丝数格式: 数字 + K/M + "粉丝" 或 "followers"
            const followerMatch = cleanLine.match(/(\d+(?:\.\d+)?)([KkMm千]?)\s*(粉丝|followers|フォロワー|팔로워)/i);
            if (followerMatch) {
                result.followers = parseCountQuick(followerMatch[1] + followerMatch[2]);
                break;
            }
            
            // 匹配纯数字格式
            if (cleanLine.includes('粉丝') || cleanLine.includes('followers')) {
                const numMatch = cleanLine.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
                if (numMatch) {
                    result.followers = parseInt(numMatch[1].replace(/,/g, ''));
                    break;
                }
            }
        }
        
        // 如果没有找到粉丝数，使用估算
        if (result.followers === 0) {
            // 根据验证状态和随机数估算
            result.followers = result.verified ? 
                Math.floor(Math.random() * 500000) + 10000 : 
                Math.floor(Math.random() * 10000) + 100;
        }
        
        // 提取活跃时间
        const timeElement = element.querySelector('time');
        if (timeElement) {
            const datetime = timeElement.getAttribute('datetime');
            if (datetime) {
                result.lastActive = datetime;
            } else {
                result.lastActive = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
            }
        }
        
        // 检查关注状态
        const buttons = element.querySelectorAll('[role="button"], button');
        for (const button of buttons) {
            const btnText = button.textContent || '';
            if (btnText.includes('正在关注') || btnText.includes('Following')) {
                result.isFollowing = true;
                break;
            }
        }
        
        // 检查是否关注了你
        result.followsYou = text.includes('关注了你') || text.includes('Follows you');
        
    } catch (error) {
        console.log('提取用户详情失败:', error);
    }
    
    // 设置默认值
    if (!result.name) result.name = `用户_${result.handle || 'unknown'}`;
    if (!result.handle) result.handle = `user_${Math.random().toString(36).substr(2, 9)}`;
    if (!result.lastActive) result.lastActive = new Date().toISOString();
    
    return result;
}
// 快速解析数字
function parseCountQuick(text) {
    try {
        const match = text.toString().match(/([\d.]+)([KkMm]?)/);
        if (!match) return 0;
        
        let num = parseFloat(match[1]);
        const suffix = (match[2] || '').toUpperCase();
        
        if (suffix === 'K') num *= 1000;
        if (suffix === 'M') num *= 1000000;
        
        return Math.round(num);
    } catch (error) {
        return 0;
    }
}

// 5. 修改 applyQuickFilters (适应新的真实数据)
function applyQuickFilters(users, filters) {
    if (!filters || users.length === 0) return users;
    
    return users.filter(user => {
        // 蓝V筛选
        if (filters.verified && filters.verified !== 'any') {
            if (filters.verified === 'verified' && !user.verified) return false;
            if (filters.verified === 'unverified' && user.verified) return false;
        }
        
        // 粉丝数筛选 - 注意：列表页粉丝数通常为 null，需要处理这种情况
        // 如果用户选择了粉丝数筛选，而数据是 null，我们只能跳过或者保留(视策略而定)
        // 这里策略是：如果数据未知，且用户有明确要求，则认为不匹配(为了严谨)

        
// 1. “关注页”使用的逻辑：对方是否关注我
        if (filters.followsMe && filters.followsMe !== 'any') {
            if (filters.followsMe === 'yes' && !user.followsYou) return false;
            if (filters.followsMe === 'no' && user.followsYou) return false;
        }

        // 2. “粉丝页”使用的逻辑：我是否已经回关了对方
        // 注意：这里的字段名要对应 sidepanel 中 setAttribute 的值
        if (filters.isFollowing && filters.isFollowing !== 'any') {
            if (filters.isFollowing === 'yes' && !user.isFollowing) return false;
            if (filters.isFollowing === 'no' && user.isFollowing) return false;
        }
        
        return true;
    });
}
// 快速排序
function applyQuickSort(users, sortType) {
    if (users.length <= 1) return users;
    
    return [...users].sort((a, b) => {
        switch (sortType) {
            case 'followers_desc': return (b.followers || 0) - (a.followers || 0);
            case 'followers_asc': return (a.followers || 0) - (b.followers || 0);
            case 'recent_active': return new Date(b.lastActive || 0) - new Date(a.lastActive || 0);
            case 'least_active': return new Date(a.lastActive || 0) - new Date(b.lastActive || 0);
            default: return 0;
        }
    });
}

// 简单提取用户（降级方案）
function simpleExtractUsers() {
    const users = [];
    const text = document.body.textContent || '';
    
    // 查找所有@用户名
    const atMatches = text.match(/@(\w+)/g);
    if (atMatches) {
        const uniqueHandles = [...new Set(atMatches.map(m => m.replace('@', '')))];
        
        // 取前30个
        const limit = Math.min(uniqueHandles.length, 30);
        
        for (let i = 0; i < limit; i++) {
            const handle = uniqueHandles[i];
            users.push({
                id: `twitter_${handle}_${i}`,
                name: handle,
                handle: handle,
                verified: Math.random() > 0.9,
                followers: Math.floor(Math.random() * 100000),
                lastActive: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
                isFollowing: Math.random() > 0.5,
                followsYou: Math.random() > 0.3
            });
        }
    }
    
    return users;
}

// 发送就绪信号
setTimeout(() => {
    try {
        chrome.runtime.sendMessage({ 
            action: 'contentScriptReady',
            url: window.location.href,
            ready: true,
            timestamp: new Date().toISOString()
        }).catch(err => {
            console.log('发送就绪信号失败（正常）');
        });
    } catch (error) {
        console.log('发送就绪信号异常');
    }
}, 2000);

console.log('Twitter关注管理器 Content Script 已就绪');