// =========================================================================
// ✍️ MODULE TRẠM DỊCH THUẬT & THÊM CÂU HỎI
// =========================================================================
window.trans_sentences_data = [];

window.openBuilderModule = function() {
    if (typeof closeReelsModule === 'function') closeReelsModule();
    if (typeof closePhanXaModule === 'function') closePhanXaModule();

    let wrapper = document.getElementById('module_builder_wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'module_builder_wrapper';
        wrapper.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 100005; overflow-y: auto; background-color: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); padding: 15px;';
        
        wrapper.innerHTML = `
        <div class="glass-panel p-3 shadow-sm mx-auto d-flex flex-column" style="max-width: 1200px; border-radius: 16px; border: 1px solid rgba(56, 189, 248, 0.3); background: rgba(30, 41, 59, 0.85); height: 95vh;">
            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2" style="border-color: rgba(255,255,255,0.1) !important;">
                <h6 class="fw-bold text-info m-0"><i class="bi bi-translate me-2"></i>TRẠM DỊCH THUẬT & BÓC TÁCH CÂU</h6>
                <button class="btn-close btn-close-white" onclick="document.getElementById('module_builder_wrapper').style.display='none'; document.body.style.overflow='';"></button>
            </div>
            
            <div class="row g-3 mb-3">
                <div class="col-md-6 d-flex flex-column">
                    <label class="text-info small fw-bold mb-1">VĂN BẢN GỐC (Dán Tiếng Anh/Việt vào đây)</label>
                    <textarea id="raw_trans_input" class="form-control bg-dark text-white flex-grow-1 custom-scrollbar" style="resize:none; border-radius:12px; min-height: 150px; border: 1px solid rgba(255,255,255,0.2);" placeholder="Dán văn bản vào đây..."></textarea>
                </div>
                <div class="col-md-6 d-flex flex-column">
                    <label class="text-warning small fw-bold mb-1">BẢN DỊCH TỔNG (AI Tự dịch)</label>
                    <textarea id="full_trans_output" class="form-control bg-dark text-warning flex-grow-1 custom-scrollbar" style="resize:none; border-radius:12px; min-height: 150px; border: 1px solid rgba(255,255,255,0.2);"></textarea>
                </div>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-2 px-1">
                <div class="text-white-50 fw-bold small">BẢNG BÓC TÁCH CHI TIẾT</div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-info fw-bold shadow" onclick="window.process_split_sentences()"><i class="bi bi-scissors me-1"></i> BÓC TÁCH</button>
                    <button class="btn btn-sm btn-success fw-bold shadow" onclick="window.save_all_sentences()"><i class="bi bi-cloud-arrow-up-fill me-1"></i> LƯU TẤT CẢ LÊN BÀI HỌC</button>
                </div>
            </div>

            <div class="table-responsive custom-scrollbar flex-grow-1 border rounded" style="border-color: rgba(255,255,255,0.1) !important; background: rgba(0,0,0,0.3);">
                <table class="table table-borderless text-white mb-0" style="min-width: 600px; --bs-table-bg: transparent;">
                    <thead style="background: rgba(15, 23, 42, 0.95); position: sticky; top: 0; z-index: 10;">
                        <tr class="border-bottom" style="border-color: rgba(56, 189, 248, 0.3) !important;">
                            <th style="width: 5%;">STT</th><th style="width: 45%;">CÂU GỐC</th><th style="width: 45%;">BẢN DỊCH</th><th style="width: 5%;">XÓA</th>
                        </tr>
                    </thead>
                    <tbody id="trans_table_body">
                        <tr><td colspan="4" class="text-center text-white-50 py-5">Chưa có dữ liệu bóc tách</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        document.body.appendChild(wrapper);
    }
    
    wrapper.style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('fab_menu_items').classList.add('d-none');
    
    // Tự điền số bài/tên bài đang học
    if(window.selected_lessons_text) window.show_toast("📍 Đang thao tác trên Bài: " + window.selected_lessons_text);
};

window.process_split_sentences = async function() {
    let rawText = document.getElementById('raw_trans_input').value.trim();
    if (!rawText) return window.show_toast("⚠️ Vui lòng dán văn bản!", true);
    
    let sentences = rawText.match(/[^.!?\n]+[.!?\n]+(?:\s|$)\vert{}[^.!?\n]+$/g) || [rawText];
    window.trans_sentences_data = sentences.map(s => ({ original: s.trim(), translated: "⏳ Đang dịch...", isSaved: false }));
    window.render_trans_table();
    
    // 🌟 SỬ DỤNG PUBLIC API CỦA GOOGLE TRANSLATE ĐỂ DỊCH TRỰC TIẾP TRÊN TRÌNH DUYỆT
    for (let i = 0; i < window.trans_sentences_data.length; i++) {
        let text = window.trans_sentences_data[i].original;
        try {
            let res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(text)}`);
            let data = await res.json();
            window.trans_sentences_data[i].translated = data[0].map(x => x[0]).join('');
        } catch (e) {
            window.trans_sentences_data[i].translated = "❌ Lỗi mạng, không thể dịch.";
        }
        window.render_trans_table(); // Cập nhật từng câu
    }
    
    // Dịch luôn khung Tổng
    try {
        let resTotal = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(rawText)}`);
        let dataTotal = await resTotal.json();
        document.getElementById('full_trans_output').value = dataTotal[0].map(x => x[0]).join('');
    } catch(e) {}
};

window.render_trans_table = function() {
    let tbody = document.getElementById('trans_table_body');
    if (window.trans_sentences_data.length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="text-center py-5">Trống</td></tr>`; return; }
    
    let html = '';
    window.trans_sentences_data.forEach((item, index) => {
        let bg = item.isSaved ? 'background: rgba(16, 185, 129, 0.1);' : '';
        html += `
        <tr style="border-bottom: 1px dashed rgba(255,255,255,0.1); ${bg}">
            <td class="text-center text-info fw-bold align-middle">${index + 1}</td>
            <td class="align-middle"><div contenteditable="true" style="outline:none;" onblur="window.trans_sentences_data[${index}].original = this.innerText">${item.original}</div></td>
            <td class="align-middle text-warning"><div contenteditable="true" style="outline:none;" onblur="window.trans_sentences_data[${index}].translated = this.innerText">${item.translated}</div></td>
            <td class="text-center align-middle"><button class="btn btn-sm text-danger p-0" onclick="window.trans_sentences_data.splice(${index}, 1); window.render_trans_table()"><i class="bi bi-trash3"></i></button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
};

window.save_all_sentences = async function() {
    let unsaved = window.trans_sentences_data.filter(item => !item.isSaved && item.original);
    if(unsaved.length === 0) return window.show_toast("⚠️ Bảng trống hoặc đã lưu hết rồi!", true);
    
    let currentLesson = window.selected_lessons_text || "1";
    let subj = window.current_subject || "tienganh";
    
    let payload = unsaved.map(item => ({
        subject_key: subj,
        lesson: currentLesson,
        type: 'phanxa',
        q: item.original,
        a: item.translated,
        answer: item.translated
    }));

    try {
        const { error } = await db.from('questions').insert(payload);
        if (error) throw error;
        
        window.trans_sentences_data.forEach(i => i.isSaved = true);
        window.render_trans_table();
        window.show_toast(`✅ Đã đẩy thành công ${payload.length} câu vào Bài ${currentLesson} Supabase!`);
    } catch(e) {
        window.show_toast("❌ Lỗi lưu dữ liệu: " + e.message, true);
    }
};