// =========================================================================
// 🧠 MODULE HỌC PHẢN XẠ - SUPER APP NATIVE UI (V14 - ÂM THANH 3 LỚP, GIỮ NGUYÊN LOGIC BÀI HỌC)
// =========================================================================

// 1. TỰ ĐỘNG BƠM CSS VÀO HỆ THỐNG
(function injectPhanXaCSS() {
    if (document.getElementById('phanxa_styles')) return;
    const style = document.createElement('style');
    style.id = 'phanxa_styles';
    style.innerHTML = `
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .px-word { display: inline-block; position: relative; padding: 2px 6px; margin: 0; border-radius: 8px; transition: 0.2s; cursor: pointer; }
        .px-word:hover { background: rgba(255, 255, 255, 0.15); color: #fff !important; transform: translateY(-2px); }
        .px-meaning { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); font-size: 14px; color: #fff; line-height: 1.3; background: linear-gradient(135deg, #0ea5e9, #3b82f6); padding: 6px 12px; border-radius: 8px; white-space: nowrap; opacity: 0; pointer-events: none; transition: all 0.3s; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.2); z-index: 100; font-weight: bold; margin-bottom: 5px; }
        .px-meaning::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border-width: 6px; border-style: solid; border-color: #3b82f6 transparent transparent transparent; }
        .px-word.show-meaning .px-meaning { opacity: 1; bottom: 100%; }

        .px-timer-compact { width: 64px; height: 64px; position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; background: #000; border-radius: 50%; box-shadow: 0 0 20px rgba(0,0,0,0.5); border: 2px solid #334155; }
        .px-circle-bg { fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 3; }
        .px-circle { fill: none; stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 1s linear, stroke 0.5s ease; }
        .px-circle.running { stroke: #38bdf8; }
        .px-circle.ending { stroke: #ef4444; }
        .px-timer-text { font-size: 18px; font-weight: bold; color: #fff; z-index: 2; position: absolute; }
        
        .px-btn-loop { background: transparent !important; border: 1px solid #334155 !important; color: rgba(255, 255, 255, 0.7) !important; padding: 8px 12px; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: 600; flex-grow: 1; text-align: center; }
        .px-btn-loop.active-toggle { background: rgba(56, 189, 248, 0.15) !important; color: #38bdf8 !important; border-color: #38bdf8 !important; }
        .px-mode-btn { background: rgba(0,0,0,0.3) !important; border: 1px solid rgba(255,255,255,0.1) !important; padding: 8px 15px !important; border-radius: 20px !important; font-size: 13px !important; font-weight: 700; cursor: pointer; color: #fff !important; }
    `;
    document.head.appendChild(style);
})();

