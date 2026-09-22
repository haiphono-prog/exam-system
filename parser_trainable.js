// =========================================================================
// 🤖 MODULE: SIÊU TRÍ TUỆ BÓC TÁCH V12 (GIAO DIỆN KHAI BÁO BẰNG TAY TỐI ƯU)
// =========================================================================

window.close_trainable_modal = function() {
    document.body.style.overflow = '';
    let modal = document.getElementById('trainable_import_modal');
    if (modal) modal.remove();
};

window.execute_find_replace = function() {
    let ta = document.getElementById('trained_input_text');
    let f = document.getElementById('find_text').value;
    let r = document.getElementById('replace_text').value;
    if (!f) return;
    
    let text = ta.value; let newText = text;
    
    if (f.includes('^')) {
        try {
            let safeF = f.replace(/([.*+?${}()|[\]\\])/g, '\\$1');
            let pattern = safeF.replace(/\^p/gi, '\\n').replace(/\^t/gi, '\\t').replace(/\^w/gi, '\\s+').replace(/\^#/gi, '\\d').replace(/\^\$/gi, '[a-zA-Z]').replace(/\^\?/gi, '.');
            let safeR = r.replace(/\^p/gi, '\n').replace(/\^t/gi, '\t');
            newText = text.replace(new RegExp(pattern, 'g'), safeR);
        } catch(e) { return show_toast("⚠️ Lỗi từ khóa Word!", true); }
    } 
    else if (f.startsWith('/') && f.lastIndexOf('/') > 0) {
        try {
            let flags = f.substring(f.lastIndexOf('/') + 1);
            let pattern = f.substring(1, f.lastIndexOf('/'));
            newText = text.replace(new RegExp(pattern, flags), r);
        } catch(e) { return show_toast("⚠️ Lỗi cú pháp Regex!", true); }
    } else {
        newText = text.split(f).join(r);
    }

    if (newText !== text) {
        ta.value = newText; show_toast("✅ Đã thay thế thành công!"); trigger_live_parse();
    } else { show_toast("⚠️ Không tìm thấy từ khóa khớp để thay thế.", true); }
};

window.open_trainable_parser_modal = function() {
    document.body.style.overflow = 'hidden'; 
    window.bulk_html_paste_data = ""; 
    
    let modal = document.createElement('div');
    modal.id = 'trainable_import_modal';
    modal.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn';
    modal.style.cssText = 'background: rgba(15, 23, 42, 0.85); z-index: 27000; backdrop-filter: blur(15px);';

    modal.innerHTML = `
        <style>
            .glass-modal { background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); backdrop-filter: blur(25px); }
            .glass-textarea { background: rgba(0,0,0,0.2) !important; border: 1px solid rgba(255,255,255,0.08) !important; color: #fff !important; border-radius: 8px; resize: none; font-size: 0.9rem; line-height: 1.5; transition: 0.3s; scroll-behavior: smooth; }
            .glass-textarea:focus { border-color: rgba(34, 197, 94, 0.5) !important; box-shadow: inset 0 2px 10px rgba(0,0,0,0.3) !important; outline: none; }
            ::selection { background: rgba(56, 189, 248, 0.4); color: #fff; }
            .cfg-input { background: rgba(0,0,0,0.3) !important; color: #38bdf8 !important; border: 1px solid rgba(56, 189, 248, 0.3) !important; font-weight: 600; font-size: 0.8rem; padding: 6px 10px; border-radius: 6px; transition: 0.3s; }
            .cfg-input::placeholder { color: rgba(255,255,255,0.4); font-weight: normal; font-size: 0.75rem; }
            .cfg-input:focus { background: rgba(0,0,0,0.6) !important; border-color: #38bdf8 !important; box-shadow: 0 0 8px rgba(56,189,248,0.5) !important; }
            .cfg-input:disabled { background: rgba(0,0,0,0.1) !important; border-color: rgba(255,255,255,0.05) !important; color: rgba(255,255,255,0.2) !important; }
            .slim-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
            .slim-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
            .slim-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
            .toggle-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; border-radius: 4px; font-size: 0.7rem; padding: 2px 8px; cursor: pointer; transition: 0.2s; font-weight: 500; }
            .toggle-btn.active { background: rgba(56,189,248,0.2); color: #fff; border-color: #38bdf8; }
            .toggle-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
            #preview_excel_table { --bs-table-bg: transparent !important; background-color: transparent !important; color: #fff; }
            #preview_excel_table th { background: rgba(15,23,42,0.95) !important; backdrop-filter: blur(8px); border-bottom: 2px solid rgba(255,255,255,0.1); padding: 8px 4px; border-right: 1px solid rgba(255,255,255,0.03); }
            #preview_excel_table td { padding: 4px 2px; border-bottom: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.03); }
            .row-hover-magic { transition: background 0.2s; cursor: pointer; }
            .row-hover-magic:hover { background: rgba(255,255,255,0.05) !important; }
            .editable-cell { cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s; width: 100%; word-break: break-word; min-height: 26px; line-height: 1.4; border: 1px dashed transparent; }
            .editable-cell:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); }
            .editable-cell.is-editing { cursor: text; background: rgba(0,0,0,0.8) !important; border: 1px solid #38bdf8 !important; box-shadow: inset 0 0 8px rgba(0,0,0,0.8); outline: none; }
        </style>
        <div class="glass-modal p-0 d-flex flex-column m-2" style="width: 98vw; max-width: 1900px; height: 96vh;">
            <div class="d-flex justify-content-between align-items-center p-2 px-3 border-bottom flex-shrink-0" style="border-color: rgba(255,255,255,0.1) !important; background: rgba(0,0,0,0.2); border-radius: 16px 16px 0 0;">
                <h6 class="fw-bold text-success m-0" style="letter-spacing: 0.5px; font-size: 0.9rem;"><i class="bi bi-robot me-2"></i> AI BÓC TÁCH V12 (GIAO DIỆN KHAI BÁO BẰNG TAY)</h6>
                <button class="btn-close btn-close-white opacity-75" style="transform: scale(0.8);" onclick="close_trainable_modal()"></button>
            </div>
            
            <div class="d-flex align-items-center gap-2 px-3 py-1 bg-dark bg-opacity-25 border-bottom border-secondary border-opacity-25">
                <input type="file" id="word_input" accept=".docx" class="d-none" onchange="handleWordUpload(this)">
                <button class="btn btn-sm btn-outline-light" onclick="document.getElementById('word_input').click()"><i class="bi bi-file-earmark-word me-1"></i> Chọn file Word</button>
                <button type="button" class="btn btn-sm btn-warning rounded-circle shadow p-0 d-flex align-items-center justify-content-center" onmousedown="event.preventDefault(); window.make_vocab_tag();" title="Magic Vocab: Tự động tra IPA" style="width: 28px; height: 28px; border: 1px solid #f59e0b; font-size: 1.1rem; flex-shrink: 0;">🪄</button>
                
                <div class="ms-auto d-flex gap-1">
                    <input type="text" id="find_text" class="form-control form-control-sm cfg-input" placeholder="🔍 Tìm (VD: ^p, ^t, ^#)" style="width: 150px;">
                    <input type="text" id="replace_text" class="form-control form-control-sm cfg-input" placeholder="✨ Thay bằng..." style="width: 150px;">
                    <button class="btn btn-sm btn-outline-info fw-bold" onclick="execute_find_replace()" title="Thay thế tất cả"><i class="bi bi-arrow-repeat"></i> ĐỔI</button>
                </div>
            </div>

            <div class="d-flex flex-column flex-grow-1 overflow-hidden p-2 gap-2">
                <div class="row g-2 flex-shrink-0" style="height: 45%; min-height: 300px;">
                    <div class="col-12 col-lg-5 d-flex flex-column h-100">
                        <textarea id="trained_input_text" class="form-control glass-textarea slim-scroll flex-grow-1 shadow-sm p-3" 
                                  placeholder="📌 BƯỚC 1: Cấu hình Khai báo bên phải -> Dán đề Word/Excel vào đây... Hệ thống sẽ tự phân tích & bóc tách Live ngay lập tức." 
                                  oninput="trigger_live_parse()"></textarea>
                    </div>

                    <div class="col-12 col-lg-7 d-flex flex-column h-100">
                        <div class="d-flex flex-column flex-grow-1 p-2 rounded shadow-sm border border-info border-opacity-25 slim-scroll" style="background: rgba(0,0,0,0.15); overflow-y: auto;">
                            
                            <div class="d-flex justify-content-between align-items-center mb-2 px-1 border-bottom border-secondary border-opacity-50 pb-2">
                                <span class="text-white-50 fw-bold" style="font-size: 0.8rem;"><i class="bi bi-sliders text-info"></i> BẢNG KHAI BÁO CẤU TRÚC ĐỀ BẰNG TAY</span>
                                <div class="d-flex gap-1">
                                    <button class="btn btn-sm btn-outline-warning py-0 px-2" style="font-size: 0.75rem;" onclick="auto_detect_format()"><i class="bi bi-magic"></i> AI Tự Dò</button>
                                </div>
                            </div>

                            <div class="row g-2 mb-3">
                                <div class="col-12 col-md-6">
                                    <label class="text-info small fw-bold mb-1">🎯 Bắt đầu Câu hỏi (Dấu # là Số):</label>
                                    <div class="input-group input-group-sm shadow-sm">
                                        <select id="m_q_preset" class="form-select cfg-input bg-dark text-white border-secondary" style="max-width: 140px;" onchange="apply_q_preset(this.value); trigger_live_parse()">
                                            <option value="Câu #.">Câu 1.</option>
                                            <option value="Câu #:">Câu 1:</option>
                                            <option value="#.">1. (Số chấm)</option>
                                            <option value="#)">1) (Số ngoặc)</option>
                                            <option value="Question #.">Question 1.</option>
                                            <option value="custom">Tự định nghĩa 👉</option>
                                        </select>
                                        <input type="text" id="m_q" class="form-control cfg-input text-warning" placeholder="Tự nhập..." value="Câu #." oninput="document.getElementById('m_q_preset').value='custom'; trigger_live_parse()">
                                    </div>
                                </div>
                                <div class="col-12 col-md-6">
                                    <label class="text-warning small fw-bold mb-1">⚡ Bắt đầu Đáp án:</label>
                                    <div class="input-group input-group-sm shadow-sm">
                                        <select id="m_opt_preset" class="form-select cfg-input bg-dark text-white border-secondary" style="max-width: 140px;" onchange="apply_opt_preset(this.value); trigger_live_parse()">
                                            <option value=".">A. B. C. D.</option>
                                            <option value=")">A) B) C) D)</option>
                                            <option value=":">A: B: C: D:</option>
                                            <option value="custom">Tự định nghĩa 👉</option>
                                        </select>
                                        <input type="text" id="m_a" class="form-control cfg-input text-center px-1" value="A." style="width:15%" oninput="set_custom_opt()">
                                        <input type="text" id="m_b" class="form-control cfg-input text-center px-1" value="B." style="width:15%" oninput="set_custom_opt()">
                                        <input type="text" id="m_c" class="form-control cfg-input text-center px-1" value="C." style="width:15%" oninput="set_custom_opt()">
                                        <input type="text" id="m_d" class="form-control cfg-input text-center px-1" value="D." style="width:15%" oninput="set_custom_opt()">
                                    </div>
                                </div>
                            </div>

                            <div class="row g-2 mb-3">
                                <div class="col-4"><select id="m_source_type" class="form-select form-select-sm cfg-input" onchange="trigger_live_parse()"><option value="inline">Nguồn: Word (Đ/A Tại chỗ)</option><option value="appendix">Nguồn: Word (Đ/A Cuối bài)</option><option value="excel">Nguồn: Bảng Excel</option></select></div>
                                <div class="col-4"><select id="m_force_type" class="form-select form-select-sm cfg-input text-warning" onchange="toggle_cfg_inputs(); trigger_live_parse()"><option value="auto">Loại: Trộn 3 Loại Câu (Auto)</option><option value="single">Loại: Chỉ Trắc nghiệm</option><option value="tf">Loại: Chỉ Đúng/Sai</option><option value="fill">Loại: Chỉ Điền khuyết</option></select></div>
                                <div class="col-4"><select id="m_ans_format" class="form-select form-select-sm cfg-input" onchange="trigger_live_parse()"><option value="text">Cách bắt: Bằng Ký hiệu Text</option><option value="format">Cách bắt: Chữ Đậm/Màu Đỏ</option></select></div>
                            </div>

                            <div class="row g-2 mb-1">
                                <div class="col-6"><input type="text" id="m_ans" class="form-control form-control-sm cfg-input" placeholder="🎯 Cụm từ Đáp án (VD: Đáp án:, Đ/A:)" oninput="trigger_live_parse()"></div>
                                <div class="col-6"><input type="text" id="m_hint" class="form-control form-control-sm cfg-input" placeholder="💡 Cụm từ Giải thích (VD: Giải thích:, HDG:)" oninput="trigger_live_parse()"></div>
                            </div>

                            <div class="row g-2 mb-1">
                                <div class="col-4"><input type="text" id="m_tf" class="form-control form-control-sm cfg-input" placeholder="✅❌ ĐÚNG,SAI (VD: Đúng,Sai)" oninput="trigger_live_parse()"></div>
                                <div class="col-4"><input type="text" id="m_fill_blank" class="form-control form-control-sm cfg-input" placeholder="✏️ Ký hiệu lỗ hổng (VD: ...)" oninput="trigger_live_parse()"></div>
                                <div class="col-4"><input type="text" id="m_noise" class="form-control form-control-sm cfg-input text-danger" placeholder="🗑 Từ nhiễu xóa đi (VD: Trang)" oninput="trigger_live_parse()"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="d-flex flex-column flex-grow-1 border border-secondary border-opacity-25 rounded shadow-sm" style="background: rgba(0,0,0,0.2);">
                    <div class="d-flex justify-content-between align-items-center p-2 rounded-top" style="background: rgba(0,0,0,0.4); border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div class="d-flex align-items-center gap-1 flex-wrap" id="col_toggles_container">
                            <span class="text-info small fw-bold me-1"><i class="bi bi-eye"></i> Ẩn/hiện:</span>
                            <div class="toggle-btn active" onclick="toggle_table_col(2, this)">Bài</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(3, this)">Tên Bài</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(4, this)">Dạng</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(5, this)">Mức</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(6, this)">Nội dung</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(7, this)">Lựa chọn</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(8, this)">Đáp án</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(9, this)">Giải thích</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(10, this)">Media</div>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-danger fw-bold py-0" style="font-size: 0.75rem;" onclick="document.getElementById('bulk_preview_area').innerHTML=''; window.bulk_parsed_questions=[];"><i class="bi bi-trash"></i> Xóa</button>
                            <button id="btn_save_bulk" class="btn btn-sm btn-success fw-bold ms-1 shadow py-0 disabled" style="font-size: 0.75rem;" onclick="confirm_save_bulk()"><i class="bi bi-cloud-arrow-up-fill"></i> LƯU DATA</button>
                        </div>
                    </div>
                    <div id="bulk_preview_area" class="flex-grow-1 overflow-auto slim-scroll rounded-bottom position-relative">
                        <div class="d-flex flex-column justify-content-center align-items-center h-100 text-white-50">
                            <i class="bi bi-table opacity-25 mb-2" style="font-size: 2.5rem;"></i>
                            <span style="font-size: 0.8rem;">Bảng kết quả gốc sẽ hiển thị tại đây.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    toggle_cfg_inputs(); 
    
    // 🌟 SMART PASTE: LỌC RÁC & PHÁ BẢNG WORD
    let ta = document.getElementById('trained_input_text');
    ta.addEventListener('paste', function(e) {
        let html = (e.clipboardData || window.clipboardData).getData('text/html');
        window.bulk_html_paste_data = html || "";
        
        if (html) {
            e.preventDefault(); 
            
            let parser = new DOMParser();
            let doc = parser.parseFromString(html, 'text/html');
            
            doc.querySelectorAll('style, script, meta, link, head, title').forEach(el => el.remove());

            doc.querySelectorAll('img').forEach(img => {
                let src = img.src || img.getAttribute('src');
                if (src && !src.startsWith('file://')) { 
                    let mediaTag = doc.createTextNode(`\n[Media: ${src}]\n`);
                    img.parentNode.replaceChild(mediaTag, img);
                } else { img.remove(); }
            });

            doc.querySelectorAll('ol').forEach(ol => {
                let start = parseInt(ol.getAttribute('start')) || 1;
                let type = ol.getAttribute('type') || '';
                let isAlpha = type === 'a' || type === 'A' || (ol.style.listStyleType || '').includes('alpha');
                
                ol.querySelectorAll(':scope > li').forEach((li, idx) => {
                    let marker = isAlpha ? String.fromCharCode((type === 'a' ? 97 : 65) + idx) + ". " : (start + idx) + ". ";
                    li.prepend(doc.createTextNode(marker));
                });
            });

            doc.querySelectorAll('ul > li').forEach(li => { li.prepend(doc.createTextNode("• ")); });

            doc.querySelectorAll('p, div, li, tr, td, th, h1, h2, h3, h4, h5, h6').forEach(el => { el.insertAdjacentText('afterend', '\n'); });
            doc.querySelectorAll('br').forEach(br => { br.insertAdjacentText('afterend', '\n'); });

            let finalText = doc.body.textContent || doc.body.innerText || "";
            finalText = finalText.replace(/\n{3,}/g, '\n\n').trim();

            let startPos = ta.selectionStart; 
            let endPos = ta.selectionEnd;
            ta.value = ta.value.substring(0, startPos) + finalText + ta.value.substring(endPos);
            ta.selectionStart = ta.selectionEnd = startPos + finalText.length;
        }
        setTimeout(auto_detect_format, 100); 
    });
    setTimeout(() => ta.focus(), 100);
};

// --- Giao tiếp UI ---
window.apply_q_preset = function(val) {
    if (val !== 'custom') document.getElementById('m_q').value = val;
};
window.apply_opt_preset = function(val) {
    if (val !== 'custom') {
        document.getElementById('m_a').value = 'A' + val;
        document.getElementById('m_b').value = 'B' + val;
        document.getElementById('m_c').value = 'C' + val;
        document.getElementById('m_d').value = 'D' + val;
    }
};
window.set_custom_opt = function() { document.getElementById('m_opt_preset').value = 'custom'; trigger_live_parse(); };


window.handleWordUpload = function(input) {
    let file = input.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        let base64 = e.target.result.split(",")[1];
        google.script.run.withSuccessHandler(function(text) {
            document.getElementById('trained_input_text').value = text;
            trigger_live_parse(); show_toast("✅ Đã import file Word thành công!");
        }).processWordFile(base64, file.name);
    };
    reader.readAsDataURL(file);
};

window.toggle_table_col = function(colIndex, btnElement) { 
    let isActive = btnElement.classList.contains('active'); 
    if (isActive) btnElement.classList.remove('active'); else btnElement.classList.add('active');
    let cells = document.querySelectorAll(`#preview_excel_table th:nth-child(${colIndex}), #preview_excel_table td:nth-child(${colIndex})`); 
    cells.forEach(cell => { cell.style.display = isActive ? 'none' : 'table-cell'; }); 
};

window.enable_cell_edit = function(element) { 
    element.contentEditable = "true"; element.classList.add('is-editing'); element.focus(); 
    let selection = window.getSelection(); let range = document.createRange(); 
    range.selectNodeContents(element); range.collapse(false); 
    selection.removeAllRanges(); selection.addRange(range); 
};

window.save_cell_data = function(index, field, element) { 
    element.contentEditable = "false"; element.classList.remove('is-editing'); 
    if (window.bulk_parsed_questions[index]) { 
        let val = element.innerText.trim(); 
        if (field === 'type') { 
            let textLower = val.toLowerCase();
            if (textLower.includes('đúng') || textLower.includes('sai') || textLower === 'tf') val = 'tf';
            else if (textLower.includes('điền') || textLower === 'fill') val = 'fill'; else val = 'single'; 
        } 
        window.bulk_parsed_questions[index][field] = val;
        if (field === 'a') window.bulk_parsed_questions[index]['answer'] = val; 
        if (field === 'multimedia') window.bulk_parsed_questions[index]['image'] = val; 
    } 
};

window.highlight_source_text_v7 = function(index, event) {
    let isCurrentlyEditing = event && event.target && (event.target.classList.contains('is-editing') || event.target.closest('.is-editing'));
    if (isCurrentlyEditing) return;

    let q = window.bulk_parsed_questions[index]; 
    if (!q) return;

    document.querySelectorAll('.row-hover-magic').forEach(c => c.style.background = 'transparent');
    let clickedRow = document.getElementById(`row_${index}`);
    if (clickedRow) clickedRow.style.background = 'rgba(250, 204, 21, 0.15)'; 

    let ta = document.getElementById('trained_input_text');
    if (!ta) return;

    let fullText = ta.value; 
    let targetStr = q.original_q ? q.original_q.trim() : q.q; 
    let startIndex = fullText.indexOf(targetStr);

    if (startIndex !== -1) {
        let endIndex = startIndex + targetStr.length;
        ta.focus(); ta.setSelectionRange(startIndex, endIndex);
        
        let textBeforeTarget = fullText.substring(0, startIndex);
        let linesBefore = textBeforeTarget.split('\n').length;
        let totalLines = fullText.split('\n').length;
        
        if (totalLines > 0) {
            let scrollY = (linesBefore / totalLines) * ta.scrollHeight;
            ta.scrollTo({ top: scrollY - (ta.clientHeight / 2) + 30, behavior: 'smooth' });
        }
    }
};

window.toggle_cfg_inputs = function() {
    let type = document.getElementById('m_force_type').value;
    let ids_mcq = ['m_a', 'm_b', 'm_c', 'm_d']; let ids_tf = ['m_tf']; let ids_fill = ['m_fill_blank']; let ids_ans = ['m_ans']; 
    const setStatus = (ids, isDisabled) => { ids.forEach(id => { let el = document.getElementById(id); if(el) el.disabled = isDisabled; }); };
    setStatus([...ids_mcq, ...ids_tf, ...ids_fill, ...ids_ans], false);
    if (type === 'single') setStatus([...ids_tf, ...ids_fill], true);
    else if (type === 'tf') setStatus([...ids_mcq, ...ids_fill], true);
    else if (type === 'fill') setStatus([...ids_mcq, ...ids_tf, ...ids_ans], true); 
};

window.live_parse_timeout = null;
window.trigger_live_parse = function() {
    clearTimeout(window.live_parse_timeout);
    window.live_parse_timeout = setTimeout(() => { execute_trained_parse(); }, 400); 
};

window.auto_detect_format = function() {
    clearTimeout(window.auto_detect_timeout);
    window.auto_detect_timeout = setTimeout(() => {
        let text = document.getElementById('trained_input_text').value.normalize('NFC');
        if (!text || text.length < 20) return;

        if ((text.match(/\t/g) || []).length > 10) { document.getElementById('m_source_type').value = 'excel'; trigger_live_parse(); return; }

        let appMatch = text.match(/(?:^|\n)\s*(?:ĐÁP\s+ÁN|BẢNG\s+ĐÁP\s+ÁN|PHỤ\s+LỤC|HƯỚNG\s+DẪN\s+CHẤM)[\s\S]{10,}/i);
        let gridCount = (text.slice(-800).match(/\b\d+\s*[\.\-\)]?\s*[A-D]\b/gi) || []).length;
        if (appMatch || gridCount > 5) document.getElementById('m_source_type').value = 'appendix';
        else document.getElementById('m_source_type').value = 'inline';

        // Phát hiện Câu hay Số trần
        if (text.match(/(?:^|\n)\s*Câu\s*\d+/i)) { document.getElementById('m_q_preset').value = 'Câu #.'; document.getElementById('m_q').value = 'Câu #.'; }
        else if (text.match(/(?:^|\n)\s*Bài\s*\d+/i)) { document.getElementById('m_q_preset').value = 'custom'; document.getElementById('m_q').value = 'Bài #.'; }
        else if (text.match(/(?:^|\n)\s*Question\s*\d+/i)) { document.getElementById('m_q_preset').value = 'Question #.'; document.getElementById('m_q').value = 'Question #.'; }
        else if (text.match(/(?:^|\n)\s*\d+\)/i)) { document.getElementById('m_q_preset').value = '#)'; document.getElementById('m_q').value = '#)'; }
        else if (text.match(/(?:^|\n)\s*\d+\./i)) { document.getElementById('m_q_preset').value = '#.'; document.getElementById('m_q').value = '#.'; }
        
        let aM=[], bM=[], cM=[], dM=[];
        if (text.match(/(?:^|\n|\s|<br>)A\./i)) { aM.push('A.'); bM.push('B.'); cM.push('C.'); dM.push('D.'); document.getElementById('m_opt_preset').value = '.'; }
        else if (text.match(/(?:^|\n|\s|<br>)A\)/i)) { aM.push('A)'); bM.push('B)'); cM.push('C)'); dM.push('D)'); document.getElementById('m_opt_preset').value = ')'; }
        if (aM.length > 0) {
            document.getElementById('m_a').value = aM.join(','); document.getElementById('m_b').value = bM.join(',');
            document.getElementById('m_c').value = cM.join(','); document.getElementById('m_d').value = dM.join(',');
        }

        let ansM = [];
        if (text.match(/Đáp án/i)) ansM.push('Đáp án:, Đáp án');
        if (text.match(/Đ\/A/i)) ansM.push('Đ/A:, Đ/A');
        if (ansM.length > 0) document.getElementById('m_ans').value = ansM.join(', ');

        document.getElementById('m_tf').value = "Đúng, Sai"; document.getElementById('m_fill_blank').value = "...";
        document.getElementById('m_noise').value = "Theo LOẠI câu hỏi, HẾT, Mã đề, Trang"; 

        if (window.bulk_html_paste_data && /<(b|strong|u|mark|font[^>]*color|span[^>]*style=[^>]*color)/i.test(window.bulk_html_paste_data)) {
            document.getElementById('m_ans_format').value = 'format';
        } else {
            document.getElementById('m_ans_format').value = 'text';
        }

        let sampleText = text.substring(0, 2000);
        let hasDots = /([\.…_·]\s*){3,}/.test(sampleText) || /\[\.\.\.\]/.test(sampleText);
        let isAnsTF = /(?:Đáp án|Đ\/A)[\:\.\s]*(?:[A-D][\.\)]\s*)?(Đúng|Sai)(?:[\s\.\:\,\-]|$)/im.test(sampleText) || /(?:^|\s|<br>)[aA][\.\)]\s*Đúng/i.test(sampleText);
        let hasABC = /(?:^|\n|\s|<br>)A[\.\)]/i.test(sampleText);

        if (isAnsTF) document.getElementById('m_force_type').value = 'tf';
        else if (hasDots && !hasABC) document.getElementById('m_force_type').value = 'fill';
        else if (hasABC) document.getElementById('m_force_type').value = 'auto'; 
        else document.getElementById('m_force_type').value = 'single';
        
        toggle_cfg_inputs(); trigger_live_parse();
        show_toast("✨ AI đã phân tích đề và tự điều chỉnh thông số!");
    }, 600); 
};

