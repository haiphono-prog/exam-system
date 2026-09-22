// =========================================================================
// 🔥 ENGINE: ĐẤU TRƯỜNG SINH TỒN (TÍNH ĐIỂM THANG ĐIỂM 10 TRỰC TIẾP)
// =========================================================================
window.init_survival_engine = function() {
    window.survival_hp = 5;       
    window.survival_score = 0;    
    window.survival_combo = 0;    
    window.current_q_idx = 0;     
    window.survival_correct_count = 0;
    window.survival_revived = false; 
    
    // 🌟 TÍNH ĐIỂM CHO TỪNG CÂU HỎI TRÊN THANG ĐIỂM 10
    let totalQuestions = (window.questions && window.questions.length > 0) ? window.questions.length : 1;
    window.survival_point_per_q = 10 / totalQuestions;

    if (window.survival_timer) clearInterval(window.survival_timer);

    let quizArea = document.getElementById('quiz_area');
    if (!quizArea) return;
    
    // Ép cứng chiều cao vừa khít 1 màn hình di động
    quizArea.style.height = 'calc(100dvh - 85px)';
    quizArea.style.display = 'flex';
    quizArea.style.flexDirection = 'column';
    quizArea.style.justifyContent = 'center';
    quizArea.style.overscrollBehavior = 'none';

    let globalTimerBox = document.querySelector('.glass-timer-box');
    if (globalTimerBox) globalTimerBox.style.display = 'none';

    window.render_survival_question();
};

