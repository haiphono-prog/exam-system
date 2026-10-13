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
    let formattedHint = "";
    let hasHint = rawHint.trim() !== "";
    if (hasHint) {
        // Giữ nguyên viền sáng Neon của Thầy
        formattedHint = rawHint.replace(/#([^\s.,;!?"'()[\]{}]+)/g, 
            '<mark style="background: transparent; color: #facc15; padding: 2px 6px; margin: 0 2px; border-radius: 6px; font-weight: 800; border: 1px solid rgba(250, 204, 21, 0.5); box-shadow: 0 0 10px rgba(250, 204, 21, 0.2);">$1</mark>'
        );
        formattedHint = formattedHint.replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, 
            `<span class="vocab-highlight" onclick="event.stopPropagation(); if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 <i class="bi bi-volume-up-fill small opacity-75"></i></span>`
        );
    }

    // 🌟 ĐÃ FIX: Bộ lọc thông minh bóc tách text đáp án A, B, C, D
    let correctAns = q.a || q.answer || q.en || q[4] || "Chưa cập nhật";
    if (/^[A-D]$/i.test(correctAns) && q.opts && q.opts.length > 0) {
        let letterIdx = correctAns.toUpperCase().charCodeAt(0) - 65;
        if (q.opts[letterIdx]) correctAns = q.opts[letterIdx];
    }

    let quizArea = document.getElementById('quiz_area');
    quizArea.style.height = 'calc(100dvh - 90px)'; 
    quizArea.style.display = 'flex';
    quizArea.style.flexDirection = 'column';
    quizArea.style.overscrollBehavior = 'none';

    // 🌟 KHỞI TẠO CSS 3D & CHỐNG XUYÊN THẤU iOS
    if (!document.getElementById('flashcard_3d_css')) {
        let style3D = document.createElement('style');
        style3D.id = 'flashcard_3d_css';
        style3D.innerHTML = `
            .fc-perspective { perspective: 1500px; }
            .flip-card { transform-style: preserve-3d; transition: transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1); width: 100%; height: 100%; cursor: pointer; }
            .flip-card.flipped { transform: rotateY(180deg); }
            .flip-card-front, .flip-card-back {
                -webkit-backface-visibility: hidden;
                backface-visibility: hidden;
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                transform-style: preserve-3d;
                background: #1a1d20; 
                border-radius: 24px;
            }
            .flip-card-back { transform: rotateY(180deg); }
        `;
        document.head.appendChild(style3D);
    }

    if (!document.getElementById('flashcard_track')) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        quizArea.innerHTML = `
            <div id="flashcard_track" class="flex-grow-1 position-relative w-100 mx-auto fc-perspective py-2"
                 style="max-width: 800px; overflow: hidden; touch-action: pan-y;
                        padding-left: max(8px, env(safe-area-inset-left));
                        padding-right: max(8px, env(safe-area-inset-right));"></div>
            
            <div id="flashcard_nav" class="w-100 pb-3 pt-2 mx-auto flex-shrink-0 mt-auto"
                 style="max-width: 800px; z-index: 10; background: transparent;
                        padding-left: max(8px, env(safe-area-inset-left));
                        padding-right: max(8px, env(safe-area-inset-right));"></div>
        `;
        if (typeof initSwipeFlashcard === 'function') initSwipeFlashcard(); 
    }

    let track = document.getElementById('flashcard_track');
    let nav = document.getElementById('flashcard_nav');
    
    // 🌟 ĐÃ TINH GỌN: Dàn 4 nút thành 1 hàng ngang duy nhất, bỏ text, chỉ dùng Icon
    nav.innerHTML = `
        <div class="d-flex justify-content-between align-items-center w-100 px-2">
            <!-- NÚT CÂU TRƯỚC -->
            <button class="btn btn-sm d-flex align-items-center justify-content-center rounded-circle shadow-sm" 
                    style="width: 44px; height: 44px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; ${btnPrevDisabled}" 
                    onclick="event.stopPropagation(); if(${idx} > 0) render_flashcard_mode(${idx - 1});">
                <i class="bi bi-chevron-left fs-5"></i>
            </button>
            
            <!-- NÚT MẶT TRƯỚC -->
            <button class="btn btn-sm d-flex align-items-center justify-content-center rounded-circle shadow-sm" 
                    style="width: 44px; height: 44px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff;" 
                    onclick="let fc = document.querySelector('.flip-card'); if(fc) fc.classList.remove('flipped');">
                <i class="bi bi-arrow-counterclockwise fs-5"></i>
            </button>

            <!-- BỘ ĐẾM HIỆN TẠI -->
            <div class="text-info fw-bold font-monospace shadow-sm d-flex align-items-center justify-content-center" 
                 style="font-size: 1rem; background: rgba(0,0,0,0.3); height: 40px; padding: 0 16px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.3);">
                ${idx + 1} /${questions.length}
            </div>

            <!-- NÚT MẶT SAU -->
            <button class="btn btn-sm d-flex align-items-center justify-content-center rounded-circle shadow-sm" 
                    style="width: 44px; height: 44px; background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.4); color: #38bdf8;" 
                    onclick="let fc = document.querySelector('.flip-card'); if(fc) fc.classList.add('flipped');">
                <i class="bi bi-arrow-clockwise fs-5"></i>
            </button>

            <!-- NÚT CÂU TIẾP -->
            <button class="btn btn-sm d-flex align-items-center justify-content-center rounded-circle shadow-sm" 
                    style="width: 44px; height: 44px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; ${btnNextDisabled}" 
                    onclick="event.stopPropagation(); if(${idx} < ${questions.length - 1}) render_flashcard_mode(${idx + 1});">
                <i class="bi bi-chevron-right fs-5"></i>
            </button>
        </div>
    `;

   // 🌟 HIỂN THỊ HINT TRỰC TIẾP KHÔNG CẦN BẤM
    let hintDisplayHtml = hasHint ? `
        <div class="mt-3 w-100 flex-shrink-0 p-3 text-start" style="background: rgba(0,0,0,0.2); border-radius: 16px; border: 1px dashed rgba(255, 255, 255, 0.15);">
            <div class="fw-bold mb-1 position-relative" style="color: #38bdf8; font-size: 0.85rem; text-transform: uppercase;">
                💡 Giải thích
            </div>
            <div class="text-white-50" style="font-size: 0.95rem; line-height: 1.6; word-break: break-word;">
                ${formattedHint}
            </div>
        </div>
    ` : '';

    let cardHtml = `
    <div class="fc-slide-item pb-2 px-1 px-md-2" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; will-change: transform;">
        <!-- Chạm vào bất cứ đâu trên thẻ sẽ lật -->
        <div class="flip-card flex-grow-1 w-100 h-100" onclick="this.classList.toggle('flipped')">
            
            <div class="flip-card-front d-flex flex-column p-3 h-100 shadow-lg" style="border: 1px solid rgba(255,255,255,0.15) !important;">
                <div class="badge text-white mb-2 px-3 py-1 shadow-sm flex-shrink-0 align-self-center" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; font-size: 0.95rem; z-index: 5;">
                    Câu ${idx + 1}
                </div>
                
                <!-- 🌟 Ép chữ ra giữa tuyệt đối -->
                <div class="d-flex flex-column justify-content-center align-items-center flex-grow-1 w-100 overflow-auto custom-scrollbar" style="-webkit-overflow-scrolling: touch; min-height: 0; height: 0; padding-bottom: 35px;">
                    <div class="fs-4 fw-bold text-center w-100 mb-3 px-1" style="color: ${bloomColor}; word-break: break-word; line-height: 1.4;">
                        ${(q.q || "Câu hỏi rỗng").replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, `<span class="vocab-highlight" onclick="if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 <i class="bi bi-volume-up-fill small opacity-75"></i></span>`)}
                    </div>
                    ${(typeof render_media_for_card === 'function') ? render_media_for_card(q) : ''}
                </div>
                
                <small class="text-white-50 w-100 text-center" style="opacity:0.8; font-size: 0.75rem; position: absolute; bottom: 15px; left: 0; pointer-events: none; font-weight: 600; z-index: 5;">
                    <i class="bi bi-hand-index-thumb"></i> Chạm thẻ để lật • Vuốt trái/phải
                </small>
            </div>
            
            <div class="flip-card-back d-flex flex-column align-items-center p-3 h-100 shadow-lg" style="border: 1px solid rgba(255,255,255,0.15) !important;">
                <div class="badge mb-2 px-3 py-1 shadow-sm flex-shrink-0" style="background: rgba(16, 185, 129, 0.15); border: 1px solid #4ade80; color: #4ade80 !important; border-radius: 12px;">
                    <i class="bi bi-check-circle-fill text-success me-1"></i> Đáp án
                </div>
                
                <!-- 🌟 Ép chữ ra giữa tuyệt đối, gom chung cả đáp án và giải thích -->
                <div class="d-flex flex-column justify-content-center align-items-center flex-grow-1 w-100 overflow-auto px-1 custom-scrollbar" style="-webkit-overflow-scrolling: touch; min-height: 0; height: 0;">
                    <div class="mb-2 fs-3 fw-bold text-center w-100 text-white" style="word-break: break-word;">
                        ${correctAns.replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, `<span class="vocab-highlight" onclick="if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 <i class="bi bi-volume-up-fill small opacity-75"></i></span>`)}
                    </div>
                    <!-- Hint hiện sẵn dưới đáp án -->
                    ${hintDisplayHtml}
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