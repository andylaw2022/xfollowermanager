// Twitter关注管理器侧边栏脚本 - 修复通信问题

class TwitterManager {
    constructor() {
        this.currentTab = 'following';
        this.currentFilters = {};
        this.selectedUsers = new Set();
        this.currentUsers = [];
        this.filterHistory = {};
        this.currentPage = 1;
        this.usersPerPage = 50;
        this.batchOperation = null;
        this.isLoading = false;
        this.searchLimit = 50; // 默认查找上限
        this.isLoading = false;
    this.isSearching = false;
        this.init();
    }

    async init() {
    console.log('初始化Twitter管理器');
    
    // 初始UI状态
    this.hideStatusMonitor();
    this.hidePagination();
    
    // 加载历史数据
    await this.loadFilterHistory();
    
    // 使用 DOMContentLoaded 事件确保 DOM 完全加载
    if (document.readyState === 'loading') {
        await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve);
        });
    }
    
    // 设置事件监听器
    this.setupEventListeners();
    
    // 初始化折叠状态
    this.initCollapsible();
    
    // 添加数量限制控制
    this.addLimitControl();
    this.addDonateButton();
    // 初始UI状态
    this.updateUI();
    this.showStatusMonitor(); // 初始就显示
    console.log('Twitter管理器初始化完成');
}

setupEventListeners() {
    console.log('开始设置事件监听器...');
    
    // Tab切换
    const tabFollowing = document.getElementById('tabFollowing');
    const tabFollowers = document.getElementById('tabFollowers');
    if (tabFollowing) {
        console.log('绑定关注列表tab');
        tabFollowing.addEventListener('click', () => this.switchTab('following'));
    }
    if (tabFollowers) {
        console.log('绑定被关注列表tab');
        tabFollowers.addEventListener('click', () => this.switchTab('followers'));
    }

    // 筛选条件变化
    const verifiedFilter = document.getElementById('verifiedFilter');
    const followsMeFilter = document.getElementById('followsMeFilter');
    
    if (verifiedFilter) {
        console.log('绑定蓝V筛选');
        verifiedFilter.addEventListener('change', (e) => this.onFilterChange(e));
    }
    
    if (followsMeFilter) {
        console.log('绑定关注我筛选');
        followsMeFilter.addEventListener('change', (e) => this.onFilterChange(e));
    }

   // sidepanel.js -> setupEventListeners() 内部

  // sidepanel.js - 修改 setupEventListeners 内部相关逻辑
  const operationInterval = document.getElementById('operationInterval');
  const intervalMinus = document.getElementById('intervalMinus');
  const intervalPlus = document.getElementById('intervalPlus');

  if (intervalMinus && operationInterval) {
      intervalMinus.onclick = (e) => { // 改用 onclick 确保直接覆盖
          let val = parseInt(operationInterval.value) || 10;
          if (val > 10) operationInterval.value = val - 1;
      };
  }
  if (intervalPlus && operationInterval) {
      intervalPlus.onclick = (e) => {
          let val = parseInt(operationInterval.value) || 10;
          operationInterval.value = val + 1;
      };
  }

    // 主要按钮事件
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const invertSelectionBtn = document.getElementById('invertSelectionBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
    
    if (applyFilterBtn) {
        console.log('绑定应用筛选按钮');
        applyFilterBtn.addEventListener('click', () => this.applyFilters());
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => this.refreshData());
    }
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => this.selectAll());
    }
    
    if (invertSelectionBtn) {
        invertSelectionBtn.addEventListener('click', () => this.invertSelection());
    }
    
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => this.clearAllData());
    }

    // 分页按钮
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    
    if (prevPage) {
        prevPage.addEventListener('click', () => this.prevPage());
    }
    
    if (nextPage) {
        nextPage.addEventListener('click', () => this.nextPage());
    }
    
    // 批量操作按钮
    const batchUnfollowBtn = document.getElementById('batchUnfollowBtn');
    const batchFollowBtn = document.getElementById('batchFollowBtn');
    
    if (batchUnfollowBtn) {
        batchUnfollowBtn.addEventListener('click', () => this.startBatchUnfollow());
    }
    
    if (batchFollowBtn) {
        batchFollowBtn.addEventListener('click', () => this.startBatchFollow());
    }
    
    // 状态监控按钮
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const clearLogBtn = document.getElementById('clearLogBtn');
    
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => this.togglePause());
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', () => this.stopOperation());
    }
    
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', () => this.clearLog());
    }
    
    // 捐助按钮
    const donateBtn = document.getElementById('donateBtn');
    if (donateBtn) {
        donateBtn.addEventListener('click', () => this.showDonationModal());
    }

    // 语言切换
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => this.setLanguage(e.target.value));
    }
    
    // 筛选条件折叠按钮 - 修复这里！
    const filterToggle = document.getElementById('filterToggle');
    if (filterToggle) {
        console.log('找到filterToggle元素，添加点击事件');
        filterToggle.addEventListener('click', () => this.toggleFilter());
    } else {
        console.warn('未找到filterToggle元素，可能是DOM未完全加载');
        // 等待一下再尝试绑定
        setTimeout(() => {
            const retryToggle = document.getElementById('filterToggle');
            if (retryToggle) {
                console.log('重新绑定filterToggle');
                retryToggle.addEventListener('click', () => this.toggleFilter());
            }
        }, 100);
    }
    // sidepanel.js -> setupEventListeners() 内部
    const batchStopBtn = document.getElementById('batchStopBtn');
    if (batchStopBtn) {
        batchStopBtn.addEventListener('click', () => {
            this.stopOperation();
            this.addLog('用户手动点击停止按钮', 'warning');
        });
    }


    // sidepanel.js - setupEventListeners 内部增加
    const followAuthorBtn = document.getElementById('followAuthorBtn');
    if (followAuthorBtn) {
        followAuthorBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: 'https://x.com/andylawian' }, (tab) => {
                // 延迟尝试自动点击关注（可选，取决于页面加载速度）
                this.addLog('正在前往作者主页...', 'success');
            });
        });
    }
    console.log('事件监听器设置完成');
}


resetStatusMonitorForSearch(limit) {
    document.getElementById('progressFill').style.width = `0%`;
    document.getElementById('progressText').textContent = `正在扫描...`;
    document.getElementById('completedCount').textContent = '0';
    document.getElementById('totalCount').textContent = limit;
    document.getElementById('successCount').textContent = '0';
    document.getElementById('failedCount').textContent = '0';
    document.getElementById('timeRemaining').textContent = '计算中...';
    // 查找时暂时隐藏暂停/停止按钮，因为查找不可暂停（除非关闭插件）
    document.querySelector('.status-controls').style.visibility = 'hidden';
}

