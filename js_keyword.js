// =========================================================================
// 🎯 MODULE ĐỘC LẬP: ÔN TẬP THEO TỪ KHÓA (BẢN PRO V2)
// Hỗ trợ: Quét giải thích, quét Hashtag, tìm nhiều từ khóa cùng lúc
// =========================================================================

window.start_keyword_learning = function(subjectKey, keyword) {
    let currentData = window.full_data[subjectKey] || [];
    
    // 1. Tách nhiều từ khóa bằng dấu phẩy (VD: "virus, vi khuẩn, #hiv")
    let kwArray = keyword.split(',').map(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()).filter(k => k !== "");

    if (kwArray.length === 0) return window.show_toast('⚠️ Vui lòng nhập từ khóa!', true);

    // 2. Bộ lọc quét sâu toàn diện
    let pool = currentData.filter(q => {
        if (!q) return false;
        
        // 🌟 GỘP TOÀN BỘ NỘI DUNG: Quét cả GIẢI THÍCH (hint), TAGS và MỌI THỨ
        let fullText = (
            String(q.q || "") + " " + 
            String(q.answer || "") + " " + 
            String(q.a || "") + " " + 
            (q.opts ? q.opts.join(" ") : "") + " " + 
            String(q.lessonname || "") + " " +
            String(q.hint || "") + " " +       // Quét vùng Giải thích
            String(q.explain || "") + " " +    // Quét vùng Explain (nếu có)
            String(q.tags || "")               // Quét vùng thẻ Tags riêng (nếu có)
        ).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // 🌟 TÌM KIẾM ĐA NHIỆM: Chỉ cần chứa 1 trong các từ khóa là được bốc vào đề
        return kwArray.some(kw => fullText.includes(kw));
    });

    if (pool.length === 0) {
        return window.show_alert("Kết quả", `Không tìm thấy câu hỏi nào chứa các từ khóa: "${keyword}"`);
    }

    let fakeLessonId = "KW_" + Date.now(); 
    pool.forEach(q => {
        q._oldLesson = q.lesson; 
        q._oldLessonName = q.lessonname;
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

// VẼ GIAO DIỆN THANH TÌM KIẾM
window._original_draw_lesson_buttons = window.draw_lesson_buttons;

window.draw_lesson_buttons = function(subjectKey, displayName, qData) {
    window._original_draw_lesson_buttons(subjectKey, displayName, qData);

    let mapArea = document.getElementById(`map_area_${subjectKey}`);
    if(mapArea) {
        let searchHtml = `
        <div class="px-3 mb-3 mt-2 animate__animated animate__fadeIn">
            <label class="text-info small fw-bold mb-1"><i class="bi bi-crosshair me-1"></i> Tìm nhanh (Cách nhau dấu phẩy)</label>
            <div class="input-group shadow-sm" style="border-radius: 12px; overflow: hidden; border: 1px solid rgba(56,189,248,0.4);">
                <input type="text" id="kw_input_${subjectKey}" class="form-control bg-dark text-white fw-bold" placeholder="VD: adn, hồng cầu, #gen..." style="border: none;">
                <button class="btn btn-info fw-bold text-white px-3" onclick="let kw = document.getElementById('kw_input_${subjectKey}').value; if(kw) window.start_keyword_learning('${subjectKey}', kw); else window.show_toast('⚠️ Vui lòng nhập từ khóa!', true);">
                    LỌC BÀI
                </button>
            </div>
        </div>`;
        mapArea.insertAdjacentHTML('afterbegin', searchHtml);
    }
};