// 2. TỰ ĐỘNG BƠM HTML VÀ RESET TRẠNG THÁI UI KHI MỞ
window.openPhanXaModule = function(isDirectMode = false) {
    window.is_phanxa_direct = isDirectMode;

    // 🌟 FIX LỖI MÀN HÌNH ĐEN: Đóng tất cả Modal "Chọn chế độ học" đang mở ngầm
    try {
        if (typeof bootstrap !== 'undefined') {
            document.querySelectorAll('.modal.show').forEach(m => {
                let instance = bootstrap.Modal.getInstance(m);
                if (instance) instance.hide();
            });
        }
        // Dọn dẹp phông nền đen (backdrop) nếu có
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    } catch(e) {}

    let wrapper = document.getElementById('phanxa_module_wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'phanxa_module_wrapper';
        
        wrapper.className = 'position-fixed w-100 animate__animated animate__fadeInUp';
        wrapper.style.cssText = 'top: 0; bottom: 0; left: 0; right: 0; background: #121212; z-index: 99999; overflow: hidden; display: none; flex-direction: column;';
        
        wrapper.innerHTML = `
        <div class="d-flex px-2 py-2 border-bottom border-secondary bg-dark flex-shrink-0 align-items-center" style="padding-top: max(env(safe-area-inset-top), 0.5rem) !important;">
            <button type="button" onclick="closePhanXaModule()" class="btn btn-sm text-light fw-bold d-flex align-items-center p-2 bg-transparent border-0 shadow-none position-relative" style="z-index: 1050;">
                <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
            </button>
            <h6 class="fw-bold mb-0 text-truncate flex-grow-1 text-center text-info" style="letter-spacing: 0.5px; font-size: 1.1rem; margin-right: 40px;">
                HỌC PHẢN XẠ
            </h6>
        </div>

        <div class="flex-grow-1 overflow-hidden bg-black d-flex flex-column pb-4 position-relative">
            <div class="d-flex flex-column flex-grow-1 position-relative">
                <div class="flex-grow-1 d-flex flex-column bg-dark position-relative overflow-auto no-scrollbar" style="flex-basis: 50%;">
                    <div id="px_sourceBox" class="m-auto p-4 text-center text-info w-100" style="font-size: clamp(24px, 6vw, 36px); font-weight: 800; word-break: break-word; line-height: 1.4; cursor: pointer;" onclick="pxSpeakSourceOnClick()">
                        <span class="opacity-50 fs-5">Bấm nút Bắt đầu bên dưới...</span>
                    </div>
                </div>

                <div id="px_center_timer_slot" class="position-absolute top-50 start-50 translate-middle" style="z-index: 10; display: none;">
                    <div id="px_timerWrapper" class="px-timer-compact" onclick="pxMediaTogglePause()">
                        <svg class="px-circular-chart position-absolute w-100 h-100" viewBox="0 0 36 36">
                          <path class="px-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path class="px-circle running" id="px_timerPath" stroke-dasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div class="px-timer-text" id="px_timerText">🔊</div>
                    </div>
                    <div id="pxBtnMediaPause" class="px-timer-compact bg-dark text-info" onclick="pxMediaTogglePause()" style="display:none; font-size: 24px;">⏸</div>
                </div>

                <div class="flex-grow-1 d-flex flex-column position-relative overflow-auto no-scrollbar border-top border-secondary" style="background: #0a0a0a; flex-basis: 50%;">
                    <div id="px_correctText" class="m-auto p-4 text-center text-white-50 w-100" style="font-size: clamp(20px, 5vw, 28px); font-weight: 700; word-break: break-word; line-height: 1.4; cursor: pointer;" onclick="pxSpeakAnswerOnClick()">
                        Đang chờ dữ liệu...
                    </div>
                </div>
            </div>

            <div class="mx-2 mx-md-3 mt-3 mb-3 bg-dark border border-secondary rounded-4 p-3 shadow flex-shrink-0">
                <div class="d-flex justify-content-center gap-2 flex-wrap mb-3">
                  <button id="pxBtnMode" class="px-mode-btn mode-vi" onclick="togglePxMode()">🔄 Việt ➔ Anh</button>
                  <button id="pxBtnShuffle" class="px-mode-btn" onclick="togglePxShuffle()">⬇️ Thứ tự</button>
                </div>
                
                <div class="row g-3">
                    <div class="col-6 d-flex flex-column gap-2 border-end border-secondary">
                        <div class="text-white-50 small fw-bold text-center mb-1" id="lbl_config_source">ĐỌC CÂU GỐC</div>
                        <div class="d-flex flex-wrap gap-2 justify-content-center">
                            <button id="pxBtnTime_source" class="px-btn-loop" onclick="toggleConfig('source','time')">⏳ 5s</button>
                            <button id="pxBtnSpeed_source" class="px-btn-loop" onclick="toggleConfig('source','speed')">🚀 1.0x</button>
                            <button id="pxBtnRepeat_source" class="px-btn-loop" onclick="toggleConfig('source','repeat')">🔁 1 Lần</button>
                            <button id="pxBtnAutoRead_source" class="px-btn-loop active-toggle" onclick="toggleConfig('source','auto')">🔊 Đọc</button>
                        </div>
                    </div>
                    <div class="col-6 d-flex flex-column gap-2">
                        <div class="text-white-50 small fw-bold text-center mb-1" id="lbl_config_target">ĐỌC ĐÁP ÁN</div>
                        <div class="d-flex flex-wrap gap-2 justify-content-center">
                            <button id="pxBtnTime_target" class="px-btn-loop" onclick="toggleConfig('target','time')">⏳ 5s</button>
                            <button id="pxBtnSpeed_target" class="px-btn-loop" onclick="toggleConfig('target','speed')">🚀 1.0x</button>
                            <button id="pxBtnRepeat_target" class="px-btn-loop" onclick="toggleConfig('target','repeat')">🔁 1 Lần</button>
                            <button id="pxBtnAutoRead_target" class="px-btn-loop active-toggle" onclick="toggleConfig('target','auto')">🔊 Đọc</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="px_footerStart" class="d-flex w-100 bg-dark border-top border-secondary flex-shrink-0" style="padding-bottom: env(safe-area-inset-bottom); position: relative; z-index: 1050;">
            <button class="btn py-3 fw-bold flex-grow-1 text-info bg-dark border-0 rounded-0" style="letter-spacing: 0.5px; font-size: 1.1rem;" onclick="pxInitExercise()">
                <i class="bi bi-play-circle-fill me-2 fs-4 align-middle"></i> BẮT ĐẦU HUẤN LUYỆN
            </button>
        </div>

        <div id="px_footerControls" class="w-100 bg-dark border-top border-secondary flex-shrink-0" style="padding-bottom: env(safe-area-inset-bottom); position: relative; z-index: 1050; display: none;">
            <div class="d-flex w-100">
                <button class="btn py-3 fw-bold flex-grow-1 text-white-50 bg-dark border-0 border-end border-secondary rounded-0 fs-3" onclick="pxMediaBack()">
                    <i class="bi bi-skip-backward-fill"></i>
                </button>
                <button class="btn py-3 fw-bold flex-grow-1 text-white-50 bg-dark border-0 rounded-0 fs-3" onclick="pxMediaNext()">
                    <i class="bi bi-skip-forward-fill"></i>
                </button>
            </div>
        </div>
        `;
        document.body.appendChild(wrapper);
    } else {
        // Reset lại UI khi mở lần 2
        let fStart = document.getElementById("px_footerStart");
        if (fStart) { fStart.style.display = "flex"; fStart.classList.add("d-flex"); }
        
        let fCtrl = document.getElementById("px_footerControls");
        if (fCtrl) { fCtrl.style.display = "none"; fCtrl.classList.remove("d-flex"); }
        
        let timerSlot = document.getElementById("px_center_timer_slot");
        if (timerSlot) timerSlot.style.display = "none";
        
        let srcBox = document.getElementById("px_sourceBox");
        if (srcBox) srcBox.innerHTML = "<span class='opacity-50 fs-5'>Bấm nút Bắt đầu bên dưới...</span>";
        
        let correctBox = document.getElementById("px_correctText");
        if (correctBox) {
            correctBox.innerText = "Đang chờ dữ liệu..."; 
            correctBox.classList.add('text-white-50');
            correctBox.classList.remove('text-warning');
        }
    }
    
    wrapper.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Tạm ẩn menu tiện ích mở rộng nếu có
    let fab = document.getElementById('fab_menu_items');
    if(fab) fab.classList.add('d-none');
    
    if (typeof initPhanXaUI === 'function') initPhanXaUI();
};

