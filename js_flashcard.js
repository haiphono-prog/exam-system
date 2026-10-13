// --- BẢN CẬP NHẬT: FOOTER BÁM ĐÁY TUYỆT ĐỐI, HEADER RESPONSIVE & ĐẶC TRỊ LỖI GƯƠNG SOI MATHJAX ---

function render_flashcard_mode(idx) {
    if (typeof window.update_progress_bar === 'function') {
        window.update_progress_bar(); 
    }

    // 🌟 1. THỐNG NHẤT RESPONSIVE CHỮ TRÊN HEADER (Chỉ hiện Icon trên Mobile)
    let modeTextEl = document.getElementById('mode_text');
    if (modeTextEl && !modeTextEl.innerHTML.includes('d-md-inline')) {
        // Tách icon và bọc phần chữ phía sau vào thẻ span tự ẩn trên màn hình nhỏ
        modeTextEl.innerHTML = modeTextEl.innerHTML.replace(/(<\/i>)\s*(.+)/i, '$1 <span class="d-none d-md-inline ms-1">$2</span>');
    }

    let direction = "next";
    window.current_fc_idx = window.current_fc_idx || 0;
    let previousIdx = window.current_fc_idx;
    
    if (idx < previousIdx) { direction = "prev"; }

    let old_idx = window.current_fc_idx;
    localStorage.setItem('last_idx_' + window.current_subject + '_' + window.selected_lessons_text, idx);
    window.current_fc_idx = idx; 
    
    let q = window.questions[idx]; 
    q.visited = true; 
    
    let bloomColor = getLevelColor(q.level);
    let btnPrevDisabled = (idx === 0) ? "opacity: 0.3; pointer-events: none;" : "";
    let btnNextDisabled = (idx === questions.length - 1) ? "opacity: 0.3; pointer-events: none;" : "";

    // 2. Xử lý Hint (Giải thích)
    let rawHint = q.hint || "";
    let formattedHint = "";
    let hasHint = rawHint.trim() !== "";
    if (hasHint) {
        formattedHint = rawHint.replace(/#([^\s.,;!?"'()[\]{}]+)/g, 
            '<mark style="background: transparent; color: #facc15; padding: 2px 6px; margin: 0 2px; border-radius: 6px; font-weight: 800; border: 1px solid rgba(250, 204, 21, 0.5); box-shadow: 0 0 10px rgba(250, 204, 21, 0.2);">$1</mark>'
        );
        formattedHint = formattedHint.replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, 
            `<span class="vocab-highlight" onclick="event.stopPropagation(); if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 <i class="bi bi-volume-up-fill small opacity-75"></i></span>`
        );
    }

    // 3. Bóc tách Đáp án
    let correctAns = q.a || q.answer || q.en || q[4] || "Chưa cập nhật";
    if (/^[A-D]$/i.test(correctAns) && q.opts && q.opts.length > 0) {
        let letterIdx = correctAns.toUpperCase().charCodeAt(0) - 65;
        if (q.opts[letterIdx]) correctAns = q.opts[letterIdx];
    }

    let quizArea = document.getElementById('quiz_area');
    quizArea.style.height = '100%'; 
    quizArea.style.display = 'flex';
    quizArea.style.flexDirection = 'column';
    quizArea.style.overscrollBehavior = 'none';

    // 4. CSS 3D VÀ BỘ LỌC ĐẶC TRỊ GƯƠNG SOI (Chống xuyên thấu cho cả MathJax)
    if (!document.getElementById('flashcard_3d_css')) {
        let style3D = document.createElement('style');
        style3D.id = 'flashcard_3d_css';
        style3D.innerHTML = `
            .fc-perspective { perspective: 1500px; }
            .flip-card { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1); cursor: pointer; }
            .flip-card.flipped { transform: rotateY(180deg); }
            
            .flip-card-front, .flip-card-back {
                -webkit-backface-visibility: hidden;
                backface-visibility: hidden;
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: #1a1d20 !important; 
                border: 1px solid #2b3035; border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.4);
            }
            .flip-card-back { transform: rotateY(180deg); }
            
            /* 🌟 ĐẶC TRỊ SAFARI & MATHJAX GƯƠNG SOI: Ẩn tàng hình luôn mặt thẻ bị úp */
            .flip-card:not(.flipped) .flip-card-back { visibility: hidden; transition: visibility 0s 0.2s; }
            .flip-card.flipped .flip-card-back { visibility: visible; transition: visibility 0s 0s; }
            .flip-card.flipped .flip-card-front { visibility: hidden; transition: visibility 0s 0.2s; }
            .flip-card:not(.flipped) .flip-card-front { visibility: visible; transition: visibility 0s 0s; }

            /* CSS Nút Footer Tối giản */
            .fc-footer-btn { background: transparent; transition: 0.2s; color: #fff; font-size: 1.5rem; }
            .fc-footer-btn:active { background: rgba(255,255,255,0.1) !important; }
        `;
        document.head.appendChild(style3D);
    }

    if (!document.getElementById('flashcard_track')) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        quizArea.innerHTML = `
            <div id="flashcard_track" class="flex-grow-1 position-relative w-100 mx-auto fc-perspective pt-3"
                 style="max-width: 800px; overflow: hidden; touch-action: pan-y;
                        padding-left: max(8px, env(safe-area-inset-left));
                        padding-right: max(8px, env(safe-area-inset-right));
                        min-height: calc(100dvh - 180px); margin-bottom: 70px;"></div>
            
            <!-- 🌟 FOOTER FIXED BOTTOM ÉP SÁT TẬN CÙNG ĐÁY MÀN HÌNH -->
            <div id="flashcard_nav" class="position-fixed bottom-0 start-0 w-100 border-top border-secondary bg-dark d-flex"
                 style="z-index: 1040; margin: 0; padding-bottom: env(safe-area-inset-bottom);"></div>
        `;
        if (typeof initSwipeFlashcard === 'function') initSwipeFlashcard(); 
    }

    let track = document.getElementById('flashcard_track');
    let nav = document.getElementById('flashcard_nav');

    // 5. FOOTER CHUẨN SUPER APP: 4 ICON TO BẢN, TRÀN VIỀN ĐÁY
    nav.innerHTML = `
        <button id="fc_btn_prev" class="btn py-3 flex-grow-1 fc-footer-btn border-0 border-end border-secondary" style="border-radius: 0; ${btnPrevDisabled}" onclick="event.stopPropagation(); if(window.current_fc_idx > 0) render_flashcard_mode(window.current_fc_idx - 1);">
            <i class="bi bi-chevron-left"></i>
        </button>
        <button class="btn py-3 flex-grow-1 fc-footer-btn border-0 border-end border-secondary" style="border-radius: 0;" onclick="let fc = document.querySelector('.flip-card'); if(fc) fc.classList.remove('flipped');">
            <i class="bi bi-arrow-counterclockwise"></i>
        </button>
        <button class="btn py-3 flex-grow-1 fc-footer-btn border-0 border-end border-secondary text-info" style="border-radius: 0;" onclick="let fc = document.querySelector('.flip-card'); if(fc) fc.classList.add('flipped');">
            <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button id="fc_btn_next" class="btn py-3 flex-grow-1 fc-footer-btn border-0" style="border-radius: 0; ${btnNextDisabled}" onclick="event.stopPropagation(); if(window.current_fc_idx < window.questions.length - 1) render_flashcard_mode(window.current_fc_idx + 1);">
            <i class="bi bi-chevron-right"></i>
        </button>
    `;

    // 6. GIẢI THÍCH (HINT) & CẤU TRÚC THẺ BÀI
    let hintDisplayHtml = hasHint ? `
        <div class="mt-4 w-100 flex-shrink-0 p-3 text-start rounded-4" style="background: rgba(0,0,0,0.15);">
            <div class="fw-bold mb-1" style="color: #38bdf8; font-size: 0.85rem; text-transform: uppercase;">
                <i class="bi bi-lightbulb-fill me-1"></i> Giải thích
            </div>
            <div class="text-white-50" style="font-size: 0.95rem; line-height: 1.6; word-break: break-word;">
                ${formattedHint}
            </div>
        </div>
    ` : '';

    let cardHtml = `
    <div class="fc-slide-item pb-3 px-2 px-md-3" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; will-change: transform;">
        <div class="flip-card flex-grow-1 w-100 h-100" onclick="this.classList.toggle('flipped')">
            
            <div class="flip-card-front d-flex flex-column p-4 h-100 justify-content-center align-items-center text-center">
                <div class="badge text-white mb-3 px-3 py-1 shadow-sm flex-shrink-0 align-self-center" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; font-size: 0.95rem;">
                    Câu ${idx + 1} / ${questions.length}
                </div>
                <div class="w-100 overflow-auto custom-scrollbar d-flex flex-column justify-content-center align-items-center" style="-webkit-overflow-scrolling: touch; max-height: 100%;">
                    <div class="fs-4 fw-bold w-100 px-1" style="color: ${bloomColor}; word-break: break-word; line-height: 1.4;">
                        ${(q.q || "Câu hỏi rỗng").replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, `<span class="vocab-highlight" onclick="event.stopPropagation(); if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 <i class="bi bi-volume-up-fill small opacity-75"></i></span>`)}
                    </div>
                    ${(typeof render_media_for_card === 'function') ? render_media_for_card(q) : ''}
                </div>
            </div>
            
            <div class="flip-card-back d-flex flex-column p-4 h-100 justify-content-center align-items-center text-center">
                <div class="w-100 overflow-auto custom-scrollbar d-flex flex-column justify-content-center align-items-center" style="-webkit-overflow-scrolling: touch; max-height: 100%;">
                    <div class="badge mb-3 px-3 py-1" style="background: rgba(16, 185, 129, 0.15); border: 1px solid #4ade80; color: #4ade80 !important; border-radius: 12px;">
                        <i class="bi bi-check-circle-fill text-success me-1"></i> ĐÁP ÁN
                    </div>
                    <div class="fs-3 fw-bold w-100 text-white" style="word-break: break-word;">
                        ${correctAns.replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, `<span class="vocab-highlight" onclick="event.stopPropagation(); if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 <i class="bi bi-volume-up-fill small opacity-75"></i></span>`)}
                    </div>
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

// 7. XỬ LÝ VUỐT (SWIPE)
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