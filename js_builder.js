// =========================================================================
// ✍️ MODULE TRẠM DỊCH THUẬT & THÊM CÂU HỎI (UI SUPER APP - V8 FULL TRÀN VIỀN)
// =========================================================================
window.trans_sentences_data = [];
window.single_trans_timers = {}; 

window.openBuilderModule = function() {
    if (typeof closeReelsModule === 'function') closeReelsModule();
    if (typeof closePhanXaModule === 'function') closePhanXaModule();

    let wrapper = document.getElementById('module_builder_wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'module_builder_wrapper';
        
        wrapper.className = 'position-fixed w-100 animate__animated animate__fadeInUp';
        wrapper.style.cssText = 'top: 0; bottom: 0; left: 0; right: 0; background: #121212; z-index: 99999; overflow: hidden; display: none; flex-direction: column;';
        
        wrapper.innerHTML = `
        <style>
            .no-scrollbar::-webkit-scrollbar { display: none !important; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            
            .editable-box {
                min-height: 50px; 
                max-height: 250px; 
                overflow-y: auto; 
                word-break: break-word; 
                white-space: pre-wrap; 
                outline: none !important; 
                box-shadow: none !important;
                transition: background 0.2s;
                font-size: 1rem;
            }
            .editable-box:focus { background: rgba(14, 165, 233, 0.05) !important; }
        </style>

        <!-- HEADER -->
        <div class="d-flex px-2 py-2 border-bottom border-secondary bg-dark flex-shrink-0 align-items-center" style="padding-top: max(env(safe-area-inset-top), 0.5rem) !important;">
            <button type="button" onclick="document.getElementById('module_builder_wrapper').style.display='none'; document.body.style.overflow='';" class="btn btn-sm text-light fw-bold d-flex align-items-center p-2 bg-transparent border-0 shadow-none position-relative" style="z-index: 1050;">
                <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
            </button>
            <h6 class="fw-bold mb-0 text-truncate flex-grow-1 text-center text-info" style="letter-spacing: 0.5px; font-size: 1.1rem; margin-right: 40px;">
                TRẠM DỊCH & BÓC TÁCH
            </h6>
        </div>

        <!-- BODY: Ẩn thanh cuộn -->
        <div class="flex-grow-1 overflow-auto no-scrollbar bg-black d-flex flex-column pb-4">
            
            <!-- VĂN BẢN GỐC & DỊCH TỔNG QUAN -->
            <div class="row g-0 flex-shrink-0">
                <div class="col-md-6 border-bottom border-secondary">
                    <div class="d-flex flex-column h-100 bg-dark position-relative">
                        <div class="badge bg-secondary bg-opacity-50 text-info position-absolute top-0 start-0 m-2 ms-3" style="font-size:0.7rem; z-index:2;">VĂN BẢN GỐC</div>
                        <textarea id="raw_trans_input" class="form-control border-0 bg-transparent text-white px-3 py-4 pt-5 no-scrollbar flex-grow-1 shadow-none" style="resize:none; min-height: 140px; border-radius: 0; font-size: 1rem;" placeholder="Dán văn bản vào đây..." oninput="window.auto_translate_on_type()"></textarea>
                    </div>
                </div>
                <div class="col-md-6 border-bottom border-secondary">
                    <div class="d-flex flex-column h-100 bg-dark position-relative">
                        <div class="badge bg-secondary bg-opacity-50 text-warning position-absolute top-0 start-0 m-2 ms-3" style="font-size:0.7rem; z-index:2;">BẢN DỊCH AI</div>
                        <textarea id="full_trans_output" class="form-control border-0 bg-transparent text-warning px-3 py-4 pt-5 no-scrollbar flex-grow-1 shadow-none" style="resize:none; min-height: 140px; border-radius: 0; font-size: 1rem;" placeholder="Kết quả tự dịch..." readonly></textarea>
                    </div>
                </div>
            </div>

            <!-- BẢNG BÓC TÁCH CHI TIẾT (XÓA PADDING ĐỂ TRÀN VIỀN 100%) -->
            <div class="d-flex flex-column flex-grow-1 mt-3">
                <div class="d-flex justify-content-between align-items-center mb-3 px-3">
                    <div class="text-white fw-bold"><i class="bi bi-collection-fill text-info me-2"></i>THẺ BÓC TÁCH</div>
                    <span class="badge bg-dark border border-secondary text-white-50 fw-normal">Vuốt để xem • Sửa tự dịch</span>
                </div>
                
                <!-- CONTAINER CHỨA CÁC CARD -->
                <div id="trans_table_body" class="d-flex flex-column gap-3 pb-3 w-100">
                    <div class="text-center text-white-50 py-5 bg-dark border-top border-bottom border-secondary w-100 shadow-sm">Chưa có dữ liệu bóc tách</div>
                </div>
            </div>
        </div>

        <!-- FOOTER: Nút chốt đáy -->
        <div class="d-flex w-100 bg-dark border-top border-secondary flex-shrink-0" style="padding-bottom: env(safe-area-inset-bottom); position: relative; z-index: 1050;">
            <button type="button" onclick="window.save_full_paragraph()" class="btn py-3 fw-bold flex-grow-1 d-flex justify-content-center align-items-center text-warning bg-dark border-0 border-end border-secondary rounded-0" style="letter-spacing: 0.5px;">
                <i class="bi bi-file-earmark-text-fill fs-5"></i> 
                <span class="ms-2 d-none d-sm-inline">LƯU ĐOẠN</span>
                <span class="ms-2 d-inline d-sm-none">LƯU ĐOẠN</span>
            </button>
            <button type="button" onclick="window.save_all_sentences()" class="btn py-3 fw-bold flex-grow-1 d-flex justify-content-center align-items-center text-success bg-dark border-0 rounded-0" style="letter-spacing: 0.5px;">
                <i class="bi bi-cloud-arrow-up-fill fs-5"></i> 
                <span class="ms-2 d-none d-sm-inline">LƯU TẤT CẢ CÂU</span>
                <span class="ms-2 d-inline d-sm-none">LƯU CÂU</span>
            </button>
        </div>
        `;
        document.body.appendChild(wrapper);
    }
    
    wrapper.style.display = 'flex'; 
    document.body.style.overflow = 'hidden';
    document.getElementById('fab_menu_items').classList.add('d-none');
    
    if(window.selected_lessons_text) window.show_toast("📍 Đang thao tác trên Bài: " + window.selected_lessons_text);
};

