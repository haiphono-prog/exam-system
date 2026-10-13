    // --- BẢN CẬP NHẬT: PURE GLASS (TRONG SUỐT 100%) & TỐI ƯU HÓA HIỆU NĂNG MATHJAX ---
function render_flashcard_mode(idx) {
  if (typeof window.update_progress_bar === 'function') {
        window.update_progress_bar(); 
    }

    let direction = "next";
    // Ép biến lên cấp cao nhất (window) để nhận diện xuyên file
    window.current_fc_idx = window.current_fc_idx || 0;
    let previousIdx = window.current_fc_idx;
    
    if (idx < previousIdx) {
        direction = "prev";
    }

    let old_idx = window.current_fc_idx;
    localStorage.setItem('last_idx_' + window.current_subject + '_' + window.selected_lessons_text, idx);
    window.current_fc_idx = idx; 
    
    let q = window.questions[idx]; 
    q.visited = true; 
    
    let bloomColor = getLevelColor(q.level);
    let btnPrevDisabled = (idx === 0) ? "disabled" : "";
    let btnNextDisabled = (idx === questions.length - 1) ? "disabled" : "";

    let rawHint = q.hint || "";
    let formattedHint = "<span style='opacity: 0.6;'>Không có giải thích chi tiết.</span>";
    let hasHint = rawHint.trim() !== "";
    if (hasHint) {
        // Giữ nguyên viền sáng Neon của Thầy
        formattedHint = rawHint.replace(/#([^\s.,;!?"'()[\]{}]+)/g, 
            '<mark style="background: transparent; color: #facc15; padding: 2px 6px; margin: 0 2px; border-radius: 6px; font-weight: 800; border: 1px solid rgba(250, 204, 21, 0.5); box-shadow: 0 0 10px rgba(250, 204, 21, 0.2);">$1</mark>'
        );
        
        // 🌟 BỔ SUNG THÊM DÒNG NÀY ĐỂ HIỆN MAGIC VOCAB TRONG GIẢI THÍCH
        formattedHint = formattedHint.replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, 
            `<span class="vocab-highlight" onclick="event.stopPropagation(); if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 <i class="bi bi-volume-up-fill small opacity-75"></i></span>`
        );
    }

    let quizArea = document.getElementById('quiz_area');
    quizArea.style.height = 'calc(100dvh - 90px)'; 
    quizArea.style.display = 'flex';
    quizArea.style.flexDirection = 'column';
    quizArea.style.overscrollBehavior = 'none';

    if (!document.getElementById('flashcard_track')) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        quizArea.innerHTML = `
            <div id="flashcard_track" class="flex-grow-1 position-relative w-100 mx-auto"
                 style="max-width: 800px; overflow: hidden; touch-action: pan-y;
                        padding-left: max(8px, env(safe-area-inset-left));
                        padding-right: max(8px, env(safe-area-inset-right));"></div>
            
            <div id="flashcard_nav" class="w-100 pb-3 pt-2 mx-auto flex-shrink-0"
                 style="max-width: 800px; z-index: 10; background: transparent;
                        padding-left: max(8px, env(safe-area-inset-left));
                        padding-right: max(8px, env(safe-area-inset-right));"></div>
        `;
        if (typeof initSwipeFlashcard === 'function') initSwipeFlashcard(); 
    }

    let track = document.getElementById('flashcard_track');
    let nav = document.getElementById('flashcard_nav');
    
    // 🌟 ĐÃ SỬA: Ép thanh điều hướng dưới cùng trong suốt 100%, đồng bộ Glass-btn
    nav.innerHTML = `
        <div class="d-grid align-items-center w-100" style="grid-template-columns: 1fr auto 1fr;">
            <div class="text-start">
                <button class="btn btn-sm fw-bold glass-btn-action shadow" 
                        style="padding: 6px 16px; border-radius: 20px;" 
                        onclick="event.stopPropagation(); if(${idx} > 0) render_flashcard_mode(${idx - 1});" ${btnPrevDisabled}>
                    <i class="bi bi-chevron-left"></i> Trước
                </button>
            </div>

            <div class="text-center">
                <div class="d-inline-flex align-items-center shadow" 
                     style="background: transparent; border-radius: 20px; border: 1px solid rgba(14, 165, 233, 0.4); padding: 4px 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    <input type="number" min="1" max="${questions.length}" value="${idx + 1}" 
                           onfocus="this.select(); event.stopPropagation();"
                           onclick="event.stopPropagation();"
                           onchange="let val = parseInt(this.value) - 1; if(val >= 0 && val < questions.length) { render_flashcard_mode(val); } else { this.value = ${idx + 1}; }" 
                           style="width: 40px; background: transparent; border: none; font-weight: 800; color: #38bdf8; text-align: center; font-size: 1.1rem; padding: 0; outline: none; text-shadow: 0 0 8px rgba(56,189,248,0.6);">
                    <span style="font-size: 1rem; font-weight: bold; color: rgba(255,255,255,0.7); padding-left: 4px;">/ ${questions.length}</span>
                </div>
            </div>

            <div class="text-end">
                <button class="btn btn-sm fw-bold glass-btn-action shadow" 
                        style="padding: 6px 16px; border-radius: 20px;" 
                        onclick="event.stopPropagation(); if(${idx} < ${questions.length - 1}) render_flashcard_mode(${idx + 1});" ${btnNextDisabled}>
                    Sau <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        </div>
    `;

    // 🌟 ĐÃ SỬA: Chuyển toàn bộ thẻ Flashcard thành Pure Glass, xóa nền đen thừa
    let cardHtml = `
    <div class="fc-slide-item pb-2 px-1 px-md-2" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; will-change: transform;">
        <div class="flip-card flex-grow-1 w-100 h-100" onclick="this.classList.toggle('flipped')">
            <div class="flip-card-inner w-100 h-100">
                
                <div class="flip-card-front glass-panel d-flex flex-column p-2 p-md-3 h-100 shadow" 
                     style="position: relative; border: 1px solid rgba(255,255,255,0.2) !important; border-radius: 20px;">
                    <div class="badge text-white mb-2 px-3 py-1 shadow-sm flex-shrink-0 align-self-center" style="background: transparent; border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; font-size: 0.95rem; z-index: 5;">
                        Câu ${idx + 1}
                    </div>
                    
                    <div class="flex-grow-1 w-100 overflow-auto custom-scrollbar" style="-webkit-overflow-scrolling: touch; display: block; min-height: 0; height: 0; padding-bottom: 35px;">
                        <div class="fs-5 fw-bold text-center w-100 mb-3 px-1" style="color: ${bloomColor}; word-break: break-word; line-height: 1.4;">
                            ${(q.q || "").replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, `<span class="vocab-highlight" onclick="if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 <i class="bi bi-volume-up-fill small opacity-75"></i></span>`)}
                        </div>
                        
                        ${render_media_for_card(q)}
                    </div>
                    
                    <small class="text-white-50 w-100 text-center" style="opacity:0.8; font-size: 0.75rem; position: absolute; bottom: 10px; left: 0; pointer-events: none; font-weight: 600; z-index: 5;">
                        <i class="bi bi-hand-index-thumb"></i> Chạm để lật • Vuốt trái/phải
                    </small>
                </div>
                
                <div class="flip-card-back glass-panel d-flex flex-column align-items-center p-2 p-md-3 h-100 shadow" style="border: 1px solid rgba(255,255,255,0.2) !important; border-radius: 20px;">
                    <div class="badge mb-2 px-3 py-1 shadow-sm flex-shrink-0" style="background: transparent; border: 1px solid #4ade80; color: #4ade80 !important; border-radius: 12px; box-shadow: 0 0 10px rgba(74, 222, 128, 0.2);">
                        <i class="bi bi-check-circle-fill text-success me-1"></i> Đáp án
                    </div>
                    
                    <div class="d-flex flex-column justify-content-center align-items-center flex-grow-1 w-100 overflow-auto px-1 custom-scrollbar" style="-webkit-overflow-scrolling: touch; min-height: 0; height: 0;">
                        <div class="mb-2 fs-4 fw-bold text-center w-100 text-white" style="word-break: break-word;">
                            ${(q.a || "Chưa cập nhật").replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, `<span class="vocab-highlight" onclick="if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 <i class="bi bi-volume-up-fill small opacity-75"></i></span>`)}
                        </div>
                    </div>
                    
                    <div class="mt-2 w-100 flex-shrink-0" style="max-height: 60%; overflow-y: auto; -webkit-overflow-scrolling: touch;">
                        <div class="p-2 p-md-3 text-start hint-fog-container ${!hasHint ? 'revealed' : ''}" 
                             onclick="if(!this.classList.contains('revealed')) { event.stopPropagation(); this.classList.add('revealed'); }"
                             style="background: transparent; border-radius: 16px; border: 1px dashed rgba(255, 255, 255, 0.2);">
                            <div class="fw-bold mb-1 position-relative" style="color: #38bdf8; font-size: 0.85rem; text-transform: uppercase; z-index: 3;">
                                💡 Giải thích
                            </div>
                            <div class="text-white-50 hint-fog-text" style="font-size: 0.95rem; line-height: 1.6; word-break: break-word;">
                                ${formattedHint}
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    </div>`;

    let oldCards = track.querySelectorAll('.fc-slide-item');
    let tempDiv = document.createElement('div');
    tempDiv.innerHTML = cardHtml;
    let newCard = tempDiv.firstElementChild;

    const triggerMathJax = (targetElement) => {
        if (window.MathJax && targetElement) {
            setTimeout(() => {
                MathJax.typesetPromise([targetElement]).catch(err => console.log(err.message));
            }, 50);
        }
    };

    if (oldCards.length === 0 || old_idx === idx) {
        track.innerHTML = ''; 
        track.appendChild(newCard); 
        triggerMathJax(newCard); 
        return;
    }

    let startTransform = direction === "next" ? "translateX(100%)" : "translateX(-100%)";
    let endTransformOld = direction === "next" ? "translateX(-100%)" : "translateX(100%)";
    
    newCard.style.transform = startTransform;
    track.appendChild(newCard);
    track.style.pointerEvents = 'none';

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            let transitionStyle = "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)"; 
            newCard.style.transition = transitionStyle;
            newCard.style.transform = "translateX(0)";
            
            oldCards.forEach(card => {
                card.style.transition = transitionStyle;
                card.style.transform = endTransformOld;
                setTimeout(() => { if (card && card.parentNode) card.parentNode.removeChild(card); }, 450);
            });
            
            setTimeout(() => { track.style.pointerEvents = 'auto'; }, 450); 
        });
    });

    triggerMathJax(newCard);
}
function initSwipeFlashcard() {
    let track = document.getElementById('flashcard_track');
    if (!track) return;

    let touchStartX = 0;
    let touchStartY = 0;
    
    track.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, {passive: true});

    track.addEventListener('touchend', function(e) {
        let touchEndX = e.changedTouches[0].screenX;
        let touchEndY = e.changedTouches[0].screenY;
        
        let deltaX = touchStartX - touchEndX;
        let deltaY = touchStartY - touchEndY;
        
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                if (typeof window.current_fc_idx !== 'undefined' && window.current_fc_idx < window.questions.length - 1) {
                    render_flashcard_mode(window.current_fc_idx + 1);
                }
            } else {
                if (typeof window.current_fc_idx !== 'undefined' && window.current_fc_idx > 0) {
                    render_flashcard_mode(window.current_fc_idx - 1);
                }
            }
        }
    }, {passive: true});
}