/* Firebase 配置和用户认证模块 */

// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyC-WrKB7LPDujKVmjGIB5L5UnuLXXigjWg",
    authDomain: "autumn-b02f6.firebaseapp.com",
    projectId: "autumn-b02f6",
    storageBucket: "autumn-b02f6.firebasestorage.app",
    messagingSenderId: "748943253120",
    appId: "1:748943253120:web:c4ae79489e7df12f11065",
    measurementId: "G-6WLCMHGK2Z"
};

// Firebase 应用实例
let firebaseApp = null;
let auth = null;
let db = null;
let currentUser = null;

// 初始化 Firebase
async function initFirebase() {
    try {
        // 动态导入 Firebase（使用 CDN）
        if (!window.firebase) {
            console.log('Loading Firebase SDK...');
            return false;
        }

        firebaseApp = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();

        // 监听用户状态变化
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                console.log('用户已登录:', user.email);
                onUserLogin(user);
            } else {
                currentUser = null;
                console.log('用户未登录');
                onUserLogout();
            }
        });

        console.log('Firebase 初始化成功');
        return true;
    } catch (error) {
        console.error('Firebase 初始化失败:', error);
        return false;
    }
}

// ============== 用户认证功能 ==============

// 用户注册（使用用户名，内部转换为邮箱格式）
async function registerUser(username, password, nickname) {
    try {
        // 用户名转换为虚拟邮箱格式
        const email = `${username.toLowerCase()}@autumnstudy.app`;

        // 创建用户
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 在 Firestore 中创建用户档案
        await db.collection('users').doc(user.uid).set({
            username: username,
            nickname: nickname || username,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            totalXP: 0,
            level: 1,
            completedChallenges: [],
            studyTime: 0,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });

        showPopup(`注册成功！欢迎 ${nickname || username}`, 'success');
        return { success: true, user };
    } catch (error) {
        console.error('注册失败:', error);
        let message = '注册失败';
        if (error.code === 'auth/email-already-in-use') {
            message = '该用户名已被注册';
        } else if (error.code === 'auth/weak-password') {
            message = '密码至少需要6个字符';
        } else if (error.code === 'auth/invalid-email') {
            message = '用户名格式不正确';
        }
        showPopup(message, 'error');
        return { success: false, error: message };
    }
}

// 用户登录
async function loginUser(username, password) {
    try {
        const email = `${username.toLowerCase()}@autumnstudy.app`;
        const userCredential = await auth.signInWithEmailAndPassword(email, password);

        // 更新最后登录时间
        await db.collection('users').doc(userCredential.user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });

        showPopup('登录成功！', 'success');
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('登录失败:', error);
        let message = '登录失败';
        if (error.code === 'auth/user-not-found') {
            message = '用户不存在';
        } else if (error.code === 'auth/wrong-password') {
            message = '密码错误';
        }
        showPopup(message, 'error');
        return { success: false, error: message };
    }
}

// 用户登出
async function logoutUser() {
    try {
        await auth.signOut();
        showPopup('已退出登录', 'success');
        return { success: true };
    } catch (error) {
        console.error('登出失败:', error);
        return { success: false, error: error.message };
    }
}

// ============== 用户数据同步 ==============

// 保存用户学习进度到云端
async function saveProgressToCloud() {
    if (!currentUser) return;

    try {
        await db.collection('users').doc(currentUser.uid).update({
            totalXP: gameState.totalXP,
            level: gameState.level,
            completedChallenges: Array.from(gameState.completedChallenges),
            flippedCards: Array.from(gameState.flippedCards),
            wrongAnswers: Array.from(gameState.wrongAnswers),
            unlockedAchievements: Array.from(gameState.unlockedAchievements),
            studyTime: gameState.studyTime,
            streak: gameState.streak,
            maxStreak: gameState.maxStreak,
            totalAttempts: gameState.totalAttempts,
            correctAttempts: gameState.correctAttempts,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('进度已同步到云端');
    } catch (error) {
        console.error('同步失败:', error);
    }
}

// 从云端加载用户学习进度
async function loadProgressFromCloud() {
    if (!currentUser) return;

    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            gameState.totalXP = data.totalXP || 0;
            gameState.level = data.level || 1;
            gameState.completedChallenges = new Set(data.completedChallenges || []);
            gameState.flippedCards = new Set(data.flippedCards || []);
            gameState.wrongAnswers = new Set(data.wrongAnswers || []);
            gameState.unlockedAchievements = new Set(data.unlockedAchievements || []);
            gameState.studyTime = data.studyTime || 0;
            gameState.streak = data.streak || 0;
            gameState.maxStreak = data.maxStreak || 0;
            gameState.totalAttempts = data.totalAttempts || 0;
            gameState.correctAttempts = data.correctAttempts || 0;

            console.log('进度已从云端加载');
            render();
        }
    } catch (error) {
        console.error('加载云端进度失败:', error);
    }
}

// 用户登录后的处理
function onUserLogin(user) {
    loadProgressFromCloud();
    updateUserUI();
}

// 用户登出后的处理
function onUserLogout() {
    // 重置为本地状态
    loadProgress();
    updateUserUI();
}

// 更新用户界面显示
function updateUserUI() {
    // 这个函数会在 render 时被调用，更新用户状态显示
    if (typeof render === 'function') {
        render();
    }
}

// ============== 获取用户信息 ==============

async function getUserProfile() {
    if (!currentUser) return null;

    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        return doc.exists ? doc.data() : null;
    } catch (error) {
        console.error('获取用户信息失败:', error);
        return null;
    }
}

// 检查是否已登录
function isLoggedIn() {
    return currentUser !== null;
}