updateSearchProgress(current, total) {
    const progress = Math.min((current / total) * 100, 100);
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${Math.round(progress)}%`;
    document.getElementById('completedCount').textContent = current;
    
    // 这里的“成功”数在查找时可以理解为“已抓取符合条件的用户数”
    document.getElementById('successCount').textContent = current;
    
    // 动态显示状态
    if (current >= total) {
        document.getElementById('timeRemaining').textContent = '即将完成';
    } else {
        document.getElementById('timeRemaining').textContent = '扫描中';
    }
}

// 修改原有的 showStatusMonitor 确保按钮在批量操作时重新显示
showStatusMonitor() {
    document.getElementById('statusMonitor').style.display = 'block';
    document.querySelector('.status-controls').style.visibility = 'visible';
    document.getElementById('batchUnfollowBtn').disabled = true;
    document.getElementById('batchFollowBtn').disabled = true;
}

addLimitControl() {
    // 等待DOM完全加载
    setTimeout(() => {
        const filterConditions = document.querySelector('.filter-conditions');
        if (!filterConditions) {
            console.warn('未找到filter-conditions元素');
            return;
        }
        
        // 检查是否已经添加过
        if (document.getElementById('searchLimit')) {
            return;
        }
        
        // 添加数量限制行
        const limitRow = document.createElement('div');
        limitRow.className = 'filter-row';
        limitRow.innerHTML = `
            <div class="filter-group">
                <label for="searchLimit">查找数量:</label>
                <select class="filter-select" id="searchLimit" data-filter="limit">
                    <option value="10">10 条</option>
                    <option value="30" selected>30 条</option>
                    <option value="50">50 条</option>
                    <option value="100">100 条</option>
                    <option value="200">200 条</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="sourceType">数据源:</label>
                <select class="filter-select" id="sourceType" data-filter="source">
                    <option value="page">页面提取</option>
                    <option value="mock">示例数据</option>
                </select>
            </div>
        `;
        
        filterConditions.appendChild(limitRow);
        
        // 监听变化
        document.getElementById('searchLimit').addEventListener('change', (e) => {
            this.searchLimit = parseInt(e.target.value);
            console.log('搜索限制已更新为:', this.searchLimit);
        });
        
        document.getElementById('sourceType').addEventListener('change', (e) => {
            console.log('数据源已更新为:', e.target.value);
        });
        
        console.log('数量限制控件已添加');
    }, 300);
}


// 添加调试方法
async debugCommunication() {
    try {
        this.addLog('开始调试通信...', 'info');
        
        // 1. 检查background连接
        const bgResponse = await this.sendMessageToBackground('ping');
        this.addLog(`Background连接: ${bgResponse?.status || '失败'}`, 'info');
        
        // 2. 获取Twitter标签页
        const tabResponse = await this.sendMessageToBackground('getTwitterTab');
        if (tabResponse.tab) {
            this.addLog(`找到Twitter标签页: ${tabResponse.tab.url}`, 'success');
            
            // 3. 测试content script通信
            const pingResult = await this.sendMessageToTab(tabResponse.tab.id, {
                action: 'ping',
                timestamp: Date.now()
            });
            
            this.addLog(`Content script响应: ${JSON.stringify(pingResult)}`, 'info');
            
        } else {
            this.addLog('未找到Twitter标签页', 'error');
        }
        
    } catch (error) {
        this.addLog(`调试失败: ${error.message}`, 'error');
    }
}
async applyFilters() {

const applyBtn = document.getElementById('applyFilterBtn');

    // 如果正在查找，则执行停止逻辑
    if (this.isSearching) {
        this.isSearching = false;
        this.addLog('正在停止查找...', 'warning');
        applyBtn.textContent = '查找';
        return;
    }

    this.isSearching = true;
    applyBtn.textContent = '停止';
    applyBtn.classList.replace('btn-primary', 'btn-secondary');

    try {

// 优化3：自动折叠搜索条件
    const filterContent = document.getElementById('filterContent');
    const filterToggle = document.getElementById('filterToggle');
    if (filterContent && !filterContent.classList.contains('collapsed')) {
        filterContent.classList.add('collapsed');
        filterToggle.textContent = '▶';
    }

    if (this.isLoading) return;
    this.isLoading = true;
    
    try {
        this.showLoading();
        let allFoundUsers = [];
        const limit = parseInt(document.getElementById('searchLimit').value) || 30;
       // --- 新增：查找时显示进度面板 ---
        this.showStatusMonitor();
        this.resetStatusMonitorForSearch(limit);

        this.addLog(`开始查找用户，目标数量: ${limit}...`, 'info');
        const response = await this.sendMessageToBackground('getTwitterTab');
        if (!response.tab) throw new Error('请确保Twitter页面已打开');
        const tabId = response.tab.id;
        
        const tab = response.tab;
        const url = new URL(tab.url);
        const path = url.pathname.toLowerCase();

        // 获取自己的用户名（假设在登录状态下，可以从路径或其他方式判断，这里简单处理）
        // 逻辑：判断路径是否包含 /following 或 /followers
        const isFollowingPage = path.endsWith('/following');
        const isFollowersPage = path.endsWith('/followers');

        // 根据当前 Tab 目标进行跳转判断
        if (this.currentTab === 'following' ) {
            if(!isFollowingPage){
            this.addLog('检测到不在关注列表，正在自动跳转...', 'info');
            // 获取用户名并跳转，如果拿不到用户名则跳转到 home
            const newUrl = url.origin + (isFollowersPage ? path.replace('/followers', '/following') : '/following');
            await chrome.tabs.update(tab.id, { url: newUrl });
            await new Promise(r => setTimeout(r, 3000)); // 等待页面加载
            }

        } 
        else if (this.currentTab === 'followers' ) {
            if(!isFollowersPage){
            this.addLog('检测到不在粉丝列表，正在自动跳转...', 'info');
            const newUrl = url.origin + (isFollowingPage ? path.replace('/following', '/followers') : '/followers');
            await chrome.tabs.update(tab.id, { url: newUrl });
            await new Promise(r => setTimeout(r, 3000)); // 等待页面加载
    
            }
    }


        await ensureContentScript(tabId); // 新增：确保脚本存在
        const users = await this.fetchUsersWithScrolling(response.tab.id, limit, (currentCount) => {
    this.updateSearchProgress(currentCount, limit);
});
        this.currentUsers = users;
        this.renderUserList();
        this.updateResultsCount();
        this.addLog(`查找完成，共获取 ${users.length} 个有效用户`, 'success');
  // 查找完成后，延迟隐藏进度面板，或者保持显示直到用户清空
        setTimeout(() => this.hideStatusMonitor(), 2000);
      } catch (error) {
        this.addLog(`查找失败: ${error.message}`, 'error');
    }

    } catch (error) {
            if (error.message === 'USER_STOPPED') {
                this.addLog('查找已由用户中断', 'info');
            } else {
                this.addLog(`查找失败: ${error.message}`, 'error');
            }
        } finally {
            this.isSearching = false;
            applyBtn.textContent = '查找';
            applyBtn.classList.replace('btn-secondary', 'btn-primary');
            this.isLoading = false;

        }
}

// sidepanel.js
async fetchUsersWithScrolling(tabId, targetLimit) {
    let allUsers = [];
    let retryCount = 0;
    const maxRetries = 100; // 减少重试次数，防止卡死
    let lastUserCount = 0;
    let consecutiveSameCount = 0;

    while (allUsers.length < targetLimit && retryCount < maxRetries) {
        this.addLog(`正在抓取数据 (当前: ${allUsers.length}/${targetLimit})...`, 'info');

        const result = await this.sendMessageToTab(tabId, {
            action: 'getUsers',
            tab: this.currentTab,
            filters: this.getCurrentFilters(),
            limit: targetLimit,
            timestamp: Date.now()
        });

        if (result && Array.isArray(result)) {
            // 合并并去重
            const newUsers = result.filter(nu => !allUsers.some(au => au.handle === nu.handle));
            allUsers = [...allUsers, ...newUsers];
            // --- 核心：触发进度更新回调 ---
// 只有当传入了回调函数时才执行
            if (typeof onProgress === 'function') {
                onProgress(allUsers.length);
            }
        }

        // 如果滚动后没有新用户增加，说明到底了，直接退出
// 检查是否有新数据增加
        if (allUsers.length === lastUserCount) {
            consecutiveSameCount++;
            if (consecutiveSameCount > 5) { // 连续5次没新数据才判定到底
            //    this.addLog(`页面已无更多数据或加载过慢`, 'info');
             //   break;
            }
        } else {
            consecutiveSameCount = 0;
        }
        lastUserCount = allUsers.length;

        if (allUsers.length >= targetLimit) break;

        // 执行滚动
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => { window.scrollBy(0, 1000); } // 使用 scrollBy 更有利于触发加载
        });

        await new Promise(r => setTimeout(r, 1500));
        retryCount++;
    }
    return allUsers.slice(0, targetLimit);
}
// 修改 showError 方法，提供更具体的解决方案
showError(error) {
    const userList = document.getElementById('userList');
    if (userList) {
        let errorMessage = error.message;
        let suggestions = [];
        let actions = [];
        
        if (error.message.includes('Cannot access contents')) {
            errorMessage = '权限问题：无法访问Twitter页面内容';
            suggestions = [
                'Twitter页面可能是about:blank或未完全加载',
                '请确保在正确的Twitter/X页面操作',
                '可能需要重新加载插件或重启浏览器'
            ];
            actions = [
                { id: 'retryBasic', text: '简单重试', action: 'retryBasic' },
                { id: 'openTwitter', text: '打开Twitter', action: 'openTwitter' }
            ];
            
        } else if (error.message.includes('Receiving end')) {
            errorMessage = '通信失败：无法连接到Twitter页面';
            suggestions = [
                'Content script可能未正确注入',
                'Twitter页面可能需要重新加载',
                '尝试关闭并重新打开侧边栏'
            ];
            actions = [
                { id: 'reloadTwitter', text: '刷新Twitter页面', action: 'reloadTwitter' },
                { id: 'useMockData', text: '使用示例数据', action: 'useMockData' }
            ];
            
        } else if (error.message.includes('timeout')) {
            errorMessage = '超时：Twitter页面响应太慢';
            suggestions = [
                '网络可能较慢，请稍后重试',
                'Twitter服务器可能繁忙',
                '尝试减少查找数量'
            ];
            actions = [
                { id: 'retryWithLimit', text: '重试（限制10条）', action: 'retryWithLimit' },
                { id: 'useMockData', text: '使用示例数据', action: 'useMockData' }
            ];
        }
        
        let html = `
            <div class="empty-state">
                <p style="color: #f91880; font-weight: bold;">⚠️ ${errorMessage}</p>
                <div style="margin-top: 12px; text-align: left;">
        `;
        
        if (suggestions.length > 0) {
            html += `<p style="font-size: 11px; color: #536471; margin-bottom: 8px;">建议：</p>`;
            suggestions.forEach(suggestion => {
                html += `<p style="font-size: 10px; color: #99aab5; margin: 2px 0;">• ${suggestion}</p>`;
            });
        }
        
        html += `</div><div style="margin-top: 16px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">`;
        
        actions.forEach(action => {
            html += `<button class="btn-small" id="${action.id}">${action.text}</button>`;
        });
        
        html += `</div></div>`;
        
        userList.innerHTML = html;
        
        // 绑定按钮事件
        setTimeout(() => {
            actions.forEach(action => {
                document.getElementById(action.id)?.addEventListener('click', () => {
                    this.handleErrorAction(action.action);
                });
            });
        }, 100);
    }
}


// 添加错误处理动作
handleErrorAction(action) {
    switch (action) {
        case 'retryBasic':
            this.refreshData();
            break;
        case 'openTwitter':
            chrome.tabs.create({ url: 'https://twitter.com' });
            this.addLog('已打开Twitter，请登录后重试', 'info');
            break;
        case 'reloadTwitter':
            this.reloadTwitterPage();
            break;
        case 'retryWithLimit':
            this.searchLimit = 10;
            document.getElementById('searchLimit').value = '10';
            this.refreshData();
            break;
        case 'useMockData':
            this.useMockData();
            break;
    }
}


// 添加重新加载Twitter页面的方法
async reloadTwitterPage() {
    try {
        const response = await this.sendMessageToBackground('getTwitterTab');
        if (response.tab) {
            chrome.tabs.reload(response.tab.id);
            this.addLog('正在刷新Twitter页面...', 'info');
            
            // 等待页面刷新后重试
            setTimeout(() => {
                this.addLog('页面刷新完成，尝试重新获取数据', 'info');
                setTimeout(() => this.refreshData(), 3000);
            }, 3000);
        }
    } catch (error) {
        this.addLog('刷新页面失败: ' + error.message, 'error');
    }
}
   // 使用示例数据（降级方案）
    async useMockData() {
        this.addLog('使用示例数据...', 'warning');
        
        // 生成示例数据
        const mockUsers = this.generateMockUsers(25);
        
        this.currentUsers = mockUsers;
        this.currentPage = 1;
        this.selectedUsers.clear();
        
        // 更新UI
        this.renderUserList();
        this.updateResultsCount();
        this.updateSelectionUI();
        
        this.addLog(`加载了 ${mockUsers.length} 个示例用户`, 'info');
    }

    // 生成示例用户数据
    generateMockUsers(count) {
        const users = [];
        const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
                      'Alex Chen', 'Lisa Wang', 'Tom Zhang', 'Emily Liu', 'David Zhao',
                      '科技爱好者', '旅行达人', '美食博主', '摄影师', '设计师', '程序员'];
        
        for (let i = 0; i < count; i++) {
            const name = names[Math.floor(Math.random() * names.length)];
            const handle = `user${1000 + i}`;
            const verified = Math.random() > 0.85;
            const followers = Math.floor(Math.random() * 100000);
            const daysAgo = Math.floor(Math.random() * 90);
            const lastActive = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
            
            const user = {
                id: `mock_${Date.now()}_${i}`,
                name: name,
                handle: handle,
                verified: verified,
                followers: followers,
                lastActive: lastActive,
                isFollowing: this.currentTab === 'followers' ? Math.random() > 0.6 : false,
                followsYou: this.currentTab === 'following' ? Math.random() > 0.4 : false
            };
            
            // 应用当前筛选条件
            if (this.applyFiltersToUser(user, this.currentFilters)) {
                users.push(user);
            }
        }
        
        // 应用排序
        if (this.currentFilters?.sort && this.currentFilters.sort !== 'default') {
            users.sort((a, b) => {
                switch (this.currentFilters.sort) {
                    case 'followers_desc': return b.followers - a.followers;
                    case 'followers_asc': return a.followers - b.followers;
                    case 'recent_active': return new Date(b.lastActive) - new Date(a.lastActive);
                    case 'least_active': return new Date(a.lastActive) - new Date(b.lastActive);
                    default: return 0;
                }
            });
        }
        
        return users;
    }

    applyFiltersToUser(user, filters) {
        if (!filters) return true;
        
        // 蓝V筛选
        if (filters.verified && filters.verified !== 'any') {
            if (filters.verified === 'verified' && !user.verified) return false;
            if (filters.verified === 'unverified' && user.verified) return false;
        }
        
    // 粉丝数筛选 - 小于等于指定值
    if (filters.followers && filters.followers > 0) {
        const followers = user.followers || 0;
        if (followers > filters.followers) {
            return false;
        }
    }
            // 是否关注我筛选
    if (filters.followsMe && filters.followsMe !== 'any') {
        if (filters.followsMe === 'yes' && !user.followsYou) return false;
        if (filters.followsMe === 'no' && user.followsYou) return false;
    }

            // 我是否回关（针对被关注列表）
            if (filters.isFollowing && filters.isFollowing !== 'any') {
                if (filters.isFollowing === 'yes' && !user.isFollowing) return false;
                if (filters.isFollowing === 'no' && user.isFollowing) return false;
            }

        
        return true;
    }
// 修改 getTwitterUsersWithTimeout 方法，简化通信逻辑
async getTwitterUsersWithTimeout() {
    try {
        // 通过background script获取Twitter标签页
        const response = await this.sendMessageToBackground('getTwitterTab');
        
        if (!response.tab) {
            throw new Error('请先打开Twitter/X网站并登录您的账号');
        }
        
        const twitterTab = response.tab;
        console.log('找到Twitter标签页:', twitterTab.id, twitterTab.url);
        
        // 步骤1: 检查content script是否已就绪
        let isScriptReady = false;
        try {
            const pingResult = await this.sendMessageToTabWithTimeout(twitterTab.id, {
                action: 'ping',
                timestamp: Date.now()
            }, 3000);
            
            isScriptReady = pingResult && pingResult.ready;
            console.log('Ping结果:', pingResult);
            
        } catch (pingError) {
            console.log('Ping失败，准备注入脚本:', pingError.message);
            isScriptReady = false;
        }
        
        // 步骤2: 如果脚本未就绪，尝试注入
        if (!isScriptReady) {
            this.addLog('正在注入脚本...', 'info');
            
            try {
                await this.sendMessageToBackground('injectContentScript', {
                    tabId: twitterTab.id
                });
                
                // 等待注入完成
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // 再次检查
                const retryPing = await this.sendMessageToTabWithTimeout(twitterTab.id, {
                    action: 'ping',
                    timestamp: Date.now()
                }, 3000);
                
                isScriptReady = retryPing && retryPing.ready;
                
            } catch (injectError) {
                console.error('脚本注入失败:', injectError);
                throw new Error('无法与Twitter页面建立通信');
            }
        }
        
        if (!isScriptReady) {
            throw new Error('Twitter页面脚本未就绪');
        }
        
        // 步骤3: 获取用户数据
        this.addLog('正在从Twitter页面获取用户数据...', 'info');
        
        const usersPromise = new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(twitterTab.id, {
                action: 'getUsers',
                tab: this.currentTab,
                filters: this.currentFilters,
                limit: this.searchLimit,
                timestamp: Date.now()
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && Array.isArray(response)) {
                    resolve(response);
                } else if (response && response.error) {
                    reject(new Error(response.error));
                } else {
                    reject(new Error('获取的数据格式不正确'));
                }
            });
        });
        
        // 设置超时
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('获取数据超时（20秒）')), 20000);
        });
        
        const users = await Promise.race([usersPromise, timeoutPromise]);
        
        console.log('成功获取用户数据:', users?.length || 0, '个');
        return Array.isArray(users) ? users : [];
        
    } catch (error) {
        console.error('获取用户数据失败:', error);
        
        // 提供更友好的错误信息
        let errorMessage = error.message;
        if (error.message.includes('Receiving end does not exist')) {
            errorMessage = 'Twitter页面未正确加载或已关闭';
        } else if (error.message.includes('timeout')) {
            errorMessage = '获取数据超时，请刷新Twitter页面后重试';
        } else if (error.message.includes('Cannot access contents')) {
            errorMessage = '无法访问Twitter页面内容，请检查权限';
        }
        
        throw new Error(errorMessage);
    }
}

    // 调整操作间隔
    adjustInterval(delta) {
        const input = document.getElementById('operationInterval');
        let value = parseInt(input.value) + delta;
        if (value < 1) value = 1;
        if (value > 10) value = 10;
        input.value = value;
    }
// 在 initCollapsible 方法中修复初始状态
initCollapsible() {
    // 等待DOM完全加载
    setTimeout(() => {
        const filterContent = document.getElementById('filterContent');
        const filterToggle = document.getElementById('filterToggle');
        
        if (!filterContent || !filterToggle) {
            console.warn('初始化折叠状态失败，元素未找到');
            return;
        }
        
        // 检查是否有保存的折叠状态
        chrome.storage.local.get(['uiSettings'], (result) => {
            const isCollapsed = result.uiSettings?.filterCollapsed || false;
            
            if (isCollapsed) {
                filterContent.classList.add('collapsed');
                filterToggle.textContent = '▶';
            } else {
                filterContent.classList.remove('collapsed');
                filterToggle.textContent = '▼';
            }
            
            console.log('折叠状态初始化完成，状态:', isCollapsed ? '折叠' : '展开');
        });
    }, 100);
}
// 在类中添加测试方法
testButtonClick() {
    console.log('测试按钮点击...');
    const applyBtn = document.getElementById('applyFilterBtn');
    if (applyBtn) {
        applyBtn.click();
        console.log('应用筛选按钮已触发点击');
    }
}
// 修复 toggleFilter 方法
toggleFilter() {
    const filterContent = document.getElementById('filterContent');
    const filterToggle = document.getElementById('filterToggle');
    
    const isCollapsed = filterContent.classList.contains('collapsed');
    
    if (isCollapsed) {
        // 展开
        filterContent.classList.remove('collapsed');
        filterToggle.textContent = '▼';
    } else {
        // 折叠
        filterContent.classList.add('collapsed');
        filterToggle.textContent = '▶';
    }
    
    // 保存状态
    chrome.storage.local.set({
        uiSettings: {
            filterCollapsed: !isCollapsed
        }
    });
}
    hideStatusMonitor() {
    // 不再使用 display: none
        document.getElementById('statusMonitor').style.display = 'block';
        this.updateSelectionUI();
        }

    hidePagination() {
        document.getElementById('pagination').style.display = 'none';
    }


    async loadFilterHistory() {
        try {
            const data = await this.sendMessageToBackground('getStorage', { key: 'filterHistory' });
            this.filterHistory = data.filterHistory || {
                following: {},
                followers: {}
            };
            
            // 加载当前tab的筛选条件
            if (this.filterHistory[this.currentTab]) {
                this.loadFiltersToUI(this.filterHistory[this.currentTab]);
            }
        } catch (error) {
            console.error('加载筛选历史失败:', error);
        }
    }

// 在 TwitterManager 类中添加调试方法
async debugGetUsers() {
    try {
        console.log('开始调试 getUsers...');
        
        // 1. 找到Twitter标签页
        const tabResponse = await this.sendMessageToBackground('getTwitterTab');
        if (!tabResponse.tab) {
            console.error('未找到Twitter标签页');
            return;
        }
        
        const twitterTab = tabResponse.tab;
        console.log('Twitter标签页:', twitterTab.id, twitterTab.url);
        
        // 2. 发送测试消息
        console.log('发送测试消息...');
        const testResponse = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(twitterTab.id, {
                action: 'getUsers',
                tab: this.currentTab,
                filters: {},
                limit: 5,
                timestamp: Date.now()
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        console.log('测试响应:', testResponse);
        
        if (Array.isArray(testResponse)) {
            console.log(`成功获取 ${testResponse.length} 个用户`);
            console.log('用户列表:', testResponse);
        } else {
            console.error('响应不是数组:', testResponse);
        }
        
    } catch (error) {
        console.error('调试失败:', error);
        console.error('错误堆栈:', error.stack);
    }
}

// 然后在 init() 方法中添加一个调试按钮
addDonateButton() {
    const donateBtn = document.getElementById('donateBtn');
    const modal = document.getElementById('donationModal');
    const copyBtn = document.getElementById('donationCopyBtn');
    const closeBtn = document.getElementById('donationCloseBtn');

    if (donateBtn && modal) {
        donateBtn.title = "支持作者"; // 修改悬停提示
        donateBtn.addEventListener('click', () => this.showDonationModal());
    }

    // 新增：点击弹窗外部关闭
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) { // 如果点击的是背景遮罩层本身
                this.hideDonationModal();
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止冒泡
            const addrEl = document.getElementById('donationAddressText');
            const addr = addrEl ? addrEl.textContent.trim() : '';
            if (addr) {
                navigator.clipboard.writeText(addr).then(() => {
                    this.showCopyToast('已复制地址');
                });
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hideDonationModal());
    }
}


showDonationModal() {
    const modal = document.getElementById('donationModal');
    if (modal) modal.style.display = 'flex';
}

hideDonationModal() {
    const modal = document.getElementById('donationModal');
    if (modal) modal.style.display = 'none';
}

// 在弹窗中显示临时提示气泡
showCopyToast(message, duration = 2000) {
    try {
        // 确保没有重复的 toast
        const existing = document.getElementById('donationCopyToast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'donationCopyToast';
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '24px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'rgba(0,0,0,0.8)';
        toast.style.color = 'white';
        toast.style.padding = '8px 12px';
        toast.style.borderRadius = '8px';
        toast.style.zIndex = '9999';
        toast.style.fontSize = '13px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        document.body.appendChild(toast);

        setTimeout(() => {
            try { toast.style.transition = 'opacity 0.25s'; toast.style.opacity = '0'; } catch (e) {}
            setTimeout(() => { try { toast.remove(); } catch (e) {} }, 300);
        }, duration);
    } catch (e) {
        console.warn('showCopyToast failed', e);
    }
}

setLanguage(lang) {
    this.lang = lang;
    const map = {
        zh: {
            following: '我关注的',
            followers: '关注我的',
            titleFollowing: '我关注的列表管理',
            titleFollowers: '关注我的列表管理',
            filterHeader: '筛选条件',
            apply: '查找',
            batchUnfollow: '批量取关',
            batchFollow: '批量回关',
            emptyHint: '请确保已打开Twitter/X的个人页面'
        },
        en: {
            following: 'Following',
            followers: 'Followers',
            titleFollowing: 'Following Management',
            titleFollowers: 'Followers Management',
            filterHeader: 'Filters',
            apply: 'Find',
            batchUnfollow: 'Batch Unfollow',
            batchFollow: 'Batch Follow',
            emptyHint: 'Make sure a Twitter/X profile page is open'
        },
        ja: {
            following: 'フォロー中',
            followers: 'フォロワー',
            titleFollowing: 'フォロー管理',
            titleFollowers: 'フォロワー管理',
            filterHeader: 'フィルター',
            apply: '検索',
            batchUnfollow: '一括フォロー解除',
            batchFollow: '一括フォロー',
            emptyHint: 'Twitter/Xのプロフィールページを開いてください'
        }
    };

    const s = map[lang] || map.zh;
    document.getElementById('tabFollowing').textContent = s.following;
    document.getElementById('tabFollowers').textContent = s.followers;
    document.getElementById('applyFilterBtn').textContent = s.apply;
    document.getElementById('batchUnfollowBtn').textContent = s.batchUnfollow;
    document.getElementById('batchFollowBtn').textContent = s.batchFollow;
    const emptyHint = document.querySelector('.empty-hint');
    if (emptyHint) emptyHint.textContent = s.emptyHint;

    // 更新主标题（根据当前 tab）
    try {
        const title = document.querySelector('.header h1');
        if (title) {
            const t = this.currentTab === 'followers' ? s.titleFollowers || s.followers : s.titleFollowing || s.following;
            title.innerHTML = `<span class="logo">🐦</span> ${t}`;
        }
    } catch (e) {}

    // 更新筛选头部文字，同时保留 filterToggle 元素和其事件
    try {
        const fh = document.querySelector('.filter-header h3');
        if (fh) {
            const toggle = fh.querySelector('#filterToggle');
            // 清除所有后续文本节点
            if (toggle) {
                // remove nodes after toggle
                let node = toggle.nextSibling;
                while (node) {
                    const next = node.nextSibling;
                    fh.removeChild(node);
                    node = next;
                }
                // append emoji + label
                fh.appendChild(document.createTextNode(' 🎯 ' + (s.filterHeader || '筛选条件')));
            } else {
                fh.textContent = s.filterHeader || '筛选条件';
            }
        }
    } catch (e) {}
}
    loadFiltersToUI(filters) {
        if (!filters) return;
        
        Object.entries(filters).forEach(([key, value]) => {
            const select = document.getElementById(`${key}Filter`);
            if (select && value) {
                select.value = value;
            }
        });
    }

// 【修改】切换标签页时，初始化对应的筛选选项
    switchTab(tab) {
        // 1. 保存旧tab的筛选条件
        this.filterHistory[this.currentTab] = this.getCurrentFilters();

        // 2. 切换tab状态
        this.currentTab = tab;

        // 3. 更新顶部Tab样式
        document.getElementById('tabFollowing').classList.toggle('active', tab === 'following');
        document.getElementById('tabFollowers').classList.toggle('active', tab === 'followers');

        // 4. 【核心修复】根据 Tab 类型重置筛选下拉菜单的选项结构
        this.setupFilterOptionsForTab(tab);

        // 5. 加载历史筛选值
        const savedFilters = this.filterHistory[tab];
        if (savedFilters) {
            this.loadFiltersToUI(savedFilters);
        }

        // 6. 重置数据状态
        this.selectedUsers.clear();
        this.currentUsers = [];
        this.currentPage = 1;

        // 7. 更新界面
        this.renderUserList();
        this.updateResultsCount();
        this.updateSelectionUI();

        // 更新标题文字
        const titleText = tab === 'following' ? '我关注的列表' : '关注我的列表';
        const titleEl = document.querySelector('.header h1');
        if (titleEl) titleEl.innerHTML = `<span class="logo">🐦</span> ${titleText}`;

        this.updateUI();
        this.addLog(`已切换到${tab === 'following' ? '关注列表' : '被关注列表'}`, 'info');
    }
// 修改 getCurrentFilters 方法中的数值处理
getCurrentFilters() {
    const filters = {};
    document.querySelectorAll('.filter-select').forEach(select => {
        const filterType = select.getAttribute('data-filter');
        if (filterType) {
            // 对于粉丝数输入框，验证并转换数值
            if (filterType === 'followers') {
                const value = select.value.trim();
                if (value === '' || isNaN(value) || parseInt(value) <= 0) {
                    filters[filterType] = null; // 清空或无效值
                } else {
                    filters[filterType] = parseInt(value);
                }
            } else {
                filters[filterType] = select.value;
            }
        }
    });

    const limitInput = document.getElementById('searchLimit');
    let limit = parseInt(limitInput.value) || 50;
    
    // 数字校验：强制限制在 1-100 之间
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 1;
    limitInput.value = limit; // 回写修正后的数值
    
    filters.limit = limit;
    return filters;
}

    onFilterChange(event) {
        //this.updateFilterHeader();
        console.log('筛选条件变化:', event.target.id, event.target.value);
    this.updateUI(); // 立即更新标题中的括号内容
    }
 

    // 显示加载状态
    showLoading() {
        const userList = document.getElementById('userList');
        if (userList) {
            userList.innerHTML = `
                <div class="empty-state">
                    <div class="loading-spinner"></div>
                    <p>正在从Twitter获取真实用户数据...</p>
                    <p class="empty-hint">这可能需要30-45秒时间</p>
                    <p class="empty-hint">请勿关闭Twitter页面</p>
                </div>
            `;
        }
    }
    async saveFilterHistory() {
        try {
            await this.sendMessageToBackground('setStorage', {
                data: { filterHistory: this.filterHistory }
            });
        } catch (error) {
            console.error('保存筛选历史失败:', error);
        }
    }
// sidepanel.js - 修复标签页查找逻辑
async findTwitterTab() {
    try {
        // 通过background获取Twitter标签页
        const response = await this.sendMessageToBackground('getTwitterTab');
        
        if (response.tab) {
            console.log('找到Twitter标签页:', response.tab.url);
            return response.tab;
        }
        
        // 如果没找到，尝试直接查询
        const tabs = await chrome.tabs.query({
            url: ["*://twitter.com/*", "*://*.twitter.com/*", "*://x.com/*", "*://*.x.com/*"]
        });
        
        if (tabs.length > 0) {
            // 优先返回活跃标签页
            const activeTab = tabs.find(tab => tab.active) || tabs[0];
            console.log('直接查询找到Twitter标签页:', activeTab.url);
            return activeTab;
        }
        
        throw new Error('请先打开Twitter/X网站');
        
    } catch (error) {
        console.error('查找Twitter标签页失败:', error);
        throw error;
    }
}



// 【新增】专门用于设置筛选下拉菜单结构的方法
    setupFilterOptionsForTab(tab) {
        const label = document.querySelector('label[for="followsMeFilter"]');
        const select = document.getElementById('followsMeFilter');

        if (!label || !select) return;

        if (tab === 'followers') {
            // 粉丝列表页：我关心的是“我有没有回关他”
            label.textContent = '我是否回关:';
            select.setAttribute('data-filter', 'isFollowing');
            select.innerHTML = `
                <option value="any">任意</option>
                <option value="no">未回关</option>
                <option value="yes">已回关</option>
            `;
        } else {
            // 关注列表页：我关心的是“他有没有回关我”
            label.textContent = '是否关注我:';
            select.setAttribute('data-filter', 'followsMe');
            select.innerHTML = `
                <option value="any">任何</option>
                <option value="yes">已关注我</option>
                <option value="no">未关注我</option>
            `;
        }
    }
    showNoTwitterError() {
        const userList = document.getElementById('userList');
        if (userList) {
            userList.innerHTML = `
                <div class="empty-state">
                    <p style="color: #f91880;">⚠️ 无法获取用户数据</p>
                    <p class="empty-hint">请确保：</p>
                    <p class="empty-hint">1. 已打开Twitter/X网站</p>
                    <p class="empty-hint">2. 正在浏览个人页面</p>
                    <p class="empty-hint">3. 页面已完全加载</p>
                    <button class="btn-small" id="retryButton" style="margin-top: 12px;">刷新重试</button>
                </div>
            `;
            
            // 动态绑定重试按钮事件
            setTimeout(() => {
                const retryBtn = document.getElementById('retryButton');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => this.refreshData());
                }
            }, 100);
        }
    }

// 删除或简化复杂的错误处理链，使用更直接的方法
async sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
        // 设置较短的超时
        const timeout = setTimeout(() => {
            reject(new Error('通信超时'));
        }, 8000);
        
        chrome.tabs.sendMessage(tabId, message, (response) => {
            clearTimeout(timeout);
            
            if (chrome.runtime.lastError) {
                // 直接失败，不尝试重试
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

  
// 修改 injectContentScriptAndRetry 方法
async injectContentScriptAndRetry(tabId, message) {
    try {
        this.addLog('正在注入脚本到Twitter页面...', 'info');
        
        // 通过background script注入content script
        try {
            await this.sendMessageToBackground('injectContentScript', {
                tabId: tabId
            });
        } catch (bgError) {
            console.log('通过background注入失败，尝试直接注入:', bgError);
            
            // 尝试直接注入
            await this.injectContentScriptDirectly(tabId);
        }
        
        // 等待注入完成
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 测试脚本是否注入成功
        const pingResult = await this.sendMessageToTabWithTimeout(tabId, {
            action: 'ping',
            timestamp: Date.now()
        }, 3000);
        
        if (!pingResult || !pingResult.ready) {
            throw new Error('脚本注入后未响应');
        }
        
        this.addLog('脚本注入成功', 'success');
        return true;
        
    } catch (error) {
        console.error('脚本注入失败:', error);
        throw new Error('脚本注入失败: ' + error.message);
    }
}

// 添加直接注入脚本的方法
async injectContentScriptDirectly(tabId) {
    return new Promise((resolve, reject) => {
        try {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }, (results) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (results && results.length > 0) {
                    console.log('直接注入成功:', results);
                    resolve(true);
                } else {
                    reject(new Error('注入结果为空'));
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

// 添加带超时的发送消息方法
async sendMessageToTabWithTimeout(tabId, message, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('发送消息超时'));
        }, timeout);
        
        chrome.tabs.sendMessage(tabId, message, (response) => {
            clearTimeout(timeoutId);
            
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

 // 发送消息到background script
    async sendMessageToBackground(action, data = {}) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action, ...data }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }


    async refreshData() {
        this.addLog('正在刷新数据...', 'info');
        await this.applyFilters();
    }

    renderUserList() {
        const userList = document.getElementById('userList');
        const template = document.getElementById('userCardTemplate');
        
        // 清空列表
        userList.innerHTML = '';
        
        if (this.currentUsers.length === 0) {
            userList.innerHTML = `
                <div class="empty-state">
                    <p>😔 没有找到符合条件的用户</p>
                    <p class="empty-hint">尝试调整筛选条件或打开其他用户的个人页面</p>
                </div>
            `;
            return;
        }
        
        // 计算分页
        const startIndex = (this.currentPage - 1) * this.usersPerPage;
        const endIndex = Math.min(startIndex + this.usersPerPage, this.currentUsers.length);
        const pageUsers = this.currentUsers.slice(startIndex, endIndex);
        
        // 渲染用户卡片
        pageUsers.forEach((user) => {
            const card = template.content.cloneNode(true);
            
            // 填充用户信息
            card.querySelector('.display-name').textContent = user.name || '未知用户';
            card.querySelector('.user-handle').textContent = `@${user.handle || 'unknown'}`;
            
            // 蓝V标识
            const verifiedBadge = card.querySelector('.verified-badge');
            if (user.verified) {
                verifiedBadge.style.display = 'inline';
            } else {
                verifiedBadge.style.display = 'none';
            }
            
            // 头像处理：若有头像链接则显示图片，否则显示首字母
            const avatarEl = card.querySelector('.user-avatar');
            if (user.avatar) {
                avatarEl.style.backgroundImage = `url(${user.avatar})`;
                avatarEl.textContent = '';
                avatarEl.style.backgroundSize = 'cover';
                avatarEl.style.backgroundPosition = 'center';
            } else {
                const nameSource = user.name || user.handle || '';
                const initials = nameSource.split(' ').map(s => s[0]).join('').substring(0,2).toUpperCase();
                avatarEl.style.backgroundImage = '';
                avatarEl.textContent = initials;
                avatarEl.style.display = 'flex';
                avatarEl.style.alignItems = 'center';
                avatarEl.style.justifyContent = 'center';
                avatarEl.style.color = '#fff';
            }
            
// sidepanel.js 内部 renderUserList 片段
const followsYouText = card.querySelector('.follows-you');
if (this.currentTab === 'followers') {
    // 【粉丝列表】：对方已经关注我了，我关心的重点是“我有没有回关他”
    if (user.isFollowing) {
        followsYouText.textContent = '已回关';
        followsYouText.style.color = '#00ba7c';
    } else {
        followsYouText.textContent = '未回关';
        followsYouText.style.color = '#f91880';
    }
} else {
    // 【关注列表】：我已经关注对方了，我关心的重点是“他有没有回关我”
    if (user.followsYou) {
        followsYouText.textContent = '互相关注';
        followsYouText.style.color = '#00ba7c';
    } else {
        followsYouText.textContent = '未关注你';
        followsYouText.style.color = '#536471';
    }
}
        
            
            // 复选框状态
            const checkbox = card.querySelector('.user-checkbox');
            checkbox.checked = this.selectedUsers.has(user.id);
            checkbox.dataset.userId = user.id;
            checkbox.addEventListener('change', (e) => {
                this.toggleUserSelection(e.target.dataset.userId, e.target.checked);
            });
            
       // 操作按钮 - 修复点击事件
const unfollowBtn = card.querySelector('.unfollow-btn');
const followBtn = card.querySelector('.follow-btn');

// 为按钮添加数据属性
if (this.currentTab === 'following') {
    // 关注列表页面：你关注了他们
    unfollowBtn.dataset.userId = user.id;
    unfollowBtn.dataset.handle = user.handle;
    unfollowBtn.textContent = '取消关注';
    unfollowBtn.style.display = 'inline-block';
    unfollowBtn.title = '取消关注此用户';
    
    // 修复：阻止默认行为，使用绑定正确的函数
    unfollowBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const userId = e.target.dataset.userId;
        const handle = e.target.dataset.handle;
        const user = this.currentUsers.find(u => u.id === userId);
        if (user) {
            this.unfollowSingle(user);
        }
    });
    
    followBtn.style.display = 'none';
    
} else if (this.currentTab === 'followers') {
    // 粉丝列表页面：他们关注了你
    if (user.isFollowing) {
        // 你已经回关了：显示取消关注按钮
        unfollowBtn.dataset.userId = user.id;
        unfollowBtn.dataset.handle = user.handle;
        unfollowBtn.textContent = '取消关注';
        unfollowBtn.style.display = 'inline-block';
        unfollowBtn.title = '取消关注对方（对方仍关注你）';
        
        unfollowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const userId = e.target.dataset.userId;
            const handle = e.target.dataset.handle;
            const user = this.currentUsers.find(u => u.id === userId);
            if (user) this.unfollowSingle(user);
        });
        
        followBtn.style.display = 'none';
    } else {
        // 你还没有回关：显示回关按钮
        followBtn.dataset.userId = user.id;
        followBtn.dataset.handle = user.handle;
        followBtn.textContent = '回关';
        followBtn.style.display = 'inline-block';
        followBtn.title = '关注对方（互相关注）';
        
        followBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const userId = e.target.dataset.userId;
            const handle = e.target.dataset.handle;
            const user = this.currentUsers.find(u => u.id === userId);
            if (user) this.followSingle(user);
        });
        
        unfollowBtn.style.display = 'none';
    }
}
            
            userList.appendChild(card);
        });
        
        // 更新分页
        this.updatePagination();
    }

    updateResultsCount() {
const totalScanned = this.currentUsers.length; // 当前列表中的总数
    const selected = this.selectedUsers.size;
    
    // 获取结果显示元素
    const countEl = document.getElementById('resultCount');
    if (countEl) {
        // 显示格式：找到 150 个用户 (满足条件: 45)
        // 注意：这里的逻辑假设 currentUsers 已经是过滤后的结果
        // 如果你想显示页面总扫描数，需要在 fetchUsersWithScrolling 中记录 rawCount
        countEl.innerHTML = `列表总数: <strong>${totalScanned}</strong> <span style="font-size:11px; color:#536471; font-weight:normal;">(已选择: ${selected})</span>`;
    }

    // 更新批量按钮状态
    this.updateSelectionUI();
   }

    updateSelectionUI() {
        const selectedCount = this.selectedUsers.size;
        
        // 更新批量操作按钮状态
        const batchUnfollowBtn = document.getElementById('batchUnfollowBtn');
        const batchFollowBtn = document.getElementById('batchFollowBtn');
        
    if (selectedCount > 0) {
        if (this.currentTab === 'following') {
            batchUnfollowBtn.disabled = false;
            batchFollowBtn.disabled = true; // 关注列表不能批量回关
            batchUnfollowBtn.title = `批量取消关注 ${selectedCount} 个用户`;
        } else {
            // 粉丝列表：检查选择的用户中是否有未回关的
            const selectedUsers = Array.from(this.selectedUsers);
            const hasNotFollowing = selectedUsers.some(userId => {
                const user = this.currentUsers.find(u => u.id === userId);
                return user && !user.isFollowing;
            });
            
            batchUnfollowBtn.disabled = false;
            batchFollowBtn.disabled = !hasNotFollowing; // 只有选择了未回关的用户才能批量回关
            
            if (hasNotFollowing) {
                batchFollowBtn.title = `批量回关 ${selectedCount} 个用户`;
            } else {
                batchFollowBtn.title = '选择的用户已全部回关';
            }
            batchUnfollowBtn.title = `批量移除 ${selectedCount} 个粉丝`;
        }
    } else {
        batchUnfollowBtn.disabled = true;
        batchFollowBtn.disabled = true;
        batchUnfollowBtn.title = '请先选择用户';
        batchFollowBtn.title = '请先选择用户';
    }
    
    // 更新选择计数显示
    document.getElementById('selectedCount').textContent = `已选择: ${selectedCount}`;
    }

    updatePagination() {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(this.currentUsers.length / this.usersPerPage);
        
        if (totalPages > 1) {
            pagination.style.display = 'flex';
            document.getElementById('pageInfo').textContent = 
                `第 ${this.currentPage} 页，共 ${totalPages} 页`;
            
            document.getElementById('prevPage').disabled = this.currentPage === 1;
            document.getElementById('nextPage').disabled = this.currentPage === totalPages;
        } else {
            pagination.style.display = 'none';
        }
    }

    selectAll() {
        const pageUserIds = this.getCurrentPageUserIds();
        pageUserIds.forEach(id => this.selectedUsers.add(id));
        this.updateSelectionUI();
        this.renderUserList();
        this.addLog(`已选择当前页 ${pageUserIds.length} 个用户`, 'info');
    }

    invertSelection() {
        const pageUserIds = this.getCurrentPageUserIds();
        pageUserIds.forEach(id => {
            if (this.selectedUsers.has(id)) {
                this.selectedUsers.delete(id);
            } else {
                this.selectedUsers.add(id);
            }
        });
        this.updateSelectionUI();
        this.renderUserList();
        this.addLog('已反转选择', 'info');
    }

    clearSelection() {
    this.selectedUsers.clear();
    this.updateSelectionUI();
    this.renderUserList(); // 重新渲染以确保复选框状态更新
    this.addLog('已清空选择', 'info');
    }
// 添加一个新的清空数据方法
clearAllData() {
    this.selectedUsers.clear();
    this.currentUsers = [];
    this.currentPage = 1;
    this.renderUserList();
    this.updateResultsCount();
    this.updateSelectionUI();
    this.addLog('已清空所有数据', 'info');
}

    toggleUserSelection(userId, checked) {
        if (checked) {
            this.selectedUsers.add(userId);
        } else {
            this.selectedUsers.delete(userId);
        }
        this.updateSelectionUI();
    }

    getCurrentPageUserIds() {
        const startIndex = (this.currentPage - 1) * this.usersPerPage;
        const endIndex = Math.min(startIndex + this.usersPerPage, this.currentUsers.length);
        return this.currentUsers.slice(startIndex, endIndex).map(user => user.id);
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderUserList();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.currentUsers.length / this.usersPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderUserList();
        }
    }

    async startBatchUnfollow() {
        if (this.selectedUsers.size === 0) return;
        
        this.addLog(`开始批量取消关注 ${this.selectedUsers.size} 个用户`, 'info');
        this.startBatchOperation('unfollow');
    }

    async startBatchFollow() {
        if (this.selectedUsers.size === 0) return;
        
        this.addLog(`开始批量回关 ${this.selectedUsers.size} 个用户`, 'info');
        this.startBatchOperation('follow');
    }

    startBatchOperation(type) {
// 过滤掉 andylawian
    const protectedHandle = 'andylawian';
    let targetIds = Array.from(this.selectedUsers).filter(id => {
        const user = this.currentUsers.find(u => u.id === id);
        if (type === 'unfollow' && user?.handle?.toLowerCase() === protectedHandle) {
            this.addLog(`跳过保护账号: @${protectedHandle}`, 'info');
            return false;
        }
        return true;
    });

    if (targetIds.length === 0) {
        this.addLog('没有可操作的用户（已过滤受保护账号）', 'warning');
        return;
    }

    this.batchOperation = {
        type: type,
        userIds: targetIds,
        maxIntervalMs: 10,
        currentIndex: 0,
        stats: { total: targetIds.length, completed: 0, success: 0, failed: 0 },
        isRunning: true,
        startTime: Date.now()
    };
        
// 显示停止按钮，隐藏执行按钮
    document.getElementById('batchStopBtn').style.display = 'inline-block';
    document.getElementById('batchUnfollowBtn').style.display = 'none';
    document.getElementById('batchFollowBtn').style.display = 'none';

    this.showStatusMonitor();
    this.processBatchOperation();


    }

    showStatusMonitor() {
        document.getElementById('statusMonitor').style.display = 'block';
        // 禁用批量操作按钮
        document.getElementById('batchUnfollowBtn').disabled = true;
        document.getElementById('batchFollowBtn').disabled = true;
    }

    hideStatusMonitor() {
     //   document.getElementById('statusMonitor').style.display = 'none';
        // 恢复批量操作按钮状态
     //   this.updateSelectionUI();
    }

// 修改 processBatchOperation 方法中的实际调用
async processBatchOperation() {
if (!this.batchOperation || !this.batchOperation.isRunning) return;
    
    const op = this.batchOperation;
    const { userIds, currentIndex, type } = op;
    
    if (currentIndex >= userIds.length) {
        this.operationComplete();
        return;
    }
    
    const userId = userIds[currentIndex];
    const user = this.currentUsers.find(u => u.id === userId);
    
    try {
        this.addLog(`${type === 'unfollow' ? '取消关注' : '关注'} @${user?.handle || '未知用户'}`, 'info');
        
        // 找到Twitter标签页
        const twitterTab = await this.findTwitterTab();
        if (!twitterTab) {
            throw new Error('找不到Twitter页面');
        }
        
        // 发送实际操作消息到content script
        const result = await this.sendMessageToTab(twitterTab.id, {
            action: type === 'unfollow' ? 'unfollowUser' : 'followUser',
            userId: userId,
            handle: user?.handle,
            timestamp: Date.now()
        });
        
        if (result && result.success) {
            op.stats.success++;
            this.addLog(`✅ 成功 ${type === 'unfollow' ? '取消关注' : '关注'} @${user?.handle || '未知用户'}`, 'success');
            
            // 从列表中移除已取消关注的用户
            if (type === 'unfollow') {
                this.currentUsers = this.currentUsers.filter(u => u.id !== userId);
                this.selectedUsers.delete(userId);
            } else {
                // 标记为已关注
                const userIndex = this.currentUsers.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    this.currentUsers[userIndex].isFollowing = true;
                }
            }
        } else {
            throw new Error((result && result.error) || '操作失败');
        }
        
    } catch (error) {
        op.stats.failed++;
        
        this.addLog(`❌ 失败 ${type === 'unfollow' ? '取消关注' : '关注'} @${user?.handle || '未知用户'}: ${error.message}`, 'error');
    }
    
    op.stats.completed++;
    op.currentIndex++;
    
    // 更新进度
    this.updateProgress();
    
    // 继续下一个操作
    if (this.batchOperation.isRunning) {
        // 获取用户设置的最大秒数
        const maxSeconds = parseInt(document.getElementById('operationInterval').value) || 2;
        // 生成 0.5秒 到 maxSeconds 之间的随机值
        const randomMs = Math.floor(Math.random() * (maxSeconds * 1000 - 500 + 1)) + 500;
        
        this.addLog(`等待 ${ (randomMs/1000).toFixed(1) } 秒后执行下一步...`, 'info');
        setTimeout(() => this.processBatchOperation(), randomMs);
    }
}
    updateProgress() {
        if (!this.batchOperation) return;
        
        const op = this.batchOperation;
        const progress = (op.stats.completed / op.stats.total) * 100;
        
        // 更新进度条
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${Math.round(progress)}%`;
        
        // 更新统计
        document.getElementById('completedCount').textContent = op.stats.completed;
        document.getElementById('totalCount').textContent = op.stats.total;
        document.getElementById('successCount').textContent = op.stats.success;
        document.getElementById('failedCount').textContent = op.stats.failed;
        
        // 计算剩余时间
        const remaining = op.stats.total - op.stats.completed;
        const elapsed = (Date.now() - op.startTime) / 1000;
        const avgTimePerOp = op.stats.completed > 0 ? elapsed / op.stats.completed : 0;
        const remainingSeconds = remaining * avgTimePerOp;
        
        if (remainingSeconds > 60) {
            document.getElementById('timeRemaining').textContent = 
                `${Math.ceil(remainingSeconds / 60)} 分钟`;
        } else {
            document.getElementById('timeRemaining').textContent = 
                `${Math.ceil(remainingSeconds)} 秒`;
        }
    }

    togglePause() {
        if (!this.batchOperation) return;
        
        this.batchOperation.isRunning = !this.batchOperation.isRunning;
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (this.batchOperation.isRunning) {
            pauseBtn.textContent = '⏸️ 暂停';
            this.processBatchOperation();
        } else {
            pauseBtn.textContent = '▶️ 继续';
        }
    }

    stopOperation() {
        if (this.batchOperation) {
            this.batchOperation.isRunning = false;
            this.addLog('操作已停止', 'warning');
            this.resetOperationButtons();
            setTimeout(() => this.hideStatusMonitor(), 1500);
        }
    }

    resetOperationButtons() {
// 恢复暂停按钮文字
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) pauseBtn.textContent = '⏸️ 暂停';

    // 切换回普通的批量操作按钮
    document.getElementById('batchStopBtn').style.display = 'none';
    this.updateUI(); // 调用已有的 updateUI 恢复关注/回关按钮的显示
     }

    operationComplete() {
        const success = this.batchOperation.stats.success;
        const failed = this.batchOperation.stats.failed;
        this.addLog(`🎉 批量操作完成！成功: ${success}, 失败: ${failed}`, 'success');
        
        this.batchOperation.isRunning = false;
        this.resetOperationButtons();
        
        // 延迟隐藏状态监控
        setTimeout(() => {
            this.hideStatusMonitor();
        }, 3000);
        
        // 更新列表
        this.renderUserList();
        this.updateResultsCount();
        this.updateSelectionUI();
    }



