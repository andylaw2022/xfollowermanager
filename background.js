// Twitter关注管理器 - Service Worker (添加详细日志)

console.log('Twitter关注管理器 Service Worker 已启动');

// 插件安装或更新
chrome.runtime.onInstalled.addListener(() => {
    console.log('插件已安装');
    
    // 初始化数据
    chrome.storage.local.get(['filterHistory'], (result) => {
        if (!result.filterHistory) {
            chrome.storage.local.set({
                filterHistory: {
                    following: {},
                    followers: {}
                }
            }, () => {
                console.log('默认数据已初始化');
            });
        }
    });
    
    // 设置侧边栏
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .then(() => console.log('侧边栏已配置'))
        .catch(error => console.error('配置失败:', error));
});
// background.js 添加状态管理
let batchQueue = [];
let currentType = '';
let isProcessing = false;
// 处理来自侧边栏的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('收到消息:', message.action, '来自:', sender.tab?.id);
    
    switch (message.action) {
        case 'getStorage':
            chrome.storage.local.get(message.key, sendResponse);
            return true;
            
        case 'setStorage':
            chrome.storage.local.set(message.data, () => sendResponse({ success: true }));
            return true;
            
        case 'getTwitterTab':
            // 获取Twitter标签页信息
            getTwitterTab()
                .then(tab => {
                    console.log('返回Twitter标签页:', tab?.id, tab?.url);
                    sendResponse({ tab });
                })
                .catch(error => {
                    console.error('获取Twitter标签页失败:', error);
                    sendResponse({ error: error.message });
                });
            return true;
            
        case 'injectContentScript': // 新增
            injectContentScript(message.tabId)
                .then(() => {
                    console.log('脚本注入成功');
                    sendResponse({ success: true });
                })
                .catch(error => {
                    console.error('脚本注入失败:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true;
            
        case 'ping': // 新增ping响应
            sendResponse({ status: 'ok', timestamp: Date.now() });
            return true;
        case 'startNavigationBatch':
            batchQueue = message.users;
            currentType = message.type;
            processNextInQueue(message.tabId);
        default:
            sendResponse({ received: true });
    }
});
async function processNextInQueue(tabId) {
    if (batchQueue.length === 0) {
        chrome.runtime.sendMessage({ action: 'batchFinished' });
        return;
    }

    const user = batchQueue.shift();
    
    // 1. 跳转 URL
    chrome.tabs.update(tabId, { url: `https://x.com/${user.handle}` });

    // 2. 监听页面加载完成
    const listener = async (updatedTabId, info) => {
        if (updatedTabId === tabId && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            
            // 给 Twitter 内部路由一点渲染时间
            await new Promise(r => setTimeout(r, 3000));

            // 3. 通知 content.js 执行点击
            chrome.tabs.sendMessage(tabId, {
                action: 'executeActionOnProfile',
                type: currentType,
                handle: user.handle
            }, (response) => {
                // 4. 反馈给 sidepanel 并继续下一个
                chrome.runtime.sendMessage({
                    action: 'batchProgress',
                    handle: user.handle,
                    success: response?.success,
                    message: response?.message || '处理完成'
                });
                
                // 随机延迟 2-4 秒防止风控，然后处理下一个
                setTimeout(() => processNextInQueue(tabId), 2000 + Math.random() * 2000);
            });
        }
    };
    chrome.tabs.onUpdated.addListener(listener);
}
// 获取Twitter标签页
async function getTwitterTab() {
    try {
        console.log('开始查找Twitter标签页...');
        
        // 首先查询当前窗口
        let tabs = await chrome.tabs.query({
            url: ["*://twitter.com/*", "*://*.twitter.com/*", "*://x.com/*", "*://*.x.com/*"],
            currentWindow: true,
            active: true
        });
        
        console.log('当前活跃窗口找到Twitter标签页:', tabs.length);
        
        if (tabs.length === 0) {
            // 查询当前窗口的所有Twitter标签页
            tabs = await chrome.tabs.query({
                url: ["*://twitter.com/*", "*://*.twitter.com/*", "*://x.com/*", "*://*.x.com/*"],
                currentWindow: true
            });
            console.log('当前窗口所有Twitter标签页:', tabs.length);
        }
        
        if (tabs.length === 0) {
            // 查询所有窗口
            tabs = await chrome.tabs.query({
                url: ["*://twitter.com/*", "*://*.twitter.com/*", "*://x.com/*", "*://*.x.com/*"]
            });
            console.log('所有窗口找到Twitter标签页:', tabs.length);
        }
        
        if (tabs.length === 0) {
            console.warn('未找到任何Twitter/X标签页');
            return null;
        }
        
        // 优先返回活跃标签页，否则返回第一个
        const activeTab = tabs.find(tab => tab.active) || tabs[0];
        console.log('选择标签页:', {
            id: activeTab.id,
            url: activeTab.url,
            active: activeTab.active,
            status: activeTab.status
        });
        
        // 确保标签页是完成状态
        if (activeTab.status !== 'complete') {
            console.log('标签页未完成加载，状态:', activeTab.status);
        }
        
        return activeTab;
        
    } catch (error) {
        console.error('获取Twitter标签页失败:', error);
        return null;
    }
}

// 监听标签页状态变化
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        if (tab.url.includes('twitter.com') || tab.url.includes('x.com')) {
            console.log('Twitter/X页面加载完成，准备注入content script:', tab.url);
            
            // 延迟注入以确保页面完全就绪
            setTimeout(() => {
                injectContentScript(tabId).catch(error => {
                    console.log('自动注入失败:', error.message);
                });
            }, 2000);
        }
    }
});
// background.js 修改 injectContentScript 函数
async function injectContentScript(tabId) {
    try {
        // 检查是否可以访问该标签页
        const tab = await chrome.tabs.get(tabId);
        if (!tab.url || (!tab.url.includes('twitter.com') && !tab.url.includes('x.com'))) {
            return;
        }

        // 执行脚本注入
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });
        console.log('脚本手动注入成功');
    } catch (error) {
        console.error('注入失败:', error);
    }
}
// 注入content script
// async function injectContentScript(tabId) {
//     try {
//         console.log('尝试注入content script到标签页:', tabId);
        
