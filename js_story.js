// =========================================================================
// 🗺️ HÀM 1: VẼ BẢN ĐỒ NHÚNG (ĐÃ XÓA NHÂN VẬT, CHỈ GIỮ HIỆU ỨNG PHÁT SÁNG NÚT)
// =========================================================================
window.draw_persistent_map = function(currentIndex) {
    let canvas = document.getElementById('persistent_map_canvas');
    if (!canvas) return;
    canvas.style.position = 'relative';

    let data = window.current_story_data;
    if (!data || data.length === 0) return;

    data[currentIndex].visited = true; 
    let mapHash = "MAP_" + data.length + "_" + (data[0].q || data[0][3] || "").substring(0, 10);

    const applyMapState = function() {
        if (!canvas.querySelector('svg') && window.cached_story_map_svg) {
            canvas.innerHTML = window.cached_story_map_svg;
        }
        
        let nodes = canvas.querySelectorAll('.node');
        
        data.forEach((q, i) => {
            let targetText = `${i + 1}`; 
            nodes.forEach(node => {
                let textLabel = node.querySelector('.nodeLabel');
                let cleanText = textLabel ? textLabel.textContent.trim() : '';

                if (cleanText === targetText) {
                    let shape = node.querySelector('rect, circle, polygon');
                    if (shape) {
                        if (i === currentIndex) {
                            // 📍 ĐANG ĐỨNG: Phát sáng cực đẹp để sinh viên biết mình đang ở đâu
                            shape.style.fill = '#10b981';
                            shape.style.stroke = '#ffffff';
                            shape.style.strokeWidth = '3px';
                            shape.style.filter = 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.9))';
                            
                            // 🌟 CUỘN BẢN ĐỒ TỰ ĐỘNG ĐẾN NODE HIỆN TẠI (Đã tách khỏi nhân vật)
                            setTimeout(() => {
                                let cRect = canvas.getBoundingClientRect();
                                let nRect = shape.getBoundingClientRect();
                                let scrollPos = canvas.scrollLeft + (nRect.left - cRect.left) - (cRect.width / 2) + (nRect.width / 2);
                                canvas.scrollTo({ left: scrollPos, behavior: 'smooth' });
                            }, 150);

                        } else if (q.visited) {
                            // CÁC ĐIỂM ĐÃ QUA
                            shape.style.fill = '#0f172a'; shape.style.stroke = '#38bdf8'; shape.style.strokeWidth = '2px';
                        } else {
                            // CÁC ĐIỂM CHƯA TỚI
                            shape.style.fill = '#1e293b'; shape.style.stroke = '#334155'; shape.style.strokeWidth = '1px';
                        }
                    }
                }
            });
        });
    };

    if (window.cached_story_map_svg && window.cached_map_hash === mapHash) {
        applyMapState();
    } else {
        canvas.innerHTML = `<div class="text-center text-white-50 small mt-3"><div class="spinner-border spinner-border-sm text-info me-2"></div>Đang phác thảo...</div>`;
        let graph = "graph LR\n"; 
        data.forEach((q, i) => {
            let navStr = String(q.nav !== undefined ? q.nav : (q[12] !== undefined ? q[12] : "")).trim().toUpperCase();
            let m = navStr.match(/ID:\s*([A-Z0-9_]+)/i);
            let id = m ? m[1].trim() : `NODE_${i}`;
            graph += `${id}["${i + 1}"]\n`; 
            if (navStr) {
                let routingPart = navStr.includes('|') ? navStr.split('|')[1] : navStr;
                routingPart.split(/[,;]/).forEach(part => {
                    if (part.includes(':')) {
                        let target = part.split(':')[1].trim().toUpperCase();
                        graph += `${id} --> ${target}\n`;
                    }
                });
            }
        });
        const renderMermaid = function() {
            mermaid.initialize({ startOnLoad: false, theme: 'dark' });
            mermaid.render('persistent_mermaid_' + Date.now(), graph).then(result => {
                window.cached_story_map_svg = result.svg; window.cached_map_hash = mapHash;         
                canvas.innerHTML = result.svg; applyMapState(); 
            });
        };
        if (typeof mermaid !== 'undefined') renderMermaid();
        else { let s = document.createElement('script'); s.src = "https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"; s.onload = renderMermaid; document.head.appendChild(s); }
    }
};