// 添加带重试的 followSingle 方法
async followSingleWithRetry(user, maxRetries = 3) {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            const result = await this.followSingle(user);
            if (result !== false) {
                return true;
            }
            
            retryCount++;
            this.addLog(`第 ${retryCount} 次重试关注 @${user.handle}`, 'warning');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            retryCount++;
            if (retryCount >= maxRetries) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    return false;
}

// sidepanel.js - 修改 followSingle 和 unfollowSingle，移除 injectPreventionScript 相关调用

// 删除 injectPreventionScript 函数 (不需要了)

// 修改 followSingle
async followSingle(user) {
    try {
        this.addLog(`正在关注 @${user.handle}`, 'info');
        
        const twitterTab = await this.findTwitterTab();
        if (!twitterTab) {
            throw new Error('找不到Twitter页面');
        }
        
        // 移除 injectPreventionScript 调用
        
        // 直接发送操作指令
        const result = await this.sendMessageToTab(twitterTab.id, {
            action: 'followUser',
            userId: user.id,
            handle: user.handle, // 确保传递 handle
            timestamp: Date.now()
        });
        
        if (result && result.success) {
            this.addLog(`✅ 已关注 @${user.handle}`, 'success');
            
            // 更新 UI 状态
            const userIndex = this.currentUsers.findIndex(u => u.id === user.id);
            if (userIndex !== -1) {
                if (this.currentTab === 'followers') {
                    this.currentUsers[userIndex].isFollowing = true;
                }
                this.renderUserList();
                this.updateSelectionUI();
            }
            return true;
        } else {
            const errorMsg = result?.error || '操作失败';
            throw new Error(errorMsg);
        }
        
    } catch (error) {
        this.addLog(`❌ 关注失败 @${user.handle}: ${error.message}`, 'error');
        return false;
    }
}

