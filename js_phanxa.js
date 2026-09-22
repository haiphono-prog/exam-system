// =========================================================================
// 🧠 MODULE HỌC PHẢN XẠ - ĐÓNG GÓI ĐỘC LẬP (ALL-IN-ONE)
// =========================================================================

// 1. TỰ ĐỘNG BƠM CSS VÀO HỆ THỐNG
(function injectPhanXaCSS() {
    if (document.getElementById('phanxa_styles')) return;
    const style = document.createElement('style');
    style.id = 'phanxa_styles';
    style.innerHTML = `
        .px-wrapper { padding: 10px 0; text-align: center; width: 100%; box-sizing: border-box; }
        .px-container { max-width: 1000px !important; width: 98%; margin: 0 auto; background: transparent !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.05) !important; color: #ffffff !important; border-radius: 16px !important; padding: 20px 15px 30px 15px; position: relative; display: flex; flex-direction: column; }
        .px-learning-area { width: 100%; margin-bottom: 20px; }
        .px-source-box, .px-correct-box { font-weight: 800; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; column-gap: 8px; row-gap: 12px; padding: 20px; line-height: 1.4; transition: 0.3s ease; border-radius: 16px; box-shadow: inset 0 0 20px rgba(0,0,0,0.05); text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
        .px-source-box { font-size: clamp(24px, 6vw, 40px); min-height: 120px; margin: 10px 0 20px 0; color: #38bdf8 !important; background: rgba(56, 189, 248, 0.03); border: 1px solid rgba(56, 189, 248, 0.15); }
        .px-correct-box { font-size: clamp(22px, 5.5vw, 36px); min-height: 120px; margin: 0 0 15px 0; color: #4ade80 !important; background: rgba(74, 222, 128, 0.05); border: 1px solid rgba(74, 222, 128, 0.2); }
        .px-correct-box.placeholder { color: rgba(255,255,255,0.2) !important; background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); text-shadow: none; font-size: clamp(18px, 4vw, 24px); cursor: default; }
        .px-clickable-text { cursor: pointer; }
        .px-clickable-text:hover { box-shadow: inset 0 0 30px rgba(255,255,255,0.05); transform: scale(1.01); }
        .px-word { display: inline-block; position: relative; padding: 2px 6px; margin: 0; border-radius: 8px; transition: 0.2s; }
        .px-source-box .px-word:hover { background: rgba(56, 189, 248, 0.2); color: #fff !important; transform: translateY(-2px); }
        .px-correct-box .px-word:hover { background: rgba(74, 222, 128, 0.2); color: #fff !important; transform: translateY(-2px); }
        .px-meaning { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); font-size: 14px; color: #fff; line-height: 1.3; background: linear-gradient(135deg, #ef4444, #f97316); padding: 6px 12px; border-radius: 8px; white-space: nowrap; opacity: 0; pointer-events: none; transition: all 0.3s; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4); border: 1px solid rgba(255, 255, 255, 0.2); z-index: 100; font-weight: bold; }
        .px-meaning::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border-width: 6px; border-style: solid; border-color: #f97316 transparent transparent transparent; }
        .px-word.show-meaning .px-meaning { opacity: 1; bottom: 100%; }
        .px-action-bar { display: flex; justify-content: center; align-items: center; gap: 25px; margin-bottom: 20px; }
        .px-action-btn { width: 48px; height: 48px; border-radius: 50%; background: transparent !important; border: 1px solid transparent !important; color: rgba(255,255,255,0.7) !important; font-size: 16px; cursor: pointer; transition: 0.2s; }
        .px-action-btn:hover { background: rgba(255,255,255,0.1) !important; border-color: rgba(255,255,255,0.4) !important; color: #fff !important; transform: scale(1.08); }
        .px-center-slot { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; position: relative; }
        .px-timer-compact { width: 55px; height: 55px; position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .px-circle-bg { fill: none; stroke: rgba(255,255,255,0.15); stroke-width: 3; }
        .px-circle { fill: none; stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 1s linear, stroke 0.5s ease; }
        .px-circle.running { stroke: #38bdf8; }
        .px-circle.ending { stroke: #ef4444; }
        .px-timer-text { font-size: 18px; font-weight: bold; color: #fff; z-index: 2; position: absolute; }
        .px-btn-primary { background: transparent !important; color: #38bdf8 !important; border: 1px solid #38bdf8 !important; border-radius: 12px !important; font-weight: 600; padding: 12px 24px; font-size: 16px; transition: all 0.2s ease !important; width: 100%; max-width: 300px; margin: 0 auto 20px auto; cursor: pointer;}
        .px-btn-primary:hover { background: rgba(56, 189, 248, 0.15) !important; color: #fff !important; transform: translateY(-2px); box-shadow: 0 0 20px rgba(56, 189, 248, 0.4) !important;}
        .px-toolbar-wrapper { width: 100%; margin-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 20px; }
        .px-settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
        .px-config-group { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .px-mode-btn { background: transparent !important; border: 1px solid transparent !important; padding: 6px 15px !important; border-radius: 20px !important; font-size: 13px !important; font-weight: 700; cursor: pointer; transition: 0.3s; color: rgba(255,255,255,0.5) !important; }
        .px-btn-loop { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: rgba(255, 255, 255, 0.7) !important; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .px-btn-loop.active-toggle { background: rgba(56, 189, 248, 0.15) !important; color: #38bdf8 !important; border-color: #38bdf8 !important; }
    `;
    document.head.appendChild(style);
})();

