document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('textInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const charCount = document.querySelector('.char-count');
    const loading = document.getElementById('loading');
    const errorBox = document.getElementById('errorBox');
    const errorMessage = document.getElementById('errorMessage');
    const resultCard = document.getElementById('resultCard');
    const sentimentBadge = document.getElementById('sentimentBadge');
    const confidenceValue = document.getElementById('confidenceValue');
    const analysisReason = document.getElementById('analysisReason');

    // Update character count
    textInput.addEventListener('input', () => {
        const length = textInput.value.length;
        charCount.textContent = `${length} / 1000`;
        
        if (length > 900) {
            charCount.style.color = 'var(--error)';
        } else {
            charCount.style.color = 'var(--muted)';
        }
    });

    // Handle Analysis
    analyzeBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();

        // 1. Validation
        if (!text) {
            showError('문장을 입력해주세요.');
            return;
        }

        // 2. UI State - Loading
        setUIState('loading');

        try {
            // 3. API Request
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '분석 중 오류가 발생했습니다.');
            }

            // 4. UI State - Success
            displayResult(data);
        } catch (err) {
            // 5. UI State - Error
            showError(err.message);
        }
    });

    function setUIState(state) {
        // Reset
        loading.classList.add('hidden');
        errorBox.classList.add('hidden');
        resultCard.classList.add('hidden');
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = '분석하기';

        if (state === 'loading') {
            loading.classList.remove('hidden');
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = '분석 중...';
        }
    }

    function showError(message) {
        setUIState('error');
        errorMessage.textContent = message;
        errorBox.classList.remove('hidden');
    }

    function displayResult(data) {
        setUIState('success');
        
        // Translate sentiment
        const sentimentMap = {
            'positive': { text: '긍정', class: 'sentiment-positive' },
            'negative': { text: '부정', class: 'sentiment-negative' },
            'neutral': { text: '중립', class: 'sentiment-neutral' }
        };

        const sentimentInfo = sentimentMap[data.sentiment] || sentimentMap['neutral'];
        
        sentimentBadge.textContent = sentimentInfo.text;
        sentimentBadge.className = `sentiment-badge ${sentimentInfo.class}`;
        
        confidenceValue.textContent = `${data.confidence}%`;
        analysisReason.textContent = data.reason;
        
        resultCard.classList.remove('hidden');
    }
});