// 修改 unfollowSingle
async unfollowSingle(user) {
    try {
        this.addLog(`正在取消关注 @${user.handle}`, 'info');
        
        const twitterTab = await this.findTwitterTab();
        if (!twitterTab) {
            throw new Error('找不到Twitter页面');
        }
        
        // 移除 injectPreventionScript 调用
        
        // 直接发送操作指令
        const result = await this.sendMessageToTab(twitterTab.id, {
            action: 'unfollowUser',
            userId: user.id,
            handle: user.handle,
            timestamp: Date.now()
        });
        
        if (result && result.success) {
            this.addLog(`✅ 已取消关注 @${user.handle}`, 'success');
            
            const userIndex = this.currentUsers.findIndex(u => u.id === user.id);
            if (userIndex !== -1) {
                if (this.currentTab === 'followers') {
                    this.currentUsers[userIndex].isFollowing = false;
                    this.renderUserList();
                } else if (this.currentTab === 'following') {
                    this.currentUsers.splice(userIndex, 1); // 关注列表中取关直接移除
                }
                
                this.selectedUsers.delete(user.id);
                this.updateResultsCount();
                this.renderUserList();
                this.updateSelectionUI();
            }
        } else {
            throw new Error((result && result.error) || '操作失败');
        }
        
    } catch (error) {
        this.addLog(`❌ 取消关注失败: ${error.message}`, 'error');
    }
}