// 2. TỰ ĐỘNG BƠM HTML KHI MỞ MODULE
window.openPhanXaModule = function() {
    let wrapper = document.getElementById('phanxa_module_wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'phanxa_module_wrapper';
        wrapper.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 99999; overflow-y: auto; background-color: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px);';
        
        wrapper.innerHTML = `
        <div class="position-absolute" style="top: 15px; right: 20px; z-index: 100000;">
            <button type="button" class="btn-close btn-close-white shadow-none" style="width: 25px; height: 25px; background-color: rgba(255,255,255,0.2); border-radius: 50%;" onclick="closePhanXaModule()"></button>
        </div>
        <div class="px-wrapper">
          <div class="px-container" id="px_main_container">
            <div class="px-learning-area">
              <div class="px-source-box px-clickable-text" id="px_sourceBox" onclick="pxSpeakSourceOnClick()">Bấm nút bên dưới để tải dữ liệu...</div>
              <button class="px-btn-primary" id="px_startBtn" onclick="pxInitExercise()">Bắt đầu huấn luyện</button>
              <div class="px-action-bar" id="px_actionBar" style="display:none;">
                <button id="pxBtnMediaBack" class="px-action-btn" onclick="pxMediaBack()">⏮️</button>
                <div class="px-center-slot">
                  <div id="px_timerWrapper" class="px-timer-compact" onclick="pxMediaTogglePause()">
                    <svg class="px-circular-chart" viewBox="0 0 36 36">
                      <path class="px-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path class="px-circle running" id="px_timerPath" stroke-dasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div class="px-timer-text" id="px_timerText">🔊</div>
                  </div>
                  <button id="pxBtnMediaPause" class="px-action-btn" onclick="pxMediaTogglePause()" style="display:none; font-size: 22px; color: #38bdf8 !important;">⏸️</button>
                </div>
                <button id="pxBtnMediaNext" class="px-action-btn" onclick="pxMediaNext()">⏭️</button>
              </div>
              <div id="px_resultPanel" class="px-result-panel">
                <div class="px-correct-box placeholder" id="px_correctText" onclick="pxSpeakAnswerOnClick()">Đang chờ đáp án...</div>
              </div>
            </div>
            <div class="px-toolbar-wrapper">
              <div class="px-toolbar">
                <div class="d-flex justify-content-center gap-2 flex-wrap mb-2">
                  <button id="pxBtnMode" class="px-mode-btn mode-vi" onclick="togglePxMode()">🔄 Việt ➔ Anh</button>
                  <button id="pxBtnShuffle" class="px-mode-btn" onclick="togglePxShuffle()">⬇️ Thứ tự</button>
                </div>
                <div class="px-settings-grid">
                  <div class="px-config-group">
                    <div class="px-config-title" id="lbl_config_source">CÀI ĐẶT CÂU HỎI</div>
                    <div id="panel_source" class="px-config-items">
                      <button id="pxBtnTime_source" class="px-btn-loop" onclick="toggleConfig('source','time')">⏳ 5s</button>
                      <button id="pxBtnSpeed_source" class="px-btn-loop" onclick="toggleConfig('source','speed')">🚀 1.0x</button>
                      <button id="pxBtnRepeat_source" class="px-btn-loop" onclick="toggleConfig('source','repeat')">🔁 1 Lần</button>
                      <button id="pxBtnAutoRead_source" class="px-btn-loop active-toggle" onclick="toggleConfig('source','auto')">🔊 Đọc</button>
                    </div>
                  </div>
                  <div class="px-config-group">
                    <div class="px-config-title" id="lbl_config_target">CÀI ĐẶT TRẢ LỜI</div>
                    <div id="panel_target" class="px-config-items">
                      <button id="pxBtnTime_target" class="px-btn-loop" onclick="toggleConfig('target','time')">⏳ 5s</button>
                      <button id="pxBtnSpeed_target" class="px-btn-loop" onclick="toggleConfig('target','speed')">🚀 1.0x</button>
                      <button id="pxBtnRepeat_target" class="px-btn-loop" onclick="toggleConfig('target','repeat')">🔁 1 Lần</button>
                      <button id="pxBtnAutoRead_target" class="px-btn-loop active-toggle" onclick="toggleConfig('target','auto')">🔊 Đọc</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>`;
        document.body.appendChild(wrapper);
    }
    
    wrapper.style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('fab_menu_items').classList.add('d-none'); // Tắt sub-menu đi
    
    if (typeof initPhanXaUI === 'function') initPhanXaUI();
};

