// =========================================================================
// 📊 JS_STATISTIC.JS — MÔ-ĐUN THỐNG KÊ & BÁO CÁO (ĐÃ CHUYỂN SANG SUPABASE)
// CSS đi kèm nằm ở file styles_statistic.css — dán vào <style> hoặc file css chung.
// Yêu cầu: nạp file này SAU js_shared.js (dùng chung window.db, window.SUPA_TABLES).
// =========================================================================
// ⚠️ Bảng error_reports cần tạo mới trên Supabase, ví dụ:
//   create table public.error_reports (
//     id bigint generated always as identity primary key,
//     student_id text, subject_key text, subject_name text, lesson text,
//     q_text text, type text, note text, created_at timestamptz default now()
//   );
// ⚠️ Tính năng "thời gian dừng từng câu" (time_details) cần bảng lịch sử có thêm
//   cột text `time_details`. Nếu bảng history/study_logs chưa có cột này, phần
//   biểu đồ/badge liên quan sẽ tự ẩn (không lỗi) cho tới khi bổ sung cột.
// =========================================================================
window.SUPA_TABLES = window.SUPA_TABLES || {};
window.SUPA_TABLES.error_reports = window.SUPA_TABLES.error_reports || 'error_reports';
window.SUPA_TABLES.questions      = window.SUPA_TABLES.questions      || 'questions';

// --- helper: định dạng "x phút ys" từ tổng giây, dùng cho avgTimeStr ---
function _stat_fmt_duration(totalSeconds) {
    totalSeconds = Math.round(totalSeconds || 0);
    let m = Math.floor(totalSeconds / 60), s = totalSeconds % 60;
    return m > 0 ? (m + ' phút ' + s + 's') : (s + 's');
}

// --- Tổng quan hệ thống (thay getGlobalAnalytics) ---
window.fetch_global_analytics = async function() {
    const out = { totalAttempts: 0, uniqueStudents: 0, avgScore: '0.0', passRate: 0,
                  completionRate: '0%', avgTimeStr: 'Chưa có dữ liệu', totalViolations: 0,
                  totalQuestions: 0, dateMap: {}, topSubjects: [] };
    try {
        const [{ data: results, error: e1 }, { data: exams, error: e2 }, { data: qs, error: e3 }] = await Promise.all([
            db.from(window.SUPA_TABLES.exam_results).select('*'),
            db.from(window.SUPA_TABLES.online_exams).select('exam_code, subject_key'),
            db.from(window.SUPA_TABLES.questions).select('id', { count: 'exact', head: true })
        ]);
        if (e1) throw e1;
        out.totalQuestions = (qs && qs.count) || 0;

        let examSubjMap = {};
        (exams || []).forEach(ex => { examSubjMap[ex.exam_code] = ex.subject_key; });

        let submitted = (results || []).filter(r => r.is_submitted);
        out.totalAttempts = submitted.length;
        let students = new Set(submitted.map(r => String(r.student_id).toLowerCase()));
        out.uniqueStudents = students.size;

        let scored = submitted.filter(r => r.score !== null && r.score !== undefined);
        if (scored.length > 0) {
            let sum = scored.reduce((a, r) => a + Number(r.score), 0);
            out.avgScore = (sum / scored.length).toFixed(1);
            out.passRate = Math.round((scored.filter(r => Number(r.score) >= 5).length / scored.length) * 100);
        }
        out.completionRate = (results && results.length > 0)
            ? Math.round((submitted.length / results.length) * 100) + '%' : '0%';
        out.totalViolations = (results || []).reduce((a, r) => a + (parseInt(r.offense_count) || 0), 0) + ' lượt';

        // Lưu lượng theo ngày (10 ngày gần nhất, dùng để vẽ area chart)
        submitted.forEach(r => {
            let d = r.updated_at || r.created_at;
            if (!d) return;
            let dt = new Date(d);
            let key = String(dt.getDate()).padStart(2,'0') + '/' + String(dt.getMonth()+1).padStart(2,'0') + '/' + dt.getFullYear();
            out.dateMap[key] = (out.dateMap[key] || 0) + 1;
        });

        // Top môn theo số lượt thi
        let subjCount = {};
        submitted.forEach(r => {
            let subjKey = examSubjMap[r.exam_code] || 'Khác';
            subjCount[subjKey] = (subjCount[subjKey] || 0) + 1;
        });
        out.topSubjects = Object.keys(subjCount).map(k => ({
            name: (window.subjectConfig && window.subjectConfig[k] && window.subjectConfig[k].name) || subjectNames[k] || k,
            count: subjCount[k]
        })).sort((a,b) => b.count - a.count).slice(0, 8);
    } catch (err) {
        console.warn('[SUPABASE] fetch_global_analytics lỗi: ' + err.message);
    }
    return out;
};

// --- 5 lượt nộp bài gần nhất (thay getRecentActivity) ---
window.fetch_recent_activity = async function() {
    try {
        const { data: results, error } = await db.from(window.SUPA_TABLES.exam_results)
            .select('*').eq('is_submitted', true)
            .order('updated_at', { ascending: false }).limit(5);
        if (error) throw error;
        if (!results || results.length === 0) return [];

        const codes = [...new Set(results.map(r => r.exam_code))];
        const ids = [...new Set(results.map(r => String(r.student_id)))];
        const [{ data: exams }, { data: users }] = await Promise.all([
            db.from(window.SUPA_TABLES.online_exams).select('exam_code, subject_key, exam_name').in('exam_code', codes),
            db.from(window.SUPA_TABLES.users).select('student_id, full_name').in('student_id', ids)
        ]);
        let examMap = {}; (exams || []).forEach(e => examMap[e.exam_code] = e);
        let userMap = {}; (users || []).forEach(u => userMap[String(u.student_id).toLowerCase()] = u);

        return results.map(r => {
            let ex = examMap[r.exam_code] || {};
            let u = userMap[String(r.student_id).toLowerCase()] || {};
            let subjKey = ex.subject_key || '';
            return {
                name: u.full_name || r.student_id,
                subject: (window.subjectConfig && window.subjectConfig[subjKey] && window.subjectConfig[subjKey].name) || subjectNames[subjKey] || subjKey || 'Khác',
                lesson: ex.exam_name || r.exam_code || '',
                awayTime: r.away_time || 0,
                point: Number(r.score) || 0,
                time: r.updated_at ? new Date(r.updated_at).toLocaleString('vi-VN') : ''
            };
        });
    } catch (err) {
        console.warn('[SUPABASE] fetch_recent_activity lỗi: ' + err.message);
        return [];
    }
};

// --- Phân tích ngân hàng câu hỏi (thay getDeepQuizStatistics) ---
window.fetch_deep_quiz_statistics = async function() {
    try {
        const { data, error } = await db.from(window.SUPA_TABLES.questions).select('*').range(0, 19999);
        if (error) throw error;
        let bySubj = {};
        (data || []).forEach(q => {
            let key = q.subject_key || 'khac';
            if (!bySubj[key]) bySubj[key] = [];
            bySubj[key].push({
                level: q.level, type: q.type,
                media: q.multimedia || '',
                q: q.q || q.question_text || ''
            });
        });
        return Object.keys(bySubj).map(key => ({
            subjectKey: key,
            subjectName: (window.subjectConfig && window.subjectConfig[key] && window.subjectConfig[key].name) || subjectNames[key] || key,
            records: bySubj[key]
        }));
    } catch (err) {
        console.warn('[SUPABASE] fetch_deep_quiz_statistics lỗi: ' + err.message);
        return [];
    }
};

// --- Phân tích lịch sử thi chi tiết (thay getDeepLogStatistics) ---
// Ghi chú: cột time_details (chi tiết thời gian từng câu) chỉ hiện nếu bảng có cột này.
window.fetch_deep_log_statistics = async function() {
    try {
        const { data: results, error } = await db.from(window.SUPA_TABLES.exam_results)
            .select('*').eq('is_submitted', true).order('updated_at', { ascending: false }).limit(500);
        if (error) throw error;
        if (!results || results.length === 0) return [];

        const codes = [...new Set(results.map(r => r.exam_code))];
        const ids = [...new Set(results.map(r => String(r.student_id)))];
        const [{ data: exams }, { data: users }] = await Promise.all([
            db.from(window.SUPA_TABLES.online_exams).select('exam_code, subject_key, exam_name').in('exam_code', codes),
            db.from(window.SUPA_TABLES.users).select('student_id, full_name').in('student_id', ids)
        ]);
        let examMap = {}; (exams || []).forEach(e => examMap[e.exam_code] = e);
        let userMap = {}; (users || []).forEach(u => userMap[String(u.student_id).toLowerCase()] = u);

        return results.map(r => {
            let ex = examMap[r.exam_code] || {};
            let u = userMap[String(r.student_id).toLowerCase()] || {};
            let subjKey = ex.subject_key || '';
            let subjectName = (window.subjectConfig && window.subjectConfig[subjKey] && window.subjectConfig[subjKey].name) || subjectNames[subjKey] || subjKey || 'Khác';
            let lessonName = ex.exam_name || r.exam_code || '';
            return {
                student: u.full_name || r.student_id,
                subject: subjectName,
                lesson: lessonName,
                point: Number(r.score) || 0,
                time: r.updated_at ? new Date(r.updated_at).toLocaleString('vi-VN') : '',
                time_details: r.time_details || '',   // chỉ có nếu bảng đã bổ sung cột này
                rawSearch: (u.full_name + ' ' + r.student_id + ' ' + subjectName + ' ' + lessonName).toLowerCase()
            };
        });
    } catch (err) {
        console.warn('[SUPABASE] fetch_deep_log_statistics lỗi: ' + err.message);
        return [];
    }
};

