window.clip_temp_base64 = ""; window.clip_pending_list = []; window.clip_edit_index = -1;

window.open_clip_creator_modal = function() {
    let oldModal = document.getElementById('clip_creator_modal');
    if(oldModal) oldModal.remove();

    window.clip_temp_base64 = ""; window.clip_pending_list = []; window.clip_edit_index = -1;
    let currentLessonNum = window.selected_lessons_text || "1";
    let currentLessonName = window.lessonNames?.[window.current_subject]?.[currentLessonNum] || "";

    let modalHtml = `
    <div id="clip_creator_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 28000; backdrop-filter: blur(10px); padding: 15px;">
        
        <div class="glass-panel p-2 p-md-3 shadow-lg w-100 h-100 d-flex flex-column flex-lg-row gap-3" style="max-width: 1400px; max-height: 96vh; border-radius: 16px; background: rgba(15, 23, 42, 0.95) !important; border: 1px solid #0ea5e9;">
            
            <!-- 🌟 CỘT TRÁI (7 PHẦN): VIDEO BẤM LÀ TẢI -->
            <div class="flex-grow-1 h-100 bg-dark rounded-3 border border-secondary position-relative d-flex flex-column align-items-center justify-content-center overflow-hidden p-0">
                <input type="file" id="clip_file_input" class="d-none" accept="video/mp4" onchange="window.preview_clip_video(this)">
                
                <label for="clip_file_input" id="clip_upload_label" class="w-100 h-100 d-flex flex-column align-items-center justify-content-center" style="cursor: pointer;">
                    <i class="bi bi-cloud-arrow-up text-info" style="font-size: 5rem;"></i>
                    <div class="mt-2 fw-bold text-white-50 fs-5">Bấm vào đây để tải Clip MP4</div>
                </label>
                
                <div id="clip_vid_container" class="w-100 h-100 d-none flex-column">
                    <video id="clip_vid_preview" src="" controls playsinline style="width: 100%; max-height: 85vh; background: #000; outline: none; border-radius: 8px 8px 0 0;" ontimeupdate="document.getElementById('clip_current_time').innerText = this.currentTime.toFixed(1) + 's'"></video>
                    <div class="d-flex justify-content-between align-items-center p-2 bg-dark border-top border-secondary rounded-bottom">
                        <span class="text-warning fw-bold font-monospace ms-2 fs-5" id="clip_current_time">0.0s</span>
                        <label for="clip_file_input" class="btn btn-sm btn-outline-light m-0"><i class="bi bi-arrow-repeat me-1"></i>Đổi Clip khác</label>
                    </div>
                </div>
            </div>

            <!-- 🌟 CỘT PHẢI (3 PHẦN): BẢNG SOẠN THẢO SIÊU TỐC -->
            <div class="d-flex flex-column h-100" style="width: 100%; max-width: 380px; flex-shrink: 0;">
                
                <div class="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom border-secondary">
                    <div class="d-flex gap-1 w-100 me-2">
                        <input type="text" id="clip_lesson" class="text-info fw-bold px-1 py-1 text-center glass-input-style" style="width: 50px; font-size: 0.8rem;" value="${currentLessonNum}">
                        <input type="text" id="clip_lessonname" class="text-white fw-bold px-2 py-1 flex-grow-1 glass-input-style" style="font-size: 0.8rem;" value="${currentLessonName}" placeholder="Tên bài học...">
                    </div>
                    <button class="btn-close btn-close-white" style="font-size: 0.7rem;" onclick="document.getElementById('clip_creator_modal').remove()"></button>
                </div>

                <div class="p-2 rounded mb-2 shadow-sm d-flex flex-column" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); flex: 1.2;">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="badge bg-secondary">Nhập thời gian (s)</span>
                        <div class="d-flex gap-1">
                            <button type="button" class="btn btn-sm btn-warning rounded-circle shadow p-0 d-flex align-items-center justify-content-center" onmousedown="event.preventDefault(); window.make_vocab_tag();" title="Bọc IPA" style="width: 24px; height: 24px;"><i class="bi bi-magic" style="font-size: 0.8rem; color:#fff;"></i></button>
                            <button type="button" class="btn btn-sm rounded-circle shadow p-0 d-flex align-items-center justify-content-center" onclick="window.generate_clip_ai()" title="Gọi AI" style="width: 24px; height: 24px; background: linear-gradient(135deg, #2563eb, #a855f7, #db2777); color: white;"><i class="bi bi-stars" style="font-size: 0.8rem;"></i></button>
                        </div>
                    </div>
                    
                    <div class="d-flex gap-1 mb-1">
                        <input type="number" id="clip_time_start" class="form-control form-control-sm text-center text-warning fw-bold glass-input-style" placeholder="Từ giây (VD: 0)">
                        <input type="number" id="clip_time_end" class="form-control form-control-sm text-center text-warning fw-bold glass-input-style" placeholder="Đến giây (VD: 2.5)">
                        <button class="btn btn-sm btn-outline-info p-0 px-2 fw-bold text-nowrap" onclick="window.capture_vid_time()"><i class="bi bi-stopwatch"></i> BẮT</button>
                    </div>

                    <textarea id="clip_question" class="form-control text-white glass-input-style mb-1 custom-scrollbar flex-grow-1" style="font-size: 0.85rem; resize: none;" placeholder="Nhập câu tiếng Anh... (Hoặc dán toàn bộ đoạn kịch bản vào đây)"></textarea>
                    <textarea id="clip_hint" class="form-control form-control-sm text-success glass-input-style custom-scrollbar mb-1" rows="1" style="font-size: 0.8rem; resize: none;" placeholder="Nghĩa tiếng Việt..."></textarea>
                    
                    <div class="d-flex gap-1 mt-1">
                        <button id="btn_cancel_edit" class="btn btn-secondary d-none fw-bold" style="border-radius: 6px; width: 40px;" onclick="window.cancel_edit_clip()"><i class="bi bi-x-lg"></i></button>
                        <button id="btn_add_clip" class="btn btn-info flex-grow-1 shadow-sm fw-bold text-dark d-flex align-items-center justify-content-center" style="border-radius: 6px; height: 36px;" onclick="window.add_clip_to_list()">
                            <i class="bi bi-plus-lg me-2 fs-5"></i> THÊM CÂU HỎI
                        </button>
                    </div>
                </div>

                <!-- DANH SÁCH -->
                <div class="flex-grow-1 p-1 rounded custom-scrollbar" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); overflow-y: auto;">
                    <div id="clip_pending_list_container"><div class="text-center text-white-50 small mt-4">Danh sách chờ trống...</div></div>
                </div>

                <!-- FOOTER -->
                <div class="d-flex justify-content-between align-items-center pt-2 mt-2 border-top border-secondary position-relative" style="min-height: 45px;">
                    <div class="text-info fw-bold ms-2 fs-6" id="clip_total_badge">0 Câu</div>
                    <button id="btn_save_all_clips" class="btn btn-danger shadow-sm p-0 z-1 d-flex align-items-center justify-content-center" style="border-radius: 8px; width: 70px; height: 38px;" onclick="window.submit_all_clips()" title="Lưu lên ngân hàng">
                        <i class="bi bi-cloud-arrow-up-fill fs-3"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.preview_clip_video = function(input) {
    if (input.files && input.files[0]) {
        let file = input.files[0]; if (file.size > 15 * 1024 * 1024) return window.show_toast("⚠️ File Video quá lớn!", true);
        let reader = new FileReader();
        reader.onload = function(e) {
            window.clip_temp_base64 = e.target.result; window.clip_current_video_id = null;
            let vid = document.getElementById('clip_vid_preview'); vid.src = e.target.result;
            document.getElementById('clip_upload_label').classList.add('d-none');
            document.getElementById('clip_vid_container').classList.remove('d-none');
            document.getElementById('clip_vid_container').classList.add('d-flex');
        }; reader.readAsDataURL(file);
    }
};

window.capture_vid_time = function() {
    let vid = document.getElementById('clip_vid_preview');
    if(!vid || !vid.src) return window.show_toast("⚠️ Chưa tải Video!", true);
    let t = vid.currentTime;
    let sInput = document.getElementById('clip_time_start'); let eInput = document.getElementById('clip_time_end');
    if(!sInput.value) sInput.value = Math.max(0, t - 2).toFixed(1);
    eInput.value = t.toFixed(1);
};

function timeToSec(str) { let p = str.split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); }

window.add_clip_to_list = function() {
    let qText = document.getElementById('clip_question').value.trim();
    let hintText = document.getElementById('clip_hint').value.trim();
    let sTime = document.getElementById('clip_time_start').value.trim();
    let eTime = document.getElementById('clip_time_end').value.trim();

    // KIỂM TRA XEM THẦY CÓ DÁN NGUYÊN KỊCH BẢN TEXT VÀO KHÔNG
    if(qText.includes(" - ") && qText.includes(":")) {
        let lines = qText.split('\n'); let parsed = 0;
        lines.forEach(line => {
            let match = line.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}):\s*(.*?)\s*\((.*?)\)/);
            if(match) {
                window.clip_pending_list.push({ start: timeToSec(match[1]), end: timeToSec(match[2]), en: match[3].trim(), vi: match[4].trim() });
                parsed++;
            }
        });
        if(parsed > 0) {
            window.show_toast(`✅ Đã bóc tách tự động ${parsed} câu từ Kịch bản!`);
            document.getElementById('clip_question').value = ""; document.getElementById('clip_hint').value = ""; window.render_clip_pending_list(); return;
        }
    }

    if (!qText || !sTime || !eTime) return window.show_toast("⚠️ Vui lòng nhập thời gian và câu hỏi!", true);

    let item = { start: parseFloat(sTime), end: parseFloat(eTime), en: qText, vi: hintText };
    
    if (window.clip_edit_index > -1) {
        window.clip_pending_list[window.clip_edit_index] = item;
        window.clip_edit_index = -1;
        document.getElementById('btn_add_clip').innerHTML = '<i class="bi bi-plus-lg me-2 fs-5"></i> THÊM CÂU HỎI';
        document.getElementById('btn_add_clip').classList.replace('btn-success', 'btn-info');
        document.getElementById('btn_cancel_edit').classList.add('d-none');
    } else {
        window.clip_pending_list.push(item);
    }
    
    document.getElementById('clip_question').value = ""; document.getElementById('clip_hint').value = "";
    document.getElementById('clip_time_start').value = ""; document.getElementById('clip_time_end').value = "";
    window.render_clip_pending_list();
};

window.edit_clip_from_list = function(idx) {
    let item = window.clip_pending_list[idx];
    document.getElementById('clip_question').value = item.en; document.getElementById('clip_hint').value = item.vi;
    document.getElementById('clip_time_start').value = item.start; document.getElementById('clip_time_end').value = item.end;
    window.clip_edit_index = idx;
    let btn = document.getElementById('btn_add_clip');
    btn.innerHTML = '<i class="bi bi-check-lg me-2 fs-5"></i> CẬP NHẬT';
    btn.classList.replace('btn-info', 'btn-success');
    document.getElementById('btn_cancel_edit').classList.remove('d-none');
};

window.cancel_edit_clip = function() {
    window.clip_edit_index = -1;
    document.getElementById('clip_question').value = ""; document.getElementById('clip_hint').value = "";
    document.getElementById('clip_time_start').value = ""; document.getElementById('clip_time_end').value = "";
    let btn = document.getElementById('btn_add_clip');
    btn.innerHTML = '<i class="bi bi-plus-lg me-2 fs-5"></i> THÊM CÂU HỎI';
    btn.classList.replace('btn-success', 'btn-info');
    document.getElementById('btn_cancel_edit').classList.add('d-none');
};

window.remove_clip_from_list = function(idx) {
    window.clip_pending_list.splice(idx, 1); window.cancel_edit_clip(); window.render_clip_pending_list();
};

window.render_clip_pending_list = function() {
    let container = document.getElementById('clip_pending_list_container');
    document.getElementById('clip_total_badge').innerText = `${window.clip_pending_list.length} Câu`;
    if (window.clip_pending_list.length === 0) { container.innerHTML = `<div class="text-center text-white-50 small mt-4">Danh sách chờ trống...</div>`; return; }
    
    let html = ''; 
    window.clip_pending_list.forEach((item, index) => {
        let isEditing = (index === window.clip_edit_index);
        html += `
        <div class="d-flex align-items-center justify-content-between p-1 px-2 mb-1 rounded border shadow-sm ${isEditing ? 'bg-secondary border-warning' : 'bg-dark border-secondary'}">
            <div class="d-flex align-items-center flex-grow-1 overflow-hidden">
                <span class="badge bg-danger text-white rounded-pill me-2 shadow-sm" style="font-size: 0.65rem;">${item.start}-${item.end}s</span>
                <div class="text-white small text-truncate" style="font-size: 0.8rem;" title="${item.en}">${item.en}</div>
            </div>
            <div class="d-flex ms-2">
                <button class="btn btn-sm text-warning p-0 me-2 border-0 bg-transparent" onclick="window.edit_clip_from_list(${index})" title="Sửa"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-sm text-danger p-0 border-0 bg-transparent" onclick="window.remove_clip_from_list(${index})" title="Xóa"><i class="bi bi-trash3-fill"></i></button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
};