// processBatchOperation 也同样移除 injectPreventionScript 的调用，这里不再赘述代码，逻辑同上。

// sidepanel.js - 修改 processBatchOperation 方法，也添加跳转阻止
async processBatchOperation() {
    if (!this.batchOperation || !this.batchOperation.isRunning) {
        return;
    }
    
    const op = this.batchOperation;
    const { userIds, currentIndex, type } = op;
    
    if (currentIndex >= userIds.length) {
        this.operationComplete();
        return;
    }
    
    const userId = userIds[currentIndex];
    const user = this.currentUsers.find(u => u.id === userId);
    
    try {
        this.addLog(`${type === 'unfollow' ? '取消关注' : '关注'} @${user?.handle || '未知用户'}`, 'info');
        
        const twitterTab = await this.findTwitterTab();
        if (!twitterTab) {
            throw new Error('找不到Twitter页面');
        }
        
        // 注入跳转阻止脚本
     //   await this.injectPreventionScript(twitterTab.id);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 发送实际操作消息
        const result = await this.sendMessageToTab(twitterTab.id, {
            action: type === 'unfollow' ? 'unfollowUser' : 'followUser',
            userId: userId,
            handle: user?.handle,
            timestamp: Date.now()
        });
        
        if (result && result.success) {
            op.stats.success++;
            this.addLog(`✅ 成功 ${type === 'unfollow' ? '取消关注' : '关注'} @${user?.handle || '未知用户'}`, 'success');
            
            if (type === 'unfollow') {
                this.currentUsers = this.currentUsers.filter(u => u.id !== userId);
                this.selectedUsers.delete(userId);
            } else {
                const userIndex = this.currentUsers.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    this.currentUsers[userIndex].isFollowing = true;
                }
            }
        } else {
            throw new Error((result && result.error) || '操作失败');
        }
        
    } catch (error) {
        op.stats.failed++;
        this.addLog(`❌ 失败 ${type === 'unfollow' ? '取消关注' : '关注'} @${user?.handle || '未知用户'}: ${error.message}`, 'error');
    }
    
    op.stats.completed++;
    op.currentIndex++;
    this.updateProgress();
    
    if (op.isRunning) {
        const minSeconds = parseInt(document.getElementById('operationInterval').value) || 10;
    const randomDelay = (minSeconds * 1000) + Math.floor(Math.random() * 2000); // 最小秒数 + 0-2秒随机浮动
    setTimeout(() => this.processBatchOperation(), randomDelay);
    }
}

    addLog(message, type = 'info') {
        const logContainer = document.getElementById('operationLog');
        const logItem = document.createElement('div');
        logItem.className = type;
        logItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        logContainer.appendChild(logItem);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    clearLog() {
        document.getElementById('operationLog').innerHTML = '';
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return '未知';
            }
            
            const diff = Date.now() - date.getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (days === 0) return '今天';
            if (days === 1) return '昨天';
            if (days < 7) return `${days}天前`;
            if (days < 30) return `${Math.floor(days / 7)}周前`;
            if (days < 365) return `${Math.floor(days / 30)}个月前`;
            return `${Math.floor(days / 365)}年前`;
        } catch (error) {
            return '未知';
        }
    }