//         // 检查是否已注入
//         const results = await chrome.scripting.executeScript({
//             target: { tabId: tabId },
//             func: () => {
//                 return {
//                     hasContentScript: !!window.hasTwitterManagerContentScript,
//                     url: window.location.href,
//                     readyState: document.readyState
//                 };
//             }
//         });
        
//         const checkResult = results[0]?.result;
//         console.log('注入前检查结果:', checkResult);
        
//         if (checkResult?.hasContentScript) {
//             console.log('Content script已存在，无需注入');
//             return;
//         }
        
//         // 注入content script
//         await chrome.scripting.executeScript({
//             target: { tabId: tabId },
//             files: ['content.js']
//         });
        
//         console.log('Content script注入成功');
        
//         // 等待脚本初始化
//         await new Promise(resolve => setTimeout(resolve, 1000));
        
//         // 验证注入
//         const verifyResults = await chrome.scripting.executeScript({
//             target: { tabId: tabId },
//             func: () => {
//                 return {
//                     hasContentScript: !!window.hasTwitterManagerContentScript,
//                     timestamp: new Date().toISOString()
//                 };
//             }
//         });
        
//         console.log('注入验证结果:', verifyResults[0]?.result);
        
//     } catch (error) {
//         console.error('注入content script失败:', error);
//         throw error;
//     }
// }

// background.js
let taskQueue = [];
let currentOpType = '';
let activeTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startNavigationBatch') {
        taskQueue = message.users || [];
        currentOpType = message.type;
        activeTabId = message.tabId;
        executeNextTask();
    }
});

async function executeNextTask() {
    if (taskQueue.length === 0) {
        chrome.runtime.sendMessage({ action: 'batchFinished' });
        return;
    }

    const user = taskQueue.shift();

    try {
        // 更新标签页 URL
        await chrome.tabs.update(activeTabId, { url: 'https://x.com/' + user.handle });

        // 监听加载完成
        const listener = (tabId, info) => {
            if (tabId === activeTabId && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);

                // 等待 3 秒确保页面组件渲染
                setTimeout(() => {
                    sendActionToContent(user.handle);
                }, 3000);
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    } catch (err) {
        console.warn("跳过无效任务:", err.message);
        // 如果是因为 DevTools 报错，提示用户
        if (err.message.includes('DevTools')) {
            chrome.runtime.sendMessage({ 
                action: 'batchProgress', 
                handle: user.handle, 
                success: false, 
                message: "操作受限：请关闭 F12 开发者工具后再试" 
            });
        }
        setTimeout(executeNextTask, 1000); // 1秒后处理下一个
    }
}

function sendActionToContent(handle) {
    chrome.tabs.sendMessage(activeTabId, {
        action: 'executeActionOnProfile',
        type: currentOpType
    }, (response) => {
        // 处理响应，不使用 ?. 语法
        const success = (response && response.success) ? true : false;
        const msg = (response && response.message) ? response.message : "响应超时";

        chrome.runtime.sendMessage({
            action: 'batchProgress',
            handle: handle,
            success: success,
            message: msg
        });

        // 随机延迟 2-4 秒处理下一个
        setTimeout(executeNextTask, 2000 + Math.random() * 2000);
    });
}