window.closePhanXaModule = function() {
    let wrapper = document.getElementById('phanxa_module_wrapper');
    if (wrapper) wrapper.style.display = 'none';
    document.body.style.overflow = '';
    if (typeof pxClearTimers === 'function') pxClearTimers();
};

// =========================================================================
// 3. ĐỘNG CƠ XỬ LÝ LOGIC (CHUYỂN SANG ĐỌC TỪ SUPABASE/RAM)
// =========================================================================
window.px_allQuestions = [];
window.px_currentIndex = 0;
window.px_currentData = null;
window.px_mainTimer = null;
window.px_nextTimer = null;
window.px_isPaused = false;
window.px_isAnswerPhase = false; 
window.px_currentReadSession = 0; 
window.px_isShuffle = false;
window.px_selectedMode = 'vi-en'; 

window.px_globalAudio = new Audio();
window.px_audioCache = {};
window.px_preloadQueue = [];

window.pxOpts = { times: [3, 5, 7, 10, 15], speeds: [0.5, 1.0, 1.2, 1.5], repeats: [1, 2] };
window.pxConfig = { vi: { timeIndex: 1, speedIndex: 1, repeatIndex: 0, auto: true }, en: { timeIndex: 1, speedIndex: 1, repeatIndex: 0, auto: true } };

window.px_extractContent = function(item, currentMode) {
    let q_raw = item.q || item.vi || ""; 
    let a_raw = item.answer || item.a || item.en || "";
    let hint_raw = item.hint || "";
    
    let q_clean = q_raw.replace(/<[^>]*>?/gm, '').trim();
    let a_clean = a_raw.replace(/<[^>]*>?/gm, '').trim();

    let vi_text = item.vi ? item.vi.replace(/<[^>]*>?/gm, '').trim() : q_clean;
    let en_text = item.en ? item.en.replace(/<[^>]*>?/gm, '').trim() : a_clean;
    let isViEn = (currentMode === 'vi-en');
    
    return {
        sourceText: isViEn ? vi_text : en_text,
        targetText: isViEn ? en_text : vi_text,
        sourceLang: isViEn ? 'vi' : 'en',
        targetLang: isViEn ? 'en' : 'vi',
        isEnglishMode: true
    };
};

window.getLangKeys = function() { return { sourceLang: window.px_selectedMode === 'vi-en' ? 'vi' : 'en', targetLang: window.px_selectedMode === 'vi-en' ? 'en' : 'vi' }; };

window.updateModeButtonUI = function() {
    const btn = document.getElementById("pxBtnMode");
    if (!btn) return; 
    if (window.px_selectedMode === 'vi-en') { btn.innerHTML = `🔄 Việt ➔ Anh`; btn.className = "px-mode-btn mode-vi"; } 
    else { btn.innerHTML = `🔄 Anh ➔ Việt`; btn.className = "px-mode-btn mode-en"; }
};