window.render_survival_question = function() {
    let quizArea = document.getElementById('quiz_area');
    let q = window.questions[window.current_q_idx];

    if (!q || window.survival_hp <= 0) {
        window.end_survival_game();
        return;
    }

    // 1. VẼ 5 TRÁI TIM (HP)
    let hp_html = '';
    for(let i=0; i<5; i++) {
        hp_html += i < window.survival_hp 
            ? '<i class="bi bi-heart-fill text-danger fs-5 mx-1 animate__animated animate__heartBeat animate__infinite"></i>' 
            : '<i class="bi bi-heartbreak text-secondary fs-5 mx-1 opacity-50"></i>';
    }

    let mediaHtml = (typeof window.render_media_for_card === 'function') ? window.render_media_for_card(q) : "";
    if (mediaHtml) {
        mediaHtml = mediaHtml.replace(/max-height:\s*250px/g, 'max-height: 15vh').replace(/mb-3/g, 'mb-2');
    }

    let rawQ = q.q || q[3] || "Nội dung câu hỏi";
    let qText = (typeof window.apply_magic_vocab === 'function') ? window.apply_magic_vocab(rawQ) : rawQ;

    let qType = String(q.type || "").toLowerCase().trim();
    let isTF = (qType === 'true_false' || qType === 'tf' || qType === 'đúng sai');
    
    let optionsHtml = '';

    if (isTF) {
        optionsHtml = `
        <div class="row g-2 text-center justify-content-center">
            <div class="col-6">
                <button class="btn glass-btn-action w-100 py-3 fw-bold survival-opt d-flex flex-column align-items-center justify-content-center gap-1" style="font-size: 1.1rem; border-radius: 12px; color: #4ade80 !important; border: 1px solid #4ade80 !important; background: rgba(74, 222, 128, 0.1);" onclick="window.check_survival_ans('đúng', this)">
                    <i class="bi bi-check-circle-fill fs-3"></i> ĐÚNG
                </button>
            </div>
            <div class="col-6">
                <button class="btn glass-btn-action w-100 py-3 fw-bold survival-opt d-flex flex-column align-items-center justify-content-center gap-1" style="font-size: 1.1rem; border-radius: 12px; color: #f87171 !important; border: 1px solid #f87171 !important; background: rgba(239, 68, 68, 0.1);" onclick="window.check_survival_ans('sai', this)">
                    <i class="bi bi-x-circle-fill fs-3"></i> SAI
                </button>
            </div>
        </div>`;
    } else {
        let optA = q.opts && q.opts.length > 0 ? q.opts[0] : (q.optA || q[4] || "");
        let optB = q.opts && q.opts.length > 1 ? q.opts[1] : (q.optB || q[5] || "");
        let optC = q.opts && q.opts.length > 2 ? q.opts[2] : (q.optC || q[6] || "");
        let optD = q.opts && q.opts.length > 3 ? q.opts[3] : (q.optD || q[7] || "");
        
        optA = (typeof window.apply_magic_vocab === 'function') ? window.apply_magic_vocab(optA) : optA;
        optB = (typeof window.apply_magic_vocab === 'function') ? window.apply_magic_vocab(optB) : optB;
        optC = (typeof window.apply_magic_vocab === 'function') ? window.apply_magic_vocab(optC) : optC;
        optD = (typeof window.apply_magic_vocab === 'function') ? window.apply_magic_vocab(optD) : optD;

        optionsHtml = `
        <div class="row g-2 text-start">
            <div class="col-12 col-md-6"><button class="btn glass-btn-action w-100 py-2 px-3 fw-bold survival-opt d-flex align-items-center" style="font-size: 0.95rem; border-radius: 12px; min-height: 48px; text-align: left;" onclick="window.check_survival_ans(0, this)"><span class="text-warning me-2 flex-shrink-0">A.</span> <span style="line-height: 1.2; word-break: break-word;">${optA}</span></button></div>
            <div class="col-12 col-md-6"><button class="btn glass-btn-action w-100 py-2 px-3 fw-bold survival-opt d-flex align-items-center" style="font-size: 0.95rem; border-radius: 12px; min-height: 48px; text-align: left;" onclick="window.check_survival_ans(1, this)"><span class="text-warning me-2 flex-shrink-0">B.</span> <span style="line-height: 1.2; word-break: break-word;">${optB}</span></button></div>
            <div class="col-12 col-md-6"><button class="btn glass-btn-action w-100 py-2 px-3 fw-bold survival-opt d-flex align-items-center" style="font-size: 0.95rem; border-radius: 12px; min-height: 48px; text-align: left;" onclick="window.check_survival_ans(2, this)"><span class="text-warning me-2 flex-shrink-0">C.</span> <span style="line-height: 1.2; word-break: break-word;">${optC}</span></button></div>
            <div class="col-12 col-md-6"><button class="btn glass-btn-action w-100 py-2 px-3 fw-bold survival-opt d-flex align-items-center" style="font-size: 0.95rem; border-radius: 12px; min-height: 48px; text-align: left;" onclick="window.check_survival_ans(3, this)"><span class="text-warning me-2 flex-shrink-0">D.</span> <span style="line-height: 1.2; word-break: break-word;">${optD}</span></button></div>
        </div>`;
    }

    // 🌟 ĐIỂM SỐ ĐƯỢC ĐỊNH DẠNG THEO THANG ĐIỂM 10 (Ví dụ: 3.5 / 10đ)
    let displayCurrentScore = (Math.round(window.survival_score * 10) / 10).toFixed(1);

    let html = `
    <div class="glass-panel shadow-lg mx-auto animate__animated animate__zoomIn d-flex flex-column p-3" style="max-width: 800px; width: 100%; height: 100%; border: 2px solid rgba(239, 68, 68, 0.5); background: rgba(20, 0, 0, 0.75) !important; border-radius: 20px;">
        
        <!-- TRẠNG THÁI (Header) -->
        <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom flex-shrink-0" style="border-color: rgba(239, 68, 68, 0.4) !important;">
            <div>${hp_html}</div>
            <div class="text-warning fw-extrabold fs-4 text-shadow" style="font-family: 'Courier New', Courier, monospace; line-height: 1;">
                ${displayCurrentScore} <span class="fs-6 text-white-50">/ 10đ</span>
            </div>
        </div>

        <!-- THANH ÁP LỰC -->
        <div class="d-flex align-items-center gap-2 mb-2 flex-shrink-0">
            <div class="progress flex-grow-1" style="height: 10px; background: rgba(255,255,255,0.1); border-radius: 10px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);">
                <div id="survival_time_bar" class="progress-bar bg-danger progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%; transition: width 0.1s linear;"></div>
            </div>
            <div class="text-danger fw-bold text-end" style="font-size: 1.1rem; min-width: 45px;" id="survival_time_text">10.0s</div>
        </div>

        <!-- CÂU HỎI -->
        <div class="flex-grow-1 d-flex flex-column justify-content-center overflow-auto custom-scrollbar mb-2" style="min-height: 0;">
            ${mediaHtml}
            <div class="text-white fw-bold px-2 text-center" style="line-height: 1.4; font-size: clamp(1.05rem, 3vh, 1.3rem); text-shadow: 0 2px 5px rgba(0,0,0,0.8);">
                ${qText}
            </div>
        </div>

        <!-- ĐÁP ÁN -->
        <div class="flex-shrink-0 mt-auto">
            ${optionsHtml}
        </div>
    </div>`;

    quizArea.innerHTML = html;

    if (window.MathJax) { 
        setTimeout(() => MathJax.typesetPromise([quizArea]).catch(e => console.log(e)), 50); 
    }

    window.start_survival_timer();
};