window.closePhanXaModule = function() {
    let wrapper = document.getElementById('phanxa_module_wrapper');
    if (wrapper) wrapper.style.display = 'none';
    document.body.style.overflow = '';
    
    // 🌟 FIX LỖI ẨN NÚT FAB: Khôi phục lại menu nổi khi thoát
    let fab = document.getElementById('fab_menu_items');
    if (fab) fab.classList.remove('d-none');
    
    // Xóa lớp phủ đen dự phòng
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    
    if (typeof pxClearTimers === 'function') pxClearTimers();
};

// =========================================================================
// 3. ĐỘNG CƠ XỬ LÝ LOGIC & DỮ LIỆU CHUẨN
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

window.togglePxMode = function() {
    if (window.px_selectedMode === 'vi-en') {
        window.px_selectedMode = 'en-vi';
    } else {
        window.px_selectedMode = 'vi-en';
    }
    
    // Cập nhật giao diện nút
    window.updateModeButtonUI();
    // Cập nhật nhãn cấu hình thời gian/tốc độ đọc
    window.updateConfigUI();
    
    // Nếu đang trong bài học thì load lại thẻ hiện tại
    if (window.px_allQuestions && window.px_allQuestions.length > 0) {
        window.pxPlayCurrentIndex();
    }
};

window.updateModeButtonUI = function() {
    const btn = document.getElementById("pxBtnMode");
    if (!btn) return; 
    
    // Sửa lại cho đúng logic hiển thị
    if (window.px_selectedMode === 'vi-en') { 
        btn.innerHTML = `🔄 Việt ➔ Anh`; 
        btn.className = "px-mode-btn mode-vi text-warning"; 
    } else { 
        btn.innerHTML = `🔄 Anh ➔ Việt`; 
        btn.className = "px-mode-btn mode-en text-info"; 
    }
};