window.togglePxShuffle = function() {
    window.px_isShuffle = !window.px_isShuffle;
    const btn = document.getElementById("pxBtnShuffle");
    if(!btn) return;
    if (window.px_isShuffle) { btn.innerHTML = "🔀 Ngẫu nhiên"; btn.classList.add("active-shuffle"); } 
    else { btn.innerHTML = "⬇️ Thứ tự"; btn.classList.remove("active-shuffle"); }
};

window.updateConfigUI = function() {
    let lblSource = document.getElementById("lbl_config_source");
    if (!lblSource) return; 
    let keys = getLangKeys();
    lblSource.innerText = `CÀI ĐẶT CÂU HỎI (${keys.sourceLang === 'vi' ? 'VI' : 'EN'})`;
    document.getElementById("lbl_config_target").innerText = `CÀI ĐẶT TRẢ LỜI (${keys.targetLang === 'vi' ? 'VI' : 'EN'})`;

    ['source', 'target'].forEach(type => {
        let lang = keys[`${type}Lang`];
        let c = window.pxConfig[lang];
        document.getElementById(`pxBtnTime_${type}`).innerHTML = `⏳ ${window.pxOpts.times[c.timeIndex]}s`;
        document.getElementById(`pxBtnSpeed_${type}`).innerHTML = `🚀 ${window.pxOpts.speeds[c.speedIndex]}x`;
        document.getElementById(`pxBtnRepeat_${type}`).innerHTML = `🔁 ${window.pxOpts.repeats[c.repeatIndex]} Lần`;
        let btnAuto = document.getElementById(`pxBtnAutoRead_${type}`);
        if (c.auto) { btnAuto.innerHTML = `🔊 Đọc`; btnAuto.classList.add('active-toggle'); }
        else { btnAuto.innerHTML = `👆 Chạm`; btnAuto.classList.remove('active-toggle'); }
    });
};

window.initPhanXaUI = function() {
    if (document.getElementById("pxBtnMode")) { updateModeButtonUI(); updateConfigUI(); } 
    else { setTimeout(window.initPhanXaUI, 100); }
};

window.toggleConfig = function(panelType, key) {
    if (!window.px_isPaused && window.px_mainTimer !== null) pxMediaTogglePause(); 
    let keys = getLangKeys();
    let lang = panelType === 'source' ? keys.sourceLang : keys.targetLang;
    let c = window.pxConfig[lang];
    if (key === 'time') c.timeIndex = (c.timeIndex + 1) % window.pxOpts.times.length;
    else if (key === 'speed') c.speedIndex = (c.speedIndex + 1) % window.pxOpts.speeds.length;
    else if (key === 'repeat') c.repeatIndex = (c.repeatIndex + 1) % window.pxOpts.repeats.length;
    else if (key === 'auto') c.auto = !c.auto;
    updateConfigUI();
};

window.togglePxMode = function() { window.px_selectedMode = window.px_selectedMode === 'vi-en' ? 'en-vi' : 'vi-en'; updateModeButtonUI(); updateConfigUI(); };

window.calculateSimulatedTime = function(text, speed) { return Math.ceil(text.trim().split(/\s+/).length / (3 * speed)); };

