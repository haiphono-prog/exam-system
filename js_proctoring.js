// =========================================================================
// 🛡️ BỘ CÔNG CỤ BẢO MẬT & CHỐNG GIAN LẬN (PROCTORING ENGINE)
// =========================================================================

window.proctoring_state = {
    is_active: false,
    exam_code: null
};

// 1. ÉP VÀO CHẾ ĐỘ TOÀN MÀN HÌNH (FULLSCREEN)
window.enable_fullscreen = function() {
    let elem = document.documentElement;
    if (elem.requestFullscreen) { elem.requestFullscreen().catch(err => console.log(err)); } 
    else if (elem.webkitRequestFullscreen) { elem.webkitRequestFullscreen().catch(err => console.log(err)); } 
    else if (elem.msRequestFullscreen) { elem.msRequestFullscreen().catch(err => console.log(err)); }
};

// 2. LẮNG NGHE SỰ KIỆN THOÁT TOÀN MÀN HÌNH
document.addEventListener('fullscreenchange', check_fullscreen);
document.addEventListener('webkitfullscreenchange', check_fullscreen);
document.addEventListener('mozfullscreenchange', check_fullscreen);
document.addEventListener('MSFullscreenChange', check_fullscreen);

function check_fullscreen() {
    if (!window.proctoring_state.is_active) return; // Chỉ giám sát khi đang thi thật

    let isFull = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    
    if (!isFull) {
        window.offense_count = (window.offense_count || 0) + 1;
        if (typeof window.play_sound === 'function') window.play_sound('error');
        
        let msg = `CẢNH BÁO VI PHẠM LẦN ${window.offense_count}: Bạn vừa thoát chế độ Toàn màn hình! Yêu cầu quay lại bài thi ngay lập tức.`;
        window.show_alert("⛔ VI PHẠM QUY CHẾ THI", msg, function() {
            window.enable_fullscreen();
        });
        
        // 🌟 ĐÃ XÓA LUẬT TỰ ĐỘNG THU BÀI SAU 3 LẦN THOÁT FULLSCREEN
    }
}

// =========================================================================
// 💾 CƠ CHẾ LƯU NHÁP TỰ ĐỘNG (AUTO-SAVE) & HỒI SINH
// =========================================================================
window.auto_save_exam_draft = function() {
    if (!window.proctoring_state.is_active || !window.proctoring_state.exam_code) return;
    if (!window.questions || window.questions.length === 0) return;

    let draftData = {
        time_left: window.time_left,
        saved_at: new Date().getTime(), // 🌟 LƯU LẠI CHÍNH XÁC MỐC GIỜ LÚC THOÁT RA
        questions_state: window.questions.map(q => ({
            id: q.id,
            ans_user: q.ans_user,
            done: q.done,
            is_correct: q.is_correct
        }))
    };
    localStorage.setItem('exam_draft_' + window.proctoring_state.exam_code, JSON.stringify(draftData));
};

window.restore_exam_draft = function(examCode) {
    let savedDraft = localStorage.getItem('exam_draft_' + examCode);
    if (!savedDraft) return false;

    try {
        let draftData = JSON.parse(savedDraft);
        draftData.questions_state.forEach(draftQ => {
            let realQ = window.questions.find(q => q.id === draftQ.id);
            if (realQ) {
                realQ.ans_user = draftQ.ans_user;
                realQ.done = draftQ.done;
                realQ.is_correct = draftQ.is_correct;
            }
        });

        // 🌟 TÍNH TOÁN LẠI SỐ GIÂY ĐÃ TRÔI QUA KHI SINH VIÊN Ở NGOÀI MENU
        let now = new Date().getTime();
        let savedTime = draftData.saved_at || now; 
        let elapsedSeconds = Math.floor((now - savedTime) / 1000);
        
        // Trừ đúng số giây đã trốn ra ngoài + 5 giây hình phạt
        window.time_left = draftData.time_left - elapsedSeconds - 5; 
        window.is_resumed_exam = true; // 🌟 Gắn cờ báo hiệu đây là bài thi khôi phục
        
        return true;
    } catch(e) {
        return false;
    }
};

