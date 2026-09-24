// =========================================================================
// HÀM VẼ CÂU HỎI QUIZ (HỖ TRỢ 5 DẠNG CÂU HỎI + HOTSPOT + SẮP XẾP)
// =========================================================================
window.render_quiz = function() {
    if (typeof window.update_progress_bar === 'function') {
        window.update_progress_bar();
    }
    
    inject_dynamic_ui_styles(); 

    let ui_template = '1'; 
    let currentSub = window.current_subject || window.currentSubject || '';
    if (currentSub && typeof subjectConfig !== 'undefined' && subjectConfig[currentSub]) {
        ui_template = subjectConfig[currentSub].ui_template || '1';
    }

    // 🌟 ĐÃ THÊM: Sắp xếp ưu tiên cho Hotspot và Arrange
    const typeOrder = { 
        'single': 1, 'mcq': 1, 
        'true_false': 2, 'tf': 2, 'đúng sai': 2, 
        'fill': 3, 'short': 3, 'điền khuyết': 3,
        'hotspot': 4, 'arrange': 5, 'sắp xếp': 5
    };
    
    questions.sort((a, b) => {
        let tA = a.type ? String(a.type).toLowerCase().trim() : '';
        let tB = b.type ? String(b.type).toLowerCase().trim() : '';
        return (typeOrder[tA] || 99) - (typeOrder[tB] || 99);
    });

    let html = '';
    let last_type = ''; 
    
    const headers = { 
        'single': { title: 'CHỌN CÂU ĐÚNG NHẤT', color: '#38bdf8' }, 
        'mcq': { title: 'CHỌN CÂU ĐÚNG NHẤT', color: '#38bdf8' }, 
        'true_false': { title: 'CÂU HỎI ĐÚNG SAI', color: '#4ade80' }, 
        'tf': { title: 'CÂU HỎI ĐÚNG SAI', color: '#4ade80' }, 
        'đúng sai': { title: 'CÂU HỎI ĐÚNG SAI', color: '#4ade80' },
        'fill': { title: 'CÂU HỎI ĐIỀN KHUYẾT', color: '#facc15' },
        'short': { title: 'CÂU HỎI ĐIỀN KHUYẾT', color: '#facc15' },
        'điền khuyết': { title: 'CÂU HỎI ĐIỀN KHUYẾT', color: '#facc15' },
        'hotspot': { title: 'TÌM VỊ TRÍ TRÊN ẢNH', color: '#f43f5e' }, 
        'arrange': { title: 'SẮP XẾP QUY TRÌNH', color: '#a855f7' }, 
        'sắp xếp': { title: 'SẮP XẾP QUY TRÌNH', color: '#a855f7' }
    };

    const parseVocab = (text) => {
        if (!text) return "";
        return String(text).replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, `<span class="vocab-highlight" onclick="if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 </span>`);
    };

    questions.forEach((q, i) => {
        let currentType = q.type ? String(q.type).toLowerCase().trim() : '';
        
        if (currentType !== last_type) {
            const header = headers[currentType] || { title: 'CÂU HỎI', color: '#38bdf8' };
            html += `<div class="fw-bold mt-0 mb-2 text-center p-2 animate__animated animate__fadeIn" 
                          style="background: transparent !important; border: none !important; box-shadow: none !important; color: ${header.color}; font-size: 1.15rem; letter-spacing: 1px; text-transform: uppercase; text-shadow: 0 0 12px ${header.color}80;">
                          <i class="bi bi-layers-half me-2"></i>${header.title}
                     </div>`;
            last_type = currentType;
        }

        let rawHint = (q.hint !== undefined && q.hint !== null) ? String(q.hint).trim() : "";
        let hasHint = rawHint.length > 0;
        let formattedHint = "";
        if (hasHint) {
            formattedHint = rawHint.replace(/#([^\s.,;!?"'()[\]{}]+)/g, 
                '<mark style="background: rgba(234,179,8,0.2); color: #facc15; padding: 2px 6px; margin: 0 2px; border-radius: 6px; font-weight: bold; border: 1px solid rgba(234,179,8,0.4);">$1</mark>'
            );
            formattedHint = parseVocab(formattedHint);
        }

        let isFillInBlank = (currentType === 'fill' || currentType === 'short' || currentType === 'điền khuyết');
        let questionContent = q.q || "";
        
        if (isFillInBlank) {
            let fillCount = 0;
            questionContent = questionContent.replace(/\[\.\.\.\]/g, () => {
                let cIdx = fillCount++; 
                let inputStyle = ui_template === '2' 
                    ? `width: 45px; background: rgba(20, 184, 166, 0.15); border: 1px solid #2dd4bf; color: #fff; box-shadow: 0 0 10px rgba(45, 212, 191, 0.5); outline: none; border-radius: 6px; padding: 2px;`
                    : `width: 45px; background: rgba(14,165,233,0.15); border: 1px solid #38bdf8; color: #fff; box-shadow: 0 0 10px rgba(56, 189, 248, 0.5); outline: none; border-radius: 6px; padding: 2px;`;
                return `<input type="text" class="mx-1 text-center fw-bold" oninput="this.style.width = ((this.value.length + 1) * 10) + 'px'; set_fill_v2(this, ${i}, ${cIdx})" style="${inputStyle}" placeholder="...">`;
            });
        }

        let hasVocabTag = /\{\{.*::.*::.*\}\}/.test(questionContent);
        questionContent = parseVocab(questionContent);
        let bloomColor = getLevelColor(q.level);
        
        let flagHtml = `<span class="ms-3 text-danger" style="font-size: 1.1rem; cursor: pointer; transition: 0.3s;" onclick="window.open_report_modal(${i})" title="Báo lỗi câu này"><i class="bi bi-flag-fill"></i></span>`;
        let bulbHtml = hasHint ? `<span id="bulb_icon_${i}" class="ms-2 text-warning" style="font-size: 1.2rem; cursor: pointer; display: inline-block; transition: 0.3s;" onclick="this.classList.add('d-none'); document.getElementById('hint_box_${i}').classList.remove('d-none');">💡</span>` : '';
        let toolsHtml = bulbHtml + flagHtml;
        
        let hintHtml = "";
        if (hasHint) {
            hintHtml = `<div id="hint_box_${i}" class="d-none mt-3 p-3 text-start shadow-sm" style="background: rgba(250, 204, 21, 0.1); border-left: 4px solid #facc15; border-radius: 12px; backdrop-filter: blur(5px); cursor: pointer;" onclick="this.classList.add('d-none'); document.getElementById('bulb_icon_${i}').classList.remove('d-none');">
                            <div class="fw-bold mb-2" style="color: #facc15; font-size: 0.85rem; text-transform: uppercase;">💡 Giải thích</div>
                            <div style="font-size: 0.95rem; color: rgba(255,255,255,0.9); line-height: 1.6;">${formattedHint}</div>
                        </div>`;
        }

        let mediaHtml = render_media_for_card(q);
        let optionsHtml = '';

        // 🌟 XỬ LÝ HTML CHO HOTSPOT VÀ SẮP XẾP TẠI ĐÂY
        if (currentType === 'hotspot') {
            let pureImg = "";
            if (q.image) {
                let m = String(q.image).split("|")[0].trim();
                pureImg = m.indexOf("image_")===0 ? `https://lh3.googleusercontent.com/d/${m.replace('image_','')}` : m;
            }
            optionsHtml = `
            <div class="text-center mt-3 w-100">
                <div class="position-relative d-inline-block" style="line-height: 0;">
                    <img src="${pureImg}" class="img-fluid rounded-3" style="cursor:crosshair; border: 1px solid rgba(255,255,255,0.2); max-height: 400px;" onclick="window.set_hotspot_ans(event, ${i}, this)">
                    <div id="hotspot_marker_${i}" class="position-absolute translate-middle d-none" style="width:24px; height:24px; background:radial-gradient(circle, #ef4444 40%, transparent 60%); border:2px solid #fff; border-radius:50%; box-shadow:0 0 10px rgba(239,68,68,0.8); pointer-events:none; z-index:10;"></div>
                </div>
            </div>
            <div class="text-white-50 small mt-2 text-center"><i class="bi bi-hand-index-thumb text-info"></i> Hãy chạm vào vị trí chính xác trên hình ảnh.</div>`;
            mediaHtml = ''; // Ẩn thẻ ảnh mặc định
        }
        else if (currentType === 'clip_listen') {
            // 🌟 ĐÃ FIX: Bảo toàn nguyên vẹn URL của Supabase, chỉ cắt chữ 'clip_' nếu đó là ID Google Drive cũ
            let safeVideoUrl = "";
            if (q.image) {
                safeVideoUrl = String(q.image).trim();
                if (!safeVideoUrl.startsWith('http') && safeVideoUrl.startsWith('clip_')) {
                    safeVideoUrl = safeVideoUrl.replace('clip_', '');
                }
            }
            
            let timeSteps = (q.a || q.answer || "").split("|||");
            let textSteps = (q.q || "").split("|||");
            
            let cards = [];
            for (let j = 0; j < timeSteps.length; j++) {
                let parts = timeSteps[j].trim().split('#');
                if(parts.length > 0) {
                    let times = parts[0].split('|').map(Number);
                    let text = textSteps[j] ? textSteps[j].trim() : "Listen...";
                    cards.push({ id: j, start: times[0], end: times[1], text: text });
                }
            }
            cards.sort(() => 0.5 - Math.random()); 

            let cardsHtml = '';
            cards.forEach((c) => {
                cardsHtml += `
                <div class="audio-card d-inline-flex align-items-center justify-content-center bg-white border border-2 border-secondary rounded-pill px-3 py-1 shadow-sm" data-id="${c.id}" style="transition: all 0.3s; cursor: pointer; min-height: 35px;" onclick="window.play_audio_slice(${i}, ${c.start}, ${c.end})">
                    <div class="fw-bold text-dark user-select-none text-content" style="pointer-events: none; font-size: 0.95rem; line-height: 1.2;">
                        ${c.text}
                    </div>
                </div>`;
            });

            optionsHtml = `
            <style>
                .audio-card-chosen {
                    background-color: #fef08a !important; 
                    border-color: #eab308 !important; 
                    transform: scale(1.05); 
                    box-shadow: 0 4px 12px rgba(234, 179, 8, 0.5) !important;
                    animation: pulseGrab 0.6s infinite alternate;
                }
                @keyframes pulseGrab { 0% { opacity: 1; } 100% { opacity: 0.7; } }
            </style>

            <div class="mt-2 w-100 mx-auto" style="max-width: 650px;" id="clip_listen_main_${i}">
                <div class="position-relative w-100 bg-dark shadow-sm rounded-4 overflow-hidden mb-2" style="aspect-ratio: 16/9; border: 1px solid rgba(255,255,255,0.2);">
                    <div id="clip_loading_${i}" class="d-flex flex-column align-items-center justify-content-center w-100 h-100 position-absolute top-0 start-0 z-2" style="background: rgba(0,0,0,0.8);">
                        <div class="spinner-grow text-warning mb-2"></div>
                        <div class="text-warning small fw-bold">Đang tải phim...</div>
                    </div>
                    <!-- Khung Video có sẵn thanh điều khiển Controls để iPad tự bấm Play -->
                    <video id="student_clip_vid_${i}" controls playsinline webkit-playsinline class="w-100 h-100 object-fit-contain" style="display: none;"></video>
                </div>
                
                <div class="bg-secondary bg-opacity-10 rounded-4 p-3 mb-2 border border-secondary shadow-inner">
                    <div id="sortable_zone_${i}" class="d-flex flex-wrap justify-content-center gap-2">
                        ${cardsHtml}
                    </div>
                </div>
                
                <div id="audio_action_container_${i}">
                    <button class="btn w-100 fw-bold shadow-lg rounded-pill py-2 fs-5" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white;" onclick="window.check_audio_order(${i}, this)">
                        <i class="bi bi-check-circle-fill me-2"></i> KIỂM TRA ĐÁP ÁN
                    </button>
                </div>

                <img src="x" onerror="if(typeof window.init_clip_listen_ui === 'function') window.init_clip_listen_ui(${i}, '${safeVideoUrl}')" style="display:none;">
            </div>`;
            mediaHtml = '';
        }
        else if (currentType === 'arrange' || currentType === 'sắp xếp') {
            let optList = q.opts && q.opts.length > 0 ? q.opts : (q.a ? q.a.split('|') : []);
            optionsHtml = `
            <div class="mt-3" id="arrange_box_${i}">
                <div class="text-white-50 small mb-2"><i class="bi bi-sort-numeric-down text-warning"></i> Chạm vào các bước dưới đây theo đúng thứ tự quy trình:</div>
                <div class="d-flex flex-wrap gap-2 mb-3 align-items-center" id="arrange_result_${i}" style="min-height: 45px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.2);"></div>
                <div class="d-flex flex-column gap-2" id="arrange_pool_${i}">
                    ${optList.map((o, idx) => `<button class="btn text-start p-3 w-100 stat-card-hover" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color:#fff;" onclick="window.select_arrange(this, ${i}, '${String.fromCharCode(65+idx)}')"><span class="badge bg-secondary me-2">${String.fromCharCode(65+idx)}</span> ${o}</button>`).join('')}
                </div>
                <div class="text-end mt-2"><button class="btn btn-sm btn-outline-warning rounded-pill" onclick="window.reset_arrange(${i})"><i class="bi bi-arrow-counterclockwise"></i> Làm lại câu này</button></div>
            </div>`;
        }
        else if (currentType === 'single' || currentType === 'mcq') {
            if (ui_template === '2') {
                optionsHtml = `<div class="mt-2">` + (q.opts ? q.opts.map(o => {
                    let safeVal = encodeURIComponent(o).replace(/'/g, "%27");
                    return `<button class="option-btn w-100 text-start ui2-option-btn shadow-sm mb-3 p-3" onclick="set_ans(this, decodeURIComponent('${safeVal}'), ${i})">${parseVocab(o)}</button>`;
                }).join('') : '') + `</div>`;
            } else if (ui_template === '3') {
                optionsHtml = `<div class="row g-2 mt-2">` + (q.opts ? q.opts.map(o => {
                    let safeVal = encodeURIComponent(o).replace(/'/g, "%27");
                    return `<div class="col-12 col-md-6"><button class="option-btn w-100 h-100 text-start ui3-option-btn p-3" onclick="set_ans(this, decodeURIComponent('${safeVal}'), ${i})">${parseVocab(o)}</button></div>`;
                }).join('') : '') + `</div>`;
            } else {
                optionsHtml = `<div class="mt-3">` + (q.opts ? q.opts.map(o => {
                    let safeVal = encodeURIComponent(o).replace(/'/g, "%27");
                    return `<button class="option-btn w-100 text-start glass-option-btn fw-bold p-3 mb-2" style="border-radius: 14px; font-size: 1rem;" onclick="set_ans(this, decodeURIComponent('${safeVal}'), ${i})">${parseVocab(o)}</button>`;
                }).join('') : '') + `</div>`;
            }
        } 
        else if (currentType === 'true_false' || currentType === 'tf' || currentType === 'đúng sai') {
            if (ui_template === '2') {
                optionsHtml = `<div class="d-flex gap-2 justify-content-center mt-3"><button class="option-btn flex-fill text-center ui2-option-btn fw-bold text-success p-3" onclick="set_ans(this, 'đúng', ${i})">ĐÚNG</button><button class="option-btn flex-fill text-center ui2-option-btn fw-bold text-danger p-3" onclick="set_ans(this, 'sai', ${i})">SAI</button></div>`;
            } else if (ui_template === '3') {
                optionsHtml = `<div class="d-flex gap-3 justify-content-center mt-3"><button class="option-btn flex-fill text-center ui3-option-btn fw-bold text-success p-3" onclick="set_ans(this, 'đúng', ${i})">ĐÚNG</button><button class="option-btn flex-fill text-center ui3-option-btn fw-bold text-danger p-3" onclick="set_ans(this, 'sai', ${i})">SAI</button></div>`;
            } else {
                optionsHtml = `<div class="d-flex gap-3 justify-content-center mt-3"><button class="option-btn flex-fill text-center glass-option-btn fw-bold p-3" onclick="set_ans(this, 'đúng', ${i})" style="color: #4ade80 !important; font-size: 1.1rem; border-radius: 14px;">ĐÚNG</button><button class="option-btn flex-fill text-center glass-option-btn fw-bold p-3" onclick="set_ans(this, 'sai', ${i})" style="color: #f87171 !important; font-size: 1.1rem; border-radius: 14px;">SAI</button></div>`;
            }
        }

        // =================================================================
        // 🛠 LẮP RÁP KHUNG GIAO DIỆN CHUẨN
        // =================================================================
        if (ui_template === '2') {
            let isEnglishSubject = (window.current_subject || '').toLowerCase().includes('tienganh');
            let isEnglishMode = isEnglishSubject || hasVocabTag;
            
            let leftTitle = isEnglishMode ? '<i class="bi bi-translate me-1"></i> NỘI DUNG NGỮ LIỆU' : (currentType==='hotspot'||currentType==='arrange'||currentType==='sắp xếp') ? '<i class="bi bi-joystick me-1"></i> TƯƠNG TÁC LÂM SÀNG' : '<i class="bi bi-clipboard2-pulse me-1"></i> THÔNG TIN LÂM SÀNG';
            let rightTitle = isEnglishMode ? '<i class="bi bi-patch-question me-1"></i> YÊU CẦU & CÂU HỎI' : 'CHỌN ĐÁP ÁN:';

            if (isFillInBlank || currentType==='hotspot' || currentType==='arrange' || currentType==='sắp xếp') {
                html += `<div class="ui2-clinical-container question-card-tracker mb-4 animate__animated animate__fadeInUp" data-q-idx="${i}" style="animation-delay: ${i * 0.03}s">
                            <div class="p-4 ui2-case-panel" style="border-radius: 12px; background: rgba(0,0,0,0.1) !important;">
                                <div class="mb-3 d-flex align-items-center">
                                    <span class="badge text-white me-2" style="background: rgba(20, 184, 166, 0.4); border: 1px solid rgba(20, 184, 166, 0.8); font-size: 0.8rem; padding: 6px 8px;">Câu ${i + 1}</span>
                                    <span class="text-info fw-bold" style="font-size: 0.85rem; letter-spacing: 1px;">${leftTitle}</span>
                                    ${toolsHtml}
                                </div>
                                <div class="fw-bold mb-3" style="font-size: 1.05rem; color: #fff; line-height: 1.6; word-break: break-word;">${questionContent}</div>
                                ${mediaHtml}
                                ${hintHtml}
                                ${optionsHtml}
                            </div>
                         </div>`;
            } else {
                html += `<div class="ui2-clinical-container question-card-tracker mb-4 animate__animated animate__fadeInUp" data-q-idx="${i}" style="animation-delay: ${i * 0.03}s">
                            <div class="row g-0 h-100">
                                <div class="col-12 col-md-7 ui2-case-panel p-4">
                                    <div class="mb-3 d-flex align-items-center">
                                        <span class="badge text-white me-2" style="background: rgba(20, 184, 166, 0.4); border: 1px solid rgba(20, 184, 166, 0.8); font-size: 0.8rem; padding: 6px 8px;">Câu ${i + 1}</span>
                                        <span class="text-info fw-bold" style="font-size: 0.85rem; letter-spacing: 1px;">${leftTitle}</span>
                                        ${toolsHtml}
                                    </div>
                                    <div class="fw-bold mb-3" style="font-size: 1.05rem; color: #fff; line-height: 1.6; word-break: break-word;">${questionContent}</div>
                                    ${mediaHtml}
                                    ${hintHtml}
                                </div>
                                <div class="col-12 col-md-5 p-4 d-flex flex-column justify-content-center" style="background: rgba(255,255,255,0.02); border-left: 1px solid rgba(255,255,255,0.05);">
                                    <div class="mb-3 pb-2 border-bottom border-secondary border-opacity-25">
                                        <h6 class="fw-bold text-uppercase m-0" style="font-size: 0.8rem; color: #2dd4bf;">${rightTitle}</h6>
                                    </div>
                                    ${optionsHtml}
                                </div>
                            </div>
                         </div>`;
            }
        } 
        else if (ui_template === '3') {
            let stageMedia = mediaHtml.trim() !== '' ? `<div class="ui3-image-stage shadow-lg mb-4 mt-2">${mediaHtml}</div>` : '';
            html += `<div class="ui3-lab-container question-card-tracker mb-4 animate__animated animate__fadeInUp" data-q-idx="${i}" style="animation-delay: ${i * 0.03}s">
                        <div class="mb-2">
                            <span class="badge border fw-bold me-2" style="background: rgba(255,255,255,0.05); color: #f59e0b; border-color: #f59e0b !important; font-size: 0.8rem; padding: 6px 8px;">Câu ${i + 1}</span>
                            ${toolsHtml}
                        </div>
                        ${stageMedia}
                        <div class="mb-3 fw-bold" style="font-size: 1.1rem; color: #e2e8f0; line-height: 1.6; word-break: break-word;">
                            ${questionContent}
                        </div>
                        ${hintHtml}
                        ${optionsHtml}
                     </div>`;
        } 
        else {
            html += `<div class="glass-quiz-container question-card-tracker p-3 mb-4 animate__animated animate__fadeInUp" data-q-idx="${i}" style="animation-delay: ${i * 0.03}s">`;
            html += `<div class="mb-3" style="font-size: 1.05rem; color: #fff; line-height: 1.6; word-break: break-word;">
                        <span class="badge border fw-bold me-2" style="background: rgba(255,255,255,0.1); color: ${bloomColor}; border-color: ${bloomColor} !important; font-size: 0.8rem; padding: 6px 8px;">Câu ${i + 1}</span>
                        <span class="fw-bold text-white">${questionContent}</span>
                        ${toolsHtml}
                     </div>`; 
            html += hintHtml;
            html += mediaHtml;
            html += optionsHtml;
            html += `</div>`; 
        }
    });
    
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('quiz_area').innerHTML = html;

    let quizArea = document.getElementById('quiz_area');
    if (quizArea && window.MathJax) { 
        setTimeout(function() {
            MathJax.typesetPromise([quizArea]).catch(function (err) {
                console.log('MathJax error: ', err.message);
            });
        }, 50); 
    }

    setTimeout(() => {
        if(typeof window.init_question_time_tracker === 'function') {
            window.init_question_time_tracker();
        }
    }, 500);
};
    // =========================================================================
// 🚀 GIAO DIỆN LÀM BÀI QUIZ (TÍCH HỢP 3 MẪU UI ĐỘNG - DYNAMIC TEMPLATES)
// =========================================================================

// Hàm phụ: Nhúng CSS cho 2 giao diện mới (Chỉ chạy 1 lần)
function inject_dynamic_ui_styles() {
    if (document.getElementById('dynamic_ui_styles')) return;
    let style = document.createElement('style');
    style.id = 'dynamic_ui_styles';
    style.innerHTML = `
        /* 🟢 UI 2: CHUYÊN SÂU (CLINICAL CASE) - Kính mờ Glassmorphism Tone Teal */
        .ui2-clinical-container { background: rgba(15, 118, 110, 0.15); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-radius: 16px; border: 1px solid rgba(20, 184, 166, 0.3); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); overflow: hidden; color: #fff; }
        .ui2-case-panel { background: rgba(0, 0, 0, 0.2); padding: 25px; height: 100%; border-right: 1px solid rgba(255, 255, 255, 0.1); }
        
        /* 🌟 Nút đáp án UI 2: Chuyển sang Glassmorphism */
        .ui2-option-btn { background: rgba(255, 255, 255, 0.05) !important; border: 1px solid rgba(20, 184, 166, 0.4) !important; color: #fff !important; border-radius: 8px; transition: 0.2s; padding: 12px 15px; width: 100%; text-align: left; font-weight: 500 !important; }
        .ui2-option-btn:hover { border-color: #2dd4bf !important; background: rgba(20, 184, 166, 0.2) !important; color: #fff !important; }
        .ui2-option-btn.selected { background: rgba(20, 184, 166, 0.6) !important; color: #ffffff !important; border-color: #2dd4bf !important; }
        
        /* 🟠 UI 3: THỰC HÀNH (DARK LAB) - Nền đen sâu, viền Cam hổ phách */
        .ui3-lab-container { background: #0f172a; border-radius: 16px; border: 1px solid #334155; box-shadow: 0 20px 50px rgba(0,0,0,0.5); padding: 25px; color: #e2e8f0; border-top: 5px solid #f59e0b; }
        .ui3-image-stage { background: #000; border-radius: 12px; padding: 15px; text-align: center; border: 1px solid #1e293b; }
        
        /* Đảm bảo UI 3 cũng không bị dính CSS cũ */
        .ui3-option-btn { background: #1e293b !important; border: 1px solid #475569 !important; color: #cbd5e1 !important; border-radius: 10px; transition: all 0.2s; padding: 12px 15px; width: 100%; text-align: left; font-weight: 500 !important; }
        .ui3-option-btn:hover { background: #334155 !important; border-color: #f59e0b !important; color: #ffffff !important; }
        .ui3-option-btn.selected { background: rgba(245, 158, 11, 0.2) !important; border-color: #f59e0b !important; color: #facc15 !important; }

        /* 🌟 FIX: ĐÃ ÉP QUYỀN LỰC CAO NHẤT CHO MÀU XANH/ĐỎ TRÊN MỌI GIAO DIỆN */
        .ui2-option-btn.correct, .ui3-option-btn.correct, .glass-option-btn.correct, .correct { background: rgba(34, 197, 94, 0.2) !important; border-color: #4ade80 !important; color: #4ade80 !important; }
        .ui2-option-btn.wrong, .ui3-option-btn.wrong, .glass-option-btn.wrong, .wrong { background: rgba(239, 68, 68, 0.2) !important; border-color: #f87171 !important; color: #f87171 !important; }

        @media (max-width: 768px) {
            .ui2-case-panel { border-right: none; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
            .ui2-clinical-container .border-start { border-left: none !important; }
        }
    `;
    document.head.appendChild(style);
}
// =========================================================================
// 🎯 HÀM CHỌN ĐÁP ÁN (TÍCH HỢP HỆ THỐNG COMBO, TÚI ĐỒ & ÂM THANH KILLSTREAK)
// =========================================================================
// =========================================================================
// 🎯 HÀM CHỌN ĐÁP ÁN (TÍCH HỢP HỆ THỐNG COMBO, TÚI ĐỒ & ÂM THANH KILLSTREAK)
// =========================================================================
window.set_ans = function(btn, val, idx) {
    // 🌟 CHẾ ĐỘ THI THẬT: Cho phép đổi đáp án thoải mái, ẩn báo đúng/sai
    if (window.is_study_mode === false) {
        questions[idx].done = true; 
        questions[idx].ans_user = val;

        if (typeof window.update_progress_bar === 'function') window.update_progress_bar(idx, window.questions.length);
        
        let container = btn.closest('.glass-quiz-container, .ui2-clinical-container, .ui3-lab-container');
        if (!container) return;
        let btns = container.querySelectorAll('.option-btn, .glass-option-btn, .ui1-option-btn, .ui2-option-btn, .ui3-option-btn');
        
        // Gỡ bỏ viền sáng của nút cũ, sáng viền nút mới
        btns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected'); 
        
        if (typeof check_complete === 'function') check_complete();
        if (typeof window.auto_save_exam_draft === 'function') window.auto_save_exam_draft();
        return; // ⛔ THOÁT LUÔN: Không chạy xuống đoạn chấm điểm và rớt quà bên dưới
    }

    // =======================================================
    // 🌟 CHẾ ĐỘ ÔN TẬP: Khóa nút, báo đúng sai ngay lập tức
    // =======================================================
    if (questions[idx].done) return; 
    
    questions[idx].done = true; 
    questions[idx].ans_user = val;

    if (typeof window.update_progress_bar === 'function') window.update_progress_bar(idx, window.questions.length);
    
    let container = btn.closest('.glass-quiz-container, .ui2-clinical-container, .ui3-lab-container');
    if (!container) return;
    let btns = container.querySelectorAll('.option-btn, .glass-option-btn, .ui1-option-btn, .ui2-option-btn, .ui3-option-btn');
    
    const make_clean = (str) => String(str||"").replace(/^[A-D][\.\)]\s*/i, '').replace(/\{\{(.*?)::.*?::.*?\}\}/g, '$1').replace(/<[^>]*>/g, '').toLowerCase().normalize('NFC').replace(/\\/g, '').replace(/\s+/g, '').replace(/["“”]/g, '');

    let raw_ans = (questions[idx].a || questions[idx].answer || "").trim();
    let is_letter_ans = /^[A-D]$/i.test(raw_ans); 
    let letter_ans = is_letter_ans ? raw_ans.toLowerCase() : "";
    let correct_ans = make_clean(raw_ans);
    
    let user_is_correct = false; 

    btns.forEach((b, opt_index) => {
        let b_val = "";
        let onclick_attr = b.getAttribute('onclick') || "";
        let match = onclick_attr.match(/set_ans\([^,]+,\s*(?:decodeURIComponent\()?['"]([^'"]+)['"]/);
        if (match) { b_val = match[1]; try { b_val = decodeURIComponent(b_val); } catch(e) {} } else { b_val = b.innerText; }

        let is_match = false;
        if (is_letter_ans) {
            if (letter_ans === ['a','b','c','d'][opt_index]) is_match = true;
            else if (new RegExp("^" + letter_ans + "[\\.\\)]", "i").test(b_val.trim())) is_match = true;
        } else {
            if (make_clean(b_val) === correct_ans && make_clean(b_val) !== "") is_match = true; 
        }
        
        b.classList.remove('selected', 'selected-mock');
        
        if (is_match) { 
            b.classList.add('correct'); 
            if (b === btn) user_is_correct = true; 
        } else if (b === btn) { 
            b.classList.add('wrong'); 
        }
        b.style.pointerEvents = 'none'; // Khóa nút
    });

    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let colKey = 'mcq_col_' + (window.current_student_id || 'guest');
    let inventory = parseInt(localStorage.getItem(invKey)) || 0;

    if (user_is_correct) {
        if (typeof window.play_sound === 'function') window.play_sound('correct');

        if (window.is_eligible_for_reward !== false) {
            window.current_live_streak = (window.current_live_streak || 0) + 1;
            let giftAdd = 0; let itemDrop = "";
            let s = window.current_live_streak;
            
            if (s === 3) { giftAdd = 1; itemDrop = "10 Triệu BP 💰"; if (typeof window.speak_voice === 'function') window.speak_voice("Triple Kill!"); }
            else if (s === 5) { giftAdd = 2; itemDrop = "Giáp 3 Mũ 3 🛡️"; if (typeof window.speak_voice === 'function') window.speak_voice("Mega Kill!"); }
            else if (s === 7) { giftAdd = 2; itemDrop = "Vé Quay Gacha 🎟️"; if (typeof window.speak_voice === 'function') window.speak_voice("Unstoppable!"); }
            else if (s === 10) { giftAdd = 3; itemDrop = "Thẻ Nâng Cấp +5 🌟"; if (typeof window.speak_voice === 'function') window.speak_voice("Godlike!"); }
            else if (s === 12) { giftAdd = 3; itemDrop = "Vé Quay Gacha 🎟️"; if (typeof window.speak_voice === 'function') window.speak_voice("Legendary!"); }
            else if (s === 15) { giftAdd = 4; itemDrop = "Thẻ Đổi Tên 🏷️"; }
            else if (s === 20) { giftAdd = 5; itemDrop = "Thẻ Tạo Phòng 🚪"; }
            else if (s === 25) { giftAdd = 5; itemDrop = "Vé Quay Gacha 🎟️"; }
            else if (s === 30) { giftAdd = 6; itemDrop = "Booyah Pass 🎫"; }
            else if (s === 40) { giftAdd = 8; itemDrop = "Thẻ ICON +8 🏆"; }
            else if (s === 50) { giftAdd = 10; itemDrop = "Gói Cầu Thủ Gullit 👑"; }

            if (giftAdd > 0) {
                if (typeof window.play_sound === 'function') window.play_sound('reward'); 
                inventory += giftAdd; localStorage.setItem(invKey, inventory);
                let colList = []; try { colList = JSON.parse(localStorage.getItem(colKey) || "[]"); } catch(e) {}
                colList.push(itemDrop); localStorage.setItem(colKey, JSON.stringify(colList));
                if (typeof google !== 'undefined') google.script.run.syncUserInventory(window.current_student_id, inventory, JSON.stringify(colList));

                let invEl = document.getElementById('dashboard_inventory_count'); if (invEl) invEl.innerText = inventory;
                let miniCountStr = document.getElementById('mini_inventory_count'); if (miniCountStr) miniCountStr.innerText = inventory;
                
                let badge = document.getElementById('mini_inventory_badge');
                if (badge) { badge.classList.remove('animate__tada'); void badge.offsetWidth; badge.classList.add('animate__animated', 'animate__tada'); }

                let iconMatch = itemDrop.match(/([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u2B00-\u2BFF])/);
                let itemIcon = iconMatch ? iconMatch[0] : "🎁"; let itemNameOnly = itemDrop.replace(itemIcon, '').trim();

                let overlayId = 'combo_anim_' + Date.now();
                let html = `
                <div id="${overlayId}" class="position-fixed d-flex flex-column align-items-end justify-content-center" style="top: 70px; right: 15px; z-index: 9999999; pointer-events: none;">
                    <div id="${overlayId}_box" class="animate__animated animate__bounceInRight text-end" style="animation-duration: 0.5s;">
                        <div class="fw-bold" style="font-size: 1.2rem; color: #facc15; text-shadow: 0 2px 5px rgba(0,0,0,0.8); line-height: 1; -webkit-text-stroke: 0.5px #b45309; font-style: italic;">COMBO ${s}!</div>
                        <div class="d-flex align-items-center justify-content-end gap-1 mt-1 p-1 px-2 rounded-pill shadow" style="background: rgba(15, 23, 42, 0.95); border: 1px solid #38bdf8;">
                            <div class="text-end" style="line-height: 1.1;"><div class="text-info fw-bold text-uppercase" style="font-size: 0.6rem;">${itemNameOnly}</div><div class="text-white fw-bold" style="font-size: 0.55rem;">+${giftAdd} Quà</div></div>
                            <span style="font-size: 1.1rem; filter: drop-shadow(0 0 5px #38bdf8);">${itemIcon}</span>
                        </div>
                    </div>
                </div>`;
                document.body.insertAdjacentHTML('beforeend', html);
                
                setTimeout(() => {
                    let elBox = document.getElementById(overlayId + '_box'); if(elBox) elBox.classList.replace('animate__bounceInRight', 'animate__zoomOutUp');
                    setTimeout(() => { let el = document.getElementById(overlayId); if(el) el.remove(); }, 500);
                    if (badge) {
                        let rect = badge.getBoundingClientRect(); let startX = window.innerWidth - 60; let startY = 90; 
                        let endX = rect.left + rect.width / 2; let endY = rect.top + rect.height / 2;
                        
                        let flyItem = document.createElement('div'); flyItem.innerHTML = itemIcon;
                        flyItem.style.cssText = `position:fixed; left:${startX}px; top:${startY}px; font-size:1.5rem; z-index:9999999; pointer-events:none; transition:all 0.5s cubic-bezier(0.25, 1, 0.5, 1); transform:translate(-50%, -50%); filter:drop-shadow(0 0 10px #38bdf8);`;
                        document.body.appendChild(flyItem);
                        
                        requestAnimationFrame(() => { flyItem.style.left = endX+'px'; flyItem.style.top = endY+'px'; flyItem.style.fontSize = '0.5rem'; flyItem.style.opacity = '0'; flyItem.style.transform = 'translate(-50%, -50%) rotate(360deg)'; });
                        setTimeout(() => flyItem.remove(), 500);

                        for(let i=0; i<giftAdd; i++) {
                            setTimeout(() => {
                                let flyGift = document.createElement('div'); flyGift.innerHTML = "🎁";
                                flyGift.style.cssText = `position:fixed; left:${startX}px; top:${startY}px; font-size:1.2rem; z-index:9999998; pointer-events:none; transition:all 0.4s ease-in; transform:translate(-50%, -50%); filter:drop-shadow(0 0 8px #facc15);`;
                                document.body.appendChild(flyGift);
                                requestAnimationFrame(() => { flyGift.style.left = endX+'px'; flyGift.style.top = endY+'px'; flyGift.style.fontSize = '0.4rem'; flyGift.style.opacity = '0'; flyGift.style.transform = 'translate(-50%, -50%) rotate(360deg)'; });
                                setTimeout(() => flyGift.remove(), 400);
                            }, 100 + (i * 80)); 
                        }
                    }
                }, 1200);

                if (typeof window.show_streak_animation === 'function') window.show_streak_animation(window.current_live_streak, giftAdd, itemDrop);
            } else { if (typeof window.show_streak_animation === 'function') window.show_streak_animation(window.current_live_streak, 0, ""); }
        }
    } else {
        window.current_live_streak = 0; 
        if (inventory >= 4) {
            let reviveBtnId = `revive_btn_${idx}`;
            let reviveHtml = `
            <div id="${reviveBtnId}" class="mt-3 text-center animate__animated animate__bounceIn">
                <button class="btn btn-warning rounded-pill px-4 py-2 fw-bold shadow-lg" style="background: linear-gradient(135deg, #f59e0b, #ef4444); border: 2px solid #fff; color: white;" onclick="window.use_revive_item(${idx}, this)">
                    <i class="bi bi-heart-pulse-fill me-1"></i> Dùng 4 Quà để Chọn Lại (Còn ${inventory})
                </button>
            </div>`;
            container.insertAdjacentHTML('beforeend', reviveHtml);
        }
    }

    if (typeof check_complete === 'function') check_complete();
    if (typeof window.auto_save_exam_draft === 'function') window.auto_save_exam_draft();
};

window.use_revive_item = function(qIdx, btnEl) {
    if (window.is_study_mode === false) { window.play_sound('error'); return window.show_toast("⚠️ TÍNH NĂNG BỊ KHÓA: Không thể Cứu sai trong lúc thi!", true); }
    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let inventory = parseInt(localStorage.getItem(invKey)) || 0;
    if (inventory < 4) return window.show_toast("Bạn cần ít nhất 4 Quà để thực hiện Cứu sai!", true);

    // Trừ quà
    localStorage.setItem(invKey, inventory - 4);
    let invEl = document.getElementById('dashboard_inventory_count'); if (invEl) invEl.innerText = inventory - 4;
    let miniInvEl = document.getElementById('mini_inventory_count'); if (miniInvEl) miniInvEl.innerText = inventory - 4;

    let container = btnEl.closest('.glass-quiz-container, .ui2-clinical-container, .ui3-lab-container');
    
    // 🌟 LẤY DANH SÁCH NÚT ĐANG CHỌN SAI TRƯỚC KHI RESET
    let wrongBtns = Array.from(container.querySelectorAll('.wrong'));
    
    // Làm mờ tàng hình nút sai ngay lập tức
    wrongBtns.forEach(b => { 
        b.style.transition = 'all 0.5s ease'; 
        b.style.opacity = '0'; 
        b.style.transform = 'scale(0.9)';
    });

    setTimeout(() => {
        btnEl.parentElement.remove(); 
        questions[qIdx].done = false; 
        questions[qIdx].ans_user = "";

        let allBtns = container.querySelectorAll('.option-btn, .glass-option-btn, .ui1-option-btn, .ui2-option-btn, .ui3-option-btn');
        
        allBtns.forEach(b => { 
            b.classList.remove('correct', 'wrong', 'selected'); 
            
            // 🌟 KIỂM TRA: Nếu nút này là nút sai lúc nãy, thì khóa tàng hình luôn!
            if (wrongBtns.includes(b)) {
                b.style.opacity = '0.1'; // Chỉ để lại bóng mờ 10%
                b.style.pointerEvents = 'none'; // Khóa không cho bấm nữa
                b.style.transform = 'scale(1)'; // Trả lại layout chuẩn
            } else {
                // Mở khóa các nút khác để sinh viên chọn lại
                b.style.opacity = '1'; 
                b.style.pointerEvents = 'auto';
            }
        });

        // Dọn sạch toàn bộ các Marker Động (Hỗ trợ Multi-tap)
        let markers = container.querySelectorAll('div[style*="z-index:10"]');
        markers.forEach(m => m.remove());

        if (typeof window.update_progress_bar === 'function') window.update_progress_bar();
        if (typeof check_complete === 'function') check_complete();
    }, 500); 

    window.show_toast("🎁 Đã dùng 4 Quà! Lựa chọn sai đã bị xóa.");
};

window.set_fill_v2 = function(input, qIdx, fIdx) {
    if (!Array.isArray(questions[qIdx].ans_user)) questions[qIdx].ans_user = [];
    questions[qIdx].ans_user[fIdx] = input.value.trim();
    questions[qIdx].done = questions[qIdx].ans_user.some(x => x && x.length > 0);

    if (typeof window.update_progress_bar === 'function') window.update_progress_bar(qIdx, window.questions.length);
    if (typeof check_complete === 'function') check_complete();
    if (typeof window.auto_save_exam_draft === 'function') window.auto_save_exam_draft(); // 🌟 LƯU NHÁP TỰ ĐỘNG
};

window.check_fill_correct = function(q) {
    if (!q.ans_user || !Array.isArray(q.ans_user)) return false;
    
    // 🌟 ĐÃ FIX: Tương tự cho hàm kiểm tra điền khuyết
    const make_clean = (str) => {
        if (!str) return "";
        let s = String(str).replace(/\{\{(.*?)::.*?::.*?\}\}/g, '$1');
        return s.toLowerCase().normalize('NFC').replace(/\\/g, '').replace(/\s+/g, '').replace(/["“”]/g, '');
    };

    let correct_parts = (q.a || q.answer || '').split('|').map(item => make_clean(item));
    return correct_parts.every((val, index) => {
        let user_val = make_clean(q.ans_user[index]); 
        return user_val === val;
    });
};
// =========================================================================
// 🏆 TÍNH ĐIỂM, HIỂN THỊ POPUP VÀ SAO LƯU ĐỀ GỐC
// =========================================================================
function calculate_and_show_result() {
    if (typeof window.play_sound === 'function') window.play_sound('finish'); 

    if (!window.session_original_questions) { window.session_original_questions = [...questions]; }

    let total = questions.length; let correct = 0; let current_streak = 0; let earned_items = [];
    
    questions.forEach(q => {
        let is_correct = false; let cType = q.type ? String(q.type).toLowerCase().trim() : '';

        if (cType === 'single' || cType === 'mcq' || cType === 'true_false' || cType === 'tf' || cType === 'đúng sai') { 
            let user_ans = (q.ans_user || "").toString().trim().toLowerCase();
            let correct_ans = (q.a || "").toString().trim().toLowerCase();
            if (user_ans === correct_ans) is_correct = true; 
        } else if (cType === 'fill' || cType === 'short' || cType === 'điền khuyết') { 
            if (check_fill_correct(q)) is_correct = true; 
        } else if (cType === 'hotspot') {
            if (typeof window.check_hotspot_correct === 'function' && window.check_hotspot_correct(q)) is_correct = true;
        } else if (cType === 'arrange' || cType === 'sắp xếp') {
            if (typeof window.check_arrange_correct === 'function' && window.check_arrange_correct(q)) is_correct = true;
        }
        
        if (is_correct) {
            q.is_correct = true; 
            correct++; current_streak++;
            if (window.is_eligible_for_reward !== false) {
                if (current_streak === 3) earned_items.push("10 Triệu BP 💰");
                if (current_streak === 5) earned_items.push("Giáp 3 Mũ 3 🛡️");
                if (current_streak === 10) earned_items.push("Thẻ Nâng Cấp +5 🌟");
                if (current_streak === 20) earned_items.push("Thẻ Tạo Phòng 🚪");
                if (current_streak === 30) earned_items.push("Booyah Pass 🎫");
            }
        } else { q.is_correct = false; current_streak = 0; } 
    });

    window.quiz_earned_items = earned_items;
    let wrong_count = total - correct;
    let score10 = total > 0 ? ((correct / total) * 10).toFixed(1) : 0;
    
    // Vẫn âm thầm chấm điểm và gửi lên Server bình thường
    if (typeof send_result_to_server === 'function') send_result_to_server(correct, total);

    let overlayId = 'glass_result_overlay';
    let existingOverlay = document.getElementById(overlayId); if (existingOverlay) existingOverlay.remove();

    // ===============================================================
    // 🌟 NẾU ĐANG LÀ THI THẬT: TẮT ĐIỂM SỐ, CHỈ BÁO NỘP THÀNH CÔNG
    // ===============================================================
    if (window.is_study_mode === false) {
        let overlayHtml = `
        <div id="${overlayId}" class="animate__animated animate__fadeIn" style="position: fixed; inset: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 999999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); overflow: hidden; margin: 0; padding: 0;">
            <div class="text-center animate__animated animate__zoomIn p-4 position-relative" style="background: rgba(30, 41, 59, 0.95); border: 1px solid #10b981; border-radius: 24px; box-shadow: 0 20px 50px rgba(16, 185, 129, 0.4); width: 92%; max-width: 400px;">
                <div class="mb-3"><i class="bi bi-check-circle-fill text-success" style="font-size: 5rem; text-shadow: 0 0 20px rgba(16, 185, 129, 0.5);"></i></div>
                <h5 class="fw-bold text-white mb-2 text-uppercase" style="letter-spacing: 1px;">ĐÃ NỘP BÀI THÀNH CÔNG</h5>
                <p class="text-white-50 mb-4" style="font-size: 0.9rem;">Hệ thống đã ghi nhận bài làm của bạn.<br>Giảng viên sẽ kiểm tra lại trên hệ thống và công bố điểm sau.</p>
                <button class="btn w-100 fw-bold py-3 shadow" style="background: #10b981; color: white; border-radius: 12px; font-size: 0.95rem;" onclick="exit_quiz_to_menu()">
                    QUAY VỀ TRANG CHỦ
                </button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', overlayHtml);
        let submitBtn = document.getElementById('submit_btn'); if (submitBtn) submitBtn.style.display = 'none';
        
        // 🌟 BẢN VÁ LỖI CẮT ĐỒNG HỒ CHÍNH XÁC CHO THI THẬT
        if (typeof clearInterval === 'function' && window.timer_interval) clearInterval(window.timer_interval);
        
        return; // ⛔ THOÁT HÀM: Không render bảng điểm phía dưới nữa
    }

    // ===============================================================
    // 🌟 NẾU LÀ ÔN TẬP: BÁO ĐIỂM VÀ CÚP CHI TIẾT NHƯ CŨ
    // ===============================================================
    let trophyIcon = score10 >= 8 
        ? '<i class="bi bi-trophy-fill text-warning" style="font-size: 4rem; text-shadow: 0 0 20px rgba(255,193,7,0.6);"></i>' 
        : '<i class="bi bi-star-half text-info" style="font-size: 4rem; text-shadow: 0 0 20px rgba(14,165,233,0.6);"></i>';

    let phoneZalo = "0905106848"; 
    let stdName = window.current_student_name || window.current_student_id || "BẠN";
    let smsText = encodeURIComponent(`📝 BÁO CÁO NỘP BÀI:\n👤 ${stdName.split(' ').pop().toUpperCase()}\n📚 Bài: ${window.selected_lessons_text}\n🎯 Điểm: ${score10}/10 (Đúng ${correct}/${total})\n👉 Ba kiểm tra Gmail để xem chi tiết nhé!`);

    let overlayHtml = `
    <div id="${overlayId}" class="animate__animated animate__fadeIn" style="position: fixed; inset: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 999999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); overflow: hidden; margin: 0; padding: 0;">
        <div class="text-center animate__animated animate__zoomIn p-4 position-relative" style="background: rgba(30, 41, 59, 0.95); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8); width: 92%; max-width: 360px; max-height: 95vh; overflow-y: auto;">
            <button class="btn-close btn-close-white position-absolute" style="top: 20px; left: 20px; z-index: 100; opacity: 0.8; transition: 0.3s;" onclick="exit_quiz_to_menu()"></button>
            <div class="mb-2 mt-2">${trophyIcon}</div>
            <h5 class="fw-bold text-white mb-1 text-uppercase" style="letter-spacing: 1px;">HOÀN THÀNH!</h5>
            
            <div class="d-flex justify-content-center gap-3 mb-4 mt-3">
                <div class="p-3 d-flex flex-column justify-content-center shadow-sm" style="background: rgba(255,255,255,0.05); border-radius: 16px; min-width: 100px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 2.5rem; font-weight: 900; color: #4ade80; line-height: 1; text-shadow: 0 0 15px rgba(74,222,128,0.3);">${score10}</div>
                    <div class="text-white-50 mt-1 fw-bold" style="font-size: 0.7rem; text-transform: uppercase;">Điểm số</div>
                </div>
                <div class="d-flex flex-column gap-2 justify-content-center flex-grow-1">
                    <div class="px-3 py-2 d-flex align-items-center justify-content-between shadow-sm" style="background: rgba(74, 222, 128, 0.1); border-radius: 12px; border: 1px solid rgba(74, 222, 128, 0.2);">
                        <span style="color: #4ade80; font-size: 0.8rem;"><i class="bi bi-check-circle-fill me-1"></i> Đúng</span>
                        <strong style="color: #4ade80; font-size: 1.1rem;">${correct}</strong>
                    </div>
                    <div class="px-3 py-2 d-flex align-items-center justify-content-between shadow-sm" style="background: rgba(248, 113, 113, 0.1); border-radius: 12px; border: 1px solid rgba(248, 113, 113, 0.2);">
                        <span style="color: #f87171; font-size: 0.8rem;"><i class="bi bi-x-circle-fill me-1"></i> Sai</span>
                        <strong style="color: #f87171; font-size: 1.1rem;">${wrong_count}</strong>
                    </div>
                </div>
            </div>
            
            <div class="d-flex flex-column gap-2">
                <button class="btn w-100 fw-bold py-2" onclick="redo_entire_quiz()" style="border-radius: 12px; font-size: 0.85rem; background: linear-gradient(135deg, rgba(14,165,233,0.8), rgba(37,99,235,0.8)); border: 1px solid rgba(14,165,233,0.5); color: #fff;">
                    <i class="bi bi-arrow-repeat me-2"></i> LÀM LẠI TOÀN BÀI
                </button>
                ${wrong_count > 0 ? `
                <button class="btn w-100 fw-bold py-2" onclick="redo_wrong_questions()" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 12px; font-size: 0.85rem;">
                    <i class="bi bi-x-circle me-2"></i> CHỈ LÀM LẠI ${wrong_count} CÂU SAI
                </button>` : ''}
                
                <button class="btn w-100 fw-bold py-2 mt-1 d-flex align-items-center justify-content-center gap-2 shadow" 
                        style="background: #34C759; color: white; border-radius: 12px; font-size: 0.85rem;" 
                        onclick="window.send_imessage_receipt('${smsText}', '${phoneZalo}')">
                    <i class="bi bi-chat-text-fill fs-5"></i> BÁO ĐIỂM QUA iMESSAGE
                </button>

                <button class="btn w-100 fw-bold py-2 mt-1" onclick="reveal_all_answers()" style="border-radius: 12px; font-size: 0.85rem; background: transparent; color: rgba(255,255,255,0.8); border: 1px dashed rgba(255,255,255,0.3);">
                    <i class="bi bi-search me-2"></i> XEM ĐÁP ÁN
                </button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', overlayHtml);
    let submitBtn = document.getElementById('submit_btn'); if (submitBtn) submitBtn.style.display = 'none';
    
    // 🌟 BẢN VÁ LỖI CẮT ĐỒNG HỒ CHÍNH XÁC CHO ÔN TẬP
    if (typeof clearInterval === 'function' && window.timer_interval) clearInterval(window.timer_interval);
    
    if (score10 >= 8 && typeof confetti === 'function') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}

// =========================================================================
// 👁️ HIỂN THỊ ĐÁP ÁN (ĐÃ CẬP NHẬT CHO HOTSPOT & SẮP XẾP)
// =========================================================================
function reveal_all_answers() {
    let overlay = document.getElementById('glass_result_overlay');
    if (overlay) overlay.remove();

    questions.forEach((q, i) => {
        // Hỗ trợ quét tìm câu hỏi trên cả 3 giao diện UI1, UI2, UI3
        let qCard = document.querySelectorAll('.glass-quiz-container, .ui2-clinical-container, .ui3-lab-container')[i];
        if(!qCard) return;

        let currentType = q.type ? String(q.type).toLowerCase().trim() : '';

        if (currentType === 'fill' || currentType === 'short' || currentType === 'điền khuyết') {
            let inputs = qCard.querySelectorAll('input[type="text"]');
            let correct_parts = (q.a || "").toString().split('|').map(item => item.trim());

            inputs.forEach((input, idx) => {
                let user_val = (q.ans_user && q.ans_user[idx]) ? q.ans_user[idx].toString().trim().toLowerCase() : "";
                let correct_val = (correct_parts[idx] || "").toLowerCase();

                input.disabled = true; 
                input.style.backgroundColor = 'rgba(0,0,0,0.2)';

                if (user_val === correct_val && user_val !== "") {
                    input.style.borderColor = '#4ade80';
                    input.style.color = '#4ade80';
                    input.style.boxShadow = '0 0 10px rgba(74, 222, 128, 0.4)';
                } else {
                    input.style.borderColor = '#f87171';
                    input.style.color = '#f87171';
                    input.style.boxShadow = '0 0 10px rgba(248, 113, 113, 0.4)';
                    let badgeHtml = `<span class="badge ms-1 animate__animated animate__fadeIn" style="background: rgba(74,222,128,0.2); color: #4ade80; font-size: 0.8rem; border: 1px solid #4ade80; padding: 4px 8px;">${correct_parts[idx]}</span>`;
                    input.insertAdjacentHTML('afterend', badgeHtml);
                }
            });
        } 
        // 🌟 XỬ LÝ HIỂN THỊ ĐÁP ÁN CHO DẠNG HOTSPOT (VẼ TRÒN HOẶC VUÔNG)
        // 🌟 XỬ LÝ HIỂN THỊ ĐÁP ÁN CHO DẠNG HOTSPOT (HỖ TRỢ ĐA MỤC TIÊU)
        else if (currentType === 'hotspot') {
            let ansStr = String(q.a || q.answer || '').trim();
            let imgContainer = qCard.querySelector('.position-relative');
            
            if (imgContainer && ansStr) {
                let targetHtml = '';
                let ansArray = ansStr.split('|');
                
                // Lặp qua tất cả các vùng và vẽ đồng loạt
                ansArray.forEach(singleAns => {
                    if (singleAns.startsWith('rect:')) {
                        let parts = singleAns.replace('rect:','').split(',').map(Number);
                        targetHtml += `<div class="position-absolute animate__animated animate__pulse animate__infinite" style="left: ${parts[0]}%; top: ${parts[1]}%; width: ${parts[2]}%; height: ${parts[3]}%; border: 3px dashed #4ade80; background: rgba(74,222,128,0.2); pointer-events: none; z-index: 11; box-shadow: 0 0 15px rgba(74,222,128,0.8); border-radius: 4px;"></div>`;
                    } else {
                        let parts = singleAns.replace('circle:','').split(',').map(Number);
                        targetHtml += `<div class="position-absolute translate-middle animate__animated animate__pulse animate__infinite" style="left: ${parts[0]}%; top: ${parts[1]}%; width: ${parts[2]*2}%; height: ${parts[2]*2}%; border: 3px dashed #4ade80; border-radius: 50%; background: radial-gradient(circle, rgba(74,222,128,0.4) 0%, transparent 70%); pointer-events: none; z-index: 11; box-shadow: 0 0 15px rgba(74,222,128,0.8);"></div>`;
                    }
                });
                imgContainer.insertAdjacentHTML('beforeend', targetHtml);
            }
        }
        else if (currentType === 'clip') {
            let ansStr = String(q.a || q.answer || '').trim();
            let vidContainer = qCard.querySelector('.position-relative');
            
            if (vidContainer && ansStr) {
                let targetHtml = '';
                let ansArray = ansStr.split('|');
                
                ansArray.forEach(singleAns => {
                    let partsSys = singleAns.split('#');
                    if(partsSys.length < 2) return;
                    let timeTarget = partsSys[0];
                    let coordsTarget = partsSys[1];

                    if (coordsTarget.startsWith('rect:')) {
                        let parts = coordsTarget.replace('rect:','').split(',').map(Number);
                        targetHtml += `<div class="position-absolute animate__animated animate__pulse animate__infinite" style="left: ${parts[0]}%; top: ${parts[1]}%; width: ${parts[2]}%; height: ${parts[3]}%; border: 3px dashed #facc15; background: rgba(250,204,21,0.2); pointer-events: none; z-index: 11; box-shadow: 0 0 15px rgba(250,204,21,0.8); border-radius: 4px;"></div><div class="position-absolute badge bg-danger" style="left: ${parts[0]}%; top: ${parts[1]-5}%; z-index: 12;">⏱ ${timeTarget}s</div>`;
                    } else {
                        let parts = coordsTarget.replace('circle:','').split(',').map(Number);
                        targetHtml += `<div class="position-absolute translate-middle animate__animated animate__pulse animate__infinite" style="left: ${parts[0]}%; top: ${parts[1]}%; width: ${parts[2]*2}%; height: ${parts[2]*2}%; border: 3px dashed #facc15; border-radius: 50%; background: radial-gradient(circle, rgba(250,204,21,0.4) 0%, transparent 70%); pointer-events: none; z-index: 11; box-shadow: 0 0 15px rgba(250,204,21,0.8);"></div><div class="position-absolute badge bg-danger translate-middle" style="left: ${parts[0]}%; top: ${parts[1]-parts[2]-5}%; z-index: 12;">⏱ ${timeTarget}s</div>`;
                    }
                });
                vidContainer.insertAdjacentHTML('beforeend', targetHtml);
            }
        }
        // 🌟 XỬ LÝ HIỂN THỊ ĐÁP ÁN CHO DẠNG SẮP XẾP QUY TRÌNH
        else if (currentType === 'arrange' || currentType === 'sắp xếp') {
            let resBox = qCard.querySelector(`[id^="arrange_result_"]`);
            let poolBox = qCard.querySelector(`[id^="arrange_pool_"]`);
            if (resBox) {
                let correctStr = String(q.a || q.answer || '').replace(/[\s\-\|,]/g, '').toUpperCase();
                let correctBadges = correctStr.split('').map(char => `<span class="badge bg-success text-white me-1 mb-1 shadow-sm" style="font-size: 0.9rem; border: 1px solid #fff;">${char}</span>`).join('');
                
                let isCorrect = typeof window.check_arrange_correct === 'function' ? window.check_arrange_correct(q) : false;
                
                resBox.innerHTML = `<div class="w-100 fw-bold small mb-2 ${isCorrect ? 'text-success' : 'text-danger'}">${isCorrect ? '✅ Bạn đã sắp xếp ĐÚNG:' : '❌ Bạn xếp SAI. Thứ tự chuẩn là:'}</div><div>${correctBadges}</div>`;
                resBox.style.borderColor = isCorrect ? '#4ade80' : '#f87171';
                resBox.style.background = isCorrect ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)';
            }
            if (poolBox) poolBox.style.display = 'none'; // Ẩn các nút con đi cho gọn
        }
        // XỬ LÝ CÁC DẠNG TRẮC NGHIỆM ABCD VÀ ĐÚNG SAI CŨ
        else {
            let btns = qCard.querySelectorAll('.option-btn, .glass-option-btn, .ui2-option-btn, .ui3-option-btn');
            
            const make_clean = (str) => String(str||"").replace(/^[A-D][\.\)]\s*/i, '').replace(/\{\{(.*?)::.*?::.*?\}\}/g, '$1').replace(/<[^>]*>/g, '').toLowerCase().normalize('NFC').replace(/\\/g, '').replace(/\s+/g, '').replace(/["“”]/g, '');
            
            let raw_ans = (q.a || q.answer || "").trim();
            let is_letter_ans = /^[A-D]$/i.test(raw_ans); 
            let letter_ans = is_letter_ans ? raw_ans.toLowerCase() : "";
            let correct_ans = make_clean(raw_ans);
            let user_ans = (q.ans_user || "").toString().trim().toLowerCase();

            btns.forEach((b, opt_index) => {
                b.style.pointerEvents = 'none'; 
                
                let b_val = "";
                let match = (b.getAttribute('onclick')||"").match(/set_ans\([^,]+,\s*(?:decodeURIComponent\()?['"]([^'"]+)['"]/);
                if(match) { try{ b_val=decodeURIComponent(match[1]); }catch(e){} } else { b_val = b.innerText; }
                
                let is_correct_btn = false;
                if (is_letter_ans) {
                    if (letter_ans === ['a','b','c','d'][opt_index] || new RegExp("^" + letter_ans + "[\\.\\)]", "i").test(b_val.trim())) is_correct_btn = true;
                } else {
                    if (make_clean(b_val) === correct_ans && make_clean(b_val) !== "") is_correct_btn = true; 
                }

                if (is_correct_btn) {
                    b.classList.add('correct'); 
                    b.style.opacity = '1';
                } else if (user_ans === (is_letter_ans ? ['a','b','c','d'][opt_index] : make_clean(b_val)) && user_ans !== correct_ans) {
                    b.classList.add('wrong'); 
                    b.style.opacity = '1';
                } else {
                    b.style.opacity = '0.35'; 
                }
            });
        }
    });
}
function redo_current_exam() {
    document.getElementById('result_area').style.display = 'none';
    if (questions.length > 0) {
        questions.forEach(q => { q.done = false; q.ans_user = (q.type === 'fill') ? [] : ""; });
        window.away_seconds = 0; window.away_count = 0; start_time = new Date(); is_exam_started = true;
        document.getElementById('step_3').style.display = 'block'; 
        if(is_flashcard_mode) render_flashcard_mode(0); else render_quiz();
        time_left = questions.length * 60; start_countdown();
    }
}
// =========================================================================
// 🔄 LÀM LẠI TOÀN BÀI / CÂU SAI
// =========================================================================
function redo_entire_quiz() {
    let overlay = document.getElementById('glass_result_overlay');
    if (overlay) overlay.remove();
    
    if (window.session_original_questions) {
        questions = [...window.session_original_questions];
    }
    
    questions.forEach(q => { delete q.done; delete q.ans_user; });
    let pbar = document.getElementById('p_bar'); if (pbar) pbar.style.width = '0%';
    
    if (typeof render_quiz === 'function') render_quiz(); else window.render_quiz();
    check_complete(); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function redo_wrong_questions() {
    let overlay = document.getElementById('glass_result_overlay');
    if (overlay) overlay.remove();
    
    let baseQuestions = window.session_original_questions || questions;
    
    let wrongQs = baseQuestions.filter(q => {
        let user_ans = (q.ans_user || "").toString().trim().toLowerCase();
        let correct_ans = (q.a || "").toString().trim().toLowerCase();
        if (q.type === 'single' || q.type === 'true_false' || q.type === 'mcq' || q.type === 'tf' || q.type === 'đúng sai') { 
            return user_ans !== correct_ans; 
        } else { 
            return !check_fill_correct(q); 
        }
    });
    
    questions = [...wrongQs];
    questions.forEach(q => { delete q.done; delete q.ans_user; });
    let pbar = document.getElementById('p_bar'); if (pbar) pbar.style.width = '0%';
    
    if (typeof render_quiz === 'function') render_quiz(); else window.render_quiz();
    check_complete();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =========================================================================
// 🚪 NÚT X ĐÓNG VÀ TRỞ VỀ MENU CHỌN BÀI (ĐÃ FIX LỖI KẸT MÀN HÌNH)
// =========================================================================
function exit_quiz_to_menu() {
    // 1. Xóa bảng điểm pha lê
    let overlay = document.getElementById('glass_result_overlay');
    if (overlay) overlay.remove();
    
    // 2. Ẩn toàn bộ khu vực làm bài (bước 3)
    let step3 = document.getElementById('step_3');
    if (step3) step3.style.display = 'none';
    
    // Xóa sạch dữ liệu câu hỏi trên màn hình để dọn chỗ cho bài mới
    let quizArea = document.getElementById('quiz_area');
    if (quizArea) quizArea.innerHTML = '';
    
    // Xóa bộ nhớ sao lưu đề gốc
    delete window.session_original_questions;
    
    // 3. 🌟 BẬT LẠI MENU CHỌN BÀI HỌC
    let step2 = document.getElementById('step_2'); // Thường danh sách bài học nằm ở step_2
    if (step2) step2.style.display = 'block';
    
    let step1 = document.getElementById('step_1'); // Hoặc step_1
    if (step1 && !step2) step1.style.display = 'block';
    
    let dashboard = document.getElementById('student_dashboard');
    if (dashboard) dashboard.style.display = 'block';
    
    // 4. Nếu hệ thống của Thầy có hàm vẽ lại số điểm trên Menu, gọi nó chạy lại để cập nhật điểm mới nhất
    if (window.full_data && window.current_subject) {
        let mapArea = document.getElementById(`map_area_${window.current_subject}`);
        if (mapArea && typeof draw_lesson_buttons === 'function') {
            let dispName = window.subjectConfig ? window.subjectConfig[window.current_subject]?.name : window.current_subject;
            draw_lesson_buttons(window.current_subject, dispName, window.full_data[window.current_subject]);
        }
    }
    
    // Cuộn mượt mà lên đầu trang Menu
    window.scrollTo({ top: 0, behavior: 'instant' });
}

// =========================================================================
// 🔄 ÉP HIỂN THỊ NÚT NỘP BÀI
// =========================================================================
function check_complete() {
    let done_count = questions.filter(q => q.done).length;
    let p_bar = document.getElementById('p_bar'); 
    if (p_bar) p_bar.style.width = (questions.length > 0 ? (done_count / questions.length * 100) : 0) + "%";
    
    let s_btn = document.getElementById('submit_btn'); 
    if (s_btn) s_btn.style.display = 'block'; // LUÔN HIỆN
}
// =========================================================================
// 🚀 XÁC NHẬN NỘP BÀI
// =========================================================================
function submit_final() {
    let skip = questions.filter(q => !q.done).length;
    let msg = skip > 0 ? `Bạn còn ${skip} câu chưa làm. Bạn chắc chắn nộp bài?` : "Bạn chắc chắn kết thúc và nộp bài?";
    show_alert("Xác nhận Nộp bài", msg, (ans) => { 
        if (ans) {
            // Xóa bản nháp và Tắt giám sát
            if (typeof window.clear_exam_draft === 'function') window.clear_exam_draft();
            
            // Thoát toàn màn hình khi nộp bài xong
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            }
            
            calculate_and_show_result(); 
        } 
    });
}

// =========================================================================
// 🏆 ĐỘNG CƠ LƯU ĐIỂM SUPABASE V2
// =========================================================================
window.send_result_to_server = async function(correct_count, total_count) {
    if (typeof window.finalize_question_time === 'function') {
        window.finalize_question_time();
    }

    const studentId = window.current_student_id || "Guest";
    let devId = localStorage.getItem('mcq_device_id') || ('DEV_' + Math.floor(Math.random()*1000000));
    localStorage.setItem('mcq_device_id', devId);

    // Tính điểm hệ 10
    let score10 = total_count > 0 ? parseFloat(((correct_count / total_count) * 10).toFixed(2)) : 0;

    // Phân luồng: Thi thật (Thi Online) hay Ôn tập tự do
    let is_exam = (window.is_study_mode === false && window.proctoring_state && window.proctoring_state.exam_code);

   if (is_exam) {
        // === LƯU VÀO BẢNG exam_results (Cập nhật điểm thi thật) ===
        let payload = {
            exam_code: window.proctoring_state.exam_code, // 🌟 Đã bổ sung mã đề
            student_id: studentId,                        // 🌟 Đã bổ sung mã sinh viên
            score: score10,
            is_submitted: true,
            submitted_at: new Date().toISOString()
        };

        try {
            const { error } = await window.db.from('exam_results')
                .upsert(payload, { onConflict: 'exam_code,student_id' });
            
            if (error) throw error;
            console.log("✅ Đã cập nhật điểm thi Online lên Supabase!");
        } catch (err) {
            console.error("Lỗi lưu điểm thi Online:", err.message);
            // Sửa lại cách gọi show_toast hoặc alert cho an toàn
            if (typeof window.show_toast === 'function') {
                window.show_toast("⚠️ Lỗi mạng, chưa thể gửi điểm lên hệ thống!", true);
            } else {
                alert("⚠️ Lỗi mạng, chưa thể gửi điểm lên hệ thống! " + err.message);
            }
        }

    } else {
        // === LƯU VÀO BẢNG study_logs (Ghi nhận lịch sử ôn tập) ===
        // Đã sửa tên bảng (study_logs) và tên cột khớp 100% với Database
        let payload = {
            student_id: studentId,
            subject_key: window.current_subject, 
            lesson_name: window.selected_lessons_text, 
            score: score10, 
            total: total_count,
            correct: correct_count,
            mode: window.active_mode || 'quiz',
            device: devId,
            logout_time: new Date().toISOString(),
            offense_count: window.away_count || 0,
            away_time: window.away_seconds || 0
        };

        try {
            const { error } = await window.db.from('study_logs').insert([payload]);
            if (error) throw error;

            // Cập nhật điểm tối đa vào bảng student_progress (upsert)
            const { data: progData } = await window.db.from('student_progress')
                .select('score')
                .match({ student_id: studentId, subject_key: window.current_subject, lesson_id: window.selected_lessons_text })
                .maybeSingle();

            let maxScore = progData ? Math.max(progData.score, score10) : score10;

            await window.db.from('student_progress').upsert({
                student_id: studentId,
                subject_key: window.current_subject,
                lesson_id: window.selected_lessons_text,
                score: maxScore,
                total: total_count,
                time: new Date().toISOString()
            }, { onConflict: 'student_id,subject_key,lesson_id' });

            console.log("✅ Đã lưu Lịch sử ôn tập và Tiến độ lên Supabase!");
        } catch (err) {
            console.error("Lỗi lưu lịch sử ôn tập:", err.message);
        }
    }
    
    // Dọn dẹp RAM
    window.away_seconds = 0; window.away_count = 0; window.offense_count = 0; window.away_time_total = 0;
    window.current_live_streak = 0; window.quiz_earned_items = []; 
};
// =========================================================================
// 🚀 KHỞI TẠO BỘ CÔNG CỤ TỪ VỰNG TIẾNG ANH (Đã bọc IIFE an toàn)
// =========================================================================
(function init_english_vocab_tools() {
    if (!document.getElementById('english_clinical_style')) {
        // 1. Tạo style CSS
        let style = document.createElement('style');
        style.id = 'english_clinical_style';
        style.innerHTML = `
            .vocab-highlight { color: inherit; font-weight: inherit; cursor: pointer; border-bottom: 1px dashed currentColor; transition: 0.3s; padding: 0 2px; }
            .vocab-highlight:hover { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
            .vocab-tooltip { position: absolute; z-index: 1000; background: rgba(15,23,42,0.95); border: 1px solid #38bdf8; border-radius: 8px; padding: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); backdrop-filter: blur(10px); color: #fff; font-size: 0.85rem; width: max-content; max-width: 250px; pointer-events: none; opacity: 0; transform: translateY(10px); transition: 0.3s; }
            .vocab-tooltip.show { opacity: 1; transform: translateY(0); pointer-events: auto; }
            .ui2-case-panel { background: rgba(0,0,0,0.2) !important; border-radius: 12px 0 0 12px; border-right: 1px solid rgba(255,255,255,0.05); }
        `;
        document.head.appendChild(style);

        // 2. Gắn hàm phát âm Audio vào Window
        window.play_vocab_audio = function(text, ipa, meaning, event) {
            event.stopPropagation();
            let msg = new SpeechSynthesisUtterance(text);
            msg.lang = 'en-US';
            msg.rate = 0.9;
            window.speechSynthesis.speak(msg);

            let tooltip = document.getElementById('vocab_float_tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'vocab_float_tooltip';
                tooltip.className = 'vocab-tooltip';
                document.body.appendChild(tooltip);
            }
            tooltip.innerHTML = `<div class="text-info fw-bold mb-1" style="font-size: 1rem;">${text}</div>
                                 <div class="text-warning mb-1" style="font-family: monospace;">[ ${ipa} ]</div>
                                 <div class="text-white-50">${meaning}</div>`;
            
            let rect = event.target.getBoundingClientRect();
            tooltip.style.left = rect.left + window.scrollX + 'px';
            tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
            tooltip.classList.add('show');
            setTimeout(() => tooltip.classList.remove('show'), 4000);
        };
    }
})();
// =========================================================================
// 🎨 BỘ KHUNG GIAO DIỆN ĐỘNG (DYNAMIC UI ENGINE - 3 TEMPLATES)
// =========================================================================

// 1. NHÚNG CSS TỰ ĐỘNG CHO 3 MẪU GIAO DIỆN
const inject_quiz_styles = function() {
    if (document.getElementById('dynamic_quiz_styles')) return;
    let style = document.createElement('style');
    style.id = 'dynamic_quiz_styles';
    style.innerHTML = `
        /* 🔵 UI 1: GIÁP KÍNH (GLASSMORPHISM) - MẶC ĐỊNH */
        .ui1-glass-container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            padding: 25px;
            color: #fff;
        }
        .ui1-option-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #fff;
            border-radius: 12px;
            transition: all 0.3s ease;
            text-align: left;
            padding: 12px 15px;
            margin-bottom: 10px;
            width: 100%;
        }
        .ui1-option-btn:hover { background: rgba(255, 255, 255, 0.15); transform: translateX(5px); }
        .ui1-option-btn.selected { background: rgba(14, 165, 233, 0.4) !important; border-color: #0ea5e9; }

        /* 🟢 UI 2: CHUYÊN SÂU (CLINICAL CASE) - CHIA ĐÔI MÀN HÌNH */
        .ui2-clinical-container {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
            overflow: hidden;
            color: #333;
            border-top: 5px solid #0f766e; /* Màu Teal Y khoa */
        }
        .ui2-case-panel {
            background: #f8fafc;
            border-right: 1px solid #e2e8f0;
            padding: 25px;
            height: 100%;
        }
        .ui2-option-btn {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            color: #334155;
            border-radius: 8px;
            transition: 0.2s;
            text-align: left;
            padding: 15px;
            margin-bottom: 12px;
            width: 100%;
            font-weight: 500;
        }
        .ui2-option-btn:hover { border-color: #0f766e; background: #f0fdfa; box-shadow: 0 2px 5px rgba(15, 118, 110, 0.1); }
        .ui2-option-btn.selected { background: #0f766e !important; color: #fff !important; border-color: #0f766e; }

        /* 🟠 UI 3: THỰC HÀNH (DARK LAB / THEATER MODE) */
        .ui3-lab-container {
            background: #0f172a; /* Đen nhám sâu */
            border-radius: 16px;
            border: 1px solid #334155;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            padding: 20px;
            color: #e2e8f0;
        }
        .ui3-image-stage {
            background: #000;
            border-radius: 12px;
            padding: 10px;
            text-align: center;
            border: 1px solid #1e293b;
            margin-bottom: 20px;
        }
        .ui3-option-btn {
            background: #1e293b;
            border: 1px solid #475569;
            color: #cbd5e1;
            border-radius: 10px;
            transition: all 0.2s;
            text-align: left;
            padding: 12px 15px;
            margin-bottom: 8px;
            width: 100%;
        }
        .ui3-option-btn:hover { background: #334155; border-color: #f59e0b; }
        .ui3-option-btn.selected { background: rgba(245, 158, 11, 0.2) !important; border-color: #f59e0b; color: #f59e0b; }
    `;
    document.head.appendChild(style);
};

// 2. HÀM KẾT XUẤT HTML THEO GIAO DIỆN
// Truyền vào: q_data (Dữ liệu câu hỏi hiện tại), ui_type (1, 2, hoặc 3)
window.build_quiz_html = function(q_data, ui_type) {
    inject_quiz_styles(); // Đảm bảo CSS đã được tải
    
    // Khởi tạo các biến an toàn (Mô phỏng cấu trúc câu hỏi)
    let q_text = q_data.question || "Nội dung câu hỏi...";
    let q_image = q_data.image ? `<img src="${q_data.image}" style="max-width: 100%; max-height: 300px; border-radius: 8px; margin-bottom: 15px;">` : "";
    let optionsHtml = '';
    
    // Giả định q_data.options là mảng ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D']
    let opts = q_data.options || ['A', 'B', 'C', 'D']; 

    // =================================================================
    // 🔵 TRƯỜNG HỢP 1: UI GLASSMORPHISM (MẶC ĐỊNH)
    // =================================================================
    if (ui_type === '1') {
        opts.forEach((opt, idx) => {
            optionsHtml += `<button class="ui1-option-btn" onclick="select_option(this, ${idx})"><b>${String.fromCharCode(65+idx)}.</b> ${opt}</button>`;
        });
        return `
        <div class="ui1-glass-container animate__animated animate__fadeIn">
            <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3" style="border-color: rgba(255,255,255,0.1) !important;">
                <span class="badge bg-info text-dark rounded-pill shadow-sm"><i class="bi bi-bezier2 me-1"></i> Mặc định</span>
                <span class="text-white-50 fw-bold small">Câu 1/20</span>
            </div>
            ${q_image}
            <h5 class="fw-bold mb-4" style="line-height: 1.5;">${q_text}</h5>
            <div class="options-area">${optionsHtml}</div>
        </div>`;
    }

    // =================================================================
    // 🟢 TRƯỜNG HỢP 2: UI CLINICAL (CHUYÊN SÂU - CHIA ĐÔI)
    // =================================================================
    else if (ui_type === '2') {
        opts.forEach((opt, idx) => {
            optionsHtml += `<button class="ui2-option-btn shadow-sm" onclick="select_option(this, ${idx})"><b>${String.fromCharCode(65+idx)}.</b> ${opt}</button>`;
        });
        return `
        <div class="ui2-clinical-container animate__animated animate__zoomIn">
            <div class="row g-0">
                <div class="col-12 col-md-6 ui2-case-panel">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="badge" style="background:#0f766e;"><i class="bi bi-file-medical text-white me-1"></i> CA LÂM SÀNG</span>
                    </div>
                    ${q_image}
                    <div style="font-size: 1.05rem; line-height: 1.6; text-align: justify;">${q_text}</div>
                </div>
                <div class="col-12 col-md-6 p-4 d-flex flex-column justify-content-center bg-white">
                    <h6 class="text-secondary fw-bold mb-3 text-uppercase" style="font-size: 0.8rem;">CHỌN ĐÁP ÁN ĐÚNG NHẤT:</h6>
                    <div class="options-area">${optionsHtml}</div>
                </div>
            </div>
        </div>`;
    }

    // =================================================================
    // 🟠 TRƯỜNG HỢP 3: UI LAB (THỰC HÀNH - CHẾ ĐỘ RẠP HÁT)
    // =================================================================
    else if (ui_type === '3') {
        opts.forEach((opt, idx) => {
            optionsHtml += `<button class="ui3-option-btn" onclick="select_option(this, ${idx})"><span class="text-warning fw-bold me-2">${String.fromCharCode(65+idx)}.</span> ${opt}</button>`;
        });
        return `
        <div class="ui3-lab-container animate__animated animate__fadeInUp">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge border border-warning text-warning" style="background: rgba(245, 158, 11, 0.1);"><i class="bi bi-microscope me-1"></i> TIÊU BẢN THỰC HÀNH</span>
            </div>
            
            ${q_image ? `<div class="ui3-image-stage shadow-lg">${q_image}</div>` : ''}
            
            <h6 class="text-white fw-bold mb-3" style="line-height: 1.4; font-size: 1.1rem;">${q_text}</h6>
            
            <div class="row g-2 options-area">
                ${opts.map((opt, idx) => `
                    <div class="col-12 col-md-6">
                        <button class="ui3-option-btn h-100" onclick="select_option(this, ${idx})"><span class="text-warning fw-bold me-2">${String.fromCharCode(65+idx)}.</span> ${opt}</button>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }
};

// Hàm phụ: Hiệu ứng chọn đáp án dùng chung cho cả 3 UI
window.select_option = function(btn, index) {
    let parent = btn.closest('.options-area');
    let btns = parent.querySelectorAll('button');
    btns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    // Lưu lại lựa chọn của sinh viên vào mảng đáp án (Thầy sẽ nối với code chấm điểm ở đây)
};
// =========================================================================
// ⏱️ HỆ THỐNG RADAR TÍNH GIỜ (INTERSECTION OBSERVER) & CỬA SỔ BÁO CÁO
// =========================================================================

// 1. Radar quét vùng nhìn màn hình
window.init_question_time_tracker = function() {
    window.question_time_tracker = {}; 
    window.current_observed_q = null;  
    window.q_start_time = null;        

    // Cài đặt Radar: Câu hỏi nào chiếm từ 50% diện tích màn hình trở lên thì bật đồng hồ
    let options = { root: null, rootMargin: '0px', threshold: 0.5 }; 
    
    let observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                let qIdx = entry.target.getAttribute('data-q-idx');
                
                // Nếu sinh viên lướt sang câu mới
                if (window.current_observed_q !== qIdx) {
                    // Chốt sổ thời gian cho câu cũ (nếu có)
                    if (window.current_observed_q !== null && window.q_start_time) {
                        let duration = (new Date() - window.q_start_time) / 1000;
                        window.question_time_tracker[window.current_observed_q] = (window.question_time_tracker[window.current_observed_q] || 0) + duration;
                    }
                    // Bắt đầu bấm giờ cho câu mới
                    window.current_observed_q = qIdx;
                    window.q_start_time = new Date();
                }
            }
        });
    }, options);

    // Gắn Radar vào tất cả các câu hỏi
    document.querySelectorAll('.question-card-tracker').forEach(card => observer.observe(card));
    
    // Gắn sự kiện dừng bấm giờ cuối cùng khi nộp bài
    window.finalize_question_time = function() {
        if (window.current_observed_q !== null && window.q_start_time) {
            let duration = (new Date() - window.q_start_time) / 1000;
            window.question_time_tracker[window.current_observed_q] = (window.question_time_tracker[window.current_observed_q] || 0) + duration;
            window.current_observed_q = null;
        }
    };
};

// 2. Cửa sổ Báo cáo câu sai (Gắn cờ)
window.open_report_modal = function(qIndex) {
    let q = window.questions[qIndex];
    let modalId = 'report_question_modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    let qPreview = (q.q || q.vi || "Nội dung câu hỏi").substring(0, 80) + "...";

    let html = `
    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 99999; backdrop-filter: blur(10px); padding: 15px;">
        <div class="glass-panel p-4 shadow-lg d-flex flex-column w-100 animate__animated animate__zoomIn" style="max-width: 500px; border-radius: 20px; background: rgba(15, 23, 42, 0.95) !important; border: 1px solid rgba(239, 68, 68, 0.5);">
            
            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style="border-color: rgba(255,255,255,0.1) !important;">
                <h5 class="fw-bold text-danger mb-0"><i class="bi bi-flag-fill me-2"></i> BÁO LỖI CÂU ${qIndex + 1}</h5>
                <button class="btn-close btn-close-white" onclick="document.getElementById('${modalId}').remove()"></button>
            </div>
            
            <div class="p-2 mb-3 rounded" style="background: rgba(255,255,255,0.05); font-size: 0.85rem; font-style: italic; color: rgba(255,255,255,0.7);">
                "${qPreview}"
            </div>
            
            <label class="text-white-50 fw-bold small mb-2">Phân loại lỗi:</label>
            <select id="report_type_${qIndex}" class="form-select bg-dark text-white mb-3" style="border: 1px solid rgba(255,255,255,0.2);">
                <option value="Sai đáp án">Sai đáp án</option>
                <option value="Lỗi chính tả/Đề mờ">Lỗi chính tả / Đề mờ</option>
                <option value="Lỗi hình ảnh/Media">Lỗi hình ảnh / Video</option>
                <option value="Khác">Lỗi khác</option>
            </select>
            
            <label class="text-white-50 fw-bold small mb-2">Mô tả chi tiết (Tùy chọn):</label>
            <textarea id="report_note_${qIndex}" class="form-control bg-dark text-white mb-4 custom-scrollbar" rows="3" placeholder="Ví dụ: Theo sách giáo khoa thì đáp án phải là B..." style="border: 1px solid rgba(255,255,255,0.2);"></textarea>
            
            <div class="d-flex justify-content-end gap-2">
                <button class="btn btn-outline-light px-4 rounded-pill fw-bold" onclick="document.getElementById('${modalId}').remove()">HỦY</button>
                <button class="btn btn-danger px-4 rounded-pill fw-bold shadow-sm" onclick="window.submit_question_report(${qIndex})"><i class="bi bi-send-fill me-1"></i> GỬI BÁO CÁO</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
};

// 3. Hàm gửi Dữ liệu Cờ Báo Lỗi về Server
window.submit_question_report = function(qIndex) {
    let typeEl = document.getElementById(`report_type_${qIndex}`);
    let noteEl = document.getElementById(`report_note_${qIndex}`);
    if (!typeEl || !noteEl) return;

    let q = window.questions[qIndex];
    let reportData = {
        student_id: window.current_student_id || "Guest",
        subject: window.current_subject || "Không rõ môn",
        lesson: q.lesson || "Chưa rõ bài",
        question_id: q.id || (qIndex + 1),
        question_text: q.q || q[3] || "Nội dung trống",
        error_type: typeEl.value,
        note: noteEl.value.trim()
    };

    let modalId = 'report_question_modal';
    let btn = document.querySelector(`#${modalId} .btn-danger`);
    if(btn) { btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Đang gửi...`; btn.disabled = true; }

    if (typeof google !== 'undefined' && google.script) {
        google.script.run.withSuccessHandler(function(res) {
            window.show_toast("Gửi báo cáo thành công! Cảm ơn thầy/bạn đã góp ý.");
            document.getElementById(modalId).remove();
        }).withFailureHandler(function(err) {
            window.show_toast("Lỗi khi gửi báo cáo: " + err.message, true);
            if(btn) { btn.innerHTML = `<i class="bi bi-send-fill me-1"></i> GỬI BÁO CÁO`; btn.disabled = false; }
        }).submitQuestionReport(reportData); 
    } else {
        window.show_toast("Gửi báo cáo thành công (Chế độ giả lập).");
        document.getElementById(modalId).remove();
    }
};
// =========================================================================
// 🎁 HIỆU ỨNG COMBO & THỰC THI CỨU SAI
// =========================================================================
window.show_streak_animation = function(streak, giftAddCount, itemName) {
    if (streak < 2) return; 
    let toastId = 'streak_toast_anim';
    let existing = document.getElementById(toastId);
    if (existing) existing.remove();

    let hasItem = giftAddCount > 0;
    let animClass = hasItem ? 'animate__tada' : 'animate__bounceIn';
    
    let html = `
    <div id="${toastId}" class="animate__animated ${animClass}" style="position: fixed; top: 20%; left: 50%; transform: translateX(-50%) ${hasItem ? 'scale(1.2)' : 'scale(1)'}; z-index: 9999999; pointer-events: none; text-align: center;">
        <div style="font-size: 2.8rem; font-weight: 900; color: ${hasItem ? '#facc15' : '#38bdf8'}; -webkit-text-stroke: 1px rgba(0,0,0,0.5); text-shadow: 0 4px 15px rgba(0,0,0,0.5); line-height: 1;">
            🔥 COMBO x${streak}
        </div>
        <div class="text-white fw-bold mb-2" style="font-size: 0.9rem; text-shadow: 0 2px 5px rgba(0,0,0,0.8);">${streak} CÂU ĐÚNG LIÊN TIẾP!</div>
        ${hasItem ? `<div class="badge rounded-pill px-3 py-2 shadow-lg mb-1" style="background: linear-gradient(135deg, #10b981, #059669); border: 2px solid #fff; font-size: 0.9rem;"><i class="bi bi-stars me-1"></i> Nhận được: ${itemName}</div><br>
                     <div class="badge rounded-pill px-3 py-1 shadow-lg" style="background: linear-gradient(135deg, #f59e0b, #ef4444); border: 2px solid #fff; font-size: 0.9rem;"><i class="bi bi-gift-fill me-1"></i> +${giftAddCount} Quà Cứu Sai</div>` : ''}
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    if (hasItem && typeof confetti === 'function') confetti({ particleCount: 80, spread: 70, origin: { y: 0.3 } });

    // 🌟 NẾU CÓ RỚT QUÀ -> TẠO HIỆU ỨNG NHẢY CHO CẢ VÍ MENU VÀ VÍ MINI
    if (hasItem) {
        let badgesToAnimate = ['dashboard_inventory_badge', 'mini_inventory_badge'];
        badgesToAnimate.forEach(badgeId => {
            let invBadge = document.getElementById(badgeId);
            if (invBadge) {
                invBadge.classList.remove('animate__animated', 'animate__headShake');
                void invBadge.offsetWidth; 
                invBadge.classList.add('animate__animated', 'animate__headShake');
                invBadge.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.9)';
                setTimeout(() => invBadge.style.boxShadow = '', 1000);
            }
        });
    }

    setTimeout(() => { let el = document.getElementById(toastId); if(el) el.remove(); }, 1800);
};

// =========================================================================
// 🪄 HỆ THỐNG KỸ NĂNG NHẬP VAI (RPG SKILLS) & CHẤM ĐIỂM TƯƠNG TÁC
// =========================================================================
window.use_skill_5050 = function() {
  if (window.is_study_mode === false) { window.play_sound('error'); return window.show_toast("⚠️ KHÔNG KHẢ DỤNG: Kỹ năng bị vô hiệu hóa khi thi!", true); }
    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let inventory = parseInt(localStorage.getItem(invKey)) || 0;
    
    if (inventory < 3) return window.show_toast("Bạn cần 3 Quà để dùng Mắt Diều Hâu (50/50)!", true);

    let targetIdx = -1;
    let minDistance = Infinity;
    let cards = document.querySelectorAll('.question-card-tracker');
    
    // Quét tìm câu hỏi đang nằm giữa màn hình
    for (let i = 0; i < cards.length; i++) {
        let rect = cards[i].getBoundingClientRect();
        let qIndex = parseInt(cards[i].getAttribute('data-q-idx'));
        
        if (!questions[qIndex].done) {
            let dist = Math.abs(rect.top - 150); 
            if (dist < minDistance) {
                minDistance = dist;
                targetIdx = qIndex;
            }
        }
    }

    if (targetIdx === -1) return window.show_toast("Không tìm thấy câu hỏi trắc nghiệm nào chưa làm trong vùng nhìn!", true);

    let qIdx = targetIdx;
    let q = questions[qIdx];
    if (q.type !== 'single' && q.type !== 'mcq') return window.show_toast(`Câu ${qIdx + 1} không phải trắc nghiệm ABCD! Hãy cuộn đến câu khác.`, true);

    // Trừ 3 Quà
    inventory -= 3;
    localStorage.setItem(invKey, inventory);
    let invEl = document.getElementById('dashboard_inventory_count'); if (invEl) invEl.innerText = inventory;
    let miniInvEl = document.getElementById('mini_inventory_count'); if (miniInvEl) miniInvEl.innerText = inventory;

    let container = document.querySelector(`.question-card-tracker[data-q-idx="${qIdx}"]`);
    let btns = Array.from(container.querySelectorAll('.option-btn, .glass-option-btn, .ui1-option-btn, .ui2-option-btn, .ui3-option-btn'));
    
    const make_clean = (str) => String(str||"").replace(/^[A-D][\.\)]\s*/i, '').replace(/\{\{(.*?)::.*?::.*?\}\}/g, '$1').replace(/<[^>]*>/g, '').toLowerCase().normalize('NFC').replace(/\\/g, '').replace(/\s+/g, '').replace(/["“”]/g, '');
    let letter_ans = /^[A-D]$/i.test((q.a || "").trim()) ? (q.a || "").trim().toLowerCase() : "";
    let correct_ans = make_clean((q.a || "").trim());

    let wrongBtns = [];
    btns.forEach((b, opt_index) => {
        let b_val = b.innerText;
        let match = (b.getAttribute('onclick')||"").match(/set_ans\([^,]+,\s*(?:decodeURIComponent\()?['"]([^'"]+)['"]/);
        if(match) { try{ b_val=decodeURIComponent(match[1]); }catch(e){} }
        
        let is_match = false;
        if (letter_ans) {
            if (letter_ans === ['a','b','c','d'][opt_index] || new RegExp("^" + letter_ans + "[\\.\\)]", "i").test(b_val.trim())) is_match = true;
        } else if (make_clean(b_val) === correct_ans && make_clean(b_val) !== "") is_match = true; 
        
        if(!is_match) wrongBtns.push(b);
    });

    wrongBtns.sort(() => Math.random() - 0.5); 
    if(wrongBtns.length > 0) { wrongBtns[0].style.opacity = '0.1'; wrongBtns[0].style.pointerEvents = 'none'; }
    if(wrongBtns.length > 1) { wrongBtns[1].style.opacity = '0.1'; wrongBtns[1].style.pointerEvents = 'none'; }
    
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    window.show_toast(`👁️ MẮT DIỀU HÂU: Tốn 3 Quà! Đã loại bỏ 2 đáp án sai ở Câu ${qIdx + 1}!`);
};

window.use_skill_time = function() {
  if (window.is_study_mode === false) { window.play_sound('error'); return window.show_toast("⚠️ KHÔNG KHẢ DỤNG: Kỹ năng bị vô hiệu hóa khi thi!", true); }
    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let inventory = parseInt(localStorage.getItem(invKey)) || 0;
    if (inventory < 1) return window.show_toast("Cần 1 Quà tặng để thêm giờ!", true);

    inventory -= 1;
    localStorage.setItem(invKey, inventory);
    let invEl = document.getElementById('dashboard_inventory_count'); if (invEl) invEl.innerText = inventory;
    let miniInvEl = document.getElementById('mini_inventory_count'); if (miniInvEl) miniInvEl.innerText = inventory;

    window.time_left += 30; // Cộng thẳng 30 giây
    window.show_toast("⏳ NGƯNG ĐỌNG: Đã cộng thêm 30 giây vào bài thi!");
    let timerBox = document.getElementById('prog_text');
    if(timerBox) { timerBox.style.boxShadow = "0 0 20px #10b981"; timerBox.style.color = "#10b981"; setTimeout(() => { timerBox.style.boxShadow = ""; timerBox.style.color = ""; }, 1000); }
};

// =========================================================================
// 🎯 CHẤM ĐIỂM VÀ HIỂN THỊ XANH/ĐỎ NGAY LẬP TỨC (MODULE HOTSPOT)
// =========================================================================
window.check_hotspot_correct = function(q) {
    if (!q.ans_user) return false;
    let userAnsArr = q.ans_user.split('|').filter(a => a.trim() !== '');
    if (userAnsArr.length === 0) return false;

    let ansStr = String(q.a || q.answer || '').trim();
    if (!ansStr) return false;

    // Phân tích đề bài xem đang yêu cầu chế độ AND (đếm tất cả) hay OR (chỉ cần 1)
    let isAndMode = ansStr.includes('|AND|');
    let ansArray = isAndMode ? ansStr.replace(/\|AND\|/g, '|').split('|').filter(a => a.trim() !== '') : ansStr.split('|');

    if (isAndMode) {
        if (userAnsArr.length !== ansArray.length) return false;

        let hitZones = new Set();
        for (let j = 0; j < userAnsArr.length; j++) {
            let uParts = userAnsArr[j].split(',').map(Number);
            let uX = uParts[0], uY = uParts[1];
            let hitFound = false;

            for (let i = 0; i < ansArray.length; i++) {
                let singleAns = ansArray[i];
                let isHit = false;

                if (singleAns.startsWith('rect:')) {
                    let parts = singleAns.replace('rect:','').split(',').map(Number);
                    if (uX >= parts[0] && uX <= parts[0] + parts[2] && uY >= parts[1] && uY <= parts[1] + parts[3]) isHit = true;
                } else {
                    let parts = singleAns.replace('circle:','').split(',').map(Number);
                    let dx = uX - parts[0]; let dy = uY - parts[1];
                    if (Math.sqrt(dx*dx + dy*dy) <= parts[2]) isHit = true;
                }

                if (isHit) {
                    hitZones.add(i);
                    hitFound = true;
                    break; 
                }
            }
            if (!hitFound) return false; 
        }
        return hitZones.size === ansArray.length;

    } else {
        let uParts = userAnsArr[0].split(',').map(Number); 
        let uX = uParts[0], uY = uParts[1];

        for (let i = 0; i < ansArray.length; i++) {
            let singleAns = ansArray[i];
            if (singleAns.startsWith('rect:')) {
                let parts = singleAns.replace('rect:','').split(',').map(Number);
                if (uX >= parts[0] && uX <= parts[0] + parts[2] && uY >= parts[1] && uY <= parts[1] + parts[3]) return true;
            } else {
                let parts = singleAns.replace('circle:','').split(',').map(Number);
                let dx = uX - parts[0]; let dy = uY - parts[1];
                if (Math.sqrt(dx*dx + dy*dy) <= parts[2]) return true;
            }
        }
        return false;
    }
};

window.set_hotspot_ans = function(e, idx, imgEl) {
    if(questions[idx].done) return;
    
    let ansStr = String(questions[idx].a || questions[idx].answer || '').trim();
    let isAndMode = ansStr.includes('|AND|');
    let targetCount = isAndMode ? ansStr.replace(/\|AND\|/g, '|').split('|').filter(a => a.trim() !== '').length : 1;
    
    let rect = imgEl.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    
    let currentAns = questions[idx].ans_user || "";
    if (currentAns === "") {
        questions[idx].ans_user = `${x.toFixed(2)},${y.toFixed(2)}`;
    } else {
        let count = currentAns.split('|').length;
        if (count < targetCount) {
             questions[idx].ans_user += `|${x.toFixed(2)},${y.toFixed(2)}`;
        } else {
            return; 
        }
    }
    
    let tapCount = questions[idx].ans_user.split('|').length;

    let container = imgEl.closest('.position-relative');
    let tapHtml = `<div class="position-absolute translate-middle" style="left:${x}%; top:${y}%; width:24px; height:24px; background:radial-gradient(circle, #3b82f6 40%, transparent 60%); border:2px solid #fff; border-radius:50%; box-shadow:0 0 10px rgba(59,130,246,0.8); pointer-events:none; z-index:10;"></div>`;
    container.insertAdjacentHTML('beforeend', tapHtml);

    if (tapCount < targetCount) return; 

    let isCorrect = window.check_hotspot_correct(questions[idx]);
    let markers = container.querySelectorAll('div[style*="z-index:10"]');

    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let colKey = 'mcq_col_' + (window.current_student_id || 'guest');
    let inventory = parseInt(localStorage.getItem(invKey)) || 0;

    if (isCorrect) {
        markers.forEach(marker => {
            marker.style.background = 'rgba(34, 197, 94, 0.9)';
            marker.style.boxShadow = '0 0 25px #4ade80, inset 0 0 10px rgba(255,255,255,0.8)';
            marker.innerHTML = '<div class="d-flex w-100 h-100 align-items-center justify-content-center"><i class="bi bi-check-lg" style="color: white; font-size: 1.2rem; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));"></i></div>';
            marker.classList.add('animate__animated', 'animate__rubberBand');
        });

        if (typeof window.play_sound === 'function') window.play_sound('correct');

        if (window.is_eligible_for_reward !== false) {
            window.current_live_streak = (window.current_live_streak || 0) + 1;
            let giftAdd = 0; let itemDrop = "";
            let s = window.current_live_streak;

            if (s === 3) { giftAdd = 1; itemDrop = "10 Triệu BP 💰"; if (typeof window.speak_voice === 'function') window.speak_voice("Triple Kill!"); }
            else if (s === 5) { giftAdd = 2; itemDrop = "Giáp 3 Mũ 3 🛡️"; if (typeof window.speak_voice === 'function') window.speak_voice("Mega Kill!"); }
            else if (s === 7) { giftAdd = 2; itemDrop = "Vé Quay Gacha 🎟️"; if (typeof window.speak_voice === 'function') window.speak_voice("Unstoppable!"); }
            else if (s === 10) { giftAdd = 3; itemDrop = "Thẻ Nâng Cấp +5 🌟"; if (typeof window.speak_voice === 'function') window.speak_voice("Godlike!"); }
            else if (s === 12) { giftAdd = 3; itemDrop = "Vé Quay Gacha 🎟️"; if (typeof window.speak_voice === 'function') window.speak_voice("Legendary!"); }
            else if (s === 15) { giftAdd = 4; itemDrop = "Thẻ Đổi Tên 🏷️"; }
            else if (s === 20) { giftAdd = 5; itemDrop = "Thẻ Tạo Phòng 🚪"; }
            else if (s === 25) { giftAdd = 5; itemDrop = "Vé Quay Gacha 🎟️"; }
            else if (s === 30) { giftAdd = 6; itemDrop = "Booyah Pass 🎫"; }
            else if (s === 40) { giftAdd = 8; itemDrop = "Thẻ ICON +8 🏆"; }
            else if (s === 50) { giftAdd = 10; itemDrop = "Gói Cầu Thủ Gullit 👑"; }

            if (giftAdd > 0) {
                if (typeof window.play_sound === 'function') window.play_sound('reward');
                inventory += giftAdd;
                localStorage.setItem(invKey, inventory);
                let colList = [];
                try { colList = JSON.parse(localStorage.getItem(colKey) || "[]"); } catch(e) {}
                colList.push(itemDrop);
                localStorage.setItem(colKey, JSON.stringify(colList));
                if (typeof google !== 'undefined') google.script.run.syncUserInventory(window.current_student_id, inventory, JSON.stringify(colList));

                let invEl = document.getElementById('dashboard_inventory_count'); if (invEl) invEl.innerText = inventory;
                let miniCountStr = document.getElementById('mini_inventory_count'); if (miniCountStr) miniCountStr.innerText = inventory;

                let badge = document.getElementById('mini_inventory_badge');
                if (badge) { badge.classList.remove('animate__tada'); void badge.offsetWidth; badge.classList.add('animate__animated', 'animate__tada'); }

                let iconMatch = itemDrop.match(/([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u2B00-\u2BFF])/);
                let itemIcon = iconMatch ? iconMatch[0] : "🎁"; let itemNameOnly = itemDrop.replace(itemIcon, '').trim();

                let overlayId = 'combo_anim_' + Date.now();
                let html = `
                <div id="${overlayId}" class="position-fixed d-flex flex-column align-items-end justify-content-center" style="top: 70px; right: 15px; z-index: 9999999; pointer-events: none;">
                    <div id="${overlayId}_box" class="animate__animated animate__bounceInRight text-end" style="animation-duration: 0.5s;">
                        <div class="fw-bold" style="font-size: 1.2rem; color: #facc15; text-shadow: 0 2px 5px rgba(0,0,0,0.8); line-height: 1; -webkit-text-stroke: 0.5px #b45309; font-style: italic;">COMBO ${s}!</div>
                        <div class="d-flex align-items-center justify-content-end gap-1 mt-1 p-1 px-2 rounded-pill shadow" style="background: rgba(15, 23, 42, 0.95); border: 1px solid #38bdf8;">
                            <div class="text-end" style="line-height: 1.1;"><div class="text-info fw-bold text-uppercase" style="font-size: 0.6rem;">${itemNameOnly}</div><div class="text-white fw-bold" style="font-size: 0.55rem;">+${giftAdd} Quà</div></div>
                            <span style="font-size: 1.1rem; filter: drop-shadow(0 0 5px #38bdf8);">${itemIcon}</span>
                        </div>
                    </div>
                </div>`;
                document.body.insertAdjacentHTML('beforeend', html);

                setTimeout(() => {
                    let elBox = document.getElementById(overlayId + '_box');
                    if(elBox) elBox.classList.replace('animate__bounceInRight', 'animate__zoomOutUp');
                    setTimeout(() => { let el = document.getElementById(overlayId); if(el) el.remove(); }, 500);
                }, 1200);

                if (typeof window.show_streak_animation === 'function') window.show_streak_animation(window.current_live_streak, giftAdd, itemDrop);
            } else {
                if (typeof window.show_streak_animation === 'function') window.show_streak_animation(window.current_live_streak, 0, "");
            }
        }
    } else {
        markers.forEach(marker => {
            marker.style.border = '2px dashed #fff';
            marker.style.background = 'rgba(239, 68, 68, 0.9)';
            marker.style.boxShadow = '0 0 20px #ef4444, inset 0 0 15px rgba(0,0,0,0.5)';
            marker.innerHTML = '<div class="d-flex w-100 h-100 align-items-center justify-content-center"><i class="bi bi-x-lg" style="color: white; font-size: 1rem; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));"></i></div>';
            marker.classList.add('animate__animated', 'animate__headShake');
        });

        if (typeof window.play_sound === 'function') window.play_sound('error');
        window.current_live_streak = 0;

        if (inventory >= 4) {
            let parentW100 = imgEl.closest('.w-100'); 
            let reviveBtnId = `revive_btn_${idx}`;
            if (!document.getElementById(reviveBtnId)) {
                let reviveHtml = `
                <div id="${reviveBtnId}" class="mt-3 text-center animate__animated animate__bounceIn">
                    <button class="btn btn-warning rounded-pill px-4 py-2 fw-bold shadow-lg"
                            style="background: linear-gradient(135deg, #f59e0b, #ef4444); border: 2px solid #fff; color: white;"
                            onclick="window.use_revive_item(${idx}, this)">
                        <i class="bi bi-heart-pulse-fill me-1"></i> Dùng 4 Quà để Chọn Lại (Còn ${inventory})
                    </button>
                </div>`;
                parentW100.insertAdjacentHTML('beforeend', reviveHtml);
            }
        }
    }

    questions[idx].done = true;
    if(typeof window.update_progress_bar === 'function') window.update_progress_bar(idx, questions.length);
    if(typeof check_complete === 'function') check_complete();
    if (typeof window.auto_save_exam_draft === 'function') window.auto_save_exam_draft(); // 🌟 LƯU NHÁP TỰ ĐỘNG
};

window.select_arrange = function(btn, qIdx, val) {
    if(questions[qIdx].done) return;
    if(!questions[qIdx].ans_user) questions[qIdx].ans_user = [];
    
    let resBox = document.getElementById(`arrange_result_${qIdx}`);
    let badge = document.createElement('span');
    badge.className = "badge bg-info text-dark me-1 mb-1 animate__animated animate__zoomIn shadow-sm";
    badge.style.fontSize = "0.9rem"; badge.innerText = val;
    resBox.appendChild(badge);
    
    btn.style.opacity = '0.2'; btn.style.pointerEvents = 'none'; // Làm mờ thẻ đã chọn
    questions[qIdx].ans_user.push(val);
    
    if(questions[qIdx].ans_user.length === questions[qIdx].opts.length) {
        questions[qIdx].done = true;
        if(typeof window.update_progress_bar === 'function') window.update_progress_bar(qIdx, questions.length);
        if(typeof check_complete === 'function') check_complete();
    }
};

window.reset_arrange = function(qIdx) {
    if(questions[qIdx].done && window.quiz_end_time) return; // Không cho sửa nếu đã nộp bài
    questions[qIdx].done = false;
    questions[qIdx].ans_user = [];
    document.getElementById(`arrange_result_${qIdx}`).innerHTML = '';
    let btns = document.getElementById(`arrange_pool_${qIdx}`).querySelectorAll('button');
    btns.forEach(b => { b.style.opacity = '1'; b.style.pointerEvents = 'auto'; });
    if(typeof window.update_progress_bar === 'function') window.update_progress_bar();
    if(typeof check_complete === 'function') check_complete();
};

window.check_arrange_correct = function(q) {
    if(!q.ans_user || !Array.isArray(q.ans_user)) return false;
    let userStr = q.ans_user.join('').toLowerCase();
    let correctStr = String(q.a || q.answer || '').replace(/[\s\-\|,]/g, '').toLowerCase(); // VD: A-C-B-D -> acbd
    return userStr === correctStr;
};
// =====================================================================
// 🚀 ENGINE VIDEO & DRAG-DROP (ĐÃ NÂNG CẤP CHO SUPABASE)
// =====================================================================
window.clip_intervals = {};

window.init_clip_listen_ui = function(idx, fileId) {
    window.fetch_clip_video_listen(idx, fileId);
    window.init_clip_sortable(idx);
    
    let cardBody = document.getElementById('clip_listen_main_' + idx).closest('.card-body, .ui2-case-panel, .glass-quiz-container, .ui3-lab-container');
    if (cardBody) {
        let titleEl = cardBody.querySelector('.card-title, .question-text, h5');
        if (titleEl) titleEl.innerHTML = '<div class="d-flex align-items-center mb-1"><i class="bi bi-music-note-list fs-3 text-warning me-2"></i><span class="text-info fw-bold fs-5">SẮP XẾP ÂM THANH</span></div>';
    }
};

window.fetch_clip_video_listen = function(idx, fileUrl) {
    if (!fileUrl) return;
    
    let vidEl = document.getElementById('student_clip_vid_' + idx);
    let loadingEl = document.getElementById('clip_loading_' + idx);
    
    if (!vidEl) return;

    // 🌟 ĐÃ FIX: Hỗ trợ chạy ĐỒNG THỜI Link Supabase mới VÀ ID Google Drive cũ
    let finalUrl = fileUrl;
    if (!finalUrl.startsWith('http')) {
        // Biến ID cũ thành link stream trực tiếp từ Google Drive
        finalUrl = 'https://drive.google.com/uc?export=download&id=' + fileUrl;
    }

    if (/^https?:\/\//i.test(finalUrl)) {
        vidEl.src = finalUrl;
        
        vidEl.setAttribute('playsinline', '');
        vidEl.setAttribute('webkit-playsinline', '');
        vidEl.setAttribute('preload', 'auto');
        vidEl.muted = false; 
        
        vidEl.addEventListener('loadeddata', () => {
            if (loadingEl) loadingEl.remove();
            vidEl.style.display = 'block';
        });
        
        vidEl.addEventListener('error', () => {
            if (loadingEl) loadingEl.innerHTML = '<div class="text-danger small fw-bold">Lỗi kết nối Video! Vui lòng kiểm tra lại link.</div>';
        });
    } else {
        if (loadingEl) loadingEl.innerHTML = '<div class="text-danger small fw-bold">Định dạng URL Video không hợp lệ!</div>';
    }
};

// Hàm phát audio thuần túy, sạch sẽ
window.play_audio_slice = function(idx, start, end) {
    let vidEl = document.getElementById('student_clip_vid_' + idx);
    if (!vidEl || isNaN(start) || isNaN(end)) return;

    // 🌟 ĐÃ FIX: Bắt buộc tua đến đúng giây trước rồi mới Play để luồng Audio không bị kẹt
    vidEl.currentTime = start;
    let playPromise = vidEl.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            if (window.clip_intervals[idx]) clearInterval(window.clip_intervals[idx]);
            window.clip_intervals[idx] = setInterval(() => {
                if (vidEl.currentTime >= end) {
                    vidEl.pause();
                    clearInterval(window.clip_intervals[idx]);
                }
            }, 100);
        }).catch(error => {
            console.log('Bị chặn Play do thiết bị (iPad/PC):', error);
            // Mẹo lách luật Safari/Chrome: Tắt tiếng -> Tua -> Play -> Bật tiếng
            vidEl.muted = true;
            vidEl.currentTime = start;
            vidEl.play().then(() => {
                vidEl.muted = false;
            }).catch(e => console.log('Chặn hoàn toàn', e));
        });
    }
};
window.play_full_clip = function(idx) {
    let vidEl = document.getElementById('student_clip_vid_' + idx);
    if(!vidEl) return;
    if(window.clip_intervals[idx]) clearInterval(window.clip_intervals[idx]);
    
    let p = vidEl.play();
    if (p !== undefined) {
        p.then(() => { vidEl.currentTime = 0; }).catch(e => console.log("Thiết bị chặn autoplay:", e));
    }
};

window.init_clip_sortable = function(idx) {
    let el = document.getElementById('sortable_zone_' + idx);
    if (!el || el.dataset.init === 'true') return;
    el.dataset.init = 'true';

    el.querySelectorAll('.audio-card').forEach(function(card) {
        card.style.webkitTouchCallout = 'none'; 
        card.style.userSelect = 'none';
    });

    let setupSortable = function() {
        new Sortable(el, {
            animation: 150,
            ghostClass: 'opacity-50',
            chosenClass: 'audio-card-chosen',
            forceFallback: true,        
            fallbackClass: 'sortable-fallback',
            fallbackTolerance: 5, 
            delay: 200, 
            // 🌟 Đã xóa delayOnTouchOnly để đồng bộ cả iPad và PC
        });
    };

    if (typeof Sortable === 'undefined') {
        let script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js';
        script.onload = setupSortable;
        document.head.appendChild(script);
    } else {
        setupSortable();
    }
};

// 🌟 THUẬT TOÁN ĐÃ SỬA: ĐÁNH DẤU HOÀN THÀNH KỂ CẢ KHI SAI ĐỂ HIỆN NÚT NỘP BÀI
window.check_audio_order = function(idx, btnEl) {
    let zone = document.getElementById(`sortable_zone_${idx}`);
    let cards = zone.querySelectorAll('.audio-card');
    let correctCount = 0;
    let totalCards = cards.length;
    let userAnsArray = [];

    cards.forEach((card, pos) => {
        let cardId = parseInt(card.getAttribute('data-id'));
        userAnsArray.push(cardId); 
        
        card.classList.remove('bg-white', 'bg-success', 'bg-danger', 'border-secondary', 'border-success', 'border-danger');
        let textEl = card.querySelector('.text-content');
        if(textEl) textEl.classList.remove('text-white', 'text-dark');
        
        if (cardId === pos) {
            card.classList.add('bg-success', 'border-success');
            if(textEl) textEl.classList.add('text-white');
            correctCount++;
        } else {
            card.classList.add('bg-danger', 'border-danger');
            if(textEl) textEl.classList.add('text-white');
        }
    });

    let score10 = (correctCount / totalCards) * 10;

    if (correctCount === totalCards) {
        questions[idx].ans_user = questions[idx].answer || questions[idx].a; 
        questions[idx].score = 1; 
        
        if (typeof window.play_sound === 'function') window.play_sound('correct');
        
        // 🌟 BÁO HỆ THỐNG LÀ ĐÃ XONG ĐỂ HIỆN NÚT NỘP BÀI
        questions[idx].done = true;
        if(typeof window.update_progress_bar === 'function') window.update_progress_bar(idx, questions.length);
        if(typeof check_complete === 'function') check_complete(); 
        
        if(btnEl) btnEl.classList.add('d-none'); 
        if(typeof window.show_toast === 'function') window.show_toast("🏆 Quá xuất sắc! Bạn đạt 10/10 điểm phần này!");
    } else {
        questions[idx].ans_user = 'SAI_' + userAnsArray.join('-');
        questions[idx].score = score10 / 10; // Lưu tỷ lệ đúng
        
        if (typeof window.play_sound === 'function') window.play_sound('error');
        zone.classList.add('animate__animated', 'animate__headShake');
        if(btnEl) btnEl.classList.add('d-none');

        // 🌟 THÊM MỚI: BÁO HỆ THỐNG LÀ ĐÃ LÀM (DÙ SAI) ĐỂ KHÔNG BỊ KẸT NÚT NỘP BÀI
        questions[idx].done = true;
        if(typeof window.update_progress_bar === 'function') window.update_progress_bar(idx, questions.length);
        if(typeof check_complete === 'function') check_complete(); 
        
        let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
        let inventory = parseInt(localStorage.getItem(invKey)) || 0;
        let actionContainer = document.getElementById(`audio_action_container_${idx}`);
        
        if (actionContainer && !document.getElementById(`revive_audio_btn_${idx}`)) {
            actionContainer.insertAdjacentHTML('beforeend', `
            <div id="revive_audio_btn_${idx}" class="text-center animate__animated animate__bounceIn mt-2">
                <button class="btn btn-warning rounded-pill px-4 py-2 fw-bold shadow-lg w-100" style="background: linear-gradient(135deg, #f59e0b, #ef4444); border: 2px solid #fff; color: white;" onclick="window.use_revive_audio_item(${idx}, this)">
                    <i class="bi bi-heart-pulse-fill me-1"></i> Dùng 4 Quà sửa các ô Đỏ (Còn ${inventory})
                </button>
                <div class="text-white-50 small mt-2 fw-bold"><i class="bi bi-bar-chart-fill me-1"></i> Tạm tính: ${score10.toFixed(1)} / 10 điểm</div>
            </div>`);
        }
        
        setTimeout(() => { zone.classList.remove('animate__animated', 'animate__headShake'); }, 1000);
    }
};

window.use_revive_audio_item = function(idx, btnEl) {
    // 🌟 THÊM KHÓA BẢO MẬT: CHẶN CỨU SAI TRONG LÚC THI THẬT
    if (window.is_study_mode === false) { 
        if (typeof window.play_sound === 'function') window.play_sound('error'); 
        return window.show_toast("⚠️ TÍNH NĂNG BỊ KHÓA: Không thể Cứu sai trong lúc thi!", true); 
    }

    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let inventory = parseInt(localStorage.getItem(invKey)) || 0;
    if (inventory < 4) return window.show_toast("Bạn cần ít nhất 4 Quà để sửa sai nhé!", true);

    // Trừ quà
    localStorage.setItem(invKey, inventory - 4);
    let invEl = document.getElementById('dashboard_inventory_count'); if (invEl) invEl.innerText = inventory - 4;
    let miniInvEl = document.getElementById('mini_inventory_count'); if (miniInvEl) miniInvEl.innerText = inventory - 4;

    // RÚT LẠI TRẠNG THÁI ĐỂ CHẤM LẠI TỪ ĐẦU
    questions[idx].done = false;
    questions[idx].ans_user = ""; 
    questions[idx].score = 0;
    if(typeof window.update_progress_bar === 'function') window.update_progress_bar(idx, questions.length);

    btnEl.parentElement.remove();
    let actionContainer = document.getElementById(`audio_action_container_${idx}`);
    let checkBtn = actionContainer.querySelector('button[onclick^="window.check_audio_order"]');
    if(checkBtn) checkBtn.classList.remove('d-none');

    let zone = document.getElementById(`sortable_zone_${idx}`);
    let cards = zone.querySelectorAll('.audio-card');
    cards.forEach((card) => {
        if (card.classList.contains('bg-danger')) {
            card.classList.remove('bg-danger', 'border-danger');
            card.classList.add('bg-white', 'border-secondary');
            let textEl = card.querySelector('.text-content');
            if (textEl) {
                textEl.classList.remove('text-white');
                textEl.classList.add('text-dark');
            }
        }
    });

    if(typeof window.show_toast === 'function') window.show_toast("🎁 Xóa màu Đỏ thành công! Hãy kéo đổi chỗ các ô đó nhé.");
};