window.pxInitExercise = function() {
    try {
        window.px_globalAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
        window.px_globalAudio.play().catch(()=>{});
        let unlockSpeech = new SpeechSynthesisUtterance(""); unlockSpeech.volume = 0; window.speechSynthesis.speak(unlockSpeech);
    } catch(e) {}

    pxClearTimers();
    document.getElementById("px_startBtn").style.display = "none";
    document.getElementById("px_sourceBox").classList.remove("px-clickable-text"); 
    document.getElementById("px_actionBar").style.display = "flex";
    document.getElementById("px_timerWrapper").style.display = "flex";
    document.getElementById("pxBtnMediaPause").style.display = "none";
    document.getElementById("px_timerText").innerHTML = `<span class="px-timer-reading">🔊</span>`;
    document.getElementById("px_sourceBox").innerText = "Đang tải dữ liệu bài học...";
    
    let correctBox = document.getElementById("px_correctText");
    correctBox.innerText = "Đang tải..."; correctBox.className = "px-correct-box placeholder";
    
    let currentLessonId = window.selected_lessons_text || "1";
    let targetSubject = window.current_subject || "tienganh";
    
    setTimeout(() => {
        let lessonData = [];
        // Lấy dữ liệu ngay từ RAM (Supabase)
        if (window.full_data && window.full_data[targetSubject]) {
            lessonData = window.full_data[targetSubject].filter(q => String(q.lesson).trim() === String(currentLessonId).trim());
        }

        // 🌟 NẾU CHƯA CHỌN BÀI HOẶC BÀI RỖNG -> TỰ ĐỘNG NẠP BÀI MẪU ĐỂ TEST
        if (lessonData.length === 0) {
            window.show_toast("⚠️ Chưa chọn bài học. Hệ thống tự tải bài Mẫu để trải nghiệm!");
            lessonData = [
                { type: 'phanxa', vi: "Xin chào, rất vui được gặp bạn.", en: "Hello, nice to meet you." },
                { type: 'phanxa', vi: "Bệnh nhân cần được kiểm tra huyết áp.", en: "The patient needs blood pressure checked." },
                { type: 'phanxa', vi: "Hôm nay bạn cảm thấy thế nào?", en: "How are you feeling today?" }
            ];
        }

        window.px_allQuestions = lessonData;
        window.px_currentIndex = 0;
        window.pxStartPreload();
    }, 300);
};

window.pxStartPreload = function() {
    window.px_preloadQueue = [];
    let uniqueItems = new Set();
    
    window.px_allQuestions.forEach(q => {
        let extracted = px_extractContent(q, window.px_selectedMode);
        let cSource = window.pxConfig[extracted.sourceLang];
        let cTarget = window.pxConfig[extracted.targetLang];
        let speedSource = window.pxOpts.speeds[cSource.speedIndex];
        let speedTarget = window.pxOpts.speeds[cTarget.speedIndex];
        
        if (!window.px_audioCache[extracted.sourceText] && !uniqueItems.has(`S_${extracted.sourceText}`)) {
            uniqueItems.add(`S_${extracted.sourceText}`); 
            window.px_preloadQueue.push({ text: extracted.sourceText, lang: extracted.sourceLang, speed: speedSource });
        }
        if (!window.px_audioCache[extracted.targetText] && !uniqueItems.has(`T_${extracted.targetText}`)) {
            uniqueItems.add(`T_${extracted.targetText}`); 
            window.px_preloadQueue.push({ text: extracted.targetText, lang: extracted.targetLang, speed: speedTarget });
        }
    });

    pxPlayCurrentIndex();
    if (window.px_preloadQueue.length > 0) pxProcessPreloadBatch(2); 
};

window.pxProcessPreloadBatch = function(limit) {
    if (window.px_preloadQueue.length === 0) return;
    let batch = [];
    while (window.px_preloadQueue.length > 0 && batch.length < limit) batch.push(window.px_preloadQueue.shift());

    // 🌟 VÌ KHÔNG CÒN GOOGLE SCRIPT, HỆ THỐNG SẼ ĐỌC BẰNG TRÍ TUỆ NHÂN TẠO (AI TTS) NỘI BỘ MÁY
    // Ta cho bỏ qua bước đợi tải file mp3, để hàm chạy thẳng vào tiến trình đọc offline
    setTimeout(() => {
        window.pxProcessPreloadBatch(limit);
    }, 50);
};

window.pxRenderTextWithClickableWords = function(containerId, text, langCode, readSpeed) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    if (langCode.includes('vi')) { container.innerText = text; return; }
    
    const words = text.split(/\s+/);
    words.forEach(word => {
        if(!word.trim()) return;
        let cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g,"");

        let wrapper = document.createElement("span");
        wrapper.className = "px-word";
        wrapper.innerHTML = `<span class="px-meaning"></span>${word}`;
        
        wrapper.onclick = function(e) {
            e.stopPropagation(); 
            if (!window.px_isPaused) pxMediaTogglePause(); 
            document.querySelectorAll('.px-word.show-meaning').forEach(w => w.classList.remove('show-meaning'));
            pxSpeakText(cleanWord, readSpeed * 0.7, langCode, 1, null);

            if (langCode.includes('en')) {
                wrapper.classList.add('show-meaning');
                let meaningSpan = wrapper.querySelector('.px-meaning');
                if (!wrapper.dataset.translated) {
                    meaningSpan.innerText = "⏳...";
                    if (typeof google !== 'undefined' && google.script) {
                        google.script.run.withSuccessHandler(res => {
                            if (res && res.meaning) {
                                let displayTxt = res.meaning;
                                if(res.ipa && !res.ipa.includes("Lỗi")) displayTxt = `<span style="font-size:12px; color:#fef08a; font-weight:normal;">[${res.ipa}]</span><br>${res.meaning}`;
                                meaningSpan.innerHTML = displayTxt; wrapper.dataset.translated = "true";
                            } else { meaningSpan.innerHTML = "Từ điển ngoại tuyến"; }
                        }).getVocabData(cleanWord);
                    } else { meaningSpan.innerHTML = "Từ điển ngoại tuyến"; }
                }
            }
        };
        container.appendChild(wrapper);
    });
};

