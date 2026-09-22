// =========================================================================
// 🌟 HÀM RENDER BẢNG 12 CỘT (V15.3 ĐÃ TÍCH HỢP KÉO GIÃN CỘT TỪ V1)
// =========================================================================
window.render_bulk_preview = function() {
    let previewContainer = document.getElementById('bulk_preview_area');
    
    // 1. Kiểm tra dữ liệu rỗng (Lấy từ Hàm 1)
    if (!window.bulk_parsed_questions || window.bulk_parsed_questions.length === 0) {
        previewContainer.innerHTML = `<div class="d-flex flex-column justify-content-center align-items-center h-100 text-danger thin-font"><i class="bi bi-exclamation-triangle fs-3 mb-2"></i><span>Không tìm thấy dữ liệu hợp lệ</span></div>`;
        return;
    }

    // Bật nút Lưu và Toggle (Lấy từ Hàm 1)
    let btnSave = document.getElementById('btn_save_bulk');
    if(btnSave) btnSave.classList.remove('disabled');
    let toggleContainer = document.getElementById('col_toggles_container');
    if(toggleContainer) { toggleContainer.style.opacity = '1'; toggleContainer.style.pointerEvents = 'auto'; }

    // 2. CSS & Giao diện V15.3 mỏng nhẹ
    let html = `
    <style>
        .text-ellipsis-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .text-ellipsis-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        
        .editable-cell { transition: all 0.2s; cursor: pointer; padding: 1px 2px; border-radius: 2px; width: 100%; word-break: break-word; line-height: 1.2; border: 1px dashed transparent; font-size: 0.75rem; color: #ffffff; }
        .editable-cell:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); }
        .editable-cell.is-editing { -webkit-line-clamp: unset !important; overflow: visible !important; min-height: 40px; z-index: 100; position: relative; background: rgba(0,0,0,0.95) !important; color: #ffffff !important; cursor: text; border: 1px solid #38bdf8 !important; }
        
        #preview_excel_table { --bs-table-bg: transparent !important; background-color: transparent !important; color: #ffffff; font-size: 0.75rem; -webkit-font-smoothing: antialiased; }
        #preview_excel_table th { background: rgba(15,23,42,0.95) !important; backdrop-filter: blur(8px); border-bottom: 1px solid rgba(255,255,255,0.4); padding: 4px 2px; border-right: 1px solid rgba(255,255,255,0.05); color: #ffffff; font-weight: normal; text-align: center; font-size: 0.7rem; text-transform: uppercase; }
        #preview_excel_table td { padding: 2px; border-bottom: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.02); vertical-align: top; }
        
        .row-hover-magic { transition: background 0.2s; cursor: pointer; }
        .row-hover-magic:hover { background: rgba(255,255,255,0.1) !important; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.3); border-radius: 4px; }
    </style>
    <div class="table-responsive flex-grow-1 custom-scrollbar w-100 h-100">
        <table class="table table-borderless align-middle m-0" id="preview_excel_table" style="table-layout: fixed; width: 100%;">
            <thead style="position: sticky; top: 0; z-index: 10;">
                <tr>
                    <th style="width: 3%;">STT</th>
                    <th style="width: 4%;">BÀI</th>
                    <th style="width: 8%; text-align: left;">TÊN BÀI</th>
                    <th style="width: 6%;">DẠNG</th>
                    <th style="width: 4%;">MỨC</th>
                    <th style="width: 25%; text-align: left;">NỘI DUNG CÂU HỎI</th>
                    <th style="width: 20%; text-align: left;">LỰA CHỌN A,B,C,D</th>
                    <th style="width: 12%; text-align: left;">ĐÁP ÁN</th>
                    <th style="width: 12%; text-align: left;">GIẢI THÍCH</th>
                    <th style="width: 4%;">MEDIA</th>
                    <th style="width: 2%;">XÓA</th>
                </tr>
            </thead>
            <tbody>
    `;

    // 3. Render Data với Logic chuẩn của V15.3
    window.bulk_parsed_questions.forEach((q, index) => {
        let typeText = q.type === 'single' ? 'Trắc nghiệm' : (q.type === 'tf' ? 'Đúng/Sai' : 'Điền khuyết');
        let typeColor = q.type === 'single' ? '#7dd3fc' : (q.type === 'tf' ? '#fde047' : '#86efac');
        let isError = !q.q || !q.a;
        let bgStyle = isError ? 'background: rgba(239, 68, 68, 0.25) !important;' : '';

        let optionsHtml = '';
        if (q.type === 'single') {
            optionsHtml = `
            <div class="d-flex flex-column w-100" style="gap: 1px;">
                <div class="d-flex align-items-start"><span class="me-1" style="color: #ffffff;">A.</span><div class="editable-cell text-ellipsis-2 flex-grow-1 p-0 m-0" title="Nhấp đúp để sửa" ondblclick="enable_cell_edit(this)" onblur="save_cell_data(${index}, 'opta', this)">${q.opta}</div></div>
                <div class="d-flex align-items-start"><span class="me-1" style="color: #ffffff;">B.</span><div class="editable-cell text-ellipsis-2 flex-grow-1 p-0 m-0" title="Nhấp đúp để sửa" ondblclick="enable_cell_edit(this)" onblur="save_cell_data(${index}, 'optb', this)">${q.optb}</div></div>
                <div class="d-flex align-items-start"><span class="me-1" style="color: #ffffff;">C.</span><div class="editable-cell text-ellipsis-2 flex-grow-1 p-0 m-0" title="Nhấp đúp để sửa" ondblclick="enable_cell_edit(this)" onblur="save_cell_data(${index}, 'optc', this)">${q.optc}</div></div>
                <div class="d-flex align-items-start"><span class="me-1" style="color: #ffffff;">D.</span><div class="editable-cell text-ellipsis-2 flex-grow-1 p-0 m-0" title="Nhấp đúp để sửa" ondblclick="enable_cell_edit(this)" onblur="save_cell_data(${index}, 'optd', this)">${q.optd}</div></div>
            </div>`;
        } else {
            optionsHtml = '<span style="color:#ffffff; opacity:0.5;">-</span>';
        }

        html += `
        <tr class="row-hover-magic" id="row_${index}" style="${bgStyle}" onclick="highlight_source_text_v7(${index}, event)">
            <td class="text-center border-0">${index + 1}</td>
            <td class="text-center border-0">
                <div class="editable-cell text-center" ondblclick="enable_cell_edit(this)" onblur="save_cell_data(${index}, 'lesson', this)">${q.lesson}</div>
            </td>
            <td class="border-0">
                <div class="editable-cell text-ellipsis-2" title="Nhấp đúp để sửa" ondblclick="enable_cell_edit(this)" onblur="save_cell_data(${index}, 'lessonname', this)">${q.lessonname || ''}</div>
            </td>
            <td class="text-center border-0" style="color: ${typeColor};">
                <div class="editable-cell text-center" ondblclick="enable_cell_edit(this)" onblur="save_cell_data(${index}, 'type', this)">${typeText}</div>
            </td>
            <td class="text-center border-0">
                <div class="editable-cell text-center" ondblclick="enable_cell_edit(this)" onblur="save_cell_data(${index}, 'level', this)">${q.level}</div>
            </td>
            <td class="border-0">
                <div class="editable-cell text-ellipsis-3" title="Nhấp đúp để sửa" ondblclick="enable_cell_edit(this)" onblur="save_cell_data(${index}, 'q', this)">${q.q}</div>
            </td>
            <td class="border-0">
                ${optionsHtml}
            </td>
            <td class="border-0">
                <div class="editable-cell text-ellipsis-2" title="Nhấp đúp để sửa" ondblclick="enable_cell_edit(this)" onblur="save_cell_data(${index}, 'a', this)">${q.a}</div>
            </td>
            <td class="border-0">
                <div class="editable-cell text-ellipsis-2" title="Nhấp đúp để sửa" ondblclick="enable_cell_edit(this)" onblur="save_cell_data(${index}, 'hint', this)">${q.hint || ''}</div>
            </td>
            <td class="text-center border-0">
                <div class="editable-cell text-center text-ellipsis-2" title="Nhấp đúp để sửa" ondblclick="enable_cell_edit(this)" onblur="save_cell_data(${index}, 'multimedia', this)">${q.image || q.multimedia || ''}</div>
            </td>
            <td class="text-center border-0">
                <button class="btn btn-sm text-danger hover-opacity-100 p-0 border-0 bg-transparent" onclick="event.stopPropagation(); window.bulk_parsed_questions.splice(${index}, 1); trigger_live_parse();"><i class="bi bi-trash3 fs-6"></i></button>
            </td>
        </tr>`;
    });
    
    html += `</tbody></table></div>`;
    previewContainer.innerHTML = html;

    // 4. Phục hồi Toggle Cột
    let toggles = document.querySelectorAll('.toggle-btn');
    toggles.forEach(btn => {
        if (!btn.classList.contains('active')) {
            let match = btn.getAttribute('onclick').match(/\d+/);
            if (match) {
                let colIndex = match[0];
                let cells = document.querySelectorAll(`#preview_excel_table th:nth-child(${colIndex}), #preview_excel_table td:nth-child(${colIndex})`);
                cells.forEach(cell => cell.style.display = 'none');
            }
        }
    });

    // 5. TÍNH NĂNG RESIZE CỘT (Đã ghép nối từ Hàm 1)
    let ths = document.querySelectorAll('#preview_excel_table th');
    ths.forEach(th => {
        if (th === ths[ths.length - 1]) return; 
        
        let resizer = document.createElement('div');
        resizer.style.cssText = 'position:absolute; right:0; top:0; width:6px; height:100%; cursor:col-resize; z-index:11; background: transparent; border-right: 1px solid rgba(255,255,255,0.15); transition: background 0.2s;';
        
        resizer.onmouseover = () => { resizer.style.background = 'rgba(56, 189, 248, 0.5)'; resizer.style.width = '8px'; };
        resizer.onmouseout = () => { resizer.style.background = 'transparent'; resizer.style.width = '6px'; };

        th.style.position = 'relative';
        th.appendChild(resizer);
        
        let startX, startWidth;
        
        let startDrag = function(e) {
            startX = e.pageX || (e.touches ? e.touches[0].pageX : 0);
            startWidth = th.offsetWidth;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('touchmove', onMouseMove, {passive: false});
            document.addEventListener('touchend', onMouseUp);
            resizer.style.background = 'rgba(56, 189, 248, 0.8)';
        };
        
        resizer.addEventListener('mousedown', startDrag);
        resizer.addEventListener('touchstart', startDrag, {passive: true});

        function onMouseMove(e) {
            let currentX = e.pageX || (e.touches ? e.touches[0].pageX : startX);
            let newWidth = startWidth + currentX - startX;
            if (newWidth > 20) { th.style.width = newWidth + 'px'; }
        }
        
        function onMouseUp() {
            resizer.style.background = 'transparent';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onMouseMove);
            document.removeEventListener('touchend', onMouseUp);
        }
    });

    // 6. Tối ưu hóa MathJax
    if (window.MathJax) { 
        setTimeout(function() {
            MathJax.typesetPromise([previewContainer]).catch(function (err) {
                console.log('MathJax error: ', err.message);
            });
        }, 50);
    }
};
// =========================================================================
// 💾 HÀM LƯU GOM CỤM (BULK SYNC) - ĐÓNG MODAL V12 SAU KHI XONG
// =========================================================================
window.bulk_save_state = { isSaving: false, currentIndex: 0, total: 0, successCount: 0 };