// =========================================================================
// LOGIC DỊCH THUẬT & RENDER GIAO DIỆN
// =========================================================================

window.process_split_sentences = async function() {
    let rawText = document.getElementById('raw_trans_input').value.trim();
    if (!rawText) {
        window.trans_sentences_data = [];
        window.render_trans_table();
        return;
    }
    
    let isVietnamese = /[àáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳýỹỷỵ]/i.test(rawText);
    let targetLang = isVietnamese ? 'en' : 'vi'; 

    let matched = rawText.match(/[^.!?;\/\n]+[.!?;\/\n]*/g);
    let sentences = matched ? matched.map(s => s.trim()).filter(s => s.length > 0) : [rawText];
    
    window.trans_sentences_data = sentences.map(s => ({ original: s, translated: "⏳ Đang dịch...", isSaved: false }));
    window.render_trans_table();
    
    for (let i = 0; i < window.trans_sentences_data.length; i++) {
        let text = window.trans_sentences_data[i].original;
        try {
            let res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
            let data = await res.json();
            window.trans_sentences_data[i].translated = data[0].map(x => x[0]).join('');
        } catch (e) {
            window.trans_sentences_data[i].translated = "❌ Lỗi mạng, không thể dịch.";
        }
        window.render_trans_table(); 
    }
    
    try {
        let resTotal = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(rawText)}`);
        let dataTotal = await resTotal.json();
        document.getElementById('full_trans_output').value = dataTotal[0].map(x => x[0]).join('');
    } catch(e) {}
};

// 🌟 HÀM RENDER THẺ TRÀN VIỀN (XÓA BO GÓC, CHỈ CÓ VIỀN TRÊN DƯỚI)
window.render_trans_table = function() {
    let container = document.getElementById('trans_table_body');
    if (window.trans_sentences_data.length === 0) { 
        container.innerHTML = `<div class="text-center text-white-50 py-5 bg-dark border-top border-bottom border-secondary w-100 shadow-sm">Chưa có dữ liệu bóc tách</div>`; 
        return; 
    }
    
    let html = '';
    window.trans_sentences_data.forEach((item, index) => {
        let borderClass = item.isSaved ? 'border-success' : 'border-secondary';
        let shadowClass = item.isSaved ? 'shadow-lg' : 'shadow-sm';
        
        // Thêm rounded-0 và chỉ dùng border-top border-bottom
        html += `
        <div class="d-flex flex-column bg-dark border-top border-bottom ${borderClass} ${shadowClass} overflow-hidden rounded-0">
            <!-- THANH ĐIỀU KHIỂN CỦA CARD -->
            <div class="d-flex justify-content-between align-items-center px-3 py-2 bg-black bg-opacity-25 border-bottom border-secondary">
                <span class="badge bg-black text-info fw-bold px-2 py-1 fs-6">Câu ${index + 1}</span>
                <div class="d-flex gap-2">
                    ${item.isSaved 
                        ? '<span class="badge bg-success d-flex align-items-center px-2 py-1"><i class="bi bi-check-circle-fill me-1"></i>Đã lưu</span>' 
                        : `<button type="button" class="btn btn-sm btn-success py-1 px-3 rounded-pill fw-bold shadow-sm" onclick="window.save_single_sentence(${index})"><i class="bi bi-floppy-fill me-1"></i> Lưu</button>`
                    }
                    <button type="button" class="btn btn-sm btn-outline-danger py-1 px-2 rounded-pill shadow-sm" onclick="window.trans_sentences_data.splice(${index}, 1); window.render_trans_table()"><i class="bi bi-trash3"></i></button>
                </div>
            </div>
            
            <!-- NỬA TRÊN: CÂU GỐC -->
            <div class="position-relative bg-dark">
                <div class="badge bg-secondary bg-opacity-50 text-white-50 position-absolute top-0 start-0 m-2 ms-3" style="font-size:0.65rem; z-index:2;">CÂU GỐC</div>
                <div contenteditable="true" class="form-control bg-transparent text-white border-0 editable-box px-3 py-4 pt-5 no-scrollbar shadow-none" 
                     oninput="window.trigger_single_translate(${index}, this.innerText)">${item.original}</div>
            </div>
            
            <!-- NỬA DƯỚI: BẢN DỊCH AI -->
            <div class="position-relative border-top border-secondary bg-black">
                <div class="badge bg-secondary bg-opacity-50 text-warning position-absolute top-0 start-0 m-2 ms-3" style="font-size:0.65rem; z-index:2;">BẢN DỊCH</div>
                <div id="trans_box_${index}" contenteditable="true" class="form-control bg-transparent text-warning border-0 editable-box px-3 py-4 pt-5 no-scrollbar shadow-none" 
                     oninput="window.trans_sentences_data[${index}].translated = this.innerText">${item.translated}</div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
};