window.generate_clip_ai = function() {
    let qInput = document.getElementById('clip_question'); let hintInput = document.getElementById('clip_hint'); let keyword = qInput.value.trim();
    if (!keyword) return window.show_toast("⚠️ Hãy nhập nhiệm vụ / kịch bản vào ô rồi bấm AI!", true);
    qInput.value = "⏳ AI đang xử lý...";
    google.script.run.withSuccessHandler(res => { if(res.success){ qInput.value = res.q; hintInput.value = res.hint; window.show_toast("🪄 Xong!"); } else { qInput.value = keyword; window.show_toast("❌ Lỗi AI", true); } }).generateClipAI(keyword);
};

window.submit_all_clips = function() {
    if (!window.clip_temp_base64) return window.show_toast("⚠️ Thầy chưa tải Video lên!", true);
    if (window.clip_pending_list.length === 0) return window.show_toast("⚠️ Danh sách chờ đang trống!", true);
    
    let btn = document.getElementById('btn_save_all_clips'); btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`; btn.classList.add('disabled');

    let qArr=[], hintArr=[], ansArr=[], optAArr=[], optBArr=[], optCArr=[], optDArr=[];

    window.clip_pending_list.forEach((item, idx) => {
        let distractors = window.clip_pending_list.filter((_, i) => i !== idx).map(o => o.en);
        distractors = distractors.sort(() => 0.5 - Math.random());
        let choices = [item.en, distractors[0]||"Nghe lại...", distractors[1]||"Không rõ", distractors[2]||"Bỏ qua"];
        choices = choices.sort(() => 0.5 - Math.random());
        let correctLetter = choices.indexOf(item.en) === 0 ? 'A' : (choices.indexOf(item.en) === 1 ? 'B' : (choices.indexOf(item.en) === 2 ? 'C' : 'D'));

        qArr.push(item.en); hintArr.push(item.vi); 
        
        // 🌟 BẢO MẬT DỮ LIỆU: GÓI THỜI GIAN VÀ ĐÁP ÁN VÀO 1 CHUỖI ĐỂ TRÁNH SHEETS XÓA MẤT (VD: 0|2#A)
        let combinedAns = `${item.start}|${item.end}#${correctLetter}`;
        ansArr.push(combinedAns);
        
        optAArr.push(choices[0]); optBArr.push(choices[1]); optCArr.push(choices[2]); optDArr.push(choices[3]);
    });

    let lesson = document.getElementById('clip_lesson').value.trim();
    let lessonname = document.getElementById('clip_lessonname').value.trim();

    let finalizeSave = async function(videoUrl) {
        let payload = {
            subject_key: window.current_subject || window.temp_subject_key || 'tienganh',
            lesson: lesson, type: "clip_listen", level: 2, 
            q: qArr.join(" ||| "), hint: hintArr.join(" ||| "), 
            a: ansArr.join(" ||| "), answer: ansArr.join(" ||| "), 
            opta: optAArr.join(" ||| "), optb: optBArr.join(" ||| "), optc: optCArr.join(" ||| "), optd: optDArr.join(" ||| "),
            lessonname: lessonname, image: videoUrl, original_q: "Interactive Listening"
        };

        try {
            const { error } = await db.from('questions').insert([payload]);
            if (error) throw error;
            window.show_toast(`🎉 Đã đẩy Kịch bản ${window.clip_pending_list.length} câu lên Supabase!`); 
            document.getElementById('clip_creator_modal').remove(); 
            if (typeof render_admin_panel === 'function') render_admin_panel();
        } catch (err) {
            window.show_toast("❌ Lỗi lưu dữ liệu: " + err.message, true); 
            btn.innerHTML = `<i class="bi bi-cloud-arrow-up-fill fs-3"></i>`; btn.classList.remove('disabled');
        }
    };

    // Đẩy video lên Supabase Storage
    (async function uploadVideo() {
        try {
            let res = await fetch(window.clip_temp_base64);
            let blob = await res.blob();
            let fileName = `clip_${Date.now()}.mp4`;
            
            const { data, error } = await db.storage.from('media').upload(fileName, blob);
            if (error) throw error;
            
            let publicUrl = db.storage.from('media').getPublicUrl(fileName).data.publicUrl;
            finalizeSave(publicUrl);
        } catch (err) {
            window.show_toast("❌ Lỗi tải Video lên Supabase: " + err.message, true); 
            btn.innerHTML = `<i class="bi bi-cloud-arrow-up-fill fs-3"></i>`; btn.classList.remove('disabled');
        }
    })();
};