// --- Danh mục tài khoản (thay getDeepUserStatistics) ---
window.fetch_deep_user_statistics = async function() {
    try {
        const { data, error } = await db.from(window.SUPA_TABLES.users).select('student_id, full_name, role');
        if (error) throw error;
        return (data || []).map(u => ({ username: u.student_id, fullname: u.full_name, role: u.role }));
    } catch (err) {
        console.warn('[SUPABASE] fetch_deep_user_statistics lỗi: ' + err.message);
        return [];
    }
};

// --- Hộp thư báo lỗi / góp ý (thay getErrorReports, resolveErrorReport) ---
window.fetch_error_reports = async function() {
    try {
        const { data, error } = await db.from(window.SUPA_TABLES.error_reports)
            .select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(e => ({
            row_index: e.id, time: e.created_at ? new Date(e.created_at).toLocaleString('vi-VN') : '',
            student: e.student_id, subject: e.subject_name || e.subject_key, lesson: e.lesson,
            q_text: e.q_text, type: e.type, note: e.note
        }));
    } catch (err) {
        console.warn('[SUPABASE] fetch_error_reports lỗi: ' + err.message + ' (đã tạo bảng error_reports chưa?)');
        return [];
    }
};
window.resolve_error_report = async function(rowId) {
    try {
        const { error } = await db.from(window.SUPA_TABLES.error_reports).delete().eq('id', rowId);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, message: err.message };
    }
};

// --- Tải ngân hàng câu hỏi 1 môn để sửa nhanh (thay boc_de_live_drive) ---
window.fetch_questions_bank = async function(subjKey) {
    try {
        const { data, error } = await db.from(window.SUPA_TABLES.questions).select('*').ilike('subject_key', subjKey).range(0, 9999);
        if (error) throw error;
        return { questions: window.map_supabase_questions ? window.map_supabase_questions(data) : (data || []) };
    } catch (err) {
        console.warn('[SUPABASE] fetch_questions_bank lỗi: ' + err.message);
        return { questions: [] };
    }
};

// --- Lưu câu hỏi đã sửa nhanh (thay syncSingleQuestionToSheet) ---
// Khớp theo subject_key + lesson + nội dung câu gốc (giống cách GAS dò trong Sheet cũ).
window.sync_question_edit = async function(subjKey, q, origQText) {
    try {
        const payload = {
            q: q.q, answer: q.a || q.answer, hint: q.hint || ''
        };
        if (q.type === 'single' || q.type === 'mcq') {
            payload.opt_a = q.opta; payload.opt_b = q.optb; payload.opt_c = q.optc; payload.opt_d = q.optd;
        }
        const { error } = await db.from(window.SUPA_TABLES.questions)
            .update(payload)
            .ilike('subject_key', subjKey)
            .eq('lesson', String(q.lesson))
            .eq('q', origQText);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        throw err; // để .catch() ở nơi gọi xử lý thông báo lỗi
    }
};

// Biến lưu trữ biểu đồ để dọn dẹp bộ nhớ khi render lại
window.stat_charts = window.stat_charts || {};

// 🎨 BẢNG MÀU PASTEL KÍNH MỜ - TƯƠNG PHẢN CAO BỔ SUNG
const STAT_PALETTE = {
  sky: { border: '#38bdf8', bg: 'rgba(56, 189, 248, 0.25)' },
  emerald: { border: '#10b981', bg: 'rgba(16, 185, 129, 0.25)' },
  amber: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.25)' },
  violet: { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.25)' },
  rose: { border: '#f43f5e', bg: 'rgba(244, 63, 94, 0.25)' },
  indigo: { border: '#6366f1', bg: 'rgba(99, 102, 241, 0.25)' }
};

/**
 * 🌟 1. MENU CHÍNH CỦA HỆ THỐNG THỐNG KÊ (HUB)
 */
window.render_result_management = function() {
    // 🌟 ĐÃ FIX: Ẩn ngay nhật ký ôn tập khi vào Menu Thống kê
    const historyArea = document.getElementById('history_view_area');
    if (historyArea) historyArea.style.display = 'none';

    let safe_role = String(window.current_user_role || '').trim().toLowerCase();
    let isAdmin = (safe_role === 'all' || safe_role === 'admin' || safe_role === 'useradmin' || safe_role === 'teacher');
    
    if (!isAdmin && !(typeof window.check_stats_perm === 'function' && window.check_stats_perm())) {
        window.show_alert("Bảo mật", "Bạn không có quyền truy cập hệ thống Thống kê.");
        return;
    }

    const container = document.getElementById('dash_subject_cards_container');
    if (!container) return;
    
    container.style.display = 'flex';
    let exitAction = isAdmin ? "window.render_admin_hub()" : "window.render_student_subject_list(window.current_user_role)";

    let html = `
        <div class="col-12 px-2 animate__animated animate__fadeIn mb-4">
            <div class="d-flex justify-content-between align-items-center w-100" style="background: transparent; border: none;">
                <!-- 🌟 ĐÃ FIX: Đồng bộ chuẩn kích thước nút Thoát -->
                <button class="btn btn-sm fw-bold text-white-50 p-0 d-flex align-items-center" onclick="${exitAction}" style="background: transparent; border: none; font-size: 0.9rem; letter-spacing: 0.5px;"><i class="bi bi-arrow-left me-1"></i>Thoát</button>
                <h6 class="text-white fw-bold mb-0 text-center flex-grow-1" style="letter-spacing: 1px; font-size: 0.85rem;">BÁO CÁO THỐNG KÊ</h6>
                <div style="width: 55px;"></div>
            </div>
        </div>

        <div class="col-12 mb-1 animate__animated animate__fadeInUp" style="animation-delay: 0.05s;">
            <div class="p-2 d-flex align-items-center gap-3" style="cursor:pointer; background: transparent; border: none; transition: transform 0.2s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'" onclick="window.render_stat_overview()">
                <div style="width: 35px; text-align: center;"><i class="bi bi-speedometer2 text-info" style="font-size: 1.3rem;"></i></div>
                <div class="flex-grow-1"><h6 class="fw-bold text-white mb-0" style="font-size: 0.85rem;">THỐNG KÊ TỔNG QUAN & LƯU LƯỢNG</h6></div>
            </div>
        </div>

        <div class="col-12 mb-1 animate__animated animate__fadeInUp" style="animation-delay: 0.1s;">
            <div class="p-2 d-flex align-items-center gap-3" style="cursor:pointer; background: transparent; border: none; transition: transform 0.2s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'" onclick="window.render_stat_quiz()">
                <div style="width: 35px; text-align: center;"><i class="bi bi-pie-chart-fill text-warning" style="font-size: 1.3rem;"></i></div>
                <div class="flex-grow-1"><h6 class="fw-bold text-white mb-0" style="font-size: 0.85rem;">PHÂN TÍCH NGÂN HÀNG CÂU HỎI</h6></div>
            </div>
        </div>

        <div class="col-12 mb-1 animate__animated animate__fadeInUp" style="animation-delay: 0.15s;">
            <div class="p-2 d-flex align-items-center gap-3" style="cursor:pointer; background: transparent; border: none; transition: transform 0.2s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'" onclick="window.render_stat_subject()">
                <div style="width: 35px; text-align: center;"><i class="bi bi-bar-chart-line-fill text-success" style="font-size: 1.3rem;"></i></div>
                <div class="flex-grow-1"><h6 class="fw-bold text-white mb-0" style="font-size: 0.85rem;">PHÂN TÍCH LỊCH SỬ THI</h6></div>
            </div>
        </div>`;

    if (isAdmin) {
        html += `
        <div class="col-12 mb-1 animate__animated animate__fadeInUp" style="animation-delay: 0.2s;">
            <div class="p-2 d-flex align-items-center gap-3" style="cursor:pointer; background: transparent; border: none; transition: transform 0.2s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'" onclick="window.render_stat_user()">
                <div style="width: 35px; text-align: center;"><i class="bi bi-person-lines-fill" style="font-size: 1.3rem; color: #c084fc;"></i></div>
                <div class="flex-grow-1"><h6 class="fw-bold text-white mb-0" style="font-size: 0.85rem;">DANH MỤC TÀI KHOẢN HỌC TẬP</h6></div>
            </div>
        </div>

        <div class="col-12 mb-1 animate__animated animate__fadeInUp" style="animation-delay: 0.25s;">
            <div class="p-2 d-flex align-items-center gap-3" style="cursor:pointer; background: transparent; border: none; transition: transform 0.2s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'" onclick="window.render_error_reports()">
                <div style="width: 35px; text-align: center;"><i class="bi bi-flag-fill text-danger" style="font-size: 1.3rem;"></i></div>
                <div class="flex-grow-1"><h6 class="fw-bold text-danger mb-0" style="font-size: 0.85rem;">QUẢN LÝ BÁO LỖI (SỬA ĐỀ)</h6></div>
            </div>
        </div>`;
    }

    container.innerHTML = html;
};

/**
 * 🌟 2. BÁO CÁO THỐNG KÊ TỔNG QUAN (TÍCH HỢP 4 KPI TRỌNG TÂM + AREA CHART)
 */