window.pxPlayCurrentIndex = function() {
    pxClearTimers();
    let correctBox = document.getElementById("px_correctText");
    correctBox.innerText = "Đang chờ đáp án..."; correctBox.className = "px-correct-box placeholder";
    window.px_currentData = window.px_allQuestions[window.px_currentIndex];
    pxDisplayQuestion();
};

window.pxMediaNext = function() {
    if (window.px_allQuestions.length === 0) return;
    if (window.px_isShuffle) {
        let nextIdx = window.px_currentIndex;
        if (window.px_allQuestions.length > 1) { while(nextIdx === window.px_currentIndex) nextIdx = Math.floor(Math.random() * window.px_allQuestions.length); }
        window.px_currentIndex = nextIdx;
    } else { window.px_currentIndex = (window.px_currentIndex + 1) % window.px_allQuestions.length; }
    pxPlayCurrentIndex();
};

window.pxMediaBack = function() {
    if (window.px_allQuestions.length === 0) return;
    if (window.px_isShuffle) {
        let nextIdx = window.px_currentIndex;
        if (window.px_allQuestions.length > 1) { while(nextIdx === window.px_currentIndex) nextIdx = Math.floor(Math.random() * window.px_allQuestions.length); }
        window.px_currentIndex = nextIdx;
    } else { window.px_currentIndex = (window.px_currentIndex - 1 + window.px_allQuestions.length) % window.px_allQuestions.length; }
    pxPlayCurrentIndex();
};

window.pxDisplayQuestion = function() {
    window.px_isPaused = false; window.px_isAnswerPhase = false; 

    let extracted = px_extractContent(window.px_currentData, window.px_selectedMode);
    let sLangCode = extracted.sourceLang === 'vi' ? 'vi-VN' : 'en-US';
    let c = window.pxConfig[extracted.sourceLang];

    pxRenderTextWithClickableWords("px_sourceBox", extracted.sourceText, sLangCode, window.pxOpts.speeds[c.speedIndex]);
    document.getElementById("px_sourceBox").classList.add("px-clickable-text");

    document.getElementById("pxBtnMediaPause").style.display = "none";
    document.getElementById("px_timerWrapper").style.display = "flex";
    document.getElementById("px_timerText").innerHTML = `<span class="px-timer-reading">🔊</span>`;
    document.getElementById("px_timerPath").setAttribute("stroke-dasharray", "100, 100");
    document.getElementById("px_timerPath").className.baseVal = "px-circle running";

    if (c.auto) {
        pxSpeakText(extracted.sourceText, window.pxOpts.speeds[c.speedIndex], sLangCode, window.pxOpts.repeats[c.repeatIndex], function() {
            if(!window.px_isAnswerPhase) pxStartCountdown(window.pxOpts.times[c.timeIndex]);
        });
    } else {
        pxStartCountdown(calculateSimulatedTime(extracted.sourceText, window.pxOpts.speeds[c.speedIndex]) + window.pxOpts.times[c.timeIndex]);
    }
};

window.pxStartCountdown = function(timeLeft) {
    let current = timeLeft;
    document.getElementById("px_timerText").innerText = current; 
    if(window.px_mainTimer) clearInterval(window.px_mainTimer);
    window.px_mainTimer = setInterval(() => {
        if (!window.px_isPaused) {
            current--;
            if (current < 0) { clearInterval(window.px_mainTimer); pxRevealAnswer(); return; }
            document.getElementById("px_timerText").innerText = current;
            document.getElementById("px_timerPath").setAttribute("stroke-dasharray", `${(current / timeLeft) * 100}, 100`);
            if(current <= 2) document.getElementById("px_timerPath").className.baseVal = "px-circle ending";
        }
    }, 1000);
};