// 🌟 HÀM MỚI: PHỤC HỒI MÀU SẮC GIAO DIỆN SAU KHI VẼ CÂU HỎI
window.re_apply_visual_answers = function() {
    if (!window.questions) return;
    window.questions.forEach((q, i) => {
        if (!q.done || !q.ans_user) return;
        
        let card = document.querySelector(`.question-card-tracker[data-q-idx="${i}"]`);
        if (!card) return;
        
        let cType = q.type ? String(q.type).toLowerCase().trim() : '';
        
        // 1. Dạng Trắc nghiệm / Đúng sai
        if (cType === 'single' || cType === 'mcq' || cType === 'true_false' || cType === 'tf' || cType === 'đúng sai') {
            let btns = card.querySelectorAll('.option-btn, .glass-option-btn, .ui1-option-btn, .ui2-option-btn, .ui3-option-btn');
            let uAns = String(q.ans_user).trim().toLowerCase();
            
            btns.forEach(b => {
                let match = (b.getAttribute('onclick')||"").match(/set_ans\([^,]+,\s*(?:decodeURIComponent\()?['"]([^'"]+)['"]/);
                let bVal = match ? decodeURIComponent(match[1]).trim().toLowerCase() : b.innerText.trim().toLowerCase();
                if (bVal === uAns) {
                    b.classList.add('selected'); // 🌟 TÔ LẠI MÀU CHO NÚT ĐÁP ÁN
                }
            });
        } 
        // 2. Dạng Điền khuyết
        else if (cType === 'fill' || cType === 'short' || cType === 'điền khuyết') {
            let inputs = card.querySelectorAll('input[type="text"]');
            if (Array.isArray(q.ans_user)) {
                inputs.forEach((inp, idx) => {
                    if (q.ans_user[idx]) {
                        inp.value = q.ans_user[idx];
                        inp.style.width = ((inp.value.length + 1) * 10) + 'px'; // Kéo dài ô nháp
                    }
                });
            }
        } 
        // 3. Dạng Hotspot (Tìm vị trí trên ảnh)
        else if (cType === 'hotspot') {
            let container = card.querySelector('.position-relative');
            if (container && typeof q.ans_user === 'string') {
                let taps = q.ans_user.split('|').filter(a => a.trim() !== '');
                taps.forEach(tap => {
                    let parts = tap.split(',');
                    let x = parts[0], y = parts[1];
                    let tapHtml = `<div class="position-absolute translate-middle" style="left:${x}%; top:${y}%; width:24px; height:24px; background:radial-gradient(circle, #3b82f6 40%, transparent 60%); border:2px solid #fff; border-radius:50%; box-shadow:0 0 10px rgba(59,130,246,0.8); pointer-events:none; z-index:10;"></div>`;
                    container.insertAdjacentHTML('beforeend', tapHtml);
                });
            }
        }
        // 4. Dạng Sắp xếp quy trình
        else if (cType === 'arrange' || cType === 'sắp xếp') {
            if (Array.isArray(q.ans_user)) {
                let resBox = document.getElementById(`arrange_result_${i}`);
                if (resBox) {
                    q.ans_user.forEach(val => {
                        let badge = document.createElement('span');
                        badge.className = "badge bg-info text-dark me-1 mb-1 shadow-sm";
                        badge.innerText = val;
                        resBox.appendChild(badge);
                    });
                }
                let poolBtns = card.querySelectorAll(`[id^="arrange_pool_"] button`);
                poolBtns.forEach(btn => {
                    let badgeVal = btn.querySelector('.badge') ? btn.querySelector('.badge').innerText : '';
                    if (q.ans_user.includes(badgeVal)) {
                        btn.style.opacity = '0.2'; 
                        btn.style.pointerEvents = 'none';
                    }
                });
            }
        }
    });
    
    if (typeof window.update_progress_bar === 'function') window.update_progress_bar();
};

window.clear_exam_draft = function() {
    if (window.proctoring_state.exam_code) {
        localStorage.removeItem('exam_draft_' + window.proctoring_state.exam_code);
    }
    window.proctoring_state.is_active = false;
};