window.start_survival_timer = function() {
    if (window.survival_timer) clearInterval(window.survival_timer);
    
    let timeLeft = 10.0;
    let timeBar = document.getElementById('survival_time_bar');
    let timeText = document.getElementById('survival_time_text');

    window.survival_timer = setInterval(() => {
        timeLeft -= 0.1;
        
        if (timeBar) {
            let pct = (timeLeft / 10) * 100;
            timeBar.style.width = pct + '%';
            if (pct <= 30) timeBar.classList.replace('bg-danger', 'bg-warning');
        }
        if (timeText) timeText.innerText = Math.max(0, timeLeft).toFixed(1) + 's';

        if (timeLeft <= 0) {
            clearInterval(window.survival_timer);
            window.handle_survival_wrong(null);
        }
    }, 100);
};

window.check_survival_ans = function(opt_val, btnEl) {
    if (window.survival_timer) clearInterval(window.survival_timer);
    
    let q = window.questions[window.current_q_idx];
    let raw_ans = (q.a || q.answer || q[8] || '').toString().trim();
    
    let qType = String(q.type || "").toLowerCase().trim();
    let isTF = (qType === 'true_false' || qType === 'tf' || qType === 'đúng sai');

    const make_clean = (str) => {
        if (!str) return "";
        let s = String(str).replace(/^[A-D][\.\)]\s*/i, '').replace(/\{\{(.*?)::.*?::.*?\}\}/g, '$1').replace(/<[^>]*>/g, '');
        return s.toLowerCase().normalize('NFC').replace(/\\/g, '').replace(/\s+/g, '').replace(/["“”]/g, '');
    };

    let clean_correct = make_clean(raw_ans);
    let is_correct = false;

    if (isTF) {
        let is_true_ans = clean_correct === 'đúng' || clean_correct === 't' || clean_correct === 'true';
        let is_user_true = opt_val === 'đúng'; 
        if (is_true_ans === is_user_true) is_correct = true;
    } else {
        let user_text = "";
        if (opt_val === 0) user_text = q.optA || (q.opts ? q.opts[0] : "") || q[4] || "";
        if (opt_val === 1) user_text = q.optB || (q.opts ? q.opts[1] : "") || q[5] || "";
        if (opt_val === 2) user_text = q.optC || (q.opts ? q.opts[2] : "") || q[6] || "";
        if (opt_val === 3) user_text = q.optD || (q.opts ? q.opts[3] : "") || q[7] || "";

        let clean_user = make_clean(user_text);
        let is_letter_ans = /^[A-D]$/i.test(raw_ans);

        if (is_letter_ans) {
            let expected_letter = ['a','b','c','d'][opt_val];
            if (expected_letter === raw_ans.toLowerCase()) is_correct = true;
        } else {
            if (clean_user === clean_correct && clean_user !== "") is_correct = true;
        }
    }

    document.querySelectorAll('.survival-opt').forEach(b => b.style.pointerEvents = 'none');

    if (is_correct) {
        btnEl.classList.add('correct');
        window.survival_combo++;
        window.survival_correct_count++;
        
        // 🌟 CỘNG ĐIỂM THEO TỶ TRỌNG THẬT (TỐI ĐA 10 ĐIỂM)
        let pointAdded = window.survival_point_per_q || 0.5;
        window.survival_score = Math.min(10, window.survival_score + pointAdded);
        
        // 🌟 TÍNH TỌA ĐỘ NÚT BẤM ĐỂ HIỂN THỊ ĐIỂM BAY LÊN MƯỢT MÀ
        let rect = btnEl.getBoundingClientRect();
        let popText = document.createElement('div');
        popText.className = "survival-floating-score";
        popText.innerText = "+" + (Math.round(pointAdded * 10) / 10).toFixed(1) + "đ";
        
        // Cố định vị trí xuất phát ngay chính giữa nút bấm
        popText.style.left = (rect.left + rect.width / 2) + "px";
        popText.style.top = (rect.top + rect.height / 2) + "px";
        
        document.body.appendChild(popText);
        
        // Dọn dẹp DOM sau khi bay xong (1.1s)
        setTimeout(() => popText.remove(), 1100);
        
        setTimeout(() => {
            window.current_q_idx++;
            window.render_survival_question();
        }, 800);
    } else {
        if(btnEl) btnEl.classList.add('wrong');
        window.handle_survival_wrong(raw_ans);
    }
};

window.handle_survival_wrong = function(raw_ans) {
    window.survival_combo = 0; 
    window.survival_hp--;      

    let q = window.questions[window.current_q_idx];
    let qType = String(q.type || "").toLowerCase().trim();
    let isTF = (qType === 'true_false' || qType === 'tf' || qType === 'đúng sai');

    if (raw_ans || isTF) {
        let opts = document.querySelectorAll('.survival-opt');
        
        if (isTF) {
            const make_clean = (str) => { return String(str||"").toLowerCase().normalize('NFC').replace(/\\/g, '').replace(/\s+/g, '').replace(/["“”]/g, ''); };
            let c_ans = make_clean(raw_ans || q.a || q.answer || q[8] || "");
            let is_true_ans = c_ans === 'đúng' || c_ans === 't' || c_ans === 'true';
            let targetIdx = is_true_ans ? 0 : 1;
            if(opts[targetIdx]) opts[targetIdx].classList.add('correct');
        } 
        else if (raw_ans) {
            let is_letter_ans = /^[A-D]$/i.test(raw_ans);
            let targetIdx = -1;
            
            if (is_letter_ans) {
                targetIdx = ['a','b','c','d'].indexOf(raw_ans.toLowerCase());
            } else {
                const make_clean = str => String(str||"").replace(/^[A-D][\.\)]\s*/i, '').replace(/<[^>]*>/g, '').toLowerCase().normalize('NFC').replace(/\\/g, '').replace(/\s+/g, '').replace(/["“”]/g, '');
                let c_ans = make_clean(raw_ans);
                let oA = make_clean(q.optA || (q.opts ? q.opts[0] : "") || q[4]);
                let oB = make_clean(q.optB || (q.opts ? q.opts[1] : "") || q[5]);
                let oC = make_clean(q.optC || (q.opts ? q.opts[2] : "") || q[6]);
                let oD = make_clean(q.optD || (q.opts ? q.opts[3] : "") || q[7]);
                
                if (c_ans === oA) targetIdx = 0;
                else if (c_ans === oB) targetIdx = 1;
                else if (c_ans === oC) targetIdx = 2;
                else if (c_ans === oD) targetIdx = 3;
            }

            if (targetIdx !== -1 && opts[targetIdx]) {
                opts[targetIdx].classList.add('correct');
            }
        }
    }

    let quizArea = document.getElementById('quiz_area');
    
    if (window.survival_hp <= 0) {
        if (!window.survival_revived) {
            setTimeout(() => { window.show_revive_modal(); }, 1200);
        } else {
            setTimeout(() => { window.end_survival_game(); }, 1200);
        }
    } else {
        if (quizArea) {
            let panel = quizArea.querySelector('.glass-panel');
            panel.classList.add('animate__shakeX');
            panel.style.boxShadow = "0 0 50px rgba(239, 68, 68, 0.8)";
        }
        setTimeout(() => {
            window.current_q_idx++;
            window.render_survival_question();
        }, 1500);
    }
};

// =========================================================================
// 👼 GIAO DIỆN & CHỨC NĂNG HỒI SINH
// =========================================================================
window.show_revive_modal = function() {
    let quizArea = document.getElementById('quiz_area');
    
    quizArea.innerHTML = `
    <div class="glass-panel p-4 text-center shadow-lg border-warning mx-auto animate__animated animate__tada d-flex flex-column justify-content-center" style="max-width: 600px; height: 100%; max-height: 600px; background: rgba(40, 20, 0, 0.9) !important; border-width: 2px; border-radius: 20px;">
        <i class="bi bi-heart-pulse-fill text-warning mb-2 d-block" style="font-size: 5rem; text-shadow: 0 0 40px rgba(245, 158, 11, 0.8); animation: reviveHeart 1.5s infinite;"></i>
        <h2 class="text-warning fw-extrabold mb-2 text-uppercase" style="letter-spacing: 2px;">GỤC NGÃ?</h2>
        <p class="text-white mb-4" style="font-size: 1.1rem; line-height: 1.4;">Bạn đã mất hết tim, nhưng thần may mắn mỉm cười. Bạn có <b class="text-warning fs-5">1 CƠ HỘI HỒI SINH</b> duy nhất!</p>
        
        <div class="d-flex flex-column gap-2 mt-2">
            <button class="btn btn-warning rounded-pill fw-bold py-3 shadow-lg" onclick="window.execute_revive()" style="color: #000; font-size: 1.1rem; border: 2px solid #fff;">
                <i class="bi bi-lightning-charge-fill me-2"></i> HỒI SINH (+1 TIM)
            </button>
            <button class="btn btn-outline-secondary rounded-pill fw-bold py-2 mt-1" onclick="window.end_survival_game()">
                Chấp nhận thất bại
            </button>
        </div>
    </div>`;
};

window.execute_revive = function() {
    window.survival_revived = true; 
    window.survival_hp = 1;         
    window.current_q_idx++;         
    window.render_survival_question();
};

// =========================================================================
// 💀 KẾT THÚC GAME VÀ LƯU ĐIỂM
// =========================================================================
window.end_survival_game = function() {
    let quizArea = document.getElementById('quiz_area');
    
    let correct_count = window.survival_correct_count || 0;
    let total_count = window.questions.length;
    let score10 = total_count > 0 ? ((correct_count / total_count) * 10).toFixed(1) : "0.0";

    let recordData = {
        student_id: window.current_student_id || "Guest",
        fullname: window.current_student_name || "Khách",
        role: window.current_user_role || "guest",
        device_id: localStorage.getItem('mcq_device_id') || ('DEV_' + Math.floor(Math.random()*1000000)),
        subject: window.current_subject_key || window.current_subject || "Môn thi",
        lessons: window.selected_lessons_text || "Survival",
        login_time: window.login_time || new Date().toISOString(),
        start_time: (window.start_time instanceof Date) ? window.start_time.toISOString() : new Date().toISOString(),
        end_time: new Date().toISOString(),
        correct: correct_count,
        total: total_count,
        point: parseFloat(score10), 
        away_count: window.offense_count || 0,
        away_time: window.away_time_total || 0,
        browser: navigator.userAgent.substring(0, 50),
        is_study: true,
        is_retest: false,
        attempt: 1,
        time_details: "Sinh Tồn (" + score10 + "đ - Đúng " + correct_count + "/" + total_count + ")" 
    };
    
    // Đẩy điểm lên Supabase
    try {
        db.from('exam_results').insert([recordData]).then(({error}) => {
            if (error) console.error("Lỗi lưu điểm Sinh Tồn:", error);
            else console.log("✅ Đã lưu điểm Sinh Tồn lên Supabase!");
        });
    } catch (e) {}

    quizArea.innerHTML = `
    <div class="glass-panel p-4 text-center shadow-lg border-danger mx-auto animate__animated animate__bounceIn d-flex flex-column justify-content-center" style="max-width: 600px; height: 100%; max-height: 600px; background: rgba(20, 0, 0, 0.9) !important; border-width: 2px; border-radius: 20px;">
        <i class="bi bi-skull-fill text-danger mb-2 d-block animate__animated animate__pulse animate__infinite" style="font-size: 4.5rem; text-shadow: 0 0 30px rgba(239, 68, 68, 0.8);"></i>
        <h2 class="text-danger fw-extrabold mb-1 text-uppercase" style="letter-spacing: 2px;">TỔNG KẾT</h2>
        <p class="text-white-50 mb-3 fs-6">Vượt qua: <b class="text-success">${correct_count}/${total_count}</b> câu hỏi!</p>
        
        <div class="p-3 mb-4 rounded-4 flex-grow-1 d-flex flex-column justify-content-center" style="background: rgba(255,255,255,0.05); border: 1px dashed rgba(239, 68, 68, 0.5);">
            <div class="text-white-50 fw-bold mb-1" style="letter-spacing: 1px; font-size: 1rem;">ĐIỂM SỐ SINH TỒN</div>
            <div class="display-2 fw-bold text-warning text-shadow" style="font-family: 'Courier New', monospace; line-height: 1;">${score10} <span class="fs-4 text-white-50">/ 10</span></div>
        </div>

        <button class="btn btn-warning rounded-pill fw-bold w-100 shadow-lg py-3 mt-auto" onclick="window.retry_survival()" style="color: #000; border-width: 2px; font-size: 1.1rem;">
            <i class="bi bi-fire me-2"></i> PHỤC THÙ (CHƠI LẠI TỪ ĐẦU)
        </button>
    </div>`;

    if (parseFloat(score10) >= 8.0 && typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#ef4444', '#f59e0b', '#4ade80'] });
    }
};

window.retry_survival = function() {
    window.questions.sort(() => Math.random() - 0.5);
    window.init_survival_engine();
};