// =========================================================================
// 🚀 HÀM 2: KHỞI TẠO HÀNH TRÌNH (TÍCH HỢP RADAR QUÉT ID VÀ BỘ ĐẾM ĐIỂM)
// =========================================================================
window.start_story_mode = function(lesson_name) {
    // 1. Lọc sạch hàng trống
    window.current_story_data = window.global_questions.filter(q => {
        let name = q.lessonname || q.lesson || ""; 
        let content = q.q || q[3] || ""; 
        return name.trim() === lesson_name.trim() && String(content).trim() !== "";
    });
    
    if(!window.current_story_data || window.current_story_data.length === 0) {
        alert("Không tìm thấy kịch bản hợp lệ!"); return;
    }

    // 🌟 BẢN VÁ LỖI: ĐỒNG BỘ DỮ LIỆU SANG FLASHCARD & GAME 🌟
    // Tự động rút trích Tình huống làm Câu hỏi, và Cách xử trí đúng làm Đáp án
    window.questions = window.current_story_data.map(q => {
        let correctOpt = String(q.a || q.answer || q[8] || "").trim().toUpperCase();
        let ansText = correctOpt; // Mặc định
        
        // Trích xuất nội dung thực sự của các đáp án A, B, C, D
        let oA = q.opts && q.opts.length > 0 ? q.opts[0] : (q.optA || q[5] || q[4] || "");
        let oB = q.opts && q.opts.length > 1 ? q.opts[1] : (q.optB || q[6] || q[5] || "");
        let oC = q.opts && q.opts.length > 2 ? q.opts[2] : (q.optC || q[7] || q[6] || "");
        let oD = q.opts && q.opts.length > 3 ? q.opts[3] : (q.optD || q[8] || q[7] || "");

        // Khớp đáp án đúng với nội dung
        if(correctOpt === 'A') ansText = oA;
        else if(correctOpt === 'B') ansText = oB;
        else if(correctOpt === 'C') ansText = oC;
        else if(correctOpt === 'D') ansText = oD;

        return {
            ...q,
            id: q.id || Math.random().toString(36).substring(2, 10), // Cấp ID ngẫu nhiên để Game nhận diện
            q: q.q || q[4] || q[3] || "Tình huống lâm sàng",
            a: ansText
        };
    });
    window.current_fc_idx = 0; // Đặt lại bộ đếm Flashcard về thẻ đầu tiên
    // 🌟 KẾT THÚC BẢN VÁ 🌟

    let idTracker = {}; // Bộ nhớ tạm để dò mìn
    let duplicateIDs = []; // Danh sách các ID bị trùng

    // 2. Cấp phát Định danh (ID) và Kiểm tra trùng lặp
    window.current_story_data.forEach((q, index) => {
        let navStr = String(q.nav || q[13] || q[12] || "").trim().toUpperCase();
        let customIdMatch = navStr.match(/ID:([A-Z0-9_]+)/i);
        
        if (customIdMatch) {
            q.custom_id = customIdMatch[1].trim().toUpperCase();
        } else {
            q.custom_id = String(index + 1); 
        }

        // THUẬT TOÁN RADAR: Bắt quả tang ID trùng lặp
        if (idTracker[q.custom_id]) {
            if (!duplicateIDs.includes(q.custom_id)) duplicateIDs.push(q.custom_id);
        } else {
            idTracker[q.custom_id] = true;
        }

        q.unique_node_id = index + 1; 
    });

    // 3. BÁO ĐỘNG NẾU CÓ MÌN (ID TRÙNG)
    if (duplicateIDs.length > 0) {
        alert("⚠️ HỆ THỐNG PHÁT HIỆN LỖI KỊCH BẢN!\n\nBạn đang đặt TRÙNG TÊN các ID sau trong file Excel: " + duplicateIDs.join(", ") + "\n\nHãy mở Google Sheets đổi tên lại để mỗi ID là duy nhất nhé!");
    }

    // =========================================================
    // ⏱️ KHỞI TẠO ĐỒNG HỒ BẤM GIỜ CHO LOG_ONTAP
    // =========================================================
    window.startTime = new Date();
    window.start_time = window.startTime;
    window.quiz_start_time = window.startTime;
    window.timeStart = window.startTime;

    // =========================================================
    // 🌟 KHỞI TẠO BỘ TÍNH ĐIỂM ĐỘNG
    // =========================================================
    window.story_score_tracker = { correct: 0, total: 0, attempts: {} };

    // 🌟 ĐÃ THÊM: TRIỆU HỒI ĐỒNG HỒ ĐẾM NGƯỢC Ở ĐÂY
    if (typeof window.start_countdown === 'function') {
        window.start_countdown();
    }

    render_story_node(0);
};