window.pxRevealAnswer = function() {
    window.px_isAnswerPhase = true; 
    let extracted = px_extractContent(window.px_currentData, window.px_selectedMode);
    let tLangCode = extracted.targetLang === 'en' ? 'en-US' : 'vi-VN';
    let c = window.pxConfig[extracted.targetLang];
    
    document.getElementById("px_correctText").className = "px-correct-box px-clickable-text"; 
    pxRenderTextWithClickableWords("px_correctText", extracted.targetText, tLangCode, window.pxOpts.speeds[c.speedIndex]);
    
    document.getElementById("pxBtnMediaPause").style.display = "none";
    document.getElementById("px_timerWrapper").style.display = "flex";
    document.getElementById("px_timerText").innerHTML = `<span class="px-timer-reading">🔊</span>`;
    document.getElementById("px_timerPath").setAttribute("stroke-dasharray", "100, 100");
    document.getElementById("px_timerPath").className.baseVal = "px-circle running";

    if (c.auto) {
        pxSpeakText(extracted.targetText, window.pxOpts.speeds[c.speedIndex], tLangCode, window.pxOpts.repeats[c.repeatIndex], function() {
            pxStartAutoNext(window.pxOpts.times[c.timeIndex]); 
        });
    } else {
        pxStartAutoNext(calculateSimulatedTime(extracted.targetText, window.pxOpts.speeds[c.speedIndex]) + window.pxOpts.times[c.timeIndex]);
    }
};

window.pxSpeakSourceOnClick = function() {
    if (!window.px_currentData) return;
    if (!window.px_isPaused) pxMediaTogglePause(); 
    document.querySelectorAll('.px-word.show-meaning').forEach(w => w.classList.remove('show-meaning'));
    let extracted = px_extractContent(window.px_currentData, window.px_selectedMode);
    let c = window.pxConfig[extracted.sourceLang];
    pxSpeakText(extracted.sourceText, window.pxOpts.speeds[c.speedIndex], extracted.sourceLang === 'vi' ? 'vi-VN' : 'en-US', 1, null);
};

window.pxSpeakAnswerOnClick = function() {
    if(!window.px_currentData) return;
    if (!window.px_isPaused) pxMediaTogglePause(); 
    let extracted = px_extractContent(window.px_currentData, window.px_selectedMode);
    let c = window.pxConfig[extracted.targetLang];
    pxSpeakText(extracted.targetText, window.pxOpts.speeds[c.speedIndex], extracted.targetLang === 'en' ? 'en-US' : 'vi-VN', 1, null);
};

window.pxStartAutoNext = function(seconds) {
    if(window.px_nextTimer) clearInterval(window.px_nextTimer);
    let timeLeft = seconds; let current = timeLeft;
    document.getElementById("px_timerText").innerText = current;
    document.getElementById("px_timerPath").setAttribute("stroke-dasharray", "100, 100");
    document.getElementById("px_timerPath").className.baseVal = "px-circle running";

    window.px_nextTimer = setInterval(() => {
        if (!window.px_isPaused) {
            current--;
            if(current < 0) { clearInterval(window.px_nextTimer); pxMediaNext(); return; }
            document.getElementById("px_timerText").innerText = current;
            document.getElementById("px_timerPath").setAttribute("stroke-dasharray", `${(current / timeLeft) * 100}, 100`);
            if(current <= 2) document.getElementById("px_timerPath").className.baseVal = "px-circle ending";
        }
    }, 1000);
};