// 🌟 HÀM DỊCH TỰ ĐỘNG TỪNG CÂU (KHÔNG LÀM MẤT CHUỘT)
window.trigger_single_translate = function(index, newText) {
    window.trans_sentences_data[index].original = newText;
    let transBox = document.getElementById(`trans_box_${index}`);
    
    if (!newText.trim()) {
        window.trans_sentences_data[index].translated = "";
        if (transBox) transBox.innerText = "";
        return;
    }

    if (transBox) transBox.innerText = "⏳ Đang dịch...";
    
    clearTimeout(window.single_trans_timers[index]);
    
    window.single_trans_timers[index] = setTimeout(async () => {
        let isVietnamese = /[àáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳýỹỷỵ]/i.test(newText);
        let targetLang = isVietnamese ? 'en' : 'vi'; 
        
        try {
            let res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(newText)}`);
            let data = await res.json();
            let finalTranslation = data[0].map(x => x[0]).join('');
            
            window.trans_sentences_data[index].translated = finalTranslation;
            if (document.getElementById(`trans_box_${index}`)) {
                document.getElementById(`trans_box_${index}`).innerText = finalTranslation;
            }
        } catch(e) {
             if (document.getElementById(`trans_box_${index}`)) {
                 document.getElementById(`trans_box_${index}`).innerText = "❌ Lỗi mạng, không thể dịch.";
             }
        }
    }, 1000);
};

window.trans_typing_timer = null;

window.auto_translate_on_type = function() {
    let rawText = document.getElementById('raw_trans_input').value.trim();
    let outputBox = document.getElementById('full_trans_output');
    
    if (!rawText) {
        outputBox.value = "";
        window.trans_sentences_data = [];
        window.render_trans_table();
        return;
    }

    outputBox.value = "⏳ Đang đợi bạn gõ xong...";
    clearTimeout(window.trans_typing_timer);

    window.trans_typing_timer = setTimeout(() => {
        window.process_split_sentences();
    }, 1200); 
};

// =========================================================================
// LƯU CƠ SỞ DỮ LIỆU
// =========================================================================

window.save_all_sentences = async function() {
    let unsaved = window.trans_sentences_data.filter(item => !item.isSaved && item.original);
    if(unsaved.length === 0) return window.show_toast("⚠️ Bảng trống hoặc đã lưu hết rồi!", true);
    
    let currentLesson = window.selected_lessons_text || "1";
    let subjKey = window.getPhanXaSubjectKey();
    
    let payload = unsaved.map(item => ({
        subject_key: subjKey,
        lesson: currentLesson,
        type: 'phanxa',
        q: item.original,
        answer: item.translated
    }));

    try {
        const { error } = await db.from('phanxa_questions').insert(payload);
        if (error) throw error;
        
        window.trans_sentences_data.forEach(i => i.isSaved = true);
        window.render_trans_table();
        window.show_toast(`✅ Đã lưu ${payload.length} câu vào (${subjKey})!`);
    } catch(e) {
        window.show_toast("❌ Lỗi lưu dữ liệu: " + e.message, true);
    }
};

window.save_full_paragraph = async function() {
    let rawText = document.getElementById('raw_trans_input').value.trim();
    let transText = document.getElementById('full_trans_output').value.trim();
    if (!rawText) return window.show_toast("⚠️ Khung văn bản gốc đang trống!", true);
    
    let currentLesson = window.selected_lessons_text || "1";
    let subjKey = window.getPhanXaSubjectKey();
    
    let payload = [{
        subject_key: subjKey, 
        lesson: currentLesson, 
        type: 'phanxa',
        q: rawText, 
        answer: transText
    }];

    try {
        const { error } = await db.from('phanxa_questions').insert(payload);
        if (error) throw error;
        window.show_toast(`✅ Đã lưu NGUYÊN ĐOẠN vào (${subjKey})!`);
    } catch(e) {
        window.show_toast("❌ Lỗi lưu dữ liệu: " + e.message, true);
    }
};

window.save_single_sentence = async function(index) {
    let item = window.trans_sentences_data[index];
    if (item.isSaved) return;

    let currentLesson = window.selected_lessons_text || "1";
    let subjKey = window.getPhanXaSubjectKey();
    
    let payload = [{
        subject_key: subjKey, 
        lesson: currentLesson, 
        type: 'phanxa',
        q: item.original, 
        answer: item.translated
    }];

    try {
        const { error } = await db.from('phanxa_questions').insert(payload);
        if (error) throw error;
        
        window.trans_sentences_data[index].isSaved = true;
        window.render_trans_table();
        window.show_toast(`✅ Đã lưu câu số ${index + 1} vào (${subjKey})!`);
    } catch(e) {
        window.show_toast("❌ Lỗi lưu dữ liệu: " + e.message, true);
    }
};

window.getPhanXaSubjectKey = function() {
    let currentUser = localStorage.getItem('student_id') 
                   || localStorage.getItem('username') 
                   || localStorage.getItem('user_id')
                   || sessionStorage.getItem('student_id');
                   
    let inputID = document.getElementById('student_id');
    if (!currentUser && inputID && inputID.value) {
        currentUser = inputID.value;
    }
    
    if (!currentUser || currentUser.trim() === '') {
        currentUser = prompt("⚠️ Hệ thống chưa nhận diện được User của bạn.\nVui lòng nhập tên đăng nhập (VD: admin, mikel):", "admin");
        if (currentUser) {
            localStorage.setItem('username', currentUser);
        } else {
            return 'phanxakhachvanglai';
        }
    }
    
    let cleanUser = currentUser.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    return `phanxa${cleanUser}`; 
};