window.confirm_save_bulk = async function() {
    if (!window.bulk_parsed_questions || window.bulk_parsed_questions.length === 0) {
        if (typeof show_toast === 'function') show_toast("⚠️ Bảng dữ liệu trống, không có gì để lưu!");
        return;
    }
    
    let btn = document.getElementById('btn_save_bulk');
    let state = window.bulk_save_state;

    state.currentIndex = 0;
    state.successCount = 0;
    state.total = window.bulk_parsed_questions.length;
    state.isSaving = true;

    if (btn) {
        btn.classList.add('disabled', 'btn-info');
        btn.classList.remove('btn-danger', 'btn-success');
        btn.style.pointerEvents = 'none';
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> ĐANG LƯU LÊN SUPABASE...`;
    }

    let finalSubj = window.current_subject || window.temp_subject_key;
    if (!finalSubj) {
        alert("Lỗi: Không tìm thấy mã môn học!");
        state.isSaving = false;
        if(btn) btn.innerHTML = `LƯU VÀO NGÂN HÀNG`;
        return;
    }

    let dbClient = window.db || window.supabase || window.supabaseClient;
    if (!dbClient) {
        alert("⚠️ Lỗi: Không tìm thấy kết nối Supabase!");
        return;
    }

    // 🌟 BỘ LỌC TỰ ĐỘNG DỌN RÁC "Empty" TRƯỚC KHI LƯU
    const cleanVal = (val) => {
        if (!val) return null;
        let str = String(val).trim();
        // Nếu thấy chữ Empty hoặc chuỗi trống thì trả về null chuẩn
        if (str === 'Empty' || str === '') return null; 
        return str;
    };

    let payloadArray = [];
    for (let i = 0; i < state.total; i++) {
        let q = window.bulk_parsed_questions[i];
        let mappedType = q.type;
        if (mappedType === 'tf' || mappedType === 'đúng sai') mappedType = 'true_false'; 
        if (mappedType === 'mcq') mappedType = 'single';
        
        // 🟢 ĐƯA DỮ LIỆU QUA BỘ LỌC cleanVal() ĐỂ ÉP VỀ NULL
        payloadArray.push({
            subject_key: finalSubj,
            lesson: q.lesson || (window.selected_lessons_text || "1"), 
            type: mappedType, 
            level: String(parseInt(q.level) || 1),
            q: cleanVal(q.q), 
            opt_a: cleanVal(q.opta || q.opt_a), 
            opt_b: cleanVal(q.optb || q.opt_b), 
            opt_c: cleanVal(q.optc || q.opt_c), 
            opt_d: cleanVal(q.optd || q.opt_d),
            answer: cleanVal(q.answer || q.a), 
            hint: cleanVal(q.hint), 
            lessonname: cleanVal(q.lessonname), 
            multimedia: cleanVal(q.image || q.multimedia),
            old_uuid: null // Tự động set null cho an toàn
        });
    }

    try {
        const { error } = await dbClient.from('questions').insert(payloadArray);
        if (error) throw error;

        for (let i = 0; i < state.total; i++) {
            state.successCount++;
            let rowEl = document.getElementById(`row_${i}`);
            if (rowEl) {
                rowEl.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
                rowEl.style.opacity = '0.4';
                rowEl.style.pointerEvents = 'none';
            }
        }

        state.isSaving = false;
        window.bulk_parsed_questions = []; 
        
        if (typeof window.clean_up_ghost_drafts === 'function') window.clean_up_ghost_drafts();
        if (typeof show_toast === 'function') show_toast(`🎉 HOÀN THÀNH: Đã lưu thành công ${state.successCount} câu hỏi!`);
        
        if (typeof close_trainable_modal === 'function') close_trainable_modal();
        if (typeof close_bulk_import_modal === 'function') close_bulk_import_modal();
        if (typeof close_type_import_modal === 'function') close_type_import_modal();
        document.body.style.overflow = ''; 

        let iconEl = document.createElement("i");
        if (typeof window.refresh_subject_data === 'function') {
            window.refresh_subject_data(finalSubj, iconEl);
        } else if (typeof render_admin_panel === 'function') {
            render_admin_panel();
        }

    } catch (err) {
        console.error("Lỗi đồng bộ dữ liệu: " + err.message);
        state.isSaving = false;
        if (btn) {
            btn.classList.remove('disabled', 'btn-info');
            btn.classList.add('btn-danger');
            btn.style.pointerEvents = 'auto'; 
            btn.innerHTML = `<i class="bi bi-play-circle-fill me-1"></i> LỖI MẠNG! BẤM LƯU LẠI`;
        }
        if (typeof show_toast === 'function') show_toast(`⚠️ Lỗi kết nối: ${err.message}`, true);
    }
};
// =========================================================================
// 🚀 HÀM ĐÓN DỮ LIỆU DÁN (SMART PASTE 8.1 - HOÀN THIỆN ĐỌC CỘT L MEDIA)
// =========================================================================
window.handle_paste_auto_fill = function(e) {
    let pastedText = (e.clipboardData || window.clipboardData).getData('text');
    let htmlData = (e.clipboardData || window.clipboardData).getData('text/html');
    
    if (!pastedText) return;

    let cleanPastedText = pastedText.trim();
    
    // 🧹 Xóa bỏ các tiêu đề La Mã 
    cleanPastedText = cleanPastedText.replace(/^(?:I{1,3}|IV|V|VI)\.\s*[^\n\r]+[\n\r]+/i, '').trim();

    let parts = pastedText.split('\t');
    let isWordFormat = /^(Câu|Bài)\s*\d+[\.\:\s]+/i.test(cleanPastedText);

    // -----------------------------------------------------------------
    // 📊 TRƯỜNG HỢP 1: COPY TỪ EXCEL / GOOGLE SHEETS (Đọc chuẩn từ A đến L)
    // -----------------------------------------------------------------
    if (!isWordFormat && parts.length >= 5) {
        e.preventDefault(); 
        
        // Cột A (0): Số bài
        document.getElementById('modal_q_lesson').value = parts[0] ? parts[0].trim() : '';
        
        // Cột B (1): Loại câu (Kèm bộ chuyển ngữ)
        let rawType = parts[1] ? parts[1].trim().toLowerCase() : 'single';
        let type = 'single'; 
        if (rawType === 'tf' || rawType === 'true_false' || rawType === 'đúng sai') type = 'tf';
        else if (rawType === 'fill' || rawType === 'điền khuyết') type = 'fill';
        document.getElementById('modal_q_type').value = type;
        
        // Cột C (2): Mức độ
        document.getElementById('modal_q_level').value = parts[2] ? parts[2].trim() : '1';
        
        // Cột D (3): Nội dung câu hỏi
        document.getElementById('modal_q_text').value = parts[3] ? parts[3].trim() : ''; 
        
        toggle_modal_abcd_fields(type);

        // Đọc các cột tiếp theo theo vị trí tuyệt đối (E đến L)
        let optA = parts[4] ? parts[4].trim() : ''; 
        let optB = parts[5] ? parts[5].trim() : '';
        let optC = parts[6] ? parts[6].trim() : ''; 
        let optD = parts[7] ? parts[7].trim() : '';
        let answer = parts[8] ? parts[8].trim() : ''; 
        let hint = parts[9] ? parts[9].trim() : '';
        let lessonname = parts[10] ? parts[10].trim() : '';
        let mediaId = parts[11] ? parts[11].trim() : ''; // 🌟 CỘT L (11): MULTIMEDIA

        // Phân bổ vào form Trắc nghiệm
        if (type === 'single' || type === 'mcq') {
            document.getElementById('modal_opt_a').value = optA; 
            document.getElementById('modal_opt_b').value = optB;
            document.getElementById('modal_opt_c').value = optC; 
            document.getElementById('modal_opt_d').value = optD;

            setTimeout(() => {
                let ansLower = answer.toLowerCase();
                if (ansLower) {
                    if (ansLower === optA.toLowerCase()) auto_set_answer('a', document.getElementById('btn_check_a'), true);
                    else if (ansLower === optB.toLowerCase()) auto_set_answer('b', document.getElementById('btn_check_b'), true);
                    else if (ansLower === optC.toLowerCase()) auto_set_answer('c', document.getElementById('btn_check_c'), true);
                    else if (ansLower === optD.toLowerCase()) auto_set_answer('d', document.getElementById('btn_check_d'), true);
                }
            }, 50);
        } 

        // Phân bổ các trường dùng chung (Kể cả Đúng/Sai, Điền khuyết)
        document.getElementById('modal_q_ans').value = answer;
        document.getElementById('modal_q_hint').value = hint;
        if (lessonname) document.getElementById('modal_q_lessonname').value = lessonname;
        document.getElementById('modal_q_image').value = mediaId; // 🌟 Bơm Media ID vào đúng ô

        show_toast("✅ Đã bóc tách đủ 12 cột dữ liệu từ Sheet!");
        return; 
    }

    // -----------------------------------------------------------------
    // 📝 TRƯỜNG HỢP 2: COPY VĂN BẢN TỪ WORD / PDF (Giữ nguyên thuật toán AI)
    // -----------------------------------------------------------------
    e.preventDefault();

    let cleanText = cleanPastedText.replace(/^(Câu|Bài)\s*\d+[\.\:\s]+/i, '').trim();

    // AI Tự động nhận diện loại câu hỏi
    let detectedType = document.getElementById('modal_q_type').value; 
    
    let isMCQ = /(?:^|\s+)[aA][\.\)]\s+.*?(?:^|\s+)[bB][\.\)]\s+.*?(?:^|\s+)[cC][\.\)]\s+.*?(?:^|\s+)[dD][\.\)]\s+/is.test(cleanText);
    let isTF = /(?:Đáp\s*án\s*:?\s*)(Đúng|Sai)\.?\s*$/is.test(cleanText);check-btn
    let isFill = /[\.…_]{3,}/.test(cleanText);

    if (isMCQ) detectedType = 'single';
    else if (isTF) detectedType = 'tf';
    else if (isFill) detectedType = 'fill';

    document.getElementById('modal_q_type').value = detectedType;
    toggle_modal_abcd_fields(detectedType);

    // A. DẠNG TRẮC NGHIỆM
    if (detectedType === 'single' || detectedType === 'mcq') {
        let wordRegex = /(.*?)(?:^|\s+)[aA][\.\)]\s+(.*?)(?:^|\s+)[bB][\.\)]\s+(.*?)(?:^|\s+)[cC][\.\)]\s+(.*?)(?:^|\s+)[dD][\.\)]\s+(.*)/s;
        let match = cleanText.match(wordRegex);

        if (match) {
            document.getElementById('modal_q_text').value = match[1].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
            document.getElementById('modal_opt_a').value = match[2].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
            document.getElementById('modal_opt_b').value = match[3].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
            document.getElementById('modal_opt_c').value = match[4].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
            document.getElementById('modal_opt_d').value = match[5].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
            
            document.getElementById('modal_q_ans').value = '';
            document.querySelectorAll('.opt-check-btn').forEach(btn => {
                btn.innerHTML = ''; btn.style.background = 'transparent'; btn.style.borderColor = 'rgba(255, 255, 255, 0.4)'; btn.style.boxShadow = 'none';
            });
            window.current_checked_opt = null;

            let foundCorrectOpt = null;
            if (htmlData) {
                let styledLetterRegex = /<(b|strong|em|u|mark|span[^>]*style=["'][^"']*color:[^"']*["'])[^>]*>\s*([A-D])[\.\)]/i;
                let htmlMatch = htmlData.match(styledLetterRegex);
                if (htmlMatch && htmlMatch[2]) foundCorrectOpt = htmlMatch[2].toLowerCase();
            }

            if (foundCorrectOpt) {
                setTimeout(() => {
                    let btn = document.getElementById('btn_check_' + foundCorrectOpt);
                    if (btn) auto_set_answer(foundCorrectOpt, btn, false);
                    show_toast("✨ Đã tự nhận diện câu Trắc nghiệm & Đáp án!");
                }, 50);
            } else {
                show_toast("✨ Đã tự động nhận diện câu Trắc nghiệm!");
            }
        } else {
            document.getElementById('modal_q_text').value = cleanText.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
            show_toast("⚠️ Text không chuẩn. Đã dán vào Nội dung!");
        }
    } 
    
    // B. DẠNG ĐÚNG/SAI
    else if (detectedType === 'tf' || detectedType === 'true_false' || detectedType === 'đúng sai') {
        let tfRegex = /(.*?)(?:Đáp\s*án\s*:?\s*)(Đúng|Sai)\.?\s*$/is;
        let match = cleanText.match(tfRegex);
        
        if (match) {
            let rawQ = match[1].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
            document.getElementById('modal_q_text').value = rawQ;
            document.getElementById('modal_q_ans').value = match[2].trim();
            show_toast("✨ Đã tự động nhận diện câu Đúng/Sai!");
        } else {
            let rawQ = cleanText.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
            document.getElementById('modal_q_text').value = rawQ;
            document.getElementById('modal_q_ans').value = '';
            show_toast("✨ Đã dán câu Đúng/Sai. Hãy điền đáp án nhé!");
        }
    }
    
    // C. DẠNG ĐIỀN KHUYẾT
    else if (detectedType === 'fill' || detectedType === 'điền khuyết') {
        let fillRegex = /(.*?)(?:Đáp\s*án\s*:?\s*)(.*)/is;
        let match = cleanText.match(fillRegex);
        
        let rawQ = "";
        let rawAns = "";

        if (match) {
            rawQ = match[1];
            rawAns = match[2].trim();
        } else {
            rawQ = cleanText;
        }

        rawQ = rawQ.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
        rawQ = rawQ.replace(/[\.…_]{2,}(?:\s*\([a-zA-Z0-9]\)\s*[\.…_]*)?/g, ' [...] ');
        rawQ = rawQ.replace(/\s+/g, ' ').trim();
        document.getElementById('modal_q_text').value = rawQ;

        if (rawAns) {
            rawAns = rawAns.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
            let formattedAns = rawAns.replace(/(?:^|\s+)[a-zA-Z][\.\)]\s+/g, ' | ');
            formattedAns = formattedAns.replace(/^[\s\|]+/, '').trim();
            document.getElementById('modal_q_ans').value = formattedAns;
            show_toast("✨ Đã tự nhận diện & bóc tách Điền khuyết!");
        } else {
            document.getElementById('modal_q_ans').value = ''; 
            show_toast("✨ Đã tạo ô trống [...] cho câu Điền khuyết!");
        }
    }
};
// =========================================================================
// 🚀 1. GIAO DIỆN TRẠM NHẬP STORY (ĐƯA SƠ ĐỒ LÊN TRÊN, BẢNG XUỐNG DƯỚI)
// =========================================================================
window.open_story_import_modal = function(lessonName) {
    let oldModal = document.getElementById('story_import_modal');
    if (oldModal) oldModal.remove();

    let modalHtml = `
    <style>
        .edit-cell { outline: none; padding: 4px; transition: 0.2s; border-radius: 4px; min-height: 24px; display: inline-block; width: 100%; word-break: break-word; }
        .edit-cell:focus { background: rgba(56, 189, 248, 0.15); box-shadow: inset 0 0 0 1px #38bdf8; }
        .edit-cell:hover { background: rgba(255, 255, 255, 0.08); cursor: text; }
        .story-table th { background: #0f172a !important; position: sticky; top: 0; z-index: 10; border-bottom: 2px solid #334155; color: #38bdf8; font-size: 0.75rem; white-space: nowrap; }
        .story-table td { border-color: #334155 !important; vertical-align: top; font-size: 0.8rem; }
    </style>
    <div id="story_import_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 26000;">
        <div class="d-flex flex-column shadow-lg" style="width: 98vw; height: 96vh; background: #0f172a; border: 1px solid #334155; border-radius: 8px;">
            
            <div class="d-flex justify-content-between align-items-center px-3 py-2" style="border-bottom: 1px solid #334155; background: #0f172a; border-radius: 8px 8px 0 0;">
                <div class="fw-bold d-flex align-items-center" style="color: #10b981; font-size: 0.95rem; letter-spacing: 0.5px;">
                    <i class="bi bi-bezier2 me-2 fs-5"></i> TRẠM NHẬP STORY V2 (SƠ ĐỒ NHÁNH & BẢNG DATA)
                </div>
                <button class="btn-close btn-close-white" style="font-size: 0.75rem;" onclick="document.getElementById('story_import_modal').remove()"></button>
            </div>

            <div class="d-flex p-2 gap-2" style="height: 45%;">
                
    <div class="d-flex flex-column rounded" style="flex: 3; border: 1px solid #334155; background: #1e293b;">
        <div class="p-2 text-white-50 d-flex justify-content-between align-items-center" style="font-size: 0.8rem; border-bottom: 1px solid #334155;">
            <div><i class="bi bi-pin-angle-fill text-danger me-1"></i> BƯỚC 1: Dán 14 Cột (Bài: <b class="text-white">${lessonName}</b>)</div>
            
            <div class="d-flex align-items-center gap-2">
                <button class="btn btn-sm text-info fw-bold py-0 px-2" style="border: 1px solid #0ea5e9; font-size: 0.7rem;" onclick="validate_pasted_story('${lessonName}')">QUÉT LOGIC</button>
                <button type="button" class="btn btn-sm btn-warning rounded-circle shadow p-0 d-flex align-items-center justify-content-center" onmousedown="event.preventDefault(); window.make_vocab_tag();" title="Magic Vocab: Tự động tra IPA & Dịch nghĩa" style="width: 28px; height: 28px; border: 1px solid #f59e0b; font-size: 1.1rem; flex-shrink: 0;">
                                🪄
                            </button>
            </div>
        </div>
        
        <textarea id="story_paste_area" class="form-control flex-grow-1 p-3 m-0 border-0 shadow-none text-white custom-scrollbar" style="background: transparent; resize: none; font-family: monospace; font-size: 0.8rem;" placeholder="Copy từ Excel/Word dán vào đây..."></textarea>
    </div>

    <div class="d-flex flex-column rounded custom-scrollbar" style="flex: 4; border: 1px solid #334155; background: #1e293b; overflow-y: auto;">
        <div class="p-2 fw-bold text-white-50 d-flex justify-content-between align-items-center" style="font-size: 0.8rem; border-bottom: 1px solid #334155; position: sticky; top:0; background: #1e293b; z-index: 5;">
            <span><i class="bi bi-diagram-3-fill text-info me-1"></i> BẢN ĐỒ CỐT TRUYỆN</span>
            <span id="story_status_badge" class="badge bg-secondary border border-secondary text-white-50">Chưa quét</span>
        </div>
        <div id="story_diagram_content" class="p-2 text-white-50" style="font-size: 0.85rem;">
            <div class="text-center mt-4"><i class="bi bi-eye-slash" style="font-size: 2rem;"></i><br>Sơ đồ và Báo cáo X-quang sẽ hiển thị tại đây.</div>
        </div>
    </div>
</div>

            <div class="d-flex justify-content-between align-items-center px-3 py-2 border-top border-bottom" style="border-color: #334155 !important; background: #0f172a;">
                <div class="text-warning fw-bold small"><i class="bi bi-pencil-square me-1"></i> BƯỚC 2: Kiểm tra và chỉnh sửa trực tiếp trên Bảng Data bên dưới trước khi lưu.</div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm text-white fw-bold px-3" style="background: rgba(255,255,255,0.05); border: 1px solid #475569; border-radius: 12px; font-size: 0.75rem;" onclick="document.getElementById('story_paste_area').value=''; document.getElementById('story_data_table_area').innerHTML=''; document.getElementById('story_diagram_content').innerHTML=''">
                        Xóa Trắng
                    </button>
                    <button id="btn_save_story" class="btn btn-sm text-white disabled opacity-50 fw-bold px-4" style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 12px; font-size: 0.75rem; transition: 0.3s;" onclick="save_validated_story('${window.current_subject}')">
                        LƯU DATA
                    </button>
                </div>
            </div>

            <div id="story_data_table_area" class="flex-grow-1 p-2 custom-scrollbar text-white-50" style="background: #111827; overflow-y: auto;">
                <div class="text-center mt-5"><i class="bi bi-table fs-1"></i><br>Bảng dữ liệu 14 cột sẽ xuất hiện tại đây.</div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setTimeout(() => document.getElementById('story_paste_area').focus(), 100);
};    
// =========================================================================
// 🚀 2. HÀM QUÉT X-QUANG (VẼ SƠ ĐỒ VÀ RENDER BẢNG EDITABLE 14 CỘT)
// =========================================================================
window.validate_pasted_story = function(targetLessonName) {
    let rawData = document.getElementById('story_paste_area').value.trim();
    let diagramBox = document.getElementById('story_diagram_content');
    let tableBox = document.getElementById('story_data_table_area');
    let btnSave = document.getElementById('btn_save_story');
    let statusBadge = document.getElementById('story_status_badge');

    if (!rawData) { alert("Vui lòng dán dữ liệu vào ô trống!"); return; }

    diagramBox.innerHTML = '<div class="text-info text-center mt-3"><div class="spinner-border spinner-border-sm me-2"></div>Đang phân tích logic và vẽ Sơ đồ...</div>';
    tableBox.innerHTML = '<div class="text-center mt-5 text-info"><div class="spinner-border me-2"></div>Đang dựng Bảng dữ liệu...</div>';
    btnSave.classList.add('disabled', 'opacity-50');

    setTimeout(() => {
        let rows = rawData.split('\n');
        let parsedData = [];
        let idTracker = {};
        let duplicateIDs = [];
        let logicErrors = [];
        let nameMismatchErrors = [];

        for (let i = 0; i < rows.length; i++) {
            let cols = rows[i].split('\t');
            if (cols.length < 13 || String(cols[3]).trim() === "") continue;

            let q = {
                rowNum: i + 1,
                lesson: cols[0] || "", type: cols[1] || "", level: cols[2] || "",
                q: cols[3] || "", optA: cols[4] || "", optB: cols[5] || "", optC: cols[6] || "", optD: cols[7] || "",
                answer: cols[8] || "", hint: cols[9] || "", lessonname: cols[10] || "", media: cols[11] || "", nav: cols[12] || "",
                uuid: (cols[13] && String(cols[13]).trim() !== "") ? String(cols[13]).trim() : window.generateShortUUID()
            };

            let targetClean = String(targetLessonName).trim().toLowerCase();
            let getNum = (str) => { let m = str.match(/\d+/); return m ? m[0] : str; };
            let isMatch = (String(q.lesson).trim().toLowerCase() === targetClean) ||
                          (getNum(String(q.lesson)) === getNum(targetClean)) ||
                          (String(q.lessonname).toLowerCase().includes(targetClean));

            if (!isMatch) nameMismatchErrors.push(`Dòng ${q.rowNum}`);

            let navStr = String(q.nav).trim().toUpperCase();
            let customIdMatch = navStr.match(/ID:([A-Z0-9_]+)/i);
            q.custom_id = customIdMatch ? customIdMatch[1].trim().toUpperCase() : String(parsedData.length + 1);

            if (idTracker[q.custom_id]) { if (!duplicateIDs.includes(q.custom_id)) duplicateIDs.push(q.custom_id); }
            else { idTracker[q.custom_id] = true; }
            parsedData.push(q);
        }

        if (parsedData.length === 0) {
            diagramBox.innerHTML = '<div class="text-danger p-2"><i class="bi bi-x-circle-fill me-1"></i> Lỗi: Không tìm thấy dữ liệu chuẩn 14 cột.</div>';
            tableBox.innerHTML = '<div class="text-center mt-5 text-danger">Dữ liệu không hợp lệ.</div>';
            statusBadge.className = 'badge bg-danger text-white'; statusBadge.innerText = 'Lỗi dữ liệu';
            return;
        }

        // =========================================================
        // 🌟 VẼ BẢNG EDITABLE — contenteditable + click → highlight
        // =========================================================
        let tableHtml = `
        <style>
            .edit-cell {
                display: block; outline: none; min-height: 1.2em;
                border-radius: 3px; padding: 1px 3px;
                transition: background 0.15s; cursor: text;
            }
            .edit-cell:focus {
                background: rgba(56,189,248,0.15);
                box-shadow: 0 0 0 1px #38bdf8;
            }
            .story-data-row { transition: background 0.15s; }
            .story-data-row.row-highlight td {
                background: rgba(251,191,36,0.15) !important;
                box-shadow: inset 0 0 0 1px #fbbf24;
            }
        </style>
        <table class="table table-dark table-bordered table-hover story-table mb-0 w-100">
            <thead>
                <tr class="text-center text-uppercase">
                    <th style="width:3%">STT</th><th style="width:5%">Bài</th><th style="width:10%">Tên Bài</th>
                    <th style="width:5%">Dạng</th><th style="width:3%">Mức</th><th style="width:20%">Nội Dung Câu Hỏi</th>
                    <th style="width:15%">Lựa chọn A,B,C,D</th><th style="width:8%">Đáp án</th><th style="width:12%">Giải thích</th>
                    <th style="width:5%">Media</th><th style="width:8%">Điều Hướng</th><th style="width:6%">UUID</th>
                </tr>
            </thead>
            <tbody>`;

        parsedData.forEach((q, idx) => {
            tableHtml += `
            <tr class="story-data-row" data-custom-id="${q.custom_id}">
                <td class="text-center text-white-50 align-middle">${idx + 1}</td>
                <td><span class="edit-cell" contenteditable="true">${q.lesson}</span></td>
                <td><span class="edit-cell" contenteditable="true">${q.lessonname}</span></td>
                <td><span class="edit-cell" contenteditable="true">${q.type}</span></td>
                <td class="text-center"><span class="edit-cell" contenteditable="true">${q.level}</span></td>
                <td><span class="edit-cell" contenteditable="true">${q.q}</span></td>
                <td>
                    <div class="d-flex"><b class="text-white-50 me-1">A.</b><span class="edit-cell flex-grow-1 border-bottom border-secondary mb-1" contenteditable="true">${q.optA}</span></div>
                    <div class="d-flex"><b class="text-white-50 me-1">B.</b><span class="edit-cell flex-grow-1 border-bottom border-secondary mb-1" contenteditable="true">${q.optB}</span></div>
                    <div class="d-flex"><b class="text-white-50 me-1">C.</b><span class="edit-cell flex-grow-1 border-bottom border-secondary mb-1" contenteditable="true">${q.optC}</span></div>
                    <div class="d-flex"><b class="text-white-50 me-1">D.</b><span class="edit-cell flex-grow-1" contenteditable="true">${q.optD}</span></div>
                </td>
                <td><span class="edit-cell text-success fw-bold" contenteditable="true">${q.answer}</span></td>
                <td><span class="edit-cell" contenteditable="true">${q.hint}</span></td>
                <td><span class="edit-cell text-info" contenteditable="true">${q.media}</span></td>
                <td><span class="edit-cell text-warning fw-bold" contenteditable="true">${q.nav}</span></td>
                <td><span class="edit-cell text-secondary" style="font-family:monospace;" contenteditable="true">${q.uuid}</span></td>
            </tr>`;
        });
        tableHtml += `</tbody></table>`;
        tableBox.innerHTML = tableHtml;

        // ✅ Gắn click vào từng row của BẢNG → highlight node trên sơ đồ + scroll diagramBox
        tableBox.querySelectorAll('.story-data-row').forEach(row => {
            row.addEventListener('click', (e) => {
                // Không trigger khi đang gõ vào ô edit
                if (e.target.classList.contains('edit-cell')) return;

                let cid = row.getAttribute('data-custom-id');

                // Xoá highlight row cũ
                tableBox.querySelectorAll('.row-highlight').forEach(r => r.classList.remove('row-highlight'));
                row.classList.add('row-highlight');

                // Tìm node Mermaid tương ứng và highlight
                let canvas = document.getElementById('mermaid_canvas');
                if (!canvas) return;

                // Xoá highlight node cũ
                canvas.querySelectorAll('.node rect, .node circle, .node polygon').forEach(el => {
                    el.style.stroke = ''; el.style.strokeWidth = ''; el.style.filter = '';
                });

                // Highlight node có label trùng cid
                canvas.querySelectorAll('.node').forEach(node => {
                    let label = node.querySelector('b')
                        ? node.querySelector('b').textContent.trim()
                        : node.textContent.trim();
                    if (label === cid) {
                        let shape = node.querySelector('rect, circle, polygon');
                        if (shape) {
                            shape.style.stroke = '#fbbf24';
                            shape.style.strokeWidth = '3px';
                            shape.style.filter = 'drop-shadow(0 0 6px #fbbf24)';
                        }
                        // Scroll diagramBox đến node đó
                        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
            });
        });

        // =========================================================
        // 🌟 BUILD MERMAID GRAPH — không linkStyle, không màu mũi tên
        // =========================================================
        let definedIDs = Object.keys(idTracker);
        let mermaidGraph = "graph TD\n";

        parsedData.forEach((q) => {
            let correctVal = String(q.answer).trim();
            let correctLetter = "";
            if (correctVal.toUpperCase() === 'A' || String(q.optA).trim().toLowerCase() === correctVal.toLowerCase()) correctLetter = 'A';
            else if (correctVal.toUpperCase() === 'B' || String(q.optB).trim().toLowerCase() === correctVal.toLowerCase()) correctLetter = 'B';
            else if (correctVal.toUpperCase() === 'C' || String(q.optC).trim().toLowerCase() === correctVal.toLowerCase()) correctLetter = 'C';
            else if (correctVal.toUpperCase() === 'D' || String(q.optD).trim().toLowerCase() === correctVal.toLowerCase()) correctLetter = 'D';

            let isFail = q.custom_id.includes('FAIL') || q.custom_id.includes('SAI');
            let isEnd  = q.custom_id.includes('VICTORY') || q.custom_id.includes('END');

            if (isFail)     mermaidGraph += `${q.custom_id}["<b style='color:#ef4444'>${q.custom_id}</b>"]\n`;
            else if (isEnd) mermaidGraph += `${q.custom_id}["<b style='color:#10b981'>${q.custom_id}</b>"]\n`;
            else            mermaidGraph += `${q.custom_id}["<b style='color:#38bdf8'>${q.custom_id}</b>"]\n`;

            let navStr = String(q.nav).trim().toUpperCase();
            if (!navStr) {
                logicErrors.push(`<div class="text-warning mb-1"><i class="bi bi-exclamation-triangle-fill me-1"></i> Dòng ${q.rowNum}: Chưa có lệnh điều hướng.</div>`);
            } else {
                let routingPart = navStr.includes('|') ? navStr.split('|')[1] : navStr;
                routingPart.split(/[,;]/).forEach(part => {
                    if (part.includes(':')) {
                        let [opt, target] = part.split(':').map(s => s.trim().toUpperCase());
                        mermaidGraph += `${q.custom_id} --"${opt}"--> ${target}\n`;

                        if (target !== 'END' && !target.includes('END') && !definedIDs.includes(target)) {
                            logicErrors.push(`<div class="text-danger mb-1"><i class="bi bi-x-octagon-fill me-1"></i> LỖI ĐỨT GÃY Dòng ${q.rowNum} (ID: ${q.custom_id}): Trỏ đến đích <strong>'${target}'</strong> không tồn tại.</div>`);
                        }
                        if (opt === correctLetter && (target.includes('FAIL') || target.includes('SAI'))) {
                            logicErrors.push(`<div class="text-danger mb-1"><i class="bi bi-x-octagon-fill me-1"></i> LỖI TƯ DUY Dòng ${q.rowNum} (ID: ${q.custom_id}): Đáp án đúng nhưng gán nhảy vào nhánh sai.</div>`);
                        }
                    }
                });
            }
        });

        mermaidGraph += `END["<b style='color:#fbbf24'>KẾT THÚC</b>"]\n`;
        mermaidGraph += `classDef default fill:#1e293b,stroke:#334155,stroke-width:2px;\n`;

        // =========================================================
        // 🌟 BUILD BÁO CÁO HTML
        // =========================================================
        let hasFatalError = (
            nameMismatchErrors.length > 0 ||
            duplicateIDs.length > 0 ||
            logicErrors.some(e => e.includes('text-danger'))
        );

        let reportHtml = `<h6 class="text-white border-bottom border-secondary pb-2 mb-3">Kết quả phân tích <b>${parsedData.length}</b> tình huống kịch bản:</h6>`;

        if (nameMismatchErrors.length > 0)
            reportHtml += `<div class="text-danger mb-2 fw-bold"><i class="bi bi-file-earmark-x-fill me-1"></i> CẢNH BÁO SAI BÀI: [${nameMismatchErrors.join(", ")}] không khớp Bài "${targetLessonName}".</div>`;
        if (duplicateIDs.length > 0)
            reportHtml += `<div class="text-danger mb-2 fw-bold"><i class="bi bi-bug-fill me-1"></i> CẢNH BÁO TRÙNG ID: ${duplicateIDs.join(", ")}</div>`;

        reportHtml += logicErrors.filter(e => e.includes('text-danger')).join('');
        reportHtml += logicErrors.filter(e => e.includes('text-warning')).join('');

        if (hasFatalError) {
            statusBadge.className = 'badge bg-danger text-white border border-danger';
            statusBadge.innerText = 'Lỗi Logic';
            reportHtml += `<div class="text-danger mt-3 p-2 rounded fw-bold" style="background:rgba(220,38,38,0.1);border:1px dashed #ef4444;"><i class="bi bi-shield-x me-1"></i> Kịch bản bị lỗi Logic. Vui lòng sửa lại và quét lại!</div>`;
            btnSave.classList.remove('disabled', 'opacity-50');
            btnSave.style.borderColor = '#fbbf24'; btnSave.style.color = '#fbbf24'; btnSave.innerText = 'CỐ LƯU DÙ CÓ LỖI';
        } else {
            statusBadge.className = 'badge bg-success text-white border border-success';
            statusBadge.innerText = 'Hợp lệ 100%';
            reportHtml += `<div class="text-success my-3 p-2 rounded fw-bold" style="background:rgba(16,185,129,0.1);border:1px dashed #10b981;"><i class="bi bi-shield-check me-1"></i> Kịch bản hoàn hảo! Sẵn sàng lưu Data.</div>`;
            reportHtml += `
            <div class="mt-2 p-3 rounded" style="background:rgba(0,0,0,0.5);border:1px solid rgba(14,165,233,0.3);">
                <div class="text-info fw-bold mb-2 small text-uppercase" style="letter-spacing:1px;">
                    <i class="bi bi-diagram-3-fill me-1"></i> Sơ đồ Cốt truyện
                    <span class="text-white-50 fw-normal ms-2" style="font-size:0.75rem;">— Click node hoặc dòng bảng để đồng bộ highlight</span>
                </div>
                <div id="mermaid_canvas" class="text-center w-100 overflow-auto custom-scrollbar" style="max-height:420px;">
                    <div class="spinner-border spinner-border-sm text-info"></div> Đang vẽ sơ đồ...
                </div>
            </div>`;
            btnSave.classList.remove('disabled', 'opacity-50');
            btnSave.style.borderColor = '#10b981'; btnSave.style.color = '#10b981'; btnSave.innerText = 'LƯU DATA';
            window.validated_story_data_temp = parsedData;
        }

        // ✅ Inject DOM trước
        diagramBox.innerHTML = reportHtml;

        // =========================================================
        // 🌟 VẼ SƠ ĐỒ + GẮN CLICK NODE → SCROLL & HIGHLIGHT BẢNG
        // =========================================================
        if (!hasFatalError) {
            const drawMermaid = async function() {
                try {
                    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
                    const { svg } = await mermaid.render('mermaid_svg_' + Date.now(), mermaidGraph);
                    const canvas = document.getElementById('mermaid_canvas');
                    canvas.innerHTML = svg;

                    // ✅ Click node SVG → highlight row bảng + scroll
                    canvas.querySelectorAll('.node').forEach(node => {
                        node.style.cursor = 'pointer';
                        node.addEventListener('click', () => {
                            let label = node.querySelector('b')
                                ? node.querySelector('b').textContent.trim()
                                : node.textContent.trim();

                            // Highlight node trên sơ đồ
                            canvas.querySelectorAll('.node rect, .node circle, .node polygon').forEach(el => {
                                el.style.stroke = ''; el.style.strokeWidth = ''; el.style.filter = '';
                            });
                            let shape = node.querySelector('rect, circle, polygon');
                            if (shape) {
                                shape.style.stroke = '#fbbf24';
                                shape.style.strokeWidth = '3px';
                                shape.style.filter = 'drop-shadow(0 0 6px #fbbf24)';
                            }

                            // Tìm row bảng tương ứng
                            let targetRow = tableBox.querySelector(`tr[data-custom-id="${label}"]`);
                            if (!targetRow) return;
                            tableBox.querySelectorAll('.row-highlight').forEach(r => r.classList.remove('row-highlight'));
                            targetRow.classList.add('row-highlight');
                            targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        });
                    });

                } catch(err) {
                    document.getElementById('mermaid_canvas').innerHTML =
                        `<span class="text-danger small"><i class="bi bi-exclamation-triangle me-1"></i> Cốt truyện quá phức tạp, không thể vẽ sơ đồ. Bạn vẫn có thể lưu Data bình thường.</span>`;
                }
            };

            if (!window.mermaid) {
                let script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js";
                script.onload = drawMermaid;
                document.head.appendChild(script);
            } else {
                drawMermaid();
            }
        }

    }, 500);
};
// =========================================================================
// 🚀 3. HÀM LƯU LÊN MÁY CHỦ (BẮT SỐNG DỮ LIỆU ĐÃ CHỈNH SỬA TỪ BẢNG)
// =========================================================================
window.save_validated_story = async function(subjectKey) {
    let rows = document.querySelectorAll('.story-data-row');
    if (!rows || rows.length === 0) { alert("Không có dữ liệu trên bảng để lưu!"); return; }
    
    let btnSave = document.getElementById('btn_save_story');
    let originalText = btnSave.innerHTML;
    btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>ĐANG LƯU...';
    btnSave.disabled = true;

    let dataToPush = [];
    
    // Quét từng hàng trên bảng để lấy dữ liệu đã chỉnh sửa
    rows.forEach(tr => {
        let cells = tr.querySelectorAll('.edit-cell');
        let safeGet = (index) => cells[index] ? cells[index].innerText.trim() : "";

        dataToPush.push({
            subject_key: subjectKey,
            lesson: safeGet(0),
            type: safeGet(2),
            level: parseInt(safeGet(3)) || 1,
            question_text: safeGet(4),
            opt_a: safeGet(5),
            opt_b: safeGet(6),
            opt_c: safeGet(7),
            opt_d: safeGet(8),
            answer: safeGet(9),
            hint: safeGet(10),
            lessonname: safeGet(1),
            multimedia: safeGet(11),
            navigation: safeGet(12),
            old_uuid: safeGet(13)
        });
    });

    try {
        const { error } = await db.from('questions').insert(dataToPush);
        if (error) throw error;
        
        if(typeof show_toast === 'function') show_toast("🎉 Đã lưu thành công " + dataToPush.length + " câu vào Supabase!");
        else alert("🎉 Đã lưu thành công " + dataToPush.length + " tình huống!");
        
        document.getElementById('story_import_modal').remove();
        
        // Cập nhật lại giao diện hoặc làm mới danh sách câu hỏi
        let iconEl = document.createElement("i");
        if (typeof window.refresh_subject_data === 'function') {
            window.refresh_subject_data(subjectKey, iconEl);
        } else if (typeof fetch_questions === 'function') {
            fetch_questions(subjectKey); 
        }
    } catch (err) {
        alert("❌ Lỗi khi lưu lên máy chủ: " + err.message);
        btnSave.innerHTML = originalText;
        btnSave.disabled = false;
    }
};
// =========================================================================
// 🔄 LOGIC XỬ LÝ NÚT TÍCH PHA LÊ (GỌN, ĐẸP, PHÁT SÁNG)
// =========================================================================
window.auto_set_answer = function(opt, btnEl, isInit = false) {
    window.current_checked_opt = opt;
    
    // Đưa tất cả các vòng tròn về trạng thái kính mờ (Rỗng)
    document.querySelectorAll('.opt-check-btn').forEach(btn => {
        btn.innerHTML = '';
        btn.style.background = 'transparent';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.4)';
        btn.style.boxShadow = 'none';
    });
    
    // Nút được chọn sẽ phát sáng ánh Xanh Neon rực rỡ và hiện dấu tích
    btnEl.innerHTML = '<i class="bi bi-check" style="color: #fff; font-size: 1.3rem; margin-top: 1px;"></i>';
    btnEl.style.background = '#0ea5e9'; // Màu Cyan Neon
    btnEl.style.borderColor = '#0ea5e9';
    btnEl.style.boxShadow = '0 0 12px rgba(14, 165, 233, 0.7)';
    
    // Tự động kéo chữ xuống ô "Đáp án đúng"
    if (!isInit) sync_answer_if_checked(opt);
};

window.sync_answer_if_checked = function(opt) {
    // Nếu gõ thêm chữ vào ô đang tích, tự động update xuống Đáp án đúng
    if (window.current_checked_opt === opt) {
        let val = document.getElementById('modal_opt_' + opt).value.trim();
        document.getElementById('modal_q_ans').value = val;
    }
};

// =========================================================================
// 🔄 HÀM ĐỔI CHỮ GỢI Ý SIÊU NGẮN GỌN
// =========================================================================
window.toggle_modal_abcd_fields = function(typeVal) {
    let container = document.getElementById('abcd_container');
    let ansInput = document.getElementById('modal_q_ans');
    let qTextInput = document.getElementById('modal_q_text');
    
    if (container) container.style.display = (typeVal === 'single' || typeVal === 'mcq') ? 'block' : 'none';
    
    if (ansInput) {
        if (typeVal === 'tf' || typeVal === 'true_false' || typeVal === 'đúng sai') {
            ansInput.placeholder = "🎯 Ghi: Đúng hoặc Sai";
        } else if (typeVal === 'fill' || typeVal === 'điền khuyết') {
            ansInput.placeholder = "🎯 Ghi nội dung điền (VD: 24h)";
        } else {
            ansInput.placeholder = "🎯 Đáp án Đúng";
        }
    }

    if (qTextInput) {
        if (typeVal === 'fill' || typeVal === 'điền khuyết') {
            qTextInput.placeholder = "📝 Nhập câu hỏi (Chèn [...] vào chỗ điền)";
        } else {
            qTextInput.placeholder = "📝 Nhập NỘI DUNG CÂU HỎI vào đây...";
        }
    }
};

// =========================================================================
// 4. LƯU, XÓA & HIỆU ỨNG TỰ ĐỘNG CUỘN (ĐÃ TÍCH HỢP DIỆT CÂU NHÁP)
// =========================================================================
window.direct_save_single_question = async function(idx) {
    let qTxt = document.getElementById('modal_q_text').value.trim();
    let ans = document.getElementById('modal_q_ans').value.trim();
    if (!qTxt || !ans) return alert("Vui lòng nhập Câu hỏi và Đáp án đúng!");
    
    let btn = document.getElementById('btn_save_sync');
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Đang xử lý...`;
    btn.disabled = true;
    
    let type = document.getElementById('modal_q_type').value;
    let optA = '', optB = '', optC = '', optD = '';
    if (type === 'single') {
        optA = document.getElementById('modal_opt_a').value.trim();
        optB = document.getElementById('modal_opt_b').value.trim();
        optC = document.getElementById('modal_opt_c').value.trim();
        optD = document.getElementById('modal_opt_d').value.trim();
    }
    
    let isNew = (idx === -1);
    let currentLesson = document.getElementById('modal_q_lesson').value.trim() || selected_lessons_text;
    let finalSubjectKey = window.current_subject || window.temp_subject_key;

    if (!finalSubjectKey) {
        alert("Lỗi: Không tìm thấy mã môn học! Vui lòng tải lại trang.");
        btn.innerHTML = `<i class="bi bi-cloud-arrow-up-fill me-1"></i> LƯU CÂU HỎI`;
        btn.disabled = false;
        return;
    }

    // Map dữ liệu sang format Supabase (Dùng cột chuẩn)
    let payload = {
        subject_key: finalSubjectKey,
        lesson: currentLesson,
        type: type,
        level: parseInt(document.getElementById('modal_q_level').value) || 1,
        question_text: qTxt,
        opt_a: optA, opt_b: optB, opt_c: optC, opt_d: optD,
        answer: ans,
        hint: document.getElementById('modal_q_hint').value.trim(),
        lessonname: document.getElementById('modal_q_lessonname').value.trim(),
        multimedia: document.getElementById('modal_q_image') ? document.getElementById('modal_q_image').value.trim() : ''
    };
    
    try {
        if (isNew) {
            // Thêm mới
            const { error } = await db.from('questions').insert([payload]);
            if (error) throw error;
            show_toast("Thêm câu hỏi mới thành công!");
        } else {
            // Cập nhật (Dựa vào ID cũ nếu có)
            let qId = questions[idx].id;
            if (qId) {
                // Thử update theo ID bảng questions (Cần check xem schema của thầy có primary key id không)
                // Hoặc nếu không có id, dùng old_uuid:
                const { error } = await db.from('questions').update(payload).match({ id: qId });
                if (error) throw error;
                show_toast("Đã cập nhật câu hỏi!");
            } else {
                throw new Error("Không xác định được ID của câu hỏi để cập nhật.");
            }
        }
        
        // Refresh giao diện danh sách
        let iconEl = document.createElement("i");
        window.refresh_subject_data(finalSubjectKey, iconEl);

        let modal = document.getElementById('q_admin_modal');
        if (modal) modal.remove();

        if (typeof window.clean_up_ghost_drafts === 'function') window.clean_up_ghost_drafts();

        setTimeout(() => {
            let container = document.getElementById('admin_table_container');
            if (container) {
                if (isNew) {
                    container.scrollTop = container.scrollHeight;
                } else {
                    let row = document.getElementById(`admin_row_${idx}`);
                    if (row) {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        row.style.backgroundColor = '#d1e7dd';
                        setTimeout(() => row.style.backgroundColor = 'transparent', 2000);
                    }
                }
            }
        }, 500);

    } catch (err) {
        alert("Lỗi đồng bộ: " + err.message);
        btn.innerHTML = `<i class="bi bi-cloud-arrow-up-fill me-1"></i> LƯU CÂU HỎI`;
        btn.disabled = false;
    }
};

window.delete_question_direct = function(idx) {
    show_alert("XÁC NHẬN XÓA", "Thầy chắc chắn muốn xóa vĩnh viễn câu này khỏi Supabase chứ?", async function(ans) {
        if (!ans) return;
        let targetQ = questions[idx];
        let qId = targetQ.id; // Lấy ID của câu để xóa

        if (!qId) return show_toast("⚠️ Câu hỏi chưa được đồng bộ, không thể xóa!", true);
        
        let btnDelete = document.querySelector(`button[onclick="delete_question_direct(${idx})"]`);
        if(btnDelete) btnDelete.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

        try {
            const { error } = await db.from('questions').delete().match({ id: qId });
            if (error) throw error;
            
            show_toast("✅ Xóa câu hỏi thành công!");
            
            let finalSubjectKey = window.current_subject || window.temp_subject_key;
            let iconEl = document.createElement("i");
            window.refresh_subject_data(finalSubjectKey, iconEl);
            
        } catch (err) {
            alert("Lỗi khi xóa: " + err.message);
            if(btnDelete) btnDelete.innerHTML = `<i class="bi bi-trash-fill fs-6"></i>`;
        }
    });
};
// =========================================================================
// 💾 HÀM LƯU DỮ LIỆU TẠM THỜI VÀO MẢNG
// =========================================================================
window.save_question_form_data = function(idx) {
    let type = document.getElementById('modal_q_type').value;
    let text = document.getElementById('modal_q_text').value.trim();
    let ans = document.getElementById('modal_q_ans').value.trim();
    let hint = document.getElementById('modal_q_hint').value.trim();
    let level = document.getElementById('modal_q_level').value;
    let lesson = document.getElementById('modal_q_lesson').value.trim();
    let lessonname = document.getElementById('modal_q_lessonname').value.trim();
    
    if (!text || !ans) return alert("Vui lòng nhập Câu hỏi và Đáp án đúng!");
    
    let optA = '', optB = '', optC = '', optD = '', optsArray = [];
    if (type === 'single') {
        optA = document.getElementById('modal_opt_a').value.trim();
        optB = document.getElementById('modal_opt_b').value.trim();
        optC = document.getElementById('modal_opt_c').value.trim();
        optD = document.getElementById('modal_opt_d').value.trim();
        optsArray = [optA, optB, optC, optD];
    }
    
    let item = {
        lesson: document.getElementById('modal_q_lesson').value,
        type: document.getElementById('modal_q_type').value,
        level: document.getElementById('modal_q_level').value,
        q: document.getElementById('modal_q_text').value,
        opta: document.getElementById('modal_opt_a').value,
        optb: document.getElementById('modal_opt_b').value,
        optc: document.getElementById('modal_opt_c').value,
        optd: document.getElementById('modal_opt_d').value,
        answer: document.getElementById('modal_q_ans').value,
        hint: document.getElementById('modal_q_hint').value,
        lessonname: document.getElementById('modal_q_lessonname').value,
        original_q: (idx >= 0) ? (questions[idx].original_q || questions[idx].q) : ""
    };
    
    if (idx >= 0) {
        questions[idx] = item; // Cập nhật câu cũ
    } else {
        questions.push(item); // Thêm câu mới vào cuối mảng
    }
    
    // Đóng modal và vẽ lại bảng
    document.getElementById('q_admin_modal').remove();
    render_admin_panel();
};

// XÓA ĐỒNG BỘ TRỰC TIẾP
window.delete_question_direct = function(idx) {
    show_alert("XÁC NHẬN XÓA", "Thầy chắc chắn muốn xóa vĩnh viễn câu này khỏi Google Sheets chứ?", function(ans) {
        if (!ans) return;
        let targetQ = questions[idx];
        let originalQ = targetQ.original_q || targetQ.q;
        
        let btnDelete = document.querySelector(`button[onclick="delete_question_direct(${idx})"]`);
        if(btnDelete) btnDelete.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

        google.script.run
            .withSuccessHandler(function(msg) {
                questions.splice(idx, 1);
                render_admin_panel();
                show_toast(msg);
            })
            .withFailureHandler(function(err) {
                alert("Lỗi khi xóa: " + err);
                if(btnDelete) btnDelete.innerHTML = `<i class="bi bi-trash-fill fs-6"></i>`;
            })
            .syncSingleQuestionToSheet(current_subject, "delete", targetQ, originalQ);
    });
};

window.export_questions_json = function() {
    let fileData = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
    let downloader = document.createElement('a');
    downloader.setAttribute("href", fileData);
    downloader.setAttribute("download", "Backup_Ngay_" + selected_lessons_text + ".json");
    document.body.appendChild(downloader);
    downloader.click();
    downloader.remove();
}

window.import_questions_json = function(element) {
    let uploadedFile = element.files[0];
    if (!uploadedFile) return;
    
    let reader = new FileReader();
    reader.onload = function(event) {
        try {
            let parsedData = JSON.parse(event.target.result);
            if (Array.isArray(parsedData)) {
                if (confirm(`Hệ thống tìm thấy ${parsedData.length} câu hỏi hợp lệ. Ghi đè vào danh sách hiện tại?`)) {
                    questions = parsedData;
                    render_admin_panel();
                }
            } else {
                alert("Định dạng tệp cấu trúc JSON không phù hợp!");
            }
        } catch(error) {
            alert("Lỗi phân tích cú pháp tệp dữ liệu đầu vào!");
        }
    };
    reader.readAsText(uploadedFile);
    element.value = ''; 
}

window.clean_up_ghost_drafts = function() {
    if (!questions || questions.length === 0) return;
    for (let i = questions.length - 1; i >= 0; i--) {
        if (questions[i].q && questions[i].q.includes("Câu nháp")) {
            let targetQ = questions[i];
            let originalQ = targetQ.original_q || targetQ.q;
            questions.splice(i, 1);
            if (typeof google !== 'undefined' && google.script) {
                google.script.run.syncSingleQuestionToSheet(window.current_subject, "delete", targetQ, originalQ);
            }
        }
    }
};
// =========================================================================
// 🚀 TÍNH NĂNG MINI-EXCEL VÀ ĐỐI CHIẾU THÔNG MINH
// =========================================================================

// 1. KHI DOUBLE CLICK -> MỞ FORM GÕ CHỮ
window.enable_cell_edit = function(element) {
    element.contentEditable = "true";
    element.classList.add('is-editing');
    element.focus();
    
    // Tự động đặt con trỏ nhấp nháy ở cuối dòng
    let selection = window.getSelection();
    let range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
};

// 2. KHI GÕ XONG, CLICK RA NGOÀI -> LƯU CHỮ & ĐÓNG FORM
window.save_cell_data = function(index, field, element) {
    element.contentEditable = "false";
    element.classList.remove('is-editing');
    
    if (window.bulk_parsed_questions[index]) {
        let val = element.innerText.trim();
        
        if (field === 'type') {
            let textLower = val.toLowerCase();
            if (textLower.includes('đúng') || textLower.includes('sai') || textLower === 'tf') val = 'tf';
            else if (textLower.includes('điền') || textLower === 'fill') val = 'fill';
            else val = 'single';
        }
        
        window.bulk_parsed_questions[index][field] = val;
        if (field === 'a') window.bulk_parsed_questions[index]['answer'] = val;
        if (field === 'multimedia') window.bulk_parsed_questions[index]['image'] = val;
    }
};

// =========================================================================
// 👁️ TÍNH NĂNG LIÊN KẾT (BÔI ĐEN + TỰ ĐỘNG CUỘN TRƯỢT MƯỢT MÀ)
// =========================================================================
window.highlight_source_text_v7 = function(index, event) {
    // Không cướp cò nếu đang Double-click để sửa chữ
    let isEditing = event && event.target && (event.target.classList.contains('editable-cell') || event.target.closest('.editable-cell'));
    if (isEditing) return;

    let q = window.bulk_parsed_questions[index];
    if (!q) return;

    // 🌟 TỰ ĐỘNG TÌM ĐÚNG Ô TEXTAREA ĐANG MỞ TRÊN MÀN HÌNH
    let textarea = document.getElementById('type_input_text');
    // Nếu không tìm thấy hoặc bị ẩn, chuyển sang tìm ô của màn Nhập Hàng Loạt
    if (!textarea || textarea.offsetWidth === 0) {
        textarea = document.getElementById('bulk_input_text');
    }
    
    if (!textarea) return;

    let fullText = textarea.value;
    let targetStr = q.original_q ? q.original_q.trim() : q.q; 
    let startIndex = fullText.indexOf(targetStr);

    if (startIndex !== -1) {
        let endIndex = startIndex + targetStr.length;
        
        textarea.focus();
        textarea.setSelectionRange(startIndex, endIndex);
        
        // Căn giữa khung nhìn
        let textBeforeTarget = fullText.substring(0, startIndex);
        let linesBefore = textBeforeTarget.split('\n').length;
        let totalLines = fullText.split('\n').length;
        
        if (totalLines > 0) {
            let scrollY = (linesBefore / totalLines) * textarea.scrollHeight;
            textarea.scrollTo({
                top: scrollY - (textarea.clientHeight / 2) + 30,
                behavior: 'smooth'
            });
        }
    }
};

window.nav_cell = function(event, element) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); 
        let currentTd = element.parentElement;
        let currentTr = currentTd.parentElement;
        let cellIndex = Array.from(currentTr.children).indexOf(currentTd);
        
        let targetTr = event.key === 'ArrowDown' ? currentTr.nextElementSibling : currentTr.previousElementSibling;
        if (targetTr) {
            let targetDiv = targetTr.children[cellIndex].querySelector('.editable-cell');
            if (targetDiv) enable_cell_edit(targetDiv); // Tự động mở khung edit khi nhấn mũi tên
        }
    }
};
// Hàm Đóng/Mở thẻ câu hỏi
window.toggle_q_card = function(idx) {
    let body = document.getElementById('q_body_' + idx);
    let icon = document.getElementById('q_icon_' + idx);
    
    if (body.style.display === 'none') {
        body.style.display = 'block';
        icon.className = 'bi bi-chevron-up text-info';
    } else {
        body.style.display = 'none';
        icon.className = 'bi bi-chevron-down text-white-50';
    }
};
window.toggle_table_col = function(colIndex, btnElement) {
    let isActive = btnElement.classList.contains('active');
    if (isActive) btnElement.classList.remove('active');
    else btnElement.classList.add('active');
    
    let cells = document.querySelectorAll(`#preview_excel_table th:nth-child(${colIndex}), #preview_excel_table td:nth-child(${colIndex})`);
    cells.forEach(cell => { cell.style.display = isActive ? 'none' : 'table-cell'; });
};
// =========================================================================
// 3. TÍNH NĂNG LIÊN KẾT (BÔI ĐEN + TỰ ĐỘNG CUỘN TRƯỢT MƯỢT MÀ)
// =========================================================================
window.highlight_source_text_bulk = function(index) {
    let q = window.bulk_parsed_questions[index];
    let textarea = document.getElementById('bulk_input_text');
    if (!q || !textarea) return;

    let fullText = textarea.value;
    let targetStr = q.original_q ? q.original_q.trim() : q.q; 
    let startIndex = fullText.indexOf(targetStr);

    if (startIndex !== -1) {
        let endIndex = startIndex + targetStr.length;
        
        textarea.focus();
        textarea.setSelectionRange(startIndex, endIndex);
        
        // Thuật toán cuộn nội dung tự động căn giữa khung nhìn
        let textBeforeTarget = fullText.substring(0, startIndex);
        let linesBefore = textBeforeTarget.split('\n').length;
        let totalLines = fullText.split('\n').length;
        
        // Tránh chia cho 0
        if (totalLines > 0) {
            let scrollY = (linesBefore / totalLines) * textarea.scrollHeight;
            textarea.scrollTo({
                top: scrollY - (textarea.clientHeight / 2) + 30, // Căn giữa và bù trừ padding
                behavior: 'smooth'
            });
        }
    }
};
// =========================================================================
// 🌟 BIẾN LƯU VẾT: GIÚP TỰ ĐỘNG BUNG MỞ CÂU HỎI VỪA MỚI THÊM/SỬA XONG
// =========================================================================
window.last_edited_q_idx = -1; 
// =========================================================================
// 1. CẬP NHẬT LẠI GIAO DIỆN QUẢN TRỊ (ĐÃ THÊM NÚT NHẬP STORY)
// =========================================================================
// =========================================================================
// 1. CẬP NHẬT LẠI GIAO DIỆN QUẢN TRỊ (ĐÃ THÊM NÚT NHẬP STORY & TƯƠNG TÁC)
// =========================================================================
// =========================================================================
// 1. CẬP NHẬT LẠI GIAO DIỆN QUẢN TRỊ (ĐÃ THÊM LỆNH WINDOW CHỐNG LỖI)
// =========================================================================
window.render_admin_panel = function() {
    let quizArea = document.getElementById('quiz_area');
    if (!quizArea) return;
    
    let total = questions.length;
    let countTN = questions.filter(q => q.type === 'single' || q.type === 'mcq' || !q.type).length;
    let countTF = questions.filter(q => q.type === 'tf' || q.type === 'true_false' || q.type === 'đúng sai').length;
    let countFill = questions.filter(q => q.type === 'fill' || q.type === 'điền khuyết').length;
    let lessonName = (questions.length > 0 && questions[0].lessonname) ? questions[0].lessonname : (window.lessonNames[window.current_subject]?.[window.selected_lessons_text] || "");
    let lessonNameDisplay = lessonName ? ` - ${lessonName}` : "";

    let html = `
    <div class="p-1 m-1 animate__animated animate__fadeIn" style="max-width: 100%; overflow-x: hidden;">
        
        <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom" style="border-color: rgba(255,255,255,0.1) !important;">
            <button class="btn btn-sm btn-light border-0 rounded-pill px-3 text-dark shadow-sm fw-bold glass-action-btn" style="font-size:0.75rem;" onclick="window.back_to_subject_select()">
                <i class="bi bi-arrow-left me-1"></i> Đóng
            </button>
            <div class="text-center mx-1">
                <div class="fw-bold text-white text-truncate" style="font-size: 0.95rem; max-width: 220px; text-transform: uppercase; text-shadow: 0 0 8px rgba(255,255,255,0.3);">
                    BÀI ${window.selected_lessons_text}${lessonNameDisplay}
                </div>
                <div class="text-white-50" style="font-size: 0.7rem; font-weight: bold; margin-top:2px;">
                    Tổng: ${total} (TN:${countTN} | ĐS:${countTF} | ĐK:${countFill})
                </div>
            </div>
            <div style="width: 70px;"></div> 
        </div>

        <div class="row g-2 mb-3 mt-2">
            <div class="col-6">
                <button class="btn glass-btn-submit w-100 d-flex justify-content-center align-items-center py-2 shadow-sm text-uppercase" onclick="window.open_import_by_type_modal()" style="font-size: 0.8rem; height: 100%;">
                    <i class="bi bi-layers-half text-info me-2 fs-5"></i> THEO LOẠI CÂU
                </button>
            </div>
            <div class="col-6">
                <button class="btn glass-btn-submit w-100 d-flex justify-content-center align-items-center py-2 shadow-sm text-uppercase" onclick="window.open_bulk_import_modal()" style="background: rgba(14, 165, 233, 0.15) !important; border-color: rgba(14, 165, 233, 0.4) !important; font-size: 0.8rem; height: 100%;">
                    <i class="bi bi-lightning-charge-fill text-warning me-2 fs-5" style="text-shadow: 0 0 8px rgba(255,193,7,0.5);"></i> THEO EXCEL
                </button>
            </div>
            
            <div class="col-6">
                <button class="btn glass-btn-submit w-100 d-flex flex-column justify-content-center align-items-center py-2 shadow-sm text-uppercase fw-bold mt-1 h-100" 
                        onclick="window.open_interaction_selector()" 
                        style="background: rgba(239, 68, 68, 0.15) !important; border-color: rgba(239, 68, 68, 0.4) !important; color: #ef4444 !important; font-size: 0.75rem; letter-spacing: 0.5px;">
                    <i class="bi bi-camera-reels text-danger mb-1 fs-4"></i> TẠO TƯƠNG TÁC
                </button>
            </div>
            
            <div class="col-6">
                <button class="btn glass-btn-submit w-100 d-flex flex-column justify-content-center align-items-center py-2 shadow-sm text-uppercase fw-bold mt-1 h-100" onclick="window.open_trainable_parser_modal()" style="background: rgba(34, 197, 94, 0.15) !important; border-color: rgba(34, 197, 94, 0.4) !important; color: #4ade80 !important; font-size: 0.75rem; letter-spacing: 0.5px;">
                    <i class="bi bi-robot text-success mb-1 fs-4"></i> DẠY BÓC TÁCH
                </button>
            </div>
            <div class="col-6">
                <button class="btn glass-btn-submit w-100 d-flex flex-column justify-content-center align-items-center py-2 shadow-sm text-uppercase fw-bold mt-1 h-100" onclick="window.open_story_import_modal(window.selected_lessons_text)" style="background: rgba(245, 158, 11, 0.15) !important; border-color: rgba(245, 158, 11, 0.4) !important; color: #fbbf24 !important; font-size: 0.75rem; letter-spacing: 0.5px;">
                    <i class="bi bi-bezier2 text-warning mb-1 fs-4"></i> NHẬP STORY
                </button>
            </div>
        </div>
        
        <div id="admin_table_container" style="max-height: 72vh; overflow-y: auto; padding-right:4px; scroll-behavior: smooth;">
            ${questions.map((q, idx) => {
                let typeDisplay = (q.type === 'tf' || q.type === 'true_false' || q.type === 'đúng sai') ? 'Đúng/Sai' : ((q.type === 'fill' || q.type === 'điền khuyết') ? 'Điền khuyết' : ((q.type === 'hotspot') ? 'Hotspot' : ((q.type === 'clip') ? 'Clip' : 'Trắc nghiệm')));
                let typeColor = (q.type === 'hotspot' || q.type === 'clip') ? 'color:#ef4444; border-color:rgba(239,68,68,0.5); background:rgba(239,68,68,0.2);' : 'color:#38bdf8; border-color:rgba(14,165,233,0.5); background:rgba(14,165,233,0.3);';
                
                let safeQText = q.q || "(Câu hỏi chưa có nội dung)";
                let shortText = safeQText.length > 55 ? safeQText.substring(0, 55) + "..." : safeQText;
                let isExpanded = (idx === window.last_edited_q_idx);
                let displayStyle = isExpanded ? 'block' : 'none';
                let chevronIcon = isExpanded ? 'bi-chevron-up text-info' : 'bi-chevron-down text-white-50';

                let optsHtml = '';
                if (q.type === 'single' || q.type === 'mcq' || !q.type) {
                    let optA = q.opta || (q.opts && q.opts[0] ? q.opts[0] : '');
                    let optB = q.optb || (q.opts && q.opts[1] ? q.opts[1] : '');
                    let optC = q.optc || (q.opts && q.opts[2] ? q.opts[2] : '');
                    let optD = q.optd || (q.opts && q.opts[3] ? q.opts[3] : '');
                    optsHtml = `
                    <div class="mb-3 p-2 rounded border" style="background: rgba(0,0,0,0.25); border-color: rgba(255,255,255,0.1) !important; font-size: 0.85rem; color: rgba(255,255,255,0.9);">
                        <div class="mb-1"><strong class="text-white">A.</strong> ${optA}</div>
                        <div class="mb-1"><strong class="text-white">B.</strong> ${optB}</div>
                        <div class="mb-1"><strong class="text-white">C.</strong> ${optC}</div>
                        <div class=""><strong class="text-white">D.</strong> ${optD}</div>
                    </div>`;
                }

                let mediaHtml = q.image ? `<div class="text-info mt-1 text-truncate" style="font-size:0.75rem;"><i class="bi bi-image"></i> Media ID: ${q.image}</div>` : '';
                let hintHtml = q.hint ? `<div class="text-success mt-1 text-break" style="font-size:0.75rem;"><i class="bi bi-lightbulb"></i> Giải thích: ${q.hint}</div>` : '';

                return `
                <div class="q-admin-item-card" id="admin_row_${idx}">
                    <div class="q-card-header" onclick="window.toggle_q_card(${idx})">
                        <div class="d-flex align-items-center overflow-hidden w-100">
                            <span class="badge bg-light text-dark me-2 border" style="font-size:0.7rem; min-width: 40px; padding: 4px 6px;">#${idx + 1}</span>
                            <span class="badge me-2" style="${typeColor} font-size:0.65rem; min-width: 75px;">${typeDisplay}</span>
                            <span class="text-white fw-bold text-truncate flex-grow-1 pe-2" style="font-size:0.85rem;">${shortText}</span>
                        </div>
                        <i id="q_icon_${idx}" class="bi ${chevronIcon} fs-5"></i>
                    </div>

                    <div id="q_body_${idx}" class="q-card-body" style="display: ${displayStyle};">
                        <div class="mb-3" style="font-size: 0.9rem; line-height: 1.5; color: #fff;">
                            <div class="text-info fw-bold mb-1" style="font-size: 0.75rem; text-transform: uppercase;">Nội dung câu hỏi:</div>
                            <div class="text-break">${safeQText}</div>
                        </div>
                        
                        ${optsHtml}
                        
                        <div class="p-2 rounded" style="background: rgba(0,0,0,0.15); border-left: 3px solid #0ea5e9; font-size: 0.85rem;">
                            <div class="text-warning fw-bold text-break mb-1">🎯 Đáp án: <span class="text-white">${q.answer || q.a || ''}</span></div>
                            ${mediaHtml}${hintHtml}
                        </div>

                        <div class="d-flex justify-content-end gap-2 border-top pt-3 mt-3" style="border-color: rgba(255,255,255,0.1) !important;">
                            <button class="btn glass-action-btn delete" onclick="window.delete_question_direct(${idx})">
                                <i class="bi bi-trash3 me-1"></i> Xóa
                            </button>
                            <button class="btn glass-action-btn edit" onclick="window.open_question_modal(${idx})">
                                <i class="bi bi-pencil-square me-1"></i> Sửa câu này
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join('')}
            
            ${questions.length === 0 ? `
                <div class="text-center p-5 mt-4 glass-panel" style="border-radius: 16px;">
                    <i class="bi bi-inbox text-white-50" style="font-size: 3rem;"></i>
                    <div class="text-white-50 mt-2 fw-bold">Chưa có câu hỏi nào.</div>
                    <div class="text-white-50 small">Hãy bấm NHẬP ĐỂ THÊM CÂU HỎI!</div>
                </div>
            ` : ''}
        </div>
    </div>`;
    
    quizArea.innerHTML = html;
    
    if (window.MathJax) { 
        setTimeout(function() {
            MathJax.typesetPromise([quizArea]).catch(function (err) {
                console.log('MathJax error: ', err.message);
            });
        }, 50); 
    }
};

// =========================================================================
// 🗂️ MENU CHỌN TAB XƯỞNG TƯƠNG TÁC (ẢNH / VIDEO)
// =========================================================================
window.open_interaction_selector = function() {
    let modalHtml = `
    <div id="interaction_selector_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.8); z-index: 27000; backdrop-filter: blur(10px);">
        <div class="glass-panel p-4 shadow-lg mx-2 text-center" style="width: 100%; max-width: 400px; border-radius: 20px; border: 1px solid #f43f5e; background: rgba(15, 23, 42, 0.95);">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="fw-bold text-white mb-0"><i class="bi bi-layers-half text-danger me-2"></i>CHỌN LOẠI TƯƠNG TÁC</h6>
                <button class="btn-close btn-close-white" onclick="document.getElementById('interaction_selector_modal').remove()"></button>
            </div>
            
            <!-- TAB 1: HOTSPOT ẢNH -->
            <button class="btn w-100 mb-3 d-flex align-items-center p-3 stat-card-hover" style="background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.4); border-radius: 12px; color: #fff; text-align: left;" onclick="document.getElementById('interaction_selector_modal').remove(); window.open_hotspot_creator_modal()">
                <div class="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 45px; height: 45px; background: rgba(14, 165, 233, 0.3);">
                    <i class="bi bi-image text-info fs-4"></i>
                </div>
                <div>
                    <div class="fw-bold text-info" style="font-size: 1rem;">HOTSPOT ẢNH</div>
                    <div class="text-white-50" style="font-size: 0.75rem;">Đánh dấu vị trí trên Hình ảnh</div>
                </div>
            </button>

            <!-- TAB 2: CLIP VIDEO -->
            <button class="btn w-100 d-flex align-items-center p-3 stat-card-hover" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 12px; color: #fff; text-align: left;" onclick="document.getElementById('interaction_selector_modal').remove(); window.open_clip_creator_modal()">
                <div class="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 45px; height: 45px; background: rgba(239, 68, 68, 0.3);">
                    <i class="bi bi-camera-reels text-danger fs-4"></i>
                </div>
                <div>
                    <div class="fw-bold text-danger" style="font-size: 1rem;">CLIP TƯƠNG TÁC</div>
                    <div class="text-white-50" style="font-size: 0.75rem;">Khoanh vùng trên Video (MP4)</div>
                </div>
            </button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// =========================================================================
// ✏️ GIAO DIỆN FORM SOẠN THẢO (CẬP NHẬT TÍNH NĂNG SMART PASTE)
// =========================================================================
window.open_question_modal = function(idx) {
    let isNew = (idx === -1);
    let autoLessonName = window.lessonNames[window.current_subject]?.[window.selected_lessons_text] || "";
    if (!autoLessonName && questions.length > 0) autoLessonName = questions[0].lessonname || "";

    let q = !isNew ? questions[idx] : { 
        lesson: window.selected_lessons_text, type: 'single', level: 1, 
        q: '', opta: '', optb: '', optc: '', optd: '', answer: '', hint: '', image: '',
        lessonname: autoLessonName, original_q: '' 
    };
    
    let oldModal = document.getElementById('q_admin_modal');
    if(oldModal) oldModal.remove();

    window.current_checked_opt = null; 

    let modalHtml = `
    <div id="q_admin_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style="background: rgba(0,0,0,0.6); z-index: 25000; backdrop-filter: blur(10px);">
        <div class="glass-panel p-3 p-md-4 shadow-lg mx-2" style="width: 100%; max-width: 650px; max-height: 90vh; overflow-y: auto; border-radius: 20px;">
            
            <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3" style="border-color: rgba(255,255,255,0.1) !important;">
                <button class="btn-close btn-close-white" onclick="document.getElementById('q_admin_modal').remove()"></button>
                <h6 class="fw-bold text-white m-0 text-end" style="text-shadow: 0 0 10px rgba(255,255,255,0.3); text-transform: uppercase;">
                    ${!isNew ? '✏️ CHỈNH SỬA CÂU HỎI' : '➕ THÊM CÂU HỎI MỚI'}
                </h6>
            </div>
            
            <div class="row g-2 mb-2">
                <div class="col-4">
                    <div class="d-flex align-items-center glass-input-style p-0 overflow-hidden">
                        <span class="text-white-50 fw-bold ps-2 pe-1" style="font-size:0.65rem;">BÀI</span>
                        <input type="text" id="modal_q_lesson" class="text-white fw-bold px-1 py-2 text-center" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none;" value="${q.lesson || window.selected_lessons_text}">
                    </div>
                </div>
                <div class="col-4">
                    <div class="d-flex align-items-center glass-input-style p-0 overflow-hidden">
                        <span class="text-white-50 fw-bold ps-2 pe-1" style="font-size:0.65rem;">MỨC</span>
                        <select id="modal_q_level" class="text-white fw-bold px-1 py-2 text-center" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none; appearance: none;">
                            <option value="1" style="color:#000" ${String(q.level)==='1'?'selected':''}>L1</option>
                            <option value="2" style="color:#000" ${String(q.level)==='2'?'selected':''}>L2</option>
                            <option value="3" style="color:#000" ${String(q.level)==='3'?'selected':''}>L3</option>
                            <option value="4" style="color:#000" ${String(q.level)==='4'?'selected':''}>L4</option>
                        </select>
                    </div>
                </div>
                <div class="col-4">
                    <div class="d-flex align-items-center glass-input-style p-0 overflow-hidden">
                        <span class="text-white-50 fw-bold ps-2 pe-1" style="font-size:0.65rem;">LOẠI</span>
                        <select id="modal_q_type" class="text-info fw-bold px-1 py-2 text-center" onchange="window.toggle_modal_abcd_fields(this.value)" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none; appearance: none;">
                            <option value="single" style="color:#000" ${q.type==='single'||q.type==='mcq'||!q.type?'selected':''}>Trắc nghiệm</option>
                            <option value="tf" style="color:#000" ${q.type==='tf'||q.type==='true_false'||q.type==='đúng sai'?'selected':''}>Đúng / Sai</option>
                            <option value="fill" style="color:#000" ${q.type==='fill'||q.type==='điền khuyết'?'selected':''}>Điền khuyết</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="mb-3">
                <div class="d-flex align-items-center glass-input-style p-0 overflow-hidden">
                    <span class="text-white-50 fw-bold ps-3 pe-2 text-nowrap" style="font-size:0.7rem;">TÊN BÀI</span>
                    <input type="text" id="modal_q_lessonname" class="text-white px-2 py-2" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none;" value="${q.lessonname}" placeholder="Ví dụ: Di truyền học...">
                </div>
            </div>

            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1 px-1">
                    <span class="text-white-50 fw-bold" style="font-size: 0.75rem; letter-spacing: 0.5px;">📝 NỘI DUNG CÂU HỎI</span>
                    <button type="button" class="btn btn-sm btn-warning rounded-circle shadow p-0 d-flex align-items-center justify-content-center ms-2" onmousedown="event.preventDefault(); window.make_vocab_tag();" title="Magic Vocab: Tự động tra IPA & Dịch nghĩa" style="width: 28px; height: 28px; border: 1px solid #f59e0b; font-size: 1.1rem; flex-shrink: 0;">
                        🪄
                    </button>
                </div>
                <textarea id="modal_q_text" onpaste="window.handle_paste_auto_fill(event)" class="form-control text-white" rows="5" placeholder="Nhập câu hỏi... (Bôi đen Từ vựng (Nghĩa) và bấm 'Tạo Từ Vựng')" required style="font-size: 0.95rem; resize: none; border-radius: 12px;">${q.q}</textarea>
            </div>
            
            <div id="abcd_container" style="display: ${ (q.type==='single'||q.type==='mcq'||!q.type) ? 'block' : 'none' };" class="mb-3">
                <div class="row g-2">
                    <div class="col-6">
                        <div class="d-flex align-items-center glass-input-style p-1 px-2">
                            <div class="opt-check-btn rounded-circle d-flex align-items-center justify-content-center" id="btn_check_a" onclick="window.auto_set_answer('a', this)" style="width: 22px; height: 22px; border: 1.5px solid rgba(255,255,255,0.4); cursor: pointer; transition: 0.3s; flex-shrink: 0;"></div>
                            <input type="text" id="modal_opt_a" class="text-white px-2 py-1" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none; font-size: 0.85rem;" placeholder="Đáp án A" value="${q.opta || (q.opts && q.opts[0] ? q.opts[0] : '')}" oninput="window.sync_answer_if_checked('a')">
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="d-flex align-items-center glass-input-style p-1 px-2">
                            <div class="opt-check-btn rounded-circle d-flex align-items-center justify-content-center" id="btn_check_b" onclick="window.auto_set_answer('b', this)" style="width: 22px; height: 22px; border: 1.5px solid rgba(255,255,255,0.4); cursor: pointer; transition: 0.3s; flex-shrink: 0;"></div>
                            <input type="text" id="modal_opt_b" class="text-white px-2 py-1" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none; font-size: 0.85rem;" placeholder="Đáp án B" value="${q.optb || (q.opts && q.opts[1] ? q.opts[1] : '')}" oninput="window.sync_answer_if_checked('b')">
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="d-flex align-items-center glass-input-style p-1 px-2">
                            <div class="opt-check-btn rounded-circle d-flex align-items-center justify-content-center" id="btn_check_c" onclick="window.auto_set_answer('c', this)" style="width: 22px; height: 22px; border: 1.5px solid rgba(255,255,255,0.4); cursor: pointer; transition: 0.3s; flex-shrink: 0;"></div>
                            <input type="text" id="modal_opt_c" class="text-white px-2 py-1" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none; font-size: 0.85rem;" placeholder="Đáp án C" value="${q.optc || (q.opts && q.opts[2] ? q.opts[2] : '')}" oninput="window.sync_answer_if_checked('c')">
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="d-flex align-items-center glass-input-style p-1 px-2">
                            <div class="opt-check-btn rounded-circle d-flex align-items-center justify-content-center" id="btn_check_d" onclick="window.auto_set_answer('d', this)" style="width: 22px; height: 22px; border: 1.5px solid rgba(255,255,255,0.4); cursor: pointer; transition: 0.3s; flex-shrink: 0;"></div>
                            <input type="text" id="modal_opt_d" class="text-white px-2 py-1" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none; font-size: 0.85rem;" placeholder="Đáp án D" value="${q.optd || (q.opts && q.opts[3] ? q.opts[3] : '')}" oninput="window.sync_answer_if_checked('d')">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row g-2 mb-3">
                <div class="col-7">
                    <input type="text" id="modal_q_ans" class="form-control text-warning fw-bold" value="${q.answer || q.a || ''}" placeholder="🎯 Đáp án Đúng" required>
                </div>
                <div class="col-5">
                    <input type="text" id="modal_q_image" class="form-control text-info" value="${q.image || ''}" placeholder="🖼️ ID Ảnh/Audio">
                </div>
            </div>
            
            <div class="mb-3">
                <textarea id="modal_q_hint" class="form-control text-success" rows="2" placeholder="💡 Giải thích (Hint): Lý do chọn đáp án này..." style="resize: none;">${q.hint || ''}</textarea>
            </div>
            
            <div class="d-flex justify-content-end pt-3 border-top" style="border-color: rgba(255,255,255,0.1) !important;">
                <button id="btn_save_sync" class="btn px-5 fw-bold shadow-sm" style="background: #0ea5e9; color: #fff; border-radius: 14px;" onclick="window.direct_save_single_question(${idx})">
                    LƯU CÂU HỎI
                </button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    if (typeof window.toggle_modal_abcd_fields === 'function') {
        window.toggle_modal_abcd_fields(document.getElementById('modal_q_type').value);
    }

    setTimeout(() => {
        let currentAns = (q.answer || q.a || "").trim().toLowerCase();
        if (currentAns && (q.type==='single'||q.type==='mcq'||!q.type)) {
            if (currentAns === (q.opta || (q.opts && q.opts[0]) || "").trim().toLowerCase()) window.auto_set_answer('a', document.getElementById('btn_check_a'), true);
            else if (currentAns === (q.optb || (q.opts && q.opts[1]) || "").trim().toLowerCase()) window.auto_set_answer('b', document.getElementById('btn_check_b'), true);
            else if (currentAns === (q.optc || (q.opts && q.opts[2]) || "").trim().toLowerCase()) window.auto_set_answer('c', document.getElementById('btn_check_c'), true);
            else if (currentAns === (q.optd || (q.opts && q.opts[3]) || "").trim().toLowerCase()) window.auto_set_answer('d', document.getElementById('btn_check_d'), true);
        }
    }, 50);
};

// =========================================================================
// 🆕 HÀM MỞ FORM TẠO BÀI (ĐÃ KHÔI PHỤC)
// =========================================================================
window.show_add_lesson_modal = function(subjectKey) {
    let oldModal = document.getElementById('add_lesson_modal');
    if (oldModal) oldModal.remove();

    window.current_subject = subjectKey;
    window.temp_subject_key = subjectKey; 
    
    let modalHtml = `
    <div id="add_lesson_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.6); z-index: 26000; backdrop-filter: blur(10px);">
        <div class="glass-panel p-4 shadow-lg mx-2 text-center" style="width: 100%; max-width: 320px; border-radius: 20px;">
            <div class="mb-3">
                <i class="bi bi-journal-plus text-info" style="font-size: 2.5rem; text-shadow: 0 0 15px rgba(14,165,233,0.5);"></i>
            </div>
            <h6 class="fw-bold text-white mb-4 text-uppercase">THÊM BÀI HỌC MỚI</h6>
            
            <div class="mb-3 text-start">
                <label class="text-white-50 small fw-bold ms-2 mb-1">SỐ BÀI <span class="text-danger">*</span></label>
                <input type="text" id="new_lesson_num" class="form-control text-white text-center glass-input-style fw-bold fs-5" placeholder="Ví dụ: 15" onkeypress="if(event.key === 'Enter') document.getElementById('new_lesson_name').focus();">
            </div>
            
            <div class="mb-4 text-start">
                <label class="text-white-50 small fw-bold ms-2 mb-1">TÊN BÀI HỌC (Tùy chọn)</label>
                <input type="text" id="new_lesson_name" class="form-control text-white glass-input-style text-center" placeholder="Nhập tên bài..." onkeypress="if(event.key === 'Enter') window.confirm_add_new_lesson();">
            </div>
            
            <div class="d-flex gap-2">
                <button class="btn glass-action-btn flex-grow-1 py-2" style="border-radius: 12px; font-size: 0.9rem;" onclick="document.getElementById('add_lesson_modal').remove()">Hủy bỏ</button>
                <button class="btn glass-btn-submit flex-grow-1 py-2" style="border-radius: 12px; border-color: #38bdf8 !important; font-size: 0.9rem;" onclick="window.confirm_add_new_lesson()">Tạo Bài Mới</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setTimeout(() => document.getElementById('new_lesson_num').focus(), 100);
};

// =========================================================================
// 🆕 XÁC NHẬN TẠO BÀI MỚI
// =========================================================================
window.confirm_add_new_lesson = function() {
    let num = document.getElementById('new_lesson_num').value.trim();
    let name = document.getElementById('new_lesson_name').value.trim();
    
    if(!num) {
        if(typeof window.show_toast === 'function') window.show_toast("⚠️ Vui lòng nhập Số bài!", true);
        else alert("⚠️ Vui lòng nhập Số bài!");
        return;
    }
    
    let activeSubj = window.temp_subject_key || window.current_subject;
    window.current_subject = activeSubj; 
    window.selected_lessons_text = num; 
    
    if(!window.lessonNames) window.lessonNames = {};
    if(!window.lessonNames[activeSubj]) window.lessonNames[activeSubj] = {};
    window.lessonNames[activeSubj][num] = name;
    window.questions = []; // Xóa trắng danh sách câu hỏi vì bài mới
    
    let modal = document.getElementById('add_lesson_modal');
    if (modal) modal.remove();
    
    // Tự động chèn thẻ bài học vào menu
    let mapArea = document.getElementById(`map_area_${activeSubj}`);
    if (mapArea) {
        let listContainer = mapArea.querySelector('.d-flex.flex-column');
        let emptyState = mapArea.querySelector('.bi-inbox');
        if (emptyState) {
            emptyState.parentElement.innerHTML = '<div class="d-flex flex-column gap-1.5 mt-2"></div>';
            listContainer = mapArea.querySelector('.d-flex.flex-column');
        }

        if (listContainer) {
            let nameStr = name ? `: ${name}` : "";
            let newBtnHtml = `
            <div class="d-flex gap-1.5 align-items-stretch animate__animated animate__fadeIn mb-1">
                <button class="btn text-start flex-grow-1 bg-light border-0 p-2" style="margin: 0; border-radius: 10px;" onclick="window.quick_start_lesson('${activeSubj}', '${num}')">
                    <div class="fw-bold text-dark mb-0 text-truncate" style="font-size: 0.8rem; max-width: 220px;">Bài ${num}${nameStr}</div>
                    <div class="text-secondary d-flex align-items-center mt-1" style="font-size: 0.68rem; opacity: 0.85;">
                        Tổng: <b>0</b> (TN:0 | ĐS:0 | ĐK:0) 
                        <span class="badge bg-secondary ms-1" style="font-size: 0.65rem; border-radius: 4px;">Chưa làm</span>
                    </div>
                </button>
                <button class="btn btn-sm shadow-sm d-flex align-items-center justify-content-center px-2 fw-bold text-warning" 
                        style="border-radius: 10px; background-color: #fffbeb; border: 1px solid #fde68a; font-size: 0.75rem;" 
                        onclick="event.stopPropagation(); window.open_admin_lesson_panel('${activeSubj}', '${num}')">
                    ✏️ Sửa
                </button>
                <button class="btn btn-sm shadow-sm d-flex align-items-center justify-content-center px-2 fw-bold text-danger" 
                        style="border-radius: 10px; background-color: #fef2f2; border: 1px solid #fecaca; font-size: 0.75rem;" 
                        onclick="event.stopPropagation(); window.delete_current_lesson('${activeSubj}', '${num}')">
                    <i class="bi bi-trash3-fill"></i>
                </button>
            </div>`;
            
            let addBtn = listContainer.querySelector('.glass-panel');
            if (addBtn) addBtn.insertAdjacentHTML('beforebegin', newBtnHtml);
            else listContainer.insertAdjacentHTML('beforeend', newBtnHtml);
        }
    }

    if (typeof window.render_admin_panel === "function") {
        window.render_admin_panel();
        if(typeof window.show_toast === 'function') window.show_toast("✅ Đã tạo bài! Vui lòng chọn cách nhập câu hỏi.");
    }
};
// =========================================================================
// 🗂️ MENU CHỌN TAB XƯỞNG TƯƠNG TÁC (ẢNH / VIDEO)
// =========================================================================
window.open_interaction_selector = function() {
    let modalHtml = `
    <div id="interaction_selector_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.8); z-index: 27000; backdrop-filter: blur(10px);">
        <div class="glass-panel p-4 shadow-lg mx-2 text-center" style="width: 100%; max-width: 400px; border-radius: 20px; border: 1px solid #f43f5e; background: rgba(15, 23, 42, 0.95);">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="fw-bold text-white mb-0"><i class="bi bi-layers-half text-danger me-2"></i>CHỌN LOẠI TƯƠNG TÁC</h6>
                <button class="btn-close btn-close-white" onclick="document.getElementById('interaction_selector_modal').remove()"></button>
            </div>
            
            <!-- TAB 1: HOTSPOT ẢNH -->
            <button class="btn w-100 mb-3 d-flex align-items-center p-3 stat-card-hover" style="background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.4); border-radius: 12px; color: #fff; text-align: left;" onclick="document.getElementById('interaction_selector_modal').remove(); window.open_hotspot_creator_modal()">
                <div class="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 45px; height: 45px; background: rgba(14, 165, 233, 0.3);">
                    <i class="bi bi-image text-info fs-4"></i>
                </div>
                <div>
                    <div class="fw-bold text-info" style="font-size: 1rem;">HOTSPOT ẢNH</div>
                    <div class="text-white-50" style="font-size: 0.75rem;">Đánh dấu vị trí trên Hình ảnh</div>
                </div>
            </button>

            <!-- TAB 2: CLIP VIDEO -->
            <button class="btn w-100 d-flex align-items-center p-3 stat-card-hover" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 12px; color: #fff; text-align: left;" onclick="document.getElementById('interaction_selector_modal').remove(); window.open_clip_creator_modal()">
                <div class="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 45px; height: 45px; background: rgba(239, 68, 68, 0.3);">
                    <i class="bi bi-camera-reels text-danger fs-4"></i>
                </div>
                <div>
                    <div class="fw-bold text-danger" style="font-size: 1rem;">CLIP TƯƠNG TÁC</div>
                    <div class="text-white-50" style="font-size: 0.75rem;">Khoanh vùng trên Video (MP4)</div>
                </div>
            </button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};
// =========================================================================
// ✏️ GIAO DIỆN FORM SOẠN THẢO (CẬP NHẬT TÍNH NĂNG SMART PASTE)
// =========================================================================
window.open_question_modal = function(idx) {
    let isNew = (idx === -1);
    let autoLessonName = window.lessonNames[current_subject]?.[selected_lessons_text] || "";
    if (!autoLessonName && questions.length > 0) autoLessonName = questions[0].lessonname || "";

    let q = !isNew ? questions[idx] : { 
        lesson: selected_lessons_text, type: 'single', level: 1, 
        q: '', opta: '', optb: '', optc: '', optd: '', answer: '', hint: '', image: '',
        lessonname: autoLessonName, original_q: '' 
    };
    
    let oldModal = document.getElementById('q_admin_modal');
    if(oldModal) oldModal.remove();

    window.current_checked_opt = null; 

    let modalHtml = `
    <div id="q_admin_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style="background: rgba(0,0,0,0.6); z-index: 25000; backdrop-filter: blur(10px);">
        <div class="glass-panel p-3 p-md-4 shadow-lg mx-2" style="width: 100%; max-width: 650px; max-height: 90vh; overflow-y: auto; border-radius: 20px;">
            
            <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3" style="border-color: rgba(255,255,255,0.1) !important;">
                <button class="btn-close btn-close-white" onclick="document.getElementById('q_admin_modal').remove()"></button>
                <h6 class="fw-bold text-white m-0 text-end" style="text-shadow: 0 0 10px rgba(255,255,255,0.3); text-transform: uppercase;">
                    ${!isNew ? '✏️ CHỈNH SỬA CÂU HỎI' : '➕ THÊM CÂU HỎI MỚI'}
                </h6>
            </div>
            
            <div class="row g-2 mb-2">
                <div class="col-4">
                    <div class="d-flex align-items-center glass-input-style p-0 overflow-hidden">
                        <span class="text-white-50 fw-bold ps-2 pe-1" style="font-size:0.65rem;">BÀI</span>
                        <input type="text" id="modal_q_lesson" class="text-white fw-bold px-1 py-2 text-center" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none;" value="${q.lesson || selected_lessons_text}">
                    </div>
                </div>
                <div class="col-4">
                    <div class="d-flex align-items-center glass-input-style p-0 overflow-hidden">
                        <span class="text-white-50 fw-bold ps-2 pe-1" style="font-size:0.65rem;">MỨC</span>
                        <select id="modal_q_level" class="text-white fw-bold px-1 py-2 text-center" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none; appearance: none;">
                            <option value="1" style="color:#000" ${String(q.level)==='1'?'selected':''}>L1</option>
                            <option value="2" style="color:#000" ${String(q.level)==='2'?'selected':''}>L2</option>
                            <option value="3" style="color:#000" ${String(q.level)==='3'?'selected':''}>L3</option>
                            <option value="4" style="color:#000" ${String(q.level)==='4'?'selected':''}>L4</option>
                        </select>
                    </div>
                </div>
                <div class="col-4">
                    <div class="d-flex align-items-center glass-input-style p-0 overflow-hidden">
                        <span class="text-white-50 fw-bold ps-2 pe-1" style="font-size:0.65rem;">LOẠI</span>
                        <select id="modal_q_type" class="text-info fw-bold px-1 py-2 text-center" onchange="toggle_modal_abcd_fields(this.value)" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none; appearance: none;">
                            <option value="single" style="color:#000" ${q.type==='single'||q.type==='mcq'||!q.type?'selected':''}>Trắc nghiệm</option>
                            <option value="tf" style="color:#000" ${q.type==='tf'||q.type==='true_false'||q.type==='đúng sai'?'selected':''}>Đúng / Sai</option>
                            <option value="fill" style="color:#000" ${q.type==='fill'||q.type==='điền khuyết'?'selected':''}>Điền khuyết</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="mb-3">
                <div class="d-flex align-items-center glass-input-style p-0 overflow-hidden">
                    <span class="text-white-50 fw-bold ps-3 pe-2 text-nowrap" style="font-size:0.7rem;">TÊN BÀI</span>
                    <input type="text" id="modal_q_lessonname" class="text-white px-2 py-2" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none;" value="${q.lessonname}" placeholder="Ví dụ: Di truyền học...">
                </div>
            </div>

            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1 px-1">
                    <span class="text-white-50 fw-bold" style="font-size: 0.75rem; letter-spacing: 0.5px;">📝 NỘI DUNG CÂU HỎI</span>
                    <button type="button" class="btn btn-sm btn-warning rounded-circle shadow p-0 d-flex align-items-center justify-content-center ms-2" onmousedown="event.preventDefault(); window.make_vocab_tag();" title="Magic Vocab: Tự động tra IPA & Dịch nghĩa" style="width: 28px; height: 28px; border: 1px solid #f59e0b; font-size: 1.1rem; flex-shrink: 0;">
                        🪄
                    </button>
                </div>
                <textarea id="modal_q_text" onpaste="handle_paste_auto_fill(event)" class="form-control text-white" rows="5" placeholder="Nhập câu hỏi... (Bôi đen Từ vựng (Nghĩa) và bấm 'Tạo Từ Vựng')" required style="font-size: 0.95rem; resize: none; border-radius: 12px;">${q.q}</textarea>
            </div>
            
            <div id="abcd_container" style="display: ${ (q.type==='single'||q.type==='mcq'||!q.type) ? 'block' : 'none' };" class="mb-3">
                <div class="row g-2">
                    <div class="col-6">
                        <div class="d-flex align-items-center glass-input-style p-1 px-2">
                            <div class="opt-check-btn rounded-circle d-flex align-items-center justify-content-center" id="btn_check_a" onclick="auto_set_answer('a', this)" style="width: 22px; height: 22px; border: 1.5px solid rgba(255,255,255,0.4); cursor: pointer; transition: 0.3s; flex-shrink: 0;"></div>
                            <input type="text" id="modal_opt_a" class="text-white px-2 py-1" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none; font-size: 0.85rem;" placeholder="Đáp án A" value="${q.opta || (q.opts && q.opts[0] ? q.opts[0] : '')}" oninput="sync_answer_if_checked('a')">
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="d-flex align-items-center glass-input-style p-1 px-2">
                            <div class="opt-check-btn rounded-circle d-flex align-items-center justify-content-center" id="btn_check_b" onclick="auto_set_answer('b', this)" style="width: 22px; height: 22px; border: 1.5px solid rgba(255,255,255,0.4); cursor: pointer; transition: 0.3s; flex-shrink: 0;"></div>
                            <input type="text" id="modal_opt_b" class="text-white px-2 py-1" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none; font-size: 0.85rem;" placeholder="Đáp án B" value="${q.optb || (q.opts && q.opts[1] ? q.opts[1] : '')}" oninput="sync_answer_if_checked('b')">
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="d-flex align-items-center glass-input-style p-1 px-2">
                            <div class="opt-check-btn rounded-circle d-flex align-items-center justify-content-center" id="btn_check_c" onclick="auto_set_answer('c', this)" style="width: 22px; height: 22px; border: 1.5px solid rgba(255,255,255,0.4); cursor: pointer; transition: 0.3s; flex-shrink: 0;"></div>
                            <input type="text" id="modal_opt_c" class="text-white px-2 py-1" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none; font-size: 0.85rem;" placeholder="Đáp án C" value="${q.optc || (q.opts && q.opts[2] ? q.opts[2] : '')}" oninput="sync_answer_if_checked('c')">
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="d-flex align-items-center glass-input-style p-1 px-2">
                            <div class="opt-check-btn rounded-circle d-flex align-items-center justify-content-center" id="btn_check_d" onclick="auto_set_answer('d', this)" style="width: 22px; height: 22px; border: 1.5px solid rgba(255,255,255,0.4); cursor: pointer; transition: 0.3s; flex-shrink: 0;"></div>
                            <input type="text" id="modal_opt_d" class="text-white px-2 py-1" style="background: transparent !important; border: none !important; box-shadow: none !important; width: 100%; outline: none; font-size: 0.85rem;" placeholder="Đáp án D" value="${q.optd || (q.opts && q.opts[3] ? q.opts[3] : '')}" oninput="sync_answer_if_checked('d')">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row g-2 mb-3">
                <div class="col-7">
                    <input type="text" id="modal_q_ans" class="form-control text-warning fw-bold" value="${q.answer || q.a || ''}" placeholder="🎯 Đáp án Đúng" required>
                </div>
                <div class="col-5">
                    <input type="text" id="modal_q_image" class="form-control text-info" value="${q.image || ''}" placeholder="🖼️ ID Ảnh/Audio">
                </div>
            </div>
            
            <div class="mb-3">
                <textarea id="modal_q_hint" class="form-control text-success" rows="2" placeholder="💡 Giải thích (Hint): Lý do chọn đáp án này..." style="resize: none;">${q.hint || ''}</textarea>
            </div>
            
            <div class="d-flex justify-content-end pt-3 border-top" style="border-color: rgba(255,255,255,0.1) !important;">
                <button id="btn_save_sync" class="btn px-5 fw-bold shadow-sm" style="background: #0ea5e9; color: #fff; border-radius: 14px;" onclick="direct_save_single_question(${idx})">
                    LƯU CÂU HỎI
                </button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    toggle_modal_abcd_fields(document.getElementById('modal_q_type').value);

    setTimeout(() => {
        let currentAns = (q.answer || q.a || "").trim().toLowerCase();
        if (currentAns && (q.type==='single'||q.type==='mcq'||!q.type)) {
            if (currentAns === (q.opta || (q.opts && q.opts[0]) || "").trim().toLowerCase()) auto_set_answer('a', document.getElementById('btn_check_a'), true);
            else if (currentAns === (q.optb || (q.opts && q.opts[1]) || "").trim().toLowerCase()) auto_set_answer('b', document.getElementById('btn_check_b'), true);
            else if (currentAns === (q.optc || (q.opts && q.opts[2]) || "").trim().toLowerCase()) auto_set_answer('c', document.getElementById('btn_check_c'), true);
            else if (currentAns === (q.optd || (q.opts && q.opts[3]) || "").trim().toLowerCase()) auto_set_answer('d', document.getElementById('btn_check_d'), true);
        }
    }, 50);
};


// =========================================================================
// 🆕 2. HÀM MỞ FORM TẠO BÀI (KHÓA BIẾN MÔN HỌC & TỐI ƯU UX)
// =========================================================================
window.show_add_lesson_modal = function(subjectKey) {
    // 1. Dọn dẹp tàn dư: Nếu có form cũ đang mở ngầm, xóa nó đi để chống lỗi xếp chồng
    let oldModal = document.getElementById('add_lesson_modal');
    if (oldModal) oldModal.remove();

    // 2. Khóa cứng môn học hiện tại (Dùng thẳng window. để ép biến toàn cục an toàn nhất)
    window.current_subject = subjectKey;
    window.temp_subject_key = subjectKey; 
    
    let modalHtml = `
    <div id="add_lesson_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.6); z-index: 26000; backdrop-filter: blur(10px);">
        <div class="glass-panel p-4 shadow-lg mx-2 text-center" style="width: 100%; max-width: 320px; border-radius: 20px;">
            <div class="mb-3">
                <i class="bi bi-journal-plus text-info" style="font-size: 2.5rem; text-shadow: 0 0 15px rgba(14,165,233,0.5);"></i>
            </div>
            <h6 class="fw-bold text-white mb-4 text-uppercase">THÊM BÀI HỌC MỚI</h6>
            
            <div class="mb-3 text-start">
                <label class="text-white-50 small fw-bold ms-2 mb-1">SỐ BÀI <span class="text-danger">*</span></label>
                <input type="text" id="new_lesson_num" class="form-control text-white text-center glass-input-style fw-bold fs-5" placeholder="Ví dụ: 15" onkeypress="if(event.key === 'Enter') document.getElementById('new_lesson_name').focus();">
            </div>
            
            <div class="mb-4 text-start">
                <label class="text-white-50 small fw-bold ms-2 mb-1">TÊN BÀI HỌC (Tùy chọn)</label>
                <input type="text" id="new_lesson_name" class="form-control text-white glass-input-style text-center" placeholder="Nhập tên bài..." onkeypress="if(event.key === 'Enter') confirm_add_new_lesson();">
            </div>
            
            <div class="d-flex gap-2">
                <button class="btn glass-action-btn flex-grow-1 py-2" style="border-radius: 12px; font-size: 0.9rem;" onclick="document.getElementById('add_lesson_modal').remove()">Hủy bỏ</button>
                <button class="btn glass-btn-submit flex-grow-1 py-2" style="border-radius: 12px; border-color: #38bdf8 !important; font-size: 0.9rem;" onclick="confirm_add_new_lesson()">Tạo Bài Mới</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setTimeout(() => document.getElementById('new_lesson_num').focus(), 100);
};

// =========================================================================
// 🆕 3. HÀM XÁC NHẬN TẠO BÀI MỚI (FIX UX: CHỈ MỞ BẢNG QUẢN TRỊ ĐỂ CHỌN)
// =========================================================================
window.confirm_add_new_lesson = function() {
    let num = document.getElementById('new_lesson_num').value.trim();
    let name = document.getElementById('new_lesson_name').value.trim();
    
    if(!num) {
        if(typeof show_toast === 'function') show_toast("⚠️ Vui lòng nhập Số bài!");
        else alert("⚠️ Vui lòng nhập Số bài!");
        return;
    }
    
    // 🌟 CHỐT CỨNG MÔN HỌC HIỆN TẠI (Đảm bảo không bao giờ null)
    let activeSubj = window.temp_subject_key || window.current_subject;
    window.current_subject = activeSubj; 
    
    window.selected_lessons_text = num; 
    
    if(!window.lessonNames[activeSubj]) window.lessonNames[activeSubj] = {};
    window.lessonNames[activeSubj][num] = name;
    window.questions = []; // Xóa trắng danh sách câu hỏi vì bài mới hoàn toàn
    
    let modal = document.getElementById('add_lesson_modal');
    if (modal) modal.remove();
    
    // 🌟 TỰ ĐỘNG CHÈN THẺ BÀI HỌC VÀO MENU NỀN
    let mapArea = document.getElementById(`map_area_${activeSubj}`);
    if (mapArea) {
        let listContainer = mapArea.querySelector('.d-flex.flex-column');
        
        // Nếu đây là bài đầu tiên, xóa bỏ cái khung báo "Chưa có dữ liệu" đi
        let emptyState = mapArea.querySelector('.bi-inbox');
        if (emptyState) {
            emptyState.parentElement.innerHTML = '<div class="d-flex flex-column gap-1.5 mt-2"></div>';
            listContainer = mapArea.querySelector('.d-flex.flex-column');
        }

        if (listContainer) {
            let nameStr = name ? `: ${name}` : "";
            let newBtnHtml = `
            <div class="d-flex gap-1.5 align-items-stretch animate__animated animate__fadeIn mb-1">
                <button class="btn text-start flex-grow-1 bg-light border-0 p-2" style="margin: 0; border-radius: 10px;" onclick="window.quick_start_lesson('${activeSubj}', '${num}')">
                    <div class="fw-bold text-dark mb-0 text-truncate" style="font-size: 0.8rem; max-width: 220px;">Bài ${num}${nameStr}</div>
                    <div class="text-secondary" style="font-size: 0.68rem; opacity: 0.85;"><div class="text-secondary d-flex align-items-center mt-1" style="font-size: 0.68rem; opacity: 0.85;">
    Tổng: <b>0</b> (TN:0 | ĐS:0 | ĐK:0) 
    <span class="badge bg-secondary ms-1" style="font-size: 0.65rem; border-radius: 4px;">Chưa làm</span>
</div>
                </button>
                <button class="btn btn-sm shadow-sm d-flex align-items-center justify-content-center px-2 fw-bold text-warning" 
                        style="border-radius: 10px; background-color: #fffbeb; border: 1px solid #fde68a; font-size: 0.75rem;" 
                        onclick="event.stopPropagation(); open_admin_lesson_panel('${activeSubj}', '${num}')">
                    ✏️ Sửa
                </button>
                <button class="btn btn-sm shadow-sm d-flex align-items-center justify-content-center px-2 fw-bold text-danger" 
                        style="border-radius: 10px; background-color: #fef2f2; border: 1px solid #fecaca; font-size: 0.75rem;" 
                        onclick="event.stopPropagation(); delete_current_lesson('${activeSubj}', '${num}')">
                    <i class="bi bi-trash3-fill"></i>
                </button>
            </div>`;
            
            let addBtn = listContainer.querySelector('.glass-panel');
            if (addBtn) addBtn.insertAdjacentHTML('beforebegin', newBtnHtml);
            else listContainer.insertAdjacentHTML('beforeend', newBtnHtml);
        }
    }

    // 🌟 MỞ BẢNG QUẢN TRỊ ĐỂ GIÁO VIÊN CHỌN PHƯƠNG THỨC NHẬP
    if (typeof window.render_admin_panel === "function") {
        window.render_admin_panel();
        if(typeof show_toast === 'function') show_toast("✅ Đã tạo bài! Vui lòng chọn cách nhập câu hỏi.");
    }
};
//00000000000000000000000000000000000000000000000000 Bắt đầu 0000000000000000000000000000000000000000000000000000000000000//


// =========================================================================
// 👻 SÁT THỦ DIỆT CÂU NHÁP (TỰ ĐỘNG DỌN DẸP KHI CÓ CÂU THẬT)
// =========================================================================
window.sync_questions_to_sheet = function() {
    show_toast("Chức năng này không còn dùng vì hệ thống đã tự lưu câu hỏi (Live) lên Supabase.");
};

window.clean_up_ghost_drafts = async function() {
    if (!questions || questions.length === 0) return;
    for (let i = questions.length - 1; i >= 0; i--) {
        if (questions[i].q && questions[i].q.includes("Câu nháp")) {
            let qId = questions[i].id;
            questions.splice(i, 1);
            if (qId) {
                try {
                    await db.from('questions').delete().match({ id: qId });
                } catch (e) { console.log(e); }
            }
        }
    }
};

window.delete_bulk_row = function(idx) {
    window.bulk_parsed_questions.splice(idx, 1);
    window.render_bulk_preview();
};


// // =========================================================================
// // 3. VẼ NÚT SỬA VÀ XÓA BÊN TRONG DANH SÁCH BÀI HỌC (ĐÃ FIX LỖI TÀNG HÌNH)
// // =========================================================================
// window.draw_lesson_buttons = function(subjectKey, displayName, qData) {
//     // 🌟 LỚP BẢO VỆ: Nếu môn mới tinh chưa có data, ép nó thành mảng rỗng để không bị lỗi Crash
//     qData = qData || []; 
//     window.current_subject_qData = qData; 

//     const mapArea = document.getElementById(`map_area_${subjectKey}`);
//     if (!mapArea) return; // Bảo vệ DOM

//     let lessonMap = {}; 
//     qData.forEach(q => { if (!lessonMap[q.lesson]) lessonMap[q.lesson] = q.lessonname; });
//     const uniqueLessons = Object.keys(lessonMap).sort((a, b) => parseInt(a) - parseInt(b));
//     const userLog = (window.studentProgressLogs && (window.studentProgressLogs[displayName] || window.studentProgressLogs[subjectKey])) || { lessonScores: {} };
//     const scores = userLog.lessonScores || {};
    
//     let canEdit = window.check_subj_perm(subjectKey, 'edit');
    
//     let buttonsHtml = `<div class="d-flex flex-column gap-1.5 mt-2">`;
    
//     // 🌟 XỬ LÝ GIAO DIỆN KHI MÔN HỌC TRỐNG (EMPTY STATE)
//     if (uniqueLessons.length === 0) {
//         buttonsHtml += `
//         <div class="text-center p-4 mb-2 glass-panel" style="border-radius: 12px; background: rgba(0,0,0,0.15);">
//             <i class="bi bi-folder2-open text-white-50 mb-2" style="font-size: 2.5rem;"></i>
//             <div class="text-white-50 fw-bold" style="font-size: 0.85rem;">Môn học này chưa có bài nào!</div>
//         </div>`;
//     } else {
//         // NẾU CÓ DỮ LIỆU THÌ VẼ DANH SÁCH NHƯ BÌNH THƯỜNG
//         uniqueLessons.forEach(l => {
//             let nameStr = lessonMap[l] ? `: ${lessonMap[l]}` : "";
//             let score = scores[l];
//             let lesson_qs = qData.filter(q => String(q.lesson) === l);
//             let total_qs = lesson_qs.length;
//             let s = lesson_qs.filter(q => q.type === 'single' || q.type === 'mcq' || !q.type).length;      
//             let tf = lesson_qs.filter(q => q.type === 'tf' || q.type === 'true_false' || q.type === 'đúng sai').length; 
//             let f = lesson_qs.filter(q => q.type === 'fill' || q.type === 'điền khuyết').length; 

// // 🌟 LOGIC TẠO HUY HIỆU ĐIỂM
// let scoreStr = "";
// if (score !== undefined) {
//     let badgeColor = score >= 8 ? 'bg-success' : 'bg-warning text-dark';
//     scoreStr = `<span class="badge ${badgeColor} ms-1 shadow-sm" style="font-size: 0.65rem; border-radius: 4px;"><i class="bi bi-clock-history me-1"></i>Lần cuối: ${score.toFixed(1)}đ</span>`;
// } else {
//     scoreStr = `<span class="badge bg-secondary ms-1" style="font-size: 0.65rem; border-radius: 4px;">Chưa làm</span>`;
// }

// let adminEditBtn = canEdit ? `
//                 <div class="d-flex gap-1">
//                     <button class="btn btn-sm shadow-sm d-flex align-items-center justify-content-center px-2 fw-bold text-warning" 
//                             style="border-radius: 10px; background-color: #fffbeb; border: 1px solid #fde68a; font-size: 0.75rem;" 
//                             onclick="event.stopPropagation(); open_admin_lesson_panel('${subjectKey}', '${l}')">
//                         ✏️ Sửa
//                     </button>
//                     <button class="btn btn-sm shadow-sm d-flex align-items-center justify-content-center px-2 fw-bold text-danger" 
//                             style="border-radius: 10px; background-color: #fef2f2; border: 1px solid #fecaca; font-size: 0.75rem;" 
//                             onclick="event.stopPropagation(); delete_current_lesson('${subjectKey}', '${l}')">
//                         <i class="bi bi-trash3-fill"></i>
//                     </button>
//                 </div>` : "";

//             buttonsHtml += `
//                 <div class="d-flex gap-1.5 align-items-stretch mb-1">
//                     <button class="btn text-start flex-grow-1 bg-light border-0 p-2" style="margin: 0; border-radius: 10px;" onclick="window.quick_start_lesson('${subjectKey}', '${l}')">
//     <div class="fw-bold text-dark mb-0 text-truncate" style="font-size: 0.8rem; width: 100%;">Bài ${l}${nameStr}</div>
//     <div class="text-secondary d-flex align-items-center mt-1" style="font-size: 0.68rem; opacity: 0.85;">
//         Tổng: <b class="mx-1">${total_qs}</b> (TN:${s} | ĐS:${tf} | ĐK:${f}) ${scoreStr}
//     </div>
// </button>
//                     ${adminEditBtn}
//                 </div>`;
//         });
//     }
    
//     // 🌟 NÚT TẠO BÀI HỌC LUÔN XUẤT HIỆN Ở DƯỚI CÙNG (MIỄN LÀ CÓ QUYỀN)
//     if (canEdit) {
//         buttonsHtml += `
//         <div class="p-2 text-center mt-2 d-flex align-items-center justify-content-center glass-panel shadow-sm" 
//              onclick="window.show_add_lesson_modal('${subjectKey}')" 
//              style="cursor: pointer; border: 1.5px dashed rgba(14, 165, 233, 0.6) !important; background: rgba(14, 165, 233, 0.1) !important; border-radius: 10px; transition: 0.2s;">
//             <i class="bi bi-plus-circle-dotted text-info me-2" style="font-size: 1.2rem;"></i>
//             <div class="fw-bold text-info" style="font-size: 0.85rem; letter-spacing: 0.5px;">THÊM BÀI HỌC MỚI</div>
//         </div>`;
//     }

//     buttonsHtml += `</div>`;
//     mapArea.innerHTML = buttonsHtml;
// };
// =========================================================================
// 🗑️ GIAO DIỆN BẢNG CẢNH BÁO XÓA BÀI HỌC (CUSTOM MODAL ĐẸP MẮT)
// =========================================================================
window.delete_current_lesson = function(subjKey, lessonNum) {
    if (!subjKey || !lessonNum) return show_toast("⚠️ Chưa xác định được bài học cần xóa!", true);
    
    let subjData = window.current_subject_qData || [];
    if (!subjData || subjData.length === 0) return show_toast("⚠️ Không tìm thấy dữ liệu câu hỏi để xóa!", true);

    let lessonName = (window.lessonNames && window.lessonNames[subjKey]) ? window.lessonNames[subjKey][lessonNum] : "";
    let displayTitle = lessonName ? `BÀI ${lessonNum} - ${lessonName}` : `BÀI ${lessonNum}`;

    // Vẽ giao diện Bảng cảnh báo xóa thay cho confirm() mặc định của trình duyệt
    let modalHtml = `
    <div id="delete_confirm_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.8); z-index: 30000; backdrop-filter: blur(10px);">
        <div class="glass-panel p-4 shadow-lg mx-3 text-center" style="width: 100%; max-width: 420px; border-radius: 16px; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(239, 68, 68, 0.3);">
            
            <i class="bi bi-exclamation-triangle-fill text-danger mb-3 d-block" style="font-size: 3.5rem; filter: drop-shadow(0 0 15px rgba(239,68,68,0.5));"></i>
            <h5 class="fw-bold text-white mb-3" style="letter-spacing: 0.5px;">CẢNH BÁO XÓA DỮ LIỆU</h5>
            
            <p class="text-white-50 mb-4" style="font-size: 0.95rem; line-height: 1.5;">
                Thầy/Cô có chắc chắn muốn xóa vĩnh viễn<br>
                <b class="text-danger" style="font-size: 1.1rem;">[ ${displayTitle} ]</b> không?<br><br>
                Toàn bộ câu hỏi thuộc bài này sẽ bị xóa sạch khỏi hệ thống và <b class="text-warning">KHÔNG THỂ KHÔI PHỤC</b>.
            </p>
            
            <div class="d-flex justify-content-center gap-3 mt-2">
                <button class="btn glass-action-btn px-4 py-2" onclick="document.getElementById('delete_confirm_modal').remove()">
                    HỦY BỎ
                </button>
                <button class="btn btn-danger fw-bold px-4 py-2 shadow" style="border-radius: 8px; background: linear-gradient(135deg, #ef4444, #b91c1c); border: none;" onclick="execute_delete_lesson('${subjKey}', '${lessonNum}')">
                    <i class="bi bi-trash3-fill me-1"></i> XÓA VĨNH VIỄN
                </button>
            </div>
            
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// =========================================================================
// 🗑️ HÀM THỰC THI XÓA BÀI HỌC (CHẠY SAU KHI ĐÃ BẤM NÚT XÁC NHẬN Ở BẢNG TRÊN)
// =========================================================================
window.execute_delete_lesson = function(subjKey, lessonNum) {
    // 1. Đóng bảng cảnh báo lại
    let modal = document.getElementById('delete_confirm_modal');
    if (modal) modal.remove();

    let subjData = window.current_subject_qData || [];
    let lessonName = (window.lessonNames && window.lessonNames[subjKey]) ? window.lessonNames[subjKey][lessonNum] : "";
    let displayTitle = lessonName ? `BÀI ${lessonNum} - ${lessonName}` : `BÀI ${lessonNum}`;

    // 2. TÌM VÀ LỌC CÁC CÂU HỎI THUỘC VỀ BÀI NÀY ĐỂ XÓA
    let qsToDelete = subjData.filter(q => String(q.lesson) === String(lessonNum));
    
    // Giữ lại các câu hỏi của CÁC BÀI KHÁC
    window.current_subject_qData = subjData.filter(q => String(q.lesson) !== String(lessonNum));
    
    if (window.lessonNames && window.lessonNames[subjKey]) {
        delete window.lessonNames[subjKey][lessonNum];
    }

    if (qsToDelete.length === 0) {
        show_toast(`✅ Đã xóa ${displayTitle} (Bài học trống).`);
        window.draw_lesson_buttons(subjKey, window.current_student_id, window.current_subject_qData);
        return;
    }

    show_toast(`⏳ Đang tiến hành xóa vĩnh viễn ${qsToDelete.length} câu hỏi của ${displayTitle}...`);
    
    // 3. GỬI LỆNH XÓA LÊN SERVER
    let deleteCount = 0;
    
    qsToDelete.forEach((q, index) => {
        setTimeout(() => {
            google.script.run
            .withSuccessHandler(function() {
                deleteCount++;
                if (deleteCount === qsToDelete.length) {
                    show_toast(`✅ Đã xóa vĩnh viễn toàn bộ ${qsToDelete.length} câu hỏi của Bài ${lessonNum}!`);
                    if (typeof window.draw_lesson_buttons === 'function') {
                        window.draw_lesson_buttons(subjKey, window.current_student_id, window.current_subject_qData);
                    }
                }
            })
            .withFailureHandler(function(err) {
                console.error("Lỗi khi xóa câu hỏi:", err);
            })
            .syncSingleQuestionToSheet(subjKey, "delete", q, q.original_q || q.q);
            
        }, index * 250); 
    });
};
// 🌟 HÀM KIỂM TRA QUYỀN CỦA TỪNG MÔN HỌC (VIEW / EDIT)
window.check_subj_perm = function(subjKey, action = 'view') {
    if (window.currentUserPerms[action].includes('all')) return true;
    
    let config = subjectConfig[subjKey] || {};
    let grp = config.role ? String(config.role).trim().toLowerCase() : "all";
    
    // Kiểm tra đích danh môn học
    if (window.currentUserPerms[action].includes(subjKey.toLowerCase())) return true;
    // Kiểm tra xem có được cấp quyền theo cả NHÓM môn học không
    if (window.currentUserPerms[action].includes(grp)) return true;
    // Nếu môn đó là môn Public (nhóm 'all') thì ai cũng được XEM
    if (action === 'view' && grp === 'all') return true; 

    return false;
};
// =========================================================================
// 🔄 ĐỒNG BỘ LUỒNG TẢI NGẦM (CHỐNG TRÙNG LẶP BIẾN VỚI JS_SHARED)
// =========================================================================
window.preloadQueue = window.preloadQueue || [];
window.isPreloading = typeof window.isPreloading !== 'undefined' ? window.isPreloading : false;

// Hàm tải ngầm dữ liệu môn học
function preload_background_data() {
    let safe_role = String(window.current_user_role).trim().toLowerCase();
    Object.keys(subjectConfig).forEach(key => {
        let config = subjectConfig[key];
        let môn_quyền = config.role ? String(config.role).trim().toLowerCase() : "all";
        if (safe_role === "all" || môn_quyền === "all" || môn_quyền === safe_role) {
            if (!window.full_data[key] && !window.preloadQueue.includes(key)) {
                window.preloadQueue.push(key);
            }
        }
    });
    if (!window.isPreloading && typeof window.process_preload_queue === 'function') {
        window.process_preload_queue();
    }
}