window.pxMediaTogglePause = function() {
    window.px_isPaused = !window.px_isPaused;
    const pauseBtn = document.getElementById("pxBtnMediaPause");
    const timerWrap = document.getElementById("px_timerWrapper");

    if (window.px_isPaused) {
        window.speechSynthesis.cancel(); 
        if(window.px_globalAudio) window.px_globalAudio.pause();
        if (pauseBtn) { pauseBtn.style.display = "flex"; pauseBtn.innerText = "▶️"; }
        if (timerWrap) timerWrap.style.display = "none";
    } else {
        if (pauseBtn) pauseBtn.style.display = "none";
        if (timerWrap) timerWrap.style.display = "flex";
        
        let extracted = px_extractContent(window.px_currentData, window.px_selectedMode);
        if (window.px_isAnswerPhase) {
            let c = window.pxConfig[extracted.targetLang];
            document.getElementById("px_timerText").innerHTML = `<span class="px-timer-reading">🔊</span>`;
            document.getElementById("px_timerPath").setAttribute("stroke-dasharray", "100, 100");
            document.getElementById("px_timerPath").className.baseVal = "px-circle running";
            pxSpeakText(extracted.targetText, window.pxOpts.speeds[c.speedIndex], extracted.targetLang === 'en' ? 'en-US' : 'vi-VN', window.pxOpts.repeats[c.repeatIndex], function() {
                pxStartAutoNext(window.pxOpts.times[c.timeIndex]);
            });
        } else {
            let c = window.pxConfig[extracted.sourceLang];
            document.getElementById("px_timerText").innerHTML = `<span class="px-timer-reading">🔊</span>`;
            document.getElementById("px_timerPath").setAttribute("stroke-dasharray", "100, 100");
            document.getElementById("px_timerPath").className.baseVal = "px-circle running";
            pxSpeakText(extracted.sourceText, window.pxOpts.speeds[c.speedIndex], extracted.sourceLang === 'vi' ? 'vi-VN' : 'en-US', window.pxOpts.repeats[c.repeatIndex], function() {
                pxStartCountdown(window.pxOpts.times[c.timeIndex]);
            });
        }
    }
};

window.pxSpeakText = function(text, rate, langCode, repeatCount, onComplete) {
    window.speechSynthesis.cancel(); 
    if(window.px_globalAudio) { window.px_globalAudio.onended = null; window.px_globalAudio.pause(); }

    window.px_currentReadSession++;
    let mySession = window.px_currentReadSession;
    let playCount = 0;
    let langCodeShort = langCode.split('-')[0];

    function playNextLoop() {
        if (mySession !== window.px_currentReadSession) return; 
        if (playCount >= repeatCount) { if (onComplete) onComplete(); return; }

        if (window.px_audioCache[text]) {
            playAudioFromCache(window.px_audioCache[text]);
        } else {
            if (typeof google !== 'undefined' && google.script) {
                google.script.run.withSuccessHandler(function(base64Audio) {
                    if (mySession !== window.px_currentReadSession) return;
                    if (base64Audio) { window.px_audioCache[text] = base64Audio; playAudioFromCache(base64Audio); } 
                    else { fallbackToLocalVoice(); }
                }).withFailureHandler(fallbackToLocalVoice).getPremiumAudioBase64(text, langCodeShort, 'female', rate);
            } else { fallbackToLocalVoice(); }
        }
    }

    function playAudioFromCache(base64Audio) {
        window.px_globalAudio.src = base64Audio;
        window.px_globalAudio.playbackRate = rate; 
        window.px_globalAudio.onended = () => { playCount++; setTimeout(playNextLoop, 400); };
        window.px_globalAudio.play().catch(fallbackToLocalVoice);
    }
    
    function fallbackToLocalVoice() {
        if (mySession !== window.px_currentReadSession) return;
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = langCode; msg.rate = rate; 
        let voices = window.speechSynthesis.getVoices();
        let langVoices = voices.filter(v => v.lang.toLowerCase().includes(langCodeShort));
        if (langVoices.length > 0) msg.voice = langVoices[0];
        
        msg.onend = () => { if (mySession !== window.px_currentReadSession) return; playCount++; setTimeout(playNextLoop, 400); };
        msg.onerror = () => { if (mySession !== window.px_currentReadSession) return; playCount++; playNextLoop(); };
        window.speechSynthesis.speak(msg);
    }
    playNextLoop(); 
};

window.pxClearTimers = function() {
    window.px_currentReadSession++; 
    window.speechSynthesis.cancel();
    if(window.px_globalAudio) { window.px_globalAudio.onended = null; window.px_globalAudio.pause(); }
    if(window.px_mainTimer) clearInterval(window.px_mainTimer);
    if(window.px_nextTimer) clearInterval(window.px_nextTimer);
};