// 🌟 BÓC TÁCH LÕI V12 (TÍCH HỢP BƯỚC 1, 2, 3: CHUẨN HÓA & HỆ THỐNG SCORING)
window.execute_trained_parse = function() {
    let rawText = document.getElementById('trained_input_text').value;
    if (!rawText.trim()) return;

    // 🔥 BƯỚC 1 CỦA THẦY: CHUẨN HÓA VĂN BẢN TRƯỚC KHI PARSE (Mức độ: Dễ, Hiệu quả ngay)
    const normalizeText = (raw) => {
        return raw
            .replace(/[…\.]{2,}|_{3,}/g, ' [...] ') // Đưa mọi loại ba chấm, gạch dưới về chuẩn [...]
            .replace(/[\(\[]\s*([A-D])\s*[\)\]]\s*[\.:]?/gi, '$1.') // Chuẩn hóa (A), [A] thành A.
            .replace(/[\u200B\u200C\u200D\uFEFF]/g, '') // Xóa ký tự tàng hình (zero-width)
            .replace(/\r\n/g, '\n').replace(/\r/g, '\n') // Đồng nhất dấu xuống dòng
            .replace(/[ \t]+/g, ' ') // Gộp khoảng trắng thừa
            .normalize('NFC'); // Sửa lỗi font tiếng Việt
    };
    
    rawText = normalizeText(rawText);

    let forceType = document.getElementById('m_force_type').value; 
    let defaultLessonID = (document.getElementById('new_lesson_num')?.value || "1"); 
    let defaultLessonName = document.getElementById('new_lesson_name')?.value || "";
    window.bulk_parsed_questions = [];

    let noiseWords = document.getElementById('m_noise').value;
    if (noiseWords) { 
        noiseWords.split(',').forEach(n => { 
            let nt = n.normalize('NFC').trim(); 
            if(nt) rawText = rawText.replace(new RegExp(`(?:^|\\n)\\s*${nt}[\\s\\S]*?(?:\\n|$)`, 'gi'), '\n'); 
        }); 
    }
    
    // ... [Phần xử lý Excel giữ nguyên như cũ] ...
    let excelRows = []; let wordLines = [];
    let currentExcelRow = ""; let inExcelMode = false;
    let lines = rawText.split(/\r?\n/);
    
    for(let line of lines) {
        let cols = line.split('\t');
        let isExcelHeader = cols.length >= 4 && /^(single|mcq|tf|true_false|đúng sai|fill|điền khuyết)$/i.test((cols[1]||'').trim());
        if (isExcelHeader) {
            if (currentExcelRow) excelRows.push(currentExcelRow);
            currentExcelRow = line; inExcelMode = true;
        } else if (inExcelMode) {
            if (/^(?:Câu|Bài)\s*\d+/i.test(line) && !line.includes('\t')) {
                if (currentExcelRow) excelRows.push(currentExcelRow);
                currentExcelRow = ""; inExcelMode = false; wordLines.push(line);
            } else { currentExcelRow += " \n " + line; }
        } else { wordLines.push(line); }
    }
    if (currentExcelRow) excelRows.push(currentExcelRow);

    if (excelRows.length > 0) { /* Xử lý Excel... */ }

    if (wordLines.length > 0) {
        let wordText = wordLines.join('\n');
        
        // Bắt đáp án Đậm/Màu
        let boldMatches = []; let boldIndex = 0;
        let ansFormat = document.getElementById('m_ans_format').value;
        if (ansFormat === 'format' && window.bulk_html_paste_data) {
            let styleRegex = /<(?:b|strong|u|mark|font[^>]*color=["']?(?:red|#[fFcCeEaA][0-9a-fA-F]{5})["']?|span[^>]*style=["'][^"']*(?:bold|700|underline|color:\s*(?:red|#[fFcCeEaA][0-9a-fA-F]{5}|rgb\(\s*2\d\d[^\)]*\)))[^"']*["'])[^>]*>(?:<[^>]+>|\s)*([A-D])[\.\)]/gi;
            let rawMatches = [...window.bulk_html_paste_data.normalize('NFC').matchAll(styleRegex)];
            let uniqueMatches = []; let lastIndex = -1;
            for (let m of rawMatches) {
                if (m.index > lastIndex + 10) { uniqueMatches.push(m); lastIndex = m.index; }
            }
            boldMatches = uniqueMatches;
        }

        // Bắt Phụ lục
        let appendixMap = {};
        let sourceType = document.getElementById('m_source_type').value;
        if (sourceType === 'appendix') {
            let appMatch = wordText.match(/(?:^|\n)\s*(?:ĐÁP\s+ÁN|PHỤ\s+LỤC|BẢNG\s+ĐÁP\s+ÁN)[\s\S]*/i);
            if (appMatch) {
                let cleanAppText = appMatch[0].replace(/(?:\n|\s)*(?:CÂU HỎI ĐIỀN KHUYẾT|CÂU HỎI ĐÚNG SAI|CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM|Mức\s*\d+)/gi, '\n');
                let ansRegex = /(?:(?:Câu|Bài)\s+)?(\d+)[*]*[\.\:\)]\s*([\s\S]*?)(?=\s+(?:(?:Câu|Bài)\s+)?\d+[*]*[\.\:\)]|$)/gi;
                let m; while ((m = ansRegex.exec(cleanAppText)) !== null) { appendixMap[m[1]] = m[2].trim(); }
                wordText = wordText.substring(0, appMatch.index); 
            }
        }

        const escapeRegExp = (str) => { if (!str) return ""; return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
        let rawQMarker = document.getElementById('m_q').value.trim() || '#.';
        let qRegPattern = escapeRegExp(rawQMarker).replace(/\\#/g, '\\d+');
        
        const buildRegEx = (rawStr) => {
            if (!rawStr) return "";
            let parts = rawStr.split(',').map(s => { let t = s.normalize('NFC').trim(); return escapeRegExp(t); }).filter(t => t);
            return parts.length > 0 ? '(?:' + parts.join('|') + ')' : "";
        };

        let ansReg = buildRegEx(document.getElementById('m_ans').value);
        let hintReg = buildRegEx(document.getElementById('m_hint').value);

        // 🔥 BƯỚC 3 CỦA THẦY: PARSER 2 TẦNG (CẮT CÂU TRƯỚC RỒI MỚI PARSE)
        wordText = wordText.replace(new RegExp('(^|[\\s\\n\\t])(' + qRegPattern + '(?=[a-zA-Z\\s\\[]))', 'gi'), '\n$2');
        let blocks = wordText.split(new RegExp('\\n(?=\\s*' + qRegPattern + ')', 'i'));
        
        let pendingLevel = 1; let pendingType = 'single';
        let pendingLessonID = defaultLessonID; let pendingLessonName = defaultLessonName;
        let floatingText = ""; 

        // 🔥 BƯỚC 2 CỦA THẦY: HỆ THỐNG SCORING THÔNG MINH
        const detectQuestionType = (text, explicitAnswer) => {
            let scores = { single: 0, tf: 0, fill: 0 };
            
            // Bằng chứng Trắc nghiệm (ABCD)
            let abcdCount = (text.match(/(?:^|\n|\s)[A-D][\.\)]\s/gi) || []).length;
            if (abcdCount >= 3) scores.single += 10; 
            else if (abcdCount >= 1) scores.single += 5;

            // Bằng chứng Đúng/Sai
            let tfPairs = /(?:^|\n|\s)[Aa][\.\)]\s*(Đúng|True).*[Bb][\.\)]\s*(Sai|False)/i.test(text);
            if (tfPairs) scores.tf += 15;
            let tfAnswer = /(?:Đáp án|ĐA)\s*[:.]?\s*(Đúng|Sai|True|False)\s*$/im.test(text);
            if (tfAnswer || (explicitAnswer && /^(Đúng|Sai|True|False)$/i.test(explicitAnswer.trim()))) scores.tf += 10;

            // Bằng chứng Điền khuyết
            let blanks = (text.match(/\[\.\.\.\]/g) || []).length;
            if (blanks >= 1) scores.fill += 8;
            if (blanks >= 2) scores.fill += 5;

            // Triệt tiêu chéo
            if (scores.single > 5 && blanks > 0) scores.fill -= 5;

            let sorted = Object.entries(scores).sort((a,b) => b[1]-a[1]);
            return (sorted[0][1] > 0) ? sorted[0][0] : 'single'; // Mặc định là single nếu điểm = 0
        };

        blocks.forEach(block => {
            let text = block.trim(); if (!text) return;

            let isQuestion = new RegExp('^' + qRegPattern, 'i').test(text) || /(?:^|\n)\s*[A-D][\.\)]\s/i.test(text);
            
            if (!isQuestion) {
                // Xử lý bài/mức/loại...
                let lessonMatch = text.match(/^Bài\s+(\d+)(?:[\.\:\-]\s*([^\n]*))?/i);
                if (lessonMatch) { 
                    pendingLessonID = lessonMatch[1].trim(); 
                    if (lessonMatch[2]) pendingLessonName = lessonMatch[2].replace(/(?:\n|\s)*(?:CÂU HỎI ĐIỀN KHUYẾT|CÂU HỎI ĐÚNG SAI|CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM|Mức\s*\d+)[\s\S]*$/i, '').trim(); 
                    return;
                }
                if (/Mức\s*(\d+)/i.test(text)) { pendingLevel = parseInt(text.match(/Mức\s*(\d+)/i)[1]); return; }
                if (/CÂU HỎI ĐIỀN KHUYẾT/i.test(text)) { pendingType = 'fill'; return; }
                if (/CÂU HỎI ĐÚNG SAI/i.test(text)) { pendingType = 'tf'; return; }
                if (/CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM/i.test(text)) { pendingType = 'single'; return; }
                
                floatingText += (floatingText ? "\n\n" : "") + text;
                return; 
            }

            // Gỡ Headers thừa
            let trailingHeaders = "";
            let endMatch = text.match(/(?:\n\s*(?:Mức\s*\d+|CÂU HỎI ĐIỀN KHUYẾT|CÂU HỎI ĐÚNG SAI|CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM))+\s*$/i);
            if (endMatch) { trailingHeaders = endMatch[0]; text = text.substring(0, endMatch.index).trim(); }

            let currentLevel = pendingLevel;
            let starsMatch = text.match(new RegExp('^' + qRegPattern + '([*]+)', 'i'));
            if (starsMatch) currentLevel = starsMatch[1].length + 1;

            let qHint = "";
            if (hintReg) {
                let hm = text.match(new RegExp('(?:' + hintReg + ')\\s*([\\s\\S]*)$', 'i'));
                if (hm) { qHint = hm[1].replace(/^[\s\:\.\-]+/, '').trim(); text = text.substring(0, hm.index).trim(); }
            }

            let qContent = text.replace(/CÂU HỎI ĐIỀN KHUYẾT|CÂU HỎI ĐÚNG SAI|CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM/gi, '').replace(/(?:^|\n)Mức\s*\d+/gi, '').trim();

            if (floatingText) {
                qContent = floatingText + "\n\n" + qContent;
                floatingText = ""; 
            }

            let qNumMatch = qContent.match(/\b(\d+)\b/);
            let qNum = qNumMatch ? qNumMatch[1] : null;

            let explicitAns = "";
            if (sourceType === 'inline' && ansReg) {
                let am = qContent.match(new RegExp('(?:' + ansReg + ')\\s*([\\s\\S]*)$', 'i'));
                if (am) { explicitAns = am[1].replace(/^[\s\:\.\-]+/, '').trim(); qContent = qContent.substring(0, am.index).trim(); }
            } else if (qNum && appendixMap[qNum]) {
                explicitAns = appendixMap[qNum];
            }

            let multiLink = ""; let mediaMatch = qContent.match(/\[(?:Media|Multimedia):\s*(https?:\/\/[^\]]+)\]/i);
            if (mediaMatch) { multiLink = mediaMatch[1].trim(); qContent = qContent.replace(mediaMatch[0], '').trim(); }

            // 🔥 ÁP DỤNG SCORING SYSTEM ĐỂ XÁC ĐỊNH LOẠI CÂU
            let finalType = forceType;
            if (forceType === 'auto') {
                let detectedByScore = detectQuestionType(qContent, explicitAns);
                // Nếu header là Bài tập điền khuyết nhưng hệ thống dò ra là single thì tôn trọng logic cũ hoặc ưu tiên Score
                finalType = (pendingType !== 'single' && detectedByScore === 'single' && qContent.includes('[...]')) ? pendingType : detectedByScore;
            }

            let ans = explicitAns; let optA = '', optb = '', optc = '', optd = '';
            
            // Xử lý Đáp án theo Loại
            if (finalType === 'tf') {
                let tfVals = (document.getElementById('m_tf').value || 'Đúng,Sai').split(',');
                let tfT = buildRegEx(tfVals[0] || 'Đúng'); let tfF = buildRegEx(tfVals[1] || 'Sai');
                ans = explicitAns.replace(/\./g, '').trim();
                qContent = qContent.replace(new RegExp('(?:^|[\\s\\t\\n\\xA0])[aA][\\.\\)]\\s*' + tfT + '\\s*(?:^|[\\s\\t\\n\\xA0])[bB][\\.\\)]\\s*' + tfF + '[\\s\\S]*', 'i'), '').trim();
            } 
            else if (finalType === 'fill') {
                if (ans) {
                    ans = ans.replace(/(?:^|[\s\t\n\\xA0]|;|,)+(?:[a-zA-Z]|\d+)[\.\:\)]\s*/gi, ' | ').replace(/;/g, ' | ').replace(/^[\s\|]+/, '').replace(/\|[\s\|]*$/, '').trim();
                }
            } 
            else if (finalType === 'single') {
                let aReg = buildRegEx(document.getElementById('m_a').value) || "A\\."; let bReg = buildRegEx(document.getElementById('m_b').value) || "B\\.";
                let cReg = buildRegEx(document.getElementById('m_c').value) || "C\\."; let dReg = buildRegEx(document.getElementById('m_d').value) || "D\\.";

                let tempStr = qContent.replace(new RegExp('(?:^|[\\s\\t\\n\\xA0])' + aReg + '\\s*', 'i'), '|||A.')
                                      .replace(new RegExp('(?:^|[\\s\\t\\n\\xA0])' + bReg + '\\s*', 'i'), '|||B.')
                                      .replace(new RegExp('(?:^|[\\s\\t\\n\\xA0])' + cReg + '\\s*', 'i'), '|||C.')
                                      .replace(new RegExp('(?:^|[\\s\\t\\n\\xA0])' + dReg + '\\s*', 'i'), '|||D.');
                let parts = tempStr.split('|||');
                qContent = parts[0].trim();
                for(let i=1; i<parts.length; i++) {
                    let p = parts[i].trim();
                    if (p.startsWith('A.')) optA = p.substring(2).trim();
                    else if (p.startsWith('B.')) optb = p.substring(2).trim();
                    else if (p.startsWith('C.')) optc = p.substring(2).trim();
                    else if (p.startsWith('D.')) optd = p.substring(2).trim();
                }

                let ansLetter = explicitAns.match(/^[A-D]/i) ? explicitAns.match(/^[A-D]/i)[0].toUpperCase() : (boldIndex < boldMatches.length ? boldMatches[boldIndex++][1].toUpperCase() : "");
                ans = (ansLetter==='A')?optA : (ansLetter==='B')?optb : (ansLetter==='C')?optc : (ansLetter==='D')?optd : explicitAns;
                if (!ans && ansLetter) ans = ansLetter;
            }

            qContent = qContent.replace(new RegExp('^' + qRegPattern + '[\\s\\*]*', 'i'), '').replace(/<n>/gi, '').trim();

            window.bulk_parsed_questions.push({
                lesson: pendingLessonID, type: finalType, level: currentLevel, q: qContent,
                opta: optA, optb: optb, optc: optc, optd: optd, a: ans, answer: ans, hint: qHint, lessonname: pendingLessonName, 
                image: multiLink, multimedia: multiLink, original_q: block
            });

            if (trailingHeaders && /Mức\s*(\d+)/i.test(trailingHeaders)) pendingLevel = parseInt(trailingHeaders.match(/Mức\s*(\d+)/i)[1]);
            if (trailingHeaders && /CÂU HỎI ĐIỀN KHUYẾT/i.test(trailingHeaders)) pendingType = 'fill';
            if (trailingHeaders && /CÂU HỎI ĐÚNG SAI/i.test(trailingHeaders)) pendingType = 'tf';
            if (trailingHeaders && /CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM/i.test(trailingHeaders)) pendingType = 'single';
        });
    }

    let btnSave = document.getElementById('btn_save_bulk');
    if (window.bulk_parsed_questions.length > 0) {
        if(btnSave) btnSave.classList.remove('disabled');
        window.render_bulk_preview(); 
    } else {
        if(btnSave) btnSave.classList.add('disabled');
        document.getElementById('bulk_preview_area').innerHTML = `<div class="d-flex flex-column justify-content-center align-items-center h-100 text-white-50"><i class="bi bi-table opacity-25 mb-2" style="font-size: 2.5rem;"></i><span style="font-size: 0.8rem;">Bảng kết quả gốc sẽ hiển thị tại đây.</span></div>`;
    }
};