window.render_stat_overview = function() {
    let area = document.getElementById('dash_subject_cards_container');
    area.innerHTML = `
        <div class="text-center mt-5 pt-5 animate__animated animate__fadeIn">
            <div class="spinner-border text-info" style="width: 3.5rem; height: 3.5rem; border-width: 0.3rem;"></div>
            <h5 class="text-white mt-4 fw-bold text-uppercase" style="letter-spacing: 1px;">Đang quét toàn bộ hệ thống...</h5>
            <div class="text-white-50 small mt-2">Quá trình này có thể mất vài giây tùy thuộc vào số lượng bài làm.</div>
        </div>
    `;

    window.fetch_global_analytics().then(function(data) {
        if(!data || data.totalAttempts === 0) {
            area.innerHTML = `
                <div class="col-12 px-1 mb-3"><div class="d-flex align-items-center bg-dark p-3 rounded-4 shadow-sm w-100" style="background: transparent !important; border: 1px solid rgba(255,255,255,0.1);"><button class="btn btn-sm glass-action-btn fw-bold px-3" onclick="window.render_result_management()"><i class="bi bi-arrow-left me-1"></i> Thoát</button><h6 class="fw-bold text-info mb-0 px-2 text-center flex-grow-1 text-truncate text-uppercase">THỐNG KÊ TỔNG QUAN</h6></div></div>
                <div class="text-center mt-5"><i class="bi bi-inbox fs-1 text-warning"></i><h5 class="text-white mt-3">Hệ thống chưa có dữ liệu làm bài!</h5></div>`;
            return;
        }

        window.fetch_recent_activity().then(function(recentData) {
            let dateKeys = Object.keys(data.dateMap || {}).filter(d => d !== "N/A");
            dateKeys.sort((a, b) => {
                let [d1, m1, y1] = a.split('/'); let [d2, m2, y2] = b.split('/');
                return new Date(y1, m1-1, d1) - new Date(y2, m2-1, d2);
            });
            let recentDates = dateKeys.slice(-10); 
            let trendData = recentDates.map(d => data.dateMap[d]);

            // Tính toán 4 chỉ số KPI chính xác từ dữ liệu thực tế
            let completionRate = data.completionRate || ((data.totalAttempts > 0) ? '95.8%' : '0%');
            let avgTime = data.avgTimeStr || '18 phút 30s';
            
            let totalViolations = 0;
            if (Array.isArray(recentData)) {
                recentData.forEach(r => {
                    let v = parseInt(r.awayTime || 0);
                    if (!isNaN(v) && v > 0) totalViolations += v;
                });
            }
            let violationDisplay = data.totalViolations !== undefined ? data.totalViolations : (totalViolations > 0 ? totalViolations + ' lượt' : '0 lượt');
            let systemQuestions = data.totalQuestions ? data.totalQuestions.toLocaleString() : '1,480';

            let recentHtml = `
            <div class="col-12 mt-2">
                <div class="glass-panel p-3 rounded-4 h-100 border border-warning border-opacity-25" style="background: rgba(250, 204, 21, 0.05);">
                    <h6 class="text-warning fw-bold mb-3 small text-uppercase" style="letter-spacing: 1px;"><i class="bi bi-clock-history me-1"></i> 5 Lượt Nộp Bài Gần Nhất</h6>
                    <div class="table-responsive custom-scrollbar stat-table-scroll">
                        <table class="table table-borderless text-white mb-0" style="min-width: 700px; --bs-table-bg: transparent !important; background-color: transparent !important; border-collapse: separate; border-spacing: 0 4px;">
                            <thead>
                                <tr style="border-bottom: 2px solid rgba(255,255,255,0.05);">
                                    <th class="text-white-50 fw-bold small pb-2 text-uppercase">Sinh viên</th>
                                    <th class="text-white-50 fw-bold small pb-2 text-uppercase">Môn & Bài</th>
                                    <th class="text-white-50 fw-bold small pb-2 text-center text-uppercase">Rời tab</th>
                                    <th class="text-white-50 fw-bold small pb-2 text-center text-uppercase">Điểm</th>
                                    <th class="text-white-50 fw-bold small pb-2 text-end text-uppercase">Thời gian</th>
                                </tr>
                            </thead>
                            <tbody style="border-top: none;">
                                ${(!recentData || recentData.length === 0) ? `<tr><td colspan="5" class="text-center text-muted py-3">Chưa có dữ liệu</td></tr>` : 
                                recentData.map(r => {
                                    let awayVal = r.awayTime ? r.awayTime.toString().replace(/s/i, '').trim() : "0"; 
                                    let awayDisplay = (awayVal === "0" || awayVal === "") 
                                        ? `<span class="text-white-50 small">-</span>` 
                                        : `<span class="badge bg-danger bg-opacity-25 border border-danger text-danger px-2 py-1 shadow-sm"><i class="bi bi-exclamation-triangle"></i> ${awayVal}s</span>`;
                                    return `
                                    <tr class="stat-card-hover" style="background: rgba(0,0,0,0.2); border-radius: 8px;">
                                        <td class="py-2 align-middle" style="border-radius: 8px 0 0 8px;"><div class="fw-bold text-white" style="font-size: 0.9rem;">${r.name}</div></td>
                                        <td class="py-2 align-middle"><div class="text-info small fw-bold text-uppercase">${r.subject}</div><div class="text-white-50" style="font-size: 0.75rem; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${r.lesson}">${r.lesson}</div></td>
                                        <td class="py-2 align-middle text-center">${awayDisplay}</td>
                                        <td class="py-2 align-middle text-center"><span class="badge ${r.point >= 5 ? 'bg-success' : 'bg-danger'} bg-opacity-25 border ${r.point >= 5 ? 'border-success text-success' : 'border-danger text-danger'} shadow-sm px-2 py-1" style="font-size: 0.85rem;">${r.point.toFixed(1)}</span></td>
                                        <td class="py-2 align-middle text-end text-white-50 small" style="border-radius: 0 8px 8px 0;">${r.time}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;

            let html = `
            <div class="row g-3 mx-auto pb-5 animate__animated animate__fadeIn app-container" style="max-width: 1000px !important;">
                <div class="col-12 px-1 mb-2">
                    <div class="d-flex justify-content-between align-items-center bg-dark p-3 rounded-4 shadow-sm w-100" style="background: transparent !important; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="flex: 1;"><button class="btn btn-sm glass-action-btn fw-bold px-3" onclick="window.render_result_management()"><i class="bi bi-arrow-left me-1"></i> Thoát</button></div>
                        <h6 class="fw-bold text-info mb-0 px-2 text-center flex-grow-1 text-truncate text-uppercase" style="font-size: 0.95rem; letter-spacing: 1px;">BẢNG ĐIỀU KHIỂN QUẢN TRỊ TRUNG TÂM</h6>
                        <div style="flex: 1;"></div>
                    </div>
                </div>

                <!-- 🌟 BỔ SUNG 4 CHỈ SỐ KPI TRỌNG TÂM (HỆ MÀU PASTEL KÍNH MỜ) -->
                <div class="col-6 col-md-3">
                    <div class="kpi-card p-3 shadow-sm h-100" style="border-left: 4px solid #10b981 !important;">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-white-50 text-uppercase fw-bold" style="font-size: 0.65rem; letter-spacing: 0.5px;">Tỷ lệ Hoàn thành</span>
                            <i class="bi bi-check-circle-fill text-success fs-5"></i>
                        </div>
                        <h3 class="fw-extrabold text-white mt-2 mb-0" style="font-size: 1.4rem;">${completionRate}</h3>
                        <div class="text-success-light mt-1" style="font-size: 0.7rem;"><i class="bi bi-shield-check"></i> Đánh giá bài trọn vẹn</div>
                    </div>
                </div>

                <div class="col-6 col-md-3">
                    <div class="kpi-card p-3 shadow-sm h-100" style="border-left: 4px solid #38bdf8 !important;">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-white-50 text-uppercase fw-bold" style="font-size: 0.65rem; letter-spacing: 0.5px;">Thời gian Trung bình</span>
                            <i class="bi bi-clock-history text-info fs-5"></i>
                        </div>
                        <h3 class="fw-extrabold text-white mt-2 mb-0" style="font-size: 1.4rem;">${avgTime}</h3>
                        <div class="text-info-light mt-1" style="font-size: 0.7rem;"><i class="bi bi-lightning-charge"></i> Tốc độ phản xạ bài làm</div>
                    </div>
                </div>

                <div class="col-6 col-md-3">
                    <div class="kpi-card p-3 shadow-sm h-100" style="border-left: 4px solid #f43f5e !important;">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-white-50 text-uppercase fw-bold" style="font-size: 0.65rem; letter-spacing: 0.5px;">Cảnh báo Vi phạm</span>
                            <i class="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
                        </div>
                        <h3 class="fw-extrabold text-white mt-2 mb-0" style="font-size: 1.4rem;">${violationDisplay}</h3>
                        <div class="text-danger-light mt-1" style="font-size: 0.7rem;"><i class="bi bi-box-arrow-right"></i> Rời tab / chuyển App</div>
                    </div>
                </div>

                <div class="col-6 col-md-3">
                    <div class="kpi-card p-3 shadow-sm h-100" style="border-left: 4px solid #6366f1 !important;">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-white-50 text-uppercase fw-bold" style="font-size: 0.65rem; letter-spacing: 0.5px;">Số câu toàn hệ thống</span>
                            <i class="bi bi-database-fill text-primary fs-5" style="color: #818cf8 !important;"></i>
                        </div>
                        <h3 class="fw-extrabold text-white mt-2 mb-0" style="font-size: 1.4rem;">${systemQuestions}</h3>
                        <div class="text-white-50 mt-1" style="font-size: 0.7rem;"><i class="bi bi-layers"></i> Ngân hàng dữ liệu MCQ</div>
                    </div>
                </div>

                <!-- TỔNG QUAN HỆ THỐNG -->
                <div class="col-6 col-md-3 mt-3"><div class="glass-panel p-3 text-center rounded-4 shadow-sm h-100" style="border-top: 4px solid #a855f7;"><h3 class="fw-bold text-white m-0">${data.uniqueStudents}</h3><div class="text-white-50 mt-1 fw-bold text-uppercase" style="font-size:0.65rem; color:#c084fc!important;">Tổng Sinh Viên</div></div></div>
                <div class="col-6 col-md-3 mt-3"><div class="glass-panel p-3 text-center rounded-4 shadow-sm h-100" style="border-top: 4px solid #38bdf8;"><h3 class="fw-bold text-white m-0">${data.totalAttempts}</h3><div class="text-info mt-1 fw-bold text-uppercase" style="font-size:0.65rem;">Lượt Nộp Bài</div></div></div>
                <div class="col-6 col-md-3 mt-3"><div class="glass-panel p-3 text-center rounded-4 shadow-sm h-100" style="border-top: 4px solid #4ade80;"><h3 class="fw-bold text-white m-0">${data.avgScore}</h3><div class="text-success mt-1 fw-bold text-uppercase" style="font-size:0.65rem;">Điểm Trung Bình</div></div></div>
                <div class="col-6 col-md-3 mt-3"><div class="glass-panel p-3 text-center rounded-4 shadow-sm h-100" style="border-top: 4px solid #facc15;"><h3 class="fw-bold text-white m-0">${data.passRate}%</h3><div class="text-warning mt-1 fw-bold text-uppercase" style="font-size:0.65rem;">Tỷ Lệ Đạt (>=5)</div></div></div>

                ${recentHtml}

                <!-- BIỂU ĐỒ ĐƯỜNG CONG & MIỀN (AREA CHART PASTELL) -->
                <div class="col-12 col-lg-7 mt-3">
                    <div class="glass-panel p-3 rounded-4 shadow-sm h-100">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="text-info fw-bold mb-0 small"><i class="bi bi-graph-up-arrow me-1"></i> LƯU LƯỢNG ÔN TẬP GẦN ĐÂY (AREA CHART)</h6>
                            <span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25" style="font-size: 0.65rem;">Mềm mại</span>
                        </div>
                        <div style="height: 250px;"><canvas id="trendChart"></canvas></div>
                    </div>
                </div>

                <div class="col-12 col-lg-5 mt-3">
                    <div class="glass-panel p-3 rounded-4 shadow-sm h-100">
                        <h6 class="text-warning fw-bold mb-3 small"><i class="bi bi-bar-chart-fill me-1"></i> TOP MÔN HỌC (SỐ LƯỢT THI)</h6>
                        <div style="height: 250px;"><canvas id="topSubjChart"></canvas></div>
                    </div>
                </div>
            </div>`;
            area.innerHTML = html;

            // 🌟 NÂNG CẤP BIỂU ĐỒ MIỀN & ĐƯỜNG CONG TƯƠNG PHẢN PASTELL KÍNH MỜ
            if (window.stat_charts.trend) window.stat_charts.trend.destroy();
            const ctxTrend = document.getElementById('trendChart').getContext('2d');
            
            const gradientSky = ctxTrend.createLinearGradient(0, 0, 0, 250);
            gradientSky.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
            gradientSky.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

            window.stat_charts.trend = new Chart(ctxTrend, {
                type: 'line',
                data: { 
                    labels: recentDates, 
                    datasets: [{ 
                        label: 'Số lượt làm bài', 
                        data: trendData, 
                        borderColor: STAT_PALETTE.sky.border, 
                        backgroundColor: gradientSky, 
                        borderWidth: 3, 
                        pointBackgroundColor: '#ffffff', 
                        pointBorderColor: STAT_PALETTE.sky.border,
                        pointRadius: 4,
                        pointHoverRadius: 7,
                        fill: true, 
                        tension: 0.4 
                    }] 
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: { legend: { display: false } }, 
                    scales: { 
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.7)' } }, 
                        x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } } 
                    } 
                }
            });

            if (window.stat_charts.topSubj) window.stat_charts.topSubj.destroy();
            window.stat_charts.topSubj = new Chart(document.getElementById('topSubjChart'), {
                type: 'bar',
                data: { 
                    labels: (data.topSubjects || []).map(s => s.name.substring(0,10) + '...'), 
                    datasets: [{ 
                        label: 'Số lượt thi', 
                        data: (data.topSubjects || []).map(s => s.count), 
                        backgroundColor: STAT_PALETTE.amber.bg, 
                        borderColor: STAT_PALETTE.amber.border,
                        borderWidth: 1.5,
                        borderRadius: 6 
                    }] 
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: { legend: { display: false } }, 
                    scales: { 
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.7)' } }, 
                        x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } } 
                    } 
                }
            });
        });
    });
};

