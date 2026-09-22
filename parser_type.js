// =========================================================================
// 🧩 GIAO DIỆN NHẬP THEO TỪNG LOẠI CÂU (CHUYÊN BIỆT HÓA MODULE)
// =========================================================================
window.close_type_import_modal = function() {
    document.body.style.overflow = ''; 
    let modal = document.getElementById('type_import_modal');
    if(modal) modal.remove();
};

window.open_import_by_type_modal = function() {
    document.body.style.overflow = 'hidden'; 
    
    let modalHtml = `
    <div id="type_import_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(15, 23, 42, 0.85); z-index: 27000; backdrop-filter: blur(15px);">
        <style>
            .glass-modal { background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); backdrop-filter: blur(25px); }
            .glass-tabs { background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 3px; }
            .glass-tab-label { color: rgba(255,255,255,0.7); border-radius: 6px; font-size: 0.85rem; padding: 6px 12px; white-space: nowrap; transition: all 0.2s; cursor: pointer; font-weight: 500; }
            
            /* Tô màu riêng cho từng loại Tab */
            .glass-tab-input[value="auto"]:checked + .glass-tab-label { background: rgba(255,255,255,0.2); color: #fff; font-weight: bold; border: 1px solid rgba(255,255,255,0.4); }
            .glass-tab-input[value="single"]:checked + .glass-tab-label { background: rgba(56,189,248,0.2); color: #38bdf8; font-weight: bold; border: 1px solid #38bdf8; }
            .glass-tab-input[value="tf"]:checked + .glass-tab-label { background: rgba(74,222,128,0.2); color: #4ade80; font-weight: bold; border: 1px solid #4ade80; }
            .glass-tab-input[value="fill"]:checked + .glass-tab-label { background: rgba(250,204,21,0.2); color: #facc15; font-weight: bold; border: 1px solid #facc15; }
            
            .glass-textarea { background: rgba(0,0,0,0.2) !important; border: 1px solid rgba(255,255,255,0.08) !important; color: #fff !important; border-radius: 10px; resize: none; font-size: 0.95rem; line-height: 1.6; }
            .glass-textarea:focus { border-color: rgba(56, 189, 248, 0.5) !important; box-shadow: inset 0 2px 10px rgba(0,0,0,0.3) !important; outline: none; }
            
            .toggle-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; border-radius: 6px; font-size: 0.75rem; padding: 4px 10px; cursor: pointer; transition: 0.2s; font-weight: 500; }
            .toggle-btn.active { background: rgba(56,189,248,0.2); color: #fff; border-color: #38bdf8; }
            .toggle-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
        </style>

        <div class="glass-modal p-0 d-flex flex-column m-2" style="width: 98vw; max-width: 1900px; height: 96vh;">
            <div class="d-flex justify-content-between align-items-center p-2 px-3 border-bottom flex-shrink-0" style="border-color: rgba(255,255,255,0.1) !important; background: rgba(0,0,0,0.2); border-radius: 16px 16px 0 0;">
                <h6 class="fw-bold text-white m-0" style="letter-spacing: 0.5px;"><i class="bi bi-layers-half text-info me-2"></i> NHẬP THEO LOẠI CÂU (MODULE CHUYÊN BIỆT)</h6>
                <button class="btn-close btn-close-white opacity-75 hover-opacity-100" onclick="close_type_import_modal()"></button>
            </div>
            
            <div class="d-flex flex-column flex-grow-1 overflow-hidden p-2">
                <div id="bulk_input_section" class="d-flex flex-column mb-2" style="height: 40%; min-height: 250px;">
                    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        
                        <div class="glass-tabs d-flex">
                            <div class="text-center pe-1 border-end border-secondary border-opacity-50">
                                <input type="radio" class="btn-check glass-tab-input auto-mode" name="parse_type_stream" id="tstream_auto" value="auto" checked>
                                <label class="glass-tab-label m-0" for="tstream_auto"><i class="bi bi-stars me-1"></i>Auto Detect</label>
                            </div>
                            <div class="text-center ps-1">
                                <input type="radio" class="btn-check glass-tab-input" name="parse_type_stream" id="tstream_single" value="single">
                                <label class="glass-tab-label m-0" for="tstream_single"><i class="bi bi-ui-radios me-1"></i>Trắc nghiệm</label>
                            </div>
                            <div class="text-center px-1">
                                <input type="radio" class="btn-check glass-tab-input" name="parse_type_stream" id="tstream_tf" value="tf">
                                <label class="glass-tab-label m-0" for="tstream_tf"><i class="bi bi-check2-square me-1"></i>Đúng / Sai</label>
                            </div>
                            <div class="text-center">
                                <input type="radio" class="btn-check glass-tab-input" name="parse_type_stream" id="tstream_fill" value="fill">
                                <label class="glass-tab-label m-0" for="tstream_fill"><i class="bi bi-input-cursor-text me-1"></i>Điền khuyết</label>
                            </div>
                        </div>
                        
                        <div class="d-flex align-items-center gap-1 flex-wrap" id="col_toggles_container" style="opacity: 0.5; pointer-events: none;">
                            <span class="text-info small fw-bold me-1"><i class="bi bi-eye"></i> Ẩn/hiện:</span>
                            <div class="toggle-btn active" onclick="toggle_table_col(2, this)">Bài</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(4, this)">Dạng</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(6, this)">Nội dung</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(7, this)">Lựa chọn</div>
                            <div class="toggle-btn active" onclick="toggle_table_col(8, this)">Đáp án</div>
                        </div>

                        <button class="btn btn-sm text-white fw-bold shadow px-4 py-2" style="border-radius: 8px; background: linear-gradient(135deg, #0ea5e9, #2563eb); border: none; font-size: 0.9rem;" onclick="process_type_data()">
                            <i class="bi bi-funnel-fill text-warning me-1"></i> BÓC TÁCH THEO LOẠI
                        </button>
                        <button type="button" class="btn btn-sm btn-warning rounded-circle shadow p-0 d-flex align-items-center justify-content-center" onmousedown="event.preventDefault(); window.make_vocab_tag();" title="Magic Vocab: Tự động tra IPA & Dịch nghĩa" style="width: 28px; height: 28px; border: 1px solid #f59e0b; font-size: 1.1rem; flex-shrink: 0;">
                                🪄
                            </button>
                    </div>

                    <textarea id="type_input_text" onpaste="window.bulk_html_paste_data = (event.clipboardData || window.clipboardData).getData('text/html') || '';" class="form-control glass-textarea custom-scrollbar flex-grow-1 shadow-sm p-3" 
                        placeholder="Dán văn bản vào đây. Nếu chọn 'Auto Detect', hệ thống tự nhận diện. Nếu chọn 'Trắc nghiệm', hệ thống ép toàn bộ thành Trắc nghiệm..."></textarea>
                </div>

                <div id="bulk_preview_area" class="d-flex flex-column flex-grow-1 overflow-hidden rounded" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
                    <div class="d-flex flex-column justify-content-center align-items-center h-100 text-white-50 thin-font">
                        <i class="bi bi-boxes opacity-25 mb-2" style="font-size: 3rem;"></i>
                        <span>Bảng kết quả bóc tách chuyên biệt sẽ hiển thị tại đây.</span>
                    </div>
                </div>

            </div>

            <div class="d-flex justify-content-between align-items-center p-2 border-top flex-shrink-0" style="border-color: rgba(255,255,255,0.1) !important;">
                <div class="small text-info ms-2 fw-bold" id="type_detect_msg"><i class="bi bi-info-circle me-1"></i> Chọn Loại Câu ở trên cùng và bấm Bóc Tách.</div>
                <button id="btn_save_bulk" class="btn btn-sm btn-success fw-bold px-4 disabled" style="border-radius: 6px; font-size: 0.9rem;" onclick="confirm_save_bulk()">
                    <i class="bi bi-cloud-arrow-up-fill me-1"></i> LƯU VÀO NGÂN HÀNG
                </button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setTimeout(() => document.getElementById('type_input_text').focus(), 150);
};

// =========================================================================
// 🎯 HÀM LÕI BÓC TÁCH HOÀN THIỆN 100%: KIẾN TRÚC 9 MODULE SIÊU CẤP
// =========================================================================
window.process_type_data = function() {
    let rawText = document.getElementById('type_input_text').value.trim();
    if (!rawText) return show_toast("⚠️ Vui lòng dán dữ liệu vào ô trống bên trái trước khi bóc tách!", true);
    
    let forcedType = document.querySelector('input[name="parse_type_stream"]:checked').value;
    
    let currentLessonID = (typeof selected_lessons_text !== 'undefined' && selected_lessons_text) ? selected_lessons_text : "1";
    let currentLessonName = document.getElementById('new_lesson_name')?.value || "";
    let activeSubj = window.current_subject || window.temp_subject_key || "";
    if (!currentLessonName && activeSubj && window.lessonNames && window.lessonNames[activeSubj]) {
        currentLessonName = window.lessonNames[activeSubj][currentLessonID] || "";
    }

    let htmlData = window.bulk_html_paste_data || "";
    let styleRegex = /<(?:b|strong|i|em|u|mark|span[^>]*style=["'][^"']*(?:font-weight\s*:\s*(?:bold|700)|font-style\s*:\s*italic|text-decoration\s*:\s*underline|color:[^"']*)["'])[^>]*>(?:<[^>]+>|\s)*([A-D])[\.\)]/gi;
    let boldMatches = [...htmlData.matchAll(styleRegex)];
    let boldIndex = 0;

    const formatQuestionText = (text) => text.replace(/^(?:Câu|Bài)?\s*\d+[\.\:\s\*]+/i, '').replace(/<n>/gi, '').trim();
    const extractMultimedia = (text) => {
        let mediaLink = ""; let mediaMatch = text.match(/\[(?:Media|Multimedia):\s*(https?:\/\/[^\]]+)\]/i);
        if (mediaMatch) { mediaLink = mediaMatch[1].trim(); text = text.replace(mediaMatch[0], '').trim(); }
        return { cleanText: text, link: mediaLink };
    };

    const cleanFillBlanks = (text) => {
        // Cán phẳng mọi thể loại .....(A)….. hay A...............
        let res = text.replace(/[\.…_·•]{2,}/g, ' ___ ')
                      .replace(/(?:^|[\s\t\n])(?:<br>)?[\(\[]?[A-Z0-9][\)\]]?[\.\:]?\s*___/gi, ' ___ ') 
                      .replace(/___\s*[\(\[]?[A-Z0-9][\)\]]?[\.\:]?(?=\s|$|<br>)/gi, ' ___ ')
                      .replace(/___/g, '[...]')
                      .replace(/[\[\(]\s*\[\.\.\.\]\s*[\]\)]/g, '[...]')
                      .replace(/(?:\s*\[\.\.\.\]\s*){2,}/g, ' [...] ');
        return res.replace(/\s+/g, ' ').trim();
    };

    // --- BỘ LỌC RÁC TOÀN CỤC ---
    const clean_noise = (text) => {
        let lines = text.split(/\r?\n/); let cleaned = [];
        for (let l of lines) {
            let lt = l.trim();
            if (/^(?:Trang|Page)\s*\d+/i.test(lt)) continue;
            if (/^Mã đề(?:\s*thi)?\s*\d+/i.test(lt)) continue;
            if (/^Theo\s+LOẠI\s+câu\s+hỏi/i.test(lt)) continue; // Lọc tiêu đề nhiễu
            if (lt.length < 2 && !/^[A-D]$/i.test(lt) && !/^\d+$/.test(lt) && !lt.includes('\t')) continue;
            cleaned.push(lt);
        }
        return cleaned.join('\n');
    };
    rawText = clean_noise(rawText);

    // 🌟 PHÂN LUỒNG HYBRID BẰNG STATE MACHINE (CHỐNG NHẦM DẤU TAB TRONG WORD)
    let excelRows = []; let wordLines = [];
    let currentExcelRow = ""; let inExcelMode = false;
    
    let lines = rawText.split(/\r?\n/);
    for(let line of lines) {
        let cols = line.split('\t');
        // Ký hiệu độc quyền của Excel: Có ít nhất 4 cột VÀ cột số 2 chứa loại câu chuẩn
        let isExcelHeader = cols.length >= 4 && /^(single|mcq|tf|true_false|đúng sai|fill|điền khuyết)$/i.test((cols[1]||'').trim());
        
        if (isExcelHeader) {
            if (currentExcelRow) excelRows.push(currentExcelRow);
            currentExcelRow = line;
            inExcelMode = true;
        } else if (inExcelMode) {
            // Nếu đang trong mode Excel mà gặp "Câu X." không có Tab -> Trả về Word
            if (/^(?:Câu|Bài)\s*\d+/i.test(line) && !line.includes('\t')) {
                if (currentExcelRow) excelRows.push(currentExcelRow);
                currentExcelRow = "";
                inExcelMode = false;
                wordLines.push(line);
            } else {
                currentExcelRow += " \n " + line; // Nối dòng cho Excel bị rớt dòng
            }
        } else {
            wordLines.push(line);
        }
    }
    if (currentExcelRow) excelRows.push(currentExcelRow);

    let results = [];

    // =======================================================================
    // 📊 KHỐI THỰC THI 1: MODULE EXCEL (TN, ĐS, ĐK)
    // =======================================================================
    if (excelRows.length > 0) {
        excelRows.forEach(rowStr => {
            let cols = rowStr.split('\t');
            if (cols[3] && cols[3].toLowerCase().includes('nội dung')) return; // Bỏ qua Header Excel
            
            let type = forcedType;
            if (type === 'auto') {
                let rawT = (cols[1] || '').trim().toLowerCase();
                if (rawT.includes('tf') || rawT.includes('true_false') || rawT.includes('đúng sai')) type = 'tf';
                else if (rawT.includes('fill') || rawT.includes('điền')) type = 'fill';
                else type = 'single';
            }
            
            results.push({
                lesson: (cols[0] && cols[0].trim() !== "") ? cols[0].trim() : currentLessonID, type: type, level: parseInt(cols[2]) || 1,
                q: cols[3] ? cols[3].trim() : '', opta: cols[4] ? cols[4].trim() : '', optb: cols[5] ? cols[5].trim() : '',
                optc: cols[6] ? cols[6].trim() : '', optd: cols[7] ? cols[7].trim() : '', a: cols[8] ? cols[8].trim() : '',
                answer: cols[8] ? cols[8].trim() : '', hint: cols[9] ? cols[9].trim() : '', lessonname: cols[10] ? cols[10].trim() : currentLessonName,
                image: cols[11] ? cols[11].trim() : '', multimedia: cols[11] ? cols[11].trim() : '', original_q: cols[3] ? cols[3].trim() : ''
            });
        });
    }

    // =======================================================================
    // 📝 KHỐI THỰC THI 2: 6 MODULE WORD (AT-PLACE & APPENDIX)
    // =======================================================================
    if (wordLines.length > 0) {
        let wordText = wordLines.join('\n');
        
        // 🌟 XỬ LÝ PHỤ LỤC THÔNG MINH
        let appendixMap = {};
        let appMatch = wordText.match(/(?:^|\n)\s*(?:ĐÁP\s+ÁN|PHỤ\s+LỤC|BẢNG\s+ĐÁP\s+ÁN)[\s\S]*/i);
        if (appMatch) {
            // Lọc bỏ các tiêu đề thừa lọt vào phụ lục
            let cleanAppText = appMatch[0].replace(/(?:\n|\s)*(?:CÂU HỎI ĐIỀN KHUYẾT|CÂU HỎI ĐÚNG SAI|CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM|Mức\s*\d+)/gi, '\n');
            // Bắt đáp án nằm hàng dọc hoặc ngang
            let ansRegex = /(?:(?:Câu|Bài)\s+)?(\d+)[*]*[\.\:\)]\s*([\s\S]*?)(?=\s+(?:(?:Câu|Bài)\s+)?\d+[*]*[\.\:\)]|$)/gi;
            let m; while ((m = ansRegex.exec(cleanAppText)) !== null) {
                appendixMap[m[1]] = m[2].trim();
            }
            wordText = wordText.substring(0, appMatch.index); // Cắt phụ lục ra khỏi đề chính
        }

        // Chẻ câu hỏi bằng biểu thức Lookahead
        let blocks = wordText.split(/\n(?=\s*(?:(?:Câu|Bài)\s*\d+|\d+[\.\)]\s+))/i);
        let pendingLevel = 1; let pendingType = 'single';
        let pendingLessonID = currentLessonID; let pendingLessonName = currentLessonName;

        blocks.forEach(block => {
            let text = block.trim();
            if (!text) return;

            // KIỂM TRA: ĐÂY LÀ TIÊU ĐỀ BÀI HAY CÂU HỎI?
            let isQuestion = /^(?:Câu\s*\d+|^\d+)[*]*[\.\:\)]?\s+/i.test(text) || /(?:^|\n)\s*[A-D][\.\)]\s/i.test(text);
            
            if (!isQuestion) {
                // Nhận diện BÀI 1. ĐẠI CƯƠNG VỀ CẦM MÁU...
                let lessonMatch = text.match(/^Bài\s+(\d+)(?:[\.\:\-]\s*([^\n]*))?/i);
                if (lessonMatch) { 
                    pendingLessonID = lessonMatch[1].trim(); 
                    let lName = lessonMatch[2] ? lessonMatch[2].replace(/(?:\n|\s)*(?:CÂU HỎI ĐIỀN KHUYẾT|CÂU HỎI ĐÚNG SAI|CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM|Mức\s*\d+)[\s\S]*$/i, '').trim() : "";
                    if (lName) pendingLessonName = lName; 
                }
                if (/Mức\s*(\d+)/i.test(text)) pendingLevel = parseInt(text.match(/Mức\s*(\d+)/i)[1]);
                if (/CÂU HỎI ĐIỀN KHUYẾT/i.test(text)) pendingType = 'fill';
                else if (/CÂU HỎI ĐÚNG SAI/i.test(text)) pendingType = 'tf';
                else if (/CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM/i.test(text)) pendingType = 'single';
                return; // Thoát nếu chỉ là tiêu đề phân đoạn
            }

            let trailingHeaders = "";
            let endMatch = text.match(/(?:\n\s*(?:Mức\s*\d+|CÂU HỎI ĐIỀN KHUYẾT|CÂU HỎI ĐÚNG SAI|CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM))+\s*$/i);
            if (endMatch) { trailingHeaders = endMatch[0]; text = text.substring(0, endMatch.index).trim(); }

            let currentLevel = pendingLevel;
            let starsMatch = text.match(/^(?:Câu|Bài)?\s*\d+([*]+)/i);
            if (starsMatch) currentLevel = starsMatch[1].length + 1;

            let qContent = text.replace(/CÂU HỎI ĐIỀN KHUYẾT|CÂU HỎI ĐÚNG SAI|CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM/gi, '').replace(/(?:^|\n)Mức\s*\d+/gi, '').trim();

            let qNumMatch = qContent.match(/^(?:Câu|Bài)?\s*(\d+)/i);
            let qNum = qNumMatch ? qNumMatch[1] : null;

            let explicitAns = "";
            let inlineAnsMatch = qContent.match(/(?:Đáp\s*án|Đ\/A|HD|Giải thích)\s*:?\s*([\s\S]*)$/i);
            if (inlineAnsMatch) {
                explicitAns = inlineAnsMatch[1].trim();
                qContent = qContent.substring(0, inlineAnsMatch.index).trim();
            } else if (qNum && appendixMap[qNum]) {
                explicitAns = appendixMap[qNum];
            }

            let mediaData = extractMultimedia(qContent);
            qContent = mediaData.cleanText; let multiLink = mediaData.link;

            // 🌟 AUTO-DETECT LOẠI CÂU CHO TỪNG CÂU WORD
            let finalType = forcedType;
            if (forcedType === 'auto') {
                let hasABC = /(?:^|[\s\t\n\xA0])[A-D][\.\)]/i.test(qContent);
                let hasDots = /([\.…_·]\s*){3,}/.test(qContent) || qContent.includes('[...]') || qContent.includes('___');
                let isAnsTF = explicitAns && /^(đúng|sai)[^\w]*$/i.test(explicitAns.trim());
                let isOptsTF = /(?:^|[\s\t\n\xA0])[aA][\.\)]\s*Đúng\s*(?:^|[\s\t\n\xA0])[bB][\.\)]\s*Sai/i.test(qContent);
                
                if (pendingType === 'tf' || isAnsTF || isOptsTF) finalType = 'tf';
                else if (pendingType === 'fill' || (hasDots && !hasABC)) finalType = 'fill';
                else if (pendingType === 'single' || hasABC) finalType = 'single';
                else finalType = 'single';
            }

            // 🌟 ÉP KHUÔN BÓC TÁCH
            let ans = explicitAns; let optA = '', optb = '', optc = '', optd = '';
            
            if (finalType === 'tf') {
                ans = explicitAns.replace(/\./g, '').trim();
                qContent = qContent.replace(/(?:^|[\s\t\n\xA0])[aA][\.\)]\s*Đúng\s*(?:^|[\s\t\n\xA0])[bB][\.\)]\s*Sai[\s\S]*/i, '').trim();
            } 
            else if (finalType === 'fill') {
                qContent = cleanFillBlanks(qContent);
                if (ans) {
                    ans = ans.replace(/(?:^|[\s\t\n\xA0]|;|,)+(?:[a-zA-Z]|\d+)[\.\:\)]\s*/gi, ' | ').replace(/;/g, ' | ').replace(/^[\s\|]+/, '').replace(/\|[\s\|]*$/, '').trim();
                }
            } 
            else if (finalType === 'single') {
                // Biểu thức cắt A, B, C, D miễn nhiễm với dính chữ và dấu Tab
                let tempStr = qContent.replace(/(?:^|[\s\t\n\xA0])(A)[\.\)]\s*/gi, '|||A.')
                                      .replace(/(?:^|[\s\t\n\xA0])(B)[\.\)]\s*/gi, '|||B.')
                                      .replace(/(?:^|[\s\t\n\xA0])(C)[\.\)]\s*/gi, '|||C.')
                                      .replace(/(?:^|[\s\t\n\xA0])(D)[\.\)]\s*/gi, '|||D.');
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
            }

            results.push({
                lesson: pendingLessonID, type: finalType, level: currentLevel, q: formatQuestionText(qContent),
                opta: optA, optb: optb, optc: optc, optd: optd, a: ans, answer: ans, hint: '', lessonname: pendingLessonName, 
                image: multiLink, multimedia: multiLink, original_q: block
            });

            // Bảo lưu header nằm ở đuôi câu hỏi cho câu tiếp theo
            if (trailingHeaders && /Mức\s*(\d+)/i.test(trailingHeaders)) pendingLevel = parseInt(trailingHeaders.match(/Mức\s*(\d+)/i)[1]);
            if (trailingHeaders && /CÂU HỎI ĐIỀN KHUYẾT/i.test(trailingHeaders)) pendingType = 'fill';
            if (trailingHeaders && /CÂU HỎI ĐÚNG SAI/i.test(trailingHeaders)) pendingType = 'tf';
            if (trailingHeaders && /CÂU HỎI ĐÚNG NHẤT|TRẮC NGHIỆM/i.test(trailingHeaders)) pendingType = 'single';
        });
    }

    // =======================================================================
    // 🚚 KẾT XUẤT RA BẢNG PREVIEW CỐ ĐỊNH
    // =======================================================================
    window.bulk_parsed_questions = results;

    if (results.length > 0) {
        let typeName = forcedType === 'single' ? 'Trắc nghiệm' : (forcedType === 'tf' ? 'Đúng/Sai' : (forcedType === 'fill' ? 'Điền khuyết' : 'Auto Detect (9 Modules)'));
        let targetMsgEl = document.getElementById('type_detect_msg') || document.getElementById('bulk_detect_msg');
        if (targetMsgEl) targetMsgEl.innerHTML = `✅ Hệ thống đã bóc tách: <b class="text-info">${results.length} câu hỏi hợp lệ!</b>`;
        show_toast(`Bóc tách thành công toàn bộ ${results.length} câu hỏi!`);
        if (typeof window.render_bulk_preview === 'function') window.render_bulk_preview();
    } else {
        show_toast("⚠️ Không tìm thấy dữ liệu hợp lệ.", true);
    }
};

// Hàm quét lại dữ liệu từ Google Sheets
window.refresh_admin_lesson_data = function(btn) {
    let oldHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>...`;
    btn.disabled = true;
    
    google.script.run.withSuccessHandler(function(liveData) {
        let qData = liveData.questions ? liveData.questions : liveData;
        if (qData) window.full_data[current_subject] = qData;
        
        // Lọc lại bài hiện tại và định vị cờ original_q
        questions = window.full_data[current_subject].filter(q => String(q.lesson).trim().toLowerCase() === String(selected_lessons_text).trim().toLowerCase());
        questions.forEach((q, index) => { q.id = index + 1; q.original_q = q.q; });
        
        show_toast("Đã tải dữ liệu mới nhất!");
        render_admin_panel();
    }).withFailureHandler(function(e) {
        show_toast("Lỗi tải dữ liệu!", true);
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }).boc_de_live_drive(current_subject);
};