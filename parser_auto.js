// =========================================================================
// 🚀 NHẬP LIỆU HÀNG LOẠT SIÊU CẤP (AI PHÂN LOẠI CHUẨN + LIVE EDIT POPUP CỐ ĐỊNH)
// =========================================================================

window.bulk_html_paste_data = ""; 

window.handle_bulk_paste = function(e) {
    window.bulk_html_paste_data = (e.clipboardData || window.clipboardData).getData('text/html') || "";
};

window.close_bulk_import_modal = function() {
    document.body.style.overflow = ''; 
    let modal = document.getElementById('bulk_import_modal');
    if(modal) modal.remove();
};

// =========================================================================
// 1. HÀM MỞ GIAO DIỆN NHẬP HÀNG LOẠT (BỔ SUNG CHẾ ĐỘ AUTO DETECT)
// =========================================================================
window.open_bulk_import_modal = function() {
    document.body.style.overflow = 'hidden'; 
    
    let modalHtml = `
    <div id="bulk_import_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(15, 23, 42, 0.85); z-index: 27000; backdrop-filter: blur(15px);">

        <style>
            .glass-modal { background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); backdrop-filter: blur(25px); }
            .glass-tabs { background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 3px; }
            .glass-tab-label { color: rgba(255,255,255,0.7); border-radius: 6px; font-size: 0.85rem; padding: 6px 12px; white-space: nowrap; transition: all 0.2s; cursor: pointer; font-weight: 500; }
            .glass-tab-input:checked + .glass-tab-label { background: rgba(255,255,255,0.2); color: #fff; font-weight: bold; border: 1px solid rgba(56, 189, 248, 0.4); }
            .glass-tab-input.auto-mode:checked + .glass-tab-label { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; }
            .glass-textarea { background: rgba(0,0,0,0.2) !important; border: 1px solid rgba(255,255,255,0.08) !important; color: #fff !important; border-radius: 10px; resize: none; font-size: 0.95rem; line-height: 1.6; }
            .glass-textarea:focus { border-color: rgba(56, 189, 248, 0.5) !important; box-shadow: inset 0 2px 10px rgba(0,0,0,0.3) !important; outline: none; }
            .row-hover-magic { transition: background 0.2s; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.08); }
            .row-hover-magic:hover { background: rgba(255,255,255,0.1) !important; }
            .thin-font { font-weight: 400 !important; letter-spacing: 0.2px; }
            
            .toggle-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; border-radius: 6px; font-size: 0.75rem; padding: 4px 10px; cursor: pointer; transition: 0.2s; font-weight: 500; }
            .toggle-btn.active { background: rgba(56,189,248,0.2); color: #fff; border-color: #38bdf8; }
            .toggle-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
            
            #preview_excel_table { width: 100%; table-layout: fixed; }
            #preview_excel_table th, #preview_excel_table td { overflow: hidden; word-wrap: break-word; }
        </style>

        <div class="glass-modal p-0 d-flex flex-column m-2" style="width: 98vw; max-width: 1900px; height: 96vh;">
            
            <div class="d-flex justify-content-between align-items-center p-2 px-3 border-bottom flex-shrink-0" style="border-color: rgba(255,255,255,0.1) !important; background: rgba(0,0,0,0.2); border-radius: 16px 16px 0 0;">
                <h6 class="fw-bold text-white m-0" style="letter-spacing: 0.5px;"><i class="bi bi-robot text-warning me-2"></i> TRỢ LÝ AI BÓC TÁCH DỮ LIỆU ĐA MÔ HÌNH</h6>
                <button class="btn-close btn-close-white opacity-75 hover-opacity-100" onclick="close_bulk_import_modal()"></button>
            </div>
            
            <div class="d-flex flex-column flex-grow-1 overflow-hidden p-2">
                
                <div id="bulk_input_section" class="d-flex flex-column mb-2" style="height: 40%; min-height: 250px;">
                    
                    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <div class="glass-tabs d-flex">
                            <div class="text-center pe-1 border-end border-secondary border-opacity-50">
                                <input type="radio" class="btn-check glass-tab-input auto-mode" name="parse_stream" id="stream_auto" value="auto" checked>
                                <label class="glass-tab-label m-0" for="stream_auto"><i class="bi bi-stars me-1"></i>Auto Detect</label>
                            </div>
                            <div class="text-center ps-1">
                                <input type="radio" class="btn-check glass-tab-input" name="parse_stream" id="stream_inline" value="inline">
                                <label class="glass-tab-label m-0" for="stream_inline">Word (Tại chỗ)</label>
                            </div>
                            <div class="text-center px-1">
                                <input type="radio" class="btn-check glass-tab-input" name="parse_stream" id="stream_appendix" value="appendix">
                                <label class="glass-tab-label m-0" for="stream_appendix">Word (Phụ lục)</label>
                            </div>
                            <div class="text-center">
                                <input type="radio" class="btn-check glass-tab-input" name="parse_stream" id="stream_excel" value="excel">
                                <label class="glass-tab-label m-0" for="stream_excel">Excel</label>
                            </div>
                        </div>
                        
                        <div class="d-flex align-items-center gap-1 flex-wrap" id="col_toggles_container" style="opacity: 0.5; pointer-events: none;">
                            <span class="text-info small fw-bold me-1"><i class="bi bi-eye"></i> Ẩn/hiện cột:</span>
                            <div class="toggle-btn active" onclick="toggle_table_col(2, this)">Bài</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(4, this)">Dạng</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(6, this)">Nội dung</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(7, this)">Lựa chọn</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(8, this)">Đáp án</div>
                        </div>

                        <button class="btn btn-sm text-white fw-bold shadow px-4 py-2" style="border-radius: 8px; background: linear-gradient(135deg, #0ea5e9, #2563eb); border: none; font-size: 0.9rem;" onclick="process_bulk_data()">
                            <i class="bi bi-lightning-charge-fill text-warning me-1"></i> BÓC TÁCH NGAY
                        </button>
                        <button type="button" class="btn btn-sm btn-warning rounded-circle shadow p-0 d-flex align-items-center justify-content-center" onmousedown="event.preventDefault(); window.make_vocab_tag();" title="Magic Vocab: Tự động tra IPA & Dịch nghĩa" style="width: 28px; height: 28px; border: 1px solid #f59e0b; font-size: 1.1rem; flex-shrink: 0;">
                                🪄
                            </button>
                    </div>

                    <textarea id="bulk_input_text" onpaste="handle_bulk_paste(event)" class="form-control glass-textarea custom-scrollbar flex-grow-1 shadow-sm p-3" 
                        placeholder="Dán toàn bộ văn bản câu hỏi vào đây (AI sẽ tự động nhận diện dạng Excel hoặc Word)..."></textarea>
                </div>

                <div id="bulk_preview_area" class="d-flex flex-column flex-grow-1 overflow-hidden rounded" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
                    <div class="d-flex flex-column justify-content-center align-items-center h-100 text-white-50 thin-font">
                        <i class="bi bi-cpu opacity-25 mb-2" style="font-size: 3rem;"></i>
                        <span>Bảng kết quả bóc tách sẽ hiển thị tại đây.</span>
                    </div>
                </div>

            </div>

            <div class="d-flex justify-content-between align-items-center p-2 border-top flex-shrink-0" style="border-color: rgba(255,255,255,0.1) !important;">
                <div class="small text-info ms-2 fw-bold" id="auto_detect_msg"><i class="bi bi-info-circle me-1"></i> Dán dữ liệu và bấm Bóc Tách Ngay.</div>
                <button id="btn_save_bulk" class="btn btn-sm btn-success fw-bold px-4 disabled" style="border-radius: 6px; font-size: 0.9rem;" onclick="confirm_save_bulk()">
                    <i class="bi bi-cloud-arrow-up-fill me-1"></i> LƯU VÀO NGÂN HÀNG
                </button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setTimeout(() => document.getElementById('bulk_input_text').focus(), 150);
};
// =========================================================================
// 🤖 HÀM ĐIỀU HƯỚNG BẰNG TRÍ TUỆ NHÂN TẠO (GEMINI API)
// =========================================================================
window.process_bulk_data_with_ai = function() {
    let rawText = document.getElementById('bulk_input_text').value.trim();
    if (!rawText) return show_toast("⚠️ Vui lòng dán dữ liệu vào ô trống!", true);
    
    let statusEl = document.getElementById('bulk_status_text');
    let saveBtn = document.getElementById('btn_save_bulk');
    
    // Đổi giao diện sang chế độ Loading
    statusEl.innerHTML = `<span class="spinner-border spinner-border-sm text-warning me-2"></span><span class="text-warning fw-bold">AI đang phân tích suy luận...</span>`;
    document.getElementById('bulk_preview_area').innerHTML = `
        <div class="text-center text-white mt-5 d-flex flex-column align-items-center justify-content-center" style="height: 60%;">
            <div class="spinner-grow text-info mb-3" style="width: 3rem; height: 3rem;"></div>
            <h5 class="fw-bold">Hệ thống AI đang xử lý...</h5>
            <p class="text-white-50">Việc đọc hiểu ngữ nghĩa có thể mất từ 5 - 15 giây tùy độ dài dữ liệu.</p>
        </div>`;
    saveBtn.classList.add('disabled');

    // Lấy thông tin bài học
    let defaultLessonNum = window.selected_lessons_text || "1";
    let defaultLessonName = window.lessonNames?.[window.current_subject]?.[defaultLessonNum] || "";
    let htmlData = window.bulk_html_paste_data || "";

    // Gọi lên Backend
    google.script.run
        .withSuccessHandler(function(response) {
            if (response.error) {
                statusEl.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-x-circle-fill"></i> Lỗi AI: ${response.error}</span>`;
                document.getElementById('bulk_preview_area').innerHTML = `<div class="text-center text-danger mt-5">Quá trình AI phân tích thất bại. Thầy vui lòng thử lại!</div>`;
                return;
            }

            // Nạp dữ liệu AI trả về vào mảng hệ thống
            window.bulk_parsed_questions = response;
            
            // Vẽ bảng
            document.getElementById('bulk_status_text').innerHTML = `<span class="text-success"><i class="bi bi-magic"></i> AI bóc tách xong ${window.bulk_parsed_questions.length} câu</span>`;
            document.getElementById('btn_save_bulk').classList.remove('disabled');
            if (typeof window.render_bulk_preview === 'function') window.render_bulk_preview();
        })
        .withFailureHandler(function(err) {
            statusEl.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-x-circle-fill"></i> Lỗi Server: ${err}</span>`;
            document.getElementById('bulk_preview_area').innerHTML = `<div class="text-center text-danger mt-5">Lỗi Server kết nối AI.</div>`;
        })
        .parseQuestionsWithAI(rawText, htmlData, defaultLessonNum, defaultLessonName);
};
// =========================================================================
// 🧠 HÀM ĐỌC HIỂU ĐỀ WORD HỢP NHẤT (QUÉT SẠCH MỌI LỖI ĐỊNH DẠNG)
// =========================================================================
window.parse_complex_word_format = function(rawText, htmlData) {
    let lines = rawText.split(/\r?\n/);
    let parsedData = [];
    let qMap = {}; 
    
    // 🌟 TẠO BẢN ĐỒ ĐÁP ÁN (QUÉT IN ĐẬM, IN NGHIÊNG, GẠCH CHÂN TỪ HTML)
    let ansMap = {};
    if (htmlData) {
        let qRegex = /(?:Câu|Bài)\s*(?:<[^>]+>\s*)*(\d+)/gi;
        let htmlQs = [];
        let match;
        while ((match = qRegex.exec(htmlData)) !== null) {
            htmlQs.push({ num: match[1], index: match.index });
        }
        for (let i = 0; i < htmlQs.length; i++) {
            let startIdx = htmlQs[i].index;
            let endIdx = (i + 1 < htmlQs.length) ? htmlQs[i + 1].index : htmlData.length;
            let blockHtml = htmlData.substring(startIdx, endIdx);
            
            // Regex siêu nhạy: Bắt thẻ b, strong, i, em, u hoặc thẻ span/p có style bold/italic/underline
            let styleRegex = /(?:<(?:b|strong|i|em|u|mark)[^>]*>|<[^>]+style=["'][^"']*(?:bold|700|italic|underline)[^"']*["'][^>]*>)(?:\s*<[^>]+>)*\s*([A-D])[\.\)]/i;
            let m = blockHtml.match(styleRegex);
            if (m) ansMap[htmlQs[i].num] = m[1].toUpperCase();
        }
    }

    let currLesson = window.selected_lessons_text || "1"; 
    let currLessonName = "";
    if (window.lessonNames && window.current_subject && window.lessonNames[window.current_subject]) {
        currLessonName = window.lessonNames[window.current_subject][currLesson] || "";
    }
    
    let currType = "single"; 
    let currLevel = 1;
    let mode = "questions"; 
    let currQNum = null;
    let lastTarget = "q"; 

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        let normLine = line.normalize('NFC').replace(/\t/g, '   '); 

        // 1. NHẬN DIỆN PHỤ LỤC ĐÁP ÁN
        if (normLine.match(/^(?:ĐÁP\s+ÁN|Đáp\s+án\s+BÀI|PHỤ LỤC ĐÁP ÁN)/i) && !normLine.match(/^Câu/i)) {
            mode = "answers"; currQNum = null; continue;
        }

        // 2. KHỐI XỬ LÝ PHỤ LỤC ĐÁP ÁN
        if (mode === "answers") {
            let ansRegex = /Câu\s+(\d+)[*]*\.\s*(.*?)(?=\s+Câu\s+\d|$)/gi;
            let match; let foundInLine = false;
            
            while ((match = ansRegex.exec(normLine)) !== null) {
                foundInLine = true;
                let qn = match[1];
                let ansText = match[2].trim();
                
                if (qMap[qn]) {
                    if (qMap[qn].type === 'fill') {
                        ansText = ansText.replace(/(?:^|\s+)[a-zA-Z]\.\s*/g, ' | ').replace(/^[\s\|]+/, '').trim();
                    } else if (qMap[qn].type === 'single' || qMap[qn].type === 'tf') {
                        ansText = ansText.split(/\s+/)[0].replace(/\./g, '').trim(); 
                    }
                    
                    if (qMap[qn].type === 'single') {
                        let letter = ansText.replace(/[^a-zA-Z]/g, '').toUpperCase();
                        if (letter === 'A') qMap[qn].a = qMap[qn].opta;
                        else if (letter === 'B') qMap[qn].a = qMap[qn].optb;
                        else if (letter === 'C') qMap[qn].a = qMap[qn].optc;
                        else if (letter === 'D') qMap[qn].a = qMap[qn].optd;
                        else qMap[qn].a = ansText;
                    } else {
                        qMap[qn].a = ansText;
                    }
                    qMap[qn].answer = qMap[qn].a;
                }
                currQNum = qn; 
            }
            
            if (!foundInLine && currQNum && qMap[currQNum]) {
                if (qMap[currQNum].type === 'fill' && normLine.match(/^[a-zA-Z]\./)) {
                    let cleanAns = normLine.replace(/^[a-zA-Z]\.\s*/, '').trim();
                    qMap[currQNum].a += (qMap[currQNum].a ? " | " : "") + cleanAns;
                    qMap[currQNum].answer = qMap[currQNum].a;
                }
            }
            continue;
        }

        // 3. KHỐI ĐỌC CÂU HỎI VÀ ĐÁP ÁN NỘI TUYẾN
        let lessonMatch = normLine.match(/^BÀI\s+(\d+)(?:\.\s*(.*))?/i);
        if (lessonMatch) { currLesson = lessonMatch[1]; currLessonName = (lessonMatch[2]||"").trim(); continue; }
        
        if (normLine.match(/CÂU HỎI ĐÚNG SAI/i)) { currType = "tf"; continue; }
        if (normLine.match(/CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM/i)) { currType = "single"; continue; }
        if (normLine.match(/CÂU HỎI ĐIỀN KHUYẾT/i)) { currType = "fill"; continue; }
        
        let levelMatch = normLine.match(/^Mức\s+(\d+)/i);
        if (levelMatch) { currLevel = parseInt(levelMatch[1]); continue; }

        let qMatch = normLine.match(/^Câu\s+(\d+)([*]*)\.\s*([\s\S]*)/i);
        if (qMatch) {
            currQNum = qMatch[1];
            let stars = qMatch[2].length;
            let localLevel = currLevel;
            if (stars === 1) localLevel = 2; if (stars === 2) localLevel = 3;

            lastTarget = "q"; 
            let rawQText = qMatch[3].trim();
            
            // 🌟 TÌM ĐÁP ÁN NỘI TUYẾN NGAY LẬP TỨC
            let inlineAns = "";
            let inlineAnsMatch = rawQText.match(/(?:Đáp\s*án|Đ\/A)\s*:?\s*([\s\S]*)$/i);
            if (inlineAnsMatch) {
                inlineAns = inlineAnsMatch[1].trim();
                rawQText = rawQText.substring(0, inlineAnsMatch.index).trim();
            }
            
            // NẾU KHÔNG CÓ CHỮ ĐÁP ÁN, LẤY TỪ BẢN ĐỒ HTML IN ĐẬM/NGHIÊNG
            if (!inlineAns && ansMap[currQNum]) {
                inlineAns = ansMap[currQNum];
            }
            
            let qText = rawQText;
            let qObj = {
                lesson: currLesson, lessonname: currLessonName, type: currType, level: localLevel,
                q: "", opta: "", optb: "", optc: "", optd: "", a: inlineAns, answer: inlineAns, hint: "", original_q: line
            };
            
            // 🌟 BỘ QUY TẮC THÉP AUTO-DETECT
            let hasDots = /([\.…_]\s*){2,}/.test(qText); 
            let hasABC = /(?:^|\s+)[aA][\.\)]\s+.*?(?:^|\s+)[bB][\.\)]\s+.*?(?:^|\s+)[cC][\.\)]/is.test(qText);
            let isTF = inlineAns && /^(đúng|sai)[\.\s]*$/i.test(inlineAns.replace(/[\.\s]/g, '').toLowerCase());

            if (isTF || currType === 'tf') {
                qObj.type = 'tf';
                if (inlineAns) qObj.a = inlineAns.replace(/\./g, '').trim();
                qObj.answer = qObj.a;
                qObj.q = qText;
            } 
            else if (hasDots || (inlineAns && !hasABC && currType !== 'single')) {
                qObj.type = 'fill';
                // Dọn sạch mọi dạng .….(A)….. hoặc .....(B)... thành [...]
                qObj.q = qText.replace(/([\.…_]\s*){2,}[<\[\(]?[a-zA-Z0-9]?[>\]\)]?\s*([\.…_]\s*)*/g, ' [...] ').replace(/\s{2,}/g, ' ').trim();
                if (inlineAns) {
                    qObj.a = inlineAns.replace(/(?:^|\s+)[a-zA-Z][\.\)]\s+/g, ' | ').replace(/^[\s\|]+/, '').trim();
                    qObj.answer = qObj.a;
                }
            }
            else {
                qObj.type = 'single';
                let tempLine = qText.replace(/(^|\s+)(A)\./g, '|||A.').replace(/(^|\s+)(B)\./g, '|||B.').replace(/(^|\s+)(C)\./g, '|||C.').replace(/(^|\s+)(D)\./g, '|||D.');
                let parts = tempLine.split('|||');
                for (let p of parts) {
                    p = p.trim(); if (!p) continue;
                    if (p.startsWith('A.')) { qObj.opta = p.substring(2).trim(); lastTarget = 'a'; }
                    else if (p.startsWith('B.')) { qObj.optb = p.substring(2).trim(); lastTarget = 'b'; }
                    else if (p.startsWith('C.')) { qObj.optc = p.substring(2).trim(); lastTarget = 'c'; }
                    else if (p.startsWith('D.')) { qObj.optd = p.substring(2).trim(); lastTarget = 'd'; }
                    else { if (lastTarget === 'q') qObj.q += (qObj.q ? " " : "") + p; }
                }
                
                // MÓC ÁNH XẠ NỘI DUNG VÀO ĐÁP ÁN ĐÚNG
                if (inlineAns) {
                    let letterMatch = inlineAns.match(/^[A-D]/i);
                    if (letterMatch) {
                        let letter = letterMatch[0].toUpperCase();
                        if (letter === 'A') qObj.a = qObj.opta;
                        else if (letter === 'B') qObj.a = qObj.optb;
                        else if (letter === 'C') qObj.a = qObj.optc;
                        else if (letter === 'D') qObj.a = qObj.optd;
                        else qObj.a = inlineAns;
                    }
                    qObj.answer = qObj.a;
                }
            }

            qMap[currQNum] = qObj;
            parsedData.push(qObj);
            continue;
        }

        // 4. XỬ LÝ DÒNG RỚT VÀ CẮT ĐÁP ÁN BỊ RỚT XUỐNG DÒNG DƯỚI
        if (currQNum && qMap[currQNum]) {
            let qObj = qMap[currQNum];
            
            let inlineAnsMatch = normLine.match(/(?:Đáp\s*án|Đ\/A)\s*:?\s*([\s\S]*)$/i);
            if (inlineAnsMatch) {
                let ansStr = inlineAnsMatch[1].trim();
                if (qObj.type === 'tf') {
                    qObj.a = ansStr.replace(/\./g, '').trim();
                } else if (qObj.type === 'fill') {
                    qObj.a = ansStr.replace(/(?:^|\s+)[a-zA-Z][\.\)]\s+/g, ' | ').replace(/^[\s\|]+/, '').trim();
                } else if (qObj.type === 'single') {
                    let letterMatch = ansStr.match(/^[A-D]/i);
                    if (letterMatch) {
                        let letter = letterMatch[0].toUpperCase();
                        if (letter === 'A') qObj.a = qObj.opta;
                        else if (letter === 'B') qObj.a = qObj.optb;
                        else if (letter === 'C') qObj.a = qObj.optc;
                        else if (letter === 'D') qObj.a = qObj.optd;
                    } else { qObj.a = ansStr; }
                }
                qObj.answer = qObj.a;
                normLine = normLine.substring(0, inlineAnsMatch.index).trim();
                if (!normLine) continue; 
            }

            if (qObj.type === 'fill') {
                if (normLine.match(/^[a-zA-Z]\s*[\.…_]{2,}/)) {
                    qObj.q += " [...]"; 
                } else {
                    qObj.q += " " + normLine.replace(/([\.…_]\s*){2,}[<\[\(]?[a-zA-Z0-9]?[>\]\)]?\s*([\.…_]\s*)*/g, ' [...] ').replace(/\s{2,}/g, ' ').trim();
                }
            } else if (qObj.type === 'single') {
                let hasOpt = /(^|\s+)[A-D]\./.test(normLine);
                if (hasOpt) {
                    let tempLine = normLine.replace(/(^|\s+)(A)\./g, '|||A.').replace(/(^|\s+)(B)\./g, '|||B.').replace(/(^|\s+)(C)\./g, '|||C.').replace(/(^|\s+)(D)\./g, '|||D.');
                    let parts = tempLine.split('|||');
                    for (let p of parts) {
                        p = p.trim(); if (!p) continue;
                        if (p.startsWith('A.')) { qObj.opta += (qObj.opta ? " " : "") + p.substring(2).trim(); lastTarget = 'a'; }
                        else if (p.startsWith('B.')) { qObj.optb += (qObj.optb ? " " : "") + p.substring(2).trim(); lastTarget = 'b'; }
                        else if (p.startsWith('C.')) { qObj.optc += (qObj.optc ? " " : "") + p.substring(2).trim(); lastTarget = 'c'; }
                        else if (p.startsWith('D.')) { qObj.optd += (qObj.optd ? " " : "") + p.substring(2).trim(); lastTarget = 'd'; }
                        else { if (lastTarget === 'q') qObj.q += " " + p; }
                    }
                } else {
                    if (lastTarget === 'q') qObj.q += " " + normLine;
                    else if (lastTarget === 'a') qObj.opta += " " + normLine;
                    else if (lastTarget === 'b') qObj.optb += " " + normLine;
                    else if (lastTarget === 'c') qObj.optc += " " + normLine;
                    else if (lastTarget === 'd') qObj.optd += " " + normLine;
                }
            } else {
                qObj.q += " " + normLine;
            }
        }
    }
    return parsedData;
};