// 获取当前用户
function getCurrentUser() {
    return currentUser;
}

// ============== 登录/注册 UI ==============

// 显示登录/注册弹窗
function showAuthModal(mode = 'login') {
    const modalHTML = `
        <div id="auth-modal" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center" onclick="if(event.target.id === 'auth-modal') closeAuthModal()">
            <div class="glass rounded-2xl p-8 w-full max-w-md mx-4 animate-bounce-in">
                <div class="text-center mb-6">
                    <div class="text-5xl mb-3">🍂</div>
                    <h2 class="text-2xl font-bold text-white">Autumn Study</h2>
                    <p class="text-gray-400 mt-1">${mode === 'login' ? '登录账号' : '注册新账号'}</p>
                </div>
                
                <div id="auth-form">
                    ${mode === 'register' ? `
                    <div class="mb-4">
                        <label class="block text-gray-300 text-sm mb-2">昵称</label>
                        <input type="text" id="auth-nickname" placeholder="您的昵称"
                            class="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition">
                    </div>
                    ` : ''}
                    
                    <div class="mb-4">
                        <label class="block text-gray-300 text-sm mb-2">用户名</label>
                        <input type="text" id="auth-username" placeholder="请输入用户名"
                            class="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition">
                    </div>
                    
                    <div class="mb-6">
                        <label class="block text-gray-300 text-sm mb-2">密码</label>
                        <input type="password" id="auth-password" placeholder="请输入密码 (至少6位)"
                            class="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition">
                    </div>
                    
                    <button onclick="${mode === 'login' ? 'handleLogin()' : 'handleRegister()'}" 
                        class="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold hover:from-purple-500 hover:to-blue-500 transition transform hover:scale-[1.02]">
                        ${mode === 'login' ? '🔐 登录' : '✨ 注册'}
                    </button>
                </div>
                
                <div class="mt-6 text-center">
                    <p class="text-gray-400 text-sm">
                        ${mode === 'login' ? '还没有账号？' : '已有账号？'}
                        <button onclick="showAuthModal('${mode === 'login' ? 'register' : 'login'}')" 
                            class="text-purple-400 hover:text-purple-300 underline">
                            ${mode === 'login' ? '立即注册' : '去登录'}
                        </button>
                    </p>
                </div>
                
                <button onclick="closeAuthModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">×</button>
            </div>
        </div>
    `;

    // 移除已存在的弹窗
    const existing = document.getElementById('auth-modal');
    if (existing) existing.remove();

    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 关闭登录弹窗
function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.remove();
}

// 处理登录
async function handleLogin() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!username || !password) {
        showPopup('请填写用户名和密码', 'error');
        return;
    }

    const result = await loginUser(username, password);
    if (result.success) {
        closeAuthModal();
    }
}

// 处理注册
async function handleRegister() {
    const nickname = document.getElementById('auth-nickname').value.trim();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!username || !password) {
        showPopup('请填写用户名和密码', 'error');
        return;
    }

    if (username.length < 3) {
        showPopup('用户名至少3个字符', 'error');
        return;
    }

    const result = await registerUser(username, password, nickname);
    if (result.success) {
        closeAuthModal();
    }
}

// 获取用户显示信息（用于界面显示）
async function getUserDisplayInfo() {
    if (!currentUser) {
        return null;
    }

    const profile = await getUserProfile();
    return {
        uid: currentUser.uid,
        nickname: profile?.nickname || '用户',
        username: profile?.username || '',
        totalXP: profile?.totalXP || 0,
        level: Math.floor((profile?.totalXP || 0) / 100) + 1
    };
}

// 渲染用户按钮（显示在页面上）
function renderUserButton() {
    if (currentUser) {
        return `
            <div class="relative group">
                <button class="flex items-center gap-2 px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-full transition border border-purple-500/30">
                    <span class="text-white">👤</span>
                    <span class="text-white text-sm" id="user-nickname">用户</span>
                    <span class="text-xs text-gray-400">▼</span>
                </button>
                <div class="absolute right-0 top-full mt-2 w-48 glass rounded-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div class="px-4 py-2 border-b border-white/10">
                        <p class="text-white font-medium" id="user-menu-name">加载中...</p>
                        <p class="text-gray-400 text-sm" id="user-menu-xp">XP: --</p>
                    </div>
                    <button onclick="showPopup('个人资料功能开发中', 'info')" class="w-full px-4 py-2 text-left text-gray-300 hover:bg-white/10 transition">
                        📊 学习统计
                    </button>
                    <button onclick="logoutUser()" class="w-full px-4 py-2 text-left text-red-400 hover:bg-white/10 transition">
                        🚪 退出登录
                    </button>
                </div>
            </div>
        `;
    } else {
        return `
            <button onclick="showAuthModal('login')" class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-full transition text-white text-sm font-medium">
                🔐 登录 / 注册
            </button>
        `;
    }
}

// 更新用户昵称显示
async function refreshUserDisplay() {
    const info = await getUserDisplayInfo();
    if (info) {
        const nicknameEl = document.getElementById('user-nickname');
        const menuNameEl = document.getElementById('user-menu-name');
        const menuXpEl = document.getElementById('user-menu-xp');

        if (nicknameEl) nicknameEl.textContent = info.nickname;
        if (menuNameEl) menuNameEl.textContent = info.nickname;
        if (menuXpEl) menuXpEl.textContent = `XP: ${info.totalXP} | Lv.${info.level}`;
    }
}

// 定期刷新用户显示
setInterval(() => {
    if (currentUser) {
        refreshUserDisplay();
    }
}, 5000);

