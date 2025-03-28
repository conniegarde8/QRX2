import { extension_settings } from "../../../extensions.js";

// 插件名称常量
const EXTENSION_NAME = "quick-reply-menu";

// 存储快捷回复数据
let chatQuickReplies = [];
let globalQuickReplies = [];
let menuVisible = false;
let dataNeedsUpdate = true; // 数据更新标志，初始为 true

/**
 * 初始化快速回复菜单及相关按钮
 */
function initQuickReplyControls() {
    // 创建关闭按钮 (原快速回复按钮修改而来)
    const quickReplyCloseButton = document.createElement('div');
    quickReplyCloseButton.id = 'quick-reply-close-button'; // 新 ID
    quickReplyCloseButton.innerText = '[关闭]'; // 新文本
    quickReplyCloseButton.style.display = 'none'; // 初始隐藏
    document.body.appendChild(quickReplyCloseButton);

    // 创建快速回复菜单
    const quickReplyMenu = document.createElement('div');
    quickReplyMenu.id = 'quick-reply-menu';
    quickReplyMenu.innerHTML = `
        <div class="quick-reply-menu-container">
            <div class="quick-reply-list" id="chat-quick-replies">
                <div class="quick-reply-list-title">聊天快捷回复</div>
                <div id="chat-qr-items"></div>
            </div>
            <div class="quick-reply-list" id="global-quick-replies">
                <div class="quick-reply-list-title">全局快捷回复</div>
                <div id="global-qr-items"></div>
            </div>
        </div>
    `;
    document.body.appendChild(quickReplyMenu);

    // 绑定关闭按钮点击事件
    quickReplyCloseButton.addEventListener('click', hideQuickReplyMenu);

    // 点击菜单外部区域关闭菜单
    document.addEventListener('click', function(event) {
        const menu = document.getElementById('quick-reply-menu');
        const closeButton = document.getElementById('quick-reply-close-button');
        // 获取火箭按钮 - 需要在 jQuery(async) 中创建后才能获取，或者确保它已创建
        const rocketButton = document.getElementById('quick-reply-rocket-button');

        if (menuVisible &&
            event.target !== menu &&
            !menu.contains(event.target) &&
            event.target !== closeButton && // 不要因为点击关闭按钮而触发
            (!rocketButton || event.target !== rocketButton) // 不要因为点击火箭按钮而触发
           ) {
            hideQuickReplyMenu();
        }
    });
}

/**
 * 显示快速回复菜单
 */
function showQuickReplyMenu() {
    if (menuVisible) return; // 如果已经可见，则不执行任何操作

    const menu = document.getElementById('quick-reply-menu');
    const closeButton = document.getElementById('quick-reply-close-button');

    // 优化：仅在需要时更新数据
    if (dataNeedsUpdate) {
        console.log('Fetching quick replies...');
        updateQuickReplies(); // 获取并存储数据
        dataNeedsUpdate = false; // 标记数据已加载
    } else {
        console.log('Using cached quick replies...');
    }

    // 始终根据当前数据渲染菜单
    renderQuickReplies();

    menu.style.display = 'block';
    closeButton.style.display = 'block'; // 显示关闭按钮
    menuVisible = true;
}


/**
 * 隐藏快速回复菜单
 */
function hideQuickReplyMenu() {
    const menu = document.getElementById('quick-reply-menu');
    const closeButton = document.getElementById('quick-reply-close-button');
    menu.style.display = 'none';
    closeButton.style.display = 'none'; // 隐藏关闭按钮
    menuVisible = false;
}

/**
 * 获取并更新当前可用的快捷回复（不直接渲染）
 */
function updateQuickReplies() {
    if (!window.quickReplyApi) {
        console.error('Quick Reply API not found!');
        chatQuickReplies = [];
        globalQuickReplies = [];
        return;
    }

    const qrApi = window.quickReplyApi;
    chatQuickReplies = [];
    globalQuickReplies = [];
    const chatQrLabels = new Set();

    try {
        if (qrApi.settings?.chatConfig?.setList) {
            qrApi.settings.chatConfig.setList.forEach(setLink => {
                if (setLink.isVisible && setLink.set?.qrList) {
                    setLink.set.qrList.forEach(qr => {
                        if (!qr.isHidden) {
                            chatQuickReplies.push({
                                setName: setLink.set.name,
                                label: qr.label,
                                message: qr.message || '(无消息内容)'
                            });
                            chatQrLabels.add(qr.label);
                        }
                    });
                }
            });
        }
        if (qrApi.settings?.config?.setList) {
            qrApi.settings.config.setList.forEach(setLink => {
                if (setLink.isVisible && setLink.set?.qrList) {
                    setLink.set.qrList.forEach(qr => {
                        if (!qr.isHidden && !chatQrLabels.has(qr.label)) {
                            globalQuickReplies.push({
                                setName: setLink.set.name,
                                label: qr.label,
                                message: qr.message || '(无消息内容)'
                            });
                        }
                    });
                }
            });
        }
        console.log('Updated Quick Replies - Chat:', chatQuickReplies.length, 'Global:', globalQuickReplies.length);
    } catch (error) {
        console.error('Error fetching quick replies:', error);
        chatQuickReplies = [];
        globalQuickReplies = [];
    }
}

/**
 * 渲染快捷回复到菜单 (使用 DocumentFragment 优化)
 */
