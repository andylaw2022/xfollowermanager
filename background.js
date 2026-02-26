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
        default:
            sendResponse({ received: true });
    }
});

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