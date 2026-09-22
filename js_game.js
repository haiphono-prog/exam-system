    let gameRound = 0;
    let gamePairs = [];
    let selectedLeft = null;
    let selectedRight = null;
    let gameRoundsArray = []; 

    // =========================================================================
    // 🎮 HÀM 1: KHỞI TẠO TRÒ CHƠI & CHIA MÀN CHƠI (ROUNDS)
    // =========================================================================
    function initMatchingGame() {
        // Lọc các câu hỏi hợp lệ (có cả Hỏi và Đáp)
        let validQs = questions.filter(q => q.q && q.a);
        if (validQs.length < 1) {
            show_alert("Thông báo", "Bài học này không có đủ câu hỏi hợp lệ để tạo trò chơi ghép cặp.");
            toggle_view_mode();
            return;
        }
        
        // Trộn ngẫu nhiên câu hỏi
        validQs.sort(() => Math.random() - 0.5);
        
        // Thuật toán chia các câu hỏi thành nhiều màn chơi (Round) để màn hình không bị quá tải
        gameRoundsArray = [];
        let currentRound = [];
        let currentWeight = 0;
        
        validQs.forEach(q => {
            let weight = 1; 
            let textLen = (q.q || "").length + (q.a || "").length;
            
            // Tính "trọng lượng" của câu hỏi dựa trên độ dài chữ và ảnh
            if (textLen > 100) weight += 1; 
            if (textLen > 250) weight += 2; 
            if (q.image && q.image.length > 5) weight += 2; 
            
            if (currentRound.length > 0 && currentWeight + weight > 5) {
                gameRoundsArray.push(currentRound);
                currentRound = [];
                currentWeight = 0;
            }
            
            currentRound.push(q);
            currentWeight += weight;
            
            if (currentRound.length >= 5) {
                gameRoundsArray.push(currentRound);
                currentRound = [];
                currentWeight = 0;
            }
        });
        if (currentRound.length > 0) gameRoundsArray.push(currentRound);

        gameRound = 0;
        renderMatchingRound();
    }

    // =========================================================================
    // 🧩 HÀM 2: VẼ GIAO DIỆN MÀN CHƠI HIỆN TẠI (ĐỒNG BỘ 1000PX & GLASS UI)
    // =========================================================================
    function renderMatchingRound() {
      if (typeof window.update_progress_bar === 'function') {
        window.update_progress_bar();
    }
    
    let quizArea = document.getElementById('quiz_area');
    let currentBatch = gameRoundsArray[gameRound];
        
        // Cập nhật thanh tiến trình (Progress bar)
        let p_bar = document.getElementById('p_bar'); 
        if (p_bar) {
            let progress = gameRoundsArray.length > 0 ? (gameRound / gameRoundsArray.length * 100) : 0;
            p_bar.style.width = progress + "%";
        }
        
        // NẾU ĐÃ CHƠI HẾT: Hiển thị màn hình chúc mừng
        if (!currentBatch || currentBatch.length === 0) {
            if (p_bar) p_bar.style.width = "100%"; 
            quizArea.innerHTML = `
                <div class="text-center mt-5 animate__animated animate__zoomIn p-4 mx-auto w-100" style="max-width: 1000px;">
                    <i class="bi bi-trophy-fill text-warning" style="font-size: 5rem; filter: drop-shadow(0 4px 10px rgba(255,193,7,0.5));"></i>
                    <h3 class="text-success fw-bold mt-3">XUẤT SẮC!</h3>
                    <p class="text-white-50">Bạn đã hoàn thành việc ghép cặp toàn bộ bài học.</p>
                    <button class="btn glass-btn-action rounded-pill mt-3 px-5 py-2 fw-bold shadow-sm" onclick="initMatchingGame()" style="border-color: #38bdf8; color: #38bdf8;">
                        <i class="bi bi-arrow-repeat me-2"></i> CHƠI LẠI
                    </button>
                </div>`;
            return;
        }

        // Tách câu hỏi (Trái) và Đáp án (Phải), xáo trộn ngẫu nhiên từng cột
        let lefts = currentBatch.map(q => ({ id: q.id, text: q.q, media: q.image })).sort(() => Math.random() - 0.5);
        let rights = currentBatch.map(q => {
            let txt = String(q.a).trim();
            if (txt.toLowerCase() === 'đúng') txt = 'ĐÚNG';
            if (txt.toLowerCase() === 'sai') txt = 'SAI';
            return { id: q.id, text: txt };
        }).sort(() => Math.random() - 0.5);

        // 🌟 Vẽ giao diện 2 cột (Đã đổi sang nền trong suốt, viền Neon)
        let html = `
        <div class="d-flex justify-content-between gap-2 px-1 pb-5 mt-3 w-100 mx-auto" style="min-height: 65vh; max-width: 1000px;">
            
            <div class="d-flex flex-column gap-3" id="match_left_col" style="width: calc(50% - 4px);">
                ${lefts.map(item => `
                    <div class="match-btn match-left shadow-sm d-flex flex-column justify-content-center align-items-center" 
                         data-id="${item.id}" onclick="selectMatch(this, 'left')" 
                         style="cursor: pointer; flex: 1; background: transparent; border: 1px solid rgba(56, 189, 248, 0.4); color: #e2e8f0; white-space: normal; text-align: center; font-size: 0.95rem; padding: 12px; border-radius: 16px; transition: all 0.2s;">
                        
                        <span class="fw-bold lh-sm mb-2">${item.text.replace(/\[\.\.\.\]/g, "...").replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, `<span class="vocab-highlight" onclick="if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 <i class="bi bi-volume-up-fill small opacity-75"></i></span>`)}</span>
                        ${item.media ? render_media_for_card({image: item.media}).replace(/max-height: 250px/g, 'max-height: 120px; pointer-events: none;') : ''}
                    </div>
                `).join('')}
            </div>

            <div class="d-flex flex-column gap-3" id="match_right_col" style="width: calc(50% - 4px);">
                ${rights.map(item => `
                    <div class="match-btn match-right shadow-sm d-flex flex-column justify-content-center align-items-center" 
                         data-id="${item.id}" onclick="selectMatch(this, 'right')" 
                         style="cursor: pointer; flex: 1; background: transparent; border: 1px solid rgba(250, 204, 21, 0.4); color: #e2e8f0; white-space: normal; text-align: center; font-size: 0.95rem; padding: 12px; border-radius: 16px; transition: all 0.2s;">
                        
                        <span class="fw-bold lh-sm">${item.text.replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, `<span class="vocab-highlight" onclick="if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 <i class="bi bi-volume-up-fill small opacity-75"></i></span>`)}</span>
                    </div>
                `).join('')}
            </div>
            
        </div>`;
        
        window.scrollTo({ top: 0, behavior: 'instant' });
        quizArea.innerHTML = html;
        selectedLeft = null; selectedRight = null;
        
        // Gọi MathJax để render công thức (Chống lag)
        setTimeout(() => {
            let area = document.getElementById('quiz_area');
            if (area && window.MathJax) { 
                MathJax.typesetPromise([area]).catch(err => console.log(err.message));
            }
        }, 50);
    }

    // =========================================================================
    // 👆 HÀM 3: XỬ LÝ SỰ KIỆN KHI NGƯỜI CHƠI CHỌN 1 THẺ
    // =========================================================================
    function selectMatch(btn, side) {
        if (btn.classList.contains('matched')) return; // Bỏ qua nếu thẻ đã ghép đúng

        // Reset trạng thái các thẻ cùng cột chưa được ghép
        document.querySelectorAll(`.match-${side}`).forEach(b => {
            if(!b.classList.contains('matched')) {
                b.classList.remove('active', 'shadow-lg');
                if(side === 'left') { b.style.backgroundColor = 'transparent'; b.style.borderColor = 'rgba(56, 189, 248, 0.4)'; }
                if(side === 'right') { b.style.backgroundColor = 'transparent'; b.style.borderColor = 'rgba(250, 204, 21, 0.4)'; }
            }
        });

        // Đánh dấu thẻ đang chọn bằng hiệu ứng sáng Neon
        btn.classList.add('active', 'shadow-lg');
        if(side === 'left') { 
            btn.style.backgroundColor = 'rgba(56, 189, 248, 0.2)'; 
            btn.style.borderColor = '#38bdf8'; 
            selectedLeft = btn; 
        }
        if(side === 'right') { 
            btn.style.backgroundColor = 'rgba(250, 204, 21, 0.2)'; 
            btn.style.borderColor = '#facc15'; 
            selectedRight = btn; 
        }

        // Nếu đã chọn đủ 2 bên -> Kiểm tra kết quả
        if (selectedLeft && selectedRight) checkMatchResult();
    }

    // =========================================================================
    // ⚖️ HÀM 4: KIỂM TRA KẾT QUẢ GHÉP CẶP VÀ CHUYỂN MÀN (ĐÃ FIX LỖI TRÙNG ĐÁP ÁN)
    // =========================================================================
    function checkMatchResult() {
        let idL = selectedLeft.getAttribute('data-id');
        let idR = selectedRight.getAttribute('data-id');
        let sl = selectedLeft; let sr = selectedRight;

        // 🌟 Lấy trực tiếp câu hỏi gốc từ kho dữ liệu dựa trên ID
        let qL = questions.find(q => String(q.id) === String(idL));
        let qR = questions.find(q => String(q.id) === String(idR));

        // Rút trích đáp án gốc (Đưa về chữ thường và xóa khoảng trắng thừa)
        let ansL = qL ? String(qL.a).toLowerCase().trim() : "";
        let ansR = qR ? String(qR.a).toLowerCase().trim() : "";

        // 🌟 ĐIỀU KIỆN ĐÚNG: Khớp mã ID (câu gốc) HOẶC Nội dung đáp án giống hệt nhau
        if (idL === idR || ansL === ansR) {
            sl.classList.add('matched'); sr.classList.add('matched');
            sl.style.backgroundColor = 'rgba(74, 222, 128, 0.2)'; sl.style.borderColor = '#4ade80'; sl.style.color = '#4ade80';
            sr.style.backgroundColor = 'rgba(74, 222, 128, 0.2)'; sr.style.borderColor = '#4ade80'; sr.style.color = '#4ade80';
            
            if (qL) qL.done = true; 
            if (typeof window.update_progress_bar === 'function') {
                window.update_progress_bar();
            }
            
            setTimeout(() => {
                // Làm mờ và thu nhỏ các thẻ đã ghép đúng
                sl.style.opacity = '0.15'; sr.style.opacity = '0.15';
                sl.style.transform = 'scale(0.95)'; sr.style.transform = 'scale(0.95)';
                sl.style.pointerEvents = 'none'; sr.style.pointerEvents = 'none';
                
                // Nếu cột trái không còn thẻ nào chưa ghép -> Chuyển sang màn tiếp theo
                if (document.querySelectorAll('.match-left:not(.matched)').length === 0) {
                    gameRound++;
                    renderMatchingRound();
                }
            }, 400);
        } 
        // 🌟 KỊCH BẢN 2: GHÉP SAI (Màu Đỏ & Rung lắc)
        else {
            sl.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; sl.style.borderColor = '#f87171'; sl.style.color = '#f87171';
            sr.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; sr.style.borderColor = '#f87171'; sr.style.color = '#f87171';
            sl.classList.add('animate__animated', 'animate__headShake');
            sr.classList.add('animate__animated', 'animate__headShake');
            
            setTimeout(() => {
                // Trả về trạng thái ban đầu sau khi rung lắc xong
                sl.classList.remove('animate__animated', 'animate__headShake', 'active', 'shadow-lg');
                sl.style.backgroundColor = 'transparent'; sl.style.color = '#e2e8f0'; sl.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                
                sr.classList.remove('animate__animated', 'animate__headShake', 'active', 'shadow-lg');
                sr.style.backgroundColor = 'transparent'; sr.style.color = '#e2e8f0'; sr.style.borderColor = 'rgba(250, 204, 21, 0.4)';
            }, 600);
        }
        
        // Reset lại lựa chọn cho lượt tiếp theo
        selectedLeft = null; selectedRight = null;
    }