// =========================================================================
// 🌟 HÀM 3: VẼ GIAO DIỆN CHẶNG (ĐÃ THU GỌN SƠ ĐỒ & NÚT BẤM)
// =========================================================================
window.render_story_node = function(nodeIndex) {
  if (typeof window.update_progress_bar === 'function') {
        window.update_progress_bar();
    }

    let area = document.getElementById('quiz_area'); 
    let q = window.current_story_data[nodeIndex];
    
    let rawQ = q ? (q.q || q[4] || q[3] || "") : "";
    rawQ = String(rawQ).replace(/(^|\s|>)(["“])([^"”]+)(["”])(?=\s|<|$|[.,!?;:])/g, '$1<strong class="text-warning">$2$3$4</strong>');
    let rawA = q ? (q.opts && q.opts.length > 0 ? q.opts[0] : (q.optA || q[5] || q[4] || "")) : "";
    
    if (!q || (String(rawQ).trim() === "" && String(rawA).trim() === "")) { 
        if(typeof window.render_story_victory === 'function') window.render_story_victory(); 
        return; 
    }
        
    let preservedMap = document.getElementById('persistent_map_canvas');
    if (preservedMap) {
        document.body.appendChild(preservedMap); 
        preservedMap.style.display = 'none';     
    }

    let rawB = q.opts && q.opts.length > 1 ? q.opts[1] : (q.optB || q[6] || q[5] || "");      
    let rawC = q.opts && q.opts.length > 2 ? q.opts[2] : (q.optC || q[7] || q[6] || "");      
    let rawD = q.opts && q.opts.length > 3 ? q.opts[3] : (q.optD || q[8] || q[7] || "");      
    let media = q.image || q.multimedia || q[12] || q[11] || ""; 

    let qText = (typeof window.apply_magic_vocab === 'function') ? window.apply_magic_vocab(rawQ) : rawQ;
    let optA  = (typeof window.apply_magic_vocab === 'function') ? window.apply_magic_vocab(rawA) : rawA;
    let optB  = (typeof window.apply_magic_vocab === 'function') ? window.apply_magic_vocab(rawB) : rawB;
    let optC  = (typeof window.apply_magic_vocab === 'function') ? window.apply_magic_vocab(rawC) : rawC;
    let optD  = (typeof window.apply_magic_vocab === 'function') ? window.apply_magic_vocab(rawD) : rawD;

    qText = String(qText).replace(/^\d+[\.\-\)]\s*/, '').replace(/<n>/g, "");

    let mediaHtml = '';
    if (media && String(media).trim() !== '') {
        if (String(media).match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
            mediaHtml = `<div class="text-center mb-3"><img src="${media}" class="img-fluid rounded-3 shadow-sm border border-secondary border-opacity-25" style="max-height: 180px; object-fit: cover;"></div>`;
        } else if (String(media).includes('youtube.com') || String(media).includes('youtu.be')) {
            let ytId = String(media).split('v=')[1] || String(media).split('youtu.be/')[1];
            if(ytId) {
                let ampersandPosition = ytId.indexOf('&');
                if(ampersandPosition !== -1) ytId = ytId.substring(0, ampersandPosition);
                mediaHtml = `<div class="ratio ratio-16x9 mb-3 rounded-3 overflow-hidden shadow-sm border border-secondary border-opacity-25"><iframe src="https://www.youtube.com/embed/${ytId}?rel=0" allowfullscreen></iframe></div>`;
            }
        }
    }

    // 🌟 THU NHỎ KÍCH THƯỚC BADGE A, B, C, D
    let badgeStyle = `width: 26px; height: 26px; background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.4); color: #38bdf8; box-shadow: 0 0 10px rgba(14, 165, 233, 0.2); font-size: 0.9rem; margin-right: 10px;`;
    let badgeA = `<span class="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm flex-shrink-0" style="${badgeStyle}">A</span>`;
    let badgeB = badgeA.replace('>A<', '>B<');
    let badgeC = badgeA.replace('>A<', '>C<');
    let badgeD = badgeA.replace('>A<', '>D<');

    let html = `
    <style>
        @media (max-width: 767px) {
            .story-mobile-pad { padding-left: 0 !important; padding-right: 0 !important; padding-top: 0 !important; }
            .story-mobile-edge { border-radius: 0 !important; border-left: none !important; border-right: none !important; margin-bottom: 0 !important; }
            .story-inner-pad { padding: 15px !important; }
        }
        @media (min-width: 992px) { 
            .border-end-lg { border-right: 1px solid rgba(255,255,255,0.15) !important; } 
        }
        .story-opt-btn { transition: all 0.2s ease; }
        .story-opt-btn:hover:not(.opacity-50) { background: rgba(14, 165, 233, 0.1) !important; transform: translateX(5px); }
        
        /* 🌟 ÉP SƠ ĐỒ MERMAID NHỎ LẠI */
        #persistent_map_canvas svg {
            max-height: 140px !important; /* Giới hạn chiều cao sơ đồ */
            width: auto !important;
            margin: 0 auto;
            display: block;
        }
    </style>

    <div class="w-100 mx-auto story-mobile-pad pt-0 pb-md-3 animate__animated animate__fadeIn mt-0" style="max-width: 1000px;">

        <div class="p-0 rounded-4 story-mobile-edge shadow-lg overflow-hidden" style="background: transparent !important; backdrop-filter: none !important; border: 1px solid rgba(255,255,255,0.15) !important;">
            <div class="row g-0">
                
                <div class="col-lg-7 p-3 p-md-4 story-inner-pad border-end-lg position-relative">
                    <div style="position: relative; z-index: 1;">
                        
                        <div id="map_placeholder"></div>
                        ${mediaHtml}
                        
                        <div class="text-white lh-base custom-scrollbar mt-3" style="font-size: 1.05rem; max-height: 35vh; overflow-y: auto; padding-right: 5px;">
                            ${qText}
                        </div>
                    </div>
                </div>

                <div class="col-lg-5 p-3 p-md-4 story-inner-pad d-flex flex-column" style="background: transparent !important; max-height: 100%;">
                    <div id="options_container" class="flex-shrink-0">
                        <h6 class="text-white-50 mb-3 text-uppercase fw-bold" style="font-size: 0.8rem; letter-spacing: 1px;">Quyết định của bạn:</h6>
                        
                        <div class="d-flex flex-column gap-2">
                            ${rawA ? `<button class="btn text-start glass-action-btn py-2 px-3 text-white rounded-3 border border-info border-opacity-25 story-opt-btn" onclick="handle_story_choice('A', ${nodeIndex}, this)"><div class="d-flex align-items-center">${badgeA} <span style="font-size: 0.9rem; line-height: 1.3;">${optA}</span></div></button>` : ''}
                            ${rawB ? `<button class="btn text-start glass-action-btn py-2 px-3 text-white rounded-3 border border-info border-opacity-25 story-opt-btn" onclick="handle_story_choice('B', ${nodeIndex}, this)"><div class="d-flex align-items-center">${badgeB} <span style="font-size: 0.9rem; line-height: 1.3;">${optB}</span></div></button>` : ''}
                            ${rawC ? `<button class="btn text-start glass-action-btn py-2 px-3 text-white rounded-3 border border-info border-opacity-25 story-opt-btn" onclick="handle_story_choice('C', ${nodeIndex}, this)"><div class="d-flex align-items-center">${badgeC} <span style="font-size: 0.9rem; line-height: 1.3;">${optC}</span></div></button>` : ''}
                            ${rawD ? `<button class="btn text-start glass-action-btn py-2 px-3 text-white rounded-3 border border-info border-opacity-25 story-opt-btn" onclick="handle_story_choice('D', ${nodeIndex}, this)"><div class="d-flex align-items-center">${badgeD} <span style="font-size: 0.9rem; line-height: 1.3;">${optD}</span></div></button>` : ''}
                        </div>
                    </div>

                    <div id="inline_feedback_container" class="d-none flex-column mt-3 animate__animated animate__fadeIn flex-grow-1 overflow-hidden">
                        <div id="inline_sf_hint" class="text-white lh-base custom-scrollbar p-3 rounded-3 mb-3 flex-grow-1" style="font-size: 0.9rem; border: 1px solid transparent; overflow-y: auto;"></div>
                        <button id="inline_sf_next_btn" class="btn w-100 fw-bold py-2 rounded-3 text-uppercase shadow-sm flex-shrink-0" style="font-size: 0.9rem; letter-spacing: 1px;"></button>
                    </div>

                </div>
            </div>
        </div>
    </div>
    `;

    if (area && area.parentElement) {
        area.parentElement.classList.remove('container');
        area.parentElement.classList.add('container-fluid', 'px-0');
    }

    area.innerHTML = html;

    let placeholder = document.getElementById('map_placeholder');
    if (placeholder) {
        if (preservedMap) {
            preservedMap.style.display = 'block';
            placeholder.replaceWith(preservedMap); 
        } else {
            let newMap = document.createElement('div');
            newMap.id = 'persistent_map_canvas';
            // 🌟 ÉP KHUNG BẢN ĐỒ NHỎ LẠI
            newMap.className = 'mb-3 p-2 rounded-3 custom-scrollbar';
            newMap.style.cssText = 'background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); max-height: 160px; overflow-x: auto; overflow-y: hidden; display: flex; align-items: center;';
            placeholder.replaceWith(newMap);
        }
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => { if (typeof window.draw_persistent_map === 'function') draw_persistent_map(nodeIndex); }, 50);
    
    setTimeout(() => { 
        if (window.MathJax) { 
            let quizArea = document.getElementById('quiz_area');
            if (quizArea) {
                MathJax.typesetPromise([quizArea]).catch(err => console.log('MathJax update error: ', err.message));
            }
        } 
    }, 50);
};

// =========================================================================
// 🎯 HÀM 4: XỬ LÝ LỰA CHỌN, CHẤM ĐIỂM VÀ ĐIỀU HƯỚNG MẠCH TRUYỆN
// =========================================================================
window.handle_story_choice = function(chosenOptLetter, currentIndex, btnElement) {
    let q = window.current_story_data[currentIndex];
    
    // Khóa các nút lại để tránh bấm đúp
    let allBtns = document.querySelectorAll('.story-opt-btn');
    allBtns.forEach(b => {
        b.classList.add('opacity-50');
        b.style.pointerEvents = 'none';
    });
    if (btnElement) {
        btnElement.classList.remove('opacity-50');
        btnElement.classList.add('border-2');
    }

    let correctVal = String(q.a || q.answer || q[8] || "").trim(); 
    let correctValUpper = correctVal.toUpperCase();
    let hasCorrectAnswer = correctVal !== ""; 

    let rawA = q.opts && q.opts.length > 0 ? q.opts[0] : (q.optA || q[4] || "");
    let rawB = q.opts && q.opts.length > 1 ? q.opts[1] : (q.optB || q[5] || "");
    let rawC = q.opts && q.opts.length > 2 ? q.opts[2] : (q.optC || q[6] || "");
    let rawD = q.opts && q.opts.length > 3 ? q.opts[3] : (q.optD || q[7] || "");
    
    let chosenText = "";
    if (chosenOptLetter === 'A') chosenText = rawA;
    if (chosenOptLetter === 'B') chosenText = rawB;
    if (chosenOptLetter === 'C') chosenText = rawC;
    if (chosenOptLetter === 'D') chosenText = rawD;

    let isCorrect = false;
    if (correctValUpper === chosenOptLetter) {
        isCorrect = true;
    } else if (hasCorrectAnswer && String(chosenText).trim().toLowerCase() === correctVal.toLowerCase()) {
        isCorrect = true;
    }

    // Ghi điểm động (Chỉ tính lần chọn đầu tiên)
    if (!window.story_score_tracker) {
        window.story_score_tracker = { correct: 0, total: 0, attempts: {} };
    }

    if (hasCorrectAnswer) {
        if (!window.story_score_tracker.attempts[currentIndex]) {
            window.story_score_tracker.total++; 
            if (isCorrect) {
                window.story_score_tracker.correct++;
                window.story_score_tracker.attempts[currentIndex] = "passed";
            } else {
                window.story_score_tracker.attempts[currentIndex] = "failed";
            }
        }
    }

    let rawHint = q.hint || q[9] || "";                                    
    let navStr = String(q.nav !== undefined ? q.nav : (q[12] !== undefined ? q[12] : "")).trim(); 
    let nextTarget = null;

    // Đọc mã Rẽ nhánh (NAV)
    if (navStr) {
        let routingPart = navStr.includes('|') ? navStr.split('|')[1] : navStr;
        let navParts = routingPart.split(/[,;]/); 
        for (let part of navParts) {
            if (part.includes(':')) {
                let [opt, target] = part.split(':').map(s => s.trim());
                if (opt.toUpperCase() === chosenOptLetter) { 
                    nextTarget = target;
                    break;
                }
            }
        }
    }

    if (!nextTarget) {
        nextTarget = isCorrect ? String(currentIndex + 2) : String(currentIndex + 1);
    }

    // Logic chuyển cảnh
    let doNavigate = function() {
        let targetUpper = nextTarget.toUpperCase();
        if (targetUpper === "END" || targetUpper === "END_GAME" || targetUpper.includes("END")) {
            if(typeof window.render_story_victory === 'function') window.render_story_victory();
        } else {
            let targetNodeIndex = window.current_story_data.findIndex(node => {
                let nodeUUID = String(node.uuid !== undefined ? node.uuid : (node[13] !== undefined ? node[13] : "")).trim();
                if (nodeUUID !== "" && nodeUUID === nextTarget) return true;
                
                let nodeNav = String(node.nav !== undefined ? node.nav : (node[12] !== undefined ? node[12] : "")).trim().toUpperCase();
                let m = nodeNav.match(/ID:\s*([A-Z0-9_]+)/i);
                let nodeId = m ? m[1].trim() : "";
                if (nodeId !== "" && nodeId === targetUpper) return true;

                return false;
            });
            
            if (targetNodeIndex !== -1) {
                window.render_story_node(targetNodeIndex);
            } else {
                let rawTargetNum = nextTarget.replace(/\D/g, ''); 
                let nextIndex = parseInt(rawTargetNum) - 1;
                
                if (isNaN(nextIndex) || nextIndex < 0 || nextIndex >= window.current_story_data.length) {
                    if(typeof window.render_story_victory === 'function') window.render_story_victory(); 
                } else {
                    window.render_story_node(nextIndex);
                }
            }
        }
    };

    // Auto-Forward: Nếu không có Đáp án Đúng & không có Giải thích -> Qua trang luôn
    if (!hasCorrectAnswer && rawHint.trim() === "") {
        doNavigate();
        return;
    }

    // Hiển thị Feedback cho sinh viên
    let feedbackContainer = document.getElementById('inline_feedback_container');
    let hint = document.getElementById('inline_sf_hint');
    let btnNext = document.getElementById('inline_sf_next_btn');

    feedbackContainer.classList.remove('d-none');
    feedbackContainer.classList.add('d-flex');

    let processedHint = (typeof window.apply_magic_vocab === 'function') ? window.apply_magic_vocab(rawHint) : rawHint;
    let finalHintHtml = "";

    if (!hasCorrectAnswer) {
        if (btnElement) btnElement.style.cssText = "border-color: #0ea5e9 !important; background: rgba(14, 165, 233, 0.15) !important;";
        finalHintHtml = `<div class="text-info fw-bold mb-2"><i class="bi bi-info-circle-fill me-1"></i> GHI NHẬN LỰA CHỌN</div>${processedHint}`;
        hint.style.cssText = "border: 1px solid rgba(14, 165, 233, 0.3); background: rgba(14, 165, 233, 0.05); font-size: 0.95rem; overflow-y: auto;";
        btnNext.className = "btn btn-info w-100 fw-bold py-3 rounded-4 text-uppercase shadow-sm flex-shrink-0 text-white";
        btnNext.innerHTML = "TIẾP TỤC HÀNH TRÌNH <i class='bi bi-arrow-right ms-2'></i>";
    }
    else if (isCorrect) {
        if (btnElement) btnElement.style.cssText = "border-color: #10b981 !important; background: rgba(16, 185, 129, 0.15) !important;";
        let msg = processedHint !== "" ? processedHint : "Phân tích chính xác! Bạn đã xử lý rất tốt tình huống này.";
        finalHintHtml = `<div class="text-success fw-bold mb-2"><i class="bi bi-check-circle-fill me-1"></i> XỬ TRÍ HỢP LÝ</div>${msg}`;
        hint.style.cssText = "border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.05); font-size: 0.95rem; overflow-y: auto;";
        btnNext.className = "btn btn-success w-100 fw-bold py-3 rounded-4 text-uppercase shadow-sm flex-shrink-0";
        btnNext.innerHTML = "TIẾP TỤC HÀNH TRÌNH <i class='bi bi-arrow-right ms-2'></i>";
    } else {
        if (btnElement) btnElement.style.cssText = "border-color: #ef4444 !important; background: rgba(239, 68, 68, 0.15) !important;";

        let correctFullText = correctValUpper;
        if (correctValUpper === 'A') correctFullText = `A. ${rawA}`;
        else if (correctValUpper === 'B') correctFullText = `B. ${rawB}`;
        else if (correctValUpper === 'C') correctFullText = `C. ${rawC}`;
        else if (correctValUpper === 'D') correctFullText = `D. ${rawD}`;

        let processedCorrectFullText = (typeof window.apply_magic_vocab === 'function') ? window.apply_magic_vocab(correctFullText) : correctFullText;

        finalHintHtml = `
            <div class="text-danger fw-bold mb-2"><i class="bi bi-x-circle-fill me-1"></i> XỬ TRÍ CHƯA CHUẨN</div>
            <div class="p-2 mt-2 rounded border border-warning" style="background: rgba(234, 179, 8, 0.1);">
                <div class="text-warning fw-bold small"><i class="bi bi-lightbulb-fill me-1"></i> ĐÁP ÁN ĐÚNG LÀ:</div>
                <div class="text-white mt-1">${processedCorrectFullText}</div>
            </div>
        `;

        if (processedHint !== "") {
            finalHintHtml += `<div class="mt-2 text-info small"><i>* Giải thích: ${processedHint}</i></div>`;
        }

        hint.style.cssText = "border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); font-size: 0.95rem; overflow-y: auto;";
        btnNext.className = "btn btn-danger w-100 fw-bold py-3 rounded-4 text-uppercase shadow-sm flex-shrink-0";
        btnNext.innerHTML = "<i class='bi bi-arrow-counterclockwise me-2'></i> SUY NGHĨ VÀ THỬ LẠI";
    }

    hint.innerHTML = finalHintHtml;
    btnNext.onclick = doNavigate;
};

// =========================================================================
// 🏆 HÀM 5: KẾT THÚC STORY VÀ GHI DỮ LIỆU ĐẦY ĐỦ VÀO LOG_ONTAP
// =========================================================================
window.render_story_victory = function() {
    let area = document.getElementById('quiz_area');
    window.quiz_end_time = new Date(); 
    
    // Tính điểm tổng kết
    let tracker = window.story_score_tracker || { correct: 0, total: 1 };
    let correctCount = tracker.correct;
    let totalCount = tracker.total > 0 ? tracker.total : 1;
    let finalScore = Math.round((correctCount / totalCount) * 100) / 10; 

    // Đổi chuẩn giờ VN 24h
    let formatVNTime = function(d) {
        if (!d) return "";
        if (typeof d === 'string') return d; 
        let h = String(d.getHours()).padStart(2, '0');
        let m = String(d.getMinutes()).padStart(2, '0');
        let s = String(d.getSeconds()).padStart(2, '0');
        let day = String(d.getDate()).padStart(2, '0');
        let month = String(d.getMonth() + 1).padStart(2, '0');
        let year = d.getFullYear();
        return `${h}:${m}:${s} ${day}/${month}/${year}`;
    };

    let lessonNum = window.current_story_data[0] ? (window.current_story_data[0].lesson || "1") : "1";
    let loginTime = window.app_login_time || window.login_time || new Date(); 
    
    // Đóng gói data gửi Supabase
    let dataForLog = {
        student_id: window.current_student_id || "Guest",
        fullname: window.current_student_name || "Unknown",
        role: window.current_user_role || "guest",
        device_id: localStorage.getItem('mcq_device_id') || ('DEV_' + Math.floor(Math.random()*1000000)),
        subject: window.current_subject || "Story",
        lessons: lessonNum,
        login_time: window.login_time || new Date().toISOString(), 
        start_time: window.quiz_start_time ? new Date(window.quiz_start_time).toISOString() : new Date().toISOString(),
        end_time: new Date().toISOString(),
        correct: correctCount,
        total: totalCount,
        point: finalScore,
        away_count: window.offense_count || 0,
        away_time: window.away_time_total || 0,
        browser: navigator.userAgent.substring(0, 50),
        is_study: true,
        is_retest: false,
        attempt: 1,
        time_details: "Story Mode"
    };

    // Đẩy dữ liệu
    try {
        db.from('exam_results').insert([dataForLog]).then(({error}) => {
            if (error) console.error("Lỗi lưu điểm Story:", error);
            else console.log("✅ Đã lưu điểm Story lên Supabase!");
        });
    } catch (e) {}
    
    // Lưu tạm Local để đồng bộ Menu
    if (!window.user_progress_data) window.user_progress_data = {};
    if (!window.user_progress_data[lessonNum]) window.user_progress_data[lessonNum] = {};
    window.user_progress_data[lessonNum].last_score = finalScore;

    // 🌟 ĐỒNG BỘ 1000PX CHO MÀN HÌNH VICTORY
    let trophyIcon = finalScore >= 8 ? '<i class="bi bi-trophy-fill text-warning mb-3" style="font-size: 6rem; filter: drop-shadow(0 0 25px rgba(250, 204, 21, 0.6));"></i>' : '<i class="bi bi-star-half text-info mb-3" style="font-size: 6rem; filter: drop-shadow(0 0 25px rgba(14,165,233,0.6));"></i>';

    area.innerHTML = `
    <div class="w-100 mx-auto py-5 text-center animate__animated animate__zoomIn" style="max-width: 1000px;">
        ${trophyIcon}
        <h2 class="text-white fw-bold text-uppercase mt-4" style="letter-spacing: 2px;">HOÀN THÀNH TÌNH HUỐNG!</h2>
        <div class="p-3 my-4 rounded-4 shadow mx-auto" style="max-width: 600px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.2);">
            <div class="display-4 fw-bold text-white">${finalScore.toFixed(1)} <span class="fs-5 text-white-50">/ 10</span></div>
            <div class="text-white-50 mt-2 small">Đúng ngay lần 1: ${correctCount}/${totalCount} chặng</div>
        </div>
        <button class="btn btn-info fw-bold px-5 py-3 rounded-pill text-uppercase shadow-sm text-white" onclick="execute_back()">
            <i class="bi bi-box-arrow-left me-2"></i> Trở về màn hình chính
        </button>
    </div>
    `;
};