// 【修改】UI 更新函数，不再重置 Select 选项
    updateUI() {
        const batchUnfollowBtn = document.getElementById('batchUnfollowBtn');
        const batchFollowBtn = document.getElementById('batchFollowBtn');

        // 按钮显示逻辑
        if (this.currentTab === 'following') {
            if (batchFollowBtn) batchFollowBtn.style.display = 'none';
            if (batchUnfollowBtn) batchUnfollowBtn.style.display = '';
        } else {
            if (batchUnfollowBtn) batchUnfollowBtn.style.display = 'none';
            if (batchFollowBtn) batchFollowBtn.style.display = '';
        }

        // 刷新语言文本
        this.setLanguage(this.lang || 'zh');

        // 更新筛选头部显示的文字摘要
        const fh = document.querySelector('.filter-header h3');
        if (fh) {
            const filters = this.getCurrentFilters();
            const statusTexts = [];

            // 蓝V状态
            const vMap = { any: '任意', verified: '仅蓝V', unverified: '非蓝V' };
            statusTexts.push(`蓝V: ${vMap[filters.verified] || '任意'}`);

            // 关系状态
            if (this.currentTab === 'followers') {
                const fMap = { any: '任意', no: '未回关', yes: '已回关' };
                statusTexts.push(`回关: ${fMap[filters.isFollowing] || '任意'}`);
            } else {
                const mMap = { any: '任何', yes: '已关注我', no: '未关注我' };
                statusTexts.push(`关注我: ${mMap[filters.followsMe] || '任何'}`);
            }

            statusTexts.push(`数量: ${filters.limit}`);

            // 保留折叠按钮
            const toggle = document.getElementById('filterToggle');
            fh.innerHTML = '';
            if (toggle) fh.appendChild(toggle);

            // 添加文本
            fh.appendChild(document.createTextNode(` 🎯 筛选条件 (${statusTexts.join(' | ')})`));
        }
    }
    
}

// sidepanel.js 修改 sendMessageToTab 方法
async function ensureContentScript(tabId) {
    try {
        // 尝试发送 ping
        await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
                if (chrome.runtime.lastError || !response) reject();
                else resolve();
            });
        });
    } catch (e) {
        // 如果 ping 失败，通知 background 注入
        console.log('检测到脚本未就绪，正在尝试注入...');
        await chrome.runtime.sendMessage({ action: 'injectContentScript', tabId: tabId });
        // 给脚本一点启动时间
        await new Promise(r => setTimeout(r, 500));
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.twitterManager = new TwitterManager();
    } catch (error) {
        console.error('初始化失败:', error);
        const userList = document.getElementById('userList');
        if (userList) {
            userList.innerHTML = `
                <div class="empty-state">
                    <p style="color: #f91880;">⚠️ 插件初始化失败</p>
                    <p class="empty-hint">${error.message}</p>
                </div>
            `;
        }
    }
});