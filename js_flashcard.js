// --- BẢN CẬP NHẬT: SUPER APP TRÀN VIỀN, NỀN ĐẶC CHỐNG XUYÊN THẤU & ICON FOOTER TỐI GIẢN ---

function render_flashcard_mode(idx) {
    if (typeof window.update_progress_bar === 'function') {
        window.update_progress_bar(); 
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

    // 1. Xử lý Giải thích (Hint)
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

    // 2. Bóc tách đáp án (Không để trống)
    let correctAns = q.a || q.answer || q.en || q[4] || "Chưa cập nhật";
    if (/^[A-D]$/i.test(correctAns) && q.opts && q.opts.length > 0) {
        let letterIdx = correctAns.toUpperCase().charCodeAt(0) - 65;
        if (q.opts[letterIdx]) correctAns = q.opts[letterIdx];
    }

    // 3. KHỞI TẠO BỘ KHUNG SUPER APP TRÀN VIỀN
    let modalId = 'flashcard_super_modal';
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        // BỐ CỤC KHUNG CONTAINER
        modal.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex flex-column animate__animated animate__fadeInUp';
        modal.style.cssText = 'background: #212529; z-index: 99999; overflow: hidden;';

        let html = `
        <style>
            /* CSS LÕI (UNIFIED DESIGN) */
            @media (max-width: 767.98px) {
                .mobile-px-half { padding-left: 0.5px !important; padding-right: 0.5px !important; }
                .mobile-margin-0 { margin-left: 0 !important; margin-right: 0 !important; }
            }
            .unified-input {
                padding: 10px 15px !important; border-radius: 12px !important; font-size: 0.95rem !important;
                height: 48px !important; line-height: 1.5 !important; box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important;
                background: #1a1d20 !important; border: 1px solid #2b3035 !important; color: #fff !important;
            }
            
            /* CSS LẬT THẺ 3D ĐẶC TRỊ LỖI TRONG SUỐT VÀ GƯƠNG SOI IOS */
            .fc-perspective { perspective: 1500px; }
            .flip-card { transform-style: preserve-3d; transition: transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1); width: 100%; height: 100%; cursor: pointer; }
            .flip-card-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1); }
            .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
            .flip-card-front, .flip-card-back {
                -webkit-backface-visibility: hidden;
                backface-visibility: hidden;
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                transform-style: preserve-3d;
                background: #1a1d20 !important; /* Đổ nền đặc chống xuyên thấu */
                border: 1px solid #2b3035;
                border-radius: 16px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.4);
            }
            .flip-card-back { transform: rotateY(180deg); }
            
            /* TỐI ƯU NÚT BẤM FOOTER */
            .fc-footer-btn { background: transparent; transition: 0.2s; color: #fff; font-size: 1.5rem; }
            .fc-footer-btn:active { background: rgba(255,255,255,0.1) !important; }
        </style>

        <!-- PHÂN KHU 1: HEADER -->
        <div class="d-flex p-3 border-bottom border-secondary bg-dark flex-shrink-0 align-items-center" style="margin-left: -0.5px; margin-right: -0.5px;">
            <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="document.getElementById('${modalId}').remove();">
                <i class="bi bi-chevron-left fs-4"></i>
            </button>
            <h6 class="text-white fw-bold mb-0 text-center flex-grow-1 text-truncate" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                CÂU <span id="fc_progress_text" class="text-info font-monospace ms-1">${idx + 1}/${window.questions.length}</span>
            </h6>
            <div style="width: 32px;"></div>
        </div>

        <!-- PHÂN KHU 2: BODY TRƯỢT TỰ DO -->
        <div class="flex-grow-1 overflow-auto custom-scrollbar p-0 p-md-3 d-flex flex-column" style="background: transparent;">
            <div class="mobile-px-half mobile-margin-0 flex-grow-1 d-flex flex-column w-100 mx-auto position-relative" style="max-width: 800px; padding-top: 20px; padding-bottom: 20px;">
                <div id="flashcard_track" class="flex-grow-1 position-relative w-100 h-100 fc-perspective" style="touch-action: pan-y;"></div>
            </div>
        </div>

        <!-- PHÂN KHU 3: FOOTER CHỐT ĐÁY (ICON NÉT THANH TO BẢN, TRÀN VIỀN) -->
        <div class="border-top border-secondary bg-dark flex-shrink-0 d-flex w-100 mt-auto" style="margin-left: -0.5px; margin-right: -0.5px;">
            <button id="fc_btn_prev" class="btn py-3 flex-grow-1 fc-footer-btn border-0 border-end border-secondary" style="border-radius: 0; ${btnPrevDisabled}" onclick="if(window.current_fc_idx > 0) render_flashcard_mode(window.current_fc_idx - 1);">
                <i class="bi bi-chevron-left"></i>
            </button>
            <button class="btn py-3 flex-grow-1 fc-footer-btn border-0 border-end border-secondary" style="border-radius: 0;" onclick="let fc = document.querySelector('.flip-card'); if(fc) fc.classList.remove('flipped');">
                <i class="bi bi-arrow-counterclockwise"></i>
            </button>
            <button class="btn py-3 flex-grow-1 fc-footer-btn border-0 border-end border-secondary text-info" style="border-radius: 0;" onclick="let fc = document.querySelector('.flip-card'); if(fc) fc.classList.add('flipped');">
                <i class="bi bi-arrow-clockwise"></i>
            </button>
            <button id="fc_btn_next" class="btn py-3 flex-grow-1 fc-footer-btn border-0" style="border-radius: 0; ${btnNextDisabled}" onclick="if(window.current_fc_idx < window.questions.length - 1) render_flashcard_mode(window.current_fc_idx + 1);">
                <i class="bi bi-chevron-right"></i>
            </button>
        </div>
        `;
        modal.innerHTML = html;
        document.body.appendChild(modal);
        if (typeof initSwipeFlashcard === 'function') initSwipeFlashcard(); 
    }

    // 4. CẬP NHẬT TRẠNG THÁI NÚT VÀ PROGRESS SAU KHI LƯỚT
    let progText = document.getElementById('fc_progress_text');
    if (progText) progText.innerText = `${idx + 1}/${window.questions.length}`;

    let btnPrev = document.getElementById('fc_btn_prev');
    if (btnPrev) btnPrev.style.cssText = `border-radius: 0; ${btnPrevDisabled}`;
    
    let btnNext = document.getElementById('fc_btn_next');
    if (btnNext) btnNext.style.cssText = `border-radius: 0; ${btnNextDisabled}`;

    // 5. RENDER THẺ BÀI: ÉP CHỮ NẰM GIỮA VÀ HIỂN THỊ HINT BÊN DƯỚI
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
    <div class="fc-slide-item" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; will-change: transform;">
        <div class="flip-card flex-grow-1 w-100 h-100" onclick="this.classList.toggle('flipped')">
            <div class="flip-card-inner w-100 h-100">
                
                <div class="flip-card-front d-flex flex-column p-4 h-100 justify-content-center align-items-center">
                    <div class="w-100 overflow-auto custom-scrollbar d-flex flex-column justify-content-center align-items-center" style="-webkit-overflow-scrolling: touch; max-height: 100%;">
                        <div class="fs-4 fw-bold text-center w-100 mb-3 px-1" style="color: ${bloomColor}; word-break: break-word; line-height: 1.4;">
                            ${(q.q || "Câu hỏi rỗng").replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, `<span class="vocab-highlight" onclick="event.stopPropagation(); if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 <i class="bi bi-volume-up-fill small opacity-75"></i></span>`)}
                        </div>
                        ${(typeof render_media_for_card === 'function') ? render_media_for_card(q) : ''}
                    </div>
                </div>
                
                <div class="flip-card-back d-flex flex-column p-4 h-100 justify-content-center align-items-center">
                    <div class="w-100 overflow-auto custom-scrollbar d-flex flex-column align-items-center" style="-webkit-overflow-scrolling: touch; max-height: 100%;">
                        <div class="badge mb-3 px-3 py-1" style="background: rgba(16, 185, 129, 0.15); border: 1px solid #4ade80; color: #4ade80 !important; border-radius: 12px;">
                            <i class="bi bi-check-circle-fill text-success me-1"></i> ĐÁP ÁN
                        </div>
                        <div class="mb-2 fs-3 fw-bold text-center w-100 text-white" style="word-break: break-word;">
                            ${correctAns.replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, `<span class="vocab-highlight" onclick="event.stopPropagation(); if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 <i class="bi bi-volume-up-fill small opacity-75"></i></span>`)}
                        </div>
                        ${hintDisplayHtml}
                    </div>
                </div>
                
            </div>
        </div>
    </div>`;

    let track = document.getElementById('flashcard_track');
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

// 6. MODULE XỬ LÝ VUỐT (SWIPE)
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

        // Ưu tiên vuốt ngang thay vì cuộn dọc
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0) { // Vuốt sang trái -> Câu tiếp
                if (typeof window.current_fc_idx !== 'undefined' && window.current_fc_idx < window.questions.length - 1) {
                    render_flashcard_mode(window.current_fc_idx + 1);
                }
            } else { // Vuốt sang phải -> Câu trước
                if (typeof window.current_fc_idx !== 'undefined' && window.current_fc_idx > 0) {
                    render_flashcard_mode(window.current_fc_idx - 1);
                }
            }
        }
    }, {passive: true});
}