// =========================================================================
// 🎯 MODULE ĐỘC LẬP: TÌM KIẾM TỪ KHÓA & LỌC BÀI HỌC (BẢN PRO V4)
// =========================================================================

// Biến toàn cục để chứa tạm các câu hỏi đã gom
window.temp_kw_pool = {};

window.live_keyword_search = function(subjectKey, keyword) {
    let kw = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    // 🌟 1. TÍNH NĂNG MỚI: LỌC VÀ ẨN CÁC BÀI HỌC KHÔNG KHỚP
    let lessonContainer = document.getElementById(`original_lessons_${subjectKey}`);
    if (lessonContainer) {
        // Thuật toán tự thích ứng: Nếu các thẻ bài học bị bọc trong 1 dòng (row), nó sẽ tự động chui vào trong 1 cấp để tìm
        let items = lessonContainer.children;
        if (items.length === 1 && items[0].tagName === 'DIV') {
            items = items[0].children;
        }

        Array.from(items).forEach(child => {
            if (kw === '') {
                child.style.display = ''; // Hiện lại tất cả nếu xóa trắng ô tìm kiếm
            } else {
                let text = child.innerText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (text.includes(kw)) {
                    child.style.display = ''; // Có chứa từ khóa -> Giữ lại
                } else {
                    child.style.display = 'none'; // Không chứa từ khóa -> Giấu đi
                }
            }
        });
    }

    // 🌟 2. TÍNH NĂNG GOM BÀI (DEEP SCAN TOÀN BỘ NGÓC NGÁCH)
    let container = document.getElementById(`kw_results_${subjectKey}`);
    if (!container) return;
    
    if (kw === '') {
        container.innerHTML = '';
        return;
    }

    let kwArray = keyword.split(',').map(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()).filter(k => k !== "");
    let currentData = window.full_data[subjectKey] || [];
    
    let pool = currentData.filter(q => {
        if (!q) return false;
        let fullText = (
            String(q.q || "") + " " + String(q.answer || "") + " " + String(q.a || "") + " " + 
            (q.opts ? q.opts.join(" ") : "") + " " + String(q.lessonname || "") + " " +
            String(q.hint || "") + " " + String(q.explain || "") + " " + String(q.tags || "")
        ).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return kwArray.some(k => fullText.includes(k));
    });

    if (pool.length === 0) {
        container.innerHTML = `<div class="text-warning small px-2 mt-2 animate__animated animate__fadeIn"><i class="bi bi-info-circle"></i> Không tìm thấy dữ liệu chứa từ khóa này.</div>`;
        return;
    }

    window.temp_kw_pool[subjectKey] = pool;

    let html = `
    <div class="mt-2 animate__animated animate__zoomIn" style="animation-duration: 0.3s;">
        <div class="card glass-panel p-2 p-md-3 border-info shadow-lg" style="border-left: 4px solid #0ea5e9 !important; background: rgba(14, 165, 233, 0.1);">
            <div class="d-flex justify-content-between align-items-center gap-2">
                <div style="min-width: 0;">
                    <h6 class="fw-bold text-info mb-1 text-truncate" style="font-size: 0.9rem;"><i class="bi bi-lightning-charge-fill me-1"></i> [GOM BÀI] ${keyword.toUpperCase()}</h6>
                    <div class="text-white-50" style="font-size: 0.75rem;">Đã gom <span class="text-warning fw-bold px-1">${pool.length}</span> câu hỏi (Bấm vào học để trộn chung).</div>
                </div>
                <button class="btn btn-sm btn-info fw-bold rounded-pill px-3 shadow-sm flex-shrink-0" onclick="window.start_keyword_learning_direct('${subjectKey}', '${keyword.replace(/'/g, "\\'")}')">
                    VÀO HỌC <i class="bi bi-play-circle-fill ms-1"></i>
                </button>
            </div>
        </div>
    </div>`;
    container.innerHTML = html;
};

// Hàm kích hoạt khi bấm nút "VÀO HỌC" của thẻ Gom bài
window.start_keyword_learning_direct = function(subjectKey, keyword) {
    let pool = window.temp_kw_pool[subjectKey];
    if(!pool || pool.length === 0) return;

    let fakeLessonId = "KW_" + Date.now(); 
    pool.forEach(q => {
        if(!q._oldLesson) q._oldLesson = q.lesson; 
        if(!q._oldLessonName) q._oldLessonName = q.lessonname;
        q.lesson = fakeLessonId; 
        q.lessonname = "[TỪ KHÓA] " + keyword.toUpperCase();
    });

    window.quick_start_lesson(subjectKey, fakeLessonId);
    window.selected_lessons_text = "[TỪ KHÓA] " + keyword.toUpperCase();

    setTimeout(() => {
        pool.forEach(q => {
            q.lesson = q._oldLesson;
            q.lessonname = q._oldLessonName;
        });
    }, 2000);
};

// 🌟 GHI ĐÈ HÀM VẼ BÀI HỌC GỐC ĐỂ BỌC DOM LẠI
window._original_draw_lesson_buttons = window.draw_lesson_buttons;

window.draw_lesson_buttons = function(subjectKey, displayName, qData) {
    // 1. Vẽ giao diện gốc trước
    window._original_draw_lesson_buttons(subjectKey, displayName, qData);

    // 2. Chèn thanh tìm kiếm và bọc các bài học gốc vào 1 thư mục riêng
    let mapArea = document.getElementById(`map_area_${subjectKey}`);
    if(mapArea) {
        let originalHtml = mapArea.innerHTML;
        
        // Xóa HTML cũ
        mapArea.innerHTML = '';
        
        let searchHtml = `
        <div class="px-1 px-md-3 mb-3 mt-2 animate__animated animate__fadeIn">
            <div class="position-relative w-100">
                <i class="bi bi-search position-absolute top-50 translate-middle-y text-info" style="left: 15px;"></i>
                <input type="text" 
                       class="form-control bg-dark text-white border-secondary w-100 shadow-sm" 
                       style="padding: 10px 15px 10px 40px; border-radius: 12px; font-size: 0.9rem;" 
                       placeholder="Gõ để lọc bài học hoặc gom từ khóa..." 
                       autocomplete="off"
                       oninput="window.live_keyword_search('${subjectKey}', this.value)">
            </div>
            <!-- Khu vực hiện kết quả Gom Bài (Deep Scan) -->
            <div id="kw_results_${subjectKey}"></div>
        </div>
        <!-- Khu vực chứa danh sách bài học có sẵn -->
        <div id="original_lessons_${subjectKey}" class="w-100">
            ${originalHtml}
        </div>`;
        
        mapArea.innerHTML = searchHtml;
    }
};