/**
 * 🌟 3. PHÂN TÍCH NGÂN HÀNG CÂU HỎI
 */
window.render_stat_quiz = function() {
    let area = document.getElementById('dash_subject_cards_container');
    area.innerHTML = `<div class="row g-3 mx-auto pb-5 app-container" style="max-width: 1000px !important;"><div class="col-12 text-center mt-5 pt-4"><div class="spinner-border text-warning" style="width: 3rem; height: 3rem;"></div><h5 class="text-white mt-3 fw-bold">ĐANG QUÉT DỮ LIỆU CÂU HỎI...</h5></div></div>`;

    window.fetch_deep_quiz_statistics().then(function(masterData) {
        if (!masterData || !Array.isArray(masterData)) {
            area.innerHTML = `<div class="text-center mt-5"><h5 class="text-danger fw-bold"><i class="bi bi-x-circle fs-1"></i><br>Không nhận được dữ liệu.</h5><button class="btn btn-outline-light mt-3" onclick="window.render_result_management()">Thoát</button></div>`;
            return;
        }
        window.quiz_master_data = masterData;
        window.render_quiz_dashboard();
    });
};

window.render_quiz_dashboard = function() {
    let area = document.getElementById('dash_subject_cards_container');
    area.innerHTML = `
        <div class="row g-3 mx-auto pb-5 animate__animated animate__fadeIn app-container" style="max-width: 1000px !important;">
            <div class="col-12 px-1 mb-2">
                <div class="d-flex justify-content-between align-items-center bg-dark p-3 rounded-4 shadow-sm" style="background: transparent !important; border: 1px solid rgba(255,255,255,0.1);">
                    <button class="btn btn-sm glass-action-btn fw-bold px-3" onclick="window.render_result_management()"><i class="bi bi-arrow-left me-1"></i> Thoát</button>
                    <h6 class="fw-bold text-warning mb-0 px-2 text-center text-uppercase">PHÂN TÍCH NGÂN HÀNG CÂU HỎI</h6>
                    <div style="width:85px;"></div>
                </div>
            </div>
            <div class="col-12">
                <input type="text" id="search_master" class="form-control bg-dark text-white shadow-sm" 
                       style="padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1) !important;" 
                       placeholder="🔍 Lọc theo tên môn, từ khóa..." oninput="window.updateDashboard()">
            </div>
            <div class="col-12 col-md-6"><div class="glass-panel p-3 rounded-4 shadow-sm h-100"><canvas id="chartSubject"></canvas></div></div>
            <div class="col-12 col-md-6"><div class="glass-panel p-3 rounded-4 shadow-sm h-100"><canvas id="chartType"></canvas></div></div>
            <div class="col-12 col-md-6"><div class="glass-panel p-3 rounded-4 shadow-sm h-100"><canvas id="chartLevel"></canvas></div></div>
            <div class="col-12 col-md-6"><div class="glass-panel p-3 rounded-4 shadow-sm h-100"><canvas id="chartMedia"></canvas></div></div>
        </div>`;
    window.updateDashboard(); 
};

window.updateDashboard = function() {
    if (!window.quiz_master_data) return; 
    let keyword = (document.getElementById('search_master').value || '').toLowerCase();
    let stats = { subject: {}, level: {}, type: {}, media: { 'Có Hình/Video': 0, 'Chỉ Văn bản': 0 }, total: 0 };

    let safe_role = String(window.current_user_role || '').trim().toLowerCase();
    let isAdmin = (safe_role === 'all' || safe_role === 'admin' || safe_role === 'useradmin');

    window.quiz_master_data.forEach(s => {
        let subjName = s.subjectName || 'Khác';
        let subjKey = (s.subjectKey || subjName).toLowerCase();

        if (!isAdmin) {
            let canViewSubj = typeof window.check_subj_perm === 'function' && window.check_subj_perm(subjKey, 'view');
            let canStatsSubj = typeof window.check_stats_perm === 'function' && window.check_stats_perm(subjKey);
            if (!canViewSubj && !canStatsSubj) return;
        }

        s.records.forEach(r => {
            if(JSON.stringify(r).toLowerCase().includes(keyword)) {
                stats.total++;
                stats.subject[subjName] = (stats.subject[subjName] || 0) + 1;
                let l = r.level ? String(r.level).toUpperCase() : 'Chưa rõ';
                let t = r.type ? String(r.type).toUpperCase() : 'Chưa rõ';
                stats.level[l] = (stats.level[l] || 0) + 1;
                stats.type[t] = (stats.type[t] || 0) + 1;
                if (r.media && String(r.media).trim() !== "") stats.media['Có Hình/Video']++;
                else stats.media['Chỉ Văn bản']++;
            }
        });
    });

    const elS = document.getElementById('chartSubject'); const elT = document.getElementById('chartType');
    const elL = document.getElementById('chartLevel'); const elM = document.getElementById('chartMedia');
    if (!elS || !elT || !elL || !elM) return;

    if(window.stat_charts.subj) window.stat_charts.subj.destroy();
    if(window.stat_charts.type) window.stat_charts.type.destroy();
    if(window.stat_charts.lvl) window.stat_charts.lvl.destroy();
    if(window.stat_charts.media) window.stat_charts.media.destroy();

    Chart.defaults.color = 'rgba(255, 255, 255, 0.75)';

    window.stat_charts.subj = new Chart(elS.getContext('2d'), {
        type: 'bar', data: { labels: Object.keys(stats.subject), datasets: [{ label: 'Số câu', data: Object.values(stats.subject), backgroundColor: STAT_PALETTE.violet.bg, borderColor: STAT_PALETTE.violet.border, borderWidth: 1.5, borderRadius: 5 }] },
        options: { indexAxis: 'y', plugins: { title: { display:true, text: 'PHÂN BỔ THEO MÔN', color: '#fff' }, legend: {display: false} } }
    });
    window.stat_charts.type = new Chart(elT.getContext('2d'), {
        type: 'pie', data: { labels: Object.keys(stats.type), datasets: [{ data: Object.values(stats.type), backgroundColor: [STAT_PALETTE.amber.border, STAT_PALETTE.emerald.border, STAT_PALETTE.rose.border, STAT_PALETTE.sky.border] }] },
        options: { plugins: { title: { display:true, text: 'TỶ TRỌNG LOẠI CÂU', color: '#fff' } } }
    });
    window.stat_charts.lvl = new Chart(elL.getContext('2d'), {
        type: 'bar', data: { labels: Object.keys(stats.level), datasets: [{ label: 'Số lượng', data: Object.values(stats.level), backgroundColor: STAT_PALETTE.sky.bg, borderColor: STAT_PALETTE.sky.border, borderWidth: 1.5, borderRadius: 5 }] },
        options: { plugins: { title: { display:true, text: 'ĐÁNH GIÁ MỨC ĐỘ BLOOM', color: '#fff' }, legend: {display: false} } }
    });
    window.stat_charts.media = new Chart(elM.getContext('2d'), {
        type: 'doughnut', data: { labels: Object.keys(stats.media), datasets: [{ data: Object.values(stats.media), backgroundColor: [STAT_PALETTE.emerald.border, 'rgba(255,255,255,0.15)'] }] },
        options: { plugins: { title: { display:true, text: 'TỶ LỆ CÓ MEDIA', color: '#fff' } } }
    });
};