// =========================================================================
// 🎯 HÀM LÕI BÓC TÁCH: XỬ LÝ ĐỀ HỖN HỢP + ƯU TIÊN SỐ BÀI TỪ DỮ LIỆU GỐC
// =========================================================================
window.process_bulk_data = function() {
    let rawText = document.getElementById('bulk_input_text').value.trim();
    if (!rawText) return show_toast("⚠️ Vui lòng dán dữ liệu vào ô trống bên trái trước khi bóc tách!", true);
    
    let selectedStream = document.querySelector('input[name="parse_stream"]:checked').value;
    
    // Lấy thông tin bài học mặc định (Làm fallback)
    let defaultLessonID = (typeof selected_lessons_text !== 'undefined' && selected_lessons_text) ? selected_lessons_text : (document.getElementById('new_lesson_num')?.value || "1");
    let defaultLessonName = document.getElementById('new_lesson_name')?.value || "";
    let activeSubj = (typeof current_subject !== 'undefined' && current_subject) ? current_subject : (typeof temp_subject_key !== 'undefined' ? temp_subject_key : "");
    if (!defaultLessonName && activeSubj && typeof lessonNames !== 'undefined' && lessonNames[activeSubj]) {
        defaultLessonName = lessonNames[activeSubj][defaultLessonID] || "";
    }

    let htmlData = window.bulk_html_paste_data || "";
    let styleRegex = /<(?:b|strong|i|em|u|mark|span[^>]*style=["'][^"']*(?:font-weight\s*:\s*(?:bold|700)|font-style\s*:\s*italic|text-decoration\s*:\s*underline|color:[^"']*)["'])[^>]*>(?:<[^>]+>|\s)*([A-D])[\.\)]/gi;
    let boldMatches = [...htmlData.matchAll(styleRegex)];
    let boldIndex = 0;

    const formatQuestionText = (text) => text.replace(/^(?:Câu|Bài)\s*\d+[\.\:\s\*]+/i, '').replace(/<n>/gi, '').trim();

    const extractMultimedia = (text) => {
        let mediaLink = "";
        let mediaMatch = text.match(/\[(?:Media|Multimedia):\s*(https?:\/\/[^\]]+)\]/i);
        if (mediaMatch) { mediaLink = mediaMatch[1].trim(); text = text.replace(mediaMatch[0], '').trim(); }
        return { cleanText: text, link: mediaLink };
    };

    const cleanFillBlanks = (text) => {
        let res = text.replace(/[\.…_·]{2,}/g, ' ___ ')
                      .replace(/(?:^|\s|<br>)(?:\([A-Za-z]\)|[A-Za-z][\.\:]?)\s*___/g, ' ___ ')
                      .replace(/___\s*(?:\([A-Za-z]\)|[A-Za-z][\.\:]?)(?=\s|$|<br>)/g, ' ___ ')
                      .replace(/___/g, '[...]')
                      .replace(/[\[\(]\s*\[\.\.\.\]\s*[\]\)]/g, '[...]')
                      .replace(/(?:\s*\[\.\.\.\]\s*){2,}/g, ' [...] ');
        return res.replace(/\s+/g, ' ').trim();
    };

    // --- 🚀 HÀM XỬ LÝ WORD ---
    const processWordStream = (streamType, targetArray, appendixMap = {}) => {
        let blocks = streamType === 'appendix' ? rawText.replace(/(?:^|\n)(?:ĐÁP\s+ÁN|PHỤ\s+LỤC)[\s\S]*/i, '').split(/(?=\n(?:Câu|Bài)\s*\d+)/i) : rawText.split(/(?=\n(?:Câu|Bài)\s*\d+)/i);
        
        // 🌟 CỜ LƯU TRẠNG THÁI (BÀI, MỨC, DẠNG CÂU)
        let pendingLevel = 1; let pendingType = 'single';
        let pendingLessonID = defaultLessonID;     // Khởi tạo bằng mặc định
        let pendingLessonName = defaultLessonName; // Khởi tạo bằng mặc định

        blocks.forEach(block => {
            let text = block.trim();
            
            // 🌟 NẾU BLOCK NÀY LÀ TIÊU ĐỀ BÀI HOẶC PHÂN ĐOẠN (Không chứa chữ Câu)
            if (!/^Câu\s*\d+/i.test(text)) {
                // Quét bắt tiêu đề: BÀI 12. HỆ SINH THÁI
                let lessonMatch = text.match(/^Bài\s+(\d+)(?:[\.\:\-]\s*([^\n]*))?/i);
                if (lessonMatch) {
                    pendingLessonID = lessonMatch[1].trim();
                    pendingLessonName = lessonMatch[2] ? lessonMatch[2].trim() : "";
                }

                if (/Mức\s*(\d+)/i.test(text)) pendingLevel = parseInt(text.match(/Mức\s*(\d+)/i)[1]);
                if (/CÂU HỎI ĐIỀN KHUYẾT/i.test(text)) pendingType = 'fill';
                else if (/CÂU HỎI ĐÚNG SAI/i.test(text)) pendingType = 'tf';
                else if (/CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM/i.test(text)) pendingType = 'single';
                
                return; // Ghi nhận trạng thái xong thì bỏ qua block này, chờ block Câu tiếp theo
            }

            let trailingHeaders = "";
            let endMatch = text.match(/(?:\n\s*(?:Mức\s*\d+|CÂU HỎI ĐIỀN KHUYẾT|CÂU HỎI ĐÚNG SAI|CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM))+\s*$/i);
            if (endMatch) { trailingHeaders = endMatch[0]; text = text.substring(0, endMatch.index).trim(); }

            let currentLevel = pendingLevel;
            let starsMatch = text.match(/^Câu\s*\d+([*]+)/i);
            if (starsMatch) currentLevel = starsMatch[1].length + 1;

            let qContent = text.replace(/CÂU HỎI ĐIỀN KHUYẾT|CÂU HỎI ĐÚNG SAI|CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM/gi, '').replace(/(?:^|\n)Mức\s*\d+/gi, '').trim();
            let explicitAns = "";

            if (streamType === 'inline') {
                let ansMatch = qContent.match(/(?:Đáp\s*án|Đ\/A)\s*:?\s*([\s\S]*)$/i);
                if (ansMatch) { explicitAns = ansMatch[1].trim(); qContent = qContent.substring(0, ansMatch.index).trim(); }
            } else {
                let qNumMatch = qContent.match(/^Câu\s*(\d+)/i);
                if (qNumMatch && appendixMap[qNumMatch[1]]) {
                    explicitAns = appendixMap[qNumMatch[1]];
                    explicitAns = explicitAns.replace(/(?:\n|\s)*(?:CÂU HỎI ĐIỀN KHUYẾT|CÂU HỎI ĐÚNG SAI|CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM|Mức\s*\d+)[\s\S]*$/i, '').trim();
                }
            }

            let mediaData = extractMultimedia(qContent);
            qContent = mediaData.cleanText; let multiLink = mediaData.link;

            let finalType = pendingType; 
            let hasABC = /(?:^|\s|<br>)[aA][\.\)]\s+[\s\S]+?(?:^|\s|<br>)[bB][\.\)]/i.test(qContent);
            let hasDots = /([\.…_·]\s*){3,}/.test(qContent);
            let isAnsTF = explicitAns && /^(đúng|sai)[^\w]*$/i.test(explicitAns.trim());
            let isOptsTF = /(?:^|\s|<br>)[aA][\.\)]\s*Đúng\s*(?:^|\s|<br>)[bB][\.\)]\s*Sai/i.test(qContent);

            if (isAnsTF || isOptsTF) { finalType = 'tf'; } 
            else if (hasABC) { finalType = 'single'; } 
            else if (hasDots) { finalType = 'fill'; }

            let ans = explicitAns;
            let optA = '', optB = '', optC = '', optD = ''; 

            if (finalType === 'tf') {
                ans = explicitAns.replace(/\./g, '').trim();
                qContent = qContent.replace(/(?:^|\s|<br>)[aA][\.\)]\s*Đúng\s*(?:^|\s|<br>)[bB][\.\)]\s*Sai[\s\S]*/i, '').trim();
            } 
            else if (finalType === 'fill') {
                qContent = cleanFillBlanks(qContent);
                ans = explicitAns.replace(/(?:^|\s|<br>|;|,)+[a-zA-Z][\.\:\)]\s+/gi, ' | ').replace(/^[\s\|]+/, '').replace(/\|[\s\|]*$/, '').trim();
            } 
            else if (finalType === 'single') {
                let ansLetter = explicitAns.match(/^[A-D]/i) ? explicitAns.match(/^[A-D]/i)[0].toUpperCase() : (boldIndex < boldMatches.length ? boldMatches[boldIndex++][1].toUpperCase() : "");
                optA = (qContent.match(/(?:^|\s|<br>)[aA][\.\)]\s+([\s\S]*?)(?=(?:^|\s|<br>)[bB][\.\)]|$)/) || [])[1] || '';
                optB = (qContent.match(/(?:^|\s|<br>)[bB][\.\)]\s+([\s\S]*?)(?=(?:^|\s|<br>)[cC][\.\)]|$)/) || [])[1] || '';
                optC = (qContent.match(/(?:^|\s|<br>)[cC][\.\)]\s+([\s\S]*?)(?=(?:^|\s|<br>)[dD][\.\)]|$)/) || [])[1] || '';
                optD = (qContent.match(/(?:^|\s|<br>)[dD][\.\)]\s+([\s\S]*?)(?=(?:$))/i) || [])[1] || '';
                ans = (ansLetter==='A')?optA : (ansLetter==='B')?optB : (ansLetter==='C')?optC : (ansLetter==='D')?optD : explicitAns;
                
                let firstOptIndex = qContent.search(/(?:^|\s|<br>)[aA][\.\)]/i);
                if (firstOptIndex !== -1) { qContent = qContent.substring(0, firstOptIndex).trim(); }
            }

            // 🌟 SỬ DỤNG BÀI/TÊN BÀI ĐÃ TRACK ĐƯỢC TỪ WORD VÀO ĐÂY
            targetArray.push({
                lesson: pendingLessonID, 
                type: finalType, level: currentLevel, q: formatQuestionText(qContent),
                opta: optA, optb: optB, optc: optC, optd: optD, a: ans, answer: ans, hint: '', 
                lessonname: pendingLessonName, 
                image: multiLink, multimedia: multiLink, original_q: block
            });

            // Nếu câu này kết thúc bằng 1 Header mới, lưu nó lại cho câu tiếp theo
            if (trailingHeaders) {
                if (/Mức\s*(\d+)/i.test(trailingHeaders)) pendingLevel = parseInt(trailingHeaders.match(/Mức\s*(\d+)/i)[1]);
                if (/CÂU HỎI ĐIỀN KHUYẾT/i.test(trailingHeaders)) pendingType = 'fill';
                else if (/CÂU HỎI ĐÚNG SAI/i.test(trailingHeaders)) pendingType = 'tf';
                else if (/CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM/i.test(trailingHeaders)) pendingType = 'single';
            }
        });
    };

    // --- 🚀 HÀM XỬ LÝ EXCEL ---
    const processExcelStream = (targetArray) => {
        let excelLines = rawText.split(/\r?\n/); let tempRow = "";
        excelLines.forEach(line => {
            if (line.includes('\t')) { 
                if (tempRow) parseExcelRow(tempRow, targetArray); 
                tempRow = line; 
            } else if (tempRow) tempRow += " " + line.trim();
        });
        if (tempRow) parseExcelRow(tempRow, targetArray);
    };

    const parseExcelRow = (rowStr, targetArray) => {
        let cols = rowStr.split('\t'); if (cols.length < 4) return;
        let rawType = cols[1] ? cols[1].trim().toLowerCase() : 'single'; let l_type = 'single';
        if (rawType === 'tf' || rawType.includes('true_false') || rawType.includes('đúng sai')) l_type = 'tf';
        else if (rawType === 'fill' || rawType.includes('điền khuyết')) l_type = 'fill';
        
        // 🌟 ƯU TIÊN: Nếu cột 0 (Số bài) và cột 10 (Tên bài) trong Excel CÓ CHỮ, thì dùng nó. 
        // Bằng không mới dùng biến default (Mặc định).
        let parsedLessonID = (cols[0] && cols[0].trim() !== "") ? cols[0].trim() : defaultLessonID;
        let parsedLessonName = (cols[10] && cols[10].trim() !== "") ? cols[10].trim() : defaultLessonName;

        targetArray.push({
            lesson: parsedLessonID, 
            type: l_type, level: parseInt(cols[2]) || 1, q: cols[3] ? cols[3].trim() : '', 
            opta: cols[4] ? cols[4].trim() : '', optb: cols[5] ? cols[5].trim() : '', optc: cols[6] ? cols[6].trim() : '', optd: cols[7] ? cols[7].trim() : '',
            a: cols[8] ? cols[8].trim() : '', answer: cols[8] ? cols[8].trim() : '', hint: cols[9] ? cols[9].trim() : '', 
            lessonname: parsedLessonName, 
            image: cols[11] ? cols[11].trim() : '', multimedia: cols[11] ? cols[11].trim() : '', original_q: cols[3] ? cols[3].trim() : ''
        });
    };

    let models = [
        { id: 'excel', name: 'Bảng tính Excel', data: [], score: 0 },
        { id: 'inline', name: 'Word (Đề Hỗn hợp / Tại chỗ)', data: [], score: 0 },
        { id: 'appendix', name: 'Word (Đề Hỗn hợp / Phụ lục)', data: [], score: 0 }
    ];

    processExcelStream(models[0].data);
    processWordStream('inline', models[1].data);
    
    let appendixMap = {}; 
    let appMatch = rawText.match(/(?:^|\n)(?:ĐÁP\s+ÁN|PHỤ\s+LỤC)[\s\S]*/i);
    if (appMatch) {
        let ansRegex = /(?:Câu|Bài)\s+(\d+)[*]*\.\s*([\s\S]*?)(?=\s+(?:Câu|Bài)\s+\d|$)/gi; 
        let m; while ((m = ansRegex.exec(appMatch[0])) !== null) appendixMap[m[1]] = m[2].trim();
    }
    processWordStream('appendix', models[2].data, appendixMap);

    models.forEach(model => {
        model.data.forEach(q => {
            if (q.q && q.q.length > 5) model.score += 10; 
            if (q.a && q.a.length > 0) model.score += 15; 
            
            if (q.type === 'single') {
                let optsCount = (q.opta?1:0) + (q.optb?1:0) + (q.optc?1:0) + (q.optd?1:0);
                if (optsCount === 4) model.score += 20; 
                else if (optsCount > 0) model.score += 5 * optsCount;
            } else if (q.type === 'tf') {
                model.score += 10;
            } else if (q.type === 'fill') {
                if (q.q.includes('[...]')) model.score += 15;
            }
        });

        if (model.id === 'excel' && !rawText.includes('\t')) model.score -= 2000;
        if (model.id === 'appendix' && Object.keys(appendixMap).length === 0) model.score -= 500;
    });

    let winner = null;
    if (selectedStream !== 'auto') {
        winner = models.find(m => m.id === selectedStream);
    } else {
        winner = models.reduce((prev, current) => (prev.score > current.score) ? prev : current);
    }

    if (!winner || winner.score <= 0 || winner.data.length === 0) {
        show_toast("⚠️ Dữ liệu văn bản quá rắc rối! Không thể tìm thấy cấu trúc hợp lệ.", true);
        window.bulk_parsed_questions = [];
        document.getElementById('auto_detect_msg').innerHTML = `<i class="bi bi-exclamation-triangle text-danger me-1"></i> AI Thất bại: Không nhận diện được cấu trúc.`;
    } else {
        window.bulk_parsed_questions = winner.data;
        let modeMsg = selectedStream === 'auto' ? `✨ AI Hỗn hợp: Áp dụng <b class="text-warning">${winner.name}</b>` : `✅ Bóc tách thủ công: <b class="text-info">${winner.name}</b>`;
        document.getElementById('auto_detect_msg').innerHTML = modeMsg;
        show_toast(`Đã bóc tách thành công ${winner.data.length} câu hỏi!`);
    }

    if (typeof window.render_bulk_preview === 'function') window.render_bulk_preview();
};

function processExcelRow(rowStr, forceLessonID, forceLessonName) {
    let cols = rowStr.split('\t'); if (cols.length < 4) return;
    let rawType = cols[1] ? cols[1].trim().toLowerCase() : 'single'; let l_type = 'single';
    if (rawType === 'tf' || rawType.includes('true_false') || rawType.includes('đúng sai')) l_type = 'tf';
    else if (rawType === 'fill' || rawType.includes('điền khuyết')) l_type = 'fill';
    
    window.bulk_parsed_questions.push({
        lesson: forceLessonID, type: l_type, level: parseInt(cols[2]) || 1,
        q: cols[3] ? cols[3].trim() : '', opta: cols[4] ? cols[4].trim() : '', optb: cols[5] ? cols[5].trim() : '', optc: cols[6] ? cols[6].trim() : '', optd: cols[7] ? cols[7].trim() : '',
        a: cols[8] ? cols[8].trim() : '', answer: cols[8] ? cols[8].trim() : '', hint: cols[9] ? cols[9].trim() : '', lessonname: forceLessonName, 
        image: cols[11] ? cols[11].trim() : '', multimedia: cols[11] ? cols[11].trim() : '', original_q: cols[3] ? cols[3].trim() : ''
    });
}