window.togglePxShuffle = function() {
    window.px_isShuffle = !window.px_isShuffle;
    const btn = document.getElementById("pxBtnShuffle");
    if(!btn) return;
    if (window.px_isShuffle) { btn.innerHTML = "🔀 Ngẫu nhiên"; btn.classList.add("text-info"); btn.classList.remove("text-white-50"); } 
    else { btn.innerHTML = "⬇️ Thứ tự"; btn.classList.remove("text-info"); btn.classList.add("text-white-50"); }
};

window.updateConfigUI = function() {
    let lblSource = document.getElementById("lbl_config_source");
    if (!lblSource) return; 
    let keys = getLangKeys();
    lblSource.innerText = `ĐỌC CÂU GỐC (${keys.sourceLang === 'vi' ? 'VI' : 'EN'})`;
    document.getElementById("lbl_config_target").innerText = `ĐỌC ĐÁP ÁN (${keys.targetLang === 'vi' ? 'VI' : 'EN'})`;

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

window.calculateSimulatedTime = function(text, speed) { return Math.ceil(text.trim().split(/\s+/).length / (3 * speed)); };

// =========================================================================
// GIỮ NGUYÊN HOÀN TOÀN LOGIC TẢI DỮ LIỆU CỦA BẠN (V13)
// =========================================================================
window.pxInitExercise = async function() {
    try {
        window.px_globalAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
        window.px_globalAudio.play().catch(()=>{});
        let unlockSpeech = new SpeechSynthesisUtterance(""); unlockSpeech.volume = 0; window.speechSynthesis.speak(unlockSpeech);
    } catch(e) {}

    pxClearTimers();
    
    document.getElementById("px_footerStart").style.display = "none";
    document.getElementById("px_footerStart").classList.remove("d-flex");
    let footerControls = document.getElementById("px_footerControls");
    footerControls.style.display = "block";
    footerControls.classList.add("d-flex");

    document.getElementById("px_center_timer_slot").style.display = "flex";
    document.getElementById("pxBtnMediaPause").style.display = "none";
    document.getElementById("px_timerWrapper").style.display = "flex";
    document.getElementById("px_timerText").innerHTML = `🔊`;
    document.getElementById("px_sourceBox").innerHTML = "<span class='spinner-border text-info'></span>";
    
    let correctBox = document.getElementById("px_correctText");
    correctBox.innerText = "Đang tải dữ liệu..."; 
    correctBox.classList.add('text-white-50');
    correctBox.classList.remove('text-warning');
    
    let lessonData = [];
    let isDirectMode = window.is_phanxa_direct || (!window.questions || window.questions.length === 0);

    if (isDirectMode) {
        try {
            let userKey = window.getPhanXaSubjectKey();
            const { data, error } = await db.from('phanxa_questions').select('*').eq('subject_key', userKey);
            if (data && !error) lessonData = data;
        } catch (e) {
            console.log("Lỗi tải Supabase Phản Xạ:", e);
        }
    } else {
        let currentLessonId = window.selected_lessons_text || "";
        let targetSubject = window.current_subject || "";
        
        if (window.px_custom_pool && window.px_custom_pool.length > 0) {
            lessonData = [...window.px_custom_pool];
        } else if (window.questions && window.questions.length > 0) {
            lessonData = [...window.questions];
        } else if (window.full_data && window.full_data[targetSubject]) {
            lessonData = window.full_data[targetSubject].filter(q => String(q.lesson).trim() === String(currentLessonId).trim());
        } else if (targetSubject && currentLessonId) {
            try {
                const { data, error } = await db.from('questions')
                    .select('*')
                    .eq('subject_key', targetSubject)
                    .eq('lesson', currentLessonId);
                if (data && !error) lessonData = data;
            } catch (e) { console.log("Lỗi tải bài học từ Supabase:", e); }
        }
    }

    lessonData = lessonData.filter(q => {
        let typeStr = String(q.type || '').toLowerCase();
        return typeStr !== 'hotspot' && typeStr !== 'clip';
    });

    if (lessonData.length === 0) {
        if (typeof window.show_toast === 'function') window.show_toast("⚠️ Chưa có dữ liệu hợp lệ (hoặc chỉ toàn Hotspot/Clip)!");
        document.getElementById("px_sourceBox").innerHTML = "<span class='opacity-50 fs-5'>Không có dữ liệu văn bản.</span>";
        correctBox.innerText = "";
        
        document.getElementById("px_footerStart").style.display = "flex";
        document.getElementById("px_footerStart").classList.add("d-flex");
        document.getElementById("px_footerControls").style.display = "none";
        document.getElementById("px_footerControls").classList.remove("d-flex");
        document.getElementById("px_center_timer_slot").style.display = "none";
        return;
    }

    window.px_allQuestions = lessonData.map(q => {
        let item = { ...q };
        
        // 1. Lấy nội dung thô của Câu hỏi (cột q)
        let questionText = q.q || q.question || q[4] || q[3] || "Câu hỏi";
        
        // 2. Lấy nội dung thô của Đáp án (dựa vào cột answer và opt_a, b, c, d)
        let correctOpt = String(q.answer || q.a || q[8] || "").trim().toUpperCase();
        let ansText = "";

        if (q.opts && q.opts.length > 0) {
            let idx = ['A', 'B', 'C', 'D'].indexOf(correctOpt);
            ansText = (idx !== -1 && q.opts[idx]) ? q.opts[idx] : q.opts[0];
        } 
        else if (q.opt_a || q.opt_b || q.opt_c || q.opt_d || q.optA || q.optB || q.optC || q.optD) {
            if (correctOpt === 'A') ansText = q.opt_a || q.optA;
            else if (correctOpt === 'B') ansText = q.opt_b || q.optB;
            else if (correctOpt === 'C') ansText = q.opt_c || q.optC;
            else if (correctOpt === 'D') ansText = q.opt_d || q.optD;
            else ansText = q.answer || q.a || ""; 
        }
        // Fallback nếu không có opt_a, opt_b... thì lấy trực tiếp text trong cột answer
        ansText = ansText || q.answer || q.a || "Đáp án";

        // 3. 🌟 NHẬN DIỆN THÔNG MINH: Tự động phân bổ lại vị trí Anh - Việt
        let isAnswerVN = typeof window.isVietnameseTextPx === 'function' ? window.isVietnameseTextPx(ansText) : false;
        let isQuestionVN = typeof window.isVietnameseTextPx === 'function' ? window.isVietnameseTextPx(questionText) : true; // Mặc định q là VN nếu không check được

        // Nếu Đáp án rõ ràng là Tiếng Việt, còn Câu hỏi thì không -> Đảo ngược
        if (isAnswerVN && !isQuestionVN) {
            item.vi = ansText;
            item.en = questionText;
        } 
        // Nếu Câu hỏi rõ ràng là Tiếng Việt, còn Đáp án thì không -> Giữ nguyên
        else if (isQuestionVN && !isAnswerVN) {
            item.vi = questionText;
            item.en = ansText;
        } 
        // Nếu cả 2 đều là VN / đều là EN / không rõ ràng -> Giữ thứ tự gốc của Database
        else {
            item.vi = questionText;
            item.en = ansText;
        }
        
        return item;
    });

    window.px_currentIndex = 0;
    window.pxStartPreload();
};

window.getPhanXaSubjectKey = function() {
    let currentUser = localStorage.getItem('student_id') || localStorage.getItem('username') || localStorage.getItem('user_id') || sessionStorage.getItem('student_id');
    let inputID = document.getElementById('student_id');
    if (!currentUser && inputID && inputID.value) currentUser = inputID.value;
    
    if (!currentUser || currentUser.trim() === '') return 'phanxakhachvanglai';
    let cleanUser = currentUser.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    return `phanxa${cleanUser}`; 
};

window.pxStartPreload = function() {
    window.px_preloadQueue = [];
    let uniqueItems = new Set();
    window.px_allQuestions.forEach(q => {
        let extracted = px_extractContent(q, window.px_selectedMode);
        let cSource = window.pxConfig[extracted.sourceLang];
        let cTarget = window.pxConfig[extracted.targetLang];
        
        if (!window.px_audioCache[extracted.sourceText] && !uniqueItems.has(`S_${extracted.sourceText}`)) {
            uniqueItems.add(`S_${extracted.sourceText}`); 
            window.px_preloadQueue.push({ text: extracted.sourceText, lang: extracted.sourceLang, speed: window.pxOpts.speeds[cSource.speedIndex] });
        }
        if (!window.px_audioCache[extracted.targetText] && !uniqueItems.has(`T_${extracted.targetText}`)) {
            uniqueItems.add(`T_${extracted.targetText}`); 
            window.px_preloadQueue.push({ text: extracted.targetText, lang: extracted.targetLang, speed: window.pxOpts.speeds[cTarget.speedIndex] });
        }
    });
    pxPlayCurrentIndex();
    if (window.px_preloadQueue.length > 0) pxProcessPreloadBatch(2); 
};

window.pxProcessPreloadBatch = function(limit) {
    if (window.px_preloadQueue.length === 0) return;
    let batch = [];
    while (window.px_preloadQueue.length > 0 && batch.length < limit) batch.push(window.px_preloadQueue.shift());
    setTimeout(() => { window.pxProcessPreloadBatch(limit); }, 50);
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
                    
                    // SỬ DỤNG FETCH API TRỰC TIẾP THAY CHO GOOGLE.SCRIPT
                    let translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(cleanWord)}`;
                    
                    fetch(translateUrl)
                        .then(response => response.json())
                        .then(data => {
                            if (data && data[0] && data[0][0] && data[0][0][0]) {
                                let translatedText = data[0][0][0];
                                meaningSpan.innerHTML = `<span style="font-size:14px; font-weight:bold;">${translatedText}</span>`; 
                                wrapper.dataset.translated = "true";
                            } else { 
                                meaningSpan.innerHTML = "Không tìm thấy"; 
                            }
                        })
                        .catch(err => {
                            console.error("Lỗi dịch từ:", err);
                            meaningSpan.innerHTML = "Lỗi mạng";
                        });
                }
            }
        };
        container.appendChild(wrapper);
        container.appendChild(document.createTextNode(" "));
    });
};

window.pxPlayCurrentIndex = function() {
    pxClearTimers();
    let correctBox = document.getElementById("px_correctText");
    correctBox.innerText = "Đang chờ đáp án..."; 
    correctBox.classList.add('text-white-50');
    correctBox.classList.remove('text-warning');
    
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

    document.getElementById("pxBtnMediaPause").style.display = "none";
    document.getElementById("px_timerWrapper").style.display = "flex";
    document.getElementById("px_timerText").innerHTML = `🔊`;
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
    
    let correctBox = document.getElementById("px_correctText");
    correctBox.classList.remove('text-white-50');
    correctBox.classList.add('text-warning');
    
    pxRenderTextWithClickableWords("px_correctText", extracted.targetText, tLangCode, window.pxOpts.speeds[c.speedIndex]);
    
    document.getElementById("pxBtnMediaPause").style.display = "none";
    document.getElementById("px_timerWrapper").style.display = "flex";
    document.getElementById("px_timerText").innerHTML = `🔊`;
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

// Hàm regex tự động phát hiện Tiếng Việt
window.isVietnameseTextPx = function(text) {
    if (!text) return false;
    const vnRegex = /[àáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳýỹỷỵ]/i;
    return vnRegex.test(text);
};

window.pxSpeakSourceOnClick = function() {
    if (!window.px_currentData) return;
    if (!window.px_isPaused) pxMediaTogglePause(); 
    document.querySelectorAll('.px-word.show-meaning').forEach(w => w.classList.remove('show-meaning'));
    
    let extracted = px_extractContent(window.px_currentData, window.px_selectedMode);
    let c = window.pxConfig[extracted.sourceLang];
    
    // Tự động nhận diện ngôn ngữ thay vì ép cứng
    let langCode = window.isVietnameseTextPx(extracted.sourceText) ? 'vi-VN' : 'en-US';
    
    pxSpeakText(extracted.sourceText, window.pxOpts.speeds[c.speedIndex], langCode, 1, null);
};

window.pxSpeakAnswerOnClick = function() {
    if(!window.px_currentData) return;
    if (!window.px_isPaused) pxMediaTogglePause(); 
    
    let extracted = px_extractContent(window.px_currentData, window.px_selectedMode);
    let c = window.pxConfig[extracted.targetLang];
    
    // Tự động nhận diện ngôn ngữ thay vì ép cứng
    let langCode = window.isVietnameseTextPx(extracted.targetText) ? 'vi-VN' : 'en-US';
    
    pxSpeakText(extracted.targetText, window.pxOpts.speeds[c.speedIndex], langCode, 1, null);
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
        if (pauseBtn) pauseBtn.style.display = "flex";
        if (timerWrap) timerWrap.style.display = "none";
    } else {
        if (pauseBtn) pauseBtn.style.display = "none";
        if (timerWrap) timerWrap.style.display = "flex";
        
        let extracted = px_extractContent(window.px_currentData, window.px_selectedMode);
        if (window.px_isAnswerPhase) {
            let c = window.pxConfig[extracted.targetLang];
            document.getElementById("px_timerText").innerHTML = `🔊`;
            document.getElementById("px_timerPath").setAttribute("stroke-dasharray", "100, 100");
            document.getElementById("px_timerPath").className.baseVal = "px-circle running";
            pxSpeakText(extracted.targetText, window.pxOpts.speeds[c.speedIndex], extracted.targetLang === 'en' ? 'en-US' : 'vi-VN', window.pxOpts.repeats[c.repeatIndex], function() {
                pxStartAutoNext(window.pxOpts.times[c.timeIndex]);
            });
        } else {
            let c = window.pxConfig[extracted.sourceLang];
            document.getElementById("px_timerText").innerHTML = `🔊`;
            document.getElementById("px_timerPath").setAttribute("stroke-dasharray", "100, 100");
            document.getElementById("px_timerPath").className.baseVal = "px-circle running";
            pxSpeakText(extracted.sourceText, window.pxOpts.speeds[c.speedIndex], extracted.sourceLang === 'vi' ? 'vi-VN' : 'en-US', window.pxOpts.repeats[c.repeatIndex], function() {
                pxStartCountdown(window.pxOpts.times[c.timeIndex]);
            });
        }
    }
};

// =================================================================================
// 🌟 THAY THẾ DUY NHẤT HÀM NÀY: KIẾN TRÚC ÂM THANH 3 LỚP
// =================================================================================
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
            // LỚP 1: BẮT ĐÚNG HÀM TỪ FILE CODE ĐỂ LẤY FILE MP3
            if (typeof google !== 'undefined' && google.script) {
                google.script.run.withSuccessHandler(function(base64Audio) {
                    if (mySession !== window.px_currentReadSession) return;
                    if (base64Audio) { 
                        window.px_audioCache[text] = base64Audio; 
                        playAudioFromCache(base64Audio); 
                    } else { 
                        fallbackToGoogleDirect(); // Nếu lỗi MP3, qua Lớp 2
                    }
                }).withFailureHandler(fallbackToGoogleDirect).getPremiumAudioBase64(text, langCodeShort, 'female', rate);
            } else { 
                fallbackToGoogleDirect(); 
            }
        }
    }

    function playAudioFromCache(base64Audio) {
        window.px_globalAudio.src = base64Audio;
        window.px_globalAudio.playbackRate = rate; 
        window.px_globalAudio.onended = () => { playCount++; setTimeout(playNextLoop, 400); };
        window.px_globalAudio.play().catch(fallbackToGoogleDirect);
    }
    
    // LỚP 2: BROWSER TỰ ĐỘNG KÉO FILE MP3 TỪ MÁY CHỦ GOOGLE NẾU LỚP 1 GẶP LỖI
    function fallbackToGoogleDirect() {
        if (mySession !== window.px_currentReadSession) return;
        
        let googleAudioUrl = "https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=" + langCodeShort + "&q=" + encodeURIComponent(text);
        
        window.px_globalAudio.src = googleAudioUrl;
        window.px_globalAudio.playbackRate = rate; 
        window.px_globalAudio.onended = () => { playCount++; setTimeout(playNextLoop, 400); };
        window.px_globalAudio.play().catch(fallbackToLocalVoice); // Lỗi mới qua Lớp 3
    }

    // LỚP 3: DỰ PHÒNG OFFLINE BẰNG GIỌNG CỦA MÁY
    function fallbackToLocalVoice() {
        if (mySession !== window.px_currentReadSession) return;
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = langCode; 
        msg.rate = rate; 
        
        let voices = window.speechSynthesis.getVoices();
        let langVoices = voices.filter(v => v.lang.toLowerCase().includes(langCodeShort));
        
        // Ưu tiên giọng tự nhiên nếu máy có cài
        let premiumVoice = langVoices.find(v => v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Natural') || v.name.includes('Online'));
        if (premiumVoice) { msg.voice = premiumVoice; } 
        else if (langVoices.length > 0) { msg.voice = langVoices[0]; }
        
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