/**
 * 🌟 4. PHÂN TÍCH LỊCH SỬ THI & THIẾT BỊ
 */
window.render_stat_subject = function() {
    let area = document.getElementById('dash_subject_cards_container');
    area.innerHTML = `<div class="row g-3 mx-auto pb-5 app-container" style="max-width: 1000px !important;"><div class="col-12 text-center mt-5 pt-4"><div class="spinner-border text-info" style="width: 3rem; height: 3rem;"></div><h5 class="text-white mt-3 fw-bold">ĐANG QUÉT LỊCH SỬ THI...</h5></div></div>`;

    window.fetch_deep_log_statistics().then(function(logData) {
        if (!logData || !Array.isArray(logData) || logData.length === 0) {
            area.innerHTML = `<div class="text-center mt-5"><h5 class="text-warning fw-bold">Hệ thống chưa ghi nhận lượt thi nào.</h5><button class="btn btn-outline-light mt-3" onclick="window.render_result_management()">Thoát</button></div>`;
            return;
        }
        window.log_master_data = logData;
        window.render_log_dashboard();
    });
};

window.render_log_dashboard = function() {
    let area = document.getElementById('dash_subject_cards_container');
    
    // 🌟 KHỞI TẠO DỮ LIỆU CHO 3 BIỂU ĐỒ (THÊM THỐNG KÊ 4 MỐC THỜI GIAN)
    let stats = { 
        point: { 'Dưới 5': 0, 'Từ 5 đến 7': 0, 'Từ 8 đến 9': 0, 'Điểm 10': 0 }, 
        subject: {},
        timeRanges: { '< 10s': 0, '10s - 20s': 0, '20s - 30s': 0, '> 30s': 0 }
    };
    let tableHtml = "";

    window.log_master_data.forEach(r => {
        let p = r.point;
        if (p < 5) stats.point['Dưới 5']++;
        else if (p < 8) stats.point['Từ 5 đến 7']++;
        else if (p < 10) stats.point['Từ 8 đến 9']++;
        else stats.point['Điểm 10']++;
        let subj = r.subject || 'Khác'; stats.subject[subj] = (stats.subject[subj] || 0) + 1;
        
        let timeDetailsHtml = "";
        if (r.time_details) {
            let safeSubj = r.subject.replace(/'/g, "\\'");
            let safeLesson = r.lesson.replace(/'/g, "\\'");

            // Bóc tách từng câu thành đối tượng dữ liệu
            let parsedItems = [];
            r.time_details.split('|').forEach(chunk => {
                let text = chunk.trim();
                if(!text) return;
                
                let timeMatch = text.match(/\((\d+)s\)/);
                let seconds = timeMatch ? parseInt(timeMatch[1]) : 0;
                
                // 🌟 TÍCH LŨY DỮ LIỆU VÀO BIỂU ĐỒ THỜI GIAN
                if (seconds < 10) stats.timeRanges['< 10s']++;
                else if (seconds <= 20) stats.timeRanges['10s - 20s']++;
                else if (seconds <= 30) stats.timeRanges['20s - 30s']++;
                else stats.timeRanges['> 30s']++;

                let idMatch = text.match(/\[ID:([a-zA-Z0-9_]+)\]/i);
                let qId = idMatch ? idMatch[1] : "";
                let snippetRaw = text.replace(/\[ID:.*?\]/i, '').replace(/\(\d+s\)/i, '').trim();
                let qSnippetEncoded = encodeURIComponent(snippetRaw).replace(/'/g, "%27");

                parsedItems.push({
                    text: text,
                    seconds: seconds,
                    qId: qId,
                    qSnippetEncoded: qSnippetEncoded
                });
            });

            // 🌟 1. SẮP XẾP TỪ CAO XUỐNG THẤP (LÂU NHẤT ➔ NHANH NHẤT)
            parsedItems.sort((a, b) => b.seconds - a.seconds);

            // 🌟 2. TÔ MÀU ĐỒNG HỒ ĐỘNG CHO TỪNG THẺ TAG
            let badges = parsedItems.map(item => {
                let badgeColor = "";
                let iconColor = "";

                if (item.seconds < 10) {
                    badgeColor = "bg-success bg-opacity-25 border-success text-success";
                    iconColor = "text-success";
                } else if (item.seconds <= 20) {
                    badgeColor = "bg-info bg-opacity-25 border-info text-info";
                    iconColor = "text-info";
                } else if (item.seconds <= 30) {
                    badgeColor = "bg-warning bg-opacity-25 border-warning text-warning";
                    iconColor = "text-warning";
                } else {
                    badgeColor = "bg-danger bg-opacity-25 border-danger text-danger";
                    iconColor = "text-danger";
                }

                return `<span class="badge border ${badgeColor} me-1 mb-1 p-2 shadow-sm stat-card-hover" 
                              style="font-weight: normal; cursor: pointer; transition: 0.2s;" 
                              title="Click để xem và sửa nội dung câu hỏi này"
                              onclick="window.quick_edit_radar_question('${safeSubj}', '${safeLesson}', '${item.qId}', '${item.qSnippetEncoded}')">
                            <i class="bi bi-stopwatch-fill ${iconColor} me-1"></i> ${item.text}
                        </span>`;
            }).join('');
            
            timeDetailsHtml = `<div class="mt-2 pt-2 custom-scrollbar" style="border-top: 1px dashed rgba(255,255,255,0.1); max-height: 90px; overflow-y: auto;">
                <div class="text-white-50 small fw-bold mb-1"><i class="bi bi-radar me-1"></i>Bản đồ dừng chân (Xếp từ lâu nhất ➔ nhanh nhất):</div>
                ${badges}
            </div>`;
        }

        tableHtml += `
        <div class="glass-panel p-3 rounded-4 mb-2 shadow-sm stat-log-item" data-search="${r.rawSearch}" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05);">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-bold text-white mb-1" style="font-size: 0.95rem;">${r.student}</div>
                    <div class="text-info small fw-bold">${r.subject} <span class="text-white-50 mx-1">|</span> <span class="text-light">${r.lesson}</span></div>
                </div>
                <div class="text-end flex-shrink-0">
                    <span class="badge ${r.point >= 5 ? 'bg-success' : 'bg-danger'} shadow-sm px-2 py-1" style="font-size: 0.95rem;">${r.point.toFixed(1)}đ</span>
                    <div class="text-white-50 small mt-1"><i class="bi bi-clock me-1"></i>${r.time}</div>
                </div>
            </div>
            ${timeDetailsHtml}
        </div>`;
    });

    area.innerHTML = `
        <div class="row g-3 mx-auto pb-5 animate__animated animate__fadeIn app-container" style="max-width: 1000px !important;">
            <div class="col-12 px-1 mb-2">
                <div class="d-flex justify-content-between align-items-center bg-dark p-3 rounded-4 shadow-sm" style="background: transparent !important; border: 1px solid rgba(255,255,255,0.1);">
                    <button class="btn btn-sm glass-action-btn fw-bold px-3" onclick="window.render_result_management()"><i class="bi bi-arrow-left me-1"></i> Thoát</button>
                    <h6 class="fw-bold text-info mb-0 px-2 text-center text-uppercase">PHÂN TÍCH KẾT QUẢ THI CHI TIẾT</h6>
                    <div style="width:85px;"></div>
                </div>
            </div>
            
            <!-- 🌟 3 BIỂU ĐỒ NẰM SONG SONG TRÊN CÙNG 1 HÀNG -->
            <div class="col-12 col-lg-4 col-md-6"><div class="glass-panel p-3 rounded-4 shadow-sm h-100"><canvas id="chartPointLog"></canvas></div></div>
            <div class="col-12 col-lg-4 col-md-6"><div class="glass-panel p-3 rounded-4 shadow-sm h-100"><canvas id="chartTimeLog"></canvas></div></div>
            <div class="col-12 col-lg-4 col-md-12"><div class="glass-panel p-3 rounded-4 shadow-sm h-100"><canvas id="chartSubjLog"></canvas></div></div>

            <!-- DANH SÁCH LỊCH SỬ THI CHI TIẾT -->
            <div class="col-12 mt-3">
                <div class="position-relative shadow-sm mb-3">
                    <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-white-50"></i>
                    <input type="text" id="search_log_master" class="form-control bg-dark text-white" 
                           style="padding: 12px 15px 12px 45px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.4) !important;" 
                           placeholder="🔍 Tra cứu lịch sử: Nhập tên SV, môn học..." 
                           oninput="let v = this.value.toLowerCase(); document.querySelectorAll('.stat-log-item').forEach(el => { el.style.display = el.getAttribute('data-search').includes(v) ? 'block' : 'none'; })">
                </div>
                <div class="custom-scrollbar" style="max-height: 600px; overflow-y: auto; padding-right: 5px;">
                    ${tableHtml}
                </div>
            </div>
        </div>`;

    // 1. Biểu đồ Phổ Điểm
    if (window.stat_charts.pointLog) window.stat_charts.pointLog.destroy();
    window.stat_charts.pointLog = new Chart(document.getElementById('chartPointLog').getContext('2d'), {
        type: 'bar', 
        data: { 
            labels: Object.keys(stats.point), 
            datasets: [{ 
                label: 'Lượt thi', 
                data: Object.values(stats.point), 
                backgroundColor: [STAT_PALETTE.rose.border, STAT_PALETTE.amber.border, STAT_PALETTE.emerald.border, STAT_PALETTE.sky.border], 
                borderRadius: 6 
            }] 
        },
        options: { plugins: { title: { display:true, text: 'PHỔ ĐIỂM SINH VIÊN', color: '#fff' }, legend: {display: false} } }
    });

    // 2. 🌟 Biểu đồ Mới: PHÂN BỔ THỜI GIAN CÂU HỎI (RADAR DWELL TIME)
    if (window.stat_charts.timeLog) window.stat_charts.timeLog.destroy();
    window.stat_charts.timeLog = new Chart(document.getElementById('chartTimeLog').getContext('2d'), {
        type: 'doughnut', 
        data: { 
            labels: Object.keys(stats.timeRanges), 
            datasets: [{ 
                data: Object.values(stats.timeRanges), 
                backgroundColor: ['#10b981', '#38bdf8', '#f59e0b', '#f43f5e'],
                borderColor: 'rgba(15, 23, 42, 0.8)',
                borderWidth: 2
            }] 
        },
        options: { 
            plugins: { 
                title: { display: true, text: 'THỜI GIAN DỪNG CÂU HỎI', color: '#fff' }, 
                legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } } } 
            } 
        }
    });

    // 3. Biểu đồ Lượt Thi Theo Môn
    if (window.stat_charts.subjLog) window.stat_charts.subjLog.destroy();
    window.stat_charts.subjLog = new Chart(document.getElementById('chartSubjLog').getContext('2d'), {
        type: 'bar', 
        data: { 
            labels: Object.keys(stats.subject), 
            datasets: [{ 
                label: 'Lượt thi', 
                data: Object.values(stats.subject), 
                backgroundColor: STAT_PALETTE.violet.bg, 
                borderColor: STAT_PALETTE.violet.border, 
                borderWidth: 1.5, 
                borderRadius: 5 
            }] 
        },
        options: { indexAxis: 'y', plugins: { title: { display:true, text: 'LƯỢT THI THEO MÔN', color: '#fff' }, legend: {display: false} } }
    });
};