function renderQuickReplies() {
    const chatContainer = document.getElementById('chat-qr-items');
    const globalContainer = document.getElementById('global-qr-items');

    chatContainer.innerHTML = '';
    globalContainer.innerHTML = '';

    const chatFragment = document.createDocumentFragment();
    const globalFragment = document.createDocumentFragment();

    if (chatQuickReplies.length > 0) {
        chatQuickReplies.forEach(qr => {
            const item = createQuickReplyItem(qr);
            chatFragment.appendChild(item);
        });
        chatContainer.appendChild(chatFragment);
    } else {
        chatContainer.innerHTML = '<div class="quick-reply-empty">没有可用的聊天快捷回复</div>';
    }

    if (globalQuickReplies.length > 0) {
        globalQuickReplies.forEach(qr => {
            const item = createQuickReplyItem(qr);
            globalFragment.appendChild(item);
        });
        globalContainer.appendChild(globalFragment);
    } else {
        globalContainer.innerHTML = '<div class="quick-reply-empty">没有可用的全局快捷回复</div>';
    }
}

/**
 * 辅助函数：创建单个快捷回复项的 DOM 元素
 */
function createQuickReplyItem(qr) {
    const item = document.createElement('div');
    item.className = 'quick-reply-item';
    item.innerText = qr.label;
    item.title = qr.message.substring(0, 50) + (qr.message.length > 50 ? '...' : '');
    item.addEventListener('click', () => {
        triggerQuickReply(qr.setName, qr.label);
        // 点击项后也关闭菜单
        hideQuickReplyMenu();
    });
    return item;
}


/**
 * 触发指定的快捷回复
 */
function triggerQuickReply(setName, label) {
    if (!window.quickReplyApi) {
        console.error('Quick Reply API not found!');
        // hideQuickReplyMenu(); // 移动到 createQuickReplyItem 的事件监听器中
        return;
    }

    try {
        window.quickReplyApi.executeQuickReply(setName, label)
            .then(result => {
                console.log(`Quick Reply "${setName}.${label}" 执行成功:`, result);
                // hideQuickReplyMenu(); // 移动到 createQuickReplyItem 的事件监听器中
            })
            .catch(error => {
                console.error(`触发 Quick Reply "${setName}.${label}" 失败:`, error);
                // hideQuickReplyMenu(); // 移动到 createQuickReplyItem 的事件监听器中
            });
    } catch (error) {
        console.error('Error triggering quick reply:', error);
        // hideQuickReplyMenu(); // 移动到 createQuickReplyItem 的事件监听器中
    }
    // 注意：无论成功失败，点击项后都应关闭菜单，这个逻辑放在 createQuickReplyItem 中更合适
}

/**
 * 插件加载入口
 */
jQuery(async () => {
    // 初始化插件设置
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};

    // 添加设置项到扩展设置页面
    const settingsHtml = `
    <div id="${EXTENSION_NAME}-settings" class="extension-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>快速回复增强菜单</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
            </div>
            <div class="inline-drawer-content">
                <p>此插件在发送按钮旁添加了一个🚀图标按钮，用于打开快速回复菜单。</p>
                <p>原有的顶部按钮已改为[关闭]按钮，仅在菜单打开时显示。</p>
                <p><b>注意:</b> 菜单内容仅在首次打开时加载，如需更新请刷新页面或重新启用插件。</p>
                <div class="flex-container flexGap5">
                    <label>插件状态:</label>
                    <select id="${EXTENSION_NAME}-enabled" class="text_pole">
                        <option value="true" selected>启用</option>
                        <option value="false">禁用</option>
                    </select>
                </div>
                <hr class="sysHR">
            </div>
        </div>
    </div>`;

    $('#extensions_settings').append(settingsHtml);

    // 初始化UI组件 (菜单和关闭按钮)
    initQuickReplyControls();

    // --- 注入新的火箭按钮 ---
    try {
        const sendButton = $('#send_but');
        if (sendButton.length > 0) {
            const rocketButtonHtml = `
                <div id="quick-reply-rocket-button" class="fa-solid fa-rocket interactable secondary-button" title="打开快速回复菜单" style="cursor: pointer; margin-right: 8px;"></div>
            `;
            // 将火箭按钮添加到发送按钮之前
            sendButton.before(rocketButtonHtml);

            // 给火箭按钮绑定点击事件，用于打开菜单
            $('#quick-reply-rocket-button').on('click', showQuickReplyMenu);

            console.log(`插件 ${EXTENSION_NAME}: 火箭按钮成功注入！`);

        } else {
            console.warn(`插件 ${EXTENSION_NAME}: 未找到发送按钮 (#send_but)，无法注入火箭按钮。`);
        }
    } catch (error) {
        console.error(`插件 ${EXTENSION_NAME}: 注入火箭按钮时出错:`, error);
    }
    // --- 注入结束 ---


    // 监听设置变更
    $(`#${EXTENSION_NAME}-enabled`).on('change', function() {
        const isEnabled = $(this).val() === 'true';
        extension_settings[EXTENSION_NAME].enabled = isEnabled;
        const rocketButton = $('#quick-reply-rocket-button'); // 获取火箭按钮

        if (isEnabled) {
            rocketButton.show(); // 显示火箭按钮
            dataNeedsUpdate = true; // 启用时，重置数据更新标志，以便下次打开时重新加载
        } else {
            rocketButton.hide(); // 隐藏火箭按钮
            hideQuickReplyMenu(); // 禁用时确保菜单和关闭按钮都隐藏
        }
    });

    // 检查插件初始状态
    const rocketButton = $('#quick-reply-rocket-button'); // 获取火箭按钮
    if (extension_settings[EXTENSION_NAME].enabled !== false) {
        extension_settings[EXTENSION_NAME].enabled = true;
        $(`#${EXTENSION_NAME}-enabled`).val('true');
        rocketButton.show(); // 显示火箭按钮
    } else {
        $(`#${EXTENSION_NAME}-enabled`).val('false');
        rocketButton.hide(); // 隐藏火箭按钮
    }
});