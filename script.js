class ChatApp {
    constructor() {
        this.elements = {
            chatMessages: document.getElementById('chat-messages'),
            userInput: document.getElementById('user-input'),
            sendButton: document.getElementById('send-button'),
            maxLengthSlider: document.getElementById('max-length'),
            maxLengthValue: document.getElementById('max-length-value'),
            temperatureSlider: document.getElementById('temperature'),
            temperatureValue: document.getElementById('temperature-value'),
            apiUrlInput: document.getElementById('api-url'),
            updateApiButton: document.getElementById('update-api'),
            apiStatus: document.getElementById('api-status'),
            apiStatusText: document.getElementById('api-status-text'),
            connectionStatus: document.getElementById('connection-status'),
            statusText: document.getElementById('status-text')
        };
        
        this.state = {
            conversationId: null,
            isGenerating: false,
            apiUrl: 'http://localhost:8000/chat'
        };
        
        this.init();
    }
    
    init() {
        // 初始化UI
        this.elements.maxLengthValue.textContent = this.elements.maxLengthSlider.value;
        this.elements.temperatureValue.textContent = this.elements.temperatureSlider.value;
        
        // 事件监听
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        this.elements.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.state.isGenerating) {
                this.sendMessage();
            }
        });
        
        this.elements.maxLengthSlider.addEventListener('input', () => {
            this.elements.maxLengthValue.textContent = this.elements.maxLengthSlider.value;
        });
        
        this.elements.temperatureSlider.addEventListener('input', () => {
            this.elements.temperatureValue.textContent = this.elements.temperatureSlider.value;
        });
        
        this.elements.updateApiButton.addEventListener('click', () => {
            this.state.apiUrl = this.elements.apiUrlInput.value;
            this.checkApiStatus();
        });
        
        // 初始检查
        this.checkApiStatus();
        this.initTooltips();
    }
    
    async sendMessage() {
        const message = this.elements.userInput.value.trim();
        if (message === '' || this.state.isGenerating) return;
        
        // 添加用户消息
        this.addMessage('user', message);
        this.elements.userInput.value = '';
        
        // 显示加载状态
        this.showTypingIndicator();
        this.setState({ isGenerating: true });
        
        try {
            const payload = {
                message: message,
                ...(this.state.conversationId && { conversation_id: this.state.conversationId }),
                max_length: parseInt(this.elements.maxLengthSlider.value) || 150,
                temperature: parseFloat(this.elements.temperatureSlider.value) || 0.7
            };
            
            const response = await fetch(this.state.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            this.removeTypingIndicator();
            this.addMessage('assistant', data.response);
            this.setState({ conversationId: data.conversation_id });
            this.updateConnectionStatus(true);
            
        } catch (error) {
            console.error('请求出错:', error);
            this.removeTypingIndicator();
            this.addMessage('assistant', `错误: ${error.message}`);
            this.updateConnectionStatus(false);
        } finally {
            this.setState({ isGenerating: false });
            this.elements.userInput.focus();
        }
    }
    
    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
        
        messageDiv.innerHTML = `
            <div>${content}</div>
            <div class="timestamp">${role === 'user' ? '你' : 'AI助手'}</div>
        `;
        
        this.elements.chatMessages.appendChild(messageDiv);
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }
    
    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        this.elements.chatMessages.appendChild(typingDiv);
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }
    
    removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }
    
    async checkApiStatus() {
        this.elements.apiStatusText.textContent = 'API狀態: 檢查中...';
        
        try {
            const healthUrl = this.state.apiUrl.replace('/chat', '/health');
            const response = await fetch(healthUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) throw new Error('API不可用');
            
            const data = await response.json();
            this.elements.apiStatus.className = 'status connected';
            this.elements.apiStatusText.textContent = 'API狀態: 已連接';
            this.updateConnectionStatus(true);
            
        } catch (error) {
            console.error('API檢查失敗:', error);
            this.elements.apiStatus.className = 'status';
            this.elements.apiStatusText.textContent = 'API狀態: 連接失敗';
            this.updateConnectionStatus(false);
        }
    }
    
    updateConnectionStatus(connected) {
        this.elements.connectionStatus.className = connected ? 'status-dot' : 'status-dot disconnected';
        this.elements.statusText.textContent = connected ? '已連接' : '連接失敗';
    }
    
    initTooltips() {
        document.querySelectorAll('.tooltip').forEach(tooltip => {
            tooltip.addEventListener('click', (e) => e.stopPropagation());
        });
        
        document.addEventListener('click', () => {
            document.querySelectorAll('.tooltiptext').forEach(tip => {
                tip.style.visibility = 'hidden';
                tip.style.opacity = '0';
            });
        });
    }
    
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.elements.sendButton.disabled = this.state.isGenerating;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});