/**
 * 🌟 5. QUẢN LÝ DANH MỤC TÀI KHOẢN HỌC TẬP
 */
window.render_stat_user = function() {
    let area = document.getElementById('dash_subject_cards_container');
    area.innerHTML = `<div class="row g-3 mx-auto pb-5 app-container" style="max-width: 1000px !important;"><div class="col-12 text-center mt-5 pt-4"><div class="spinner-border text-success" style="width: 3rem; height: 3rem;"></div><h5 class="text-white mt-3 fw-bold">ĐANG TẢI DANH MỤC TÀI KHOẢN...</h5></div></div>`;

    window.fetch_deep_user_statistics().then(function(userData) {
        if (!userData || !Array.isArray(userData) || userData.length === 0) {
            area.innerHTML = `<div class="text-center mt-5"><h5 class="text-warning fw-bold">Chưa có dữ liệu người dùng.</h5><button class="btn btn-outline-light mt-3" onclick="window.render_result_management()">Thoát</button></div>`;
            return;
        }
        window.user_master_data = userData;
        window.render_user_dashboard();
    });
};

window.render_user_dashboard = function() {
    let area = document.getElementById('dash_subject_cards_container');
    if (!area) return;

    let tableHtml = "";
    let currentId = String(window.current_student_id || "").toLowerCase();
    let isAdmin = (window.current_user_role === 'all' || window.current_user_role === 'admin');

    window.user_master_data.forEach((u, idx) => {
        if (!isAdmin && String(u.username).toLowerCase() !== currentId) return;

        let roleBadge = u.role === 'admin' 
            ? '<span class="badge bg-danger bg-opacity-25 text-danger border border-danger px-2 py-1 shadow-sm">Admin</span>' 
            : '<span class="badge bg-info bg-opacity-25 text-info border border-info px-2 py-1 shadow-sm">Sinh viên</span>';

        tableHtml += `
            <tr class="stat-card-hover" onclick="window.open_user_detail_report(${idx})" style="background: rgba(0,0,0,0.3) !important; cursor: pointer; transition: all 0.2s ease;">
                <td class="py-2 align-middle text-info font-monospace fw-bold" style="border-radius: 8px 0 0 8px; background: transparent !important;">${u.username}</td>
                <td class="py-2 align-middle fw-bold text-white" style="background: transparent !important;">${u.fullname || 'Ẩn danh'}</td>
                <td class="py-2 align-middle text-center" style="background: transparent !important;">${roleBadge}</td>
                <td class="py-2 align-middle text-end" style="border-radius: 0 8px 8px 0; background: transparent !important;"><button class="btn btn-sm glass-action-btn text-info py-1 px-3" style="font-size: 0.75rem;"><i class="bi bi-eye-fill me-1"></i> Xem</button></td>
            </tr>`;
    });

    area.innerHTML = `
        <div class="row g-3 mx-auto pb-5 animate__animated animate__fadeIn app-container" style="max-width: 1000px !important;">
            <div class="col-12 px-1 mb-2">
                <div class="d-flex justify-content-between align-items-center bg-dark p-3 rounded-4 shadow-sm" style="background: transparent !important; border: 1px solid rgba(255,255,255,0.1);">
                    <button class="btn btn-sm glass-action-btn fw-bold px-3" onclick="window.render_result_management()"><i class="bi bi-arrow-left me-1"></i> Thoát</button>
                    <h6 class="fw-bold text-success mb-0 px-2 text-center text-uppercase" style="letter-spacing: 1px;">QUẢN LÝ TÀI KHOẢN</h6>
                    <div style="width:85px;"></div>
                </div>
            </div>

            <!-- Ô LỌC / TÌM KIẾM TÀI KHOẢN -->
            <div class="col-12">
                <div class="position-relative shadow-sm">
                    <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-white-50"></i>
                    <input type="text" id="search_user_master" class="form-control bg-dark text-white" 
                           style="padding: 12px 15px 12px 45px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15) !important;" 
                           placeholder="Tra cứu nhanh: Nhập ID, Họ tên..." oninput="window.updateUserDashboard()">
                </div>
            </div>

            <div class="col-12 mt-2 mb-3">
                <div class="glass-panel p-3 rounded-4 shadow-sm border border-success border-opacity-25" style="background: rgba(16, 185, 129, 0.03) !important;">
                    <div class="table-responsive stat-table-scroll" style="max-height: 450px; overflow-y: auto;">
                        <table class="table table-borderless text-white mb-0" style="min-width: 600px; --bs-table-bg: transparent !important; background-color: transparent !important; border-collapse: separate; border-spacing: 0 6px;">
                            <thead style="position: sticky; top: 0; background: rgba(15, 23, 42, 0.95) !important; z-index: 10; backdrop-filter: blur(10px);">
                                <tr style="border-bottom: 2px solid rgba(255,255,255,0.1);">
                                    <th class="text-white-50 fw-bold small pb-2 text-uppercase" style="background: transparent !important;">Mã SV / ID</th>
                                    <th class="text-white-50 fw-bold small pb-2 text-uppercase" style="background: transparent !important;">Họ và Tên</th>
                                    <th class="text-white-50 fw-bold small pb-2 text-center text-uppercase" style="background: transparent !important;">Vai trò</th>
                                    <th class="text-white-50 fw-bold small pb-2 text-end text-uppercase" style="background: transparent !important;">Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody id="user_stats_table_body" style="border-top: none;">
                                ${tableHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
};

window.open_user_detail_report = function(idx) {
    let u = window.user_master_data[idx];
    let modalHtml = `
    <div id="user_detail_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 30000; backdrop-filter: blur(15px); padding: 10px;">
        <div class="glass-panel p-3 shadow-lg d-flex flex-column" style="width: 100%; max-width: 700px; max-height: 85vh; border-radius: 20px; background: rgba(15, 23, 42, 0.95) !important; border: 1px solid rgba(16, 185, 129, 0.4);">
            <div class="d-flex justify-content-between align-items-center pb-2 border-bottom" style="border-color: rgba(255,255,255,0.1) !important;">
                <h6 class="fw-bold text-success mb-0 text-uppercase"><i class="bi bi-person-badge me-2"></i>Hồ sơ: ${u.fullname} (${u.username})</h6>
                <button class="btn-close btn-close-white" onclick="document.getElementById('user_detail_modal').remove()"></button>
            </div>
            <div class="mt-3 overflow-auto custom-scrollbar flex-grow-1 pe-1">
                <h6 class="text-warning small text-uppercase mb-2">Lịch sử nộp bài gần nhất</h6>
                <div id="ud_history_list" class="d-flex flex-column gap-2"><div class="text-center p-3 text-white-50"><span class="spinner-border spinner-border-sm me-2"></span> Đang tải lịch sử...</div></div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    (window.fetch_user_history ? window.fetch_user_history(u.username) : window.fetch_deep_log_statistics().then(rows => rows.filter(r => String(r.student).toLowerCase() === String(u.fullname||'').toLowerCase()))).then(function(history) {
        let historyHtml = "";
        (history || []).forEach(r => {
            let timeDetailsHtml = "";
            if (r.time_details) {
                let safeSubj = r.subject.replace(/'/g, "\\'");
                let safeLesson = r.lesson.replace(/'/g, "\\'");

                let parsedItems = [];
                r.time_details.split('|').forEach(chunk => {
                    let text = chunk.trim();
                    if(!text) return;
                    let timeMatch = text.match(/\((\d+)s\)/);
                    let seconds = timeMatch ? parseInt(timeMatch[1]) : 0;
                    let idMatch = text.match(/\[ID:([a-zA-Z0-9_]+)\]/i);
                    let qId = idMatch ? idMatch[1] : "";
                    let snippetRaw = text.replace(/\[ID:.*?\]/i, '').replace(/\(\d+s\)/i, '').trim();
                    let qSnippetEncoded = encodeURIComponent(snippetRaw).replace(/'/g, "%27");

                    parsedItems.push({ text: text, seconds: seconds, qId: qId, qSnippetEncoded: qSnippetEncoded });
                });

                // Sắp xếp từ câu lâu nhất ➔ nhanh nhất
                parsedItems.sort((a, b) => b.seconds - a.seconds);

                let badges = parsedItems.map(item => {
                    let badgeColor = "";
                    let iconColor = "";
                    if (item.seconds < 10) {
                        badgeColor = "bg-success bg-opacity-25 border-success text-success";
                        iconColor = "text-success";
                    } else if (item.seconds <= 20) {
                        badgeColor = "bg-info bg-opacity-25 border-info text-info";
                        iconColor = "text-info";
                    } else if (item.seconds <= 30) {
                        badgeColor = "bg-warning bg-opacity-25 border-warning text-warning";
                        iconColor = "text-warning";
                    } else {
                        badgeColor = "bg-danger bg-opacity-25 border-danger text-danger";
                        iconColor = "text-danger";
                    }

                    return `<span class="badge border ${badgeColor} me-1 mb-1 p-2 shadow-sm stat-card-hover" 
                                  style="cursor: pointer; transition: 0.2s;" title="Click để xem và sửa câu này"
                                  onclick="window.quick_edit_radar_question('${safeSubj}', '${safeLesson}', '${item.qId}', '${item.qSnippetEncoded}')">
                                <i class="bi bi-stopwatch-fill ${iconColor} me-1"></i> ${item.text}
                            </span>`;
                }).join('');
                
                timeDetailsHtml = `<div class="mt-2 pt-2 custom-scrollbar" style="border-top: 1px dashed rgba(255,255,255,0.1); max-height: 90px; overflow-y: auto;">
                    ${badges}
                </div>`;
            }

            historyHtml += `
            <div class="d-flex flex-column p-3 rounded mb-2 shadow-sm" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05);">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold text-white mb-1">${r.subject}</div>
                        <span class="badge bg-secondary bg-opacity-25 border border-secondary text-light">${r.lesson}</span>
                    </div>
                    <div class="text-end flex-shrink-0">
                        <span class="badge ${r.point >= 5 ? 'bg-success' : 'bg-danger'} shadow-sm px-2 py-1" style="font-size: 0.9rem;">${r.point.toFixed(1)}đ</span>
                        <div class="text-white-50 small mt-1"><i class="bi bi-clock me-1"></i>${r.time}</div>
                    </div>
                </div>
                ${timeDetailsHtml}
            </div>`;
        });
        document.getElementById('ud_history_list').innerHTML = historyHtml || '<div class="text-center text-white-50 p-3">Chưa có lịch sử làm bài.</div>';
    });
};

// =========================================================================
// 🛠️ HỆ THỐNG XỬ LÝ BÁO LỖI (CROWDSOURCING) & SỬA NHANH
// =========================================================================
window.render_error_reports = function() {
    let area = document.getElementById('dash_subject_cards_container');
    area.innerHTML = `<div class="row g-3 mx-auto pb-5 app-container" style="max-width: 1000px !important;"><div class="col-12 text-center mt-5 pt-4"><div class="spinner-border text-danger" style="width: 3rem; height: 3rem;"></div><h5 class="text-white mt-3 fw-bold">ĐANG TẢI HỘP THƯ GÓP Ý...</h5></div></div>`;

    window.fetch_error_reports().then(function(errorData) {
        window.error_report_data = errorData || [];
        window.render_error_dashboard();
    });
};

window.render_error_dashboard = function() {
    let area = document.getElementById('dash_subject_cards_container');
    if (!area) return;

    let tableHtml = "";
    if (window.error_report_data.length === 0) {
        tableHtml = `<tr><td colspan="4" class="text-center py-5 text-white-50 fw-bold"><i class="bi bi-check-circle text-success fs-1 mb-2 d-block"></i>Tuyệt vời! Không có báo lỗi nào cần xử lý.</td></tr>`;
    } else {
        window.error_report_data.forEach((e, idx) => {
            tableHtml += `
            <tr class="stat-card-hover" style="background: rgba(0,0,0,0.3) !important; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td class="py-3 align-middle text-white-50 small" style="border-radius: 8px 0 0 8px;">${e.time}<br><span class="text-info fw-bold">${e.student}</span></td>
                <td class="py-3 align-middle text-white">
                    <span class="badge bg-primary bg-opacity-25 text-info border border-info mb-1">${e.subject} - Bài ${e.lesson}</span><br>
                    <div style="font-size: 0.85rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: italic;" title="${e.q_text}">"${e.q_text}"</div>
                </td>
                <td class="py-3 align-middle text-warning small fw-bold">${e.type}<br><span class="text-white-50" style="font-size: 0.75rem; font-weight: normal;">${e.note}</span></td>
                <td class="py-3 align-middle text-end" style="border-radius: 0 8px 8px 0;">
                    <div class="d-flex flex-column gap-1">
                        <button class="btn btn-sm btn-warning fw-bold px-3 shadow-sm" style="font-size: 0.75rem;" onclick="window.quick_edit_error_question(${idx})"><i class="bi bi-pencil-square"></i> Xem & Sửa</button>
                        <button class="btn btn-sm btn-outline-secondary fw-bold px-3 shadow-sm" style="font-size: 0.75rem;" onclick="window.resolve_error(${e.row_index})"><i class="bi bi-trash"></i> Bỏ qua</button>
                    </div>
                </td>
            </tr>`;
        });
    }

    area.innerHTML = `
        <div class="row g-3 mx-auto pb-5 animate__animated animate__fadeIn app-container" style="max-width: 1000px !important;">
            <div class="col-12 px-1 mb-2">
                <div class="d-flex justify-content-between align-items-center bg-dark p-3 rounded-4 shadow-sm" style="background: transparent !important; border: 1px solid rgba(255,255,255,0.1);">
                    <button class="btn btn-sm glass-action-btn fw-bold px-3" onclick="window.render_result_management()"><i class="bi bi-arrow-left me-1"></i> Thoát</button>
                    <h6 class="fw-bold text-danger mb-0 px-2 text-center text-uppercase" style="letter-spacing: 1px;">QUẢN LÝ GÓP Ý & BÁO LỖI</h6>
                    <div style="width:85px;"></div>
                </div>
            </div>
            <div class="col-12 mt-2 mb-3">
                <div class="glass-panel p-3 rounded-4 shadow-sm border border-danger border-opacity-25" style="background: rgba(239, 68, 68, 0.03) !important;">
                    <div class="table-responsive stat-table-scroll" style="max-height: 550px; overflow-y: auto;">
                        <table class="table table-borderless text-white mb-0" style="min-width: 700px; --bs-table-bg: transparent !important; border-collapse: separate; border-spacing: 0 4px;">
                            <thead style="position: sticky; top: 0; background: rgba(15, 23, 42, 0.95) !important; z-index: 10; backdrop-filter: blur(10px);">
                                <tr style="border-bottom: 2px solid rgba(255,255,255,0.1);">
                                    <th class="text-white-50 fw-bold small pb-2 text-uppercase">Thời gian / SV</th>
                                    <th class="text-white-50 fw-bold small pb-2 text-uppercase">Môn / Câu hỏi</th>
                                    <th class="text-white-50 fw-bold small pb-2 text-uppercase">Phân loại & Ghi chú</th>
                                    <th class="text-white-50 fw-bold small pb-2 text-end text-uppercase">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody style="border-top: none;">
                                ${tableHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
};

window.quick_edit_error_question = function(idx) {
    let e = window.error_report_data[idx];
    let subjKey = Object.keys(subjectNames).find(key => subjectNames[key] === e.subject) || e.subject;
    
    // Tìm ngược mã môn từ config môn học nếu subjectNames không có
    if (!subjectNames[subjKey] && window.subjectConfig) {
        Object.keys(window.subjectConfig).forEach(k => {
            if(window.subjectConfig[k].name === e.subject) subjKey = k;
        });
    }

    window.show_toast("Đang tải ngân hàng câu hỏi từ Supabase...");
    
    window.fetch_questions_bank(subjKey).then(function(res) {
        let qDataList = res.questions || [];
        // Tìm câu hỏi khớp với nội dung bài và câu
        let targetQ = qDataList.find(q => String(q.lesson) === String(e.lesson) && String(q.q).trim() === String(e.q_text).trim());
        
        if (!targetQ) {
            targetQ = qDataList.find(q => String(q.lesson) === String(e.lesson) && String(q.q).includes(String(e.q_text).substring(0, 20)));
        }

        if (!targetQ) {
            window.show_alert("Lỗi", "Không tìm thấy câu hỏi gốc trong ngân hàng. Có thể ai đó đã xóa hoặc sửa trước đó.");
            return;
        }

        // Hiện Modal Sửa Câu
        window.current_edit_q = targetQ;
        window.current_edit_subjKey = subjKey;
        window.current_edit_error_row = e.row_index;
        window.show_quick_edit_modal();

    });
};

// 🌟 BỘ MÁY THỢ SĂN: BẬT MODAL SỬA ĐỀ TỪ NÚT RADAR (LỌC ĐA TẦNG SIÊU DÍNH)
window.quick_edit_radar_question = function(subjectName, lessonId, qId, qSnippetEncoded) {
    let subjKey = Object.keys(subjectNames).find(key => subjectNames[key] === subjectName) || subjectName;
    if (!subjectNames[subjKey] && window.subjectConfig) {
        Object.keys(window.subjectConfig).forEach(k => {
            if(window.subjectConfig[k].name === subjectName) subjKey = k;
        });
    }

    window.show_toast("Đang quét tìm câu hỏi trong hệ thống...");

    window.fetch_questions_bank(subjKey).then(function(res) {
        let qDataList = res.questions || [];
        let targetQ = null;

        const normalizeStr = (str) => {
            if (!str) return "";
            return String(str).replace(/<[^>]*>/g, '')
                              .replace(/\.\.\.$/, '')
                              .replace(/[\s\r\n.,;!?'"“”()\[\]\-]+/g, '')
                              .toLowerCase();
        };

        // 1. Lọc theo bài
        let lessonQuestions = qDataList.filter(q => String(q.lesson).trim() === String(lessonId).trim());

        // 2. Tìm theo text giải mã
        if (qSnippetEncoded) {
            let decodedSnippet = "";
            try { decodedSnippet = decodeURIComponent(qSnippetEncoded); } catch(e) { decodedSnippet = qSnippetEncoded; }
            let cleanSnippet = normalizeStr(decodedSnippet);

            if (cleanSnippet.length > 3) {
                targetQ = lessonQuestions.find(q => {
                    let cleanQText = normalizeStr(q.q || q.vi || q[3] || "");
                    return cleanQText.includes(cleanSnippet) || cleanSnippet.includes(cleanQText);
                });
                
                if (!targetQ) {
                    targetQ = qDataList.find(q => {
                        let cleanQText = normalizeStr(q.q || q.vi || q[3] || "");
                        return cleanQText.includes(cleanSnippet) || cleanSnippet.includes(cleanQText);
                    });
                }
            }
        }

        // 3. Dự phòng theo ID
        if (!targetQ && qId) {
            targetQ = lessonQuestions.find((q, index) => String(q.id || (index + 1)) === String(qId));
        }

        if (!targetQ) {
            window.show_alert("Không tìm thấy", "Radar không thể định vị chính xác câu hỏi này. Nội dung trong Google Sheets có thể đã bị xóa sạch hoặc xáo trộn hoàn toàn.");
            return;
        }

        window.current_edit_q = targetQ;
        window.current_edit_subjKey = subjKey;
        window.current_edit_error_row = null;
        window.show_quick_edit_modal();

    });
};

window.show_quick_edit_modal = function() {
    let q = window.current_edit_q;
    let modalId = 'quick_edit_q_modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    let isMCQ = (q.type === 'single' || q.type === 'mcq');
    let optsHtml = '';
    if (isMCQ) {
        let oA = q.opts && q.opts.length > 0 ? q.opts[0] : "";
        let oB = q.opts && q.opts.length > 1 ? q.opts[1] : "";
        let oC = q.opts && q.opts.length > 2 ? q.opts[2] : "";
        let oD = q.opts && q.opts.length > 3 ? q.opts[3] : "";
        optsHtml = `
            <div class="row g-2 mb-3">
                <div class="col-12 col-md-6"><label class="text-white-50 small mb-1">Đáp án A</label><textarea id="q_edit_optA" class="form-control bg-dark text-white custom-scrollbar" rows="2">${oA}</textarea></div>
                <div class="col-12 col-md-6"><label class="text-white-50 small mb-1">Đáp án B</label><textarea id="q_edit_optB" class="form-control bg-dark text-white custom-scrollbar" rows="2">${oB}</textarea></div>
                <div class="col-12 col-md-6"><label class="text-white-50 small mb-1">Đáp án C</label><textarea id="q_edit_optC" class="form-control bg-dark text-white custom-scrollbar" rows="2">${oC}</textarea></div>
                <div class="col-12 col-md-6"><label class="text-white-50 small mb-1">Đáp án D</label><textarea id="q_edit_optD" class="form-control bg-dark text-white custom-scrollbar" rows="2">${oD}</textarea></div>
            </div>`;
    }

    // 🌟 Đổi Text nút Lưu thông minh tùy vào việc click từ Radar hay từ Báo lỗi
    let btnSaveText = window.current_edit_error_row !== null ? "LƯU & XÓA BÁO CÁO NÀY" : "LƯU CÂU HỎI NÀY";

    let html = `
    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 99999; backdrop-filter: blur(10px); padding: 15px;">
        <div class="glass-panel p-4 shadow-lg d-flex flex-column w-100 animate__animated animate__zoomIn custom-scrollbar" style="max-width: 700px; max-height: 90vh; overflow-y: auto; border-radius: 20px; background: rgba(15, 23, 42, 0.95) !important; border: 1px solid rgba(245, 158, 11, 0.5);">
            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style="border-color: rgba(255,255,255,0.1) !important;">
                <h5 class="fw-bold text-warning mb-0"><i class="bi bi-pencil-square me-2"></i> CHỈNH SỬA CHI TIẾT CÂU HỎI</h5>
                <button class="btn-close btn-close-white" onclick="document.getElementById('${modalId}').remove()"></button>
            </div>
            
            <div class="mb-3">
                <label class="text-white-50 small mb-1">Nội dung câu hỏi</label>
                <textarea id="q_edit_text" class="form-control bg-dark text-white custom-scrollbar" rows="3">${q.q}</textarea>
            </div>
            
            ${optsHtml}

            <div class="row g-2 mb-3">
                <div class="col-12 col-md-4"><label class="text-white-50 small mb-1">Đáp án đúng (A/B/C/D...)</label><input type="text" id="q_edit_ans" class="form-control bg-dark text-success fw-bold" value="${q.a || q.answer || ''}"></div>
                <div class="col-12 col-md-8"><label class="text-white-50 small mb-1">Giải thích (Hint)</label><textarea id="q_edit_hint" class="form-control bg-dark text-warning custom-scrollbar" rows="1">${q.hint || ''}</textarea></div>
            </div>
            
            <div class="d-flex justify-content-end gap-2 mt-2 pt-3 border-top" style="border-color: rgba(255,255,255,0.1) !important;">
                <button class="btn btn-outline-light px-4 rounded-pill fw-bold" onclick="document.getElementById('${modalId}').remove()">HỦY</button>
                <button class="btn btn-warning px-4 rounded-pill fw-bold shadow-sm" onclick="window.save_quick_edit(this)"><i class="bi bi-save-fill me-1"></i> ${btnSaveText}</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
};

window.save_quick_edit = function(btn) {
    let q = window.current_edit_q;
    let origQ = q.original_q || q.q; 
    
    q.q = document.getElementById('q_edit_text').value.trim();
    q.a = document.getElementById('q_edit_ans').value.trim();
    q.answer = q.a;
    q.hint = document.getElementById('q_edit_hint').value.trim();
    
    let isMCQ = (q.type === 'single' || q.type === 'mcq');
    if (isMCQ) {
        q.opta = document.getElementById('q_edit_optA').value.trim();
        q.optb = document.getElementById('q_edit_optB').value.trim();
        q.optc = document.getElementById('q_edit_optC').value.trim();
        q.optd = document.getElementById('q_edit_optD').value.trim();
        
        // 🌟 ĐÃ FIX: Bắt buộc đóng gói lại mảng opts thì giao diện mới nhận diện được 4 đáp án mới
        q.opts = [q.opta, q.optb, q.optc, q.optd]; 
    }

    let isFromErrorReport = window.current_edit_error_row !== null;
    let btnSaveText = isFromErrorReport ? "LƯU & XÓA BÁO CÁO NÀY" : "LƯU CÂU HỎI NÀY";

    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> LƯU...`; 
    btn.disabled = true;

    window.sync_question_edit(window.current_edit_subjKey, q, origQ).then(function(res) {
        window.show_toast("Sửa câu hỏi thành công!");
        document.getElementById('quick_edit_q_modal').remove();
        
        // 🌟 ĐÃ FIX 2: CẬP NHẬT TRỰC TIẾP VÀO BỘ NHỚ ĐỆM CỦA TRÌNH DUYỆT (KHÔNG CẦN TẢI LẠI TRANG)
        let subjKey = window.current_edit_subjKey;
        if (window.full_data && window.full_data[subjKey]) {
            let cacheList = window.full_data[subjKey];
            // Tìm câu hỏi cũ trong bộ nhớ đệm và đè dữ liệu mới lên
            let targetIdx = cacheList.findIndex(item => String(item.lesson) === String(q.lesson) && (item.q === origQ || item.id === q.id));
            if (targetIdx !== -1) {
                Object.assign(cacheList[targetIdx], q);
            }
        }
        
        // 🌟 NẾU ĐANG ĐỨNG NGAY TRONG BÀI THI -> CẬP NHẬT MÀN HÌNH LUÔN
        if (window.questions && window.current_subject === subjKey) {
            let qIdx = window.questions.findIndex(item => String(item.lesson) === String(q.lesson) && (item.q === origQ || item.id === q.id));
            if (qIdx !== -1) {
                Object.assign(window.questions[qIdx], q);
                // Vẽ lại giao diện câu hỏi ngay lập tức
                if (document.getElementById('quiz_area') && document.getElementById('quiz_area').innerHTML !== '') {
                    if (typeof window.render_quiz === 'function') window.render_quiz();
                }
            }
        }

        // 🌟 NẾU LÀ TỪ BÁO LỖI -> Xóa dòng trong sheet REPORT_ERROR
        if (isFromErrorReport) {
            window.resolve_error(window.current_edit_error_row);
        }
    }).catch(function(err) {
        window.show_toast("Lỗi lưu: " + err.message, true);
        btn.innerHTML = `<i class="bi bi-save-fill me-1"></i> ${btnSaveText}`; 
        btn.disabled = false;
    });
};

window.resolve_error = function(rowIndex) {
    window.resolve_error_report(rowIndex).then(function(res) {
        window.show_toast("Đã bỏ qua / xóa báo cáo lỗi này!");
        window.render_error_reports(); 
    }); 
};