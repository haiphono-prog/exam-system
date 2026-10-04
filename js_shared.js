// =========================================================================
// 📱 TỐI ƯU HÓA MOBILE FIRST (CĂN LỀ TRÀN VIỀN VÔ CỰC - ULTRA COMPACT 0.5PX)
// =========================================================================
let oldCss = document.getElementById('mobile_edge_to_edge_css');
if (oldCss) oldCss.remove(); // Ép xóa bản cũ để chống xung đột

let mobileCss = `
<style id="mobile_edge_to_edge_css">
    /* Chỉ áp dụng khi màn hình điện thoại (dưới 768px) */
    @media (max-width: 767.98px) {
        
        /* 1. BẢNG ĐĂNG NHẬP / XÁC THỰC: Ép tràn viền, chỉ chừa đúng 0.5px mỗi bên */
        body > .d-flex .glass-panel, 
        body > .container .glass-panel,
        #login_panel, #auth_panel, .login-container {
            width: calc(100% - 1px) !important; /* 100% trừ đi 0.5px trái + 0.5px phải */
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
            border-radius: 12px !important;
        }

        /* 2. SẢNH DASHBOARD CHÍNH: Ép sát 0.5px */
        .container, .container-fluid {
            padding-left: 0.5px !important;
            padding-right: 0.5px !important;
            max-width: 100% !important;
            overflow-x: hidden;
        }

        #dash_subject_cards_container {
            padding-left: 0.5px !important;
            padding-right: 0.5px !important;
        }
        
        /* Triệt tiêu mọi lề thừa của row Bootstrap */
        #dash_subject_cards_container .row { margin: 0 !important; }
        
        /* Chừa đúng 0.5px ở mỗi mép thẻ Card */
        #dash_subject_cards_container .col-12 { 
            padding-left: 0.5px !important; 
            padding-right: 0.5px !important; 
        }
        
        /* Khe hở giữa các thẻ: Ngang 1px (siêu khít), Dọc 4px (để phân tách các thẻ trên dưới) */
        .g-3 { 
            --bs-gutter-x: 1px !important; 
            --bs-gutter-y: 4px !important; 
        }

        /* 3. GỌT LỀ TRONG CỦA THẺ DASHBOARD CỰC MỎNG */
        /* Giảm padding để chữ dàn ra tận mép viền thẻ */
        .student-subj-card, .user-card-premium, .class-header-card {
            padding: 10px 8px !important; 
            border-radius: 10px !important; 
        }

        .top-greeting-bar, .bg-dark.rounded-4 {
            padding: 8px !important;
            border-radius: 10px !important;
        }
        
        /* 4. THU GỌN ICON VÀ AVATAR NHƯỜNG TỐI ĐA CHỖ CHO VĂN BẢN */
        .subj-icon-box { width: 40px !important; height: 54px !important; font-size: 1.3rem !important; }
        .user-avatar-box { width: 34px !important; height: 34px !important; font-size: 1.1rem !important; }
        .user-search-bar { padding: 6px 10px 6px 30px !important; font-size: 0.85rem !important; }
    }
</style>`;
document.head.insertAdjacentHTML('beforeend', mobileCss);
// =========================================================================
// 🎯 PHẦN 1: KHAI BÁO BIẾN TOÀN CỤC (ĐỒNG BỘ LIÊN MODULE WINDOW SCOPE)
// =========================================================================
window.isGridReady = typeof window.isGridReady !== 'undefined' ? window.isGridReady : false; 
window.subjectConfig = typeof window.subjectConfig !== 'undefined' ? window.subjectConfig : {}; 
window.grid_load_interval = null;
window.full_data = window.full_data || {}; 
window.current_bank = window.current_bank || []; 
window.questions = window.questions || []; 
window.current_subject = window.current_subject || '';
window.current_subject_key = window.current_subject_key || '';
window.current_exam_questions = window.current_exam_questions || [];
window.selected_lessons_text = window.selected_lessons_text || ''; // 🌟 Ép lên window để js_story đọc được
// =========================================================================
// 🔌 LỚP TRUNG GIAN SUPABASE (THAY THẾ TOÀN BỘ google.script.run)
// Thầy chỉ cần sửa tên bảng ở đây nếu DB đặt tên khác.
// =========================================================================
window.SUPA_TABLES = window.SUPA_TABLES || {
    users        : 'users',
    subjects     : 'subjects',
    questions    : 'questions',
    online_exams : 'online_exams',
    exam_results : 'exam_results',
    progress     : 'student_progress', // cột gợi ý: student_id, subject_key, lesson_id, score, total, time
    history      : 'study_logs'        // cột gợi ý: student_id, subject_key, lesson, score, total, time
};

// Cảnh báo sớm nếu quên nạp supabase-js trước file này
if (typeof db === 'undefined') {
    console.error('[SUPABASE] Biến `db` chưa tồn tại! Hãy tạo `const db = supabase.createClient(URL, ANON_KEY)` TRƯỚC khi nạp js_shared.js');
}

// Gọi bảng an toàn: bảng chưa tạo / RLS chặn -> trả về [] thay vì làm sập giao diện
window.supa_safe_select = async function(table, builderFn) {
    try {
        if (typeof db === 'undefined') throw new Error('Chưa khởi tạo Supabase client (db)');
        let q = db.from(table).select('*');
        if (builderFn) q = builderFn(q);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.warn('[SUPABASE] Không đọc được bảng "' + table + '": ' + err.message);
        return [];
    }
};


// --- LẮNG NGHE THAY ĐỔI REALTIME TRÊN BẢNG USERS ---
function init_users_realtime() {
    const clientDb = typeof db !== 'undefined' ? db : window._supabase;
    if (!clientDb) return;

    // Tránh đăng ký trùng lặp nhiều lần nếu gọi hàm nhiều lần
    if (window._usersChannelSubscribed) return;
    window._usersChannelSubscribed = true;

    clientDb
        .channel('public-users-changes')
        .on(
            'postgres_changes',
            {
                event: '*', // Lắng nghe mọi sự kiện: INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'users'
            },
            (payload) => {
                console.log("⚡ Phát hiện thay đổi Realtime từ cơ sở dữ liệu:", payload);
                
                // Hiển thị thông báo nhẹ hoặc tự động vẽ lại giao diện quản lý người dùng
                if (typeof window.render_user_management === 'function') {
                    // Kiểm tra xem thầy có đang ở màn hình quản lý người dùng không thì mới load lại
                    let userTableArea = document.getElementById('dash_subject_cards_container');
                    if (userTableArea) {
                        window.render_user_management();
                    }
                }
            }
        )
        .subscribe((status) => {
            console.log("📡 Trạng thái kết nối Realtime bảng users:", status);
        });
}

// Gọi hàm này một lần khi ứng dụng khởi động (ví dụ sau khi đăng nhập thành công)
// window.init_users_realtime();

// --- Tiến độ học của 1 học sinh (thay getStudentProgress) ---
window.fetch_student_progress = async function(studentId) {
    if (!studentId) return {};
    const rows = await window.supa_safe_select(window.SUPA_TABLES.progress,
        q => q.ilike('student_id', studentId));
    // Gom theo môn -> theo bài, giữ nguyên hình dạng dữ liệu mà draw_lesson_buttons đang dùng
    let out = {};
    rows.forEach(r => {
        let subj = r.subject_key || r.subject || 'unknown';
        let lesson = r.lesson_id || r.lesson || r.lesson_name || '';
        if (!out[subj]) out[subj] = {};
        out[subj][lesson] = {
            score : r.score,
            total : r.total,
            time  : r.time || r.created_at,
            percent: (r.total ? Math.round((r.score / r.total) * 100) : (r.percent || 0))
        };
    });
    return out;
};

// --- Lịch sử ôn tập (thay getUserHistory) ---
window.fetch_user_history = async function(studentId) {
    if (!studentId) return [];
    const rows = await window.supa_safe_select(window.SUPA_TABLES.history,
        q => q.ilike('student_id', studentId).order('created_at', { ascending: false }).limit(500));
    return rows.map(r => ({
        subject : r.subject_key || r.subject || '',
        lesson  : r.lesson || r.lesson_name || r.lesson_id || '',
        score   : r.score,
        total   : r.total,
        time    : r.time || r.created_at,
        mode    : r.mode || '',             // 🌟 BỔ SUNG: Kéo dữ liệu chế độ làm bài (Thi Thật/Ôn Tập)
        device  : r.device || '',           // 🌟 BỔ SUNG: Kéo thiết bị
        student : r.student_id || ''        // 🌟 BỔ SUNG: Kéo mã sinh viên
    }));
};

// --- Danh sách lớp / nhóm quyền (thay getAvailableClasses) ---
// Lấy từ chính cột role của bảng users, không cần bảng phụ.
window.fetch_available_classes = async function() {
    const rows = await window.supa_safe_select(window.SUPA_TABLES.users);
    let set = new Set();
    rows.forEach(r => {
        let role = String(r.role || '').trim();
        if (role && role.toLowerCase() !== 'all' && role.toLowerCase() !== 'admin') set.add(role);
    });
    return Array.from(set).sort();
};

// --- Đồng bộ kho đồ / thẻ sưu tầm (thay syncUserInventory) ---
window.sync_user_inventory = async function(studentId, inventory, collectiblesStr) {
    if (!studentId) return;
    try {
        // 🌟 ĐÃ FIX: Chuyển chuỗi String về lại Mảng (Array) để Supabase hiểu cột jsonb
        let colData = collectiblesStr;
        try { if (typeof collectiblesStr === 'string') colData = JSON.parse(collectiblesStr); } catch(e) {}

        const { error } = await db.from(window.SUPA_TABLES.users)
            .update({ inventory: inventory, collectibles: colData })
            .ilike('student_id', studentId);
        if (error) throw error;
    } catch (err) {
        console.warn('[SUPABASE] Không đồng bộ được kho đồ: ' + err.message);
    }
};

// --- Tra cứu phiên âm IPA (thay getVocabData của GAS) ---
window.fetch_vocab_data = async function(word) {
    let res = { ipa: '', meaning: '' };
    try {
        const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word));
        if (!r.ok) return res;
        const j = await r.json();
        if (Array.isArray(j) && j[0]) {
            if (j[0].phonetic) res.ipa = j[0].phonetic;
            else if (Array.isArray(j[0].phonetics)) {
                let p = j[0].phonetics.find(x => x && x.text);
                if (p) res.ipa = p.text;
            }
            let m = j[0].meanings && j[0].meanings[0] && j[0].meanings[0].definitions && j[0].meanings[0].definitions[0];
            if (m && m.definition) res.meaning = m.definition;
        }
    } catch (e) { /* offline hoặc không tìm thấy từ -> để trống cho thầy tự nhập */ }
    return res;
};

// --- Nhịp tim phòng thi (thay checkRealtimeExamStatus) ---
// Trả về "KICK" nếu đề đã đóng / quá giờ / học sinh bị cấm thi.
window.check_realtime_exam_status = async function(examCode, studentId) {
    if (!examCode) return "OK";
    try {
        const { data: ex, error } = await db.from(window.SUPA_TABLES.online_exams)
            .select('status, auto_close').eq('exam_code', examCode).maybeSingle();
        if (error) throw error;
        if (!ex) return "OK";                                   // lỗi mạng thì KHÔNG đuổi học sinh
        let st = String(ex.status || '');
        if (st.indexOf('MỞ') === -1) return "KICK";
        if (ex.auto_close && new Date(ex.auto_close) < new Date()) return "KICK";
        if (studentId) {
            const { data: rs } = await db.from(window.SUPA_TABLES.exam_results)
                .select('is_absent').eq('exam_code', examCode).ilike('student_id', studentId).maybeSingle();
            if (rs && rs.is_absent) return "KICK";
        }
        return "OK";
    } catch (err) {
        console.warn('[SUPABASE] Nhịp tim phòng thi lỗi: ' + err.message);
        return "OK"; // mất mạng tạm thời thì để học sinh làm tiếp, không thu bài oan
    }
};

// --- Passkey / Face ID (thay registerDevicePasskey, getDevicePasskey, authenticateWithPasskey) ---
// Yêu cầu: bảng users có thêm cột text `passkey_id`.
window.save_device_passkey = async function(studentId, passkeyId) {
    try {
        const { error } = await db.from('users')
            .update({ passkey_id: passkeyId })
            .ilike('student_id', studentId);
        if (error) throw error;
        return { success: true, message: '✅ Đã liên kết thiết bị thành công!' };
    } catch (err) {
        return { success: false, message: '❌ Lỗi lưu Passkey: ' + err.message };
    }
};

window.get_device_passkey = async function(studentId) {
    try {
        const { data, error } = await db.from('users')
            .select('student_id, passkey_id')
            .ilike('student_id', studentId)
            .maybeSingle();
        if (error) throw error;
        if (!data || !data.passkey_id) return { success: false, message: '⚠️ Tài khoản này chưa liên kết Face ID trên hệ thống!' };
        return { success: true, passkeyId: data.passkey_id };
    } catch (err) {
        return { success: false, message: '❌ Lỗi máy chủ: ' + err.message };
    }
};

// --- Kiểm tra toàn vẹn dữ liệu (thay check_data_integrity) - chạy ngay trên máy ---
window.run_health_check = function() {
    let key = window.current_subject;
    let data = (window.full_data && window.full_data[key]) || [];
    let logs = ['🩺 KIỂM TRA MÔN: ' + (key || '(chưa chọn môn)'), 'Tổng số câu: ' + data.length];
    let noAnswer = 0, noOption = 0, dupId = 0, seen = {};
    data.forEach((q, i) => {
        if (!q) return;
        if (!q.a && !q.answer) noAnswer++;
        let opts = q.opts || [q.opta, q.optb, q.optc, q.optd];
        if (!opts || opts.filter(o => o && String(o).trim() !== '').length < 2) noOption++;
        if (q.id) { if (seen[q.id]) dupId++; seen[q.id] = true; }
    });
    logs.push('❌ Câu thiếu đáp án: ' + noAnswer);
    logs.push('❌ Câu thiếu phương án chọn: ' + noOption);
    logs.push('⚠️ ID bị trùng: ' + dupId);
    logs.push(noAnswer + noOption + dupId === 0 ? '✅ Dữ liệu sạch!' : '👉 Hãy vào Quản lý câu hỏi để sửa.');
    alert(logs.join('\n'));
};

// =========================================================================
// 🌐 MÁY QUÉT ĐỊA CHỈ IP VÀ QUỐC GIA (CHẠY NGẦM KHI MỞ TRANG)
// =========================================================================
window.client_ip_info = "[Đang lấy IP...] ";
(function fetchUserIP() {
    fetch('https://get.geojs.io/v1/ip/geo.json')
        .then(res => res.json())
        .then(data => {
            // 🌟 Lấy thêm Thành phố hoặc Tỉnh (Nếu có)
            let cityInfo = data.city || data.region || "";
            
            // Ghép Tỉnh/Thành phố với Tên Quốc gia (Nếu API không quét ra Tỉnh thì chỉ để Quốc gia)
            let fullLocation = cityInfo ? `${cityInfo}, ${data.country}` : data.country;
            
            // Dữ liệu trả về sẽ có dạng: [IP: 14.162.x.x - Thua Thien Hue, Vietnam]
            window.client_ip_info = `[IP: ${data.ip} - ${fullLocation}] `;
        })
        .catch(err => {
            window.client_ip_info = "[IP: Bị ẩn/Dùng VPN] ";
        });
})();

// [ĐÃ GỠ] biến `timer_interval/time_left/start_time` khai báo bằng let ở đây không
// bao giờ được gán giá trị thật (bộ đếm giờ thật dùng window.timer_interval), nên các
// điều kiện `typeof timer_interval !== 'undefined'` phía dưới luôn sai — đã dọn sạch.
// Thay vì dùng 'let', hãy gắn trực tiếp vào window để các hàm giám sát truy cập đúng biến
window.offense_count = 0;
window.away_time_total = 0;
window.last_away_time = null;
window.disable_admin_cheat_warning = false;

// [ĐÃ GỠ] is_exam_started/is_study_mode khai báo bằng let, không được dùng ở đâu khác trong file
let is_flashcard_mode = false;
let current_fc_idx = 0;

window.lessonNames = window.lessonNames || {};
window.studentProgressLogs = window.studentProgressLogs || {}; 
window.current_vocab_context = null; 

let preloadQueue = [];
let isPreloading = false;
window.loading_subjects = window.loading_subjects || {};

const subjectNames = {
  'lythuyethuyethoc2': 'Lý thuyết Huyết học 2', 'lythuyethoasinh2': 'Lý thuyết Hóa sinh 2',
  'thuchanhhuyethoc2': 'Thực hành Huyết học 2', 'thuchanhhoasinh2': 'Thực hành Hóa sinh 2',
  'thuchanhvisinh2': 'Thực hành Vi sinh 2', 'tinhoc': 'Tin học', 'congnghe': 'Công nghệ',
  'lichsu': 'Lịch sử', 'dialy': 'Địa lý', 'khtn': 'Khoa học tự nhiên', 'toan': 'Toán',
  'van': 'Văn', 'tienganh': 'Tiếng Anh', 'gdcd' : "Giáo dục công dân"
};

// =========================================================================
// 🚀 PHẦN 2: KHỞI TẠO HỆ THỐNG & KẾT NỐI MÁY CHỦ (SUPABASE)
// =========================================================================
window.addEventListener('load', () => {
    const idInput = document.getElementById('student_id');
    const passInput = document.getElementById('access_code');
    if (idInput) idInput.focus();
    if (typeof enable_smart_monitor === 'function') enable_smart_monitor();

    // TỰ ĐỘNG ĐIỀN THÔNG TIN ĐĂNG NHẬP
    let savedId = localStorage.getItem('mcq_saved_id');
    let savedPass = localStorage.getItem('mcq_saved_pass');
    if (savedId && savedPass && idInput && passInput) {
        idInput.value = savedId;
        passInput.value = savedPass;
    }
    
    // 🌟 KÉO CẤU HÌNH MÔN HỌC TỪ BẢNG 'subjects' SUPABASE (Thay cho get_full_data của GAS)
    window.load_subject_config_from_supabase();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const loginScreen = document.getElementById('login_screen');
        if (loginScreen && loginScreen.style.display !== 'none') { e.preventDefault(); window.check_access(); }
    }
});

// Hàm chuyên dụng tải cấu hình môn từ Supabase
window.load_subject_config_from_supabase = async function() {
    try {
        const { data, error } = await db.from('subjects').select('*');
        if (error) throw error;
        
        window.subjectConfig = {};
        if (data && data.length > 0) {
            data.forEach(sub => {
                window.subjectConfig[sub.subject_key] = {
                    id: sub.file_id || "",
                    sheetName: sub.sheet_name || "",
                    role: sub.role_access || "all",
                    icon: sub.icon || "📚",
                    name: sub.name || sub.subject_key,
                    ui_template: sub.ui_template || "1"
                };
            });
        }
        window.isGridReady = true; 
        window.try_render_menu(); 
    } catch (err) {
        console.error("Lỗi kéo cấu hình môn học từ Supabase:", err);
        // Fallback: nếu lỗi vẫn mở menu tạm
        window.isGridReady = true; 
        window.try_render_menu();
    }
};

// Gắn cứng version vì đã chuyển sang Supabase
const vElements = document.querySelectorAll('.app-version-text');
vElements.forEach(el => { el.innerHTML = "v2.0 (Supabase Core)"; });

// =========================================================================
// 🛡️ PHẦN 3: XÁC THỰC & BẢO MẬT BẰNG SUPABASE (AUTH & ANTI-CHEAT)
// =========================================================================
// 🌟 Tải TOÀN BỘ câu hỏi của 1 môn, tự phân trang (Supabase mặc định giới hạn
// 1000 dòng/lần) — trước đây .range(0,9999) vừa dò sai bằng ilike() (rủi ro ký
// tự %, _) vừa cứng giới hạn 10.000 câu/môn. Trả về {data, error} để không
// phải sửa lại chỗ gọi.
window.fetch_all_questions = async function(key) {
    if (!key) return { data: [], error: null };

    // 🌟 CHỈ LẤY BẢNG PHẢN XẠ NẾU KEY CHỨA 'phanxa'
    let isPhanXaKey = key.includes('phanxa');

    try {
        if (isPhanXaKey && typeof db !== 'undefined') {
            const { data, error } = await db
                .from('phanxa_questions')
                .select('*')
                .eq('subject_key', key);

            return { data: data || [], error };
        } else if (typeof db !== 'undefined') {
            // 🌟 MÔN TIẾNG ANH CŨ ('tienganh', 'tienganhconam') & MÔN KHÁC -> LẤY TỪ TABLE 'questions'
            const { data, error } = await db
                .from('questions')
                .select('*')
                .eq('subject_key', key);

            return { data: data || [], error };
        }
    } catch (err) {
        console.error("Lỗi khi tải câu hỏi cho key:", key, err);
        return { data: [], error: err };
    }

    return { data: [], error: null };
};

// Hàm trả về danh sách các subject_key Phản xạn hợp lệ của User
window.getUserPhanXaKeys = function() {
    let user = localStorage.getItem('username') || localStorage.getItem('user_id') || localStorage.getItem('user') || window.current_student_id;
    let keys = ['phanxacongdong']; // Mặc định chưa đăng nhập luôn có Phản xạ cộng đồng

    if (user) {
        let cleanUser = user.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        keys.push(`phanxa${cleanUser}`); // Thêm Phản xạ cá nhân của User
    }
    return keys;
};

window.check_access = async function() {
    window.studentProgressLogs = null;
    window.user_progress_data = null;
    window.current_user_role = null; 

    const idInput = document.getElementById('student_id');
    const passInput = document.getElementById('access_code');
    const errorEl = document.getElementById('login_error');
    
    const id = idInput.value.trim().toLowerCase(); 
    const pass = passInput.value.trim();

    if (!id || !pass) {
        errorEl.innerHTML = `<div style="color: #dc3545; font-size: 0.85rem; margin-top: 10px; font-weight: bold;">⚠️ Vui lòng nhập đầy đủ ID và Mật khẩu!</div>`;
        errorEl.style.display = 'block';
        return;
    }

    errorEl.innerHTML = `<div style="color: #38bdf8; font-size: 0.85rem; margin-top: 10px;"><span class="spinner-border spinner-border-sm me-1"></span> Đang xác thực Supabase...</div>`;
    errorEl.style.display = 'block';

    try {
        // 🔒 Đăng nhập qua RPC login_user()
        const { data, error } = await db.rpc('login_user', { p_student_id: id, p_password: pass });
        
        // 🌟 XỬ LÝ QUAN TRỌNG: Supabase RPC trả về dạng Mảng (Array), cần bóc ra Object đầu tiên
        let userData = Array.isArray(data) ? data[0] : data;

        if (error || !userData || userData.success === false) {
            errorEl.innerHTML = `<div style="color: #dc3545; font-size: 0.85rem; margin-top: 10px; font-weight: bold;">⚠️ ID hoặc Mật khẩu không chính xác!</div>`;
            return;
        }

        // ĐĂNG NHẬP THÀNH CÔNG
        localStorage.setItem('mcq_saved_id', id);
        localStorage.setItem('mcq_saved_pass', pass);

        window.apply_login_success(userData);
    } catch(err) {
        errorEl.innerHTML = `<div style="color: #dc3545; font-size: 0.85rem; margin-top: 10px; font-weight: bold;">⚠️ Lỗi máy chủ Supabase: ${err.message}</div>`;
    }
};

// 🌟 Tách phần "xử lý sau khi đăng nhập thành công" ra riêng để dùng chung
// cho cả đăng nhập bằng mật khẩu (login_user) và đăng nhập Face ID (login_by_passkey).
window.apply_login_success = function(data) {
        window.current_user_role = String(data.role || 'k12').trim().toLowerCase(); 
        window.current_class_code = data.class_code || ''; // 🎯 QUAN TRỌNG: LƯU MÃ LỚP CỦA SINH VIÊN
        window.login_time = new Date().toLocaleString('vi-VN');
        window.current_student_id = data.student_id;
        window.current_student_name = data.full_name || data.student_id;
        
        let serverInventory = parseInt(data.inventory) || 0;
        let serverCol = data.collectibles || "[]";
        
        // 🌟 ĐÃ FIX: Chuyển Mảng (Array) từ Supabase thành chuỗi JSON chuẩn để không bị vỡ dữ liệu ở LocalStorage
        let colStrToSave = (typeof serverCol === 'object') ? JSON.stringify(serverCol) : serverCol;
        
        localStorage.setItem('mcq_inventory_' + window.current_student_id, serverInventory);
        localStorage.setItem('mcq_col_' + window.current_student_id, colStrToSave);
        
        // 1. Khởi tạo 4 nhóm quyền
        window.currentUserPerms = { view: [], edit: [], stats: [], system: [] }; 
        
        if (window.current_user_role === 'all' || window.current_user_role === 'admin') {
            window.currentUserPerms.view = ['all'];
            window.currentUserPerms.edit = ['all'];
            window.currentUserPerms.stats = ['all'];
            window.currentUserPerms.system = ['all'];
        } else {
            let rawPerms = data.permissions ? data.permissions.split(',').map(s => s.trim().toLowerCase()) : [];
            let legacyRole = window.current_user_role;

            rawPerms.forEach(p => {
                if (!p) return;
                if (p.startsWith('system_')) window.currentUserPerms.system.push(p);
                else if (p.endsWith('_stats')) window.currentUserPerms.stats.push(p.replace('_stats', ''));
                else if (p === 'stats_view' || p === 'stats_all' || p === 'stats') window.currentUserPerms.stats.push('all');
                else if (p.endsWith('_edit')) {
                    let base = p.replace('_edit', '');
                    window.currentUserPerms.edit.push(base);
                    window.currentUserPerms.view.push(base); 
                } 
                else if (p.endsWith('_view')) window.currentUserPerms.view.push(p.replace('_view', ''));
                else {
                    if (legacyRole === 'editor') {
                        window.currentUserPerms.edit.push(p);
                        window.currentUserPerms.view.push(p);
                    } else {
                        window.currentUserPerms.view.push(p);
                    }
                }
            });
        }

        document.getElementById('login_screen').style.setProperty('display', 'none', 'important');
        const main = document.getElementById('main_content');
        if(main) main.style.setProperty('display', 'block', 'important');
        const step1 = document.getElementById('step_1');
        if(step1) step1.style.setProperty('display', 'block', 'important');

        window.try_render_menu();
        if(typeof window.render_personal_timeline === 'function') window.render_personal_timeline();
        if(typeof window.render_stats_card_above_timeline === 'function') window.render_stats_card_above_timeline();
        
        // 🌟 KÍCH HOẠT: Bật ăng-ten nhận sóng phòng thi Realtime từ Admin
        if (typeof window.enable_realtime_exams_for_student === 'function') {
            window.enable_realtime_exams_for_student();
        }
};

window.check_subj_perm = function(subjKey, action = 'view') {
    if (window.current_user_role === 'all') return true;
    let config = (subjKey && subjectConfig[subjKey]) ? subjectConfig[subjKey] : {};
    let grp = config.role ? String(config.role).trim().toLowerCase() : "all";
    
    if (action === 'view') {
        if (grp === 'all') return true; 
        if (window.current_user_role === grp) return true; 
    }

    if (window.currentUserPerms && window.currentUserPerms[action]) {
        if (window.currentUserPerms[action].includes('all')) return true;
        // 🌟 Đã bọc an toàn: Kiểm tra subjKey tồn tại trước khi toLowerCase()
        if (subjKey && window.currentUserPerms[action].includes(subjKey.toLowerCase())) return true;
        if (window.currentUserPerms[action].includes(grp)) return true;
    }
    return false;
};

// 🌟 HÀM KIỂM TRA QUYỀN THỐNG KÊ (CHUẨN CHÍNH XÁC CHO USER THƯỜNG)
window.check_stats_perm = function(subjKey) {
    if (!window.current_user_role) return false;
    let role = String(window.current_user_role).toLowerCase();
    
    if (role === 'all' || role === 'admin') return true;
    
    if (window.currentUserPerms && window.currentUserPerms.stats && window.currentUserPerms.stats.length > 0) {
        let statsList = window.currentUserPerms.stats;
        
        if (statsList.includes('all') || statsList.includes('stats_view') || statsList.includes('stats_all') || statsList.includes('stats')) {
            return true;
        }
        
        if (subjKey && statsList.includes(String(subjKey).toLowerCase())) {
            return true;
        }
        
        if (!subjKey && statsList.length > 0) {
            return true;
        }
    }
    return false;
};

// GIÁM SÁT RỜI TAB
document.addEventListener("visibilitychange", function() {
    let quizArea = document.getElementById('quiz_area');
    let isAtMenu = (!quizArea || quizArea.innerHTML.trim() === '' || quizArea.style.display === 'none');
    let isFinished = window.quiz_end_time != null; 
    
    if (isAtMenu || isFinished) { window.last_away_time = 0; return; }
    
    let role = String(window.current_user_role || "").toLowerCase();
    let perms = String(window.current_user_permissions || window.current_permissions || "").toLowerCase();
    let isExempt = (role === "admin" || role === "all" || role === "teacher" || perms.includes("edit") || perms === "all");

    if (isExempt && window.disable_admin_cheat_warning) return;

    if (document.hidden) {
        window.offense_count++;
        window.last_away_time = new Date().getTime();
    } else {
        if (window.last_away_time > 0) {
            let duration = Math.round((new Date().getTime() - window.last_away_time) / 1000);
            window.away_time_total += duration;
            window.last_away_time = 0;
            window.show_cheat_warning_ui(duration, isExempt); 
        }
    }
});

window.show_cheat_warning_ui = function(lastDuration, isExempt) {
    let overlayId = 'anti_cheat_toast';
    let existing = document.getElementById(overlayId);
    if(existing) existing.remove();

    let toast = document.createElement('div');
    toast.id = overlayId;
    toast.style.cssText = "position: fixed; top: 15px; left: 50%; transform: translateX(-50%); z-index: 9999999; font-size: 0.85rem; padding: 6px 16px; border-radius: 50px; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); white-space: nowrap; animation: animate__fadeInDown 0.3s ease;";

    if (isExempt) {
        toast.style.background = "rgba(14, 165, 233, 0.95)"; toast.style.color = "white"; toast.style.border = "1px solid rgba(255,255,255,0.3)";
        toast.innerHTML = `<span><i class="bi bi-shield-check me-1"></i> Edit Mode - Vừa rời: <b>${lastDuration}s</b> | Vi phạm: <b>${window.offense_count}</b> lần</span><button class="btn btn-sm btn-light py-0 px-2 fw-bold" style="font-size: 0.75rem; border-radius: 12px; color: #0ea5e9; transition: 0.2s;" onclick="window.disable_admin_cheat_warning = true; this.parentElement.remove()">Tắt vĩnh viễn</button>`;
        document.body.appendChild(toast);
    } else {
        toast.style.background = "rgba(220, 38, 38, 0.95)"; toast.style.color = "white"; toast.style.border = "1px solid rgba(255,255,255,0.3)";
        toast.innerHTML = `<span><i class="bi bi-exclamation-triangle-fill text-warning me-1"></i> <b>Cảnh báo!</b> Bạn vừa rời tab. Vi phạm: <b>${window.offense_count}</b> lần (Tổng: <b>${window.away_time_total}s</b>)</span>`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = "0"; toast.style.transition = "opacity 0.4s ease"; setTimeout(() => toast.remove(), 400); }, 3000);
    }
}

// =========================================================================
// 🧭 PHẦN 4: ĐIỀU HƯỚNG MÀN HÌNH CHÍNH & TẢI NGẦM (NAVIGATION)
// =========================================================================
window.try_render_menu = function() {
    if (!window.current_user_role || !isGridReady) return; 
    if (grid_load_interval) clearInterval(grid_load_interval);
    if (window.current_student_id) window.loadAndRenderStudentDashboard(window.current_student_id);
    window.preload_background_data();
};

window.loadAndRenderStudentDashboard = function(studentId) {
    const container = document.getElementById('dash_subject_cards_container');
    if (!container) return;
    container.innerHTML = "";
    
    let safe_role = String(window.current_user_role).trim().toLowerCase();

    if (safe_role === "all") {
        window.render_admin_hub();
    } else {
        window.render_student_subject_list(safe_role);
    }
    
    document.getElementById('student_dashboard').style.display = 'block';

    window.fetch_student_progress(studentId).then(function(progressData) {
        window.studentProgressLogs = progressData || {};
        if (window.current_subject && safe_role !== "all") {
            const mapArea = document.getElementById(`map_area_${window.current_subject}`);
            if (mapArea && mapArea.style.display === 'block' && window.full_data[window.current_subject]) {
                let dispName = subjectConfig[window.current_subject]?.name || window.current_subject;
                window.draw_lesson_buttons(window.current_subject, dispName, window.full_data[window.current_subject]);
            }
        }
    });
};

window.process_preload_queue = async function() {
    if (!window.preloadQueue || window.preloadQueue.length === 0) { 
        window.isPreloading = false; 
        return; 
    }
    window.isPreloading = true;
    let key = window.preloadQueue.shift();

    if (window.full_data[key] || window.loading_subjects[key]) { 
        window.process_preload_queue(); 
        return; 
    } 
    window.loading_subjects[key] = true;

    try {
        const res = await window.fetch_all_questions(key);
        if (res && res.data) {
            window.full_data[key] = res.data;
        }
    } catch (err) {
        console.error("Lỗi preload dữ liệu môn:", key, err);
    } finally {
        window.loading_subjects[key] = false;
        window.process_preload_queue();
    }
};

window.back_to_subject_select = function() {
    // 1. TẮT CHẾ ĐỘ GIÁM SÁT TRƯỚC TIÊN (để không bị báo lỗi vi phạm khi thoát toàn màn hình)
    if (window.proctoring_state) window.proctoring_state.is_active = false;

    // 2. DIỆT GỌN ĐỒNG HỒ ĐẾM NGƯỢC CHẠY NGẦM
    if (window.timer_interval) clearInterval(window.timer_interval);

    // 3. THOÁT CHẾ ĐỘ TOÀN MÀN HÌNH (FULLSCREEN)
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(e => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }

    // 🌟 ĐÃ THÊM: Trả lại thanh Header nguyên bản trước khi thoát
    let qHeader = document.querySelector('#step_3 .header-fixed-wrapper');
    if (qHeader) qHeader.style.display = ''; 

    // 🌟 KHÔI PHỤC LẠI CÁC TÍNH NĂNG BỊ KHÓA TRONG KHI THI
    let skill5050 = document.querySelector('button[onclick="window.use_skill_5050()"]');
    let skillTime = document.querySelector('button[onclick="window.use_skill_time()"]');
    let invBadge = document.getElementById('mini_inventory_badge');
    let modeToggle = document.getElementById('mode_text');

    if(skill5050) skill5050.style.display = '';
    if(skillTime) skillTime.style.display = '';
    if(invBadge) invBadge.style.display = 'flex';
    if(modeToggle && modeToggle.parentElement) modeToggle.parentElement.style.display = '';

    // Gỡ bỏ CSS khóa gian lận (Nút cứu sai, bóng đèn)
    let examStyle = document.getElementById('exam_mode_style');
    if (examStyle) examStyle.remove();

    // 🌟 DỌN DẸP NHỊP TIM GIÁM SÁT (HEARTBEAT) KHI THOÁT PHÒNG THI
    if (window.realtime_exam_monitor) clearInterval(window.realtime_exam_monitor);

    const mainContent = document.getElementById('main_content');
    if (mainContent) mainContent.style.display = 'block';
    
    ['result_area', 'step_3', 'quiz_area', 'submit_btn'].forEach(id => { 
        const el = document.getElementById(id); if (el) el.style.display = 'none'; 
    });
    
    const step1 = document.getElementById('step_1'); 
    if (step1) step1.style.display = 'block';
    
    window.is_exam_started = false; 
    window.start_time = null; 

    if (window.current_subject) {
        setTimeout(() => {
            const targetCard = document.getElementById(`subject_card_block_${window.current_subject}`);
            if (targetCard) targetCard.scrollIntoView({ behavior: 'instant', block: 'start' });
        }, 50);
    } else {
        let savedScroll = localStorage.getItem('menu_scroll_pos');
        if (savedScroll) setTimeout(() => { window.scrollTo({ top: parseInt(savedScroll), behavior: 'instant' }); }, 50);
        else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.execute_back = function() { window.back_to_subject_select(); }

window.go_back = function() {
    let isStarted = window.is_exam_started || (typeof is_exam_started !== 'undefined' && is_exam_started);
    if (isStarted) { 
        window.show_alert("Xác nhận thoát", "Bạn có chắc chắn muốn thoát?", async (ans) => { 
            if(ans) { 
                try {
                    // Bọc túi khí an toàn: Nếu hàm lưu nháp cũ bị lỗi google, bỏ qua luôn để không bị kẹt nút thoát
                    if (typeof window.auto_save_exam_draft === 'function') {
                        await window.auto_save_exam_draft(); 
                    }
                } catch(err) { console.log("Bỏ qua lỗi lưu nháp cũ."); }
                window.execute_back(); 
            } 
        }); 
    } 
    else { window.execute_back(); }
};
// =========================================================================
// 📚 PHẦN 5: CHỌN MÔN & CHẾ ĐỘ HỌC (STUDENT HUB - DETAILED CARDS UI)
// =========================================================================
window.render_student_subject_list = function(safe_role) {
    const container = document.getElementById('dash_subject_cards_container');
    if(!container) return;
    
    const historyArea = document.getElementById('history_view_area');
    if (historyArea) historyArea.style.display = 'block';

    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let inventoryCount = parseInt(localStorage.getItem(invKey)) || 0;
    let studentNameDisplay = window.current_student_name || window.current_student_id || "Học viên";
    let rankMiniHtml = typeof window.get_user_rank_html === 'function' ? window.get_user_rank_html(true) : '👑';
    
    let html = `
    <style>
        /* CSS GIAO DIỆN THẺ BÀI (GIỮ NGUYÊN) */
        .student-subj-card { background: #121416; border: 1px solid #2b3035; border-radius: 16px; transition: 0.3s; cursor: pointer; display: flex; flex-direction: column; padding: 20px; height: 100%; box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
        .student-subj-card:hover { border-color: #0ea5e9; transform: translateY(-4px); background: #1e293b; box-shadow: 0 8px 25px rgba(14, 165, 233, 0.2); }
        
        .subj-card-header { display: flex; align-items: flex-start; gap: 15px; margin-bottom: 12px; }
        .subj-icon-box { width: 60px; height: 80px; border-radius: 8px; background: #1a1d20; border: 1px solid #343a40; display: flex; align-items: center; justify-content: center; font-size: 2rem; flex-shrink: 0; box-shadow: 2px 4px 10px rgba(0,0,0,0.3); overflow: hidden; transition: 0.3s; }
        .student-subj-card:hover .subj-icon-box { transform: scale(1.05) rotate(2deg); box-shadow: 4px 6px 15px rgba(0,0,0,0.4); border-color: #0ea5e9; }
        
        .subj-info-box { flex-grow: 1; min-width: 0; }
        .subj-title { font-size: 0.95rem; font-weight: 700; color: #f8fafc; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .subj-desc { font-size: 0.75rem; color: #94a3b8; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        
        .subj-stats-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px; }
        .subj-stat-badge { font-size: 0.7rem; font-weight: 600; padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,0.05); color: #cbd5e1; display: flex; align-items: center; gap: 4px; border: 1px solid rgba(255,255,255,0.05); }
        
        /* 🌟 CSS CHUẨN MỚI CHO THANH NHÓM LỚP */
        .premium-group-header {
            background: #212529; /* Tệp màu nền hệ thống */
            border-radius: 12px;
            transition: all 0.2s ease;
            border: 1px solid rgba(255,255,255,0.05);
            position: relative;
            overflow: hidden;
        }
        .premium-group-header:hover { background: #2b3035; border-color: rgba(255,255,255,0.1); }
        .group-icon-wrapper { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
    </style>
    <div class="row w-100 m-0 g-3">`;

    // 🌟 CHIA 2 KỊCH BẢN HEADER TÙY THEO VAI TRÒ (ĐÃ TÍCH HỢP 3 NÚT MODULE SIÊU GỌN VÀO THANH CÔNG CỤ)
    if (safe_role === 'all') {
        html += `
        <div class="col-12 px-0 animate__animated animate__fadeIn sticky-top z-3 mb-0 mb-md-3" style="top: 0;">
            <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark" style="margin-left: -0.5px; margin-right: -0.5px;">
                <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="window.render_admin_hub()">
                    <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
                </button>
                
                <h6 class="text-white fw-bold mb-0 text-center flex-grow-1 text-truncate px-2 text-uppercase d-none d-sm-block" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                    QUẢN LÝ TRẮC NGHIỆM
                </h6>
                
                <div class="d-flex align-items-center gap-2 flex-shrink-0">
                    <!-- 🌟 3 NÚT TIỆN ÍCH DẠNG TRÒN CHO ADMIN -->
                    <div class="d-flex align-items-center justify-content-center rounded-circle stat-card-hover shadow-sm" title="Trạm Dịch" style="width: 32px; height: 32px; cursor: pointer; background: rgba(250, 204, 21, 0.15); border: 1px solid rgba(250, 204, 21, 0.3);" onclick="window.openBuilderModule()"><span style="font-size:0.9rem">✍️</span></div>
                    <div class="d-flex align-items-center justify-content-center rounded-circle stat-card-hover shadow-sm" title="Nghe Reels" style="width: 32px; height: 32px; cursor: pointer; background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3);" onclick="window.openReelsModule()"><span style="font-size:0.9rem">🎬</span></div>
                    <div class="d-flex align-items-center justify-content-center rounded-circle stat-card-hover shadow-sm" title="Học Phản Xạ" style="width: 32px; height: 32px; cursor: pointer; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3);" onclick="window.openPhanXaModule()"><span style="font-size:0.9rem">🧠</span></div>
                    
                    <span class="text-white-50 d-none d-md-block fw-bold ms-2" style="font-size: 0.75rem;">${studentNameDisplay}</span>
                    <div class="d-flex align-items-center gap-1 stat-card-hover ms-1" title="Túi Đồ" style="cursor: pointer;" onclick="window.toggle_inventory_popover(event)">
                        <span style="font-size: 1.1rem;">🎁</span>
                        <span class="text-warning fw-bold" style="font-size: 0.85rem;" id="dashboard_inventory_count">${inventoryCount}</span>
                    </div>
                    <div style="transform: scale(0.85);">${rankMiniHtml}</div>
                </div>
            </div>
        </div>`;
    } else {
        // KỊCH BẢN 2: HỌC VIÊN ĐANG Ở TRANG CHỦ MÔN HỌC -> HIỆN THẺ VIP GREETING TO BẢN
        html += `
        <div class="col-12 px-0 mb-3 animate__animated animate__fadeInDown">
            <div class="p-3 p-md-4 position-relative overflow-hidden" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div class="position-absolute" style="top: -20px; right: -20px; width: 120px; height: 120px; background: #38bdf8; filter: blur(50px); opacity: 0.2; pointer-events: none;"></div>
                <div class="position-absolute" style="bottom: -20px; left: 10%; width: 100px; height: 100px; background: #c084fc; filter: blur(40px); opacity: 0.2; pointer-events: none;"></div>

                <div class="d-flex align-items-center justify-content-between flex-wrap gap-3 position-relative z-1">
                    <div class="d-flex align-items-center gap-3">
                        <div class="position-relative" style="z-index: 2;">
                            ${window.get_user_rank_html()}
                        </div>
                        <div>
                            <div style="font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">Chào mừng trở lại,</div>
                            <div class="fw-bold" style="font-size: 1.15rem; line-height: 1.3; background: linear-gradient(to right, #38bdf8, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 0.5px; white-space: normal; word-break: break-word;">
                                ${studentNameDisplay}
                            </div>
                        </div>
                    </div>
                    
                    <!-- 🌟 THANH CÔNG CỤ SINH VIÊN (GỘP CẢ MODULE, QUÀ, KHUÔN MẶT, ĐĂNG XUẤT) -->
                    <div class="d-flex align-items-center gap-2 bg-black bg-opacity-25 p-2 rounded-pill border border-secondary border-opacity-25 flex-wrap justify-content-end">
                        
                        <!-- 3 NÚT TIỆN ÍCH DẠNG TRÒN -->
                        <div class="d-flex align-items-center justify-content-center rounded-circle stat-card-hover shadow-sm" title="Trạm Dịch" style="width: 36px; height: 36px; cursor: pointer; background: rgba(250, 204, 21, 0.15); border: 1px solid rgba(250, 204, 21, 0.3);" onclick="window.openBuilderModule()"><span style="font-size:1.1rem">✍️</span></div>
                        <div class="d-flex align-items-center justify-content-center rounded-circle stat-card-hover shadow-sm" title="Nghe Reels" style="width: 36px; height: 36px; cursor: pointer; background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3);" onclick="window.openReelsModule()"><span style="font-size:1.1rem">🎬</span></div>
                        <div class="d-flex align-items-center justify-content-center rounded-circle stat-card-hover shadow-sm" title="Học Phản Xạ" style="width: 36px; height: 36px; cursor: pointer; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3);" onclick="window.openPhanXaModule()"><span style="font-size:1.1rem">🧠</span></div>
                        
                        <div style="width: 1px; height: 20px; background: rgba(255,255,255,0.2); margin: 0 2px;"></div> <!-- Dải phân cách mờ -->
                        
                        <!-- CÁC NÚT CŨ -->
                        <div id="dashboard_inventory_badge" class="d-flex align-items-center gap-1 px-2 py-1 rounded-pill stat-card-hover" title="Túi Đồ" style="cursor: pointer; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3);" onclick="window.toggle_inventory_popover(event)">
                            <span style="font-size: 1.1rem; filter: drop-shadow(0 0 5px rgba(245,158,11,0.5));">🎁</span>
                            <span class="text-warning fw-bold" style="font-size: 0.95rem;" id="dashboard_inventory_count">${inventoryCount}</span>
                        </div>
                        <div class="d-flex align-items-center justify-content-center rounded-circle stat-card-hover shadow-sm" title="Liên kết khuôn mặt" style="width: 36px; height: 36px; cursor: pointer; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8;" onclick="window.setup_face_id()"><i class="bi bi-person-bounding-box"></i></div>
                        <div class="d-flex align-items-center justify-content-center rounded-circle stat-card-hover shadow-sm" title="Đăng xuất" style="width: 36px; height: 36px; cursor: pointer; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;" onclick="window.logout_user()"><i class="bi bi-power"></i></div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // Tiền xử lý Dữ liệu môn học
    let groups = {};
    Object.keys(subjectConfig).forEach((key) => {
        if (window.check_subj_perm(key, 'view')) {
            let config = subjectConfig[key];
            let roleName = config.role || config.quyen || config['Quyền'] || 'Chưa phân nhóm';
            if (!groups[roleName]) groups[roleName] = [];
            groups[roleName].push(key);
        }
    });

    let delay = 0;
    Object.keys(groups).forEach((groupName, gIndex) => {
        let subjectKeys = groups[groupName]; 
        let groupId = 'subject_group_' + gIndex;
        
        const subjectOrder = { 'toan': 1, 'van': 2, 'tienganh': 3, 'khtn': 4, 'congnghe': 5, 'tinhoc': 6, 'lichsu': 7, 'dialy': 8, 'gdcd': 9 };
        subjectKeys.sort((a, b) => {
            let rankA = subjectOrder[a] || 999;
            let rankB = subjectOrder[b] || 999;
            return (rankA !== rankB) ? rankA - rankB : a.localeCompare(b);
        });
        
        html += `
        <div class="col-12 px-0 animate__animated animate__fadeInUp" style="animation-delay: ${delay}s;">
            <!-- THANH HIỂN THỊ NHÓM (MÀU NỀN ĐỒNG BỘ, KHÔNG VIỀN XANH) -->
            <div class="premium-group-header p-3 mb-2 d-flex justify-content-between align-items-center shadow-sm" 
                 style="cursor: pointer;"
                 onclick="let el = document.getElementById('${groupId}'); el.classList.toggle('d-none'); let icon = document.getElementById('icon_${groupId}'); if(el.classList.contains('d-none')){icon.classList.replace('bi-chevron-up', 'bi-chevron-down')}else{icon.classList.replace('bi-chevron-down', 'bi-chevron-up')}">
                
                <div class="d-flex align-items-center">
                    <i class="bi bi-folder-fill text-white-50 fs-4 me-3"></i>
                    <h6 class="fw-bold text-white mb-0 text-uppercase" style="letter-spacing: 0.5px; font-size:1rem;">${groupName}</h6>
                </div>
                
                <div class="d-flex align-items-center gap-3">
                    <span class="badge bg-dark border border-secondary text-white-50 shadow-sm" style="font-size: 0.75rem;">${subjectKeys.length} Môn</span>
                    <i id="icon_${groupId}" class="bi bi-chevron-down text-white-50 fs-5"></i>
                </div>
            </div>
            
            <div id="${groupId}" class="d-none w-100">
                <div class="row m-0 g-3 mt-1 mb-4">`;
        
        subjectKeys.forEach((key, sIndex) => {
            let config = subjectConfig[key];
            let displayName = config.name || config['Tên hiển thị'] || subjectNames[key] || key;
            
            let iconStr = String(config.icon || config['Icon'] || '📚').trim();
            let displayIconHtml = "";
            if (iconStr.startsWith('http') || iconStr.startsWith('data:image')) {
                displayIconHtml = `<img src="${iconStr}" style="width: 100%; height: 100%; object-fit: cover;" alt="Bìa sách">`;
            } else {
                displayIconHtml = iconStr;
            }
            
            let canEdit = window.check_subj_perm(key, 'edit');
            let qCount = (window.full_data && window.full_data[key]) ? window.full_data[key].length : 'Đang đếm...';
            let descFallback = config.desc || "Bao gồm hệ thống bài tập, đề thi trắc nghiệm và tài liệu học tập cập nhật mới nhất.";

            let refreshIconHtml = ""; let adminBtnHtml = "";
            if (canEdit && safe_role === 'all') {
                refreshIconHtml = `<i class="bi bi-arrow-clockwise text-primary ms-2 opacity-75" style="cursor:pointer; font-size: 1rem;" onclick="event.stopPropagation(); window.refresh_subject_data('${key}', this)" title="Tải lại môn học"></i>`;
                adminBtnHtml = `<button class="btn btn-sm btn-outline-warning fw-bold border-0 px-2 px-md-3 d-flex align-items-center rounded-pill" onclick="event.stopPropagation(); window.admin_login_process('${key}')"><i class="bi bi-pencil-square"></i> <span class="d-none d-md-inline ms-1">Tạo đề</span></button>`;
            }

            html += `
                <div class="col-12 col-md-6 px-1 animate__animated animate__fadeInUp" style="animation-delay: ${sIndex * 0.03}s;" id="subject_card_block_${key}">
                    <div class="student-subj-card" onclick="window.toggle_subject_map('${key}', '${displayName}')">
                        
                        <div class="subj-card-header">
                            <div class="subj-icon-box">${displayIconHtml}</div>
                            <div class="subj-info-box">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="subj-title">${displayName}</div>
                                    ${adminBtnHtml}
                                </div>
                                <div class="subj-desc">${descFallback}</div>
                            </div>
                        </div>

                        <!-- 🌟 GỘP TỔNG SỐ VÀ PHÂN LOẠI LÊN CÙNG 1 HÀNG -->
                        <div class="subj-stats-bar w-100 mt-auto pt-2 border-top" style="border-color: rgba(255,255,255,0.05) !important;">
                            <div class="d-flex justify-content-between align-items-start w-100">
                                <div class="d-flex flex-wrap gap-1 align-items-center" style="min-width: 0;">
                                    <span class="subj-stat-badge fw-bold" id="stats_badge_${key}" style="border-color: rgba(234, 179, 8, 0.3); color: #fbbf24; background: rgba(234, 179, 8, 0.1);"><i class="bi bi-database"></i> ${qCount}</span>
                                    <span id="stats_details_${key}" class="d-flex flex-wrap gap-1"></span>
                                </div>
                                <div class="d-flex align-items-center flex-shrink-0 ms-2">
                                    ${refreshIconHtml}
                                </div>
                            </div>
                        </div>
                        
                        <div id="map_area_${key}" class="mt-3 text-start animate__animated animate__fadeIn w-100 pt-3 border-top" style="display:none; border-color: #2b3035 !important;" onclick="event.stopPropagation();"></div>
                    </div>
                </div>`;
        });
        html += `       </div>
                </div>
        </div>`;
        delay += 0.05;
    });
    
    html += `</div>`;
    container.innerHTML = html;
    window.render_stats_card_above_timeline();
    window.fetch_and_render_active_exams();
    
    // 🌟 TỰ ĐỘNG ĐẾM & PHÂN LOẠI SỐ LƯỢNG CÂU HỎI TRỰC TIẾP TỪ SUPABASE
    setTimeout(() => {
        Object.keys(subjectConfig).forEach(async (key) => {
            let badge = document.getElementById('stats_badge_' + key) || document.getElementById('admin_stats_badge_' + key);
            let details = document.getElementById('stats_details_' + key) || document.getElementById('admin_stats_details_' + key);
            if (!badge) return;

            const renderDetails = (dataArr) => {
                let single = 0, tf = 0, fill = 0, media = 0, phanxa = 0;
                dataArr.forEach(q => {
                    let t = String(q.type || 'single').toLowerCase().trim();
                    if (t === 'phanxa') phanxa++;
                    else if (t === 'quiz' || t === 'mcq' || t === '') single++;
                    else if (t === 'tf' || t === 'true_false' || t === 'đúng sai') tf++;
                    else if (t === 'fill' || t === 'short' || t === 'điền khuyết') fill++;
                    else if (['hotspot', 'clip', 'clip_listen', 'arrange', 'sắp xếp'].includes(t)) media++;
                    else single++;
                });
                
                let h = '';
                if(single > 0) h += `<span class="badge bg-info text-dark shadow-sm me-1 mb-1" style="font-size:0.65rem;">MCQ: ${single}</span>`;
                if(tf > 0) h += `<span class="badge bg-success shadow-sm me-1 mb-1" style="font-size:0.65rem;">Đ/S: ${tf}</span>`;
                if(fill > 0) h += `<span class="badge bg-warning text-dark shadow-sm me-1 mb-1" style="font-size:0.65rem;">Đ/K: ${fill}</span>`;
                if(media > 0) h += `<span class="badge shadow-sm me-1 mb-1" style="background:#c084fc; color:#fff; font-size:0.65rem;">Media: ${media}</span>`;
                if(phanxa > 0) h += `<span class="badge bg-danger shadow-sm me-1 mb-1" style="font-size:0.65rem;">Phản Xạ: ${phanxa}</span>`;
                
                if(details) details.innerHTML = h;
                return dataArr.length;
            };
            
            if (window.full_data && window.full_data[key]) {
                let total = renderDetails(window.full_data[key]);
                badge.innerHTML = `<i class="bi bi-database text-warning"></i> ${total} câu`;
            } else {
                try {
                    const clientDb = typeof db !== 'undefined' ? db : window._supabase;
                    let targetTable = key.includes('phanxa') ? 'phanxa_questions' : 'questions';
                    const { data, error } = await clientDb.from(targetTable).select('type').eq('subject_key', key);
                    if (!error && data) {
                        let total = renderDetails(data);
                        badge.innerHTML = `<i class="bi bi-database text-warning"></i> ${total} câu`;
                    } else {
                        badge.innerHTML = `<i class="bi bi-database text-warning"></i> 0 câu`;
                    }
                } catch(e) {
                    badge.innerHTML = `<i class="bi bi-database text-warning"></i> Lỗi`;
                }
            }
        });
    }, 300);
};

// =========================================================================
// 🏢 PHẦN 6: QUẢN TRỊ TRUNG TÂM (ADMIN HUB - DETAILED CARDS UI)
// =========================================================================
window.render_admin_hub = function() {
    const historyArea = document.getElementById('history_view_area');
    if (historyArea) historyArea.style.display = 'none';

    const container = document.getElementById('dash_subject_cards_container');
    if (!container) return;

    let isSuper = (window.current_user_role === 'all');
    let sys = window.currentUserPerms?.system || [];
    let edt = window.currentUserPerms?.edit || [];
    
    let canManageBanks = isSuper || sys.includes('system_banks') || edt.length > 0;
    let canManageSubjects = isSuper || sys.includes('system_subjects');
    let canManageUsers = isSuper || sys.includes('system_users');
    let canManageAdmissions = isSuper || sys.includes('system_admissions');

    let html = `
    <style>
        /* Thiết kế Thẻ Quản Trị Chi tiết (Detailed Card) */
        .admin-dash-card { background: #1a1d20; border: 1px solid #2b3035; border-radius: 16px; transition: 0.3s; cursor: pointer; display: flex; align-items: center; padding: 20px; height: 100%; box-shadow: 0 4px 15px rgba(0,0,0,0.2); text-align: left; gap: 15px; }
        .admin-dash-card:hover, .admin-dash-card:active { border-color: #0ea5e9; box-shadow: 0 8px 25px rgba(14, 165, 233, 0.25); transform: translateY(-4px); background: #1e293b; }
        
        .admin-dash-icon { font-size: 2.2rem; line-height: 1; padding: 15px; border-radius: 14px; flex-shrink: 0; box-shadow: inset 0 2px 5px rgba(0,0,0,0.3); }
        .admin-dash-info { display: flex; flex-direction: column; flex-grow: 1; min-width: 0; justify-content: center; }
        .admin-dash-title { font-size: 0.95rem; font-weight: 700; color: #f8fafc; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .admin-dash-desc { font-size: 0.75rem; color: #94a3b8; line-height: 1.4; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .admin-dash-stats { font-size: 0.7rem; font-weight: 600; padding: 4px 10px; border-radius: 6px; background: rgba(255,255,255,0.05); display: inline-flex; align-items: center; gap: 5px; width: fit-content; }
        
        .top-greeting-bar { background: #121416; border: 1px solid #2b3035; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
    </style>
    <div class="row w-100 m-0 g-3">`;

    if (isSuper) {
        let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
        let inventoryCount = parseInt(localStorage.getItem(invKey)) || 0;
        let studentNameDisplay = window.current_student_name || window.current_student_id || "Admin";

        html += `
        <div class="col-12 px-0 mb-3 animate__animated animate__fadeInDown">
            <div class="p-3 p-md-4 position-relative overflow-hidden" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div class="position-absolute" style="top: -20px; right: -20px; width: 120px; height: 120px; background: #f43f5e; filter: blur(50px); opacity: 0.25; pointer-events: none;"></div>
                <div class="position-absolute" style="bottom: -20px; left: 10%; width: 100px; height: 100px; background: #8b5cf6; filter: blur(40px); opacity: 0.25; pointer-events: none;"></div>

                <div class="d-flex align-items-center justify-content-between flex-wrap gap-3 position-relative z-1">
                    <div class="d-flex align-items-center gap-3">
                        <div class="position-relative" style="z-index: 2;">
                            ${window.get_user_rank_html()}
                        </div>
                        <div>
                            <div style="font-size: 0.7rem; color: #a78bfa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">Trang quản trị hệ thống,</div>
                            <div class="fw-bold" style="font-size: 1.15rem; line-height: 1.3; background: linear-gradient(to right, #f43f5e, #fb923c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 0.5px; white-space: normal; word-break: break-word;">
                                ${studentNameDisplay}
                            </div>
                        </div>
                    </div>
                    
                    <!-- 🌟 THANH CÔNG CỤ TÍCH HỢP CHO ADMIN -->
                    <div class="d-flex align-items-center gap-2 bg-black bg-opacity-25 p-2 rounded-pill border border-secondary border-opacity-25 flex-wrap justify-content-end">
                        
                        <!-- 3 NÚT TIỆN ÍCH DẠNG TRÒN CHO ADMIN -->
                        <div class="d-flex align-items-center justify-content-center rounded-circle stat-card-hover shadow-sm" title="Trạm Dịch" style="width: 36px; height: 36px; cursor: pointer; background: rgba(250, 204, 21, 0.15); border: 1px solid rgba(250, 204, 21, 0.3);" onclick="window.openBuilderModule()"><span style="font-size:1.1rem">✍️</span></div>
                        <div class="d-flex align-items-center justify-content-center rounded-circle stat-card-hover shadow-sm" title="Nghe Reels" style="width: 36px; height: 36px; cursor: pointer; background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3);" onclick="window.openReelsModule()"><span style="font-size:1.1rem">🎬</span></div>
                        <div class="d-flex align-items-center justify-content-center rounded-circle stat-card-hover shadow-sm" title="Học Phản Xạ" style="width: 36px; height: 36px; cursor: pointer; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3);" onclick="window.openPhanXaModule()"><span style="font-size:1.1rem">🧠</span></div>
                        
                        <div style="width: 1px; height: 20px; background: rgba(255,255,255,0.2); margin: 0 2px;"></div> <!-- Phân cách -->
                        
                        <!-- TÚI QUÀ VÀ CÁC NÚT CŨ CỦA ADMIN -->
                        <div id="dashboard_inventory_badge" class="d-flex align-items-center gap-1 px-2 py-1 rounded-pill stat-card-hover" title="Túi Đồ" style="cursor: pointer; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3);" onclick="window.toggle_inventory_popover(event)">
                            <span style="font-size: 1.1rem; filter: drop-shadow(0 0 5px rgba(245,158,11,0.5));">🎁</span>
                            <span class="text-warning fw-bold" style="font-size: 0.95rem;" id="dashboard_inventory_count">${inventoryCount}</span>
                        </div>
                        <div class="d-flex align-items-center justify-content-center rounded-circle stat-card-hover shadow-sm" title="Liên kết khuôn mặt" style="width: 36px; height: 36px; cursor: pointer; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8;" onclick="window.setup_face_id()"><i class="bi bi-person-bounding-box"></i></div>
                        <div class="d-flex align-items-center justify-content-center rounded-circle stat-card-hover shadow-sm" title="Đăng xuất" style="width: 36px; height: 36px; cursor: pointer; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;" onclick="window.logout_user()"><i class="bi bi-power"></i></div>
                    </div>
                </div>
            </div>
        </div>`;
    } else {
        html += `
        <div class="col-12 px-0 mb-3">
            <div class="d-flex justify-content-between align-items-center w-100">
                <button class="btn btn-sm fw-bold text-white-50 px-3 d-flex align-items-center shadow-sm" onclick="window.render_student_subject_list(window.current_user_role)" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-size: 0.9rem; letter-spacing: 0.5px;"><i class="bi bi-arrow-left me-1"></i>Quay lại Sảnh</button>
            </div>
        </div>`;
    }

    let delay = 0;
    // 🌟 THAY ĐỔI LỚN TẠI ĐÂY: Hàm tạo Thẻ Admin dùng cấu trúc col-12 col-md-6, chứa Mô tả và Thống kê
    const renderAdminCard = (title, desc, statsHtml, icon, color, action) => {
        let cardHtml = `
        <div class="col-12 col-md-6 px-1 animate__animated animate__zoomIn" style="animation-delay: ${delay}s;">
            <div class="admin-dash-card" onclick='${action}'>
                <div class="admin-dash-icon" style="color: ${color}; border: 1px solid ${color}40; background: ${color}15;">
                    <i class="bi ${icon}"></i>
                </div>
                <div class="admin-dash-info">
                    <div class="admin-dash-title">${title}</div>
                    <div class="admin-dash-desc">${desc}</div>
                    <div class="admin-dash-stats" style="color: ${color}; border: 1px solid ${color}40;">${statsHtml}</div>
                </div>
            </div>
        </div>`;
        delay += 0.05;
        return cardHtml;
    };

    let subjectCount = Object.keys(subjectConfig).length;

    if (canManageBanks) html += renderAdminCard(
        'Q.LÝ TRẮC NGHIỆM', 
        'Truy cập kho ngân hàng câu hỏi, soạn thảo đề thi và cài đặt ma trận Bloom.', 
        `<i class="bi bi-database"></i> Quản lý ${subjectCount} môn học`, 
        'bi-journal-check', '#38bdf8', 'window.render_student_subject_list("all")'
    );
    
    if (canManageBanks) html += renderAdminCard(
        'PHÒNG THI ONLINE', 
        'Tổ chức thi, giám sát sinh viên rời tab (Real-time), khóa máy chống gian lận.', 
        `<i class="bi bi-broadcast"></i> Trung tâm Giám sát Live`, 
        'bi-laptop', '#f59e0b', 'window.render_exam_management()'
    );
    
    if (canManageSubjects) html += renderAdminCard(
        'DANH MỤC MÔN', 
        'Cài đặt ID Google Sheets, phân quyền nhóm (Role) và đổi giao diện UI.', 
        `<i class="bi bi-gear"></i> Cấu trúc hệ thống`, 
        'bi-collection-fill', '#c084fc', 'window.render_subject_management()'
    );
    
    if (canManageUsers) html += renderAdminCard(
        'Q.LÝ NGƯỜI DÙNG', 
        'Thêm sinh viên từ Excel, gán lớp học, cấp quyền Admin/User chi tiết.', 
        `<i class="bi bi-person-lines-fill"></i> Quản lý danh bạ & Lớp`, 
        'bi-people-fill', '#10b981', 'window.render_user_management()'
    );
    
    if (canManageAdmissions) html += renderAdminCard(
        'QL TUYỂN SINH', 
        'Phân tích hồ sơ tuyển sinh, theo dõi nguồn thí sinh và tiến độ nộp hồ sơ.', 
        `<i class="bi bi-pie-chart"></i> Báo cáo tăng trưởng`, 
        'bi-person-plus-fill', '#f472b6', 'window.render_admission_analytics()'
    );
    
    if (typeof window.check_stats_perm === 'function' && window.check_stats_perm()) {
        html += renderAdminCard(
            'NHẬT KÝ HỆ THỐNG', 
            'Tra cứu toàn bộ lịch sử ôn tập, thời gian đăng nhập và IP của học viên.', 
            `<i class="bi bi-clock-history"></i> Log máy chủ`, 
            'bi-journal-text', '#4ade80', 'window.open_admin_history_modal()'
        );
        html += renderAdminCard(
            'THỐNG KÊ (BIỂU ĐỒ)', 
            'Phân tích phổ điểm, tỷ lệ làm đúng sai theo từng bài học và môn học.', 
            `<i class="bi bi-graph-up-arrow"></i> Đánh giá chất lượng`, 
            'bi-bar-chart-line-fill', '#ef4444', 'window.render_result_management()'
        );
    }

    html += `</div>`;
    container.innerHTML = html;
};

window.toggle_subject_map = function(subjectKey, displayName) {
    const mapArea = document.getElementById(`map_area_${subjectKey}`);
    if (!mapArea) return;
    if (mapArea.style.display === 'block') { mapArea.style.display = 'none'; } 
    else {
        document.querySelectorAll('[id^="map_area_"]').forEach(el => { el.style.display = 'none'; el.innerHTML = ''; });
        window.open_lesson_map(subjectKey, displayName);
    }
}

window.open_lesson_map = async function(subjectKey, displayName) {
    window.current_subject = subjectKey; 
    const mapArea = document.getElementById(`map_area_${subjectKey}`);
    if (!mapArea) return;
    mapArea.style.display = 'block';
    
    if (window.full_data && window.full_data[subjectKey] && window.full_data[subjectKey].length > 0) {
        window.draw_lesson_buttons(subjectKey, displayName, window.full_data[subjectKey]);
        return;
    }

    mapArea.innerHTML = `<div class="text-center p-3"><div class="spinner-border spinner-border-sm text-info mb-2"></div><div id="loader_map_${subjectKey}" class="small text-muted fw-bold" style="font-size:0.75rem;">Đang tải dữ liệu từ Supabase...</div></div>`;
    
    try {
        const { data, error } = await window.fetch_all_questions(subjectKey);
        if (error) throw error;
        
        if (data && data.length > 0) {
            if (!window.full_data) window.full_data = {};
            
            // Xử lý dữ liệu từ Supabase để khớp cấu trúc cũ
            let mappedData = data.map(q => ({
                id: q.old_uuid || q.id,
                lesson: q.lesson !== undefined && q.lesson !== null ? String(q.lesson).trim() : "1",
                type: q.type || 'single',
                level: q.level || 1,
                q: q.q || q.question_text || "",
                opta: q.opt_a || "", optb: q.opt_b || "", optc: q.opt_c || "", optd: q.opt_d || "",
                opts: [q.opt_a || "", q.opt_b || "", q.opt_c || "", q.opt_d || ""],
                answer: q.answer || "", a: q.answer || "",
                hint: q.hint || "", lessonname: q.lessonname || "",
                image: q.multimedia || "", nav: q.navigation || ""
            }));

            window.full_data[subjectKey] = mappedData;
            window.draw_lesson_buttons(subjectKey, displayName, mappedData);
        } else {
            let canEdit = (typeof window.check_subj_perm === 'function') ? window.check_subj_perm(subjectKey, 'edit') : true;
            let btnHtml = canEdit ? `
                <button class="btn btn-outline-info fw-bold btn-sm rounded-pill px-3 mt-3 shadow-sm" style="border-width: 2px;" onclick="window.show_add_lesson_modal('${subjectKey}')">
                    <i class="bi bi-plus-circle-dotted me-1"></i> TẠO BÀI HỌC ĐẦU TIÊN
                </button>` : '';

            mapArea.innerHTML = `
                <div class="text-center p-4 animate__animated animate__fadeIn glass-panel mt-2" style="border-radius: 12px;">
                    <i class="bi bi-inbox text-white-50 mb-2" style="font-size: 2rem;"></i>
                    <div class="text-danger small fw-bold">Chưa có dữ liệu bài học.</div>
                    ${btnHtml}
                </div>`;
        }
    } catch (err) {
        mapArea.innerHTML = `<div class="text-center text-danger p-3 small fw-bold">Lỗi tải dữ liệu: ${err.message}</div>`;
    }
};

// =========================================================================
// 🚀 HÀM VẼ DANH SÁCH BÀI HỌC VÀ TÀI LIỆU (KHÔNG NỀN, KHÔNG CUỘN LỒNG)
// =========================================================================
window.draw_lesson_buttons = function(subjectKey, displayName, qData) {
    qData = qData || []; 
    window.current_subject_qData = qData; 
    const mapArea = document.getElementById(`map_area_${subjectKey}`);
    if (!mapArea) return;

    let linkItems = qData.filter(q => String(q.type).toLowerCase().trim() === 'link');
    let normalItems = qData.filter(q => String(q.type).toLowerCase().trim() !== 'link');

    if (linkItems.length > 0) {
        let groups = {};
        linkItems.forEach((item, index) => {
            let gName = item.lessonname || item[10] || "DANH MỤC CHUNG";
            if (!groups[gName]) groups[gName] = { items: [] };
            groups[gName].items.push({
                ten: item.q || item[3] || "Tài liệu", link: item.a || item.answer || item[8] || "#", emoji: (item.opts && item.opts[0]) ? item.opts[0] : "📄"  
            });
        });

        let finalHtml = `
        <div class="mb-2 px-1 mt-1">
            <div class="position-relative">
                <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-2 text-white-50"></i>
                <input type="text" class="form-control bg-transparent text-white fw-bold p-2 ps-5" style="border: none; border-bottom: 1px solid rgba(255,255,255,0.1); border-radius: 0; font-size: 0.8rem;" placeholder="Tìm kiếm..." oninput="window.searchLinkItems(this.value)">
            </div>
        </div>
        <div class="d-flex flex-column gap-2 mb-2 w-100">`;

        let gIndex = 0;
        Object.keys(groups).forEach(gName => {
            let cat = groups[gName]; let safeGroupId = 'link_grp_' + gIndex++;
            finalHtml += `
            <div class="p-1 link-group-wrapper" data-group-name="${gName.replace(/"/g, '&quot;')}" style="background: transparent; border: none;">
                <div class="fw-bold text-white px-2 py-2 d-flex justify-content-between align-items-center" style="background: transparent; border: none; font-size: 0.85rem; cursor: pointer; opacity: 0.9;" onclick="let b = document.getElementById('${safeGroupId}'); b.classList.toggle('d-none'); let i = this.querySelector('.toggle-icon'); if(b.classList.contains('d-none')){i.classList.replace('bi-chevron-up','bi-chevron-down')}else{i.classList.replace('bi-chevron-down','bi-chevron-up')}">
                    <div class="d-flex align-items-center gap-2"><i class="bi bi-chevron-down toggle-icon text-info fs-6 opacity-75"></i><span class="text-uppercase" style="letter-spacing: 0.5px;">${gName}</span></div>
                    <span class="text-white-50 flex-shrink-0" style="font-size: 0.7rem;">${cat.items.length} bài</span>
                </div>
                <div id="${safeGroupId}" class="link-group-body d-none mt-1 ms-3">
                    <div class="d-flex flex-column gap-1">`;
            
            cat.items.forEach(item => {
                finalHtml += `
                <button class="btn w-100 d-flex align-items-center p-2 text-start ext-link-item" data-item-name="${item.ten.replace(/"/g, '&quot;')}" style="border: none !important; background: transparent; transition: transform 0.2s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'" onclick="window.open_link_in_modal('${item.link}', \`${item.ten}\`)">
                    <div class="d-flex align-items-center justify-content-center flex-shrink-0 me-2" style="width: 30px; height: 30px;"><span style="font-size: 1.2rem; line-height: 1;">${item.emoji}</span></div>
                    <div class="flex-grow-1 overflow-hidden pe-2"><div class="text-white text-truncate" style="font-size: 0.8rem;">${item.ten}</div></div>
                </button>`;
            });
            finalHtml += `</div></div></div>`;
        });
        mapArea.innerHTML = finalHtml + `</div>`;
        return; 
    }

    let finalHtml = `<div class="d-flex flex-column gap-1 mt-1 w-100">`; 
    let canEdit = window.check_subj_perm(subjectKey, 'edit');
    
    if (normalItems.length > 0) {
        let lessonMap = {}; normalItems.forEach(q => { if (!lessonMap[q.lesson]) lessonMap[q.lesson] = q.lessonname; });
        const uniqueLessons = Object.keys(lessonMap).sort((a, b) => parseInt(a) - parseInt(b));
        
        let userLog = { lessonScores: {} };
        if (window.studentProgressLogs) {
            const cleanString = (str) => String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
            let safeSubjKey = cleanString(subjectKey); let safeDispName = cleanString(displayName);
            for (let k in window.studentProgressLogs) {
                if (cleanString(k) === safeSubjKey || cleanString(k) === safeDispName) {
                    if (window.studentProgressLogs[k] && window.studentProgressLogs[k].lessonScores) Object.assign(userLog.lessonScores, window.studentProgressLogs[k].lessonScores);
                }
            }
        }
        const scores = userLog.lessonScores || {};

        uniqueLessons.forEach(l => {
            let nameStr = lessonMap[l] ? `: ${lessonMap[l]}` : "";
            let score = scores[l];
            if (score === undefined) {
                let clean_l = String(l).toLowerCase().replace(/[^a-z0-9]/g, ''); 
                for (let k in scores) {
                    let clean_k = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (clean_k === clean_l || clean_k.startsWith(clean_l)) { score = scores[k]; break; }
                }
            }

            // --- ĐẾM THỐNG KÊ 6 LOẠI CÂU HỎI ---
            let s = normalItems.filter(q => String(q.lesson) === l && (q.type === 'single' || q.type === 'mcq' || !q.type)).length;      
            let tf = normalItems.filter(q => String(q.lesson) === l && (q.type === 'tf' || q.type === 'true_false' || q.type === 'đúng sai')).length; 
            let f = normalItems.filter(q => String(q.lesson) === l && (q.type === 'fill' || q.type === 'short' || q.type === 'điền khuyết')).length; 
            let hs = normalItems.filter(q => String(q.lesson) === l && (q.type === 'hotspot')).length; 
            let arr = normalItems.filter(q => String(q.lesson) === l && (q.type === 'arrange' || q.type === 'sắp xếp')).length; 
            let clip = normalItems.filter(q => String(q.lesson) === l && (q.type === 'clip_listen' || String(q.type).includes('clip'))).length; 

            // --- TẠO CHUỖI HIỂN THỊ ĐỘNG (Chỉ hiện nếu có câu hỏi) ---
            let statsArr = [];
            if (s > 0) statsArr.push(`TN:${s}`);
            if (tf > 0) statsArr.push(`ĐS:${tf}`);
            if (f > 0) statsArr.push(`ĐK:${f}`);
            if (hs > 0) statsArr.push(`Ảnh:${hs}`);
            if (arr > 0) statsArr.push(`SắpXếp:${arr}`);
            if (clip > 0) statsArr.push(`Nghe:${clip}`);
            let statsStr = statsArr.length > 0 ? `(${statsArr.join(' ')})` : `<span class="text-danger">(Rỗng)</span>`;

            let scoreStr = score !== undefined ? `<span class="ms-1 ${score >= 8 ? 'text-success' : 'text-warning'}" style="font-size: 0.7rem;">${score.toFixed(1)}đ</span>` : `<span class="ms-1 text-secondary" style="font-size: 0.7rem;">Chưa làm</span>`;

            let adminEditBtn = canEdit ? `<div class="d-flex align-items-center ms-2"><button class="btn btn-sm p-1 text-white-50" style="background: transparent; border: none;" onclick="event.stopPropagation(); window.open_admin_lesson_panel('${subjectKey}', '${l}')"><i class="bi bi-pencil-square"></i></button></div>` : "";

            finalHtml += `
                <div class="d-flex align-items-center mb-1 ms-3">
                    <button class="btn text-start p-2 d-flex flex-column flex-grow-1" style="background: transparent !important; border: none !important; transition: transform 0.2s; box-shadow: none;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'" onclick="window.quick_start_lesson('${subjectKey}', '${l}')">
                        <div class="text-white mb-1" style="font-size: 0.85rem; line-height: 1.3; white-space: normal !important; text-align: left;"><i class="bi bi-journal-text me-2 text-info opacity-75"></i>Bài ${l}${nameStr}</div>
                        <div class="text-white-50" style="font-size: 0.65rem;">${statsStr} ${scoreStr}</div>
                    </button>
                    ${adminEditBtn}
                </div>`;
        });
    } else if (linkItems.length === 0) {
        finalHtml += `<div class="text-center p-3 ms-3"><div class="text-white-50 small" style="font-size: 0.75rem;">Chưa có dữ liệu bài học!</div></div>`;
    }
    
    if (canEdit) finalHtml += `<div class="p-2 text-start mt-1 ms-3" onclick="window.show_add_lesson_modal('${subjectKey}')" style="cursor: pointer; opacity: 0.7;"><i class="bi bi-plus-lg text-info me-2"></i><span class="text-info" style="font-size: 0.75rem;">THÊM BÀI MỚI</span></div>`;
    mapArea.innerHTML = finalHtml + `</div>`;
};


// =========================================================================
// 🔍 HÀM TÌM KIẾM ĐỘNG CHO KHO TÀI LIỆU
// =========================================================================
window.searchLinkItems = function(query) {
    let v = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let groups = document.querySelectorAll('.link-group-wrapper');
    
    groups.forEach(grp => {
        let gName = grp.getAttribute('data-group-name').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let items = grp.querySelectorAll('.ext-link-item');
        let hasVisibleItem = false;
        
        items.forEach(item => {
            let iName = item.getAttribute('data-item-name').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            // Nếu Tên nhóm khớp -> Hiện tất cả các bài. Nếu Tên bài khớp -> Chỉ hiện bài đó
            if (v === '' || gName.includes(v) || iName.includes(v)) {
                item.style.setProperty('display', 'flex', 'important');
                hasVisibleItem = true;
            } else {
                item.style.setProperty('display', 'none', 'important');
            }
        });
        
        let body = grp.querySelector('.link-group-body');
        let icon = grp.querySelector('.toggle-icon');
        
        if (v !== '') {
            // Khi đang tìm kiếm: Nếu có bài hiển thị -> Tự động bung nhóm đó ra
            grp.style.display = hasVisibleItem ? 'block' : 'none';
            if (hasVisibleItem) {
                body.classList.remove('d-none');
                if (icon) icon.classList.replace('bi-chevron-down', 'bi-chevron-up');
            }
        } else {
            // Khi xóa tìm kiếm: Khôi phục về trạng thái thu gọn ban đầu
            grp.style.display = 'block';
            body.classList.add('d-none');
            if (icon) icon.classList.replace('bi-chevron-up', 'bi-chevron-down');
        }
    });
};

window.update_progress_bar = function() {
    let container = document.getElementById('progress_container');
    let bar = document.getElementById('progress_bar');
    if (!container || !bar) return;

    // Đếm những câu đã hoàn thành (q.done === true)
    let finishedCount = window.questions.filter(q => q.done).length;
    let total = window.questions.length;
    let percent = total > 0 ? (finishedCount / total) * 100 : 0;
    
    container.style.display = 'block'; 
    bar.style.width = percent + '%';
};
// =========================================================================
// 🚀 NÚT BẮT ĐẦU (ĐÃ TÍCH HỢP TẠO ĐÁP ÁN ẢO & ẨN ĐỒNG HỒ)
// =========================================================================
window.quick_start_lesson = function(subjectKey, lessonId) {
  window.is_study_mode = true;
    window.is_exam_started = false;
    if (window.proctoring_state) window.proctoring_state.is_active = false;
    localStorage.setItem('menu_scroll_pos', window.scrollY || document.documentElement.scrollTop);
    let currentData = window.full_data[subjectKey] || null;
    if (!currentData) return window.show_alert("Cảnh báo", "Dữ liệu chưa sẵn sàng! Vui lòng tải lại trang.");
    
    window.current_subject = subjectKey; 
    window.selected_lessons_text = lessonId; 

    // 🌟 MÁY QUÉT ĐIỂM CŨ: Chặn tính năng cày Quà tặng nếu đã được >= 8đ
    window.is_eligible_for_reward = true;
    let attemptCount = 0;
    
    if (window.studentProgressLogs) {
        const cleanString = (str) => String(str||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
        let safeSubjKey = cleanString(subjectKey);
        let subjDisplayName = cleanString(subjectConfig[subjectKey]?.name || subjectKey);
        
        for (let k in window.studentProgressLogs) {
            if (cleanString(k) === safeSubjKey || cleanString(k) === subjDisplayName) {
                let sLog = window.studentProgressLogs[k];
                for (let lKey in sLog.lessonScores) {
                    if (cleanString(lKey) === cleanString(lessonId) || cleanString(lKey).startsWith(cleanString(lessonId))) {
                        let maxScore = sLog.lessonScores[lKey] || 0;
                        attemptCount = sLog.lessonAttempts ? (sLog.lessonAttempts[lKey] || 0) : 0;
                        
                        // 🌟 ĐÃ FIX: Lưu số lượt thi vào bộ nhớ để tý gửi kèm lúc nộp bài
                        window.current_attempt_count = attemptCount + 1;

                        if (maxScore >= 8) {
                            window.is_eligible_for_reward = false;
                            window.show_toast("⚠️ Báo cáo: Bạn đã từng đạt điểm cao ở bài này. Lượt làm lại sẽ không được nhận Quà tặng ưu đãi.", true);
                            // Đã xóa lệnh gửi email rời làm rác hộp thư
                        }
                        break;
                    }
                }
            }
        }
    }
    
    let pool = currentData.filter(q => {
        if (!q || q.lesson == null) return false; 
        return String(q.lesson).trim().toLowerCase() === String(lessonId).trim().toLowerCase();
    });
    
    if (pool.length === 0) return window.show_alert("Cảnh báo", "Bài học chưa có câu hỏi!");
    
    let lessonName = "";
    if (window.lessonNames && window.lessonNames[subjectKey] && window.lessonNames[subjectKey][lessonId]) {
        lessonName = window.lessonNames[subjectKey][lessonId];
    } else if (pool[0].lessonname) {
        lessonName = pool[0].lessonname;
    } else if (pool[0][10]) {
        lessonName = pool[0][10];
    }

    let isStoryLesson = lessonName.toUpperCase().includes('[STORY]') || lessonName.toUpperCase().includes('[CASE]');

    pool.forEach((q, index) => { 
        q.id = index + 1; q.visited = false; q.done = false; 
        q.ans_user = (q.type === 'fill' || q.type === 'short') ? [] : ""; 
    });

    window.show_mode_modal((mode) => {
        
        // 1. Kích hoạt giao diện
        if(document.getElementById('step_1')) document.getElementById('step_1').style.display = 'none';
        if(document.getElementById('step_3')) document.getElementById('step_3').style.display = 'block';
        
        // 2. Hiện Header & Đồng bộ Ví Quà Mini
        let qHeader = document.querySelector('.sticky-quiz-header') || document.querySelector('#step_3 .header-fixed-wrapper');
        if(qHeader) qHeader.style.display = ''; 
        
        let miniInvCount = document.getElementById('mini_inventory_count');
        if (miniInvCount) {
            let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
            miniInvCount.innerText = parseInt(localStorage.getItem(invKey)) || 0;
        } 

        let quizArea = document.getElementById('quiz_area');
        if(quizArea) { 
            quizArea.innerHTML = ''; 
            quizArea.style.height = 'auto'; 
            quizArea.style.display = 'block'; 
        }

        // TÌM NÚT CHUYỂN ĐỔI CHẾ ĐỘ
        let modeTextEl = document.getElementById('mode_text');
        let modeToggleBtn = modeTextEl ? modeTextEl.closest('button') : null;

        let submitBtn = document.getElementById('submit_btn');
        if(submitBtn) submitBtn.style.display = 'none';

        // 🌟 TÀNG HÌNH ĐỒNG HỒ TRÊN HEADER NẾU LÀ CHẾ ĐỘ PHẢN XẠ
        let globalTimerBox = document.querySelector('.glass-timer-box');
        if (globalTimerBox) {
            globalTimerBox.style.display = (mode === 'phanxa') ? 'none' : '';
        }

        // =======================================================
        // 🎭 ĐANG MỞ CHẾ ĐỘ STORY
        // =======================================================
        if (mode === 'story') {
            if (modeToggleBtn) modeToggleBtn.style.display = 'none';
            window.current_story_data = [...pool]; 
            
            let mappedData = pool.map(q => {
                let correctOpt = String(q.a || q.answer || q[8] || "").trim().toUpperCase();
                let ansText = correctOpt; 
                let oA = q.opts && q.opts.length > 0 ? q.opts[0] : (q.optA || q[5] || q[4] || "");
                let oB = q.opts && q.opts.length > 1 ? q.opts[1] : (q.optB || q[6] || q[5] || "");
                let oC = q.opts && q.opts.length > 2 ? q.opts[2] : (q.optC || q[7] || q[6] || "");
                let oD = q.opts && q.opts.length > 3 ? q.opts[3] : (q.optD || q[8] || q[7] || "");
                
                if(correctOpt === 'A') ansText = oA; else if(correctOpt === 'B') ansText = oB; else if(correctOpt === 'C') ansText = oC; else if(correctOpt === 'D') ansText = oD;
                return { ...q, id: q.id || Math.random().toString(36).substring(2, 10), q: q.q || q[4] || q[3] || "Tình huống lâm sàng", a: ansText };
            });
            
            window.questions = [...mappedData]; 
            window.story_score_tracker = { correct: 0, total: 0, attempts: {} };
            window.start_time = new Date();
            
            window.time_left = window.current_story_data.length * 60;
            window.is_exam_started = true;
            
            if (typeof window.render_story_node === 'function') window.render_story_node(0);
            setTimeout(() => { if (typeof window.start_countdown === 'function') window.start_countdown(); }, 100);

            return;
        }

       // =======================================================
        // 📚 ĐANG MỞ CÁC CHẾ ĐỘ CÒN LẠI
        // =======================================================
        if (modeToggleBtn) modeToggleBtn.style.display = 'inline-block';
        window.is_study_mode = true;

        if (mode === 'flashcard') {
            window.is_flashcard_mode = true;
            window.questions = [...pool]; 
            
            // 🌟 Nút bấm sẽ trỏ tới chế độ tiếp theo: GAME (GHÉP CẶP)
            if(modeTextEl) modeTextEl.innerHTML = '<i class="bi bi-controller"></i> Ghép Cặp'; 
            
            window.time_left = window.questions.length * 60; window.is_exam_started = true;
            if(typeof window.render_flashcard_mode === 'function') window.render_flashcard_mode(0);
            else if (typeof window.render_flashcard === 'function') window.render_flashcard();
            if(typeof window.start_countdown === 'function') window.start_countdown();
            
        } else if (mode === 'quiz') {
            window.is_flashcard_mode = false;
            
            let processedPool = pool.map((q, idx, arr) => {
                let newQ = Array.isArray(q) ? [...q] : { ...q };
                let isPhanXa = String(q.type || q[1] || "").toLowerCase() === 'phanxa';
                
                // 1. NẾU LÀ CÂU HỎI PHẢN XẠ NHƯNG MỞ BẰNG QUIZ -> Tạo đáp án nhiễu tự động
                if (isPhanXa) {
                    newQ.q = q.vi || q.q || q[2] || "Câu hỏi trống";
                    let correctAns = q.en || q.answer || q.a || q[4] || "Đáp án trống";
                    
                    let fakeOpts = [correctAns];
                    for(let i = 1; i <= 3; i++) {
                        let nextQ = arr[(idx + i) % arr.length];
                        fakeOpts.push(nextQ.en || nextQ.answer || nextQ.a || nextQ[4] || ("Nhiễu " + i));
                    }
                    fakeOpts.sort(() => Math.random() - 0.5);
                    
                    newQ.opts = fakeOpts; 
                    newQ.optA = fakeOpts[0]; newQ.optB = fakeOpts[1]; newQ.optC = fakeOpts[2]; newQ.optD = fakeOpts[3];
                    let letter = ['A', 'B', 'C', 'D'][fakeOpts.indexOf(correctAns)];
                    newQ.a = letter; newQ.answer = letter; newQ.type = 'single'; 
                    return newQ;
                }
                
                // 2. BẢO TOÀN DỮ LIỆU CÁC MÔN KHÁC (Quiz, Hotspot, Hình ảnh...)
                // 🌟 Bổ sung đọc đúng biến 'multimedia' cho dạng bài Hotspot
                let originalImg = q.img || q.image || q.multimedia || q.image_url || (Array.isArray(q) ? q[3] : "") || "";
                newQ.img = originalImg;
                newQ.image = originalImg;
                newQ.multimedia = originalImg; 
                
                // Khôi phục câu hỏi và đáp án để tránh mất dữ liệu gốc
                newQ.q = q.q || q.question || q[2] || "";
                newQ.a = q.a || q.answer || q[4] || "";

                // Tái tạo mảng opts để hiển thị 4 nút bấm (chỉ thêm vào nếu thực sự bị thiếu)
                if (!newQ.opts || newQ.opts.length === 0) {
                    let oA = q.optA || q.opts_A || q.opt_a || q[5] || q[4] || "";
                    let oB = q.optB || q.opts_B || q.opt_b || q[6] || q[5] || "";
                    let oC = q.optC || q.opts_C || q.opt_c || q[7] || q[6] || "";
                    let oD = q.optD || q.opts_D || q.opt_d || q[8] || q[7] || "";
                    
                    let options = [oA, oB, oC, oD].filter(o => o !== null && o !== undefined && String(o).trim() !== "");
                    if (options.length > 0) {
                        newQ.opts = options;
                    }
                }
                
                return newQ;
            });

            if(!isStoryLesson) window.questions = [...processedPool].sort(() => Math.random() - 0.5);
            else window.questions = [...processedPool];
            
            // 🌟 Nút bấm sẽ trỏ tới chế độ tiếp theo: FLASHCARD (LẬT THẺ)
            if(modeTextEl) modeTextEl.innerHTML = '<i class="bi bi-card-heading"></i> Lật Thẻ'; 
            
            window.time_left = window.questions.length * 60; window.is_exam_started = true; window.away_seconds = 0; window.start_time = new Date();
            if(typeof window.render_quiz === 'function') window.render_quiz(); 
            if(typeof window.start_countdown === 'function') window.start_countdown();  
            
        } else if (mode === 'game') {
            window.is_flashcard_mode = false; 
            
            // 🌟 Chuẩn hóa Câu hỏi (q) và Đáp án (a) để tạo thẻ bài Ghép Cặp
            let processedPool = pool.map((q) => {
                let newQ = Array.isArray(q) ? [...q] : { ...q };
                let isPhanXa = String(q.type || q[1] || "").toLowerCase() === 'phanxa';
                
                if (isPhanXa) {
                    newQ.q = q.vi || q.q || q[2] || "Câu hỏi trống";
                    newQ.a = q.en || q.answer || q.a || q[4] || "Đáp án trống";
                } else {
                    newQ.q = q.q || q.question || q[2] || "";
                    newQ.a = q.a || q.answer || q[4] || "";
                    newQ.img = q.img || q.image || q.image_url || q[3] || "";
                }
                return newQ;
            }).filter(q => q.q && (q.a || q.img)); // Loại bỏ thẻ rỗng tránh lỗi game
            
            window.questions = [...processedPool]; 
            
            // 🌟 Đang ở GAME -> Trỏ tới SINH TỒN
            if(modeTextEl) modeTextEl.innerHTML = '<i class="bi bi-fire text-danger"></i> Sinh Tồn';
            
            window.time_left = window.questions.length * 60; 
            window.is_exam_started = true; 
            window.away_seconds = 0; 
            window.start_time = new Date();
            
            if(typeof window.initMatchingGame === 'function') window.initMatchingGame(); 
            else if(typeof window.render_game === 'function') window.render_game();
            if(typeof window.start_countdown === 'function') window.start_countdown();
            
        } else if (mode === 'survival') {
            window.is_flashcard_mode = false;
            
            // Xáo trộn & lấy cả câu Trắc nghiệm + Đúng/Sai
            let processedPool = pool.filter(q => {
                let t = String(q.type || "").toLowerCase().trim();
                return t === 'single' || t === 'mcq' || t === 'true_false' || t === 'tf' || t === 'đúng sai' || t === '';
            }).sort(() => Math.random() - 0.5);
            
            // Gọi bảng thông báo kính mờ tuyệt đẹp của hệ thống
            if (processedPool.length === 0) {
                return window.show_alert("Không thể bắt đầu", "Chế độ Sinh Tồn yêu cầu bài học có câu hỏi Trắc nghiệm hoặc Đúng/Sai. Vui lòng chọn bài khác!");
            }
            
            window.questions = [...processedPool]; 
            
            // 🌟 Đang ở SINH TỒN -> Trỏ tới PHẢN XẠ
            if(modeTextEl) modeTextEl.innerHTML = '<i class="bi bi-mic-fill"></i> Phản Xạ';
            
            window.is_exam_started = true;
            window.start_time = new Date();
            
            // Kích hoạt Engine Đấu trường
            if(typeof window.init_survival_engine === 'function') window.init_survival_engine();

        } else if (mode === 'phanxa') {
            window.is_flashcard_mode = false; 
            
            // 1. Cập nhật nhãn nút chuyển chế độ tiếp theo
            if(modeTextEl) {
                if (isStoryLesson) modeTextEl.innerHTML = '<i class="bi bi-bezier2"></i> Câu Chuyện';
                else modeTextEl.innerHTML = '<i class="bi bi-ui-checks"></i> Làm Quiz';
            }
            
            if (window.timer_interval) clearInterval(window.timer_interval);

            // 2. Lấy bộ câu hỏi hiện tại
            let currentSubjectKey = window.current_subject || "";
            let currentPool = [...pool];

            if ((!currentPool || currentPool.length === 0) && window.full_data && window.full_data[currentSubjectKey]) {
                currentPool = [...window.full_data[currentSubjectKey]];
            }

            // 3. Kiểm tra loại môn học & Lọc Phản Xạ theo User
            let isPhanXaSubject = currentSubjectKey.includes('phanxa') || currentSubjectKey.includes('tienganh');

            if (isPhanXaSubject) {
                let user = localStorage.getItem('username') || localStorage.getItem('user_id') || localStorage.getItem('user') || window.current_student_id;
                let allowedKeys = ['phanxacongdong'];
                if (user) {
                    let cleanUser = user.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
                    allowedKeys.push(`phanxa${cleanUser}`);
                }
                
                // Lọc chỉ giữ các câu hỏi cộng đồng hoặc thuộc tài khoản user
                currentPool = currentPool.filter(q => !q.subject_key || allowedKeys.includes(q.subject_key));
            }

            // 4. Chuẩn hóa dữ liệu sang định dạng Phản Xạ (VI & EN)
            let phanXaPool = currentPool.map(q => {
                let item = { ...q };
                // Lấy Nội dung câu hỏi
                item.vi = q.vi || q.q || q.question || q[4] || q[3] || "Câu hỏi";
                
                // Lấy Nội dung đáp án đúng
                let correctOpt = String(q.a || q.answer || q[8] || "").trim().toUpperCase();
                let ansText = "";
                if (q.opts && q.opts.length > 0) {
                    let idx = ['A', 'B', 'C', 'D'].indexOf(correctOpt);
                    ansText = (idx !== -1 && q.opts[idx]) ? q.opts[idx] : q.opts[0];
                } else if (q.optA || q.optB || q.optC || q.optD) {
                    if (correctOpt === 'A') ansText = q.optA;
                    else if (correctOpt === 'B') ansText = q.optB;
                    else if (correctOpt === 'C') ansText = q.optC;
                    else if (correctOpt === 'D') ansText = q.optD;
                }
                item.en = ansText || q.en || q.answer || q.a || "Đáp án";
                return item;
            });

            // 5. Gán dữ liệu chuẩn bị vào học
            window.questions = [...phanXaPool];
            window.px_custom_pool = [...phanXaPool]; 

            // 6. MỞ THẲNG MÀN HÌNH HỌC PHẢN XẠ
            if (typeof window.openPhanXaModule === 'function') {
                window.openPhanXaModule(); 
                
                setTimeout(() => {
                    if (typeof window.pxInitExercise === 'function') {
                        window.pxInitExercise(); 
                    }
                }, 200);
            }
        }
    }, lessonName);
};

// =========================================================================
// 🚀 GIAO DIỆN CHỌN CHẾ ĐỘ HỌC (THẺ BẤM ĐỒNG NHẤT - ĐÃ XÓA TÊN BÀI HỌC)
// =========================================================================
window.show_mode_modal = function(callback, lessonName = "") {
    let isStoryMode = (lessonName.toUpperCase().includes('[STORY]') || lessonName.toUpperCase().includes('[CASE]'));
    let isPhanXaMode = (lessonName.toUpperCase().includes('[ENGLISH]') || lessonName.toUpperCase().includes('[PHANXA]'));
    
    // Khóa scroll cả html và body
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    let modalId = 'mode_selector_modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex flex-column animate__animated animate__fadeInUp';
    overlay.style.cssText = 'background: #212529; z-index: 99999; overflow: hidden;';
    
    const closeModal = () => {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        overlay.classList.replace('animate__fadeInUp', 'animate__fadeOutDown');
        setTimeout(() => overlay.remove(), 250); 
    };

    // Hàm tạo thẻ (Card Button) chuẩn Super App
    const createModeCard = (id, icon, colorHex, colorRgb, title, desc, isRecommended) => {
        let badge = isRecommended 
            ? `<span class="badge text-dark ms-2 animate__animated animate__pulse animate__infinite" style="font-size: 0.6rem; background-color: #fbbf24; border: 1px solid #f59e0b; box-shadow: 0 0 10px rgba(245, 158, 11, 0.5); letter-spacing: 0.5px;"><i class="bi bi-star-fill text-danger me-1"></i>Đề Xuất</span>` 
            : '';
        
        let borderStyle = isRecommended 
            ? `border: 1px solid ${colorHex}; box-shadow: 0 0 15px rgba(${colorRgb}, 0.25);` 
            : `border: 1px solid rgba(${colorRgb}, 0.3);`;

        return `
        <button class="btn w-100 text-start d-flex align-items-center p-3 mb-3 mode-card-btn shadow-sm" id="${id}" style="border-radius: 16px; ${borderStyle} background: rgba(${colorRgb}, 0.1);">
            <div class="rounded-circle d-flex justify-content-center align-items-center flex-shrink-0" style="width: 48px; height: 48px; background: rgba(${colorRgb}, 0.2); color: ${colorHex};">
                <i class="bi ${icon} fs-4"></i>
            </div>
            <div class="ms-3 flex-grow-1">
                <div class="fw-bold text-white mb-1 d-flex align-items-center text-uppercase" style="font-size: 0.95rem; letter-spacing: 0.5px;">
                    ${title} ${badge}
                </div>
                <div class="text-white-50" style="font-size: 0.75rem; line-height: 1.4;">${desc}</div>
            </div>
            <i class="bi bi-chevron-right text-white-50 ms-1 fs-5 opacity-50"></i>
        </button>
        `;
    };

    overlay.innerHTML = `
        <style>
            @media (max-width: 767.98px) {
                .mobile-px-half { padding-left: 0.5px !important; padding-right: 0.5px !important; }
            }
            .mode-card-btn {
                transition: transform 0.15s ease, filter 0.15s ease;
            }
            .mode-card-btn:active {
                transform: scale(0.97);
                filter: brightness(1.2);
            }
        </style>

        <!-- HEADER ĐỒNG BỘ -->
        <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark flex-shrink-0" style="margin-left: -0.5px; margin-right: -0.5px;">
            <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" id="btn_close_mode">
                <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
            </button>
            <h6 class="fw-bold text-white mb-0 text-center flex-grow-1 text-truncate" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                CHỌN CHẾ ĐỘ HỌC
            </h6>
            <div style="width: 40px;" class="d-block d-md-none"></div>
            <div style="width: 85px;" class="d-none d-md-block"></div>
        </div>

        <!-- BODY CĂN GIỮA -->
        <div class="flex-grow-1 overflow-auto custom-scrollbar p-0 p-md-3" style="background: transparent;">
            <div class="mx-auto w-100 mobile-px-half px-3 mt-4 mb-5" style="max-width: 500px;">
                
                <div class="d-flex flex-column">
                    ${createModeCard('btn_mode_quiz', 'bi-ui-checks', '#38bdf8', '56, 189, 248', 'Làm Quiz', 'Kiểm tra trắc nghiệm tiêu chuẩn, có chấm điểm và tính thời gian.', false)}
                    
                    ${createModeCard('btn_mode_fc', 'bi-card-heading', '#c084fc', '192, 132, 252', 'Lật Thẻ', 'Ôn tập nhanh lý thuyết và từ vựng bằng thẻ ghi nhớ (Flashcard).', false)}
                    
                    ${createModeCard('btn_mode_game', 'bi-controller', '#4ade80', '74, 222, 128', 'Ghép Cặp', 'Trò chơi nối từ vựng, khái niệm với các định nghĩa tương ứng.', false)}
                    
                    ${createModeCard('btn_mode_story', 'bi-geo-alt-fill', '#2dd4bf', '45, 212, 191', 'Câu Chuyện', 'Học qua các tình huống nhập vai và giải quyết vấn đề thực tế.', isStoryMode)}
                    
                    ${createModeCard('btn_mode_phanxa', 'bi-mic-fill', '#60a5fa', '96, 165, 250', 'Luyện Phản Xạ', 'Nghe, đọc và luyện phản xạ trả lời câu hỏi ở tốc độ cao.', isPhanXaMode)}
                    
                    ${createModeCard('btn_mode_survival', 'bi-fire', '#f87171', '248, 113, 113', 'Sinh Tồn', 'Thử thách trả lời liên tiếp không sai, chạy đua với thanh sinh mệnh.', false)}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('btn_close_mode').onclick = closeModal;
    document.getElementById('btn_mode_quiz').onclick = () => { window.active_mode = 'quiz'; closeModal(); callback('quiz'); };
    document.getElementById('btn_mode_fc').onclick = () => { window.active_mode = 'flashcard'; closeModal(); callback('flashcard'); };
    document.getElementById('btn_mode_game').onclick = () => { window.active_mode = 'game'; closeModal(); callback('game'); };
    document.getElementById('btn_mode_story').onclick = () => { window.active_mode = 'story'; closeModal(); callback('story'); };
    document.getElementById('btn_mode_phanxa').onclick = () => { window.active_mode = 'phanxa'; closeModal(); callback('phanxa'); };
    document.getElementById('btn_mode_survival').onclick = () => { window.active_mode = 'survival'; closeModal(); callback('survival'); };
};

// =========================================================================
// 🔄 HÀM CHUYỂN ĐỔI CHẾ ĐỘ THÔNG MINH (BẢN VÁ LỖI XUNG ĐỘT DOM)
// =========================================================================
window.toggle_view_mode = function() {
    let isStoryLesson = false;
    let lessonName = "";
    
    // Nhận diện xem bài học hiện tại có phải là Story không
    if (window.current_story_data && window.current_story_data.length > 0) {
        lessonName = window.current_story_data[0].lessonname || window.current_story_data[0][10] || "";
        isStoryLesson = true; 
    } else if (window.questions && window.questions.length > 0) {
        lessonName = window.questions[0].lessonname || window.questions[0][10] || "";
        isStoryLesson = lessonName.toUpperCase().includes('[STORY]') || lessonName.toUpperCase().includes('[CASE]');
    }

    // Mảng xoay vòng chế độ
    let modes = isStoryLesson ? ['story', 'quiz', 'flashcard', 'game', 'survival', 'phanxa'] : ['quiz', 'flashcard', 'game', 'survival', 'phanxa'];
    
    // 🌟 CHÌA KHÓA GIẢI QUYẾT LỖI KẸT NÚT BẤM: 
    // Dùng biến bộ nhớ hệ thống (active_mode) thay vì quét giao diện DOM
    let currentMode = window.active_mode || 'quiz'; 
    
    // Phòng hờ nếu rớt vào khoảng không xác định
    if (!modes.includes(currentMode)) {
        currentMode = modes[0];
    }
    
    // Tính toán chế độ tiếp theo
    let nextIndex = (modes.indexOf(currentMode) + 1) % modes.length;
    let targetMode = modes[nextIndex];
    
    // Chuyển đổi an toàn
    if (window.current_subject && window.selected_lessons_text) {
         window.active_mode = targetMode; // 🌟 Đóng dấu trạng thái mới ngay lập tức
         
         let originalModal = window.show_mode_modal;
         window.show_mode_modal = function(callback) { callback(targetMode); };
         window.quick_start_lesson(window.current_subject, window.selected_lessons_text);
         window.show_mode_modal = originalModal; 
    } else {
         window.show_alert("Lỗi", "Không thể chuyển đổi, vui lòng quay lại menu chính!");
    }
};

window.toggle_q_card = function(idx) {
    let body = document.getElementById('q_body_' + idx);
    let icon = document.getElementById('q_icon_' + idx);
    if (body.style.display === 'none') {
        body.style.display = 'block';
        icon.className = 'bi bi-chevron-up text-info fs-5';
    } else {
        body.style.display = 'none';
        icon.className = 'bi bi-chevron-down text-white-50 fs-5';
    }
};



// =========================================================================
// 📝 ADMIN: TRA CỨU NHẬT KÝ ÔN TẬP TOÀN HỆ THỐNG TỪ SUPABASE
// =========================================================================
window.open_admin_history_modal = function() {
    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let inventoryCount = parseInt(localStorage.getItem(invKey)) || 0;
    let studentNameDisplay = window.current_student_name || window.current_student_id || "Admin";
    let rankMiniHtml = typeof window.get_user_rank_html === 'function' ? window.get_user_rank_html(true) : '👑';

    // Xóa cửa sổ popup cũ nếu có
    let oldModal = document.getElementById('admin_history_modal');
    if(oldModal) oldModal.remove();

    // Chèn thẳng vào container chính để đè màn hình
    const container = document.getElementById('dash_subject_cards_container');
    if(!container) return;

    let html = `
    <!-- HEADER TÀNG HÌNH CHUẨN ĐỒNG BỘ -->
    <div class="col-12 px-0 animate__animated animate__fadeIn sticky-top z-3 mb-0" style="top: 0;">
        <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark" style="margin-left: -0.5px; margin-right: -0.5px;">
            <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="window.render_admin_hub()">
                <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
            </button>
            <h6 class="text-white fw-bold mb-0 text-center flex-grow-1 text-truncate px-2 text-uppercase" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                NHẬT KÝ HỆ THỐNG
            </h6>
            <div class="d-flex align-items-center gap-2 flex-shrink-0">
                <span class="text-white-50 d-none d-sm-block fw-bold ms-2" style="font-size: 0.75rem;">${studentNameDisplay}</span>
                
                <!-- Ô Quà không nền, không viền -->
                <div class="d-flex align-items-center gap-1 stat-card-hover ms-1" title="Túi Đồ" style="cursor: pointer;" onclick="window.toggle_inventory_popover(event)">
                    <span style="font-size: 1.1rem;">🎁</span>
                    <span class="text-warning fw-bold" style="font-size: 0.85rem;" id="dashboard_inventory_count">${inventoryCount}</span>
                </div>
                <div style="transform: scale(0.85);">${rankMiniHtml}</div>
            </div>
        </div>
        
        <!-- THANH CÔNG CỤ TÌM KIẾM -->
        <div class="w-100 bg-dark p-2 border-bottom border-secondary d-flex gap-2 align-items-center" style="margin-left: -0.5px; margin-right: -0.5px;">
            <div class="position-relative flex-grow-1">
                <i class="bi bi-search position-absolute top-50 translate-middle-y text-white-50" style="left: 12px; font-size: 0.8rem;"></i>
                <input type="text" id="admin_search_history" class="form-control bg-secondary bg-opacity-10 text-white border-secondary ps-4 w-100" placeholder="Nhập Mã SV hoặc Bài học để lọc..." oninput="window.filter_admin_history(this.value)" style="font-size: 0.85rem; border-radius: 8px;">
            </div>
            <button class="btn btn-success fw-bold text-white shadow-sm px-3 flex-shrink-0" style="border-radius: 8px;" onclick="window.fetch_admin_history()"><i class="bi bi-arrow-clockwise"></i></button>
        </div>
    </div>
    
    <!-- DANH SÁCH LỊCH SỬ -->
    <div id="admin_history_list" class="w-100 p-2 custom-scrollbar" style="max-height: calc(100vh - 120px); overflow-y: auto;">
        <div class="text-center p-5"><span class="spinner-border text-success"></span><div class="text-success mt-2 small fw-bold">Đang tải nhật ký...</div></div>
    </div>`;
    
    container.innerHTML = html;
    window.fetch_admin_history();
};

window.fetch_admin_history = async function() {
    let container = document.getElementById('admin_history_list');
    if(!container) return;
    container.innerHTML = `<div class="text-center p-4"><span class="spinner-border text-success"></span><div class="text-success mt-2 small fw-bold">Đang tải nhật ký từ Supabase...</div></div>`;
    
    try {
        // 🌟 Kéo 200 lượt học mới nhất từ Database xuống (Dùng created_at mà thầy vừa thêm)
        const { data, error } = await db.from('study_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
            
        if (error) throw error;
        
        window.admin_full_history = data || [];
        window.render_admin_history_list(document.getElementById('admin_search_history').value);
    } catch(e) {
        container.innerHTML = `<div class="text-danger text-center p-4 fw-bold">Lỗi tải dữ liệu: ${e.message}</div>`;
    }
};

window.filter_admin_history = function(val) {
    window.render_admin_history_list(val);
};

window.render_admin_history_list = function(query) {
    let container = document.getElementById('admin_history_list');
    if(!container || !window.admin_full_history) return;

    let q = (query || "").toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    let filtered = window.admin_full_history.filter(item => {
        let matchStr = ((item.student_id||"") + " " + (item.subject_key||"") + " " + (item.lesson_name||"")).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return q === "" || matchStr.includes(q);
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center text-white-50 p-4 mt-3"><i class="bi bi-inbox fs-1 d-block mb-2"></i>Không tìm thấy lịch sử phù hợp.</div>`;
        return;
    }

    let html = '';
    filtered.forEach(item => {
        let d = new Date(item.created_at || item.logout_time);
        let timeStr = isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN');
        
        let score = parseFloat(item.score) || 0;
        let isPass = score >= 5;
        let subjName = window.subjectConfig && window.subjectConfig[item.subject_key] ? window.subjectConfig[item.subject_key].name : (item.subject_key || 'Khác');
        
        // Cảnh báo rời tab nếu có
        let cheatWarn = (item.offense_count > 0) ? `<span class="badge bg-danger shadow-sm ms-2" style="font-size: 0.6rem;"><i class="bi bi-exclamation-triangle-fill"></i> Rời Tab x${item.offense_count}</span>` : '';

        html += `
        <div class="p-2 mb-2 rounded shadow-sm d-flex justify-content-between align-items-center stat-card-hover" style="background: rgba(255,255,255,0.05); border-left: 3px solid ${isPass ? '#10b981' : '#ef4444'};">
            <div style="line-height: 1.4; flex-grow: 1; min-width: 0;">
                <div class="fw-bold text-warning d-flex align-items-center" style="font-size: 0.9rem;">
                    <i class="bi bi-person-badge me-1"></i>${item.student_id || 'Không rõ'} ${cheatWarn}
                </div>
                <div class="text-white-50 small text-truncate pe-2">
                    <i class="bi bi-book text-info me-1"></i>${subjName} - <b class="text-light">${item.lesson_name || ''}</b>
                </div>
                <div class="text-info" style="font-size: 0.7rem;"><i class="bi bi-clock me-1"></i>${timeStr}</div>
            </div>
            <div class="text-end flex-shrink-0">
                <div class="fw-bold ${isPass ? 'text-success' : 'text-danger'}" style="font-size: 1.25rem;">${score.toFixed(1)}đ</div>
                <div class="badge border border-secondary text-white-50" style="font-size: 0.65rem;">${item.mode || 'quiz'}</div>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
};
// ... Các hàm Admin Login ...

// TRẠM DỊCH: Đồng bộ cột Supabase sang định dạng của App cũ để hiển thị bình thường
window.map_supabase_questions = function(data) {
    if (!data || data.length === 0) return [];
    return data.map(q => ({
        id: q.old_uuid || q.id,
        lesson: q.lesson !== undefined && q.lesson !== null ? String(q.lesson).trim() : "1",
        type: q.type || 'single',
        level: q.level || 1,
        q: q.q || q.question_text || "",
        opta: q.opt_a || "", optb: q.opt_b || "", optc: q.opt_c || "", optd: q.opt_d || "",
        opts: [q.opt_a || "", q.opt_b || "", q.opt_c || "", q.opt_d || ""],
        answer: q.answer || "", a: q.answer || "",
        hint: q.hint || "", lessonname: q.lessonname || "",
        image: q.multimedia || "", nav: q.navigation || ""
    }));
};

window.admin_login_process = async function(key) {
    if (window.current_user_role === 'all' || window.current_user_role === 'admin' || window.check_subj_perm(key, 'edit')) {
        window.current_subject = key; 
        
        // Bọc túi khí an toàn: Kiểm tra DOM trước khi thao tác
        let step1 = document.getElementById('step_1'); 
        if(step1) step1.style.display = 'none'; 
        
        let adminDash = document.getElementById('admin_dashboard'); 
        if(adminDash) adminDash.style.display = 'block';
        
        const tbody = document.getElementById('lesson_config_body');
        
        if (!window.full_data[key] || window.full_data[key].length === 0) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="13" class="text-center p-4">Đang tải ngân hàng câu hỏi Supabase...</td></tr>`;
            try {
                const { data, error } = await window.fetch_all_questions(key);
                if (!error && data && data.length > 0) {
                    window.full_data[key] = window.map_supabase_questions(data); 
                    
                    // Nếu có Ma trận Bloom thì hiển thị, không thì tự chuyển sang Danh sách bài học
                    if (tbody) window.render_bloom_matrix_standard();
                    else if (typeof window.show_edit_lesson_list === 'function') window.show_edit_lesson_list(key);
                    
                } else { 
                    if (tbody) tbody.innerHTML = `<tr><td colspan="13" class="text-center text-danger">Ngân hàng rỗng!</td></tr>`; 
                    else if (typeof window.show_edit_lesson_list === 'function') window.show_edit_lesson_list(key);
                }
            } catch(err) { 
                if (tbody) tbody.innerHTML = `<tr><td colspan="13" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>`; 
                else window.show_toast("Lỗi tải dữ liệu: " + err.message, true);
            }
        } else { 
            if (tbody) window.render_bloom_matrix_standard(); 
            else if (typeof window.show_edit_lesson_list === 'function') window.show_edit_lesson_list(key);
        }
    } else { 
        window.show_alert("Cảnh báo bảo mật", "Thầy không có quyền Quản trị viên để mở phần này!", false); 
    }
};


window.close_bloom_dashboard = function() { document.getElementById('admin_dashboard').style.display = 'none'; document.getElementById('step_1').style.display = 'block'; }

// =========================================================================
// 🚀 ADMIN: FORM CỬA NGÕ TẠO PHÒNG THI MỚI (CHỌN MÔN TRƯỚC KHI VÀO MA TRẬN)
// =========================================================================
window.open_exam_modal = function() {
    let modalId = 'create_exam_selector_modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    // Tự động quét danh sách môn học từ hệ thống của thầy
    let subjectOptions = '';
    if (window.subjectConfig) {
        Object.keys(window.subjectConfig).forEach(key => {
            let name = window.subjectConfig[key].name || window.subjectNames[key] || key;
            subjectOptions += `<option value="${key}">${name}</option>`;
        });
    }

    let html = `
    <style>
        @media (max-width: 767.98px) {
            .mobile-px-half { padding-left: 0.5px !important; padding-right: 0.5px !important; }
        }
        .unified-input {
            padding: 10px 15px !important;
            border-radius: 12px !important;
            font-size: 0.95rem !important;
            height: 48px !important;
            line-height: 1.5 !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important;
            background: #1a1d20 !important;
            border: 1px solid #2b3035 !important;
            color: #fff !important;
        }
        .unified-input:focus { border-color: #0ea5e9 !important; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15) !important; outline: none; }
    </style>

    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column animate__animated animate__fadeInUp" style="background: #212529; z-index: 99999; overflow: hidden;">
        
        <!-- HEADER ĐỒNG BỘ NATIVE APP (Có lề -0.5px chuẩn xác) -->
        <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark flex-shrink-0" style="margin-left: -0.5px; margin-right: -0.5px;">
            <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="document.getElementById('${modalId}').remove()">
                <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
            </button>
            <h6 class="fw-bold text-white mb-0 text-center flex-grow-1 text-truncate" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                KHỞI TẠO PHÒNG THI
            </h6>
            <div style="width: 40px;" class="d-block d-md-none"></div>
            <div style="width: 85px;" class="d-none d-md-block"></div>
        </div>

        <!-- BODY CĂN GIỮA MÀN HÌNH -->
        <div class="flex-grow-1 overflow-auto d-flex flex-column justify-content-center p-0 p-md-3" style="background: transparent;">
            <div class="mx-auto w-100 mobile-px-half px-3" style="max-width: 450px; margin-top: -10vh;">
                <div class="text-center mb-4">
                    <i class="bi bi-layers text-info mb-3" style="font-size: 3.5rem; filter: drop-shadow(0 0 10px rgba(14,165,233,0.3));"></i>
                    <h5 class="fw-bold text-white">CHỌN MÔN HỌC</h5>
                    <p class="text-white-50 small mt-2">Xác định môn học để hệ thống tải kho câu hỏi và khởi tạo Ma trận Bloom tương ứng.</p>
                </div>
                
                <div class="mb-4">
                    <label class="text-white-50 small fw-bold px-1 mb-1 text-uppercase">Danh mục môn học <span class="text-danger">*</span></label>
                    <select id="create_exam_subject_select" class="form-select unified-input fw-bold text-info shadow-sm" style="cursor: pointer;">
                        <option value="">-- Bấm để chọn môn học --</option>
                        ${subjectOptions}
                    </select>
                </div>
            </div>
        </div>

        <!-- FOOTER NÚT TRÀN VIỀN -->
        <div class="border-top border-secondary bg-transparent flex-shrink-0 d-flex w-100 mt-auto">
            <button class="btn fw-bold py-3 flex-grow-1 text-danger bg-transparent border-0 border-end border-secondary" style="border-radius: 0;" onclick="document.getElementById('${modalId}').remove()">
                <i class="bi bi-x-lg fs-5 me-1"></i> HỦY BỎ
            </button>
            <button class="btn fw-bold py-3 flex-grow-1 text-info bg-transparent border-0" style="border-radius: 0;" onclick="window.continue_create_exam()">
                TIẾP TỤC <i class="bi bi-arrow-right-circle-fill fs-5 ms-1"></i>
            </button>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
};

// Hàm chuyển tiếp từ cửa ngõ sang Ma trận tạo đề
window.continue_create_exam = function() {
    let subj = document.getElementById('create_exam_subject_select').value;
    if (!subj) {
        if(typeof window.show_toast === 'function') window.show_toast("⚠️ Vui lòng chọn một môn học!", true);
        else alert("Vui lòng chọn một môn học!");
        return;
    }
    
    // Đóng giao diện cổng
    document.getElementById('create_exam_selector_modal').remove();
    
    // Khởi chạy hàm ma trận gốc của thầy
    if (typeof window.admin_login_process === 'function') {
        window.admin_login_process(subj);
    } else {
        console.error("Không tìm thấy hàm admin_login_process");
    }
};

window.render_bloom_matrix_standard = function() {
    const tbody = document.getElementById('lesson_config_body'); 
    if (!tbody) return;
    
    // 🌟 BƠM CSS ẨN MŨI TÊN TĂNG/GIẢM VÀ ẨN HOÀN TOÀN THANH TRƯỢT (SCROLLBAR TÀNG HÌNH)
    if (!document.getElementById('hide_spinner_css')) {
        let style = document.createElement('style');
        style.id = 'hide_spinner_css';
        style.innerHTML = `
            /* Ẩn mũi tên ô số */
            .bloom-input::-webkit-outer-spin-button,
            .bloom-input::-webkit-inner-spin-button,
            #exam_time_input::-webkit-outer-spin-button,
            #exam_time_input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            .bloom-input[type=number], #exam_time_input[type=number] { -moz-appearance: textfield; }
            .bloom-input:focus { background: #343a40 !important; outline: none; border-color: #0ea5e9 !important; box-shadow: 0 0 10px rgba(14, 165, 233, 0.4); }
            
            /* 🌟 TỐI ƯU MỚI: ẨN THANH TRƯỢT TÀNG HÌNH (Đòi lại 15px chiều ngang) */
            #lesson_config_body::-webkit-scrollbar,
            .card-body::-webkit-scrollbar { display: none !important; }
            #lesson_config_body, .card-body { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        `;
        document.head.appendChild(style);
    }

    // 🌟 Ép ô Thời gian tự động bôi đen khi click vào
    let timeInput = document.getElementById('exam_time_input');
    if (timeInput && !timeInput.hasAttribute('onfocus')) {
        timeInput.setAttribute('onfocus', 'this.select()');
    }

    let data_source = window.full_data[window.current_subject] || [];
    
    const lessons = [...new Set(data_source.map(q => q.lesson))]
                    .filter(l => l !== undefined && l !== null && l !== "")
                    .sort((a, b) => parseInt(a) - parseInt(b));
    
    let html = '';
    
    lessons.forEach(l => {
        const lesson_qs = data_source.filter(q => String(q.lesson) === String(l));
        
        const c = (targetType, targetLevel) => { 
            return lesson_qs.filter(q => { 
                let qType = q.type ? String(q.type).toLowerCase().trim() : 'single';
                if (qType === 'quiz' || qType === 'mcq' || qType === '') qType = 'single';
                if (qType === 'tf' || qType === 'đúng sai') qType = 'true_false';
                if (['hotspot', 'clip', 'clip_listen', 'arrange', 'sắp xếp'].includes(qType)) qType = 'media';
                if (qType !== targetType) return false; 
                
                let qLevel = q.level ? String(q.level).trim() : "1"; 
                if (qLevel === "null" || qLevel === "undefined" || qLevel === "0" || qLevel === "") qLevel = "1";
                return qLevel === String(targetLevel); 
            }).length; 
        };

        const buildInput = (type, level) => {
            let max = c(type, level);
            let disabled = max === 0 ? 'disabled' : '';
            let opacity = max === 0 ? 'opacity: 0.2;' : 'opacity: 1;';
            return `
            <div class="d-flex flex-column align-items-center" style="${opacity}">
                <label class="text-white-50 mb-0" style="font-size: 0.65rem; font-weight: bold; line-height: 1;">L${level}</label>
                <input type="number" class="bloom-input form-control p-1 text-center fw-bold mt-1"
                       style="width: 40px; height: 30px; font-size: 0.85rem; background: #2b3035; color: #fff; border: 1px solid #495057; border-radius: 6px; transition: 0.2s;"
                       placeholder="${max}" min="0" max="${max}"
                       data-lesson="${l}" data-type="${type}" data-level="${level}"
                       onfocus="this.select()" 
                       oninput="window.update_bloom_count()" ${disabled}>
            </div>`;
        };

        const buildTypeRow = (type, label, icon, color) => {
            let totalForType = c(type, 1) + c(type, 2) + c(type, 3) + c(type, 4);
            if (totalForType === 0) return ''; 

            // 🌟 TỐI ƯU 2: Đổi p-2 thành px-1 py-1, giảm độ hở để giãn ngang hết mức
            return `
            <div class="d-flex justify-content-between align-items-center px-1 py-1 rounded mb-1 shadow-sm w-100" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">
                <div class="d-flex align-items-center" style="width: 70px;">
                    <i class="${icon} me-1" style="color: ${color}; font-size: 0.85rem;"></i>
                    <span class="fw-bold" style="color: ${color}; font-size: 0.65rem; letter-spacing: 0px;">${label}</span>
                </div>
                <div class="d-flex gap-1 justify-content-end flex-grow-1">
                    ${buildInput(type, 1)}
                    ${buildInput(type, 2)}
                    ${buildInput(type, 3)}
                    ${buildInput(type, 4)}
                </div>
            </div>`;
        };

        let rowHtml = `
        <div class="col-12 col-xl-6 mb-2 animate__animated animate__fadeInUp" style="padding: 0 0.5px !important;">
            <div class="card h-100 shadow-sm" style="background: #121416; border: 1px solid #2b3035; border-radius: 8px; overflow: hidden;">
                <div class="p-2 border-bottom d-flex justify-content-between align-items-center" style="background: #1a1d20; border-color: #2b3035 !important;">
                    <span class="badge bg-dark border border-secondary text-info fw-bold" style="font-size: 0.8rem;"><i class="bi bi-journal-bookmark-fill me-1"></i>BÀI ${l}</span>
                    <span class="badge text-white-50" style="background: rgba(255,255,255,0.1); font-size: 0.7rem;">Kho: ${lesson_qs.length} câu</span>
                </div>
                <!-- 🌟 TỐI ƯU 3: Bỏ lớp đệm p-2, thay bằng p-1 để các khối màu xám phình ra chạm viền -->
                <div class="p-1 pb-0">
                    ${buildTypeRow('single', 'MCQ', 'bi-list-ul', '#38bdf8')}
                    ${buildTypeRow('true_false', 'ĐÚNG/SAI', 'bi-check2-circle', '#4ade80')}
                    ${buildTypeRow('fill', 'Đ.KHUYẾT', 'bi-input-cursor-text', '#fb923c')}
                    ${buildTypeRow('media', 'MEDIA', 'bi-play-btn', '#c084fc')}
                </div>
            </div>
        </div>`;

        html += rowHtml;
    });

    tbody.innerHTML = `<div class="row m-0 w-100" style="padding: 0 !important;">${html}</div>`;
};

window.update_bloom_count = function() {
    let total = 0, single = 0, tf = 0, fill = 0, media = 0;
    document.querySelectorAll('.bloom-input').forEach(input => {
        let val = parseInt(input.value) || 0; let max = parseInt(input.placeholder) || 0;
        if (val > max) { input.value = max; val = max; }
        total += val;
        const type = input.getAttribute('data-type');
        if (type === 'single') single += val; 
        else if (type === 'true_false') tf += val; 
        else if (type === 'fill') fill += val;
        else if (type === 'media') media += val;
    });
    document.getElementById('total_selected_count').innerText = total;
    document.getElementById('count_single').innerText = single;
    document.getElementById('count_true_false').innerText = tf;
    document.getElementById('count_fill').innerText = fill;
    let countMediaEl = document.getElementById('count_media');
    if (countMediaEl) countMediaEl.innerText = media;
};

window.close_bloom_dashboard = function() { document.getElementById('admin_dashboard').style.display = 'none'; document.getElementById('step_1').style.display = 'block'; }

window.process_create_exam = function() {
    let data_source = window.full_data[window.current_subject] || []; let exam_list = [];
    data_source.forEach((q, index) => { if (!q.id) q.id = index + 1; });
    
    document.querySelectorAll('.bloom-input').forEach(input => {
        let val = parseInt(input.value) || 0;
        if (val > 0) {
            const l = input.getAttribute('data-lesson'); const type = input.getAttribute('data-type'); const level = input.getAttribute('data-level');
            let pool = data_source.filter(q => {
                if (String(q.lesson) !== String(l)) return false;
                
                let qType = q.type ? String(q.type).toLowerCase().trim() : 'single';
                if (qType === 'quiz' || qType === 'mcq' || qType === '') qType = 'single';
                if (qType === 'tf' || qType === 'đúng sai') qType = 'true_false';
                if (['hotspot', 'clip', 'clip_listen', 'arrange', 'sắp xếp'].includes(qType)) qType = 'media';
                
                if (qType !== type) return false;

                let qLevel = q.level ? String(q.level).trim() : "1";
                if (qLevel === "null" || qLevel === "undefined" || qLevel === "0" || qLevel === "") qLevel = "1";
                
                return qLevel === String(level);
            });
            if (pool.length > 0) { let shuffled = pool.sort(() => 0.5 - Math.random()); exam_list.push(...shuffled.slice(0, val)); }
        }
    });

    if (exam_list.length === 0) return window.show_alert("Thông báo", "Vui lòng chọn số câu hỏi!", false);

    window.questions = exam_list.sort((a, b) => { 
        const order = { 'single': 1, 'true_false': 2, 'fill': 3, 'hotspot': 4, 'clip': 5, 'clip_listen': 5, 'arrange': 6, 'sắp xếp': 6 }; 
        return (order[a.type] || 99) - (order[b.type] || 99); 
    });
    window.questions.forEach(q => { q.done = false; q.ans_user = (q.type === 'fill') ? [] : ""; });

    document.getElementById('admin_dashboard').style.display = 'none';
    document.getElementById('step_3').style.display = 'block';
    
    let qHeader = document.querySelector('#step_3 .fixed-top');
    if(qHeader) qHeader.style.display = 'block';
    let quizArea = document.getElementById('quiz_area');
    if(quizArea && quizArea.parentElement) quizArea.parentElement.style.marginTop = '85px';
    
    quizArea.style.display = 'block';
    document.getElementById('submit_btn').style.display = 'block';

    let time_input = document.getElementById('exam_time_input');
    window.time_left = ((time_input && time_input.value) ? parseInt(time_input.value) : window.questions.length) * 60;
    window.is_exam_started = true; window.is_bloom_mode = true; window.start_time = new Date(); window.is_flashcard_mode = false;
    if(typeof window.render_quiz === 'function') window.render_quiz(); 
    if(typeof window.start_countdown === 'function') window.start_countdown();
    window.current_exam_questions = JSON.parse(JSON.stringify(window.questions));
    window.current_subject_key = window.current_subject;
    
    let adminExport = document.getElementById('admin_export_section');
    if(adminExport) adminExport.style.display = 'block';
};

window.prepare_online_exam = function() {
    let data_source = window.full_data[window.current_subject] || []; 
    let exam_list = [];
    data_source.forEach((q, index) => { if (!q.id) q.id = index + 1; });
    
    document.querySelectorAll('.bloom-input').forEach(input => {
        let val = parseInt(input.value) || 0;
        if (val > 0) {
            const l = input.getAttribute('data-lesson'); 
            const type = input.getAttribute('data-type'); 
            const level = input.getAttribute('data-level');
            let pool = data_source.filter(q => {
                if (String(q.lesson) !== String(l)) return false;
                
                let qType = q.type ? String(q.type).toLowerCase().trim() : 'single';
                if (qType === 'quiz' || qType === 'mcq' || qType === '') qType = 'single';
                if (qType === 'tf' || qType === 'đúng sai') qType = 'true_false';
                if (['hotspot', 'clip', 'clip_listen', 'arrange', 'sắp xếp'].includes(qType)) qType = 'media';
                
                if (qType !== type) return false;

                let qLevel = q.level ? String(q.level).trim() : "1";
                if (qLevel === "null" || qLevel === "undefined" || qLevel === "0" || qLevel === "") qLevel = "1";
                
                return qLevel === String(level);
            });
            if (pool.length > 0) { 
                let shuffled = pool.sort(() => 0.5 - Math.random()); 
                exam_list.push(...shuffled.slice(0, val)); 
            }
        }
    });

    if (exam_list.length === 0) return window.show_alert("Thông báo", "⚠️ Thầy vui lòng nhập số lượng câu hỏi vào ma trận trước khi Lưu đề!", false);
    
    window.temp_online_exam_questions = exam_list.sort((a, b) => { 
        const order = { 'single': 1, 'true_false': 2, 'fill': 3, 'hotspot': 4, 'clip': 5, 'clip_listen': 5, 'arrange': 6, 'sắp xếp': 6 }; 
        return (order[a.type] || 99) - (order[b.type] || 99); 
    });
    
    let time_input = document.getElementById('exam_time_input');
    let defaultTime = time_input && time_input.value ? parseInt(time_input.value) : exam_list.length;
    
    window.show_toast("⏳ Đang chuẩn bị dữ liệu Rà soát...");
    
    window.fetch_available_classes().then(function(classes) {
        window.available_classes = classes;
        
        if (typeof window.show_exam_review_modal === 'function') {
            window.show_exam_review_modal(window.temp_online_exam_questions, function(finalSelectedQuestions) {
                window.temp_online_exam_questions = finalSelectedQuestions; 
                window.show_online_exam_modal(defaultTime);
            });
        } else {
            window.show_online_exam_modal(defaultTime);
        }
    });
};

window.show_edit_lesson_list = function(subKey) {
    window.current_subject = subKey;
    let quizArea = document.getElementById('quiz_area');
    if (!quizArea) return;

    quizArea.style.height = 'auto'; quizArea.style.display = 'block'; quizArea.style.overscrollBehavior = 'auto';
    if(document.getElementById('step_1')) document.getElementById('step_1').style.display = 'none';
    if(document.getElementById('step_3')) document.getElementById('step_3').style.display = 'block';

    let qHeader = document.querySelector('#step_3 .fixed-top');
    if(qHeader) qHeader.style.display = 'none';
    if(quizArea.parentElement) quizArea.parentElement.style.marginTop = '15px';

    let uniqueLessons = [];
    if (window.full_data[subKey]) {
        let lessonsMap = {};
        window.full_data[subKey].forEach(q => {
            if (q && q.lesson) {
                let L = String(q.lesson).trim();
                if (!lessonsMap[L]) { lessonsMap[L] = true; uniqueLessons.push(L); }
            }
        });
    }

    let displayName = subjectConfig[subKey]?.name || subjectNames[subKey] || subKey.toUpperCase();
    let html = `
    <div class="p-3 glass-panel m-2 animate__animated animate__fadeIn">
        <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2" style="border-color: #2a2a2a !important;">
            <h5 class="text-info fw-bold mb-0"><i class="bi bi-folder2-open me-2"></i> Chọn bài để sửa: <span class="text-warning">${displayName}</span></h5>
            <button class="btn btn-sm btn-outline-light rounded-pill px-3 shadow-sm" onclick="location.reload();"><i class="bi bi-x-circle"></i> Thoát</button>
        </div>
        <div class="list-group rounded-3 shadow-sm mb-3">
            ${uniqueLessons.length > 0 ? uniqueLessons.map(lessonId => `
                <div class="list-group-item d-flex justify-content-between align-items-center p-3" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
                    <span class="fw-bold text-white fs-6"><i class="bi bi-book text-info me-2"></i> Bài ${lessonId}</span>
                    <button class="btn btn-sm btn-warning rounded-pill px-4 fw-bold shadow-sm" onclick="window.open_admin_lesson_panel('${subKey}', '${lessonId}')"><i class="bi bi-pencil-square me-1"></i> Sửa câu hỏi</button>
                </div>
            `).join('') : '<div class="p-3 text-center text-white-50">Chưa có dữ liệu bài học nào.</div>'}
        </div>
    </div>`;
    quizArea.innerHTML = html;
};

// =========================================================================
// 1. CẬP NHẬT LẠI GIAO DIỆN QUẢN TRỊ (ĐÃ KHẮC PHỤC LỖI SYNTAX)
// =========================================================================
window.render_admin_panel = function() {
    let quizArea = document.getElementById('quiz_area');
    if (!quizArea) return;
    
    let total = questions.length;
    let countTN = questions.filter(q => q.type === 'single' || q.type === 'mcq' || !q.type).length;
    let countTF = questions.filter(q => q.type === 'tf' || q.type === 'true_false' || q.type === 'đúng sai').length;
    let countFill = questions.filter(q => q.type === 'fill' || q.type === 'điền khuyết').length;
    let lessonName = (questions.length > 0 && questions[0].lessonname) ? questions[0].lessonname : (window.lessonNames[window.current_subject]?.[window.selected_lessons_text] || "");
    let lessonNameDisplay = lessonName ? ` - ${lessonName}` : "";

    // 1. VẼ KHÚC HEADER VÀ CÁC NÚT BẤM
    let html = `
    <div class="p-1 m-1 animate__animated animate__fadeIn" style="max-width: 100%; overflow-x: hidden;">
        
        <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom" style="border-color: #2a2a2a !important;">
            <button class="btn btn-sm btn-light border-0 rounded-pill px-3 text-dark shadow-sm fw-bold glass-action-btn" style="font-size:0.75rem;" onclick="back_to_subject_select()">
                <i class="bi bi-arrow-left me-1"></i> Đóng
            </button>
            <div class="text-center mx-1">
                <div class="fw-bold text-white text-truncate" style="font-size: 0.95rem; max-width: 220px; text-transform: uppercase; text-shadow: 0 0 8px rgba(255,255,255,0.3);">
                    BÀI ${window.selected_lessons_text}${lessonNameDisplay}
                </div>
                <div class="text-white-50" style="font-size: 0.7rem; font-weight: bold; margin-top:2px;">
                    Tổng: ${total} (TN:${countTN} | ĐS:${countTF} | ĐK:${countFill})
                </div>
            </div>
            <div style="width: 70px;"></div> 
        </div>

        <div class="row g-2 mb-3 mt-2">
            <div class="col-6">
                <button class="btn glass-btn-submit w-100 d-flex justify-content-center align-items-center py-2 shadow-sm text-uppercase" onclick="open_import_by_type_modal()" style="font-size: 0.8rem; height: 100%;">
                    <i class="bi bi-layers-half text-info me-2 fs-5"></i> THEO LOẠI CÂU
                </button>
            </div>
            <div class="col-6">
                <button class="btn glass-btn-submit w-100 d-flex justify-content-center align-items-center py-2 shadow-sm text-uppercase" onclick="open_bulk_import_modal()" style="background: rgba(14, 165, 233, 0.15) !important; border-color: rgba(14, 165, 233, 0.4) !important; font-size: 0.8rem; height: 100%;">
                    <i class="bi bi-lightning-charge-fill text-warning me-2 fs-5" style="text-shadow: 0 0 8px rgba(255,193,7,0.5);"></i> THEO EXCEL
                </button>
            </div>
            
            <div class="col-6">
                <button class="btn glass-btn-submit w-100 d-flex flex-column justify-content-center align-items-center py-2 shadow-sm text-uppercase fw-bold mt-1 h-100" 
                        onclick="window.open_interaction_selector()" 
                        style="background: rgba(239, 68, 68, 0.15) !important; border-color: rgba(239, 68, 68, 0.4) !important; color: #ef4444 !important; font-size: 0.75rem; letter-spacing: 0.5px;">
                    <i class="bi bi-camera-reels text-danger mb-1 fs-4"></i> TẠO TƯƠNG TÁC
                </button>
            </div>
            
            <div class="col-6">
                <button class="btn glass-btn-submit w-100 d-flex flex-column justify-content-center align-items-center py-2 shadow-sm text-uppercase fw-bold mt-1 h-100" onclick="open_trainable_parser_modal()" style="background: rgba(34, 197, 94, 0.15) !important; border-color: rgba(34, 197, 94, 0.4) !important; color: #4ade80 !important; font-size: 0.75rem; letter-spacing: 0.5px;">
                    <i class="bi bi-robot text-success mb-1 fs-4"></i> DẠY BÓC TÁCH
                </button>
            </div>
            <div class="col-6">
                <button class="btn glass-btn-submit w-100 d-flex flex-column justify-content-center align-items-center py-2 shadow-sm text-uppercase fw-bold mt-1 h-100" onclick="open_story_import_modal(window.selected_lessons_text)" style="background: rgba(245, 158, 11, 0.15) !important; border-color: rgba(245, 158, 11, 0.4) !important; color: #fbbf24 !important; font-size: 0.75rem; letter-spacing: 0.5px;">
                    <i class="bi bi-bezier2 text-warning mb-1 fs-4"></i> NHẬP STORY
                </button>
            </div>
        </div>
        
        <div id="admin_table_container" style="max-height: 72vh; overflow-y: auto; padding-right:4px; scroll-behavior: smooth;">`;

    // 2. VẼ TỪNG CÂU HỎI (Tách riêng để tránh lỗi nháy kép)
    let qsHtml = questions.map((q, idx) => {
        let typeDisplay = (q.type === 'tf' || q.type === 'true_false' || q.type === 'đúng sai') ? 'Đúng/Sai' : ((q.type === 'fill' || q.type === 'điền khuyết') ? 'Điền khuyết' : ((q.type === 'hotspot') ? 'Hotspot' : ((q.type === 'clip') ? 'Clip' : 'Trắc nghiệm')));
        let typeColor = (q.type === 'hotspot' || q.type === 'clip') ? 'color:#ef4444; border-color:rgba(239,68,68,0.5); background:rgba(239,68,68,0.2);' : 'color:#38bdf8; border-color:rgba(14,165,233,0.5); background:rgba(14,165,233,0.3);';
        
        let safeQText = q.q || "(Câu hỏi chưa có nội dung)";
        let shortText = safeQText.length > 55 ? safeQText.substring(0, 55) + "..." : safeQText;
        let isExpanded = (idx === window.last_edited_q_idx);
        let displayStyle = isExpanded ? 'block' : 'none';
        let chevronIcon = isExpanded ? 'bi-chevron-up text-info' : 'bi-chevron-down text-white-50';

        let optsHtml = '';
        if (q.type === 'single' || q.type === 'mcq' || !q.type) {
            let optA = q.opta || (q.opts && q.opts[0] ? q.opts[0] : '');
            let optB = q.optb || (q.opts && q.opts[1] ? q.opts[1] : '');
            let optC = q.optc || (q.opts && q.opts[2] ? q.opts[2] : '');
            let optD = q.optd || (q.opts && q.opts[3] ? q.opts[3] : '');
            optsHtml = `
            <div class="mb-3 p-2 rounded border" style="background: rgba(0,0,0,0.25); border-color: #2a2a2a !important; font-size: 0.85rem; color: rgba(255,255,255,0.9);">
                <div class="mb-1"><strong class="text-white">A.</strong> ${optA}</div>
                <div class="mb-1"><strong class="text-white">B.</strong> ${optB}</div>
                <div class="mb-1"><strong class="text-white">C.</strong> ${optC}</div>
                <div class=""><strong class="text-white">D.</strong> ${optD}</div>
            </div>`;
        }

        let mediaHtml = q.image ? `<div class="text-info mt-1 text-truncate" style="font-size:0.75rem;"><i class="bi bi-image"></i> Media ID: ${q.image}</div>` : '';
        let hintHtml = q.hint ? `<div class="text-success mt-1 text-break" style="font-size:0.75rem;"><i class="bi bi-lightbulb"></i> Giải thích: ${q.hint}</div>` : '';

        return `
        <div class="q-admin-item-card" id="admin_row_${idx}">
            <div class="q-card-header" onclick="toggle_q_card(${idx})">
                <div class="d-flex align-items-center overflow-hidden w-100">
                    <span class="badge bg-light text-dark me-2 border" style="font-size:0.7rem; min-width: 40px; padding: 4px 6px;">#${idx + 1}</span>
                    <span class="badge me-2" style="${typeColor} font-size:0.65rem; min-width: 75px;">${typeDisplay}</span>
                    <span class="text-white fw-bold text-truncate flex-grow-1 pe-2" style="font-size:0.85rem;">${shortText}</span>
                </div>
                <i id="q_icon_${idx}" class="bi ${chevronIcon} fs-5"></i>
            </div>

            <div id="q_body_${idx}" class="q-card-body" style="display: ${displayStyle};">
                <div class="mb-3" style="font-size: 0.9rem; line-height: 1.5; color: #fff;">
                    <div class="text-info fw-bold mb-1" style="font-size: 0.75rem; text-transform: uppercase;">Nội dung câu hỏi:</div>
                    <div class="text-break">${safeQText}</div>
                </div>
                
                ${optsHtml}
                
                <div class="p-2 rounded" style="background: rgba(0,0,0,0.15); border-left: 3px solid #0ea5e9; font-size: 0.85rem;">
                    <div class="text-warning fw-bold text-break mb-1">🎯 Đáp án: <span class="text-white">${q.answer || q.a || ''}</span></div>
                    ${mediaHtml}
                    ${hintHtml}
                </div>

                <div class="d-flex justify-content-end gap-2 border-top pt-3 mt-3" style="border-color: #2a2a2a !important;">
                    <button class="btn glass-action-btn delete" onclick="delete_question_direct(${idx})">
                        <i class="bi bi-trash3 me-1"></i> Xóa
                    </button>
                    <button class="btn glass-action-btn edit" onclick="open_question_modal(${idx})">
                        <i class="bi bi-pencil-square me-1"></i> Sửa câu này
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    html += qsHtml;

    // 3. VẼ KHÚC ĐUÔI
    if (questions.length === 0) {
        html += `
        <div class="text-center p-5 mt-4 glass-panel" style="border-radius: 16px;">
            <i class="bi bi-inbox text-white-50" style="font-size: 3rem;"></i>
            <div class="text-white-50 mt-2 fw-bold">Chưa có câu hỏi nào.</div>
            <div class="text-white-50 small">Hãy bấm NHẬP ĐỂ THÊM CÂU HỎI!</div>
        </div>`;
    }

    html += `</div></div>`;
    
    quizArea.innerHTML = html;
    
    if (window.MathJax) { 
        setTimeout(function() {
            MathJax.typesetPromise([quizArea]).catch(function (err) {
                console.log('MathJax error: ', err.message);
            });
        }, 50); 
    }
};

window.refresh_subject_data = async function(subjectKey, iconEl) {
    iconEl.classList.add("animate__animated", "animate__rotateIn", "animate__infinite");
    try {
        const { data, error } = await window.fetch_all_questions(subjectKey);
        if (!error && data) {
            window.full_data[subjectKey] = window.map_supabase_questions(data);
            let badge = document.getElementById(`stats_badge_${subjectKey}`); if(badge) badge.innerText = data.length + " câu";
        }
        window.show_toast("Đã cập nhật dữ liệu mới nhất môn: " + subjectKey.toUpperCase());
        iconEl.classList.remove("animate__animated", "animate__rotateIn", "animate__infinite");
        let mapArea = document.getElementById(`map_area_${subjectKey}`);
        if (mapArea && mapArea.style.display === 'block') { window.draw_lesson_buttons(subjectKey, window.subjectConfig[subjectKey]?.name || subjectKey, window.full_data[subjectKey]); }
    } catch(e) { window.show_toast("Lỗi tải lại dữ liệu!", true); iconEl.classList.remove("animate__animated", "animate__rotateIn", "animate__infinite"); }
};

// =========================================================================
// 📂 PHẦN 7: DANH MỤC MÔN HỌC (HIỂN THỊ BÌA SÁCH VÀ ĐẾM CÂU HỎI TRỰC TIẾP)
// =========================================================================
window.render_subject_management = function() {
    const container = document.getElementById('dash_subject_cards_container');
    if (!container) return;
    
    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let inventoryCount = parseInt(localStorage.getItem(invKey)) || 0;
    let studentNameDisplay = window.current_student_name || window.current_student_id || "Admin";
    let rankMiniHtml = typeof window.get_user_rank_html === 'function' ? window.get_user_rank_html(true) : '👑';
    
    let html = `
    <style>
        .student-subj-group { cursor: pointer; border: 1px solid rgba(255,255,255,0.05); background: #212529; border-radius: 12px; transition: 0.2s; }
        .student-subj-group:hover { border-color: rgba(255,255,255,0.1); background: #2b3035; }
        
        .student-subj-card { background: #121416; border: 1px solid #2b3035; border-radius: 16px; transition: 0.3s; cursor: default; display: flex; flex-direction: column; padding: 20px; height: 100%; box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
        .student-subj-card:hover { border-color: #0ea5e9; transform: translateY(-4px); background: #1e293b; box-shadow: 0 8px 25px rgba(14, 165, 233, 0.2); }
        
        .subj-card-header { display: flex; align-items: flex-start; gap: 15px; margin-bottom: 12px; }
        .subj-icon-box { width: 60px; height: 80px; border-radius: 8px; background: #1a1d20; border: 1px solid #343a40; display: flex; align-items: center; justify-content: center; font-size: 2rem; flex-shrink: 0; box-shadow: 2px 4px 10px rgba(0,0,0,0.3); overflow: hidden; transition: 0.3s; }
        .student-subj-card:hover .subj-icon-box { transform: scale(1.05) rotate(2deg); box-shadow: 4px 6px 15px rgba(0,0,0,0.4); border-color: #0ea5e9; }
        
        .subj-info-box { flex-grow: 1; min-width: 0; }
        .subj-title { font-size: 1rem; font-weight: 700; color: #f8fafc; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .subj-desc { font-size: 0.75rem; color: #94a3b8; line-height: 1.5; }
        
        .subj-stats-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px; }
        .subj-stat-badge { font-size: 0.7rem; font-weight: 600; padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,0.05); color: #cbd5e1; display: flex; align-items: center; gap: 4px; border: 1px solid rgba(255,255,255,0.05); }
        
        @media (max-width: 767.98px) {
            #dash_subject_cards_container { padding: 0 !important; }
            #dash_subject_cards_container .row { margin: 0 !important; }
            .col-12.px-1 { padding-left: 0.5px !important; padding-right: 0.5px !important; }
        }
    </style>
    
    <div class="row w-100 m-0 g-3">
        <!-- HEADER TÀNG HÌNH CHUẨN 1 NỀN (ĐÃ ĐƯỢC ĐƯA VÀO TRONG ROW ĐỂ ÉP SÁT LÊN ĐỈNH) -->
        <div class="col-12 px-0 animate__animated animate__fadeIn sticky-top z-3 mb-0 mb-md-3" style="top: 0;">
            <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark" style="margin-left: -0.5px; margin-right: -0.5px;">
                <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="window.render_admin_hub()">
                    <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
                </button>
                <h6 class="text-white fw-bold mb-0 text-center flex-grow-1 text-truncate px-2 text-uppercase" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                    DANH MỤC MÔN
                </h6>
                <div class="d-flex align-items-center gap-2 flex-shrink-0">
                    <button class="btn btn-sm btn-info fw-bold py-1 px-2 d-none d-sm-inline-block" style="border-radius: 6px;" onclick="window.open_subject_modal()">+ Tạo mới</button>
                    <span class="text-white-50 d-none d-sm-block fw-bold ms-2" style="font-size: 0.75rem;">${studentNameDisplay}</span>
                    
                    <!-- Ô Quà không nền, không viền -->
                    <div class="d-flex align-items-center gap-1 stat-card-hover ms-1" title="Túi Đồ" style="cursor: pointer;" onclick="window.toggle_inventory_popover(event)">
                        <span style="font-size: 1.1rem;">🎁</span>
                        <span class="text-warning fw-bold" style="font-size: 0.85rem;" id="dashboard_inventory_count">${inventoryCount}</span>
                    </div>
                    <div style="transform: scale(0.85);">${rankMiniHtml}</div>
                </div>
            </div>
            
            <!-- Nút Tạo Mới Trên Mobile (Tạo khoảng hở và bo góc) -->
            <div class="d-block d-sm-none w-100 p-2" style="background: transparent;">
                <button class="btn btn-sm btn-info fw-bold w-100 shadow-sm" style="border-radius: 8px; padding: 10px 0;" onclick="window.open_subject_modal()">
                    <i class="bi bi-plus-lg me-1"></i> TẠO MÔN MỚI
                </button>
            </div>
        </div>`;

    let groups = {};
    Object.keys(subjectConfig).forEach(key => {
        let c = subjectConfig[key];
        let r = c.role || c.quyen || c['Quyền'] || c[3] || 'Chưa phân nhóm';
        if (!groups[r]) groups[r] = [];
        groups[r].push({ key: key, ...c });
    });

    let delay = 0;
    Object.keys(groups).forEach((groupName, gIndex) => {
        let subjects = groups[groupName];
        let groupId = 'subj_mng_group_' + gIndex;
        
        const subjectOrder = { 'toan': 1, 'van': 2, 'tienganh': 3, 'khtn': 4, 'congnghe': 5, 'tinhoc': 6, 'lichsu': 7, 'dialy': 8, 'gdcd': 9 };
        subjects.sort((a, b) => {
            let rankA = subjectOrder[a.key] || 999;
            let rankB = subjectOrder[b.key] || 999;
            if (rankA !== rankB) return rankA - rankB;
            return a.key.localeCompare(b.key);
        });

        html += `
        <div class="col-12 px-0 animate__animated animate__fadeInUp" style="animation-delay: ${delay}s;">
            <!-- THANH HIỂN THỊ NHÓM (MÀU NỀN ĐỒNG BỘ, KHÔNG VIỀN XANH) -->
            <div class="student-subj-group p-3 mb-2 d-flex justify-content-between align-items-center shadow-sm" 
                 onclick="let el = document.getElementById('${groupId}'); el.classList.toggle('d-none'); let icon = document.getElementById('icon_${groupId}'); if(el.classList.contains('d-none')){icon.classList.replace('bi-chevron-up', 'bi-chevron-down')}else{icon.classList.replace('bi-chevron-down', 'bi-chevron-up')}">
                <div class="d-flex align-items-center">
                    <i class="bi bi-folder-fill text-white-50 fs-4 me-3"></i>
                    <h6 class="fw-bold text-white mb-0 text-uppercase" style="letter-spacing: 0.5px; font-size:1rem;">${groupName}</h6>
                </div>
                <i id="icon_${groupId}" class="bi bi-chevron-down text-white-50 fs-5"></i>
            </div>
            
            <div id="${groupId}" class="d-none w-100">
                <div class="row m-0 g-3 mt-1 mb-4">`;
        
        subjects.forEach((c, sIndex) => {
            let safeRole = String(c.role || c.quyen || c['Quyền'] || c[3] || 'all').trim();
            let safeName = String(c.name || c['Tên hiển thị'] || c[5] || c.key || 'Chưa có tên').trim();
            let safeUI = String(c.ui_template || c['Mẫu Giao Diện'] || c[6] || '1').trim();
            let uiText = safeUI === "2" ? "Chuyên sâu (2)" : safeUI === "3" ? "Thực hành (3)" : "Mặc định (1)";

            let safeIcon = String(c.icon || c['Icon'] || c[4] || '📚').trim();
            let displayIconHtml = "";
            if (safeIcon.startsWith('http') || safeIcon.startsWith('data:image')) {
                displayIconHtml = `<img src="${safeIcon}" style="width: 100%; height: 100%; object-fit: cover;" alt="Bìa sách">`;
            } else {
                displayIconHtml = safeIcon;
            }

            html += `
                <div class="col-12 col-md-6 px-1 animate__animated animate__fadeInUp" style="animation-delay: ${sIndex * 0.03}s;">
                    <div class="student-subj-card">
                        
                        <div class="subj-card-header">
                            <div class="subj-icon-box">${displayIconHtml}</div>
                            <div class="subj-info-box">
                                <div class="subj-title">${safeName}</div>
                                <div class="subj-desc">
                                    <div class="text-truncate mb-1">Giao diện: <span class="text-light fw-bold">${uiText}</span></div>
                                    
                                    <div class="d-flex flex-wrap gap-1 mt-2 align-items-center">
                                        <span class="subj-stat-badge fw-bold px-2 py-1" id="admin_stats_badge_${c.key}" style="border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.1); color: #10b981;"><i class="bi bi-database"></i> Đang đếm...</span>
                                        <span id="admin_stats_details_${c.key}" class="d-flex flex-wrap gap-1"></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="subj-stats-bar justify-content-between align-items-center w-100">
                            <div class="d-flex gap-2">
                                <span class="subj-stat-badge" title="Nhóm được truy cập"><i class="bi bi-shield-lock text-warning"></i> Role: ${safeRole}</span>
                            </div>
                            <div class="d-flex gap-2 align-items-center">
                                <button class="btn btn-sm btn-outline-warning fw-bold border-0 px-3 rounded-pill d-flex align-items-center" onclick="window.open_subject_modal('${c.key}')" style="background: rgba(245, 158, 11, 0.1);">
                                    <i class="bi bi-pencil-square me-1"></i> Sửa
                                </button>
                                <button class="btn btn-sm btn-outline-danger fw-bold border-0 px-3 rounded-pill d-flex align-items-center" onclick="window.remove_subject('${c.key}')" style="background: rgba(239, 68, 68, 0.1);">
                                    <i class="bi bi-trash3 me-1"></i> Xóa
                                </button>
                            </div>
                        </div>
                        
                    </div>
                </div>`;
        });
        html += `       </div>
                </div>
        </div>`;
        delay += 0.05;
    });
    
    html += `</div>`;
    container.innerHTML = html;
    
    // ĐẾM SỐ CÂU HỎI TỪ SUPABASE
    setTimeout(() => {
        Object.keys(subjectConfig).forEach(async (key) => {
            let badge = document.getElementById('admin_stats_badge_' + key);
            let details = document.getElementById('admin_stats_details_' + key);
            if (!badge) return;

            const renderDetails = (dataArr) => {
                let single = 0, tf = 0, fill = 0, media = 0;
                dataArr.forEach(q => {
                    let t = String(q.type || 'single').toLowerCase().trim();
                    if (t === 'quiz' || t === 'mcq' || t === '') single++;
                    else if (t === 'tf' || t === 'true_false' || t === 'đúng sai') tf++;
                    else if (t === 'fill' || t === 'short' || t === 'điền khuyết') fill++;
                    else if (['hotspot', 'clip', 'clip_listen', 'arrange', 'sắp xếp'].includes(t)) media++;
                    else single++;
                });
                
                let h = '';
                if(single > 0) h += `<span class="badge bg-info text-dark shadow-sm" style="font-size:0.65rem;">MCQ: ${single}</span>`;
                if(tf > 0) h += `<span class="badge bg-success shadow-sm" style="font-size:0.65rem;">Đ/S: ${tf}</span>`;
                if(fill > 0) h += `<span class="badge bg-warning text-dark shadow-sm" style="font-size:0.65rem;">Đ/K: ${fill}</span>`;
                if(media > 0) h += `<span class="badge shadow-sm" style="background:#c084fc; color:#fff; font-size:0.65rem;">Media: ${media}</span>`;
                
                if(details) details.innerHTML = h;
                return dataArr.length;
            };
            
            if (window.full_data && window.full_data[key]) {
                let total = renderDetails(window.full_data[key]);
                badge.innerHTML = `<i class="bi bi-database text-warning"></i> ${total} câu`;
            } else {
                try {
                    const clientDb = typeof db !== 'undefined' ? db : window._supabase;
                    const { data, error } = await clientDb.from('questions').select('type').eq('subject_key', key);
                    if (!error && data) {
                        let total = renderDetails(data);
                        badge.innerHTML = `<i class="bi bi-database text-warning"></i> ${total} câu`;
                    } else {
                        badge.innerHTML = `<i class="bi bi-database text-warning"></i> 0 câu`;
                    }
                } catch(e) {
                    badge.innerHTML = `<i class="bi bi-database text-warning"></i> Lỗi`;
                }
            }
        });
    }, 300);
};

// =========================================================================
// 🚀 GIAO DIỆN SỬA / TẠO MÔN HỌC (FULL-SCREEN TRÀN VIỀN 0.5PX)
// =========================================================================
window.open_subject_modal = function(subjectKey = '') {
    let c = subjectKey ? subjectConfig[subjectKey] : {};
    if (!c) c = {};

    let code = subjectKey;
    
    // Tương thích ngược: Lấy ID và Sheet name (Nếu hệ thống thầy vẫn dùng để backup)
    let fileId = c.id || c.fileId || c.file_id || c['ID File'] || '';
    let sheetName = c.sheetName || c.sheet || c.sheet_name || c['Tên Sheet'] || '';
    
    let role = c.role || c.quyen || c['Quyền'] || 'all';
    let icon = c.icon || c['Icon'] || '';
    let name = c.name || c.ten_hien_thi || c['Tên hiển thị'] || '';
    let ui_template = c.ui_template || c.mau_giao_dien || c['Mẫu Giao Diện'] || '1';

    let modalId = 'subject_modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    let modalHtml = `
    <style>
        @media (max-width: 767.98px) {
            .mobile-px-half { padding-left: 0.5px !important; padding-right: 0.5px !important; }
            .mobile-margin-0 { margin-left: 0 !important; margin-right: 0 !important; }
        }
        .unified-input {
            padding: 10px 15px !important;
            border-radius: 12px !important;
            font-size: 0.95rem !important;
            height: 48px !important;
            line-height: 1.5 !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important;
            background: #1a1d20 !important;
            border: 1px solid #2b3035 !important;
            color: #fff !important;
        }
        .unified-input:focus { border-color: #0ea5e9 !important; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15) !important; outline: none; }
        .dark-label { font-size: 0.75rem; font-weight: 700; color: #adb5bd; margin-bottom: 4px; letter-spacing: 0.5px; }
    </style>

    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column animate__animated animate__fadeInUp" style="background: #212529; z-index: 99999; overflow: hidden;">
        
        <!-- HEADER ĐỒNG BỘ NATIVE APP -->
        <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark flex-shrink-0" style="margin-left: -0.5px; margin-right: -0.5px;">
            <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="document.getElementById('${modalId}').remove()">
                <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
            </button>
            <h6 class="fw-bold text-white mb-0 text-center flex-grow-1 text-truncate" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                ${code ? 'CẬP NHẬT MÔN HỌC' : 'TẠO MÔN MỚI'}
            </h6>
            <div style="width: 40px;" class="d-block d-md-none"></div>
            <div style="width: 85px;" class="d-none d-md-block"></div>
        </div>

        <!-- BODY TRƯỢT TỰ DO VỚI MÉP 0.5PX MOBILE -->
        <div class="flex-grow-1 overflow-auto custom-scrollbar p-0 p-md-3" style="background: transparent;">
            <div class="mx-auto mobile-px-half mt-2 mt-md-0" style="max-width: 800px;">
                
                <div class="row g-2 mb-3 mobile-margin-0">
                    <div class="col-4">
                        <label class="dark-label px-1">Mã môn <span class="text-danger">*</span></label>
                        <input type="text" id="modal_s_code" class="form-control unified-input text-center fw-bold font-monospace" value="${code}" ${code ? 'readonly style="opacity:0.6; cursor:not-allowed;"' : 'placeholder="vd: toan9"'}>
                    </div>
                    <div class="col-8">
                        <label class="dark-label px-1">Tên hiển thị <span class="text-danger">*</span></label>
                        <input type="text" id="modal_s_name" class="form-control unified-input fw-bold text-info" value="${name}" placeholder="VD: Toán lớp 9">
                    </div>
                </div>

                <!-- 🌟 TÍCH HỢP NÚT UPLOAD ẢNH & ĐỔI ICON (BỌC KHỐI) -->
                <div class="row g-2 mb-4 mobile-margin-0">
                    <div class="col-12">
                        <div class="p-3 rounded-4 shadow-sm border border-secondary" style="background: rgba(0,0,0,0.15);">
                            <label class="dark-label text-info mb-2"><i class="bi bi-image me-1"></i> ẢNH BÌA SÁCH / ICON EMOJI</label>
                            <div class="d-flex gap-2">
                                <input type="text" id="modal_s_icon" class="form-control unified-input flex-grow-1" value="${icon}" placeholder="Dán link ảnh (Drive/Web) hoặc nhập Emoji 📚..." onblur="window.handle_icon_input_change(this)">
                                <label class="btn fw-bold p-0 m-0 d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm" style="width: 48px; height: 48px; border-radius: 12px; cursor: pointer; background: linear-gradient(135deg, #0ea5e9, #3b82f6); color: white;" title="Tải ảnh từ máy tính">
                                    <i class="bi bi-cloud-arrow-up-fill fs-5"></i>
                                    <input type="file" class="d-none" accept="image/*" onchange="window.upload_subject_cover(this)">
                                </label>
                            </div>
                            <div class="text-white-50 mt-2 px-1" style="font-size: 0.75rem;"><i class="bi bi-info-circle text-info me-1"></i>Mẹo: Dán link Google Drive chia sẻ, hệ thống sẽ tự động tối ưu.</div>
                        </div>
                    </div>
                </div>

                <div class="row g-2 mb-4 mobile-margin-0">
                    <div class="col-12">
                        <label class="dark-label px-1">Nhóm phân quyền (vd: k12, medical, all)</label>
                        <input type="text" id="modal_s_role" class="form-control unified-input" value="${role}" placeholder="Mặc định: all">
                    </div>
                </div>

                <!-- MẪU GIAO DIỆN -->
                <div class="row g-2 mb-4 mobile-margin-0">
                    <div class="col-12">
                        <div class="p-3 rounded-4 shadow-sm border border-secondary" style="background: rgba(0,0,0,0.15);">
                            <label class="dark-label text-warning mb-2"><i class="bi bi-palette me-1"></i> MẪU GIAO DIỆN (UI)</label>
                            <div class="d-flex gap-2 w-100 mt-1">
                                <input type="radio" class="btn-check" name="ui_template_opt" id="ui_opt_1" value="1" ${ui_template === '1' ? 'checked' : ''}>
                                <label class="btn btn-outline-info flex-grow-1 py-2 fw-bold" for="ui_opt_1" style="border-radius: 12px; font-size: 0.75rem;">MẶC ĐỊNH</label>
                                
                                <input type="radio" class="btn-check" name="ui_template_opt" id="ui_opt_2" value="2" ${ui_template === '2' ? 'checked' : ''}>
                                <label class="btn btn-outline-success flex-grow-1 py-2 fw-bold" for="ui_opt_2" style="border-radius: 12px; font-size: 0.75rem;">CHUYÊN SÂU</label>
                                
                                <input type="radio" class="btn-check" name="ui_template_opt" id="ui_opt_3" value="3" ${ui_template === '3' ? 'checked' : ''}>
                                <label class="btn btn-outline-warning flex-grow-1 py-2 fw-bold" for="ui_opt_3" style="border-radius: 12px; font-size: 0.75rem;">THỰC HÀNH</label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- KHU VỰC THÔNG TIN BACKUP GOOGLE SHEETS (Gấp gọn) -->
                <div class="row g-2 mb-4 mobile-margin-0">
                    <div class="col-12">
                        <details class="p-3 rounded-4 shadow-sm border border-secondary" style="background: rgba(0,0,0,0.15);">
                            <summary class="text-white-50 small fw-bold" style="cursor: pointer; font-size: 0.75rem; list-style: none;"><i class="bi bi-database me-1 text-danger"></i> Nâng cao: Khóa liên kết Google Sheets (Tùy chọn)</summary>
                            <div class="mt-3">
                                <label class="dark-label px-1">ID File Google Sheets</label>
                                <input type="text" id="modal_s_fileid" class="form-control unified-input text-warning font-monospace mb-2" value="${fileId}" placeholder="Nhập ID file...">
                                
                                <label class="dark-label px-1 mt-2">Tên Sheet</label>
                                <input type="text" id="modal_s_sheetname" class="form-control unified-input text-success font-monospace" value="${sheetName}" placeholder="vd: Trang tính 1">
                            </div>
                        </details>
                    </div>
                </div>

            </div>
        </div>

        <!-- FOOTER NÚT TRÀN VIỀN XUỐNG ĐÁY -->
        <div class="border-top border-secondary bg-transparent flex-shrink-0 d-flex w-100 mt-auto" style="margin-left: -0.5px; margin-right: -0.5px;">
            <button class="btn fw-bold py-3 flex-grow-1 text-danger bg-transparent border-0 border-end border-secondary" style="border-radius: 0;" onclick="document.getElementById('${modalId}').remove()">
                <i class="bi bi-x-lg fs-5 me-1"></i> HỦY BỎ
            </button>
            <button class="btn fw-bold py-3 flex-grow-1 text-info bg-transparent border-0" style="border-radius: 0;" onclick="window.save_subject_to_sheet(this)">
                <i class="bi bi-save2-fill fs-5 me-1"></i> LƯU MÔN HỌC
            </button>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};
// =========================================================================
// 🚀 ENGINE XỬ LÝ ẢNH BÌA SÁCH: TỰ ĐỘNG CHUYỂN LINK & UPLOAD LÊN SUPABASE
// =========================================================================

// Tự động chuyển đổi link Google Drive khi Thầy dán vào và bấm ra ngoài (blur)
window.handle_icon_input_change = function(el) {
    let val = el.value.trim();
    
    // Nếu là link Google Drive dạng xem (view) -> Chuyển thành link ảnh trực tiếp
    if (val.includes('drive.google.com/file/d/')) {
        let match = val.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            el.value = `https://drive.google.com/uc?export=view&id=${match[1]}`;
            if(typeof window.show_toast === 'function') window.show_toast("🪄 Đã tự động tối ưu Link Google Drive!");
        }
    }
    
    if (val.includes('onedrive.live.com') || val.includes('1drv.ms')) {
        if(typeof window.show_toast === 'function') window.show_toast("⚠️ Lưu ý: Link OneDrive có thể không hiển thị được do Microsoft chặn nhúng!", true);
    }
};

// Tải ảnh từ máy tính/điện thoại thẳng lên Supabase
window.upload_subject_cover = async function(input) {
    if (!input.files || !input.files[0]) return;
    let file = input.files[0];
    
    // Kiểm tra dung lượng (giới hạn 5MB cho ảnh bìa)
    if (file.size > 5 * 1024 * 1024) {
        if(typeof window.show_toast === 'function') window.show_toast("⚠️ Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.", true);
        input.value = ""; return;
    }

    let iconInput = document.getElementById('modal_s_icon');
    let originalPlaceholder = iconInput.placeholder;
    
    iconInput.value = "⏳ Đang tải ảnh lên máy chủ...";
    iconInput.disabled = true;

    try {
        let ext = file.name.split('.').pop();
        let safeSubjectCode = document.getElementById('modal_s_code').value.trim() || 'new';
        let fileName = `cover_${safeSubjectCode}_${Date.now()}.${ext}`;
        
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        
        // Đẩy lên kho 'media' của Supabase
        const { data, error } = await clientDb.storage.from('media').upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });
        
        if (error) throw error;
        
        let publicUrl = clientDb.storage.from('media').getPublicUrl(fileName).data.publicUrl;
        
        iconInput.value = publicUrl;
        if(typeof window.show_toast === 'function') window.show_toast("✅ Tải ảnh bìa thành công!");
        
    } catch (err) {
        if(typeof window.show_toast === 'function') window.show_toast("❌ Lỗi tải ảnh: " + err.message, true);
        iconInput.value = "";
    } finally {
        iconInput.disabled = false;
        iconInput.placeholder = originalPlaceholder;
        input.value = ""; 
    }
};

// =========================================================================
// 👥 PHẦN 8: QUẢN TRỊ THEO LỚP & NGƯỜI DÙNG (CLASS-BASED MANAGEMENT)
// =========================================================================

window.render_user_management = async function() {
    const container = document.getElementById('dash_subject_cards_container');
    container.innerHTML = `<div class="col-12 text-center p-5"><div class="spinner-border text-success"></div><div class="mt-2 text-white-50">Đang tải dữ liệu lớp học...</div></div>`;
    
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        const [{ data: classes, error: errC }, { data: users, error: errU }] = await Promise.all([
            clientDb.from('classes').select('*').order('class_code', { ascending: true }),
            clientDb.from('users').select('student_id, password, full_name, role, permissions, inventory, class_code')
        ]);
        if (errC) throw errC;
        if (errU) throw errU;

        let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
        let inventoryCount = parseInt(localStorage.getItem(invKey)) || 0;
        let rankMiniHtml = typeof window.get_user_rank_html === 'function' ? window.get_user_rank_html(true) : '👑';
        let studentNameDisplay = window.current_student_name || window.current_student_id || "Admin";

        let html = `
        <style>
            .class-header-card { background: #212529; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; transition: 0.2s; cursor: pointer; }
            .class-header-card:hover { background: #2b3035; border-color: rgba(255,255,255,0.1); }
            
            .user-card-premium { background: #121416; border: 1px solid #2b3035; border-radius: 16px; transition: 0.3s; padding: 16px; display: flex; flex-direction: column; height: 100%; box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
            .user-card-premium:hover { border-color: #0ea5e9; transform: translateY(-4px); background: #1e293b; box-shadow: 0 8px 25px rgba(14, 165, 233, 0.2); }
            
            .user-avatar-box { width: 45px; height: 45px; border-radius: 12px; background: #1a1d20; border: 1px solid #343a40; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; box-shadow: inset 0 2px 5px rgba(0,0,0,0.3); color: #cbd5e1; }
            
            /* BO TRÒN 12PX CHO KHUNG TÌM KIẾM */
            .user-search-bar { background: #1a1d20; border: 1px solid #2b3035; border-radius: 12px; color: #fff; padding: 10px 15px 10px 35px; font-size: 0.85rem; transition: 0.2s; }
            .user-search-bar:focus { border-color: #10b981; outline: none; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15); }

            @media (max-width: 767.98px) {
                #dash_subject_cards_container { padding: 0 !important; }
                #dash_subject_cards_container .row { margin: 0 !important; }
                .user-card-wrapper { padding-left: 0.5px !important; padding-right: 0.5px !important; }
            }
        </style>

        <div class="row w-100 m-0 g-3">
            <!-- HEADER TÀNG HÌNH CHUẨN 1 NỀN -->
            <div class="col-12 px-0 animate__animated animate__fadeIn sticky-top z-3 mb-0 mb-md-3" style="top: 0;">
                <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark" style="margin-left: -0.5px; margin-right: -0.5px;">
                    <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="window.render_admin_hub()">
                        <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
                    </button>
                    <h6 class="text-white fw-bold mb-0 text-center flex-grow-1 text-truncate px-2 text-uppercase" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                        Q.LÝ NGƯỜI DÙNG
                    </h6>
                    <div class="d-flex align-items-center gap-2 flex-shrink-0">
                        <span class="text-white-50 d-none d-sm-block fw-bold ms-2" style="font-size: 0.75rem;">${studentNameDisplay}</span>
                        <!-- Ô Quà không nền, không viền -->
                        <div class="d-flex align-items-center gap-1 stat-card-hover ms-1" title="Túi Đồ" style="cursor: pointer;" onclick="window.toggle_inventory_popover(event)">
                            <span style="font-size: 1.1rem;">🎁</span>
                            <span class="text-warning fw-bold" style="font-size: 0.85rem;" id="dashboard_inventory_count">${inventoryCount}</span>
                        </div>
                        <div style="transform: scale(0.85);">${rankMiniHtml}</div>
                    </div>
                </div>
                
                <!-- THANH TÌM KIẾM VÀ CÔNG CỤ (Đã tách rời hoàn toàn khỏi Header, bo tròn 12px) -->
                <div class="w-100 p-2 mt-2 d-flex flex-column flex-sm-row gap-2 justify-content-between align-items-center" style="background: transparent;">
                    <div class="position-relative w-100 flex-grow-1">
                        <i class="bi bi-search position-absolute top-50 translate-middle-y text-white-50" style="left: 12px; font-size: 0.9rem;"></i>
                        <input type="text" class="form-control user-search-bar w-100 shadow-sm" placeholder="Tìm tên, mã SV, lớp..." oninput="window.filter_user_management(this.value)" autocomplete="off">
                    </div>
                    <div class="d-flex gap-2 w-100 w-sm-auto flex-shrink-0">
                        <button class="btn fw-bold shadow-sm text-dark flex-grow-1 flex-sm-grow-0 d-flex justify-content-center align-items-center" style="background: #10b981; border-radius: 12px; padding: 10px 16px;" onclick="window.open_create_class_modal()">
                            <i class="bi bi-file-earmark-excel-fill me-1"></i> <span class="d-none d-sm-inline">EXCEL</span>
                        </button>
                        <button class="btn btn-info fw-bold shadow-sm text-dark flex-grow-1 flex-sm-grow-0 d-flex justify-content-center align-items-center" style="border-radius: 12px; padding: 10px 16px;" onclick="window.open_data_manager('tab_user')">
                            <i class="bi bi-person-plus-fill me-1"></i> <span class="d-none d-sm-inline">TẠO MỚI</span>
                        </button>
                    </div>
                </div>
            </div>`;

        let delay = 0;
        let usersWithoutClass = [];
        let admins = [];

        let classGroups = {};
        classes.forEach(c => classGroups[c.class_code] = { info: c, users: [] });

        users.forEach(u => {
            if (u.role === 'admin' || u.role === 'all') admins.push(u);
            else if (u.class_code && classGroups[u.class_code]) classGroups[u.class_code].users.push(u);
            else usersWithoutClass.push(u);
        });

        const renderUserCard = (u) => {
            let uid = u.student_id; let pwd = u.password; let role = u.role; let fname = u.full_name || 'Chưa cập nhật'; let perms = u.permissions || ''; let cCode = u.class_code || '';
            let isSuper = (role === 'all' || role === 'admin');
            let searchStr = `${fname.toLowerCase()} ${uid.toLowerCase()} ${cCode.toLowerCase()} ${role.toLowerCase()}`;
            
            return `
            <div class="col-12 col-md-6 px-1 mb-2 user-card-wrapper animate__animated animate__fadeInUp" data-search="${searchStr}">
                <div class="user-card-premium" style="border-left: 3px solid ${isSuper ? '#ef4444' : '#0ea5e9'};">
                    <div class="d-flex align-items-start gap-3 mb-3">
                        <div class="user-avatar-box fw-bold text-white shadow-inner">${fname.charAt(0).toUpperCase()}</div>
                        <div class="flex-grow-1" style="min-width: 0;">
                            <div class="fw-bold text-white mb-1 text-truncate" style="font-size: 0.95rem;">${fname}</div>
                            <div class="text-white-50" style="font-size: 0.75rem; line-height: 1.5;">
                                <div class="text-truncate">ID: <span class="text-info fw-bold font-monospace">${uid}</span></div>
                                <div class="text-truncate">Pass: <span class="text-light fw-bold">${pwd}</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex justify-content-end gap-2 mt-auto pt-2 border-top border-secondary border-opacity-25">
                        <button class="btn btn-sm btn-outline-warning p-1 px-3 border-0 rounded-pill fw-bold d-flex align-items-center" onclick="window.open_data_manager('tab_user', '${uid}', '${pwd}', '${role}', '${fname}', '${perms}', '${cCode}')" style="background: rgba(245, 158, 11, 0.1);"><i class="bi bi-pencil-square me-1"></i> Sửa</button>
                        <button class="btn btn-sm btn-outline-danger p-1 px-3 border-0 rounded-pill fw-bold d-flex align-items-center" onclick="window.remove_user('${uid}')" style="background: rgba(239, 68, 68, 0.1);"><i class="bi bi-trash3 me-1"></i> Xóa</button>
                    </div>
                </div>
            </div>`;
        };

        Object.keys(classGroups).forEach((classCode, gIndex) => {
            let cls = classGroups[classCode];
            let groupId = 'class_mng_group_' + gIndex;
            let currentName = cls.info.class_name || ''; 
            
            html += `
            <div class="col-12 px-0 mb-3 class-group-wrapper">
                <!-- THANH NHÓM ĐỒNG BỘ MÀU TỐI GIẢN -->
                <div class="class-header-card p-3 d-flex flex-wrap justify-content-between align-items-center shadow-sm gap-2" onclick="document.getElementById('${groupId}').classList.toggle('d-none');">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-journal-bookmark-fill text-white-50 fs-4 me-3"></i>
                        <div>
                            <h6 class="fw-bold text-white mb-0 text-uppercase" style="letter-spacing: 0.5px; font-size: 0.95rem;">LỚP ${classCode}</h6>
                            <div class="text-white-50" style="font-size:0.75rem;">${currentName} | <span class="text-info">${cls.users.length} tài khoản</span></div>
                        </div>
                    </div>
                    
                    <div class="d-flex align-items-center gap-1 gap-md-2 flex-wrap">
                        <button class="btn btn-sm border-0 text-warning fw-bold rounded-pill px-2 px-md-3" style="background: rgba(245, 158, 11, 0.15);" onclick="event.stopPropagation(); window.open_edit_class_modal('${classCode}', '${currentName.replace(/'/g, "\\'")}')" title="Sửa tên lớp">
                            <i class="bi bi-pencil-square"></i> <span class="d-none d-md-inline ms-1">ĐỔI TÊN</span>
                        </button>
                        <button class="btn btn-sm border-0 text-success fw-bold rounded-pill px-2 px-md-3" style="background: rgba(16, 185, 129, 0.15);" onclick="event.stopPropagation(); window.export_class_scores_excel('${classCode}')" title="Xuất bảng điểm Excel">
                            <i class="bi bi-file-earmark-excel-fill"></i> <span class="d-none d-md-inline ms-1">XUẤT ĐIỂM</span>
                        </button>
                        <button class="btn btn-sm border-0 text-danger fw-bold rounded-pill px-2 px-md-3" style="background: rgba(239, 68, 68, 0.1);" onclick="event.stopPropagation(); window.remove_class('${classCode}')" title="Xóa lớp học này">
                            <i class="bi bi-trash3-fill"></i> <span class="d-none d-md-inline ms-1">XÓA LỚP</span>
                        </button>
                    </div>
                </div>
                
                <div id="${groupId}" class="d-none class-collapse-body w-100 mt-2">
                    <div class="row m-0">
                        ${cls.users.map(u => renderUserCard(u)).join('')}
                        ${cls.users.length === 0 ? '<div class="text-white-50 small mb-2 px-2">Lớp này chưa có sinh viên nào.</div>' : ''}
                    </div>
                </div>
            </div>`;
            delay += 0.05;
        });

        const renderExtraGroup = (title, list, icon, color, gid) => {
            if(list.length === 0) return '';
            html += `
            <div class="col-12 px-0 mb-3 class-group-wrapper">
                <div class="class-header-card p-3 d-flex justify-content-between align-items-center shadow-sm" style="border-left: 3px solid var(--bs-${color});" onclick="document.getElementById('${gid}').classList.toggle('d-none');">
                    <div class="d-flex align-items-center">
                        <i class="${icon} text-${color} fs-4 me-3"></i>
                        <div><h6 class="fw-bold text-white mb-0 text-uppercase" style="font-size: 0.95rem;">${title}</h6><div class="text-${color} small">${list.length} tài khoản</div></div>
                    </div>
                    <i class="bi bi-chevron-down text-white-50 fs-5"></i>
                </div>
                <div id="${gid}" class="d-none class-collapse-body w-100 mt-2">
                    <div class="row m-0">${list.map(u => renderUserCard(u)).join('')}</div>
                </div>
            </div>`;
        };

        renderExtraGroup('QUẢN TRỊ VIÊN (ADMIN)', admins, 'bi-shield-lock-fill', 'danger', 'group_admins');
        renderExtraGroup('SINH VIÊN TỰ DO (CHƯA CÓ LỚP)', usersWithoutClass, 'bi-person-lines-fill', 'warning', 'group_free_users');

        html += `</div>`;
        container.innerHTML = html;
        
    } catch(err) { 
        container.innerHTML = `<div class="col-12 text-center p-5 text-danger">Lỗi tải dữ liệu: ${err.message}</div>`; 
    }
};

// 🌟 BỘ LỌC TÌM KIẾM NHANH (LIVE SEARCH)
window.filter_user_management = function(keyword) {
    let kw = keyword.toLowerCase().trim();
    
    // 1. Quét tìm tất cả các thẻ Sinh viên
    document.querySelectorAll('.user-card-wrapper').forEach(card => {
        if(card.getAttribute('data-search').includes(kw)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });

    // 2. Nếu đang tìm kiếm, tự động MỞ TẤT CẢ các thư mục Lớp ra để nhìn thấy kết quả
    document.querySelectorAll('.class-collapse-body').forEach(el => {
        if (kw.length > 0) el.classList.remove('d-none');
    });
};

// =========================================================================
// 🚀 GIAO DIỆN TẠO LỚP & NHẬP EXCEL (ĐÃ AUTO LOAD CHECKBOX QUYỀN)
// =========================================================================

window.open_create_class_modal = async function() {
    let existingModal = document.getElementById('create_class_modal');
    if (existingModal) existingModal.remove();

    // 🎯 Tự động tải danh sách môn học từ bảng subjects để làm Checkbox Phân quyền
    let subjectsHtml = `<div class="text-center text-white-50 small py-2"><span class="spinner-border spinner-border-sm"></span> Đang tải môn học...</div>`;
    
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        const { data: subjects } = await clientDb.from('subjects').select('subject_key, name');
        if (subjects && subjects.length > 0) {
            subjectsHtml = subjects.map(sub => `
                <div class="col-6 col-md-4 mb-2">
                    <div class="form-check">
                        <input class="form-check-input chk-class-perm" type="checkbox" value="${sub.subject_key}_view" id="chk_${sub.subject_key}">
                        <label class="form-check-label text-white" for="chk_${sub.subject_key}" style="font-size: 0.8rem;">
                            ${sub.name}
                        </label>
                    </div>
                </div>
            `).join('');
        } else {
            subjectsHtml = `<div class="text-white-50 small">Chưa có môn học nào trong hệ thống.</div>`;
        }
    } catch (err) {
        subjectsHtml = `<div class="text-danger small">Lỗi tải môn học!</div>`;
    }

    let modalHtml = `
    <style>
        @media (max-width: 767.98px) {
            .mobile-px-half { padding-left: 0.5px !important; padding-right: 0.5px !important; }
            .mobile-margin-0 { margin-left: 0 !important; margin-right: 0 !important; }
        }
        .unified-input {
            padding: 10px 15px !important;
            border-radius: 12px !important;
            font-size: 0.95rem !important;
            height: 48px !important;
            line-height: 1.5 !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important;
        }
        input[type="file"].unified-input { padding: 8px 15px !important; }
    </style>
    
    <div id="create_class_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column animate__animated animate__fadeInUp" style="background: #212529; z-index: 99999; overflow: hidden;">
        
        <!-- HEADER ĐỒNG BỘ -->
        <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark flex-shrink-0">
            <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="document.getElementById('create_class_modal').remove()">
                <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
            </button>
            <h6 class="text-white fw-bold mb-0 text-center flex-grow-1 text-truncate px-2 text-uppercase" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                TẠO LỚP & NHẬP EXCEL
            </h6>
            <div style="width: 40px;" class="d-block d-md-none"></div>
            <div style="width: 85px;" class="d-none d-md-block"></div>
        </div>

        <!-- BODY TRƯỢT TỰ DO VỚI MÉP 0.5PX -->
        <div class="flex-grow-1 overflow-auto custom-scrollbar p-0 p-md-3" style="background: transparent;">
            <div class="mx-auto mobile-px-half mt-2 mt-md-0" style="max-width: 800px;">
                <div class="row g-2 mb-3 mobile-margin-0">
                    <div class="col-12 col-md-4">
                        <label class="form-label text-white-50 small fw-bold px-1 mb-1">Mã lớp học <span class="text-danger">*</span></label>
                        <input type="text" id="new_class_code" class="form-control bg-dark text-white border-secondary unified-input" placeholder="VD: XN_K21" oninput="window.check_class_exist(this.value)" style="text-transform: uppercase;">
                        <small id="class_exist_warning" class="text-warning d-none mt-1 px-1" style="font-size: 0.75rem;"><i class="bi bi-exclamation-triangle-fill"></i> Mã tồn tại, sẽ gộp danh sách.</small>
                    </div>
                    <div class="col-12 col-md-5">
                        <label class="form-label text-white-50 small fw-bold px-1 mb-1">Tên lớp học</label>
                        <input type="text" id="new_class_name" class="form-control bg-dark text-white border-secondary unified-input" placeholder="VD: Xét nghiệm y học K21">
                    </div>
                    <div class="col-12 col-md-3">
                        <label class="form-label text-white-50 small fw-bold px-1 mb-1">Nhóm Role <span class="text-danger">*</span></label>
                        <select id="new_class_role" class="form-select bg-dark text-white border-secondary unified-input" onchange="if(this.value=='other') { document.getElementById('new_class_role_custom').classList.remove('d-none'); } else { document.getElementById('new_class_role_custom').classList.add('d-none'); }">
                            <option value="medical">medical</option>
                            <option value="k12">k12</option>
                            <option value="admin">admin</option>
                            <option value="other">Khác...</option>
                        </select>
                        <input type="text" id="new_class_role_custom" class="form-control bg-dark text-white border-info d-none mt-2 unified-input" placeholder="Nhập Role mới">
                    </div>
                </div>

                <!-- 🌟 DANH SÁCH CHECKBOX PHÂN QUYỀN TỰ ĐỘNG -->
                <div class="mb-3 mx-0 mx-md-0 p-3 rounded-3 shadow-sm border border-secondary" style="background: rgba(0,0,0,0.15);">
                    <label class="form-label text-info small fw-bold mb-3"><i class="bi bi-shield-check me-1"></i> GÁN QUYỀN MÔN HỌC MẶC ĐỊNH CHO LỚP NÀY</label>
                    <div class="row m-0" id="class_permissions_container" style="margin-left: -0.25rem !important; margin-right: -0.25rem !important;">
                        ${subjectsHtml}
                    </div>
                </div>

                <!-- 🌟 TÙY CHỌN MẬT KHẨU MỚI THÊM -->
                <div class="mb-3 mobile-margin-0">
                    <label class="form-label text-white-50 small fw-bold px-1 mb-1">Quy tắc Mật khẩu mặc định <span class="text-danger">*</span></label>
                    <select id="new_class_password_type" class="form-select bg-dark text-white border-secondary unified-input">
                        <option value="id_class">Mã SV + Mã lớp (VD: 21B_XNK21)</option>
                        <option value="id_only">Giống hệt Mã Sinh Viên</option>
                        <option value="random">Tạo ngẫu nhiên (6 ký tự)</option>
                    </select>
                </div>

                <div class="mb-4 mobile-margin-0">
                    <label class="form-label text-white-50 small fw-bold px-1 mb-1">File Excel nhà trường cấp <span class="text-danger">*</span></label>
                    <input type="file" id="new_class_excel" class="form-control bg-dark text-white border-secondary unified-input" accept=".xlsx, .xls">
                </div>
            </div>
        </div>
        
        <!-- FOOTER NÚT TRÀN VIỀN -->
        <div class="border-top border-secondary bg-transparent flex-shrink-0 d-flex w-100">
            <button type="button" class="btn fw-bold flex-grow-1 py-3 text-danger bg-transparent border-0 border-end border-secondary" style="border-radius: 0;" onclick="document.getElementById('create_class_modal').remove()">
                HỦY BỎ
            </button>
            <button type="button" class="btn fw-bold flex-grow-1 py-3 text-success bg-transparent border-0" style="border-radius: 0;" onclick="window.submit_create_class(this)">
                TẠO LỚP & LƯU
            </button>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.submit_create_class = async function(btn) {
    let code = document.getElementById('new_class_code').value.trim().toUpperCase();
    let name = document.getElementById('new_class_name').value.trim();
    
    let roleSelect = document.getElementById('new_class_role').value;
    let customRole = document.getElementById('new_class_role_custom').value.trim();
    let finalRole = (roleSelect === 'other' && customRole) ? customRole : roleSelect;
    
    // 🌟 QUÉT TẤT CẢ CÁC CHECKBOX ĐÃ TICK VÀ GOM THÀNH CHUỖI
    let pArr = [];
    document.querySelectorAll('.chk-class-perm:checked').forEach(c => pArr.push(c.value));
    let finalPerms = pArr.join(', ');
    
    // 🌟 ĐỌC LỰA CHỌN MẬT KHẨU TỪ GIAO DIỆN
    let passType = document.getElementById('new_class_password_type').value;

    let fileInput = document.getElementById('new_class_excel');
    let file = fileInput.files[0];

    if(!code || !file) return window.show_toast("⚠️ Vui lòng nhập Mã lớp và chọn file Excel!", true);

    let originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Đang xử lý...`;
    btn.classList.add('disabled');

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const clientDb = typeof db !== 'undefined' ? db : window._supabase;

            const { error: classErr } = await clientDb.from('classes').upsert([
                { class_code: code, class_name: name || "Lớp " + code }
            ], { onConflict: 'class_code' });
            if (classErr) throw classErr;

            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

            let newUsers = [];
            for (let row of jsonData) {
                let maSV = row['Mã sinh viên'];
                if (!maSV) continue;

                let strMaSV = String(maSV).trim();
                let ho = (row['Họ'] || "").toString().trim();
                let ten = (row['Tên'] || "").toString().trim();
                let fullName = ho + " " + ten;
                
                // 🌟 THUẬT TOÁN SINH MẬT KHẨU THEO YÊU CẦU
                let userPass = "";
                if (passType === 'id_class') {
                    userPass = strMaSV + "_" + code; // Sinh viên + Mã Lớp (có gạch dưới cho dễ nhìn)
                } else if (passType === 'id_only') {
                    userPass = strMaSV; // Trùng 100% với mã sinh viên
                } else {
                    userPass = Math.random().toString(36).slice(-6); // Quay lại Ngẫu nhiên 6 ký tự
                }

                newUsers.push({
                    student_id: strMaSV,
                    password: userPass,
                    full_name: fullName.trim(),
                    role: finalRole, 
                    permissions: finalPerms, // 🌟 GÁN CHUỖI CHECKBOX VÀO ĐÂY
                    class_code: code,
                    ngay_sinh: (row['Ngày sinh'] || "").toString().trim(),
                    khoa_hoc: (row['Khóa học'] || "").toString().trim(),
                    nganh_hoc: (row['Ngành học'] || "").toString().trim(),
                    thoi_diem_dang_ky: (row['Thời điểm đăng ký'] || "").toString().trim()
                });
            }

            if (newUsers.length === 0) throw new Error("Không tìm thấy sinh viên có cột 'Mã sinh viên'");

            const { error } = await clientDb.from('users').upsert(newUsers, { onConflict: 'student_id' });
            if (error) throw error;

            window.show_toast(`✅ Đã tạo lớp ${code} và gán quyền cho ${newUsers.length} tài khoản!`);
            
            window.close_create_class_modal();
            
            if (typeof window.render_user_management === 'function') window.render_user_management();
        } catch (err) {
            console.error("Lỗi:", err);
            window.show_toast("❌ Lỗi: " + err.message, true);
            btn.innerHTML = originalHtml;
            btn.classList.remove('disabled');
        }
    };
    reader.readAsArrayBuffer(file);
};

window.close_create_class_modal = function() {
    let modalEl = document.getElementById('create_class_modal');
    if (modalEl) modalEl.remove();
};

window.check_class_exist = async function(code) {
    if(!code || code.trim() === '') return document.getElementById('class_exist_warning').classList.add('d-none');
    const clientDb = typeof db !== 'undefined' ? db : window._supabase;
    // Đã đổi .single() thành .maybeSingle()
    const { data } = await clientDb.from('classes').select('class_code').eq('class_code', code.trim().toUpperCase()).maybeSingle();
    if(data) document.getElementById('class_exist_warning').classList.remove('d-none');
    else document.getElementById('class_exist_warning').classList.add('d-none');
};

// =========================================================================
// 🚀 GIAO DIỆN ĐỔI TÊN LỚP HỌC (TRÀN VIỀN 100%, FORM CĂN GIỮA)
// =========================================================================
window.open_edit_class_modal = function(classCode, currentName) {
    let existingModal = document.getElementById('edit_class_name_modal');
    if (existingModal) existingModal.remove();

    let modalHtml = `
    <style>
        @media (max-width: 767.98px) {
            .mobile-px-half { padding-left: 0.5px !important; padding-right: 0.5px !important; }
        }
        .unified-input {
            padding: 10px 15px !important;
            border-radius: 12px !important;
            font-size: 0.95rem !important;
            height: 48px !important;
            line-height: 1.5 !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important;
        }
    </style>
    
    <div id="edit_class_name_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column animate__animated animate__fadeIn" style="background: #212529; z-index: 99999; overflow: hidden;">
        
        <!-- HEADER ĐỒNG BỘ NATIVE APP -->
        <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark flex-shrink-0">
            <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="document.getElementById('edit_class_name_modal').remove()">
                <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
            </button>
            <h6 class="text-white fw-bold mb-0 text-center flex-grow-1 text-truncate px-2 text-uppercase" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                ĐỔI TÊN LỚP
            </h6>
            <div style="width: 40px;" class="d-block d-md-none"></div>
            <div style="width: 85px;" class="d-none d-md-block"></div>
        </div>

        <!-- BODY TRƯỢT TỰ DO VỚI MÉP 0.5PX MOBILE, CĂN GIỮA NỘI DUNG -->
        <div class="flex-grow-1 overflow-auto d-flex flex-column justify-content-center p-0 p-md-3" style="background: transparent;">
            <div class="mx-auto w-100 mobile-px-half px-3" style="max-width: 450px; margin-top: -10vh;">
                <div class="text-center mb-4">
                    <i class="bi bi-pencil-square text-warning mb-3" style="font-size: 3.5rem; filter: drop-shadow(0 0 10px rgba(245,158,11,0.3));"></i>
                </div>
                
                <div class="mb-3">
                    <label class="form-label text-white-50 small fw-bold px-1 mb-1">Mã lớp (Cố định)</label>
                    <input type="text" class="form-control bg-dark text-white-50 border-secondary unified-input fw-bold text-center" value="${classCode}" readonly disabled>
                </div>
                
                <div class="mb-4">
                    <label class="form-label text-white-50 small fw-bold px-1 mb-1">Tên lớp mới</label>
                    <input type="text" id="edit_c_name_input" class="form-control bg-dark text-white border-warning unified-input fw-bold text-center shadow-sm" value="${currentName}" placeholder="Nhập tên lớp mới..." onfocus="this.select()">
                </div>
            </div>
        </div>
        
        <!-- FOOTER NÚT TRÀN VIỀN XUỐNG ĐÁY MÀN HÌNH -->
        <div class="border-top border-secondary bg-transparent flex-shrink-0 d-flex w-100 mt-auto">
            <button type="button" class="btn fw-bold py-3 flex-grow-1 text-danger bg-transparent border-0 border-end border-secondary" style="border-radius: 0;" onclick="document.getElementById('edit_class_name_modal').remove()">
                HỦY BỎ
            </button>
            <button type="button" class="btn fw-bold py-3 flex-grow-1 text-warning bg-transparent border-0" style="border-radius: 0;" onclick="window.submit_edit_class_name('${classCode}', this)">
                LƯU TÊN MỚI
            </button>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setTimeout(() => { document.getElementById('edit_c_name_input').focus(); }, 300);
};

window.close_edit_class_modal = function() {
    let modalEl = document.getElementById('edit_class_name_modal');
    if (!modalEl) return;
    
    if (typeof bootstrap !== 'undefined') {
        let inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
    } else if (typeof $!== 'undefined' && typeof$.fn.modal !== 'undefined') {
        $(modalEl).modal('hide');
    } else {
        modalEl.classList.remove('show');
        modalEl.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
};

window.submit_edit_class_name = async function(classCode, btn) {
    let newName = document.getElementById('edit_c_name_input').value.trim();
    
    let originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>...`;
    btn.classList.add('disabled');
    
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        
        // 🎯 Lệnh Update chỉ cập nhật duy nhất cột class_name
        const { error } = await clientDb.from('classes').update({ class_name: newName }).eq('class_code', classCode);
        
        if (error) throw error;
        
        window.show_toast(`✅ Đã cập nhật tên lớp thành công!`);
        window.close_edit_class_modal();
        
        // Cập nhật lại giao diện để hiện tên mới
        if (typeof window.render_user_management === 'function') {
            window.render_user_management();
        }
    } catch (err) {
        console.error("Lỗi đổi tên lớp:", err);
        window.show_toast("❌ Lỗi: " + err.message, true);
        btn.innerHTML = originalHtml;
        btn.classList.remove('disabled');
    }
};

// =========================================================================
// 🚀 XÓA LỚP HỌC (CÓ TÙY CHỌN XÓA SẠCH SINH VIÊN)
// =========================================================================
window.remove_class = function(classCode) {
    window.show_alert(
        "CẢNH BÁO XÓA LỚP", 
        `Bạn đang chuẩn bị xóa lớp <b class="text-danger">${classCode}</b>.<br><br>
        <small class="text-info">Ở bước tiếp theo, hệ thống sẽ hỏi bạn muốn xóa luôn sinh viên hay giữ lại.</small>`, 
        async function(ans) {
            if (!ans) return; // Nếu chọn Hủy ở thông báo đầu thì dừng lại
            
            // 🎯 Bật thêm 1 hộp thoại hỏi dứt khoát việc xóa sinh viên
            let deleteStudentsToo = confirm(
                `⚠️ BẠN CÓ MUỐN XÓA LUÔN SINH VIÊN KHÔNG?\n\n` +
                `👉 Bấm [OK]: Xóa lớp + XÓA SẠCH toàn bộ tài khoản sinh viên thuộc lớp này khỏi hệ thống.\n` +
                `👉 Bấm [Cancel]: Chỉ xóa lớp, các sinh viên được giữ lại và chuyển xuống nhóm Tự do.`
            );

            try {
                const clientDb = typeof db !== 'undefined' ? db : window._supabase;
                
                // 1. NẾU CHỌN OK -> XÓA TOÀN BỘ SINH VIÊN CỦA LỚP NÀY TRƯỚC
                if (deleteStudentsToo) {
                    const { error: errUsers } = await clientDb.from('users').delete().eq('class_code', classCode);
                    if (errUsers) throw errUsers;
                }
                
                // 2. SAU ĐÓ MỚI XÓA LỚP (Bảng classes)
                const { error: errClass } = await clientDb.from('classes').delete().eq('class_code', classCode);
                if (errClass) throw errClass;
                
                // Báo cáo kết quả theo đúng hành động
                if (deleteStudentsToo) {
                    window.show_toast(`✅ Đã xóa lớp ${classCode} VÀ TOÀN BỘ sinh viên trong lớp!`);
                } else {
                    window.show_toast(`✅ Đã xóa lớp ${classCode}. Tài khoản sinh viên đã được giữ lại.`);
                }
                
                // Tải lại giao diện
                if (typeof window.render_user_management === 'function') {
                    window.render_user_management();
                }
            } catch (err) {
                console.error("Lỗi xóa lớp:", err);
                window.show_toast("❌ Lỗi khi xóa lớp: " + err.message, true);
            }
        }
    );
};

// =========================================================================
// 🚀 TỔNG HỢP VÀ XUẤT ĐIỂM EXCEL (TỐI ƯU HÓA UX CHO MOBILE & ZALO)
// =========================================================================
window.export_class_scores_excel = async function(classCode) {
    window.show_toast("<span class='spinner-border spinner-border-sm me-2'></span> Đang tổng hợp điểm...", false);
    
    // 💡 Tự động nhận diện thiết bị Mobile và Trình duyệt Zalo/Messenger
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isInAppBrowser = /FBAN|FBAV|Zalo|Messenger|Instagram/i.test(navigator.userAgent);

    if (isInAppBrowser) {
        window.show_toast("⚠️ CẢNH BÁO: Zalo/Messenger có thể chặn tải file. Hãy bấm nút (⋮) góc phải và chọn 'Mở bằng Trình duyệt' (Chrome/Safari) để xuất điểm!", true);
    }

    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;

        // 1. Lấy Sinh viên
        const { data: students, error: errUsers } = await clientDb.from('users').select('*').eq('class_code', classCode);
        if (errUsers) throw errUsers;
        if (!students || students.length === 0) return window.show_toast("⚠️ Lớp này chưa có sinh viên!", true);

        // 2. Lấy Điểm thi (Xóa khoảng trắng ở ID để màng lọc chính xác 100%)
        const studentIds = students.map(s => String(s.student_id).trim());
        const { data: examResults, error: errResults } = await clientDb.from('exam_results').select('exam_code, student_id, score').in('student_id', studentIds);
        if (errResults) throw errResults;

        // Báo nhẹ nếu lớp chưa ai có điểm
        if (!examResults || examResults.length === 0) {
            window.show_toast("⚠️ Lớp chưa có điểm thi, hệ thống sẽ xuất form rỗng.", true);
        }

        // 3. Phân tích Tên đề thi
        const examCodes = [...new Set((examResults || []).map(r => r.exam_code))];
        let examTypeMap = {}; 
        
        if (examCodes.length > 0) {
            const { data: exams, error: errExams } = await clientDb.from('online_exams').select('exam_code, exam_name').in('exam_code', examCodes);
            
            if (!errExams && exams) {
                exams.forEach(ex => {
                    let nameStr = (ex.exam_name || "").toUpperCase();
                    let loai = 'K1'; 
                    
                    if (nameStr.includes('THI') || nameStr.includes('CUỐI KỲ') || nameStr.includes('CUOI KY')) loai = 'THI';
                    else if (nameStr.includes('K5') || nameStr.includes('KT5') || nameStr.includes('THỰC HÀNH') || nameStr.includes('THUC HANH')) loai = 'K5';
                    else if (nameStr.includes('K4') || nameStr.includes('KT4')) loai = 'K4';
                    else if (nameStr.includes('K3') || nameStr.includes('KT3')) loai = 'K3';
                    else if (nameStr.includes('K2') || nameStr.includes('KT2')) loai = 'K2';
                    else if (nameStr.includes('K1') || nameStr.includes('KT1')) loai = 'K1';
                    else if (nameStr.includes('CC') || nameStr.includes('CHUYÊN CẦN') || nameStr.includes('CHUYEN CAN')) loai = 'C';
                    
                    examTypeMap[ex.exam_code] = loai;
                });
            }
        }

        // Tách Tên, Sắp xếp ABC
        students.sort((a, b) => {
            let nameA = (a.full_name || "").trim().split(' ').pop().toLowerCase();
            let nameB = (b.full_name || "").trim().split(' ').pop().toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0; 
        });

        // 4. Ghép điểm
        let exportData = students.map((u, index) => {
            let parts = (u.full_name || "").trim().split(' ');
            let ten = parts.length > 0 ? parts.pop() : "";
            let ho = parts.join(' ');

            // Lọc và ép kiểu điểm
            let myScores = (examResults || []).filter(r => String(r.student_id).trim() === String(u.student_id).trim());
            let scoreCols = { 'C': '', 'K1': '', 'K2': '', 'K3': '', 'K4': '', 'K5': '', 'THI': '' };
            
            myScores.forEach(r => {
                let loai = examTypeMap[r.exam_code] || 'K1'; 
                if (scoreCols[loai] !== undefined) {
                    let numScore = parseFloat(r.score) || 0;
                    if (scoreCols[loai] === '' || numScore > parseFloat(scoreCols[loai])) {
                        scoreCols[loai] = numScore;
                    }
                }
            });

            // TRẢ VỀ ĐÚNG TÊN CỘT THEO ẢNH FORM MẪU
            return {
                "STT": index + 1,
                "Mã sinh viên": String(u.student_id).trim(),
                "Họ": ho,
                "Tên": ten,
                "Ngày sinh": u.ngay_sinh || "",
                "Khóa học": u.khoa_hoc || "",
                "Ngành học": u.nganh_hoc || "",
                "Thời điểm đăng ký": u.thoi_diem_dang_ky || "",
                "Lần học": 1,
                "Điểm CC": scoreCols['C'],       // Sửa thành Điểm CC
                "Điểm KT1": scoreCols['K1'],     // Sửa thành Điểm KT1
                "Điểm KT2": scoreCols['K2'],     // Sửa thành Điểm KT2
                "Điểm KT3": scoreCols['K3'],     // Sửa thành Điểm KT3
                "Điểm KT4": scoreCols['K4'],     // Sửa thành Điểm KT4
                "Điểm KT5": scoreCols['K5'],     // Sửa thành Điểm KT5
                "Điểm QTHT": scoreCols['THI'],   // Sửa thành Điểm QTHT
                "Ghi chú": ""
            };
        });

        // BỘ LỌC KÝ TỰ CẤM (Lớp tên 1/2)
        let safeClassCode = classCode.replace(/[\/\\?%*:|"<>]/g, '-');
        let safeSheetName = ("Diem_" + safeClassCode).substring(0, 31);

        // Xuất file
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
        
        ws['!cols'] = [
            { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, 
            { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 8 }
        ];

        // Lệnh ghi file của SheetJS
        XLSX.writeFile(wb, `Bang_Diem_${safeClassCode}.xlsx`);

        // 🌟 Nâng cấp UX: Báo cáo kết quả tải tùy theo loại thiết bị
        if (isMobile && !isInAppBrowser) {
            window.show_toast(`✅ Tải thành công! Vui lòng kiểm tra thư mục <b>"Tải xuống" (Downloads)</b> hoặc ứng dụng <b>"Tệp" (Files)</b> trên điện thoại của bạn.`, false);
        } else if (!isInAppBrowser) {
            window.show_toast("✅ Xuất bảng điểm Excel thành công!");
        }

    } catch (err) {
        console.error("Lỗi xuất Excel:", err);
        window.show_toast("❌ Lỗi xuất file: " + err.message, true);
    }
};

// Hàm thực hiện lưu dữ liệu lớp học vào Supabase
window.save_new_class = async function() {
    let codeInput = document.getElementById('modal_c_code').value;
    let nameInput = document.getElementById('modal_c_name').value;
    
    if (!codeInput || codeInput.trim() === '') {
        alert("Vui lòng nhập Mã Lớp!");
        return;
    }
    
    let code = codeInput.trim().toUpperCase();
    let name = nameInput.trim();
    
    try {
        const { error } = await db.from('classes').insert([{ class_code: code, class_name: name }]);
        if (error) {
            if (error.code === '23505') alert("Mã lớp này đã tồn tại trong hệ thống!");
            else throw error;
        } else {
            alert(`Đã tạo thành công lớp: ${code}`);
            document.getElementById('class_modal').remove(); // Đóng popup
            window.render_user_management(); // Tải lại danh sách
        }
    } catch(err) { 
        alert("Lỗi khi tạo lớp: " + err.message); 
    }
};

// =========================================================================
// HÀM IMPORT EXCEL
// =========================================================================
window.import_excel_students = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonList = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonList.length === 0) { alert("File Excel không có dữ liệu!"); return; }

            // 1. Thu thập các class_code có trong file để tạo lớp tự động nếu chưa có
            const uniqueClasses = [...new Set(jsonList.map(r => r['MaLop'] ? String(r['MaLop']).trim().toUpperCase() : null).filter(Boolean))];
            if (uniqueClasses.length > 0) {
                const classesToInsert = uniqueClasses.map(c => ({ class_code: c, class_name: c }));
                // Dùng upsert để bỏ qua nếu lớp đã tồn tại
                await db.from('classes').upsert(classesToInsert, { onConflict: 'class_code' });
            }

            // 2. Chẩn bị dữ liệu Sinh viên
            const usersToInsert = jsonList.map(row => ({
                student_id: row['MaSV'] ? String(row['MaSV']).trim() : null,
                full_name: row['HoTen'] ? String(row['HoTen']).trim() : '',
                password: row['MatKhau'] ? String(row['MatKhau']).trim() : '123456',
                class_code: row['MaLop'] ? String(row['MaLop']).trim().toUpperCase() : null,
                role: 'k12'
            })).filter(u => u.student_id);

            if (usersToInsert.length === 0) { alert("Không tìm thấy cột 'MaSV' hợp lệ trong file!"); return; }

            // 3. Đẩy lên bảng users
            const { error } = await db.from('users').upsert(usersToInsert, { onConflict: 'student_id' });
            if (error) throw error;
            
            alert(`Import thành công ${usersToInsert.length} sinh viên!`);
            window.render_user_management();
        } catch (err) {
            alert("Lỗi quá trình Import: " + err.message);
            console.error(err);
        } finally {
            event.target.value = ''; // Reset input file
        }
    };
    reader.readAsArrayBuffer(file);
};
// =========================================================================
// HÀM TẢI FILE EXCEL MẪU
// =========================================================================
window.download_excel_template = function() {
    try {
        // Dữ liệu mẫu (Header và 3 dòng ví dụ)
        const templateData = [
            { "MaSV": "SV001", "HoTen": "Nguyễn Văn A", "MatKhau": "123456", "MaLop": "DD21F" },
            { "MaSV": "SV002", "HoTen": "Trần Thị B", "MatKhau": "123456", "MaLop": "DD21F" },
            { "MaSV": "SV003", "HoTen": "Lê Văn C", "MatKhau": "123456", "MaLop": "Y20A" }
        ];
        
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        
        // Căn chỉnh độ rộng cột cho đẹp dễ nhìn
        const wscols = [
            {wch: 15}, // Độ rộng cột MaSV
            {wch: 25}, // Độ rộng cột HoTen
            {wch: 15}, // Độ rộng cột MatKhau
            {wch: 15}  // Độ rộng cột MaLop
        ];
        worksheet['!cols'] = wscols;

        // Tạo và tải file
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachSinhVien");
        XLSX.writeFile(workbook, "Mau_Import_SinhVien.xlsx");
        
    } catch (err) {
        alert("Lỗi khi tạo file mẫu: " + err.message);
        console.error(err);
    }
};

window.switch_dm_tab = function(tabId) {
    document.querySelectorAll('.dm-tab-pane').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.dm-tab-btn').forEach(el => {
        el.style.borderBottom = 'none';
        el.classList.remove('text-info', 'fw-bold', 'bg-dark');
        el.classList.add('text-white-50');
    });
    document.getElementById(tabId).style.display = 'block';
    let activeBtn = document.querySelector(`[data-target="${tabId}"]`);
    if(activeBtn) {
        activeBtn.style.borderBottom = '2px solid #0ea5e9';
        activeBtn.classList.remove('text-white-50');
        activeBtn.classList.add('text-info', 'fw-bold', 'bg-dark');
    }
};

// =========================================================================
// 🚀 GIAO DIỆN SỬA THÔNG TIN TÀI KHOẢN & PHÂN QUYỀN (TRÀN VIỀN 100%)
// =========================================================================
window.open_data_manager = function(activeTab = 'tab_user', uname='', pwd='', role='k12', fname='', perms='', classCode='') {
    let existingModal = document.getElementById('data_manager_modal');
    if (existingModal) existingModal.remove();

    // 🎯 LOGIC GỐC CỦA THẦY (GIỮ NGUYÊN 100%)
    let pList = perms === 'all' ? ['all'] : perms.split(',').map(s => s.trim().toLowerCase());
    let hasP = (key, act) => { 
        if (pList.includes('all')) return true; 
        if (act === 'system') return pList.includes(`system_${key}`); 
        if (act === 'stats') return pList.includes(`${key}_stats`) || pList.includes('stats_view') || pList.includes('stats_all') || pList.includes('stats'); 
        if (act === 'edit') return pList.includes(`${key}_edit`); 
        if (act === 'view') return pList.includes(`${key}_view`) || pList.includes(`${key}_edit`) || pList.includes(key); 
        return false; 
    };
    
    let groupedSubjects = {};
    Object.keys(window.subjectConfig || {}).forEach(k => { 
        let grp = window.subjectConfig[k].role || 'Khác'; 
        if(!groupedSubjects[grp]) groupedSubjects[grp] = []; 
        groupedSubjects[grp].push(k); 
    });

    // 🎨 UI MỚI CHO DANH SÁCH CHECKBOX PHÂN QUYỀN
    let subjectsCheckboxes = "";
    Object.keys(groupedSubjects).forEach(grp => {
        let grpLower = grp.toLowerCase();
        subjectsCheckboxes += `
        <div class="mb-3 p-3 rounded-3 shadow-sm border border-secondary" style="background: rgba(0,0,0,0.15);">
            <div class="d-flex justify-content-between align-items-center border-bottom border-secondary pb-3 mb-3">
                <div class="text-warning fw-bold text-uppercase" style="font-size: 0.85rem;"><i class="bi bi-folder-fill me-2"></i> ${grp}</div>
                <div class="d-flex gap-2 text-center">
                    <div style="width: 40px;"><label class="text-white-50 fw-bold d-block mb-1" style="font-size: 0.6rem;">XEM</label><input type="checkbox" class="form-check-input switch-sm chk-view chk-group custom-switch-view m-0" data-base="${grpLower}" ${hasP(grpLower, 'view')?'checked':''} onchange="window.handle_perm_change(this)"></div>
                    <div style="width: 40px;"><label class="text-white-50 fw-bold d-block mb-1" style="font-size: 0.6rem;">SỬA</label><input type="checkbox" class="form-check-input switch-sm chk-edit chk-group custom-switch-edit m-0" data-base="${grpLower}" ${hasP(grpLower, 'edit')?'checked':''} onchange="window.handle_perm_change(this)"></div>
                    <div style="width: 40px;"><label class="text-white-50 fw-bold d-block mb-1" style="font-size: 0.6rem; color: #c084fc !important;">T.KÊ</label><input type="checkbox" class="form-check-input switch-sm chk-stats chk-group custom-switch-stats m-0" data-base="${grpLower}" ${hasP(grpLower, 'stats')?'checked':''} onchange="window.handle_perm_change(this)"></div>
                </div>
            </div>`;
        groupedSubjects[grp].forEach(subjKey => {
            subjectsCheckboxes += `
            <div class="d-flex justify-content-between align-items-center px-2 py-2 mb-2 rounded" style="background: rgba(255,255,255,0.02);">
                <div class="text-white text-truncate pe-2 fw-bold" style="font-size: 0.85rem;"><i class="bi bi-dot text-info fs-5"></i> ${window.subjectNames ? window.subjectNames[subjKey] : subjKey}</div>
                <div class="d-flex gap-2 text-center flex-shrink-0">
                    <div style="width: 40px;"><input type="checkbox" class="form-check-input switch-sm chk-view custom-switch-view m-0" data-base="${subjKey.toLowerCase()}" data-group="${grpLower}" ${hasP(subjKey.toLowerCase(), 'view')?'checked':''} onchange="window.handle_perm_change(this)"></div>
                    <div style="width: 40px;"><input type="checkbox" class="form-check-input switch-sm chk-edit custom-switch-edit m-0" data-base="${subjKey.toLowerCase()}" data-group="${grpLower}" ${hasP(subjKey.toLowerCase(), 'edit')?'checked':''} onchange="window.handle_perm_change(this)"></div>
                    <div style="width: 40px;"><input type="checkbox" class="form-check-input switch-sm chk-stats custom-switch-stats m-0" data-base="${subjKey.toLowerCase()}" data-group="${grpLower}" ${hasP(subjKey.toLowerCase(), 'stats')?'checked':''} onchange="window.handle_perm_change(this)"></div>
                </div>
            </div>`;
        });
        subjectsCheckboxes += `</div>`;
    });

    let modalHtml = `
    <style>
        .switch-sm { width: 34px !important; height: 18px !important; cursor: pointer; }
        .custom-switch-view:checked { background-color: #10b981 !important; border-color: #10b981 !important; }
        .custom-switch-edit:checked { background-color: #f59e0b !important; border-color: #f59e0b !important; }
        .custom-switch-stats:checked { background-color: #a855f7 !important; border-color: #a855f7 !important; }
        .custom-switch-admin:checked { background-color: #ef4444 !important; border-color: #ef4444 !important; }
        .chk-system:checked { background-color: #0ea5e9 !important; border-color: #0ea5e9 !important; }
        
        @media (max-width: 767.98px) {
            .mobile-px-half { padding-left: 0.5px !important; padding-right: 0.5px !important; }
            .mobile-margin-0 { margin-left: 0 !important; margin-right: 0 !important; }
        }
        .unified-input {
            padding: 10px 15px !important;
            border-radius: 12px !important;
            font-size: 0.95rem !important;
            height: 48px !important;
            line-height: 1.5 !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important;
        }
    </style>
    
    <div id="data_manager_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column animate__animated animate__fadeInRight" style="background: #212529; z-index: 99999; overflow: hidden;">
        
        <!-- HEADER ĐỒNG BỘ NATIVE APP -->
        <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark flex-shrink-0">
            <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="document.getElementById('data_manager_modal').remove()">
                <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
            </button>
            <h6 class="text-white fw-bold mb-0 text-center flex-grow-1 text-truncate px-2 text-uppercase" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                TÀI KHOẢN & PHÂN QUYỀN
            </h6>
            <div style="width: 40px;" class="d-block d-md-none"></div>
            <div style="width: 85px;" class="d-none d-md-block"></div>
        </div>

        <!-- BODY TRƯỢT TỰ DO VỚI MÉP 0.5PX MOBILE -->
        <div class="flex-grow-1 overflow-auto custom-scrollbar p-0 p-md-3" style="background: transparent;">
            <div class="mx-auto mobile-px-half mt-2 mt-md-0" style="max-width: 800px;">
                
                <div class="row g-2 mb-3 mobile-margin-0">
                    <div class="col-12 col-md-6">
                        <label class="text-white-50 small fw-bold px-1 mb-1">ID Sinh viên <span class="text-danger">*</span></label>
                        <input type="text" id="modal_u_id" class="form-control bg-dark text-white border-secondary unified-input fw-bold" value="${uname}" ${uname ? 'readonly style="opacity:0.6"' : 'placeholder="VD: 241030..."'}>
                    </div>
                    <div class="col-12 col-md-6">
                        <label class="text-white-50 small fw-bold px-1 mb-1">Mật khẩu <span class="text-danger">*</span></label>
                        <input type="text" id="modal_u_pass" class="form-control bg-dark text-white border-secondary unified-input fw-bold" value="${pwd}" placeholder="Mật khẩu">
                    </div>
                </div>
                
                <div class="mb-3 mobile-margin-0">
                    <label class="text-white-50 small fw-bold px-1 mb-1">Họ và Tên</label>
                    <input type="text" id="modal_u_name" class="form-control bg-dark text-info border-secondary unified-input fw-bold shadow-sm" value="${fname}" placeholder="Nhập họ tên đầy đủ...">
                </div>

                <div class="row g-2 mb-4 mobile-margin-0">
                    <div class="col-6">
                        <label class="text-white-50 small fw-bold px-1 mb-1">Nhóm Role</label>
                        <select id="modal_u_role" class="form-select bg-dark text-white border-secondary unified-input fw-bold shadow-sm">
                            <option value="medical" ${role==='medical'?'selected':''}>medical</option>
                            <option value="k12" ${role==='k12'?'selected':''}>k12</option>
                            <option value="admin" ${role==='admin'?'selected':''}>admin</option>
                            ${(role !== 'medical' && role !== 'k12' && role !== 'admin' && role !== 'all') ? `<option value="${role}" selected>${role}</option>` : ''}
                        </select>
                    </div>
                    <div class="col-6">
                        <label class="text-white-50 small fw-bold px-1 mb-1">Mã Lớp</label>
                        <input type="text" id="modal_u_class" class="form-control bg-dark text-warning border-secondary unified-input fw-bold shadow-sm" value="${classCode}" placeholder="VD: XN_K21">
                    </div>
                </div>
                
                <div class="d-flex justify-content-between align-items-center p-3 mb-4 rounded-3 shadow-sm mx-0 mx-md-0 border border-danger border-opacity-50" style="background: rgba(239, 68, 68, 0.1);">
                    <div class="text-danger fw-bold" style="font-size: 0.95rem;"><i class="bi bi-star-fill me-2"></i> QUYỀN ADMIN TỐI CAO</div>
                    <div class="form-check form-switch m-0 p-0">
                        <input class="form-check-input custom-switch-admin ms-0 mt-0" type="checkbox" id="modal_u_isadmin" ${role==='all'||role==='admin'?'checked':''} onchange="document.getElementById('matrix_wrapper').style.display = this.checked ? 'none' : 'block'" style="width: 44px; height: 24px; cursor: pointer;">
                    </div>
                </div>
                
                <div id="matrix_wrapper" style="display: ${role==='all'||role==='admin'?'none':'block'};" class="mx-0 mx-md-0">
                    <div class="text-info fw-bold mb-3 text-uppercase px-1" style="font-size: 0.85rem;"><i class="bi bi-ui-checks-grid me-1"></i> PHÂN QUYỀN THEO MÔN HỌC</div>
                    ${subjectsCheckboxes}
                </div>
            </div>
        </div>
        
        <!-- FOOTER NÚT TRÀN VIỀN -->
        <div class="border-top border-secondary bg-transparent flex-shrink-0 d-flex w-100">
            <button type="button" class="btn fw-bold py-3 flex-grow-1 text-danger bg-transparent border-0 border-end border-secondary" style="border-radius: 0;" onclick="document.getElementById('data_manager_modal').remove()">
                HỦY BỎ
            </button>
            <button type="button" class="btn fw-bold py-3 flex-grow-1 text-info bg-transparent border-0" style="border-radius: 0;" onclick="window.save_user_to_sheet(this)">
                LƯU TÀI KHOẢN
            </button>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.handle_perm_change = function(el) {
    let base = el.getAttribute('data-base');
    if (el.classList.contains('chk-edit') && el.checked) { let v = document.querySelector(`.chk-view[data-base="${base}"]`); if(v) v.checked = true; }
    if (el.classList.contains('chk-view') && !el.checked) { let e = document.querySelector(`.chk-edit[data-base="${base}"]`); if(e) e.checked = false; }
    if (el.classList.contains('chk-group')) {
        document.querySelectorAll(`input[data-group="${base}"]`).forEach(child => {
            if (el.classList.contains('chk-view') && child.classList.contains('chk-view')) { child.checked = el.checked; window.handle_perm_change(child); }
            if (el.classList.contains('chk-edit') && child.classList.contains('chk-edit')) { child.checked = el.checked; window.handle_perm_change(child); }
        });
    }
};
// =========================================================================
// ⏱️ HÀM CƯỠNG CHẾ THU BÀI (KHÔNG HỎI HAN)
// =========================================================================
window.force_submit_exam = function() {
    if (window.timer_interval) clearInterval(window.timer_interval);
    
    let confirmModal = document.getElementById('custom_confirm');
    if (confirmModal) confirmModal.style.display = 'none';

    if (typeof window.clear_exam_draft === 'function') window.clear_exam_draft();

    window.show_toast("⏳ Hết giờ! Hệ thống đang tự động thu bài...", true);
    
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(e => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }

    setTimeout(() => {
        if (typeof calculate_and_show_result === 'function') calculate_and_show_result();
    }, 1000);
};

// =========================================================================
// ⏱️ HÀM ĐẾM NGƯỢC (BỊT KÍN LỖ HỔNG)
// =========================================================================
window.start_countdown = function() {
    if (window.timer_interval) clearInterval(window.timer_interval);

    let giay_cho_moi_cau = 60; 
    let tong_thoi_gian = 0;
    
    if (typeof window.current_story_data !== 'undefined' && window.current_story_data && window.current_story_data.length > 0) {
        tong_thoi_gian = window.current_story_data.length * giay_cho_moi_cau;
    } else if (typeof questions !== 'undefined' && questions && questions.length > 0) {
        questions.forEach(q => {
            if (q && q.type && (q.type.trim() === 'clip_listen' || q.type.includes('clip'))) {
                tong_thoi_gian += 600; 
            } else {
                tong_thoi_gian += giay_cho_moi_cau; 
            }
        });
    }

    // 🌟 CHỈ CẤP LẠI GIỜ NẾU LÀ BÀI THI MỚI (CHƯA TỪNG LÀM)
    if (!window.is_resumed_exam) {
        window.time_left = (tong_thoi_gian > 0) ? tong_thoi_gian : 2700;
    }

    // 🌟 KỊCH BẢN ĐÁNH ÚP: NẾU VÀO LẠI MÀ ĐÃ HẾT GIỜ -> THU BÀI LUÔN
    if (window.time_left <= 0) {
        let prog_el = document.getElementById('prog_text');
        if (prog_el) { prog_el.innerText = "00:00"; prog_el.style.color = "#ef4444"; }
        window.force_submit_exam();
        return;
    }

    window.timer_interval = setInterval(() => {
        window.time_left--; 
        
        if (window.time_left % 5 === 0) {
            if (typeof window.auto_save_exam_draft === 'function') window.auto_save_exam_draft();
        }

        let safe_time = Math.max(0, window.time_left);
        let m = Math.floor(safe_time / 60), s = safe_time % 60;
        let timeStr = (m < 10 ? '0' + m : m) + ":" + (s < 10 ? '0' + s : s);
        
        const prog_el = document.getElementById('prog_text');
        if(prog_el) {
            prog_el.innerText = timeStr;
            if (safe_time <= 30) prog_el.style.color = (s % 2 === 0) ? "#ef4444" : "#b91c1c";
            else prog_el.style.color = "#ff4d4d"; 
        }

        // 🌟 KỊCH BẢN THÔNG THƯỜNG: HẾT GIỜ TRONG LÚC ĐANG LÀM
        if (window.time_left <= 0) { 
            window.force_submit_exam();
        }
    }, 1000);
}

// =========================================================================
// 🕒 HÀM RENDER TIMELINE (HỢP NHẤT: LỌC 10 NGÀY + BẮT IP/QUỐC GIA)
// =========================================================================
window.render_personal_timeline = function() {
    const historyArea = document.getElementById('history_view_area');
    if (!historyArea) return;

    // Đảm bảo luôn hiển thị và xóa sạch nền viền
    historyArea.style.display = 'block'; 
    let innerPanel = historyArea.querySelector('.glass-panel');
    if (innerPanel) {
        innerPanel.style.background = 'transparent';
        innerPanel.style.border = 'none';
        innerPanel.style.boxShadow = 'none';
        innerPanel.style.padding = '0';
    }
    let headerDiv = historyArea.querySelector('.border-bottom');
    if(headerDiv) {
        headerDiv.classList.remove('border-bottom', 'border-info', 'border-opacity-25');
        headerDiv.style.border = 'none';
    }

    const container = document.getElementById('timeline_container'); 
    if(container) container.innerHTML = '<div class="text-center p-2"><span class="spinner-border spinner-border-sm text-info me-2"></span><span class="text-info fw-bold" style="font-size:0.8rem;">Đang tải lịch sử...</span></div>';

    window.fetch_user_history(window.current_student_id).then(function(history) {
        if (!history || history.length === 0) {
            if(container) container.innerHTML = `<div class="text-white-50 small mt-2 ms-3">Chưa có dữ liệu ôn tập!</div>`;
            return;
        }

        // 🌟 LỌC 10 NGÀY GẦN NHẤT ĐỂ CHỐNG LAG
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
        tenDaysAgo.setHours(0, 0, 0, 0);

        // 🌟 XÁC ĐỊNH QUYỀN TRUY CẬP TỪ ĐẦU ĐỂ ÁP DỤNG BỘ LỌC
        let safe_role = String(window.current_user_role || '').trim().toLowerCase();
        let isAdmin = (safe_role === 'all' || safe_role === 'admin' || safe_role === 'teacher' || safe_role === 'useradmin');

        const groupedData = {};
        history.forEach(item => {
            // 🌟 ĐÃ FIX: ẨN "THI THẬT" TRONG NHẬT KÝ NẾU TÀI KHOẢN LÀ SINH VIÊN
            let modeStr = String(item.mode || item[14] || "").toUpperCase();
            if (!isAdmin && modeStr.includes('THI THẬT')) return;

            let timeRaw = item.time || item[7] || item[6] || new Date().toISOString();
            let dateObj = new Date();
            let rawStr = String(timeRaw).trim();
            let dateMatch = rawStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if(dateMatch) {
                let timeMatch = rawStr.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/);
                let h = timeMatch ? timeMatch[1].padStart(2, '0') : "00"; 
                let m = timeMatch ? timeMatch[2].padStart(2, '0') : "00"; 
                let s = timeMatch ? timeMatch[3].padStart(2, '0') : "00";
                dateObj = new Date(`${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}T${h}:${m}:${s}`);
            } else { 
                let parsed = new Date(rawStr); if (!isNaN(parsed.getTime())) dateObj = parsed;
            }
            if (isNaN(dateObj.getTime())) dateObj = new Date();

            if (dateObj < tenDaysAgo) return;

            let dateLabel = window.get_relative_date_label(dateObj);
            if (!groupedData[dateLabel]) groupedData[dateLabel] = [];
            
            // 🌟 HỨNG DỮ LIỆU TỪ BACKEND (CÓ BIẾN DEVICE CHỨA IP)
            groupedData[dateLabel].push({ 
                subject: item.subject || item[2], 
                lesson: item.lesson || item[3], 
                point: item.point !== undefined ? item.point : item[10], 
                mode: item.mode || item[14], 
                student: item.student || item.student_id || item[1] || "",
                device: item.device || item[13] || ""
            });
        });

        if (Object.keys(groupedData).length === 0) {
            if(container) container.innerHTML = `<div class="text-white-50 small mt-2 ms-3">Không có hoạt động nào trong 10 ngày qua.</div>`;
            return;
        }

        let html = `<style>.glass-timeline { padding-left: 1rem; border-left: 1px dashed rgba(255, 255, 255, 0.1); margin-top: 10px; margin-left: 10px;} .timeline-item { position: relative; margin-bottom: 1rem; } .timeline-dot { position: absolute; left: -1.25rem; top: 0.3rem; width: 8px; height: 8px; border-radius: 50%; z-index: 2; }</style><div class="glass-timeline animate__animated animate__fadeIn">`;

        for (let dateLabel in groupedData) {
            html += `<div class="mb-2 mt-3" style="position: relative; z-index: 2; margin-left: -1.5rem;"><span class="text-info fw-bold" style="font-size: 0.75rem;"><i class="bi bi-calendar-event me-1"></i> ${dateLabel}</span></div>`;
            groupedData[dateLabel].forEach(item => {
                let subjectName = item.subject;
                if (typeof subjectConfig !== 'undefined' && subjectConfig[item.subject]) subjectName = subjectConfig[item.subject].name || item.subject;
                let lesson = String(item.lesson).trim(); if (!lesson.toLowerCase().startsWith('bài')) lesson = "Bài " + lesson;
                let score = parseFloat(item.point) || 0; 
                let isPass = score >= 5.0; 
                let dotColor = isPass ? 'background: #10b981;' : 'background: #f43f5e;'; 
                
                let adminUserDisplay = "";
                if (isAdmin && item.student && item.student.trim() !== "") {
                    // 🌟 BỘ LỌC ĐỊA CHỈ IP VÀ HIỆU ỨNG CẢNH BÁO
                    let ipBadge = "";
                    if (item.device && item.device.includes("[IP:")) {
                        let match = item.device.match(/\[IP:.*?\]/);
                        if (match) {
                            let ipText = match[0];
                            // Nếu không có chữ Vietnam hoặc VN -> Đích thị là IP nước ngoài/VPN
                            let isForeign = !ipText.toLowerCase().includes("vietnam") && !ipText.toLowerCase().includes("vn");
                            let badgeStyle = isForeign ? "background: #dc3545; border: 1px solid #fff; box-shadow: 0 0 8px #dc3545; color: white;" : "background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #ccc;";
                            let animClass = isForeign ? "animate__animated animate__flash animate__infinite animate__slower" : "";
                            
                            ipBadge = `<span class="badge ${animClass} ms-2" style="font-size: 0.65rem; font-weight: normal; ${badgeStyle}" title="Thiết bị: ${item.device}">${ipText}</span>`;
                        }
                    }

                    adminUserDisplay = `<div class="text-warning mb-1 d-flex align-items-center flex-wrap" style="font-size: 0.75rem; font-weight: bold; letter-spacing: 0.5px;"><i class="bi bi-person-circle me-1"></i>${item.student} ${ipBadge}</div>`;
                }
                
                html += `
                <div class="timeline-item">
                    <div class="timeline-dot" style="${dotColor}"></div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div style="min-width: 0; flex-grow: 1;">
                            ${adminUserDisplay}
                            <div class="text-white mb-1 text-truncate" style="font-size: 0.8rem; opacity:0.9;">${subjectName} <span class="text-white-50 mx-1">|</span> <span class="text-info opacity-75">${lesson}</span></div>
                            <div class="d-flex align-items-center gap-2"><span class="${score >= 8.0 ? 'text-success' : (isPass ? 'text-warning' : 'text-danger')} fw-bold" style="font-size:0.75rem;">${score.toFixed(1)}đ</span> <span class="text-white-50" style="font-size:0.65rem;">${item.mode || ''}</span></div>
                        </div>
                    </div>
                </div>`;
            });
        }
        html += `</div>`;
        if(container) container.innerHTML = html;
    })
    .catch(function(err) {
        if(container) container.innerHTML = `<div class="text-white-50 small mt-2 ms-3">Lỗi tải dữ liệu.</div>`;
    });
};
// =========================================================================
// 🕒 HÀM TÍNH TOÁN THỜI GIAN (HỖ TRỢ TIMELINE LỊCH SỬ)
// =========================================================================
window.get_relative_date_label = function(dateObj) {
    const today = new Date(); 
    const yesterday = new Date(today); 
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Kiểm tra Hôm nay
    if (dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear()) {
        return "Hôm nay";
    }
    
    // Kiểm tra Hôm qua
    if (dateObj.getDate() === yesterday.getDate() && dateObj.getMonth() === yesterday.getMonth() && dateObj.getFullYear() === yesterday.getFullYear()) {
        return "Hôm qua";
    }
    
    // Tính số ngày chênh lệch
    const diffTime = Math.abs(today - dateObj);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Nếu trong vòng 7 ngày thì hiện "X ngày trước"
    if (diffDays <= 7 && diffDays > 0) {
        return diffDays + " ngày trước";
    }
    
    // Nếu xa hơn thì hiện ngày tháng năm (Định dạng VN: dd/mm/yyyy)
    return dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
// =========================================================================
// 🪄 PHẦN 10: TIỆN ÍCH UI CỐT LÕI VÀ BẢNG TỪ VỰNG MAGIC
// =========================================================================
window.apply_magic_vocab = function(text) {
    if (!text) return "";
    return String(text).replace(/\{\{(.*?)::(.*?)::(.*?)\}\}/g, `<span class="vocab-highlight" onclick="if(window.play_vocab_audio) window.play_vocab_audio('$1', '$2', '$3', event)">$1 </span>`);
};

window.make_vocab_tag = function() {
    var el = document.activeElement;
    if (!el || (el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT')) return alert("⚠️ Vui lòng click chuột vào ô nhập liệu và bôi đen từ vựng trước!");
    var start = el.selectionStart; var end = el.selectionEnd; var selText = el.value.substring(start, end).trim();
    if (!selText) return alert("⚠️ Thầy chưa bôi đen chữ nào cả!");

    var word = selText; var preMeaning = "";
    var match = selText.match(/^([^\(]+)\s*\((.*?)\)$/);
    if (match) { word = match[1].trim(); preMeaning = match[2].trim(); }

    window.current_vocab_context = { el: el, start: start, end: end, word: word };
    window.show_smart_vocab_modal(word, preMeaning);
};

window.show_smart_vocab_modal = function(word, preMeaning) {
    var modal = document.getElementById('smart_vocab_modal');
    if (!modal) {
        var htmlArr = [
            '<div id="smart_vocab_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style="background: rgba(0,0,0,0.7); z-index: 30000; backdrop-filter: blur(5px); opacity: 0; transition: 0.3s; pointer-events: none;">',
            '<div class="glass-panel p-4 shadow-lg mx-2" style="width: 100%; max-width: 400px; border-radius: 16px; background: rgba(15,23,42,0.95); border: 1px solid #38bdf8; transform: translateY(-20px); transition: 0.3s;">',
            '<h5 class="fw-bold text-info mb-4" style="letter-spacing: 1px;">🪄 Magic vocab</h5>',
            '<div class="mb-3"><label class="text-white-50 small fw-bold mb-1">Từ vựng gốc</label><input type="text" id="svm_word" class="form-control text-white fw-bold" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2);" readonly></div>',
            '<div class="mb-3 position-relative"><label class="text-white-50 small fw-bold mb-1">Phiên âm (IPA)</label><input type="text" id="svm_ipa" class="form-control text-warning fw-bold" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2);" placeholder="Đang nhờ máy chủ tra cứu..."><div id="svm_ipa_spin" class="spinner-border spinner-border-sm text-warning position-absolute" style="right: 15px; top: 38px; display: none;" role="status"></div></div>',
            '<div class="mb-4 position-relative"><label class="text-white-50 small fw-bold mb-1">Nghĩa tiếng Việt</label><input type="text" id="svm_meaning" class="form-control text-success fw-bold" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2);" placeholder="Đang nhờ máy chủ dịch..."><div id="svm_meaning_spin" class="spinner-border spinner-border-sm text-success position-absolute" style="right: 15px; top: 38px; display: none;" role="status"></div></div>',
            '<div class="d-flex justify-content-end gap-2 mt-2"><button class="btn btn-outline-secondary px-3 rounded-pill fw-bold" onclick="window.close_smart_vocab_modal()">Hủy</button><button class="btn btn-info px-4 rounded-pill fw-bold" style="color: #fff;" onclick="window.save_smart_vocab()">Chèn từ</button></div>',
            '</div></div>'
        ];
        document.body.insertAdjacentHTML('beforeend', htmlArr.join(''));
        modal = document.getElementById('smart_vocab_modal');
    }

    document.getElementById('svm_word').value = word; document.getElementById('svm_ipa').value = ""; document.getElementById('svm_meaning').value = preMeaning;
    document.body.style.overflow = 'hidden';
    modal.style.pointerEvents = 'auto'; modal.style.opacity = '1'; modal.querySelector('.glass-panel').style.transform = 'translateY(0)';

    document.getElementById('svm_ipa_spin').style.display = 'block';
    if (!preMeaning) document.getElementById('svm_meaning_spin').style.display = 'block';

    window.fetch_vocab_data(word).then(function(res) {
        document.getElementById('svm_ipa_spin').style.display = 'none'; document.getElementById('svm_meaning_spin').style.display = 'none';
        if (res.ipa) document.getElementById('svm_ipa').value = res.ipa;
        if (!preMeaning && res.meaning) document.getElementById('svm_meaning').value = res.meaning;
    }).catch(function(err) {
        document.getElementById('svm_ipa_spin').style.display = 'none'; document.getElementById('svm_meaning_spin').style.display = 'none';
    });
};

window.close_smart_vocab_modal = function() {
    var modal = document.getElementById('smart_vocab_modal');
    if (modal) { modal.style.opacity = '0'; modal.querySelector('.glass-panel').style.transform = 'translateY(-20px)'; modal.style.pointerEvents = 'none'; }
    document.body.style.overflow = '';
    if (window.current_vocab_context) window.current_vocab_context.el.focus({ preventScroll: true });
};

window.save_smart_vocab = function() {
    var word = document.getElementById('svm_word').value.trim(); var ipa = document.getElementById('svm_ipa').value.trim(); var meaning = document.getElementById('svm_meaning').value.trim();
    if (!window.current_vocab_context) return;
    var ctx = window.current_vocab_context; var el = ctx.el;
    var result = "{{" + word + "::" + ipa + "::" + meaning + "}}";
    el.value = el.value.substring(0, ctx.start) + result + el.value.substring(ctx.end);
    window.close_smart_vocab_modal();
    setTimeout(function() { el.focus(); el.setSelectionRange(ctx.start, ctx.start + result.length); }, 100);
};

// =========================================================================
// 🛠️ PHẦN 11: CÁC HÀM TIỆN ÍCH CỐT LÕI (UTILITIES)
// =========================================================================
window.show_toast = function(msg, isError = false) {
    let toast = document.createElement('div');
    toast.className = `animate__animated animate__fadeInUp shadow-lg rounded-pill px-4 py-2 text-white fw-bold d-flex align-items-center`;
    toast.style.cssText = `position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 999999; font-size: 0.9rem; background: ${isError ? '#dc3545' : '#198754'}; border: 2px solid rgba(255,255,255,0.2);`;
    toast.innerHTML = `<i class="bi ${isError ? 'bi-x-circle-fill' : 'bi-check-circle-fill'} me-2 fs-5"></i> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.replace('animate__fadeInUp', 'animate__fadeOutDown'); setTimeout(() => toast.remove(), 500); }, 2500);
};

window.getLevelColor = function(level) { 
    switch (parseInt(level)) { 
        case 1: return '#0dcaf0'; 
        case 2: return '#0d6efd'; 
        case 3: return '#fd7e14'; 
        case 4: return '#dc3545'; 
        default: return '#6c757d'; 
    } 
};

// =========================================================================
// 3. HÀM XỬ LÝ MEDIA (BẢN BỌC THÉP VĨNH VIỄN CHỐNG LỖI CÚ PHÁP)
// =========================================================================
window.render_media_for_card = function(q) {
    var mediaHtml = "";
    if (q.image && q.image.length > 5) {
        var mediaItems = String(q.image).split("|");
        for (var i = 0; i < mediaItems.length; i++) {
            var cleanItem = mediaItems[i].trim();
            
            if (cleanItem.indexOf("image_") === 0) {
                var id = cleanItem.substring(cleanItem.indexOf("_") + 1);
                mediaHtml += "<div class=\"mb-3 text-center w-100\"><img src=\"https://lh3.googleusercontent.com/d/$$" + id + "\" style=\"max-width: 100%; height: auto; max-height: 250px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.05); object-fit: contain;\"></div>";
            } 
            else if (cleanItem.indexOf("audio_") === 0 || cleanItem.indexOf("clip_") === 0) {
                var id = cleanItem.substring(cleanItem.indexOf("_") + 1);
                var type = cleanItem.indexOf("clip_") === 0 ? "clip" : "audio";
                var iconClass = type === "clip" ? "bi-play-btn" : "bi-volume-up";
                var btnText = type === "clip" ? "Clip" : "Audio";
                
                // Sử dụng mã &apos; để truyền biến an toàn tuyệt đối qua HTML
                mediaHtml += "<div class=\"mb-3 text-center\"><button class=\"btn btn-outline-primary rounded-pill px-4 fw-bold shadow-sm\" onclick=\"event.stopPropagation(); window.openMediaModal(&apos;" + id + "&apos;, &apos;" + type + "&apos;)\"><i class=\"bi " + iconClass + " me-1\"></i> " + btnText + "</button></div>";
            }
            else if (cleanItem.indexOf("http") === 0) {
                mediaHtml += "<div class=\"mb-3 text-center w-100\"><img src=\"" + cleanItem + "\" style=\"max-width: 100%; height: auto; max-height: 250px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.05); object-fit: contain;\"></div>";
            }
        }
    }
    return mediaHtml;
};

window.openMediaModal = function(id, type) {
    var modal = document.createElement("div");
    modal.className = "media-modal-overlay position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn";
    modal.style.cssText = "background: rgba(0,0,0,0.9); z-index: 99999; ";
    
    var content = "";
    if (type === "clip") {
        content = "<iframe src=\"https://drive.google.com/file/d/" + id + "/preview\" width=\"100%\" height=\"300\" frameborder=\"0\" allow=\"autoplay\" allowfullscreen style=\"border-radius: 12px; background:#000;\"></iframe>";
    } else {
        content = "<iframe src=\"https://drive.google.com/file/d/" + id + "/preview\" width=\"100%\" height=\"80\" frameborder=\"0\" allow=\"autoplay\" style=\"border-radius: 12px;\"></iframe>";
    }
    
    modal.innerHTML = "<div class=\"media-modal-content glass-panel p-3 shadow-lg\" style=\"width: 90%; max-width: 500px; border-radius: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.2);\"><button class=\"btn btn-sm btn-danger fw-bold rounded-pill px-4 mb-3 shadow-sm\" onclick=\"event.stopPropagation(); this.parentElement.parentElement.remove()\"><i class=\"bi bi-x-circle me-1\"></i> Đóng</button>" + content + "</div>";
    
    document.body.appendChild(modal);
};

window.openMediaModalGame = function(id, type, rawUrl) {
    var modal = document.createElement("div");
    modal.className = "media-modal-overlay position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn";
    modal.style.cssText = "background: rgba(0,0,0,0.9); z-index: 99999; ";
    
    var content = "";
    if (type === "clip") content = "<iframe src=\"https://drive.google.com/file/d/" + id + "/preview\" width=\"100%\" height=\"300\" frameborder=\"0\" allow=\"autoplay\" allowfullscreen style=\"border-radius: 12px; background:#000;\"></iframe>";
    else if (type === "audio") content = "<iframe src=\"https://drive.google.com/file/d/" + id + "/preview\" width=\"100%\" height=\"80\" frameborder=\"0\" allow=\"autoplay\" style=\"border-radius: 12px;\"></iframe>";
    else if (type === "image") content = "<img src=\"https://lh3.googleusercontent.com/d/$$" + id + "\" style=\"max-width: 100%; max-height: 70vh; border-radius: 12px; object-fit: contain;\">";
    else if (type === "link") content = "<img src=\"" + rawUrl + "\" style=\"max-width: 100%; max-height: 70vh; border-radius: 12px; object-fit: contain;\">";

    modal.innerHTML = "<div class=\"media-modal-content glass-panel p-3 shadow-lg animate__animated animate__zoomIn\" style=\"width: 90%; max-width: 700px; border-radius: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.2);\"><button class=\"btn btn-sm btn-danger fw-bold rounded-pill px-4 mb-3 shadow-sm\" onclick=\"event.stopPropagation(); this.parentElement.parentElement.remove()\"><i class=\"bi bi-x-circle me-1\"></i> Đóng</button><div class=\"text-center\">" + content + "</div></div>";
    
    document.body.appendChild(modal);
};

window.exportExamPackage = function(numVariants = 2) { alert("Đang chuẩn bị file Word..."); };
// [ĐÃ GỠ] run_health_check bản Google Apps Script -> xem bản Supabase/offline ở đầu file


// [ĐÃ GỠ BẢN TRÙNG] window.show_online_exam_modal (dòng cũ 2517-2607) - bản dùng thật nằm ở phía dưới file

// [ĐÃ GỠ BẢN TRÙNG] window.submit_online_exam_to_server (dòng cũ 2519-2532) - bản dùng thật nằm ở phía dưới file
// =========================================================================
// 📱 MODULE KHỞI TẠO TỔNG HỢP: SỬA LỖI GIAO DIỆN, BẢO MẬT & AUTO-LOCK SCROLL
// =========================================================================
document.addEventListener("DOMContentLoaded", function() {

    // ─── 1. SỬA LỖI GIAO DIỆN MOBILE (CHỐNG STICKY HOVER & FIX 3D FLASHCARD) ───
    const styleMobileFix = document.createElement('style');
    styleMobileFix.innerHTML = `
        /* Khóa cuộn cấp độ cao (dùng cho Modal) */
        body.no-scroll { overflow: hidden !important; touch-action: none !important; }

        @media (hover: none) and (pointer: coarse) {
            /* 🌟 ĐÃ FIX: Chỉ tắt hover cho các NÚT BẤM, bảo toàn không gian 3D cho Flashcard (.fc-wrap) */
            .btn:hover, button:hover, [class*="btn-"]:hover, .answer-btn:hover,
            label:hover, .list-group-item:hover, a:hover, 
            [class*="glass-btn"]:hover, .glass-action-btn:hover, .story-opt-btn:hover { 
                transform: none !important; box-shadow: none !important; 
            }
            .btn:active, button:active, [class*="btn-"]:active, .answer-btn:active,
            label:active, .list-group-item:active, 
            [class*="glass-btn"]:active, .glass-action-btn:active, .story-opt-btn:active, a:active { 
                transform: scale(0.97) translateY(2px) !important; transition: transform 0.1s !important; 
            }
        }
        
        .btn:focus:not(:focus-visible), button:focus:not(:focus-visible), [class*="btn-"]:focus:not(:focus-visible),
        label:focus:not(:focus-visible), .list-group-item:focus:not(:focus-visible), a:focus:not(:focus-visible), 
        [class*="glass-btn"]:focus:not(:focus-visible), .glass-action-btn:focus:not(:focus-visible) { 
            outline: none !important; box-shadow: none !important; transform: none !important; 
        }
    `;
    document.head.appendChild(styleMobileFix);

    // ─── 2. HỆ THỐNG BẢO MẬT (ANTI-CHEAT & ANTI-AI) ───
    const styleAntiCheat = document.createElement('style');
    styleAntiCheat.innerHTML = `
        @media print { body { display: none !important; } } 
        .anti-ai-blur { filter: blur(20px) grayscale(100%) !important; opacity: 0.1 !important; pointer-events: none !important; user-select: none !important; transition: all 0.05s ease-out; } 
        .unselectable { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
    `;
    document.head.appendChild(styleAntiCheat);
    document.body.classList.add('unselectable');
    document.body.setAttribute('translate', 'no');
    document.body.classList.add('notranslate');
    document.body.setAttribute('data-nosnippet', 'true'); 

    function is_exempt_from_anti_cheat() {
        let role = String(window.current_user_role || "").toLowerCase();
        let perms = String(window.current_user_permissions || window.current_permissions || "").toLowerCase();
        return role === "admin" || role === "all" || role === "teacher" || perms.includes("edit") || perms === "all";
    }

    document.addEventListener('contextmenu', function(e) { if (!is_exempt_from_anti_cheat()) e.preventDefault(); });
    document.addEventListener('selectstart', function(e) { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; if (!is_exempt_from_anti_cheat()) e.preventDefault(); });

    document.addEventListener('keydown', function(e) {
        if (is_exempt_from_anti_cheat()) return;
        if (e.key === 'F12' || e.keyCode === 123) e.preventDefault();
        if (e.ctrlKey && ['U', 'P', 'S'].includes(e.key.toUpperCase())) e.preventDefault();
        if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) e.preventDefault();
        if (e.metaKey && e.shiftKey && e.key.toUpperCase() === 'S') document.body.classList.add('anti-ai-blur');
    });

    document.addEventListener('keyup', function(e) {
        if (is_exempt_from_anti_cheat()) return;
        if (e.key === 'PrintScreen' || e.keyCode === 44) {
            document.body.classList.add('anti-ai-blur');
            if (navigator.clipboard) navigator.clipboard.writeText('Hành vi chụp ảnh đề thi đã bị chặn!');
            setTimeout(() => document.body.classList.remove('anti-ai-blur'), 2000);
        }
    });

    let quizContainer = document.getElementById('quiz_area');
    function applyBlurDefense() {
        let isAtMenu = (!quizContainer || quizContainer.innerHTML.trim() === '' || quizContainer.style.display === 'none');
        let isFinished = window.quiz_end_time != null; 
        if (!is_exempt_from_anti_cheat() && !isAtMenu && !isFinished) {
            document.body.classList.add('anti-ai-blur');
            document.body.offsetHeight;
        }
    }
    function removeBlurDefense() { if (document.hasFocus()) document.body.classList.remove('anti-ai-blur'); }

    window.addEventListener('blur', applyBlurDefense);
    document.addEventListener('mouseleave', function(e) { if(e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) applyBlurDefense(); });
    window.addEventListener('focus', removeBlurDefense);
    document.addEventListener('mouseenter', removeBlurDefense);
    document.addEventListener('mousemove', function() { if (!document.hasFocus() && !document.body.classList.contains('anti-ai-blur')) applyBlurDefense(); });
    document.addEventListener('copy', function(e) { if (!is_exempt_from_anti_cheat()) { e.preventDefault(); if (e.clipboardData) e.clipboardData.setData('text/plain', 'Dữ liệu mã hóa!'); } });


    // ─── 3. AUTO-LOCK SCROLL KHI MỞ MODAL/POPUP ───
    const modalObserver = new MutationObserver(function() {
        // Dò tìm sự xuất hiện của các modal hoặc lớp phủ
        const hasOpenModal = document.querySelector(
            '.custom-modal[style*="display: flex"], ' + 
            '.media-modal-overlay, ' + 
            '#subject_modal, ' + 
            '#user_modal, ' + 
            '#user_detail_modal, ' + 
            '#smart_vocab_modal[style*="opacity: 1"], ' + 
            '#result_area[style*="display: block"]'
        );
        
        // 🌟 BẢN VÁ: Gắn thêm class no-scroll để khóa cuộn triệt để trên Mobile
        if (hasOpenModal) {
            document.body.style.overflow = 'hidden';
            document.body.classList.add('no-scroll');
        } else {
            document.body.style.overflow = '';
            document.body.classList.remove('no-scroll');
        }
    });
    
    modalObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
});
// 🌟 HÀM TẠO THẺ THỐNG KÊ NẰM TRÊN NHẬT KÝ ÔN TẬP (CHỈ DÀNH CHO USER THƯỜNG CÓ QUYỀN)
window.render_stats_card_above_timeline = function() {
    // 🌟 ĐÃ FIX: Hủy hoàn toàn tính năng hiển thị Thống Kê trên giao diện của User để bảo mật
    let oldStatsCard = document.getElementById('stats_above_timeline_card');
    if (oldStatsCard) oldStatsCard.remove();
};
// =========================================================================
// 🌐 HÀM MỞ LINK TÀI LIỆU TRONG CỬA SỔ PHẦN MỀM (CÓ RADAR CHỐNG CHẶN IFRAME)
// =========================================================================
window.open_link_in_modal = function(url, title) {
    // 🌟 BỘ LỌC RADAR: Phát hiện các link cấm nhúng (OneDrive, Google Drive gốc...)
    let isBlockedDomain = url.includes('1drv.ms') || 
                          url.includes('onedrive.live.com') || 
                          url.includes('drive.google.com/drive/folders') ||
                          url.includes('facebook.com');

    // NẾU LÀ LINK BỊ CHẶN -> TỰ ĐỘNG BẬT RA TAB MỚI
    if (isBlockedDomain) {
        window.show_toast("🔗 Đang mở tài liệu bảo mật ở Tab mới...");
        window.open(url, '_blank');
        return; // Thoát hàm, không vẽ Modal nữa
    }

    // NẾU LÀ LINK AN TOÀN -> VẼ CỬA SỔ NHÚNG NHƯ BÌNH THƯỜNG
    let modalId = 'iframe_document_viewer';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove(); // Xóa cửa sổ cũ nếu có

    // Khóa cuộn trang nền
    document.body.style.overflow = 'hidden';

    let modalHtml = `
    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.9); z-index: 99999;  padding: 15px;">
        
        <div class="glass-panel p-0 shadow-lg d-flex flex-column w-100 h-100 animate__animated animate__zoomIn" style="max-width: 1200px; border-radius: 16px; background: #1a1a1a !important; border: 1px solid rgba(56, 189, 248, 0.5); overflow: hidden;">
            
            <!-- 🌟 HEADER -->
            <div class="d-flex justify-content-between align-items-center p-3 border-bottom flex-shrink-0" style="border-color: #2a2a2a !important; background: rgba(0,0,0,0.2);">
                <h6 class="fw-bold text-info mb-0 text-truncate pe-3" style="font-size: 1.1rem;">
                    <i class="bi bi-window-fullscreen me-2"></i>${title}
                </h6>
                <div class="d-flex gap-2 flex-shrink-0">
                    <button class="btn btn-sm btn-outline-info rounded-pill px-3 fw-bold shadow-sm" onclick="window.open('${url}', '_blank')">
                        <i class="bi bi-box-arrow-up-right me-1"></i> Mở Tab Mới
                    </button>
                    <button class="btn btn-sm btn-danger rounded-pill px-3 fw-bold shadow-sm" onclick="document.getElementById('${modalId}').remove(); document.body.style.overflow = '';">
                        <i class="bi bi-x-circle me-1"></i> Đóng
                    </button>
                </div>
            </div>
            
            <!-- 🌟 BODY (Iframe) -->
            <div class="flex-grow-1 position-relative w-100 h-100 bg-dark" style="border-radius: 0 0 16px 16px; overflow: hidden;">
                <div class="position-absolute top-50 start-50 translate-middle text-center text-white-50 z-0">
                    <div class="spinner-border mb-2" style="color: #38bdf8; width: 3rem; height: 3rem;"></div>
                    <div class="small fw-bold">Đang tải dữ liệu từ đám mây...</div>
                </div>
                <iframe src="${url}" class="position-relative z-1 w-100 h-100" style="border: none;" allowfullscreen allow="autoplay; fullscreen"></iframe>
            </div>
            
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};
// =========================================================================
// 🎒 BẢNG KHO BÁU MINI (GIAO DIỆN TỐI GIẢN & ĐỔI THƯỞNG BẬC THANG)
// =========================================================================


// 🌟 HÀM TẠO ÂM THANH GAME & GIỌNG ĐỌC AI (KILLSTREAK)
window.play_sound = function(type) {
    try {
        let AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        let ctx = new AudioContext();
        let playTone = (freq, type, duration, startTime) => {
            let osc = ctx.createOscillator(); let gain = ctx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + startTime + duration);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(ctx.currentTime + startTime); osc.stop(ctx.currentTime + startTime + duration);
        };
        if (type === 'correct') { playTone(600, 'sine', 0.1, 0); playTone(800, 'sine', 0.15, 0.1); } 
        else if (type === 'reward') { playTone(400, 'sine', 0.1, 0); playTone(523.25, 'sine', 0.1, 0.1); playTone(659.25, 'sine', 0.1, 0.2); playTone(1046.50, 'sine', 0.3, 0.3); } 
        else if (type === 'finish') { playTone(523.25, 'sine', 0.2, 0); playTone(659.25, 'sine', 0.2, 0.15); playTone(783.99, 'sine', 0.2, 0.3); playTone(1046.50, 'sine', 0.4, 0.45); } 
        else if (type === 'error') { playTone(300, 'sawtooth', 0.15, 0); playTone(200, 'sawtooth', 0.25, 0.15); }
    } catch(e) {}
};

window.speak_voice = function(text) {
    if ('speechSynthesis' in window) {
        let msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'en-US'; msg.rate = 1.1; msg.pitch = 0.9; msg.volume = 1;
        window.speechSynthesis.speak(msg);
    }
};

// 🌟 TỪ ĐIỂN CẤU HÌNH (THÊM VÉ QUAY GACHA)
window.REWARD_CONFIG = {
    "Vé Quay Gacha 🎟️": { icon: "🎟️", shortName: "Vé Gacha", rewardIcon: "🎲", baseMins: 0, action: "MỞ GÓI THƯỞNG", color: "#f43f5e" },
    "10 Triệu BP 💰": { icon: "💰", shortName: "10Tr BP", rewardIcon: "🎵", baseMins: 5, action: "TIKTOK", color: "#2dd4bf" },
    "Giáp 3 Mũ 3 🛡️": { icon: "🛡️", shortName: "Giáp 3", rewardIcon: "📱", baseMins: 10, action: "IPHONE", color: "#38bdf8" },
    "Thẻ Nâng Cấp +5 🌟": { icon: "🌟", shortName: "Thẻ +5", rewardIcon: "▶️", baseMins: 15, action: "YOUTUBE", color: "#f87171" },
    "Thẻ Đổi Tên 🏷️": { icon: "🏷️", shortName: "Đổi Tên", rewardIcon: "🎮", baseMins: 20, action: "CHƠI GAME", color: "#a855f7" },
    "Thẻ Tạo Phòng 🚪": { icon: "🚪", shortName: "Tạo Phòng", rewardIcon: "🔫", baseMins: 30, action: "FREE FIRE", color: "#fb923c" },
    "Booyah Pass 🎫": { icon: "🎫", shortName: "Pass", rewardIcon: "📺", baseMins: 45, action: "XEM TV", color: "#facc15" },
    "Thẻ ICON +8 🏆": { icon: "🏆", shortName: "ICON +8", rewardIcon: "📱", baseMins: 60, action: "IPHONE", color: "#e879f9" },
    "Gói Cầu Thủ Gullit 👑": { icon: "👑", shortName: "Gullit", rewardIcon: "🌈", baseMins: 0, action: "CHƠI TỰ DO", color: "#fbbf24" }
};


window.toggle_inventory_popover = function(event) {
    // 🌟 ĐÃ FIX: Khóa mở túi đồ khi đang trong chế độ làm bài thi
    if (window.is_study_mode === false) { 
        if (typeof window.play_sound === 'function') window.play_sound('error'); 
        return window.show_toast("⚠️ TÍNH NĂNG BỊ KHÓA: Không được mở túi đồ khi đang thi!", true); 
    }

    if (event) event.stopPropagation();
    let popoverId = 'game_inventory_popover';
    if (document.getElementById(popoverId)) { document.getElementById(popoverId).remove(); return; } 

    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let colKey = 'mcq_col_' + (window.current_student_id || 'guest');
    let inventory = parseInt(localStorage.getItem(invKey)) || 0;
    
    let colList = [];
    try { colList = JSON.parse(localStorage.getItem(colKey) || "[]"); } catch(e) {}

    let groupedItems = {};
    colList.forEach(item => { groupedItems[item] = (groupedItems[item] || 0) + 1; });

    let itemsHtml = "";
    let itemKeys = Object.keys(groupedItems);
    
    // Đẩy Vé Gacha lên đầu danh sách
    itemKeys.sort((a, b) => a.includes("Vé Quay Gacha") ? -1 : 1);

    if (itemKeys.length === 0) {
        itemsHtml = `<div class="text-center p-3 text-white-50 w-100"><i class="bi bi-inbox fs-3 mb-1 d-block opacity-50"></i><span style="font-size:0.75rem;">Chưa rớt món nào.</span></div>`;
    } else {
        itemKeys.forEach((itemName, idx) => {
            let count = groupedItems[itemName];
            let cfg = window.REWARD_CONFIG[itemName] || { icon: "🎁", shortName: "Bí ẩn", rewardIcon: "✨", baseMins: 0, action: "QUÀ BÍ MẬT", color: "#fff" };
            
            let safeName = itemName.replace(/'/g, "\\'"); 
            let displayVal = cfg.baseMins > 0 ? cfg.baseMins + "'" : (itemName.includes("Vé") ? "QUAY" : "VIP");
            let animClass = itemName.includes("Vé") ? "animate__pulse animate__infinite" : "";

            itemsHtml += `
            <div class="col-4 px-1 mb-2 animate__animated animate__zoomIn" style="animation-delay: ${idx * 0.05}s;">
                <div class="p-2 d-flex flex-column align-items-center justify-content-center position-relative shadow-sm stat-card-hover ${animClass}" 
                     style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; height: 80px; cursor: pointer;"
                     onclick="window.redeem_item('${safeName}', ${count})" title="Bấm để tương tác!">
                    
                    <div class="position-absolute badge rounded-pill bg-danger shadow-sm" style="top: -5px; right: -5px; font-size: 0.65rem; border: 1px solid #fff; z-index: 2;">x${count}</div>
                    <div class="mb-1" style="font-size: 1.8rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); line-height: 1;">${cfg.icon}</div>
                    <div class="fw-bold text-center w-100 text-truncate" style="font-size: 0.55rem; color: rgba(255,255,255,0.7);">${cfg.shortName}</div>
                    
                    <div class="mt-auto w-100 pt-1 border-top d-flex align-items-center justify-content-center gap-1" style="border-color: #2a2a2a !important; color: ${cfg.color};">
                        <span style="font-size: 0.7rem;">${cfg.rewardIcon}</span>
                        <span class="fw-bold" style="font-size: 0.65rem;">${displayVal}</span>
                    </div>
                </div>
            </div>`;
        });
    }

    let rect = event.currentTarget.getBoundingClientRect();
    let topPos = rect.bottom + 10; 
    let rightPos = window.innerWidth - rect.right; 
    if (window.innerWidth < 350) rightPos = 10;

    let fullName = window.current_student_name || window.current_student_id || "BẠN";
    let shortName = fullName.split(' ').pop().toUpperCase();

    let popoverHtml = `
    <style>.popover-enter { animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; transform-origin: top right; } @keyframes popIn { 0% { opacity: 0; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }</style>
    <div id="${popoverId}" class="popover-enter" 
         style="position: fixed; top: ${topPos}px; right: ${rightPos}px; width: 280px; z-index: 9999999; 
                background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(56, 189, 248, 0.5); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
        
        <div style="position: absolute; top: -8px; right: 15px; width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 8px solid rgba(56, 189, 248, 0.5);"></div>
        <div class="p-2 d-flex justify-content-between align-items-center border-bottom" style="border-color: #2a2a2a !important;">
            <h6 class="fw-bold text-info mb-0" style="font-size: 0.8rem;"><i class="bi bi-backpack me-1"></i> TÚI ĐỒ CỦA ${shortName}</h6>
            <button class="btn-close btn-close-white" style="font-size: 0.6rem;" onclick="document.getElementById('${popoverId}').remove()"></button>
        </div>
        
        <div class="p-2 custom-scrollbar" style="max-height: 60vh; overflow-y: auto; overflow-x: hidden;">
            <div class="d-flex align-items-center justify-content-between p-2 mb-3 shadow-sm" style="background: rgba(245, 158, 11, 0.15); border-radius: 12px; border: 1px dashed rgba(245, 158, 11, 0.4);">
                <div class="d-flex align-items-center gap-2">
                    <div class="rounded-circle d-flex justify-content-center align-items-center" style="width:30px; height:30px; background:rgba(0,0,0,0.3); font-size:1.2rem;">🎁</div>
                    <div class="text-warning fw-bold" style="font-size: 0.75rem;">Cứu Sai / Trợ giúp</div>
                </div>
                <div class="fw-bold text-white d-flex align-items-center gap-1" style="font-size: 1.2rem;">
                    <span style="font-size: 0.7rem; color: #facc15;">x</span>${inventory}
                </div>
            </div>
            <div class="row g-1 w-100 m-0 pb-1">
                ${itemsHtml}
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', popoverHtml);
    setTimeout(() => {
        document.addEventListener('click', function closePopover(e) {
            let pop = document.getElementById(popoverId);
            let modal = document.getElementById('tier_redeem_modal');
            if (pop && !pop.contains(e.target) && (!modal || !modal.contains(e.target))) { 
                pop.remove(); document.removeEventListener('click', closePopover); 
            }
        });
    }, 100);
};

// 🌟 XỬ LÝ MỞ GACHA HOẶC ĐỔI QUÀ
window.redeem_item = function(itemName, count) {
    let step3 = document.getElementById('step_3'); let resArea = document.getElementById('result_area');
    let isDoingQuiz = step3 && step3.style.display !== 'none' && (!resArea || resArea.style.display === 'none');
    
    if (isDoingQuiz) {
        let pop = document.getElementById('game_inventory_popover'); if(pop) pop.remove();
        window.play_sound('error');
        return window.show_toast("⚠️ TẬP TRUNG LÀM BÀI! Chỉ được tương tác khi đã nộp bài.", true);
    }

    // 🎯 ĐẶC QUYỀN MỞ GACHA (Mở ngay lập tức không cần chờ 10 cái)
    if (itemName.includes("Vé Quay Gacha")) {
        window.open_gacha();
        return;
    }

    if (count < 10) {
        window.play_sound('error');
        return window.show_toast(`⚠️ CHƯA ĐỦ ĐIỀU KIỆN! Con cần tích lũy 10 vật phẩm. (Đang có: x${count})`, true);
    }

    let today = new Date().toLocaleDateString('vi-VN');
    let dailyKey = 'mcq_imessage_limit_' + (window.current_student_id || 'guest');
    let limitData = JSON.parse(localStorage.getItem(dailyKey) || '{"date":"","count":0}');
    if (limitData.date !== today) limitData = { date: today, count: 0 };

    if (limitData.count >= 10) {
        window.play_sound('error');
        return window.show_toast(`⚠️ HẾT LƯỢT! Hôm nay con đã dùng hết 10/10 lần gửi yêu cầu đổi quà.`, true);
    }

    let existingPop = document.getElementById('game_inventory_popover'); if (existingPop) existingPop.remove(); 
    let oldModal = document.getElementById('tier_redeem_modal'); if(oldModal) oldModal.remove();

    let cfg = window.REWARD_CONFIG[itemName] || { icon: "🎁", shortName: "Bí ẩn", rewardIcon: "✨", baseMins: 0, action: "QUÀ BÍ MẬT", color: "#38bdf8" };
    let safeName = itemName.replace(/'/g, "\\'");

    let tierHtml = "";
    let buildTierBtn = (qty) => {
        let totalMins = cfg.baseMins * qty;
        let displayReward = cfg.baseMins > 0 ? `+${totalMins} PHÚT` : `x${qty} LẦN`;
        return `
        <button class="btn w-100 mb-2 d-flex justify-content-between align-items-center px-3 py-2 shadow-sm stat-card-hover" 
                style="background: rgba(255,255,255,0.05); border: 1px solid ${cfg.color}50; border-radius: 10px; color: #fff;"
                onclick="window.execute_redeem('${safeName}', ${qty}, '${displayReward} ${cfg.action}', '${cfg.color}')">
            <div class="fw-bold" style="font-size: 0.85rem;">Đổi ${qty} vật phẩm</div>
            <div class="fw-bold text-end" style="color: ${cfg.color}; font-size: 0.9rem;">${cfg.rewardIcon} ${displayReward}</div>
        </button>`;
    };

    tierHtml += buildTierBtn(10);
    if (count >= 20) tierHtml += buildTierBtn(20);
    if (count > 10 && count !== 20) tierHtml += buildTierBtn(count); 

    let html = `
    <div id="tier_redeem_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style="background: rgba(0,0,0,0.8); z-index: 9999999; backdrop-filter: blur(5px);">
        <div class="glass-panel p-3 animate__animated animate__zoomIn shadow-lg" style="width: 320px; border-radius: 20px; border: 1px solid ${cfg.color}; background: rgba(15, 23, 42, 0.95);">
            <div class="text-center mb-3 mt-2">
                <div style="font-size: 3rem; filter: drop-shadow(0 0 10px ${cfg.color}); line-height: 1;">${cfg.icon}</div>
                <h6 class="fw-bold text-white mt-2 mb-0" style="letter-spacing: 0.5px;">${itemName}</h6>
                <div class="text-white-50" style="font-size: 0.8rem;">Kho đang có: <span class="fw-bold text-white">x${count}</span></div>
                <div class="text-warning mt-1" style="font-size: 0.7rem;"><i class="bi bi-info-circle"></i> Hôm nay còn ${10 - limitData.count} lượt gửi iMessage</div>
            </div>
            
            <div class="mb-3 border-top pt-3" style="border-color: #2a2a2a !important;">
                <div class="text-center text-white-50 mb-2 fw-bold" style="font-size: 0.7rem; text-transform: uppercase;">Chọn số lượng quy đổi (x10 trở lên):</div>
                ${tierHtml}
            </div>
            
            <button class="btn btn-sm btn-outline-secondary w-100 rounded-pill" onclick="this.parentElement.parentElement.remove()">HỦY GIAO DỊCH</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
};

// 🌟 HÀM TẠO HIỆU ỨNG MỞ GACHA ẢO DIỆU
window.open_gacha = function() {
    let colKey = 'mcq_col_' + (window.current_student_id || 'guest');
    let colList = [];
    try { colList = JSON.parse(localStorage.getItem(colKey) || "[]"); } catch(e){}
    
    let idx = colList.indexOf("Vé Quay Gacha 🎟️");
    if (idx === -1) return; 
    
    colList.splice(idx, 1); // Trừ 1 vé
    
    // TỈ LỆ RỚT ĐỒ (GACHA RATE)
    let rand = Math.random() * 100;
    let wonItem = "";
    if (rand < 40) wonItem = "10 Triệu BP 💰";
    else if (rand < 70) wonItem = "Giáp 3 Mũ 3 🛡️";
    else if (rand < 85) wonItem = "Thẻ Nâng Cấp +5 🌟";
    else if (rand < 92) wonItem = "Thẻ Đổi Tên 🏷️";
    else if (rand < 96) wonItem = "Thẻ Tạo Phòng 🚪";
    else if (rand < 98.5) wonItem = "Booyah Pass 🎫";
    else if (rand < 99.8) wonItem = "Thẻ ICON +8 🏆";
    else wonItem = "Gói Cầu Thủ Gullit 👑";

    colList.push(wonItem);
    localStorage.setItem(colKey, JSON.stringify(colList));
    
    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let inv = parseInt(localStorage.getItem(invKey)) || 0;
    window.sync_user_inventory(window.current_student_id, inv, JSON.stringify(colList));

    let pop = document.getElementById('game_inventory_popover'); if (pop) pop.remove();

    // HIỆU ỨNG HỒI HỘP ĐANG MỞ
    let overlayId = 'gacha_anim';
    let old = document.getElementById(overlayId); if(old) old.remove();
    
    let html = `
    <div id="${overlayId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style="background: rgba(15, 23, 42, 0.95); z-index: 9999999; ">
        <div id="${overlayId}_box" class="text-center animate__animated animate__shakeX animate__infinite" style="animation-duration: 0.3s;">
            <div style="font-size: 7rem; filter: drop-shadow(0 0 25px #f43f5e);">🎟️</div>
            <h3 class="text-white fw-bold mt-3 text-uppercase" style="letter-spacing: 2px;">Đang giải mã...</h3>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    
    window.play_sound('error'); // Dùng âm thanh error để tạo tiếng giật giật hồi hộp

    // SAU 1.8s NỔ RA VẬT PHẨM
    setTimeout(() => {
        let box = document.getElementById(overlayId + '_box');
        let cfg = window.REWARD_CONFIG[wonItem];
        if(box) {
            box.className = "text-center animate__animated animate__flipInY";
            box.innerHTML = `
                <div class="mb-3" style="font-size: 8rem; filter: drop-shadow(0 0 40px ${cfg.color}); line-height: 1;">${cfg.icon}</div>
                <h1 class="fw-bold mt-2 text-uppercase px-3" style="color: ${cfg.color}; text-shadow: 0 4px 15px rgba(0,0,0,0.5);">${wonItem}</h1>
                <div class="text-white-50 mb-4 fw-bold" style="font-size: 0.9rem;">Senal vừa bốc được bảo vật xịn!</div>
                <button class="btn px-5 py-3 fw-bold rounded-pill shadow-lg" style="background: ${cfg.color}; color: #000; font-size: 1.1rem; border: 2px solid #fff;" onclick="document.getElementById('${overlayId}').remove()">CẤT VÀO TÚI ĐỒ</button>
            `;
            window.play_sound('finish');
            if (typeof confetti === 'function') confetti({ particleCount: 250, spread: 150, colors: [cfg.color, '#ffffff'] });
            window.try_render_menu();
        }
    }, 1800);
};

window.execute_redeem = function(itemName, qty, totalRewardText, colorCode) {
    let colKey = 'mcq_col_' + (window.current_student_id || 'guest');
    let colList = [];
    try { colList = JSON.parse(localStorage.getItem(colKey) || "[]"); } catch(e) {}

    let removedCount = 0;
    for (let i = colList.length - 1; i >= 0; i--) {
        if (colList[i] === itemName && removedCount < qty) {
            colList.splice(i, 1);
            removedCount++;
        }
    }

    let colStr = JSON.stringify(colList);
    localStorage.setItem(colKey, colStr);

    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let inventory = parseInt(localStorage.getItem(invKey)) || 0;
    window.sync_user_inventory(window.current_student_id, inventory, colStr);

    let tierModal = document.getElementById('tier_redeem_modal'); if (tierModal) tierModal.remove();

    let today = new Date().toLocaleDateString('vi-VN');
    let dailyKey = 'mcq_imessage_limit_' + (window.current_student_id || 'guest');
    let limitData = JSON.parse(localStorage.getItem(dailyKey) || '{"date":"","count":0}');
    if (limitData.date !== today) limitData = { date: today, count: 0 };
    limitData.count += 1;
    localStorage.setItem(dailyKey, JSON.stringify(limitData));

    // 🔴 ĐÃ CẬP NHẬT SỐ ĐIỆN THOẠI CỦA THẦY
    let phoneNumber = "0905106848"; 
    
    let studentName = window.current_student_name || window.current_student_id || "BẠN";
    let shortName = studentName.split(' ').pop().toUpperCase(); 
    
    let smsMsg = `🎉 TING TING! BÁO CÁO ĐỔI THƯỞNG:\n\n👤 ${shortName} vừa tiêu hao: ${qty} x [${itemName}]\n🎁 Yêu cầu nhận: ${totalRewardText}\n\n👉 Ba duyệt cho con nhé!`;

    let toastId = 'redeem_success_toast';
    let old = document.getElementById(toastId); if(old) old.remove();

    let toastHtml = `
    <div id="${toastId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.9); z-index: 9999999;">
        <div class="badge rounded-4 px-4 py-4 shadow-lg d-flex flex-column align-items-center gap-3 animate__animated animate__zoomIn" style="background: rgba(15, 23, 42, 0.95); border: 2px solid ${colorCode}; box-shadow: 0 10px 40px rgba(0,0,0,0.8); max-width: 320px; white-space: normal;">
            <div style="font-size: 4rem; line-height: 1; filter: drop-shadow(0 0 15px ${colorCode});">🎉</div>
            <div class="text-center w-100">
                <div class="text-white-50 fw-bold mb-1" style="font-size: 0.85rem;">Đổi thành công ${qty} vật phẩm</div>
                <div class="fw-bold mb-3" style="font-size: 1.3rem; color: ${colorCode}; letter-spacing: 0.5px;">${totalRewardText}</div>
                <div class="text-warning mb-3" style="font-size: 0.75rem;">(Hôm nay con còn <b class="text-white">${10 - limitData.count}</b> lần gửi yêu cầu)</div>
                <button class="btn w-100 fw-bold py-3 mb-2 d-flex align-items-center justify-content-center gap-2 shadow stat-card-hover" 
                        style="background: #34C759; color: white; border-radius: 12px; font-size: 0.9rem;" 
                        onclick="window.send_imessage_receipt('${encodeURIComponent(smsMsg)}', '${phoneNumber}')">
                    <i class="bi bi-chat-text-fill fs-5"></i> GỬI DUYỆT QUA iMESSAGE
                </button>
                <button class="btn btn-sm btn-outline-secondary w-100 rounded-pill mt-2 py-2 fw-bold" onclick="document.getElementById('${toastId}').remove()">Đóng</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', toastHtml);
    window.try_render_menu(); 
    if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 100, origin: { y: 0.4 }, zIndex: 9999999 });
};

window.send_imessage_receipt = function(encodedMsg, phone) {
    let msg = decodeURIComponent(encodedMsg);
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(msg);
    else {
        let textArea = document.createElement("textarea"); textArea.value = msg; document.body.appendChild(textArea);
        textArea.focus(); textArea.select();
        try { document.execCommand('copy'); } catch (err) {} document.body.removeChild(textArea);
    }
    let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isMobile) {
        window.show_alert("ĐÃ COPY YÊU CẦU", `Hệ thống phát hiện con đang dùng Máy tính.\n\n👉 Biên lai đã được Copy. Hãy mở Tin nhắn trên máy tính và bấm Paste (Dán) để gửi cho Ba nhé!`, false);
        return;
    }
    window.show_toast("Đã Copy! Nếu máy không tự mở, con hãy tự vào tin nhắn để dán nhé.");
    setTimeout(() => {
        let isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent)) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        let separator = isIOS ? '&' : '?'; let smsUrl = 'sms:' + phone + separator + 'body=' + encodedMsg;
        let a = document.createElement('a'); a.href = smsUrl; a.target = "_top"; 
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }, 600); 
};
// =========================================================================
// 🎯 HỆ THỐNG LỤC GIÁC NHIỆM VỤ TÍCH HỢP ICON THỨ HẠNG (RANK TỐI GIẢN)
// =========================================================================

// 🌟 1. NÂNG CẤP ICON RANK (BỎ HIỆU ỨNG GIẬT LAG, RÊ CHUỘT MƯỢT MÀ)
window.get_user_rank_html = function(isMini = false) {
    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let colKey = 'mcq_col_' + (window.current_student_id || 'guest');
    let inv = parseInt(localStorage.getItem(invKey)) || 0;
    let colList = []; try { colList = JSON.parse(localStorage.getItem(colKey) || "[]"); } catch(e){}
    let totalPower = inv + (colList.length * 5); 

    let rank = { icon: "🥉", color: "#d97706", power: totalPower }; 
    if (totalPower >= 100) rank = { icon: "👑", color: "#ef4444", power: totalPower }; 
    else if (totalPower >= 50) rank = { icon: "💠", color: "#06b6d4", power: totalPower }; 
    else if (totalPower >= 20) rank = { icon: "🥇", color: "#eab308", power: totalPower }; 
    else if (totalPower >= 5) rank = { icon: "🥈", color: "#94a3b8", power: totalPower }; 

    let size = isMini ? 1.4 : 2.2; // Thu nhỏ huy hiệu trong Quiz 

    return `<div onclick="window.open_esport_hub()" class="d-flex align-items-center justify-content-center" 
                 style="cursor: pointer; z-index: 999; flex-shrink: 0; filter: drop-shadow(0 0 10px ${rank.color}90); transition: transform 0.2s ease-out;" 
                 onmouseover="this.style.transform='scale(1.2)'" 
                 onmouseout="this.style.transform='scale(1)'"
                 title="Nhấn xem Kỹ năng & Nhiệm vụ" data-power="${rank.power}">
                <span style="font-size: ${size}rem; line-height: 1; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.6)); pointer-events: none;">${rank.icon}</span>
            </div>`;
};

// 🌟 2. DỜI ICON SANG TRÁI ĐỒNG HỒ & FIX LỖI CLICK TRƯỢT
window.init_esport_features = function() {
    let quizInvBadge = document.getElementById('mini_inventory_badge');
    
    if (quizInvBadge) {
        let rankWrapper = document.getElementById('quiz_rank_wrapper');
        
        if (!rankWrapper) {
            rankWrapper = document.createElement('div');
            rankWrapper.id = "quiz_rank_wrapper";
            rankWrapper.style.marginRight = "6px"; // Thu hẹp khoảng cách cho gọn
            
            // Tìm chính xác bọc ngoài của Đồng hồ (chống lỗi rớt sang phải)
            let timer = document.getElementById('timer_display') || document.getElementById('quiz_timer') || document.getElementById('timer') || document.querySelector('.timer');
            
            if (timer) {
                let timerBlock = timer.closest('.badge, .btn, .d-flex') || timer;
                if (timerBlock.parentElement) {
                    timerBlock.parentElement.style.display = 'flex';
                    timerBlock.parentElement.style.alignItems = 'center';
                    timerBlock.parentElement.insertBefore(rankWrapper, timerBlock); // ÉP VÀO BÊN TRÁI
                }
            } else {
                let quizInvBtn = quizInvBadge.closest('.btn, [onclick]') || quizInvBadge.parentElement;
                if (quizInvBtn && quizInvBtn.parentElement) {
                    quizInvBtn.parentElement.style.display = 'flex';
                    quizInvBtn.parentElement.style.alignItems = 'center';
                    quizInvBtn.parentElement.insertBefore(rankWrapper, quizInvBtn);
                }
            }
        }
        
        // CHỈ cập nhật html khi lực chiến thay đổi (Ngăn chặn lỗi bấm trượt do tải lại liên tục)
        let newHtml = window.get_user_rank_html(true);
        if (rankWrapper.innerHTML !== newHtml) {
            rankWrapper.innerHTML = newHtml;
        }
    }
};
setInterval(window.init_esport_features, 500);

// 🌟 3. BẢNG CHỈ SỐ NHIỆM VỤ
window.open_esport_hub = function() {
    let oldHub = document.getElementById('esport_hub_modal'); if(oldHub) oldHub.remove();
    
    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let colKey = 'mcq_col_' + (window.current_student_id || 'guest');
    let inventory = parseInt(localStorage.getItem(invKey)) || 0;
    let colList = []; try { colList = JSON.parse(localStorage.getItem(colKey) || "[]"); } catch(e){}
    
    let uniqueItems = new Set(colList).size;
    let stats = [
        Math.min(99, 65 + (inventory * 0.5)), Math.min(99, 70 + uniqueItems * 5), Math.min(99, 60 + (colList.length * 2)),
        Math.min(99, 50 + inventory), 85, Math.min(99, 75 + (colList.includes("Gói Cầu Thủ Gullit 👑") ? 20 : 0)) 
    ];
    let labels = ["Tốc độ", "Chính xác", "Combo", "Cày cuốc", "Kỷ luật", "May mắn"];
    
    let cx = 100, cy = 100, r = 70; 
    let getPoly = (vals, rad) => vals.map((v, i) => { let a = (Math.PI/3)*i - (Math.PI/2); let valR = (v/100)*rad; return `${cx + valR*Math.cos(a)},${cy + valR*Math.sin(a)}`; }).join(" ");
    
    let radarHtml = `
    <svg width="150" height="150" viewBox="0 0 200 200" class="mx-auto d-block mt-2" style="filter: drop-shadow(0 0 8px rgba(56,189,248,0.4));">
        <polygon points="${getPoly([100,100,100,100,100,100], r)}" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        <polygon points="${getPoly([75,75,75,75,75,75], r)}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
        <polygon points="${getPoly([50,50,50,50,50,50], r)}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        ${[0,1,2,3,4,5].map(i => `<line x1="${cx}" y1="${cy}" x2="${cx + r * Math.cos((Math.PI/3)*i - Math.PI/2)}" y2="${cy + r * Math.sin((Math.PI/3)*i - Math.PI/2)}" stroke="rgba(255,255,255,0.2)"/>`).join('')}
        <polygon points="${getPoly(stats, r)}" fill="rgba(56, 189, 248, 0.4)" stroke="#38bdf8" stroke-width="2"/>
        ${labels.map((lb, i) => {
            let a = (Math.PI/3)*i - (Math.PI/2); let tx = cx + (r+18)*Math.cos(a); let ty = cy + (r+14)*Math.sin(a);
            return `<text x="${tx}" y="${ty-6}" fill="#94a3b8" font-size="10" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${lb}</text>
                    <text x="${tx}" y="${ty+8}" fill="#fff" font-size="12" font-weight="900" text-anchor="middle" dominant-baseline="middle">${Math.floor(stats[i])}</text>`;
        }).join('')}
    </svg>`;

    let today = new Date().toLocaleDateString('vi-VN');
    let questKey = 'mcq_quests_' + (window.current_student_id || 'guest');
    let qData = JSON.parse(localStorage.getItem(questKey) || '{"date":"","q1":false,"q2":false,"q3":false}');
    if (qData.date !== today) qData = { date: today, q1: false, q2: false, q3: false };

    let q1_done = qData.q1 ? 'disabled class="btn btn-sm btn-secondary py-0"' : 'class="btn btn-sm btn-success py-0" onclick="window.claim_quest(1, 5, 0, \'🎁\')"';
    let q2_ready = inventory >= 30;
    let q2_btn = qData.q2 ? 'disabled class="btn btn-sm btn-secondary py-0"' : (q2_ready ? 'class="btn btn-sm btn-success py-0" onclick="window.claim_quest(2, 0, \'Vé Quay Gacha 🎟️\', \'🎟️\')"' : 'disabled class="btn btn-sm btn-outline-warning py-0"');
    let q3_ready = uniqueItems >= 3;
    let q3_btn = qData.q3 ? 'disabled class="btn btn-sm btn-secondary py-0"' : (q3_ready ? 'class="btn btn-sm btn-success py-0" onclick="window.claim_quest(3, 0, \'Giáp 3 Mũ 3 🛡️\', \'🛡️\')"' : 'disabled class="btn btn-sm btn-outline-warning py-0"');

    let html = `
    <div id="esport_hub_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style="background: rgba(0,0,0,0.9); z-index: 9999999; backdrop-filter: blur(5px);">
        <div class="glass-panel p-3 animate__animated animate__zoomIn shadow-lg" style="width: 300px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(15, 23, 42, 0.95);">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <h6 class="fw-bold text-info mb-0" style="font-size: 0.9rem;"><i class="bi bi-shield-shaded"></i> KỸ NĂNG & NHIỆM VỤ</h6>
                <button class="btn-close btn-close-white" style="font-size: 0.7rem;" onclick="document.getElementById('esport_hub_modal').remove()"></button>
            </div>
            ${radarHtml}
            <div class="mt-3 border-top pt-2" style="border-color: #2a2a2a !important;">
                <div class="d-flex justify-content-between align-items-center p-1 px-2 mb-1 rounded" style="background: rgba(255,255,255,0.05);">
                    <span class="text-white fw-bold" style="font-size: 0.75rem;">1. Điểm danh</span>
                    <button ${q1_done} style="border-radius: 6px; font-size: 0.75rem; padding: 2px 8px;">+5 🎁</button>
                </div>
                <div class="d-flex justify-content-between align-items-center p-1 px-2 mb-1 rounded" style="background: rgba(255,255,255,0.05);">
                    <span class="text-white fw-bold" style="font-size: 0.75rem;">2. Cày 30 Quà (${inventory}/30)</span>
                    <button ${q2_btn} style="border-radius: 6px; font-size: 0.75rem; padding: 2px 8px;">Nhận 🎟️</button>
                </div>
                <div class="d-flex justify-content-between align-items-center p-1 px-2 rounded" style="background: rgba(255,255,255,0.05);">
                    <span class="text-white fw-bold" style="font-size: 0.75rem;">3. Bóc 3 Món (${uniqueItems}/3)</span>
                    <button ${q3_btn} style="border-radius: 6px; font-size: 0.75rem; padding: 2px 8px;">Nhận 🛡️</button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
};

// 🌟 4. HÀM NHẬN QUÀ CÓ HIỆU ỨNG BAY VÀO VÍ
window.claim_quest = function(qNum, giftCount, itemDrop, icon) {
    let modal = document.getElementById('esport_hub_modal'); 
    if(modal) modal.remove();

    let today = new Date().toLocaleDateString('vi-VN');
    let questKey = 'mcq_quests_' + (window.current_student_id || 'guest');
    let qData = JSON.parse(localStorage.getItem(questKey) || '{"date":"","q1":false,"q2":false,"q3":false}');
    if (qData.date !== today) qData = { date: today, q1: false, q2: false, q3: false };
    
    qData[`q${qNum}`] = true;
    localStorage.setItem(questKey, JSON.stringify(qData));

    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let colKey = 'mcq_col_' + (window.current_student_id || 'guest');
    let inventory = parseInt(localStorage.getItem(invKey)) || 0;
    
    if (giftCount > 0) inventory += giftCount;
    localStorage.setItem(invKey, inventory);
    
    let finalColStr = localStorage.getItem(colKey) || "[]";
        if (itemDrop) {
            let colList = []; try { colList = JSON.parse(finalColStr); } catch(e){}
            colList.push(itemDrop);
            finalColStr = JSON.stringify(colList);
            localStorage.setItem(colKey, finalColStr);
        }

        // 🌟 ĐÃ FIX: Đẩy túi đồ lên Supabase ngay lập tức khi vừa nhận xong quà nhiệm vụ
        window.sync_user_inventory(window.current_student_id, inventory, finalColStr);

        if (typeof window.play_sound === 'function') window.play_sound('reward');

    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;
    let endX = window.innerWidth - 40; 
    let endY = 40; 
    
    let badge = document.getElementById('dashboard_inventory_count') || document.getElementById('mini_inventory_badge');
    if (badge) {
        let rect = badge.getBoundingClientRect();
        endX = rect.left + rect.width / 2;
        endY = rect.top + rect.height / 2;
    }

    if (icon && icon !== '🎁') {
        let flyItem = document.createElement('div');
        flyItem.innerHTML = icon;
        flyItem.style.cssText = `position:fixed; left:${startX}px; top:${startY}px; font-size:5rem; z-index:9999999; pointer-events:none; transition:all 0.6s cubic-bezier(0.25, 1, 0.5, 1); transform:translate(-50%, -50%); filter:drop-shadow(0 0 20px #38bdf8);`;
        document.body.appendChild(flyItem);
        
        requestAnimationFrame(() => { 
            flyItem.style.left = endX+'px'; flyItem.style.top = endY+'px'; 
            flyItem.style.fontSize = '1rem'; flyItem.style.opacity = '0'; 
            flyItem.style.transform = 'translate(-50%, -50%) rotate(360deg)'; 
        });
        setTimeout(() => flyItem.remove(), 600);
    }

    if (giftCount > 0) {
        for(let i=0; i<giftCount; i++) {
            setTimeout(() => {
                let flyGift = document.createElement('div');
                flyGift.innerHTML = "🎁";
                flyGift.style.cssText = `position:fixed; left:${startX}px; top:${startY}px; font-size:3.5rem; z-index:9999998; pointer-events:none; transition:all 0.5s ease-in; transform:translate(-50%, -50%); filter:drop-shadow(0 0 15px #facc15);`;
                document.body.appendChild(flyGift);
                
                requestAnimationFrame(() => { 
                    flyGift.style.left = endX+'px'; flyGift.style.top = endY+'px'; 
                    flyGift.style.fontSize = '0.5rem'; flyGift.style.opacity = '0'; 
                    flyGift.style.transform = 'translate(-50%, -50%) rotate(360deg)'; 
                });
                setTimeout(() => flyGift.remove(), 500);
            }, 100 + (i * 90)); 
        }
    }

    setTimeout(() => {
        let invEl = document.getElementById('dashboard_inventory_count'); if (invEl) invEl.innerText = inventory;
        let miniCountStr = document.getElementById('mini_inventory_count'); if (miniCountStr) miniCountStr.innerText = inventory;
        if (badge && badge.classList) {
            badge.classList.remove('animate__tada');
            void badge.offsetWidth; 
            badge.classList.add('animate__animated', 'animate__tada'); 
        }
    }, 600);
};


// 🌟 HÀM TẠO DANH SÁCH CHỌN LỚP/NHÓM THÔNG MINH
window.get_smart_user_selection_html = function(currentValue, prefix) {
    let classesList = window.available_classes || []; // Danh sách lớp bóc tách từ Backend
    let currentUsers = (currentValue || "").split(',').map(s => s.trim().toUpperCase());
    let checkboxesHtml = "";
    
    // Render Danh sách Lớp
    classesList.forEach((c, idx) => {
        let isChecked = currentUsers.includes(c) ? 'checked' : '';
        checkboxesHtml += `<div class="form-check form-check-inline me-2 mb-1"><input class="form-check-input ${prefix}-user-chk" type="checkbox" id="${prefix}_class_${idx}" value="${c}" ${isChecked} style="width: 1.1rem; height: 1.1rem; margin-top: 0.1rem; cursor:pointer;"><label class="form-check-label text-warning fw-bold" for="${prefix}_class_${idx}" style="font-size: 0.7rem; padding-top: 2px; cursor:pointer;">LỚP ${c}</label></div>`;
    });
    
    let specificIds = currentUsers.filter(u => !classesList.includes(u) && u !== "").join(", ");

    return `
    <div class="row g-2 mb-2 p-2 rounded align-items-center" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); margin: 0;">
        <div class="col-12 col-md-8" style="border-right: 1px dashed rgba(255,255,255,0.2);">
            <label class="text-white-50 fw-bold mb-1" style="font-size: 0.65rem;"><i class="bi bi-ui-checks-grid me-1"></i>CHỌN LỚP <span class="text-danger">(Bỏ trống = KHÔNG ai được thi)</span>:</label>
            <div class="d-flex flex-wrap align-items-center custom-scrollbar" style="min-height: 24px; max-height: 70px; overflow-y: auto;">${checkboxesHtml || '<span class="text-white-50 small">Không tìm thấy Lớp nào.</span>'}</div>
        </div>
        <div class="col-12 col-md-4">
            <label class="text-white-50 fw-bold mb-1" style="font-size: 0.65rem;"><i class="bi bi-person-badge me-1"></i>NHẬP MÃ SV (Dấu phẩy):</label>
            <textarea id="${prefix}_specific_users" class="form-control form-control-sm text-warning glass-input-style fw-bold custom-scrollbar" rows="2" placeholder="VD: SV01, SV02...">${specificIds}</textarea>
        </div>
    </div>`;
};

// 🌟 HÀM TÍNH TOÁN THỜI GIAN THÔNG MINH
window.update_modal_close_time = function(prefix) {
    let timeMin = parseInt(document.getElementById(prefix + '_time').value) || 0;
    let openVal = document.getElementById(prefix + '_open').value;
    if (openVal && timeMin > 0) {
        let openDate = new Date(openVal);
        openDate.setMinutes(openDate.getMinutes() + timeMin);
        let tz = openDate.getTimezoneOffset() * 60000;
        document.getElementById(prefix + '_close').value = (new Date(openDate - tz)).toISOString().slice(0,16);
    }
};





// =========================================================================
// 🚀 ADMIN: FORM CẬP NHẬT PHÒNG THI (TRÀN VIỀN 100% - CHUẨN SUPER APP) <div class="row"><div class="col-12">
// =========================================================================
window.open_edit_exam_modal = function(examJsonStr) {
    let ex = JSON.parse(decodeURIComponent(examJsonStr));
    let modalId = 'edit_exam_modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const toDatetimeLocal = (dateStr) => {
        if (!dateStr) return '';
        let d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        let pad = (n) => n < 10 ? '0' + n : n;
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    let openVal = toDatetimeLocal(ex.auto_open);
    let closeVal = toDatetimeLocal(ex.auto_close);

    let html = `
    <style>
        @media (max-width: 767.98px) {
            .mobile-px-half { padding-left: 0.5px !important; padding-right: 0.5px !important; }
            .mobile-margin-0 { margin-left: 0 !important; margin-right: 0 !important; }
        }
        .unified-input {
            padding: 10px 15px !important;
            border-radius: 12px !important;
            font-size: 0.95rem !important;
            height: 48px !important;
            line-height: 1.5 !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important;
            background: #1a1d20 !important;
            border: 1px solid #2b3035 !important;
            color: #fff !important;
        }
        .unified-input:focus { border-color: #ffc107 !important; box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.15) !important; outline: none; }
        .dark-label { font-size: 0.75rem; font-weight: 700; color: #adb5bd; margin-bottom: 4px; letter-spacing: 0.5px; }
        
        .class-pill { transition: 0.2s; user-select: none; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); cursor: pointer; }
        .class-pill:has(input:checked) { background: rgba(255, 193, 7, 0.15) !important; border-color: #ffc107 !important; }
        .class-pill:has(input:checked) span { color: #ffc107 !important; font-weight: bold; }
        .suggestion-item:hover { background: #343a40 !important; }
    </style>

    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column animate__animated animate__fadeInUp" style="background: #212529; z-index: 99999; overflow: hidden;">
        
        <!-- HEADER ĐỒNG BỘ NATIVE APP -->
        <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark flex-shrink-0" style="margin-left: -0.5px; margin-right: -0.5px;">
            <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="document.getElementById('${modalId}').remove()">
                <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
            </button>
            <h6 class="fw-bold text-white mb-0 text-center flex-grow-1 text-truncate" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                CẬP NHẬT <span class="text-warning ms-1 font-monospace px-2 py-1 border border-secondary" style="background: rgba(0,0,0,0.3); border-radius: 8px; font-size: 0.9rem;">${ex.code}</span>
            </h6>
            <div style="width: 40px;" class="d-block d-md-none"></div>
            <div style="width: 85px;" class="d-none d-md-block"></div>
        </div>

        <!-- BODY TRƯỢT TỰ DO -->
        <div class="flex-grow-1 overflow-auto custom-scrollbar p-0 p-md-3" style="background: transparent;">
            <div class="mx-auto mobile-px-half mt-2 mt-md-0" style="max-width: 800px;">
                <form id="edit_exam_form" onsubmit="event.preventDefault(); window.submit_edit_exam_form('${ex.code}')">
                    
                    <!-- ĐÃ SỬA: Đưa vào row và col-12 để thẳng hàng và có lề 12px -->
                    <div class="row g-2 mb-3 mobile-margin-0">
                        <div class="col-12">
                            <label class="dark-label px-1">Tên kỳ thi / Đề thi <span class="text-danger">*</span></label>
                            <input type="text" id="edit_ex_name" class="form-control unified-input fw-bold" value="${ex.name}" required>
                        </div>
                    </div>

                    <div class="row g-2 mb-3 mobile-margin-0">
                        <div class="col-6">
                            <label class="dark-label px-1">Thời lượng (Phút) <span class="text-danger">*</span></label>
                            <input type="number" id="edit_ex_time" class="form-control unified-input text-warning fw-bold text-center" value="${ex.time}" min="1" required>
                        </div>
                        <div class="col-6">
                            <label class="dark-label px-1">Mật khẩu (Trống = Tắt)</label>
                            <input type="text" id="edit_ex_pass" class="form-control unified-input text-danger fw-bold text-center" value="${ex.pass || ''}" placeholder="Không yêu cầu">
                        </div>
                    </div>

                    <div class="row g-2 mb-4 mobile-margin-0">
                        <div class="col-6">
                            <label class="dark-label px-1">Giờ mở cửa (Tự động)</label>
                            <input type="datetime-local" id="edit_ex_open" class="form-control unified-input text-info text-center" value="${openVal}">
                        </div>
                        <div class="col-6">
                            <label class="dark-label px-1">Giờ đóng cửa (Tự động)</label>
                            <input type="datetime-local" id="edit_ex_close" class="form-control unified-input text-danger text-center" value="${closeVal}">
                        </div>
                    </div>

                    <!-- CHỌN LỚP -->
                    <div class="row g-2 mb-4 mobile-margin-0">
                        <div class="col-12">
                            <div class="p-3 rounded-4 shadow-sm border border-secondary" style="background: rgba(0,0,0,0.15);">
                                <label class="dark-label text-warning mb-2"><i class="bi bi-people-fill me-1"></i> 1. CHỌN LỚP ĐƯỢC THI <span class="text-danger">*</span></label>
                                <div class="position-relative mb-2">
                                    <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-2 text-white-50" style="font-size: 0.9rem;"></i>
                                    <input type="text" id="edit_class_search" class="form-control unified-input ps-4" style="height: 40px !important;" placeholder="Nhập để tìm nhanh lớp học..." onkeyup="window.filter_edit_classes(this.value)" autocomplete="off">
                                </div>
                                <div id="edit_class_list" class="d-flex flex-wrap align-content-start gap-2 mt-2 custom-scrollbar" style="max-height: 180px; overflow-y: auto;">
                                    <div class="text-white-50 small w-100 text-center mt-3"><span class="spinner-border spinner-border-sm"></span> Đang tải danh sách lớp...</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TÌM KIẾM SINH VIÊN THI BÙ -->
                    <div class="row g-2 mb-4 mobile-margin-0">
                        <div class="col-12">
                            <div class="p-3 rounded-4 shadow-sm border border-secondary" style="background: rgba(0,0,0,0.15);">
                                <label class="dark-label text-info mb-2"><i class="bi bi-person-add me-1"></i> 2. THÊM SINH VIÊN THI BÙ / ĐẶC CÁCH</label>
                                <div id="extra_users_tags" class="d-flex flex-wrap gap-1 mb-2"></div>
                                <div class="position-relative">
                                    <i class="bi bi-person-plus position-absolute top-50 start-0 translate-middle-y ms-2 text-info" style="font-size: 0.9rem;"></i>
                                    <input type="text" id="search_extra_user" class="form-control unified-input border-info ps-4" style="height: 44px !important;" placeholder="Nhập Mã SV hoặc Tên để thêm..." oninput="window.handle_extra_user_search(this.value)" autocomplete="off">
                                    <div id="extra_user_suggestions" class="position-absolute w-100 bg-dark rounded shadow-lg" style="display: none; max-height: 180px; overflow-y: auto; z-index: 1000; border: 1px solid rgba(255,255,255,0.1); top: 100%; left: 0;"></div>
                                </div>
                                <div class="text-white-50 mt-2 px-1" style="font-size: 0.75rem;"><i class="bi bi-info-circle me-1"></i>Gõ một phần tên hoặc mã, hệ thống tự động tìm kiếm.</div>
                            </div>
                        </div>
                    </div>

                </form>
            </div>
        </div>

        <!-- FOOTER NÚT TRÀN VIỀN -->
        <div class="border-top border-secondary bg-transparent flex-shrink-0 d-flex w-100 mt-auto">
            <button class="btn fw-bold py-3 flex-grow-1 text-danger bg-transparent border-0 border-end border-secondary" style="border-radius: 0;" onclick="document.getElementById('${modalId}').remove()">
                <i class="bi bi-x-lg fs-5 me-1"></i> HỦY BỎ
            </button>
            <button class="btn fw-bold py-3 flex-grow-1 text-warning bg-transparent border-0" style="border-radius: 0;" onclick="window.submit_edit_exam_form('${ex.code}')">
                <i class="bi bi-floppy-fill fs-5 me-1"></i> LƯU CẬP NHẬT
            </button>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    window.all_users_for_search = []; 
    window.current_extra_users = [];  

    (async function fetchDataForEdit() {
        try {
            const clientDb = typeof db !== 'undefined' ? db : window._supabase;
            const { data: users } = await clientDb.from('users').select('student_id, full_name, class_code, role');
            
            if (users) {
                window.all_users_for_search = users; 
            }
            
            let cSet = new Set();
            users.forEach(u => {
                let c = u.class_code || u.role;
                if (c && c.trim() !== '') {
                    let cleanC = c.trim().toUpperCase();
                    if (cleanC !== 'ALL') cSet.add(cleanC); 
                }
            });
            let classList = Array.from(cSet).sort();
            
            let allowedArr = (ex.users || "").split(',').map(s => s.trim().toUpperCase()).filter(s => s !== "");
            let listHtml = '';
            
            classList.forEach(c => {
                let isChecked = allowedArr.includes(c);
                listHtml += `
                <label class="d-flex align-items-center gap-2 p-1 px-2 rounded class-pill class-filter-item" data-name="${c.toLowerCase()}">
                    <input type="checkbox" class="form-check-input m-0 chk-class-item flex-shrink-0" value="${c}" ${isChecked ? 'checked' : ''}>
                    <span class="text-white text-truncate" style="font-size: 0.8rem;">${c}</span>
                </label>`;
                
                let idx = allowedArr.indexOf(c);
                if (idx > -1) allowedArr.splice(idx, 1);
            });
            
            window.current_extra_users = allowedArr.filter(x => x !== 'ALL');
            window.render_extra_user_tags(); 
            
            document.getElementById('edit_class_list').innerHTML = listHtml || '<div class="text-white-50 small w-100 text-center mt-3">Không tìm thấy dữ liệu lớp học</div>';

        } catch(e) {
            document.getElementById('edit_class_list').innerHTML = '<div class="text-danger small w-100 text-center mt-3">Lỗi tải dữ liệu từ máy chủ!</div>';
        }
    })();
};
// =========================================================================
// 🔍 ADMIN: BỘ MÁY TÌM KIẾM SINH VIÊN & QUẢN LÝ TAG THI BÙ
// =========================================================================

// 1. Hàm tìm kiếm khi thầy gõ phím
window.handle_extra_user_search = function(q) {
    let box = document.getElementById('extra_user_suggestions');
    if(!q || q.length < 2) { box.style.display = 'none'; return; } // Gõ từ 2 chữ cái trở lên mới tìm
    
    // Loại bỏ dấu tiếng việt để tìm kiếm mượt mà (VD: gõ "hai" ra "Hải")
    let qLow = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    let matches = window.all_users_for_search.filter(u => {
        let nameMatch = u.full_name ? u.full_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(qLow) : false;
        let idMatch = u.student_id ? u.student_id.toLowerCase().includes(qLow) : false;
        let notSelectedYet = !window.current_extra_users.includes(u.student_id.toUpperCase());
        
        return (nameMatch || idMatch) && notSelectedYet;
    }).slice(0, 15); // Chỉ hiển thị tối đa 15 người để không bị lag

    if(matches.length === 0) {
        box.innerHTML = '<div class="p-2 text-white-50 small text-center">Không tìm thấy sinh viên phù hợp</div>';
    } else {
        box.innerHTML = matches.map(u => `
            <div class="p-2 border-bottom border-secondary suggestion-item d-flex justify-content-between align-items-center" style="cursor: pointer; background: #212529;" onclick="window.add_extra_user('${u.student_id.toUpperCase()}', '${u.full_name}')">
                <div>
                    <div class="fw-bold text-info" style="font-size: 0.85rem;">${u.student_id}</div>
                    <div class="text-white" style="font-size: 0.8rem;">${u.full_name || 'Chưa cập nhật'}</div>
                </div>
                <span class="badge bg-secondary">${u.class_code || '?'}</span>
            </div>
        `).join('');
    }
    box.style.display = 'block';
};

// 2. Hàm khi thầy bấm chọn 1 người từ danh sách
window.add_extra_user = function(id, name) {
    if(!window.current_extra_users.includes(id)) {
        window.current_extra_users.push(id);
        window.render_extra_user_tags();
    }
    // Xóa nội dung ô tìm kiếm và ẩn bảng thả xuống
    document.getElementById('search_extra_user').value = '';
    document.getElementById('extra_user_suggestions').style.display = 'none';
};

// 3. Hàm khi thầy bấm dấu X để xóa người đó khỏi danh sách thi bù
window.remove_extra_user = function(id) {
    window.current_extra_users = window.current_extra_users.filter(x => x !== id);
    window.render_extra_user_tags();
};

// 4. Hàm vẽ lại giao diện các cục Badge (Đã tối ưu giao diện Dark Mode)
window.render_extra_user_tags = function() {
    let container = document.getElementById('extra_users_tags');
    if (window.current_extra_users.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = window.current_extra_users.map(id => {
        // Tìm tên để hiển thị cho đẹp
        let userObj = window.all_users_for_search.find(u => u.student_id.toUpperCase() === id);
        let displayName = userObj && userObj.full_name ? `${id} - ${userObj.full_name.split(' ').pop()}` : id;
        
        return `
        <span class="badge d-flex align-items-center gap-2 py-1 px-2 shadow-sm" style="background: rgba(255, 193, 7, 0.15); border: 1px solid #ffc107; color: #ffc107 !important; font-size: 0.75rem; font-weight: 700; border-radius: 6px; letter-spacing: 0.3px;">
            ${displayName}
            <i class="bi bi-x-circle-fill text-danger" style="cursor:pointer; font-size: 0.95rem; filter: brightness(1.2);" onclick="window.remove_extra_user('${id}')" title="Xóa"></i>
        </span>`;
    }).join('');
};

// =========================================================================
// 🔍 ADMIN: BỘ LỌC TÌM KIẾM LỚP HỌC (LIVE SEARCH)
// =========================================================================
window.filter_edit_classes = function(query) {
    let q = query.toLowerCase().trim();
    let items = document.querySelectorAll('.class-filter-item');
    
    items.forEach(item => {
        let className = item.getAttribute('data-name');
        if (className.includes(q)) {
            // Hiện lại nếu tìm thấy
            item.style.setProperty('display', 'flex', 'important'); 
        } else {
            // Ẩn đi nếu không khớp
            item.style.setProperty('display', 'none', 'important'); 
        }
    });
};

// Hàm trợ giúp: Chọn tất cả các lớp
window.toggle_all_classes = function(chk) {
    let items = document.querySelectorAll('.chk-class-item');
    items.forEach(i => i.checked = chk.checked);
};

// =========================================================================
// 📝 ADMIN: HÀM LƯU THÔNG TIN CẬP NHẬT LÊN SUPABASE
// =========================================================================
window.submit_edit_exam_form = async function(examCode) {
    let btn = document.querySelector('#edit_exam_modal .btn-warning');
    let originalText = btn.innerHTML;
    
    let nameVal = document.getElementById('edit_ex_name').value.trim();
    let timeVal = parseInt(document.getElementById('edit_ex_time').value);
    if (!nameVal || !timeVal) return alert("Vui lòng nhập Tên kỳ thi và Thời lượng hợp lệ!");

    // Gom danh sách lớp đã tick
    let classList = [];
    let checkedClasses = document.querySelectorAll('.chk-class-item:checked');
    checkedClasses.forEach(c => classList.push(c.value));
    
    // Gom danh sách Sinh viên thi bù từ mảng Tags (Biến toàn cục)
    let extraArr = window.current_extra_users || [];
    
    // Gộp chung lại thành 1 chuỗi an toàn
    let finalAllowed = Array.from(new Set([...classList, ...extraArr])).join(',');

    if (btn) btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> ĐANG LƯU...`;

    try {
        let updateData = {
            exam_name: nameVal,
            time_limit: timeVal,
            password: document.getElementById('edit_ex_pass').value.trim() || null,
            allowed_users: finalAllowed, 
            auto_open: document.getElementById('edit_ex_open').value ? new Date(document.getElementById('edit_ex_open').value).toISOString() : null,
            auto_close: document.getElementById('edit_ex_close').value ? new Date(document.getElementById('edit_ex_close').value).toISOString() : null,
        };

        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        const { error } = await clientDb.from('online_exams').update(updateData).eq('exam_code', examCode);
        
        if (error) throw error;
        
        let modal = document.getElementById('edit_exam_modal');
        if(modal) modal.remove();
        
        if(typeof window.render_exam_management === 'function') {
            window.render_exam_management();
        }
        
        if(typeof window.show_toast === 'function') {
            window.show_toast("✅ Cập nhật phòng thi thành công!", false);
        }

    } catch (err) {
        alert("Lỗi cập nhật Supabase: " + err.message);
        if (btn) btn.innerHTML = originalText;
    }
};

// [ĐÃ GỠ BẢN TRÙNG] window.save_edit_exam (dòng cũ 3590-3620) - bản dùng thật nằm ở phía dưới file


window.start_online_exam = async function(ex) {
    let qs = [];
    try {
        let raw = ex.questionsJSON;
        qs = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : (raw ? [].concat(raw) : []));
    } catch(e) { return window.show_toast("❌ Lỗi dữ liệu đề thi từ máy chủ!", true); }
    if (!qs || qs.length === 0) return window.show_toast("❌ Đề thi này chưa có câu hỏi nào!", true);

    // =========================================================================
    // 🛡️ TRẠM KIỂM SOÁT VÉ: CHẶN CỬA NẾU BỊ KHÓA / ĐÌNH CHỈ / ĐÃ NỘP
    // =========================================================================
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        const { data: checkData, error: checkErr } = await clientDb.from('exam_results')
            .select('is_locked, is_absent, is_submitted')
            .eq('exam_code', ex.examCode)
            .eq('student_id', window.current_student_id)
            .single();

        if (checkData) {
            // Án tử 1: Bị cấm thi
            if (checkData.is_absent === true) {
                if (typeof window.force_kick_student === 'function') {
                    window.force_kick_student("🚫 TỪ CHỐI TRUY CẬP", "Bạn đã bị Giám thị đình chỉ thi. Bài làm đã bị vô hiệu hóa.", true);
                } else {
                    alert("🚫 TỪ CHỐI TRUY CẬP: Bạn đã bị đình chỉ và cấm thi!");
                }
                return; // 🛑 Chặn cửa!
            }
            // Án phạt 2: Đang bị khóa máy
            if (checkData.is_locked === true) {
                if (typeof window.force_kick_student === 'function') {
                    window.force_kick_student("🔒 TÀI KHOẢN BỊ KHÓA", "Tài khoản của bạn đang bị khóa do vi phạm hoặc Giám thị mời ra khỏi phòng.<br><br><b>Vui lòng giơ tay báo cáo Giám thị để được MỞ KHÓA!</b>", false);
                } else {
                    alert("🔒 TÀI KHOẢN BỊ KHÓA: Vui lòng báo cáo Giám thị để được mở khóa!");
                }
                return; // 🛑 Chặn cửa!
            }
            // Báo lỗi nếu nộp rồi mà F5 đòi thi lại
            if (checkData.is_submitted === true) {
                alert("✅ Bạn đã nộp bài thi này rồi, không thể vào thi lại!");
                return; // 🛑 Chặn cửa!
            }
        }
    } catch (e) {
        // Sinh viên mới tinh, chưa báo danh lần nào -> Bỏ qua cho đi tiếp
    }
    // =========================================================================

    // THIẾT LẬP MÔI TRƯỜNG THI THẬT
    window.current_subject = ex.subjectKey;
    window.selected_lessons_text = ex.examName; 
    window.is_study_mode = false; 
    window.is_eligible_for_reward = false; 
    window.current_attempt_count = 1;

    // XÁO TRỘN ĐÁP ÁN VÀ CÂU HỎI AN TOÀN
    qs.forEach((q, index) => {
        q.id = q.id || (index + 1);
        q.visited = false;
        q.done = false;
        q.ans_user = (q.type === 'fill' || q.type === 'short') ? [] : "";

        let cType = q.type ? String(q.type).toLowerCase().trim() : '';
        if ((cType === 'single' || cType === 'mcq') && Array.isArray(q.opts) && q.opts.length > 0) {
            let rawAns = String(q.a || q.answer || "").trim();
            let isLetter = /^[A-D]$/i.test(rawAns);
            let correctText = "";

            if (isLetter) {
                let idx = rawAns.toUpperCase().charCodeAt(0) - 65; 
                if (q.opts[idx]) correctText = q.opts[idx];
            } else {
                correctText = rawAns;
            }

            // Đảo vị trí các đáp án (đã lọc rỗng)
            q.opts = q.opts.filter(o => o !== null && o !== undefined && String(o).trim() !== '').sort(() => Math.random() - 0.5);

            if (correctText) {
                let newIdx = q.opts.findIndex(o => o === correctText);
                if (newIdx !== -1 && isLetter) {
                    q.a = String.fromCharCode(65 + newIdx); 
                    q.answer = q.a;
                }
            }
        }
    });

    window.questions = qs.sort(() => Math.random() - 0.5);

    // MỞ GIAO DIỆN
    document.getElementById('step_1').style.display = 'none';
    document.getElementById('step_3').style.display = 'block';

    let qHeader = document.querySelector('.sticky-quiz-header') || document.querySelector('#step_3 .header-fixed-wrapper');
    if(qHeader) qHeader.style.display = '';

    // KHÓA KỸ NĂNG VÀ CHẾ ĐỘ RẢNH TAY
    let skill5050 = document.querySelector('button[onclick="window.use_skill_5050()"]');
    let skillTime = document.querySelector('button[onclick="window.use_skill_time()"]');
    let invBadge = document.getElementById('mini_inventory_badge');
    let modeToggle = document.getElementById('mode_text');

    if(skill5050) skill5050.style.display = 'none';
    if(skillTime) skillTime.style.display = 'none';
    if(invBadge) invBadge.style.display = 'none';
    if(modeToggle && modeToggle.parentElement) modeToggle.parentElement.style.display = 'none';

    let examStyle = document.getElementById('exam_mode_style');
    if(!examStyle) {
        examStyle = document.createElement('style');
        examStyle.id = 'exam_mode_style';
        document.head.appendChild(examStyle);
    }
    examStyle.innerHTML = `
        div[id^="revive_btn_"], div[id^="revive_audio_btn_"] { display: none !important; }
        span[id^="bulb_icon_"] { display: none !important; }
        .text-warning[onclick*="hint_box"] { display: none !important; }
    `;

    let quizArea = document.getElementById('quiz_area');
    if(quizArea) {
        quizArea.innerHTML = '';
        quizArea.style.height = 'auto';
        quizArea.style.display = 'block';
    }

    let submitBtn = document.getElementById('submit_btn');
    if(submitBtn) submitBtn.style.display = 'none';

    window.proctoring_state = window.proctoring_state || {};
    window.proctoring_state.is_active = true;
    window.proctoring_state.exam_code = ex.examCode;

    window.is_exam_started = true;
    window.away_seconds = 0;
    window.offense_count = 0; 
    window.start_time = new Date();

    // 🌟 BẢN VÁ LỖI TÍCH HỢP: Gắn luôn cờ client_status: 'ONLINE' khi báo danh
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        clientDb.from('exam_results').upsert({
            exam_code: ex.examCode,
            student_id: window.current_student_id,
            is_submitted: false,
            score: 0,
            client_status: 'ONLINE' // Bắn radar tức thì
        }, { onConflict: 'exam_code,student_id' }).then(() => console.log('Đã báo danh thi!'));
    } catch(e) {}

    // KHỞI ĐỘNG NHỊP TIM CHỐNG SẬP NGUỒN
    if (window.realtime_exam_monitor) clearInterval(window.realtime_exam_monitor);
    window.realtime_exam_monitor = setInterval(() => {
        if (window.is_exam_started && window.proctoring_state && window.proctoring_state.is_active) {
            window.check_realtime_exam_status(ex.examCode, window.current_student_id).then(status => {
                if (status === "KICK") {
                    clearInterval(window.realtime_exam_monitor);
                    window.show_toast("⚠️ Đã hết Thời gian mở đề hoặc đề bị Khóa! Hệ thống tự động thu bài...", true);
                    window.force_submit_exam();
                }
            });
        }
    }, 60000); 

    let isResumed = false;
    if (typeof window.restore_exam_draft === 'function') {
        isResumed = window.restore_exam_draft(ex.examCode);
    }

    if (!isResumed) {
        window.time_left = ex.timeLimit * 60;
    }

    if(typeof window.render_quiz === 'function') window.render_quiz();
    
    if (isResumed && typeof window.re_apply_visual_answers === 'function') {
        window.re_apply_visual_answers();
    }
    
    if (typeof window.enable_fullscreen === 'function') window.enable_fullscreen();
    
    if(typeof window.start_countdown === 'function') {
        window.start_countdown();
        if (!isResumed) window.time_left = ex.timeLimit * 60; 
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
    
    if (isResumed) {
        window.show_toast(`♻️ ĐÃ KHÔI PHỤC BÀI THI: Hệ thống tải lại đáp án dang dở!`);
    } else {
        window.show_toast(`🚀 BẮT ĐẦU THI: ${ex.examName} (${ex.timeLimit} phút)`);
    }
};

// =========================================================================
// 🛠️ GIAO DIỆN RÀ SOÁT CÂU HỎI TRƯỚC KHI XUẤT ĐỀ THI ONLINE (PREMIUM UI)
// =========================================================================
window.show_exam_review_modal = function(questionList, onConfirmCallback) {
    let modalId = 'exam_review_modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    let html = `
    <style>
        /* ÉP FULL-SCREEN NGUYÊN KHỐI TRÊN MOBILE */
        @media (max-width: 767.98px) {
            .review-sheet-wrapper { 
                padding: 0 !important; 
                align-items: flex-start !important; 
            }
            .review-mobile-sheet { 
                height: 100vh !important; 
                max-height: 100vh !important; 
                border-radius: 0 !important; 
                border: none !important; 
                margin: 0 !important;
                max-width: 100vw !important;
            }
        }
        .review-q-card { transition: 0.2s; border: 1px solid #343a40; background: rgba(255,255,255,0.02); cursor: pointer; }
        .review-q-card:hover { border-color: #0ea5e9; }
        .review-q-card:has(.review-q-checkbox:checked) { background: rgba(56, 189, 248, 0.08) !important; border-color: #0ea5e9 !important; }
    </style>

    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center review-sheet-wrapper animate__animated animate__fadeIn" style="background: #212529; z-index: 100000;">
        <div class="d-flex flex-column w-100 review-mobile-sheet animate__animated animate__zoomIn" style="max-width: 800px; background: #212529 !important; overflow: hidden;">
            
            <!-- HEADER TÀNG HÌNH ĐỒNG BỘ -->
            <div class="p-3 border-bottom flex-shrink-0 d-flex align-items-center" style="border-color: rgba(255,255,255,0.05) !important; background: transparent;">
                <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="document.getElementById('${modalId}').remove()">
                    <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
                </button>
                
                <h6 class="text-white fw-bold mb-0 text-center flex-grow-1 text-truncate" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                    RÀ SOÁT ĐỀ THI
                </h6>
                
                <div style="width: 40px;" class="d-block d-md-none"></div>
                <div style="width: 85px;" class="d-none d-md-block"></div>
            </div>
            
            <!-- BODY (TỰ CUỘN) -->
            <div class="p-2 p-md-3 flex-grow-1 custom-scrollbar" style="overflow-y: auto; background: transparent;" id="review_q_list"></div>
            
            <!-- FOOTER TRÀN VIỀN XÓA NỀN -->
            <div class="p-0 border-top flex-shrink-0 d-flex flex-column w-100" style="border-color: rgba(255,255,255,0.05) !important; background: transparent;">
                <div class="text-center py-2" style="background: rgba(0,0,0,0.2);">
                    <span class="text-white-50" style="font-size: 0.85rem;">Đã chọn: <strong id="review_selected_count" class="text-info fs-5">${questionList.length}</strong> / ${questionList.length}</span>
                </div>
                <div class="d-flex w-100 border-top" style="border-color: rgba(255,255,255,0.05) !important;">
                    <button class="btn py-3 fw-bold flex-grow-1 d-flex justify-content-center align-items-center text-danger bg-transparent border-0 border-end" style="border-color: rgba(255,255,255,0.05) !important; border-radius: 0;" onclick="document.getElementById('${modalId}').remove()">
                        <i class="bi bi-x-lg fs-4 fs-md-5"></i> <span class="d-none d-md-inline ms-2">HỦY BỎ</span>
                    </button>
                    <button class="btn py-3 fw-bold flex-grow-1 d-flex justify-content-center align-items-center text-info bg-transparent border-0" style="border-radius: 0;" onclick="window.confirm_review_exam()">
                        <i class="bi bi-check2-circle fs-4 fs-md-5"></i> <span class="d-none d-md-inline ms-2">TẠO PHÒNG</span>
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);

    let listContainer = document.getElementById('review_q_list');
    let itemsHtml = '';
    
    questionList.forEach((q, idx) => {
        let qText = (q.q || q.vi || "Câu hỏi trống").replace(/<[^>]*>?/gm, '');
        let qType = String(q.type || 'MCQ').toUpperCase();
        if (['HOTSPOT', 'CLIP', 'CLIP_LISTEN', 'ARRANGE', 'SẮP XẾP'].includes(qType)) qType = 'MEDIA';
        let qAns = (q.a || q.answer || q.en || "N/A").replace(/<[^>]*>?/gm, '');
        
        itemsHtml += `
        <label class="p-3 mb-2 rounded shadow-sm d-flex gap-3 align-items-start review-q-card">
            <div class="form-check" style="font-size: 1.3rem; margin-top: 2px;">
                <input class="form-check-input review-q-checkbox m-0" type="checkbox" value="${idx}" checked onchange="window.update_review_count()" style="cursor:pointer; border-color: #0ea5e9; background-color: #2b3035;">
            </div>
            <div class="flex-grow-1" style="min-width: 0;">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-dark border border-secondary text-info text-uppercase" style="font-size: 0.65rem;">${qType}</span>
                    <span class="text-white-50 small fw-bold" style="font-size: 0.7rem;">Câu ${idx + 1}</span>
                </div>
                <div class="text-white mb-2 text-break" style="font-size: 0.9rem; line-height: 1.5;">${qText}</div>
                <div class="text-success fw-bold p-2 rounded" style="font-size: 0.8rem; background: rgba(16, 185, 129, 0.1); border: 1px dashed rgba(16, 185, 129, 0.3);">
                    <i class="bi bi-check2-circle me-1"></i> Đáp án: ${qAns}
                </div>
            </div>
        </label>`;
    });
    
    listContainer.innerHTML = itemsHtml;

    window.update_review_count = function() {
        let count = document.querySelectorAll('.review-q-checkbox:checked').length;
        document.getElementById('review_selected_count').innerText = count;
    };

    window.confirm_review_exam = function() {
        let checkboxes = document.querySelectorAll('.review-q-checkbox');
        let finalSelected = [];
        checkboxes.forEach(cb => {
            if (cb.checked) {
                finalSelected.push(questionList[parseInt(cb.value)]);
            }
        });
        
        if (finalSelected.length === 0) {
            return window.show_toast("⚠️ Thầy phải tích chọn ít nhất 1 câu để tạo đề!", true);
        }
        
        document.getElementById(modalId).remove();
        if (typeof onConfirmCallback === 'function') onConfirmCallback(finalSelected);
    };
};

// =========================================================================
// 🚀 GIAO DIỆN TẠO PHÒNG THI ONLINE (ĐỒNG BỘ PHONG CÁCH EDIT FORM)
// =========================================================================
window.show_online_exam_modal = async function(defaultTime) {
    let modalId = 'online_exam_modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    let examCount = window.temp_online_exam_questions.length;
    let autoCode = "DE_" + Math.floor(Date.now() / 1000).toString().slice(-6);
    
    let tz = (new Date()).getTimezoneOffset() * 60000;
    let localISOTimeOpen = (new Date(Date.now() - tz)).toISOString().slice(0,16);
    let localISOTimeClose = (new Date(Date.now() - tz + defaultTime*60000)).toISOString().slice(0,16);

    let html = `
    <style>
        /* ÉP FULL-SCREEN NGUYÊN KHỐI TRÊN MOBILE */
        @media (max-width: 767.98px) {
            .create-sheet-wrapper { padding: 0 !important; align-items: flex-start !important; }
            .create-mobile-sheet { 
                height: 100vh !important; 
                max-height: 100vh !important; 
                border-radius: 0 !important; 
                border: none !important; 
                margin: 0 !important;
                max-width: 100vw !important;
            }
        }
        .dark-input { background: rgba(0,0,0,0.2) !important; color: #fff !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px; font-size: 0.9rem; padding: 8px 12px; }
        .dark-input:focus { border-color: #0ea5e9 !important; box-shadow: 0 0 0 0.2rem rgba(14, 165, 233, 0.2) !important; outline: none; }
        .dark-label { font-size: 0.7rem; font-weight: 700; color: #adb5bd; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .class-pill { transition: 0.2s; user-select: none; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); cursor: pointer; }
        .class-pill:has(input:checked) { background: rgba(14, 165, 233, 0.15) !important; border-color: #0ea5e9 !important; }
        .class-pill:has(input:checked) span { color: #0ea5e9 !important; font-weight: bold; }
        .suggestion-item:hover { background: #343a40 !important; }
        
        #create_ex_time::-webkit-outer-spin-button, #create_ex_time::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        #create_ex_time[type=number] { -moz-appearance: textfield; }
        .ios-switch { position: relative; display: inline-block; width: 44px; height: 24px; margin: 0; }
        .ios-switch input { opacity: 0; width: 0; height: 0; }
        .ios-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ef4444; transition: .3s; border-radius: 34px; border: 1px solid rgba(255,255,255,0.1); }
        .ios-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 2px; bottom: 2px; background-color: #fff; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .ios-switch input:checked + .ios-slider { background-color: #10b981; border-color: #10b981; }
        .ios-switch input:checked + .ios-slider:before { transform: translateX(20px); }
    </style>

    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center create-sheet-wrapper animate__animated animate__fadeIn" style="background: #212529; z-index: 99999;">
        <div class="d-flex flex-column w-100 create-mobile-sheet animate__animated animate__zoomIn" style="max-width: 600px; background: #212529 !important; overflow: hidden;">
            
            <!-- HEADER TÀNG HÌNH ĐỒNG BỘ -->
            <div class="p-3 border-bottom flex-shrink-0 d-flex align-items-center" style="border-color: rgba(255,255,255,0.05) !important; background: transparent;">
                <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="document.getElementById('${modalId}').remove()">
                    <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
                </button>
                
                <h6 class="text-white fw-bold mb-0 text-center flex-grow-1 text-truncate" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                    TẠO PHÒNG <span class="text-warning ms-1 font-monospace px-2 py-1 bg-dark rounded border border-secondary" style="font-size: 0.9rem;">${examCount} CÂU</span>
                </h6>
                
                <div style="width: 40px;" class="d-block d-md-none"></div>
                <div style="width: 85px;" class="d-none d-md-block"></div>
            </div>

            <!-- BODY TỰ CUỘN -->
            <div class="flex-grow-1 p-2 p-md-3 custom-scrollbar" style="overflow-y: auto; background: transparent;">
                <form id="create_exam_form" onsubmit="event.preventDefault(); window.submit_online_exam_to_server()">
                    
                    <div class="row g-2 mb-3">
                        <div class="col-4">
                            <label class="dark-label">Mã Đề <span class="text-danger">*</span></label>
                            <input type="text" id="create_ex_code" class="form-control dark-input text-warning fw-bold text-center font-monospace" value="${autoCode}" onfocus="this.select()">
                        </div>
                        <div class="col-8">
                            <label class="dark-label">Tên Kỳ Thi <span class="text-danger">*</span></label>
                            <input type="text" id="create_ex_name" class="form-control dark-input text-info fw-bold" placeholder="VD: KT1, THI..." required>
                        </div>
                        <div class="col-12 mt-1">
                            <div class="text-warning" style="font-size: 0.65rem; line-height: 1.2;">
                                <i class="bi bi-lightbulb-fill"></i> Mẹo: Tên chứa chữ <b>KT1, K2, THI, CC</b> để tự xếp đúng cột bảng điểm.
                            </div>
                        </div>
                    </div>

                    <div class="row g-2 mb-3 align-items-end">
                        <div class="col-4">
                            <label class="dark-label">Phút <span class="text-danger">*</span></label>
                            <input type="number" id="create_ex_time" class="form-control dark-input text-center fw-bold text-white" value="${defaultTime}" onfocus="this.select()" onchange="window.update_modal_close_time('create_ex')" required min="1">
                        </div>
                        <div class="col-5">
                            <label class="dark-label">Mật khẩu (Trống=Tắt)</label>
                            <input type="text" id="create_ex_pass" class="form-control dark-input text-danger fw-bold text-center" placeholder="Không yêu cầu" onfocus="this.select()">
                        </div>
                        <div class="col-3 d-flex flex-column align-items-center">
                            <label class="dark-label text-center">Trạng thái</label>
                            <div class="d-flex align-items-center gap-2 mt-1">
                                <input type="hidden" id="create_ex_status" value="MỞ">
                                <label class="ios-switch">
                                    <input type="checkbox" checked onchange="document.getElementById('create_ex_status').value = this.checked ? 'MỞ' : 'ĐÓNG'">
                                    <span class="ios-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="dark-label">Giờ mở cửa (Tự động)</label>
                            <input type="datetime-local" id="create_ex_open" class="form-control dark-input" value="${localISOTimeOpen}" onchange="window.update_modal_close_time('create_ex')">
                        </div>
                        <div class="col-6">
                            <label class="dark-label">Giờ đóng cửa (Tự động)</label>
                            <input type="datetime-local" id="create_ex_close" class="form-control dark-input" value="${localISOTimeClose}">
                        </div>
                    </div>

                    <!-- CHỌN LỚP -->
                    <div class="mb-3">
                        <label class="dark-label">1. CHỌN LỚP ĐƯỢC THI <span class="text-danger">*</span></label>
                        <div class="position-relative mb-2">
                            <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-2 text-white-50" style="font-size: 0.8rem;"></i>
                            <input type="text" id="edit_class_search" class="form-control dark-input ps-4" placeholder="Nhập để tìm nhanh lớp học..." onkeyup="window.filter_edit_classes(this.value)" style="font-size: 0.85rem; padding: 6px 12px;" autocomplete="off">
                        </div>
                        <div id="edit_class_list" class="d-flex flex-wrap align-content-start gap-2 p-2 rounded custom-scrollbar" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); height: 180px; overflow-y: auto;">
                            <div class="text-white-50 small w-100 text-center mt-3"><span class="spinner-border spinner-border-sm"></span> Đang tải danh sách lớp...</div>
                        </div>
                    </div>

                    <!-- TÌM KIẾM SINH VIÊN -->
                    <div class="mb-2">
                        <label class="dark-label text-warning">2. THÊM SINH VIÊN THI BÙ / ĐẶC CÁCH</label>
                        <div id="extra_users_tags" class="d-flex flex-wrap gap-1 mb-2"></div>
                        <div class="position-relative">
                            <i class="bi bi-person-plus position-absolute top-50 start-0 translate-middle-y ms-2 text-warning" style="font-size: 0.9rem;"></i>
                            <input type="text" id="search_extra_user" class="form-control dark-input border-warning ps-4" placeholder="Nhập Mã SV hoặc Tên để thêm..." oninput="window.handle_extra_user_search(this.value)" autocomplete="off" style="font-size: 0.85rem;">
                            <div id="extra_user_suggestions" class="position-absolute w-100 bg-dark rounded shadow-lg" style="display: none; max-height: 180px; overflow-y: auto; z-index: 1000; border: 1px solid rgba(255,255,255,0.1); top: 100%; left: 0;"></div>
                        </div>
                        <div class="text-white-50 mt-1" style="font-size: 0.7rem;"><i class="bi bi-info-circle me-1"></i>Gõ một phần tên hoặc mã, hệ thống sẽ tự động tìm kiếm.</div>
                    </div>

                </form>
            </div>

            <!-- FOOTER TRÀN VIỀN -->
            <div class="p-0 border-top flex-shrink-0 d-flex w-100" style="border-color: rgba(255,255,255,0.05) !important; background: transparent;">
                <button class="btn py-3 fw-bold flex-grow-1 d-flex justify-content-center align-items-center text-danger bg-transparent border-0 border-end" style="border-color: rgba(255,255,255,0.05) !important; border-radius: 0;" onclick="document.getElementById('${modalId}').remove()">
                    <i class="bi bi-x-lg fs-4 fs-md-5"></i> <span class="d-none d-md-inline ms-2">HỦY BỎ</span>
                </button>
                <button class="btn py-3 fw-bold flex-grow-1 d-flex justify-content-center align-items-center text-warning bg-transparent border-0" style="border-radius: 0;" onclick="window.submit_online_exam_to_server()">
                    <i class="bi bi-floppy-fill fs-4 fs-md-5"></i> <span class="d-none d-md-inline ms-2">LƯU PHÒNG</span>
                </button>
            </div>
            
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // Kéo dữ liệu Lớp và Sinh viên
    window.all_users_for_search = []; 
    window.current_extra_users = []; 

    (async function fetchDataForCreate() {
        try {
            const clientDb = typeof db !== 'undefined' ? db : window._supabase;
            const { data: users } = await clientDb.from('users').select('student_id, full_name, class_code, role');
            
            if (users) {
                window.all_users_for_search = users;
            }
            
            let cSet = new Set();
            users.forEach(u => {
                let c = u.class_code || u.role;
                if (c && c.trim() !== '') {
                    let cleanC = c.trim().toUpperCase();
                    if (cleanC !== 'ALL') cSet.add(cleanC); 
                }
            });
            let classList = Array.from(cSet).sort();
            
            let listHtml = '';
            classList.forEach(c => {
                listHtml += `
                <label class="d-flex align-items-center gap-2 p-1 px-2 rounded class-pill class-filter-item" data-name="${c.toLowerCase()}">
                    <input type="checkbox" class="form-check-input m-0 chk-class-item" value="${c}">
                    <span class="text-white" style="font-size: 0.8rem;">${c}</span>
                </label>`;
            });
            
            document.getElementById('edit_class_list').innerHTML = listHtml || '<div class="text-white-50 small w-100 text-center mt-3">Không tìm thấy dữ liệu lớp học</div>';
            window.render_extra_user_tags(); // Vẽ vùng badge trống chuẩn bị nhận data

        } catch(e) {
            document.getElementById('edit_class_list').innerHTML = '<div class="text-danger small w-100 text-center mt-3">Lỗi tải dữ liệu từ máy chủ!</div>';
        }
    })();
};



// =========================================================================
// ⚔️ ADMIN: PHÁT LỆNH TRỪNG PHẠT SINH VIÊN (ĐÃ FIX LỖI ẢO TRẠNG THÁI)
// =========================================================================
window.admin_punish_student = async function(examCode, action) {
    let chks = document.querySelectorAll('.troubleshoot-chk:checked');
    if(chks.length === 0) return alert("Vui lòng tick chọn ít nhất 1 sinh viên để xử lý!");
    let ids = Array.from(chks).map(c => c.value.toLowerCase());

    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        if (action === 'lock') {
            let conf = confirm(`Bạn có chắc chắn muốn KÍCH RA & KHÓA MÁY ${ids.length} sinh viên này? Máy của họ sẽ bị khóa cứng ngay lập tức!`);
            if(!conf) return;
            // 🌟 Ép trạng thái thành OFFLINE ngay lập tức
            await clientDb.from('exam_results').update({ is_locked: true, client_status: 'OFFLINE' }).eq('exam_code', examCode).in('student_id', ids);
        } 
        else if (action === 'unlock') {
            await clientDb.from('exam_results').update({ is_locked: false }).eq('exam_code', examCode).in('student_id', ids);
        } 
        else if (action === 'ban') {
            let conf = confirm(`Bạn có muốn ĐÌNH CHỈ THI ${ids.length} sinh viên này?`);
            if(!conf) return;
            // 🌟 Ép trạng thái thành OFFLINE ngay lập tức
            await clientDb.from('exam_results').update({ is_absent: true, client_status: 'OFFLINE' }).eq('exam_code', examCode).in('student_id', ids);
        } 
        else if (action === 'unban') {
            await clientDb.from('exam_results').update({ is_absent: false }).eq('exam_code', examCode).in('student_id', ids);
        }
        
        // Bỏ chọn tất cả checkbox sau khi xử lý xong
        chks.forEach(c => c.checked = false);

    } catch(e) { 
        alert("Lỗi kết nối: " + e.message); 
    }
};

// =========================================================================
// 🚫 MÀN HÌNH KHÓA CƯỠNG CHẾ (ĐÃ SỬA LỖI VĂNG ĐĂNG NHẬP)
// =========================================================================
window.force_kick_student = function(title, msg, isPermanent) {
    let existing = document.getElementById('kick_overlay');
    if (existing) existing.remove();

    // Thay location.reload() bằng lệnh xóa bảng đen và quay về Sảnh chính
    let exitAction = "document.getElementById('kick_overlay').remove(); if(typeof window.back_to_subject_select === 'function') window.back_to_subject_select();";

    let btnHtml = isPermanent 
        ? `<button class="btn btn-danger w-100 fw-bold py-2 rounded-pill shadow-lg" onclick="${exitAction}">ĐÃ HIỂU VÀ THOÁT RA SẢNH</button>`
        : `<button class="btn btn-warning text-dark w-100 fw-bold py-2 rounded-pill shadow-lg" onclick="${exitAction}">THOÁT RA SẢNH & CHỜ XỬ LÝ</button>`;

    let html = `
    <div id="kick_overlay" class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.95); z-index: 9999999; backdrop-filter: blur(15px);">
        <div class="text-center p-4 glass-panel border-danger shadow-lg animate__animated animate__zoomIn" style="border-width: 2px; max-width: 450px; border-radius: 24px; background: #0f172a;">
            <i class="bi bi-exclamation-triangle-fill text-danger mb-3" style="font-size: 5rem; text-shadow: 0 0 30px rgba(239, 68, 68, 0.6);"></i>
            <h4 class="text-white fw-bold text-uppercase mb-3" style="letter-spacing: 1px;">${title}</h4>
            <div class="p-3 mb-4 rounded-3" style="background: rgba(239, 68, 68, 0.1); border: 1px dashed #ef4444;">
                <p class="text-white-50 mb-0" style="font-size: 0.95rem; line-height: 1.6;">${msg}</p>
            </div>
            ${btnHtml}
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
};

// =========================================================================
// 🚀 KẾT NỐI REALTIME CHO BẢNG QUẢN LÝ PHÒNG THI
// =========================================================================
window.active_troubleshoot_subscription = null; // Biến lưu giữ kênh kết nối

window.enable_realtime_troubleshoot = function(examCode) {
    const clientDb = typeof db !== 'undefined' ? db : window._supabase;
    
    // Xóa kết nối cũ nếu có để tránh bị lặp
    if (window.active_troubleshoot_subscription) {
        clientDb.removeChannel(window.active_troubleshoot_subscription);
    }

    // Mở kênh lắng nghe trực tiếp vào bảng điểm
    window.active_troubleshoot_subscription = clientDb.channel('troubleshoot_channel')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'exam_results', filter: `exam_code=eq.${examCode}` },
            (payload) => {
                console.log("🔥 Phát hiện thay đổi trong phòng thi (Điểm/Nộp bài):", payload);
                // 🎯 Bí quyết ở đây: Tự động gọi lại hàm tải dữ liệu ngầm để update list
                window.fetch_troubleshoot_data(examCode);
            }
        )
        // Nếu thầy có lưu trạng thái "Đang thi" / "Rời tab" ở bảng khác (ví dụ: exam_sync), bỏ comment đoạn dưới
        /*
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'exam_sync', filter: `exam_code=eq.${examCode}` },
            (payload) => {
                window.fetch_troubleshoot_data(examCode);
            }
        )
        */
        .subscribe();
};

// Hàm đóng Modal an toàn, tự động ngắt kết nối mạng để nhẹ máy
window.close_student_control_modal = function(modalId) {
    let el = document.getElementById(modalId);
    if (el) el.remove();
    
    if (window.active_troubleshoot_subscription) {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        clientDb.removeChannel(window.active_troubleshoot_subscription);
        window.active_troubleshoot_subscription = null;
        console.log("🛑 Đã ngắt kết nối Live phòng thi.");
    }
};

// =========================================================================
// 1. ADMIN: KÉO DỮ LIỆU GIÁM SÁT (ĐÃ MỞ KHÓA TÍNH NĂNG ĐỌC TIẾN TRÌNH)
// =========================================================================
window.fetch_troubleshoot_data = async function(examCode, isSilent = false) {
    window.current_troubleshoot_exam = examCode; 
    let listContainer = document.getElementById('troubleshoot_student_list');
    if(listContainer && !isSilent) listContainer.innerHTML = `<div class="text-center p-4"><span class="spinner-border spinner-border-sm text-info"></span><div class="mt-2 text-white-50 small">Đang tải dữ liệu...</div></div>`;

    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        
        const { data: examData } = await clientDb.from('online_exams').select('allowed_users').eq('exam_code', examCode).single();
        let allowedArr = examData ? (examData.allowed_users || "").split(',').map(s => s.trim().toLowerCase()).filter(s => s !== "") : [];
        let isAllAllowed = allowedArr.includes('all'); 

        const { data: allUsers } = await clientDb.from('users').select('student_id, full_name, role, class_code, inventory');
        
        // 🌟 SỬA TẠI ĐÂY: Thêm chữ 'progress' vào lệnh select để máy chủ trả về % làm bài
        const { data: results, error: errResults } = await clientDb.from('exam_results')
            .select('student_id, score, is_submitted, is_absent, is_locked, client_status, offense_count, away_time, progress')
            .eq('exam_code', examCode);
            
        if (errResults) throw errResults;

        let filteredClassUsers = [];
        let sttCounter = 1; 

        allUsers.forEach(u => {
            let uCls = (u.class_code || u.role || '').toLowerCase();
            let uId = u.student_id.toLowerCase();
            let isAllowed = isAllAllowed || allowedArr.includes(uCls) || allowedArr.includes(uId);

            if (isAllowed) {
                filteredClassUsers.push({ 
                    rawId: u.student_id, id: uId, name: u.full_name || 'Chưa cập nhật', 
                    cls: u.class_code || u.role || '', inv: u.inventory || 0, stt: sttCounter++
                });
            }
        });

        window.current_troubleshoot_users = filteredClassUsers; 
        window.current_troubleshoot_submitted = {}; window.current_troubleshoot_started = []; window.current_troubleshoot_punished = []; window.current_troubleshoot_sync = {}; 
        
        if (results) {
            results.forEach(r => {
                let sId = r.student_id.toLowerCase();
                if (r.is_absent || r.is_locked) window.current_troubleshoot_punished.push({ id: sId, type: r.is_absent ? 'ban' : 'lock' });
                else {
                    window.current_troubleshoot_started.push(sId);
                    if (r.is_submitted) window.current_troubleshoot_submitted[sId] = r.score;
                }
                
                // 🌟 NHẬN DỮ LIỆU: Đưa r.progress vào bộ nhớ (nếu trống thì mặc định = 0)
                window.current_troubleshoot_sync[sId] = { 
                    offenses: r.offense_count || 0, 
                    away: r.away_time || 0, 
                    client_status: r.client_status || 'OFFLINE',
                    progress: r.progress || 0 
                };
            });
        }
        
        let searchInput = document.getElementById('ctrl_search_student');
        window.render_troubleshoot_list(searchInput ? searchInput.value : ""); 
    } catch(err) {
        if(listContainer) listContainer.innerHTML = `<div class="text-danger p-3 text-center fw-bold">LỖI KẾT NỐI: ${err.message}</div>`;
    }
};

// =========================================================================
// 🎨 ADMIN: VẼ GIAO DIỆN DANH SÁCH (TÍCH HỢP THANH TIẾN TRÌNH REALTIME)
// =========================================================================
window.render_troubleshoot_list = function(searchQuery) {
    let listContainer = document.getElementById('troubleshoot_student_list');
    if(!listContainer || !window.current_troubleshoot_users) return;

    let q = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let filterType = window.current_troubleshoot_filter || 'all';

    let counts = { all: window.current_troubleshoot_users.length, online: 0, away: 0, offline: 0, submitted: 0, punished: 0 };

    window.current_troubleshoot_users.forEach(u => {
        let isPunished = window.current_troubleshoot_punished.find(p => p.id === u.id);
        let isSub = window.current_troubleshoot_submitted[u.id] !== undefined;
        let isStarted = window.current_troubleshoot_started.includes(u.id);
        let sync = window.current_troubleshoot_sync[u.id] || { client_status: 'OFFLINE' };

        if (isPunished) counts.punished++;
        else if (isSub) counts.submitted++;
        else if (isStarted) {
            if (sync.client_status === 'ONLINE') counts.online++;
            else if (sync.client_status === 'AWAY') counts.away++;
            else counts.offline++;
        }
    });

    ['all', 'online', 'away', 'offline', 'submitted', 'punished'].forEach(f => {
        let btn = document.getElementById('ts_filter_' + f);
        if (btn) {
            let label = btn.innerText.split('(')[0].trim();
            btn.innerText = `${label} (${counts[f]})`;
        }
    });

    let filteredUsers = [];
    window.current_troubleshoot_users.forEach(u => {
        let matchStr = (u.rawId + " " + u.name + " " + u.cls).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let isPunished = window.current_troubleshoot_punished.find(p => p.id === u.id);
        let score = window.current_troubleshoot_submitted[u.id];
        let isSub = (score !== undefined);
        let isStarted = window.current_troubleshoot_started.includes(u.id);
        let sync = window.current_troubleshoot_sync[u.id] || { client_status: 'OFFLINE', offenses: 0, away: 0, progress: 0 };

        let passFilter = true;
        if (filterType === 'punished' && !isPunished) passFilter = false;
        if (filterType === 'submitted' && !isSub) passFilter = false;
        if (filterType === 'online' && (isPunished || isSub || !isStarted || sync.client_status !== 'ONLINE')) passFilter = false;
        if (filterType === 'away' && (isPunished || isSub || !isStarted || sync.client_status !== 'AWAY')) passFilter = false;
        if (filterType === 'offline' && (isPunished || isSub || (!isStarted && sync.client_status !== 'OFFLINE') || (isStarted && sync.client_status !== 'OFFLINE'))) passFilter = false;

        if (passFilter && (q === "" || matchStr.includes(q))) {
            filteredUsers.push({ ...u, isPunished, isSub, score, isStarted, sync });
        }
    });

    filteredUsers.sort((a, b) => a.stt - b.stt);
    let html = '';
    let displayIndex = 1;

    filteredUsers.forEach(u => {
        let statusBadge = '';
        let warningBadge = '';
        let borderClass = 'border-secondary';
        let customStyle = 'background: #212529; transition: 0.2s;';
        
        let safeName = u.name.replace(/'/g, "\\'");
        let safeExamCode = window.current_troubleshoot_exam || '';

        let hasStrangeBehavior = (u.sync.offenses > 0 || u.sync.client_status === 'AWAY') && !u.isSub && !u.isPunished;

        if (hasStrangeBehavior) {
            warningBadge = `<span class="text-danger ms-2 animate__animated animate__flash animate__infinite animate__slower" style="font-size: 0.7rem; font-weight: bold;"><i class="bi bi-exclamation-triangle-fill"></i> Rời tab x${u.sync.offenses} (${u.sync.away}s)</span>`;
            borderClass = 'border-danger shadow';
            customStyle = `background: rgba(239, 68, 68, 0.08) !important; box-shadow: 0 0 12px rgba(239, 68, 68, 0.25); border: 1px solid #ef4444 !important; transition: 0.2s;`;
        }

        // 🌟 LẤY TIẾN ĐỘ LÀM BÀI (Mặc định 0% nếu chưa có data, 100% nếu đã nộp)
        let progressPct = u.isSub ? 100 : (u.sync.progress || 0);
        let progressHtml = '';
        
        if (u.isStarted && !u.isPunished) {
            let pColor = progressPct === 100 ? '#10b981' : (progressPct > 50 ? '#38bdf8' : '#f59e0b');
            progressHtml = `
            <div class="mt-2 d-flex align-items-center gap-2 w-100">
                <div class="progress flex-grow-1" style="height: 4px; background: #343a40; border-radius: 4px; overflow: hidden;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: ${progressPct}%; background-color: ${pColor};"></div>
                </div>
                <span class="fw-bold" style="font-size: 0.65rem; color: ${pColor}; width: 32px; text-align: right;">${progressPct}%</span>
            </div>`;
        }

        if (u.isPunished) {
            let label = u.isPunished.type === 'ban' ? 'Vắng' : 'Bị Khóa';
            statusBadge = `<span class="badge bg-danger ms-1" style="font-size: 0.65rem;">${label}</span>`;
            borderClass = 'border-danger';
        } else if (u.isSub) {
            statusBadge = `<span class="badge bg-info text-dark ms-1" style="font-size: 0.65rem;">Đã nộp: ${u.score}đ</span>`;
            borderClass = 'border-info';
        } else if (u.isStarted) {
            if (u.sync.client_status === 'ONLINE') {
                statusBadge = `<span class="badge bg-success ms-1" style="font-size: 0.65rem;">Đang thi</span>`;
                if (!hasStrangeBehavior) borderClass = 'border-success';
            } else if (u.sync.client_status === 'AWAY') {
                statusBadge = `<span class="badge bg-warning text-dark ms-1" style="font-size: 0.65rem;">Rời Tab</span>`;
            } else {
                statusBadge = `<span class="badge bg-secondary ms-1" style="font-size: 0.65rem;">Đã thoát</span>`;
            }
        } else {
            statusBadge = `<span class="text-white-50 small ms-1" style="font-size: 0.65rem;">Chưa thi</span>`;
        }

        let actionHtml = '';
        if (u.isSub) {
            actionHtml = `
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-info py-0 px-2" style="font-size: 0.7rem; height: 22px;" onclick="event.preventDefault(); window.edit_student_score('${u.id}', '${u.rawId}', '${safeName}', ${u.score}, 0)"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger py-0 px-2" style="font-size: 0.7rem; height: 22px;" onclick="event.preventDefault(); window.delete_student_score('${safeExamCode}', '${u.id}', '${safeName}')" title="Xóa điểm"><i class="bi bi-trash"></i></button>
                </div>`;
        } else if (u.isStarted) {
            actionHtml = `<button class="btn btn-sm btn-outline-secondary py-0 px-2 text-white-50 border-secondary" style="font-size: 0.7rem; height: 22px;" onclick="event.preventDefault(); window.delete_student_score('${safeExamCode}', '${u.id}', '${safeName}')" title="Reset Trạng thái">Reset</button>`;
        }

        let displayStt = (filterType === 'all') ? u.stt : displayIndex++;

        html += `
        <label class="d-flex align-items-center p-2 mb-2 rounded compact-student-card ${borderClass}" style="${customStyle} cursor: pointer;">
            <div class="d-flex align-items-center me-2 flex-shrink-0">
                <input type="checkbox" class="form-check-input troubleshoot-chk" value="${u.rawId}" style="width: 1.1rem; height: 1.1rem; cursor: pointer; border-color: #64748b; margin-top: 0; background-color: #0f172a;">
            </div>
            <div class="flex-grow-1" style="min-width: 0; line-height: 1.3;">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div class="fw-bold text-white text-truncate" style="font-size: 0.85rem;">
                        <span class="text-white-50 me-1" style="font-size: 0.75rem;">#${displayStt}</span>${u.name}
                    </div>
                    ${actionHtml}
                </div>
                <div class="d-flex align-items-center flex-wrap" style="font-size: 0.75rem;">
                    <span class="text-info me-2">${u.rawId}</span>
                    <span class="text-white-50 me-2">${u.cls || '?'}</span>
                    ${statusBadge}
                    ${warningBadge}
                </div>
                <!-- VÙNG HIỂN THỊ THANH TIẾN TRÌNH -->
                ${progressHtml}
            </div>
        </label>`;
    });

    if (html === '') html = `<div class="text-center p-4"><i class="bi bi-inbox fs-3 text-white-50"></i><div class="text-white-50 small mt-1">Không có sinh viên nào.</div></div>`;
    listContainer.innerHTML = html;
};

// 🌟 ĂNG-TEN LẮNG NGHE SỰ KIỆN: Khi sinh viên đổi trạng thái, Admin tự cập nhật
window.active_troubleshoot_subscription = null;
window.enable_realtime_troubleshoot = function(examCode) {
    const clientDb = typeof db !== 'undefined' ? db : window._supabase;
    if (!clientDb) return;
    
    if (window.active_troubleshoot_subscription) {
        clientDb.removeChannel(window.active_troubleshoot_subscription);
    }
    
    window.active_troubleshoot_subscription = clientDb.channel('troubleshoot-' + examCode)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_results', filter: 'exam_code=eq.' + examCode }, (payload) => {
            // Khi có sinh viên rời tab hoặc nộp bài, tự động làm mới màn hình một cách âm thầm (isSilent = true)
            if(typeof window.fetch_troubleshoot_data === 'function') {
                window.fetch_troubleshoot_data(examCode, true); 
            }
        }).subscribe();
};

window.open_student_control_modal = function(examCode) {
    let modalId = 'student_control_modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    window.current_troubleshoot_filter = 'all';

    let html = `
    <style>
        /* ÉP FULL-SCREEN NGUYÊN KHỐI TRÊN MOBILE */
        @media (max-width: 767.98px) {
            .mobile-px-half { padding-left: 0.5px !important; padding-right: 0.5px !important; }
        }
        .tab-filter-btn { border-radius: 6px; font-weight: 600; font-size: 0.75rem; transition: 0.1s; border: 1px solid transparent; background: transparent; }
        .tab-filter-btn.active { background: #343a40; border-color: #495057; color: #fff !important; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .compact-student-card { transition: 0.1s; border: 1px solid #343a40; }
        .compact-student-card:active { transform: scale(0.98); background: #343a40 !important; }
    </style>

    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column animate__animated animate__fadeIn" style="background: #212529; z-index: 99999; overflow: hidden;">
        
        <!-- HEADER TÀNG HÌNH ĐỒNG BỘ -->
        <div class="p-3 border-bottom flex-shrink-0 bg-dark" style="border-color: rgba(255,255,255,0.05) !important; margin-left: -0.5px; margin-right: -0.5px;">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="window.close_student_control_modal('${modalId}')">
                    <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
                </button>
                
                <h6 class="fw-bold text-white mb-0 text-center flex-grow-1 text-truncate" style="font-size: 1rem; letter-spacing: 0.5px;">
                    GIÁM SÁT PHÒNG THI
                    <span class="badge bg-danger ms-2 animate__animated animate__pulse animate__infinite" style="font-size: 0.6rem; padding: 3px 6px;">🔴 LIVE</span>
                </h6>
                
                <div style="width: 40px;" class="d-block d-md-none"></div>
                <div style="width: 85px;" class="d-none d-md-block"></div>
            </div>
            
            <div class="position-relative mb-2">
                <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-2 text-white-50" style="font-size: 0.8rem;"></i>
                <input type="text" id="ctrl_search_student" class="form-control text-white border-secondary ps-4" placeholder="Tìm Mã SV, Tên..." onkeyup="window.filter_troubleshoot_students(this.value)" style="background: rgba(0,0,0,0.2); font-size: 0.85rem; padding: 10px 12px; border-radius: 8px; height: 48px;">
            </div>
            
            <!-- Thanh danh mục -->
            <div class="d-flex gap-1 pb-1 hide-scroll" style="overflow-x: auto; white-space: nowrap;">
                <button id="ts_filter_all" class="btn text-white-50 flex-shrink-0 py-1 px-2 tab-filter-btn active" onclick="window.set_troubleshoot_filter('all')">Tất cả</button>
                <button id="ts_filter_online" class="btn text-white-50 flex-shrink-0 py-1 px-2 tab-filter-btn" onclick="window.set_troubleshoot_filter('online')">🟢 Đang thi</button>
                <button id="ts_filter_away" class="btn text-white-50 flex-shrink-0 py-1 px-2 tab-filter-btn" onclick="window.set_troubleshoot_filter('away')">🟡 Rời Tab</button>
                <button id="ts_filter_offline" class="btn text-white-50 flex-shrink-0 py-1 px-2 tab-filter-btn" onclick="window.set_troubleshoot_filter('offline')">⚪ Đã thoát</button>
                <button id="ts_filter_submitted" class="btn text-white-50 flex-shrink-0 py-1 px-2 tab-filter-btn" onclick="window.set_troubleshoot_filter('submitted')">🔵 Đã nộp</button>
                <button id="ts_filter_punished" class="btn text-white-50 flex-shrink-0 py-1 px-2 tab-filter-btn" onclick="window.set_troubleshoot_filter('punished')">🔴 Vi phạm</button>
            </div>
        </div>

        <!-- DANH SÁCH SINH VIÊN (Nền trong suốt) -->
        <div id="troubleshoot_student_list" class="flex-grow-1 p-2 mobile-px-half custom-scrollbar" style="overflow-y: auto; overflow-x: hidden; background: transparent;">
            <div class="text-center p-4"><span class="spinner-border spinner-border-sm text-info"></span><div class="mt-2 text-white-50 small">Đang tải...</div></div>
        </div>

        <!-- FOOTER 4 NÚT TRÀN VIỀN XUỐNG ĐÁY (Thêm mt-auto) -->
        <div class="p-0 border-top flex-shrink-0 w-100 mt-auto bg-transparent" style="border-color: rgba(255,255,255,0.05) !important;">
            <div class="d-flex w-100">
                <button class="btn fw-bold d-flex flex-column align-items-center justify-content-center py-3 flex-grow-1" onclick="window.admin_punish_student('${examCode}', 'unlock')" style="background: transparent; color: #0ea5e9; border: none; border-radius: 0; border-right: 1px solid rgba(255,255,255,0.05);"><i class="bi bi-unlock fs-5 mb-1"></i> <span style="font-size: 0.65rem;">Mở Khóa</span></button>
                <button class="btn fw-bold d-flex flex-column align-items-center justify-content-center py-3 flex-grow-1" onclick="window.admin_punish_student('${examCode}', 'lock')" style="background: transparent; color: #f59e0b; border: none; border-radius: 0; border-right: 1px solid rgba(255,255,255,0.05);"><i class="bi bi-lock fs-5 mb-1"></i> <span style="font-size: 0.65rem;">Khóa Máy</span></button>
                <button class="btn fw-bold d-flex flex-column align-items-center justify-content-center py-3 flex-grow-1" onclick="window.admin_punish_student('${examCode}', 'ban')" style="background: transparent; color: #ef4444; border: none; border-radius: 0; border-right: 1px solid rgba(255,255,255,0.05);"><i class="bi bi-person-x fs-5 mb-1"></i> <span style="font-size: 0.65rem;">Đình Chỉ</span></button>
                <button class="btn fw-bold d-flex flex-column align-items-center justify-content-center py-3 flex-grow-1 text-white-50" onclick="window.admin_punish_student('${examCode}', 'unban')" style="background: transparent; border: none; border-radius: 0;"><i class="bi bi-person-check fs-5 mb-1"></i> <span style="font-size: 0.65rem;">Gỡ Phạt</span></button>
            </div>
        </div>
        
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    window.fetch_troubleshoot_data(examCode);
    if(typeof window.enable_realtime_troubleshoot === 'function') window.enable_realtime_troubleshoot(examCode);
};

window.set_troubleshoot_filter = function(filterType) {
    window.current_troubleshoot_filter = filterType;
    ['all', 'online', 'away', 'offline', 'submitted', 'punished'].forEach(f => {
        let btn = document.getElementById('ts_filter_' + f);
        if (btn) {
            if (f === filterType) { btn.classList.add('active'); btn.classList.remove('text-white-50'); } 
            else { btn.classList.remove('active'); btn.classList.add('text-white-50'); }
        }
    });
    let searchInput = document.getElementById('ctrl_search_student');
    window.render_troubleshoot_list(searchInput ? searchInput.value : "");
};

window.edit_student_score = function(studentIdLower, rawId, name, currentScore, invCount) {
    let modalId = 'edit_score_modal';
    let existing = document.getElementById(modalId);
    if(existing) existing.remove();

    let html = `
    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.9); z-index: 100000; backdrop-filter: blur(5px);">
        <div class="glass-panel p-4 shadow-lg d-flex flex-column animate__animated animate__zoomIn" style="width: 90%; max-width: 350px; border-radius: 20px; background: #1a1a1a !important; border: 1px solid #38bdf8;">
            <h6 class="fw-bold text-info mb-3 text-center"><i class="bi bi-pencil-square me-2"></i>CẬP NHẬT ĐIỂM</h6>
            
            <div class="text-center mb-3">
                <div class="fw-bold text-white fs-6">${rawId} - ${name}</div>
                <div class="badge bg-warning text-dark mt-2 fw-bold" style="font-size: 0.8rem; padding: 6px 12px;"><i class="bi bi-gift-fill me-1"></i> Số Quà sinh viên có: ${invCount}</div>
            </div>

            <div class="mb-4">
                <label class="text-white-50 small fw-bold mb-2">Điểm mới / Điểm cộng thêm:</label>
                <input type="number" step="0.1" id="new_score_input" class="form-control form-control-lg bg-dark text-info text-center fw-bold glass-input-style" value="${currentScore}" style="font-size: 2rem; padding: 10px;">
            </div>

            <div class="d-flex gap-2">
                <button class="btn btn-secondary flex-fill fw-bold rounded-pill py-2" onclick="document.getElementById('${modalId}').remove()">HỦY</button>
                <button class="btn btn-info flex-fill fw-bold rounded-pill text-white shadow-sm py-2" onclick="window.save_new_score('${studentIdLower}')"><i class="bi bi-check-circle me-1"></i> LƯU ĐIỂM</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    let inputEl = document.getElementById('new_score_input');
    
    // Auto-focus để gõ điểm luôn
    setTimeout(() => {
        inputEl.focus(); 
        inputEl.select();
    }, 100);
};
// [ĐÃ GỠ BẢN TRÙNG] window.save_new_score (dòng cũ 4095-4126) - bản dùng thật nằm ở phía dưới file

// 🌟 HÀM XUẤT EXCEL GỌN NHẸ (DỰA TRÊN DỮ LIỆU ĐÃ ĐƯỢC TIỀN XỬ LÝ)
window.export_exam_scores_excel = function(examCode) {
    let exportData = [];
    let filterType = window.current_troubleshoot_filter || 'all';
    
    // Đã được lọc đúng danh sách lớp ngay từ lúc fetch, chỉ cần sort lại STT
    let sortedUsers = [...window.current_troubleshoot_users].sort((a, b) => a.stt - b.stt);
    
    let today = new Date();
    let dateStr = String(today.getDate()).padStart(2, '0') + '/' + String(today.getMonth() + 1).padStart(2, '0') + '/' + today.getFullYear();
    let scoreColName = `Điểm ${examCode} (${dateStr})`;

    let sttCount = 1;

    sortedUsers.forEach((u) => {
        let isAbsent = window.current_troubleshoot_absent.includes(u.id);
        let score = window.current_troubleshoot_submitted[u.id];
        let isSubmitted = (score !== undefined);
        let isActive = !isAbsent && !isSubmitted;

        // BỘ LỌC ĐỂ XUẤT EXCEL KHỚP 100% VỚI NÚT TRÊN MÀN HÌNH
        if (filterType === 'absent' && !isAbsent) return;
        if (filterType === 'submitted' && isAbsent) return; 
        if (filterType === 'active' && !isActive) return;

        let isStarted = window.current_troubleshoot_started && window.current_troubleshoot_started.includes(u.id);
        
        let status = isAbsent ? "Vắng" : (isSubmitted ? "Đã nộp" : (isStarted ? "Đang thi" : "Chưa vào phòng thi"));
        let finalScore = isSubmitted ? score : "";
        let outStt = (filterType === 'submitted' || filterType === 'absent') ? sttCount++ : u.stt;
        
        exportData.push({
            "STT": outStt,
            "Lớp": u.cls,
            "Mã SV": u.rawId,
            "Họ Tên": u.name,
            "Trạng Thái": status,
            [scoreColName]: finalScore,
            "Số Quà": u.inv
        });
    });
    
    let filterNameDisplay = filterType === 'active' ? 'DangThi' : filterType === 'submitted' ? 'DaNop_ChuaNop' : filterType === 'absent' ? 'Vang' : 'TatCa';

    if (exportData.length === 0) return window.show_toast(`⚠️ Không có sinh viên nào trong nhóm "${filterType}" để xuất Excel!`, true);

    let ws = XLSX.utils.json_to_sheet(exportData);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DiemThi");
    XLSX.writeFile(wb, `Diem_${examCode}_${filterNameDisplay}_${today.getTime()}.xlsx`);
    window.show_toast("✅ Đã xuất File Excel thành công!");
};

// Hàm Cấm thi/Hủy cấm, Mở khóa (Giữ nguyên)
// [ĐÃ GỠ BẢN TRÙNG] window.admin_toggle_absence (dòng cũ 4151-4160) - bản dùng thật nằm ở phía dưới file

// [ĐÃ GỠ BẢN TRÙNG] window.admin_unlock_device (dòng cũ 4153-4163) - bản dùng thật nằm ở phía dưới file

window.filter_troubleshoot_students = function(val) {
    window.render_troubleshoot_list(val);
};

// =========================================================================
// 🚪 HÀM ĐĂNG XUẤT (MƯỢT MÀ KHÔNG CẦN TẢI LẠI TRANG)
// =========================================================================
window.logout_user = function() {
    window.show_alert("XÁC NHẬN ĐĂNG XUẤT", "Bạn có chắc chắn muốn đăng xuất khỏi thiết bị này?", function(ans) {
        if (ans) {
            // 1. Xóa sổ bộ nhớ tự động đăng nhập
            localStorage.removeItem('mcq_saved_id');
            localStorage.removeItem('mcq_saved_pass');
            
            // 2. Dọn dẹp túi đồ/popup nếu đang mở
            let popover = document.getElementById('game_inventory_popover');
            if(popover) popover.remove();

            // 3. Ẩn toàn bộ giao diện bên trong
            let elementsToHide = ['main_content', 'step_1', 'step_3', 'admin_dashboard', 'student_dashboard', 'history_view_area', 'quiz_area'];
            elementsToHide.forEach(id => {
                let el = document.getElementById(id);
                if (el) el.style.setProperty('display', 'none', 'important');
            });

            // 4. Bật lại màn hình đăng nhập gốc VÀ dọn sạch thông báo cũ
            let loginScreen = document.getElementById('login_screen');
            if (loginScreen) loginScreen.style.setProperty('display', 'block', 'important');
            
            let errorEl = document.getElementById('login_error');
            if (errorEl) { errorEl.innerHTML = ''; errorEl.style.display = 'none'; }

            // 5. Xóa trắng ô nhập liệu để sẵn sàng cho người mới
            let idInput = document.getElementById('student_id');
            let passInput = document.getElementById('access_code');
            if (idInput) { idInput.value = ''; idInput.focus(); }
            if (passInput) passInput.value = '';

            // 6. Xóa dữ liệu phiên làm việc hiện tại
            window.current_student_id = null;
            window.current_user_role = null;
            window.current_student_name = null;
            
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    });
};

// =========================================================================
// 🕷️ TRẠM GÁC REAL-TIME BẰNG SUPABASE (GIÁM SÁT & NHẬN LỆNH KÍCH TỨC THÌ)
// =========================================================================
(function setup_realtime_proctoring() {
    window.sync_exam_client_status = async function(statusText) {
        if (window.is_exam_started && window.proctoring_state && window.proctoring_state.exam_code) {
            try {
                await db.from('exam_results').upsert({ 
                    exam_code: window.proctoring_state.exam_code, student_id: window.current_student_id, 
                    offense_count: window.offense_count || 0, away_time: window.away_time_total || 0,
                    client_status: statusText
                }, { onConflict: 'exam_code,student_id' });
            } catch(e) {}
        }
    };

    let is_recovered = false;
    let current_live_status = null; 
    
    setInterval(() => {
        let isDoingExam = window.is_exam_started && window.proctoring_state && window.proctoring_state.exam_code;
        if (isDoingExam) {
            let storageKey = "CHEAT_LOG_" + window.proctoring_state.exam_code + "_" + window.current_student_id;
            if (!is_recovered) {
                let saved = localStorage.getItem(storageKey);
                if (saved) { try { let p = JSON.parse(saved); window.offense_count = Math.max(window.offense_count || 0, p.offenses); window.away_time_total = Math.max(window.away_time_total || 0, p.away); } catch(e){} }
                is_recovered = true;
            }
            localStorage.setItem(storageKey, JSON.stringify({ offenses: window.offense_count || 0, away: window.away_time_total || 0 }));
            if (!document.hidden && current_live_status !== 'ONLINE') {
                window.sync_exam_client_status('ONLINE');
                current_live_status = 'ONLINE';
            }
        } else { is_recovered = false; current_live_status = null; }
    }, 10000); 

    setInterval(() => {
        if (window.is_exam_started && window.proctoring_state && current_live_status !== 'ONLINE' && !document.hidden) {
            window.sync_exam_client_status('ONLINE');
            current_live_status = 'ONLINE';
        }
    }, 1000); 

    let old_back = window.back_to_subject_select;
    window.back_to_subject_select = async function() {
        await window.sync_exam_client_status('OFFLINE'); current_live_status = 'OFFLINE';
        if (old_back) old_back();
    };

    window.addEventListener('beforeunload', function () { window.sync_exam_client_status('OFFLINE'); });

    document.addEventListener("visibilitychange", function() {
        if (!(window.is_exam_started && window.proctoring_state && window.proctoring_state.is_active)) return;
        if (document.hidden) {
            window.sync_exam_client_status('AWAY'); current_live_status = 'AWAY';
        } else {
            window.sync_exam_client_status('ONLINE'); current_live_status = 'ONLINE'; 
        }
    });

    let old_warn = window.show_cheat_warning_ui;
    window.show_cheat_warning_ui = async function(duration, isExempt) {
        if (old_warn) old_warn(duration, isExempt); 
        await window.sync_exam_client_status('ONLINE'); current_live_status = 'ONLINE';
    };

    // 🌟 TÍCH HỢP ĂNG-TEN LẮNG NGHE LỆNH KÍCH/ĐÌNH CHỈ TỪ ADMIN (HOÀN CHỈNH)
    let init_punish_listener = setInterval(() => {
        // Chờ đến khi học sinh đăng nhập xong mới giương ăng-ten
        if (window.current_student_id && typeof db !== 'undefined') {
            clearInterval(init_punish_listener); // Dừng chờ
            
            if (window.active_student_punish_sub) db.removeChannel(window.active_student_punish_sub);
            
            window.active_student_punish_sub = db.channel('punish-' + window.current_student_id)
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'exam_results', 
                    filter: 'student_id=eq.' + window.current_student_id 
                }, (payload) => {
                    let r = payload.new;
                    
                    // Chỉ kích hoạt nếu sinh viên đang mở đúng bài thi đó
                    if (window.is_exam_started && window.proctoring_state && r.exam_code === window.proctoring_state.exam_code) {
                        if (r.is_absent) {
                            if(typeof window.force_kick_student === 'function') 
                                window.force_kick_student("🚫 ĐÌNH CHỈ THI", "Giám thị đã cấm thi và mời bạn ra khỏi phòng. Bài làm của bạn đã bị vô hiệu hóa.", true);
                        } 
                        else if (r.is_locked) {
                            if(typeof window.force_kick_student === 'function') 
                                window.force_kick_student("🔒 TÀI KHOẢN BỊ KHÓA TẠM THỜI", "Hệ thống phát hiện dấu hiệu bất thường hoặc bạn đã bị giám thị mời ra khỏi phòng.<br><br><b>Vui lòng giơ tay báo cáo giám thị để được MỞ KHÓA.</b>", false);
                        } 
                        else {
                            let overlay = document.getElementById('kick_overlay');
                            if (overlay && !r.is_absent && !r.is_locked) {
                                overlay.remove(); // Tự động thu hồi bảng đen khi Admin ấn Mở Khóa
                            }
                        }
                    }
                }).subscribe();
        }
    }, 2000); // Cứ 2 giây kiểm tra 1 lần xem học sinh đăng nhập chưa
})();

// =========================================================================
// 🛠️ ADMIN: HÀM RESET / XÓA DỮ LIỆU CỦA SINH VIÊN (ĐÃ FIX LỖI GIAO DIỆN)
// =========================================================================
window.delete_student_score = async function(examCode, studentId, studentName) {
    // 1. Hiện hộp thoại Xác nhận an toàn
    let msg = `⚠️ XÁC NHẬN RESET\n\nBạn có chắc chắn muốn xóa toàn bộ dữ liệu làm bài và trạng thái của sinh viên:\n[ ${studentId.toUpperCase()} - ${studentName} ] ?\n\nHành động này sẽ giúp sinh viên có thể vào thi lại từ đầu.`;
    if (!confirm(msg)) return;

    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        
        // 2. Gọi lệnh xóa dữ liệu khỏi bảng exam_results trên Supabase
        const { error } = await clientDb
            .from('exam_results')
            .delete()
            .eq('exam_code', examCode)
            .eq('student_id', studentId.toLowerCase());
            
        if (error) throw error;
        
        // 3. Thông báo thành công mượt mà
        if (typeof window.show_toast === 'function') {
            window.show_toast(`✅ Đã reset thành công sinh viên ${studentId.toUpperCase()}`, false);
        } else {
            alert(`✅ Đã reset thành công sinh viên ${studentId.toUpperCase()}`);
        }

        // 4. Quét lại dữ liệu Bảng giám sát ngay lập tức (Chế độ im lặng, không làm giật màn hình)
        if (typeof window.fetch_troubleshoot_data === 'function') {
            window.fetch_troubleshoot_data(examCode, true);
        }

    } catch (err) {
        alert("Lỗi khi reset dữ liệu Supabase: " + err.message);
    }
};


// =========================================================================
// 🚀 ENGINE SINH TRẮC HỌC (GIAO TIẾP VỚI FACE ID / TOUCH ID CỦA THIẾT BỊ)
// =========================================================================

// Hàm chuyển đổi chuỗi an toàn
function bufferToBase64url(buffer) {
    const byteLength = buffer.byteLength;
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (let i = 0; i < byteLength; i++) { str += String.fromCharCode(bytes[i]); }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function base64urlToBuffer(base64url) {
    const padding = '='.repeat((4 - base64url.length % 4) % 4);
    const base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const buffer = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { buffer[i] = rawData.charCodeAt(i); }
    return buffer.buffer;
}

// 1. GỌI ĐIỆN THOẠI QUÉT MẶT ĐỂ ĐĂNG KÝ
window.setup_face_id = async function() {
    if (!window.current_student_id) return alert("Bạn cần đăng nhập bằng mật khẩu trước để liên kết thiết bị!");
    
    if (!window.PublicKeyCredential) {
        return alert("Trình duyệt hoặc thiết bị của bạn không hỗ trợ công nghệ Face ID / Vân tay!");
    }

    try {
        let userIdBuffer = new TextEncoder().encode(window.current_student_id);
        let challengeBuffer = new Uint8Array(32);
        crypto.getRandomValues(challengeBuffer); // Tạo mã ngẫu nhiên chống giả mạo

        let publicKey = {
            challenge: challengeBuffer,
            rp: { 
                name: "Hệ thống Thi Trực Tuyến", 
                id: window.location.hostname // 🎯 THÊM DÒNG NÀY ĐỂ GẮN CHUẨN TÊN MIỀN VERCEL
            },
            user: {
                id: userIdBuffer,
                name: window.current_student_id,
                displayName: window.current_student_fullname || window.current_student_id
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
            // 🎯 THÊM LẠI 'platform' ĐỂ ÉP IPHONE DÙNG LUÔN FACE ID CỦA MÁY, KHÔNG ĐẨY SANG CHROME
            authenticatorSelection: { 
                authenticatorAttachment: "platform", 
                userVerification: "required" 
            },
            timeout: 60000,
            attestation: "none"
        };

        // Kích hoạt Camera / Cảm biến vân tay của thiết bị
        let credential = await navigator.credentials.create({ publicKey });
        
        let passkeyId = credential.id;

        // Lưu mã vào Supabase (bảng users, cột passkey_id)
        let res = await window.save_device_passkey(window.current_student_id, passkeyId);
        alert(res.message);

    } catch (err) {
        console.error(err);
        // 🌟 BÁO LỖI RÕ RÀNG ĐỂ DỄ BẮT BỆNH
        alert("Lỗi Sinh trắc học: " + err.message + "\n\nNguyên nhân thường gặp:\n1. Mở web bằng Zalo/Messenger (Hãy mở bằng Chrome/Safari).\n2. Máy chưa cài mật khẩu khóa màn hình.\n3. Máy tính bàn không có cảm biến.");
    }
};

// 2. GỌI ĐIỆN THOẠI QUÉT MẶT ĐỂ ĐĂNG NHẬP (1 CHẠM TỰ ĐỘNG ĐIỀN)
window.login_with_face_id = function() {
    let username = document.getElementById("student_id").value.trim();
    
    // 🌟 THUẬT TOÁN TỰ ĐỘNG ĐIỀN: Nếu ô trống, tự tìm ID cũ trong máy tính/điện thoại
    if (!username) {
        username = localStorage.getItem('mcq_saved_id');
        if (username) {
            document.getElementById("student_id").value = username; // Tự gõ chữ vào ô cho SV thấy
        } else {
            return window.show_toast("⚠️ Lần đầu trên máy này, con hãy nhập Mã SV trước nhé!", true);
        }
    }

    let btn = document.getElementById("btn_face_login");
    let originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Đang quét...`;
    btn.disabled = true;

    // Lấy chìa khóa từ Server về
    window.get_device_passkey(username).then(async function(res) {
        if (!res.success) {
            btn.innerHTML = originalHtml; btn.disabled = false;
            return window.show_toast(res.message, true);
        }

        try {
            let challengeBuffer = new Uint8Array(32);
            crypto.getRandomValues(challengeBuffer);

            // Bật Camera so sánh khuôn mặt
            let assertion = await navigator.credentials.get({
                publicKey: {
                    challenge: challengeBuffer,
                    allowCredentials: [{
                        id: base64urlToBuffer(res.passkeyId),
                        type: 'public-key',
                        transports: ['internal']
                    }],
                    userVerification: "required"
                }
            });

            // Nếu quét mặt thành công, gửi mã vào Server để đổi lấy dữ liệu đăng nhập
            if (assertion) {
                document.getElementById('login_error').style.display = 'block';
                document.getElementById('login_error').className = "text-success fw-bold text-center mt-3";
                document.getElementById('login_error').innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Xác thực khuôn mặt thành công. Đang tải dữ liệu...`;
                
                // 🔒 RPC login_by_passkey() — KHÔNG BAO GIỜ đọc/lộ cột password ra trình duyệt
                const { data, error: uerr } = await db.rpc('login_by_passkey', { p_student_id: username, p_passkey_id: res.passkeyId });
                if (uerr || !data || data.success === false) {
                    window.show_toast("Lỗi xác thực máy chủ!", true);
                    btn.innerHTML = originalHtml; btn.disabled = false;
                } else {
                    document.getElementById('student_id').value = data.student_id;
                    btn.innerHTML = originalHtml; btn.disabled = false;
                    localStorage.setItem('mcq_saved_id', data.student_id);
                    window.apply_login_success(data);
                }
            }
            
        } catch (err) {
            console.error(err);
            btn.innerHTML = originalHtml; btn.disabled = false;
            // 🌟 BÁO LỖI CHI TIẾT RA MÀN HÌNH
            window.show_toast("Lỗi quét khuôn mặt: " + err.message, true);
        }
    });
};

// =========================================================================
// 🚀 SUPABASE ADMIN BACKEND: LƯU VÀ XÓA MÔN HỌC CHUẨN XÁC
// =========================================================================

window.save_subject_to_sheet = async function(btn) {
    let selectedUI = document.querySelector('input[name="ui_template_opt"]:checked');
    let uiVal = selectedUI ? selectedUI.value : '1'; 
    
    // Tự động gán role 'all' nếu bỏ trống để ai cũng thấy
    let roleInput = document.getElementById('modal_s_role').value.trim();
    if (roleInput === '') roleInput = 'all';

    // 🎯 Đảm bảo key xuất ra khớp 100% với tên cột trên Supabase (Bảng 'subjects')
    let data = {
        subject_key: document.getElementById('modal_s_code').value.trim().toLowerCase(),
        name: document.getElementById('modal_s_name').value.trim(),
        icon: document.getElementById('modal_s_icon').value.trim() || '📚',
        file_id: document.getElementById('modal_s_fileid').value.trim(), // Nếu CSDL của thầy cột này tên khác, hãy sửa tên biến key 'file_id' tương ứng
        sheet_name: document.getElementById('modal_s_sheetname').value.trim(),
        role_access: roleInput, // Supabase column name
        ui_template: uiVal
    };
    
    if(!data.subject_key || !data.name) {
        return window.show_toast("⚠️ Vui lòng nhập đủ Mã môn và Tên hiển thị!", true);
    }
    
    let originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ĐANG LƯU...`; 
    btn.classList.add('disabled');
    
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        
        // Dùng lệnh Upsert (Update nếu có, Insert nếu mới) dựa trên subject_key
        const { error } = await clientDb.from('subjects').upsert([data], { onConflict: 'subject_key' });
        
        if (error) throw error;
        
        window.show_toast("✅ Lưu môn học thành công!");
        
        // Cập nhật lại Object cấu hình cục bộ để giao diện đổi ngay lập tức
        window.subjectConfig[data.subject_key] = { 
            id: data.file_id, 
            sheetName: data.sheet_name, 
            role: data.role_access, 
            icon: data.icon, 
            name: data.name, 
            ui_template: data.ui_template 
        };
        
        document.getElementById('subject_modal').remove(); 
        
        // Làm mới lại bảng quản lý môn học
        if (typeof window.render_subject_management === 'function') {
            window.render_subject_management(); 
        }
    } catch (err) {
        console.error("Lỗi lưu môn:", err);
        window.show_toast("❌ Lỗi: " + err.message, true);
        btn.innerHTML = originalHtml; 
        btn.classList.remove('disabled');
    }
};

window.remove_subject = function(code) {
    window.show_alert("CẢNH BÁO", `Bạn có chắc chắn muốn xóa môn học <b class="text-danger">${code}</b> khỏi hệ thống?<br><br><small class="text-info">Lưu ý: Dữ liệu câu hỏi của môn này vẫn được bảo lưu, chỉ tên môn học bị xóa khỏi danh mục.</small>`, async function(ans) {
        if (!ans) return;
        
        try {
            const clientDb = typeof db !== 'undefined' ? db : window._supabase;
            const { error } = await clientDb.from('subjects').delete().eq('subject_key', code);
            
            if (error) throw error;
            
            window.show_toast("✅ Đã xóa môn học thành công!"); 
            delete window.subjectConfig[code]; 
            
            if (typeof window.render_subject_management === 'function') {
                window.render_subject_management();
            }
        } catch (err) { 
            window.show_toast("❌ Lỗi xóa môn: " + err.message, true); 
        }
    });
};

// --- 2. QUẢN LÝ PHÂN QUYỀN TÀI KHOẢN (ĐÃ FIX TRẠNG THÁI NÚT VÀ MODAL) ---
window.save_user_to_sheet = async function(btn) {
    let studentId = document.getElementById('modal_u_id').value.trim();
    let pass = document.getElementById('modal_u_pass').value.trim();
    let fullName = document.getElementById('modal_u_name').value.trim();
    let isAdmin = document.getElementById('modal_u_isadmin').checked; 
    
    let roleInput = document.getElementById('modal_u_role');
    let userRole = roleInput ? roleInput.value.trim() : (isAdmin ? 'all' : 'medical'); 
    if (isAdmin) userRole = 'all';

    let finalPerms = "all";
    if (!isAdmin) {
        let pArr = [];
        document.querySelectorAll('.chk-system:checked').forEach(c => pArr.push(c.value));
        document.querySelectorAll('.chk-edit:checked').forEach(c => pArr.push(c.getAttribute('data-base') + '_edit'));
        document.querySelectorAll('.chk-view:checked').forEach(c => { 
            let base = c.getAttribute('data-base'); 
            if (!pArr.includes(base + '_edit')) pArr.push(base + '_view'); 
        });
        document.querySelectorAll('.chk-stats:checked').forEach(c => pArr.push(c.getAttribute('data-base') + '_stats'));
        finalPerms = pArr.join(', ');
    }

    if (!studentId) {
        return window.show_toast("⚠️ Vui lòng nhập Mã ID sinh viên!", true);
    }

    let userPayload = { 
        student_id: studentId, 
        full_name: fullName, 
        role: userRole, 
        permissions: finalPerms 
    };

    if (pass) {
        userPayload.password = pass;
    }

    let originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Đang lưu...`; 
    btn.classList.add('disabled');

    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        const { error } = await clientDb.from('users').upsert([userPayload], { onConflict: 'student_id' });
        
        if (error) throw error;
        
        // 🎯 1. TRẢ LẠI TRẠNG THÁI NÚT NGAY LẬP TỨC (Tránh bị kẹt chữ Đang lưu)
        btn.innerHTML = originalHtml; 
        btn.classList.remove('disabled');

        window.show_toast("✅ Lưu phân quyền thành công!"); 
        
        // 🎯 2. ĐÓNG MODAL VÀ DỌN SẠCH LỚP PHỦ BOOTSTRAP BACKDROP
        let modalEl = document.getElementById('user_modal');
        if (modalEl) modalEl.remove(); 
        
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';

        // 🎯 3. TẢI LẠI GIAO DIỆN QUẢN LÝ NGƯỜI DÙNG
        if (typeof window.render_user_management === 'function') {
            window.render_user_management(); 
        }
    } catch (err) { 
        console.error("❌ Lỗi:", err);
        window.show_toast("❌ Lỗi: " + err.message, true); 
        
        btn.innerHTML = originalHtml; 
        btn.classList.remove('disabled'); 
    }
};

window.remove_user = function(uname) {
    window.show_alert("CẢNH BÁO XÓA", `Chắc chắn muốn xóa tài khoản: <b class="text-danger">${uname}</b>?`, async function(ans) {
        if (!ans) return;
        try { 
            const { error } = await db.from('users').delete().eq('student_id', uname); 
            if (error) throw error; 
            window.show_toast("✅ Đã xóa tài khoản thành công!"); 
            if (typeof window.render_user_management === 'function') {
                window.render_user_management(); 
            }
        } catch (err) { 
            window.show_toast("❌ Lỗi xóa: " + err.message, true); 
        }
    });
};

// =========================================================================
// 🚀 ENGINE ĐỌC VÀ IMPORT DANH SÁCH EXCEL TỪ NHÀ TRƯỜNG (ĐÃ FIX LỖI 409)
// =========================================================================
window.process_excel_import = async function(event, classCode) {
    const file = event.target.files[0];
    if (!file) return;

    if (!classCode) {
        window.show_toast("⚠️ Vui lòng nhập mã lớp trước khi import!", true);
        event.target.value = ""; 
        return;
    }

    window.show_toast("<span class='spinner-border spinner-border-sm me-2'></span> Đang xử lý file Excel...");

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const clientDb = typeof db !== 'undefined' ? db : window._supabase;

            // 🎯 BƯỚC 1: TẠO LỚP HỌC TRƯỚC ĐỂ TRÁNH LỖI KHÓA NGOẠI (409 CONFLICT)
            const { error: classErr } = await clientDb.from('classes').upsert([
                { class_code: classCode, class_name: "Lớp " + classCode }
            ], { onConflict: 'class_code' });
            
            if (classErr) throw classErr;

            // 🎯 BƯỚC 2: ĐỌC DỮ LIỆU TỪ FILE EXCEL
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            let newUsers = [];
            
            for (let i = 0; i < jsonData.length; i++) {
                let row = jsonData[i];
                let maSV = row['Mã sinh viên'];
                
                if (!maSV) continue; // Bỏ qua dòng trống

                let ho = (row['Họ'] || "").toString().trim();
                let ten = (row['Tên'] || "").toString().trim();
                let fullName = ho + " " + ten;
                let ngaySinh = (row['Ngày sinh'] || "").toString().trim();
                
                // Mật khẩu mặc định = Ngày sinh (Bỏ dấu /). VD: 16/08/2008 -> 16082008
                let defaultPass = ngaySinh.replace(/\//g, '') || "123456";

                newUsers.push({
                    student_id: String(maSV).trim(),
                    password: defaultPass,
                    full_name: fullName.trim(),
                    role: 'k12', 
                    class_code: classCode, 
                    ngay_sinh: ngaySinh,
                    khoa_hoc: (row['Khóa học'] || "").toString().trim(),
                    nganh_hoc: (row['Ngành học'] || "").toString().trim(),
                    thoi_diem_dang_ky: (row['Thời điểm đăng ký'] || "").toString().trim()
                });
            }

            if (newUsers.length === 0) {
                event.target.value = "";
                return window.show_toast("⚠️ Không tìm thấy dữ liệu hợp lệ (Cần cột 'Mã sinh viên')!", true);
            }

            // 🎯 BƯỚC 3: LƯU DANH SÁCH SINH VIÊN VÀO BẢNG USERS
            const { error } = await clientDb.from('users').upsert(newUsers, { onConflict: 'student_id' });

            if (error) throw error;

            window.show_toast(`✅ Đã tạo lớp ${classCode} và nhập thành công ${newUsers.length} sinh viên!`);
            event.target.value = ""; // Reset nút chọn
            
            // Tải lại giao diện để hiển thị lớp mới
            if (typeof window.render_user_management === 'function') {
                window.render_user_management();
            }

        } catch (err) {
            console.error("❌ Lỗi Import:", err);
            window.show_toast("❌ Lỗi khi đọc file: " + (err.message || "Kiểm tra Console"), true);
            event.target.value = "";
        }
    };
    reader.readAsArrayBuffer(file);
};
// =========================================================================
// 🚀 QUẢN LÝ PHÒNG THI (DANH SÁCH CHÍNH - GIAO DIỆN SUPER APP)
// =========================================================================
window.dashboard_sync_interval = null;

window.render_exam_management = async function() {
    const container = document.getElementById('dash_subject_cards_container');
    container.innerHTML = `<div class="col-12 text-center p-5"><div class="spinner-border text-info"></div><div class="mt-2 text-info fw-bold">Đang tải Quản lý phòng thi...</div></div>`;
    
    if (window.dashboard_sync_interval) clearInterval(window.dashboard_sync_interval);

    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        
        const { data: exams, error } = await clientDb.from('online_exams').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        let statsMap = await window.fetch_dashboard_stats_silently(exams);

        // 🌟 Lấy thông tin Quà và Rank Mini
        let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
        let inventoryCount = parseInt(localStorage.getItem(invKey)) || 0;
        let rankMiniHtml = typeof window.get_user_rank_html === 'function' ? window.get_user_rank_html(true) : '👑';
        let studentNameDisplay = window.current_student_name || window.current_student_id || "Admin";

        // 🌟 BẮT ĐẦU DỰNG GIAO DIỆN (HEADER + DANH SÁCH)
        let html = `
        <style>
            .premium-exam-card { transition: 0.3s; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; background: #121416; border-radius: 16px; border: 1px solid #2b3035 !important; }
            .premium-exam-card:hover { border-color: #0ea5e9 !important; box-shadow: 0 8px 25px rgba(14, 165, 233, 0.2); transform: translateY(-4px); background: #1e293b; }
            
            .exam-search-bar { background: #1a1d20; border: 1px solid #2b3035; border-radius: 12px; color: #fff; padding: 10px 15px 10px 35px; font-size: 0.85rem; transition: 0.2s; height: 48px; }
            .exam-search-bar:focus { border-color: #10b981; outline: none; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15); }

            /* ÉP FULL MÀN HÌNH & GỌT VIỀN THẺ TRÊN MOBILE (0.5PX) */
            @media (max-width: 767.98px) {
                #dash_subject_cards_container { padding: 0 !important; }
                #dash_subject_cards_container .row { margin: 0 !important; }
                .exam-col-mobile { padding-left: 0.5px !important; padding-right: 0.5px !important; padding-bottom: 2px !important; }
                .premium-exam-card { 
                    border-radius: 0 !important; 
                    border-left: none !important; 
                    border-right: none !important; 
                    box-shadow: none !important;
                    border-top: 1px solid rgba(255,255,255,0.05) !important;
                    border-bottom: 1px solid rgba(255,255,255,0.05) !important;
                }
            }
            
            .exam-status-bar { height: 5px; width: 100%; transition: 0.3s; }
            .status-bar-open { background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }
            .status-bar-closed { background: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
            
            .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-top: 12px; }
            .info-item { padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); }
            .info-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; }
            .info-value { font-size: 0.85rem; font-weight: 600; }
            
            /* CSS CHUẨN NÚT GẠT iOS (TOGGLE SWITCH) */
            .ios-switch { position: relative; display: inline-block; width: 44px; height: 24px; margin: 0; }
            .ios-switch input { opacity: 0; width: 0; height: 0; }
            .ios-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; transition: .3s; border-radius: 34px; background-color: rgba(255,255,255,0.1); }
            .ios-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: #fff; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
            .ios-switch input:checked + .ios-slider { background-color: #10b981; border-color: #10b981 !important; }
            .ios-switch input:not(:checked) + .ios-slider { background-color: #ef4444; border-color: #ef4444 !important; }
            .ios-switch input:checked + .ios-slider:before { transform: translateX(20px); }
        </style>

        <div class="row w-100 m-0 g-3">
            <!-- HEADER TÀNG HÌNH CHUẨN 1 NỀN -->
            <div class="col-12 px-0 animate__animated animate__fadeIn sticky-top z-3 mb-0 mb-md-3" style="top: 0;">
                <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark" style="margin-left: -0.5px; margin-right: -0.5px;">
                    <button class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="window.render_admin_hub()">
                        <i class="bi bi-chevron-left fs-4"></i><span class="d-none d-md-inline ms-1">Thoát</span>
                    </button>
                    <h6 class="text-white fw-bold mb-0 text-center flex-grow-1 text-truncate px-2 text-uppercase" style="font-size: 1.1rem; letter-spacing: 0.5px;">
                        PHÒNG THI ONLINE
                    </h6>
                    <div class="d-flex align-items-center gap-2 flex-shrink-0">
                        <span class="text-white-50 d-none d-sm-block fw-bold ms-2" style="font-size: 0.75rem;">${studentNameDisplay}</span>
                        <!-- Ô Quà không nền, không viền -->
                        <div class="d-flex align-items-center gap-1 stat-card-hover ms-1" title="Túi Đồ" style="cursor: pointer;" onclick="window.toggle_inventory_popover(event)">
                            <span style="font-size: 1.1rem;">🎁</span>
                            <span class="text-warning fw-bold" style="font-size: 0.85rem;" id="dashboard_inventory_count">${inventoryCount}</span>
                        </div>
                        <div style="transform: scale(0.85);">${rankMiniHtml}</div>
                    </div>
                </div>
                
                <!-- THANH TÌM KIẾM VÀ CÔNG CỤ (Có khoảng hở và bo góc tinh tế) -->
                <div class="w-100 p-2 mt-2 d-flex flex-column flex-sm-row gap-2 justify-content-between align-items-center" style="background: transparent;">
                    <div class="position-relative w-100 flex-grow-1">
                        <i class="bi bi-search position-absolute top-50 translate-middle-y text-white-50" style="left: 12px; font-size: 0.9rem;"></i>
                        <input type="text" id="exam_search_bar" class="form-control exam-search-bar w-100 shadow-sm" placeholder="Tìm tên phòng thi, mã phòng..." oninput="window.filter_exam_list(this.value)" autocomplete="off">
                    </div>
                    <div class="d-flex gap-2 w-100 w-sm-auto flex-shrink-0">
                        <button class="btn btn-info fw-bold shadow-sm text-dark flex-grow-1 flex-sm-grow-0 d-flex justify-content-center align-items-center" style="border-radius: 12px; height: 48px; padding: 0 20px;" onclick="window.open_exam_modal()">
                        <i class="bi bi-plus-circle-fill me-2 fs-5"></i> <span class="d-inline">TẠO PHÒNG MỚI</span>
                        </button>
                    </div>
                </div>
            </div>`;

        if (!exams || exams.length === 0) { 
            html += `<div class="col-12 text-center p-5 mt-4"><i class="bi bi-inbox text-white-50" style="font-size: 4rem;"></i><div class="text-white-50 mt-3 fw-bold fs-5">Chưa có phòng thi nào.</div></div>`; 
        } 
        else {
            const formatDate = (dateStr) => {
                if (!dateStr) return null;
                return new Date(dateStr).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
            };

            exams.forEach((ex, idx) => {
                let isMo = ex.status === "MỞ" || ex.status === "🟢 MỞ (Thi ngay)";
                let topBarClass = isMo ? 'status-bar-open' : 'status-bar-closed';
                let subjectDisplayName = window.subjectConfig[ex.subject_key] ? window.subjectConfig[ex.subject_key].name : ex.subject_key;
                let safeExStr = encodeURIComponent(JSON.stringify({ code: ex.exam_code, name: ex.exam_name, time: ex.time_limit, status: ex.status, pass: ex.password, users: ex.allowed_users, auto_open: ex.auto_open, auto_close: ex.auto_close }));
                let s = statsMap[ex.exam_code] || { total: 0, online: 0, away: 0, offline: 0, sub: 0, punished: 0 };
                
                let openStr = formatDate(ex.auto_open) || "Tự do";
                let closeStr = formatDate(ex.auto_close) || "Không giới hạn";
                let searchStr = `${ex.exam_name.toLowerCase()} ${ex.exam_code.toLowerCase()} ${subjectDisplayName.toLowerCase()}`;

                html += `
                <div class="col-12 col-lg-6 exam-col-mobile exam-card-wrapper animate__animated animate__fadeInUp" style="animation-delay: ${idx * 0.05}s;" data-search="${searchStr}">
                    <div class="premium-exam-card d-flex flex-column h-100 text-white">
                        
                        <!-- DẢI MÀU TRẠNG THÁI -->
                        <div class="exam-status-bar ${topBarClass}"></div>
                        
                        <div class="p-3 d-flex flex-column flex-grow-1">
                            
                            <!-- HEADER THẺ ĐỀ THI -->
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div class="pe-2">
                                    <h5 class="fw-bold text-white mb-2" style="font-size: 1.1rem; line-height: 1.4;">${ex.exam_name}</h5>
                                    <div class="d-flex align-items-center gap-2 flex-wrap">
                                        <span class="badge font-monospace text-warning px-2 py-1" style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3);">${ex.exam_code}</span>
                                        <div class="text-info fw-bold" style="font-size: 0.75rem;"><i class="bi bi-journal-bookmark-fill me-1"></i> ${subjectDisplayName}</div>
                                    </div>
                                </div>
                                
                                <div class="d-flex flex-column align-items-end flex-shrink-0 pt-1">
                                    <label class="ios-switch mb-1" title="Bật/Tắt phòng thi">
                                        <input type="checkbox" ${isMo ? 'checked' : ''} onchange="window.toggle_exam_status('${ex.exam_code}', this.checked ? 'MỞ' : 'ĐÓNG')">
                                        <span class="ios-slider"></span>
                                    </label>
                                    ${isMo ? `<span class="text-success fw-bold mt-1" style="font-size: 0.65rem; letter-spacing: 0.5px;">ĐANG MỞ</span>` : `<span class="text-danger fw-bold mt-1" style="font-size: 0.65rem; letter-spacing: 0.5px;">ĐÃ KHÓA</span>`}
                                </div>
                            </div>

                            <!-- LƯỚI THÔNG TIN -->
                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label text-white-50">THỜI LƯỢNG</div>
                                    <div class="info-value"><i class="bi bi-clock-history text-warning me-1"></i> ${ex.time_limit} phút</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label text-white-50">ĐỐI TƯỢNG</div>
                                    <div class="info-value text-truncate" title="${ex.allowed_users || 'Tất cả'}"><i class="bi bi-people-fill text-info me-1"></i> ${ex.allowed_users ? ex.allowed_users.toUpperCase() : 'Tất cả'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label text-white-50">HIỆU LỰC</div>
                                    <div class="info-value" style="font-size: 0.7rem;"><span class="text-success">${openStr}</span> <br> <span class="text-danger">${closeStr}</span></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label text-white-50">MẬT KHẨU</div>
                                    <div class="info-value">${ex.password ? `<span class="text-danger"><i class="bi bi-key-fill"></i> ${ex.password}</span>` : `<span class="text-white-50">Tắt</span>`}</div>
                                </div>
                            </div>

                            <!-- RADAR GIÁM SÁT TRỰC TIẾP -->
                            <div class="mt-3 pt-3 border-top" style="border-color: rgba(255,255,255,0.05) !important;">
                                <div class="info-label text-white-50 mb-2"><i class="bi bi-radar text-success fs-6 me-1"></i> RADAR GIÁM SÁT TRỰC TIẾP</div>
                                <div class="d-flex flex-wrap gap-2" id="radar_zone_${ex.exam_code}">
                                    ${window.generate_radar_badges_html(s)}
                                </div>
                            </div>
                        </div>

                        <!-- 🌟 THANH CÔNG CỤ (ACTION BAR): KHÔNG NỀN, TRÀN 100% -->
                        <div class="p-0 border-top d-flex w-100 bg-transparent mt-auto" style="border-color: rgba(255,255,255,0.05) !important;">
                            <button class="btn py-2 fw-bold flex-grow-1 d-flex flex-column align-items-center justify-content-center text-info bg-transparent border-0 border-end border-secondary" style="border-radius: 0; border-color: rgba(255,255,255,0.05) !important;" onclick="window.open_student_control_modal('${ex.exam_code}')">
                                <i class="bi bi-person-video3 fs-4 mb-1"></i> <span style="font-size: 0.65rem;">GIÁM SÁT</span>
                            </button>
                            <button class="btn py-2 fw-bold flex-grow-1 d-flex flex-column align-items-center justify-content-center text-warning bg-transparent border-0 border-end border-secondary" style="border-radius: 0; border-color: rgba(255,255,255,0.05) !important;" onclick="window.open_edit_exam_modal('${safeExStr}')">
                                <i class="bi bi-pencil-square fs-4 mb-1"></i> <span style="font-size: 0.65rem;">SỬA ĐỀ</span>
                            </button>
                            <button class="btn py-2 fw-bold flex-grow-1 d-flex flex-column align-items-center justify-content-center text-danger bg-transparent border-0" style="border-radius: 0;" onclick="window.delete_online_exam('${ex.exam_code}', '${ex.exam_name}')">
                                <i class="bi bi-trash3 fs-4 mb-1"></i> <span style="font-size: 0.65rem;">XÓA ĐỀ</span>
                            </button>
                        </div>
                    </div>
                </div>`;
            });
        }
        
        html += `</div>`; // Đóng row
        container.innerHTML = html;

        // Bổ sung hàm tìm kiếm phòng thi trực tiếp
        window.filter_exam_list = function(val) {
            let term = val.toLowerCase();
            let cards = document.querySelectorAll('.exam-card-wrapper');
            cards.forEach(c => {
                if(c.getAttribute('data-search').includes(term)) c.classList.remove('d-none');
                else c.classList.add('d-none');
            });
        };

        // ĐỘNG CƠ CẬP NHẬT NGẦM (Mỗi 5 giây quét 1 lần)
        if (exams && exams.length > 0) {
            window.dashboard_sync_interval = setInterval(async () => {
                let newStats = await window.fetch_dashboard_stats_silently(exams);
                exams.forEach(ex => {
                    let zone = document.getElementById(`radar_zone_${ex.exam_code}`);
                    let stat = newStats[ex.exam_code] || { total: 0, online: 0, away: 0, offline: 0, sub: 0, punished: 0 };
                    if (zone) zone.innerHTML = window.generate_radar_badges_html(stat);
                });
            }, 5000);
        }

    } catch(err) { 
        container.innerHTML = `<div class="text-danger p-5 text-center">Lỗi tải đề: ${err.message}</div>`; 
    }
};

// =========================================================================
// 🧩 CÁC HÀM PHỤ TRỢ CHO DASHBOARD REALTIME
// =========================================================================

// Hàm sinh HTML cho các cục Badge (Đảm bảo logic hiển thị/ẩn màu chuẩn xác)
window.generate_radar_badges_html = function(s) {
    let html = `<span class="glass-badge gb-total">Tổng: ${s.total}</span>`;
    
    html += s.online > 0 
        ? `<span class="glass-badge gb-online"><i class="bi bi-record-circle-fill animate__animated animate__flash animate__infinite"></i> Đang thi: ${s.online}</span>` 
        : `<span class="glass-badge gb-zero"><i class="bi bi-record-circle-fill"></i> Đang thi: 0</span>`;
        
    html += s.away > 0 
        ? `<span class="glass-badge gb-away animate__animated animate__pulse animate__infinite"><i class="bi bi-exclamation-triangle-fill"></i> Rời tab: ${s.away}</span>` 
        : `<span class="glass-badge gb-zero"><i class="bi bi-phone-vibrate-fill"></i> Rời tab: 0</span>`;
        
    html += s.offline > 0 
        ? `<span class="glass-badge gb-offline"><i class="bi bi-door-open-fill"></i> Đã thoát: ${s.offline}</span>` 
        : `<span class="glass-badge gb-zero"><i class="bi bi-door-open-fill"></i> Đã thoát: 0</span>`;
        
    html += s.sub > 0 
        ? `<span class="glass-badge gb-sub"><i class="bi bi-check-circle-fill"></i> Đã nộp: ${s.sub}</span>` 
        : `<span class="glass-badge gb-zero"><i class="bi bi-check-circle-fill"></i> Đã nộp: 0</span>`;
        
    html += s.punished > 0 
        ? `<span class="glass-badge gb-punished"><i class="bi bi-shield-lock-fill"></i> Vi phạm: ${s.punished}</span>` 
        : `<span class="glass-badge gb-zero"><i class="bi bi-shield-lock-fill"></i> Vi phạm: 0</span>`;
        
    return html;
};

// Hàm quét dữ liệu Database chạy ngầm không gây giật lag
window.fetch_dashboard_stats_silently = async function(exams) {
    let statsMap = {};
    if (!exams || exams.length === 0) return statsMap;
    
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        let examCodes = exams.map(e => e.exam_code);
        const { data: results } = await clientDb.from('exam_results')
            .select('exam_code, is_submitted, is_absent, is_locked, client_status')
            .in('exam_code', examCodes);
            
        if (results) {
            results.forEach(r => {
                if (!statsMap[r.exam_code]) {
                    statsMap[r.exam_code] = { total: 0, online: 0, away: 0, offline: 0, sub: 0, punished: 0 };
                }
                statsMap[r.exam_code].total++;

                if (r.is_absent || r.is_locked) {
                    statsMap[r.exam_code].punished++;
                } else if (r.is_submitted) {
                    statsMap[r.exam_code].sub++;
                } else {
                    if (r.client_status === 'ONLINE') statsMap[r.exam_code].online++;
                    else if (r.client_status === 'AWAY') statsMap[r.exam_code].away++;
                    else statsMap[r.exam_code].offline++; 
                }
            });
        }
    } catch (e) { console.error("Lỗi đồng bộ ngầm Radar:", e); }
    
    return statsMap;
};
// 🌟 Đổi giá trị <input type="datetime-local"> (giờ máy, không offset) sang ISO UTC
// chuẩn để lưu vào cột timestamptz — tránh lệch múi giờ khi so sánh auto_open/auto_close.
window.dtlocal_to_iso = function(v) {
    if (!v) return null;
    let d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
};

window.submit_online_exam_to_server = async function() {
    // 1. TÌM ĐÚNG NÚT BẤM TRÊN GIAO DIỆN MỚI
    let btn = document.querySelector('#online_exam_modal button[onclick*="submit_online_exam_to_server"]');
    let originalText = btn ? btn.innerHTML : "LƯU PHÒNG";

    // 2. LẤY DỮ LIỆU CƠ BẢN
    let code = document.getElementById('create_ex_code').value.trim();
    let time = document.getElementById('create_ex_time').value.trim();
    let name = document.getElementById('create_ex_name').value.trim();

    if (!code || !time || !name) return window.show_toast("⚠️ Vui lòng nhập đủ: Mã đề, Tên kỳ thi và Thời gian!", true);
    
    // Đổi trạng thái nút bấm
    if (btn) {
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> ĐANG LƯU...`; 
        btn.classList.add('disabled');
    }

    // 3. GOM DỮ LIỆU LỚP VÀ SINH VIÊN TỪ GIAO DIỆN UI MỚI
    let selectedRoles = [];
    document.querySelectorAll('.chk-class-item:checked').forEach(chk => selectedRoles.push(chk.value));
    
    let extraArr = window.current_extra_users || []; // Lấy danh sách tag sinh viên thi bù
    let finalAllowed = Array.from(new Set([...selectedRoles, ...extraArr])).join(', ');

    // 4. BẢN VÁ LỖI TỪ CODE GỐC CỦA THẦY: Bóc tách đáp án đa cấu trúc an toàn 100%
    let cleanQuestions = window.temp_online_exam_questions.map(q => {
        let oA = q.opta || q.optA || q.opt_a || q.opts_A || (q.opts && q.opts[0]) || "";
        let oB = q.optb || q.optB || q.opt_b || q.opts_B || (q.opts && q.opts[1]) || "";
        let oC = q.optc || q.optC || q.opt_c || q.opts_C || (q.opts && q.opts[2]) || "";
        let oD = q.optd || q.optD || q.opt_d || q.opts_D || (q.opts && q.opts[3]) || "";

        // Chỉ lọc bỏ các lựa chọn hoàn toàn trống
        let validOpts = [oA, oB, oC, oD].filter(o => o !== null && o !== undefined && String(o).trim() !== '');

        return {
            id: q.id, 
            type: q.type, 
            q: q.q || q.question || q.question_text || "", 
            opts: validOpts, // Đã an toàn 100%
            a: q.a || q.answer || "", 
            image: q.image || q.img || q.multimedia || "", 
            hint: q.hint || ""
        };
    });

    // Hàm bọc an toàn cho việc xử lý múi giờ
    const safe_iso = (val) => {
        if (!val) return null;
        return (typeof window.dtlocal_to_iso === 'function') ? window.dtlocal_to_iso(val) : new Date(val).toISOString();
    };

    // 5. GÓI DỮ LIỆU (Giữ nguyên tên cột questions_json theo CSDL của thầy)
    let payload = {
        exam_code: code, 
        subject_key: window.current_subject, 
        exam_name: name,
        time_limit: parseInt(time), 
        status: document.getElementById('create_ex_status').value, 
        password: document.getElementById('create_ex_pass').value.trim(),
        questions_json: cleanQuestions, 
        allowed_users: finalAllowed,
        auto_open: safe_iso(document.getElementById('create_ex_open').value),
        auto_close: safe_iso(document.getElementById('create_ex_close').value)
    };

    // 6. GỬI LÊN SUPABASE
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        const { error } = await clientDb.from('online_exams').insert([payload]);
        
        if (error) {
            if (error.code === '23505') throw new Error("Mã đề thi này đã tồn tại, vui lòng đổi mã khác!");
            throw error;
        }
        
        window.show_toast("🎉 Đã phát hành Đề thi lên Supabase!"); 
        
        // Dọn dẹp giao diện
        let modal = document.getElementById('online_exam_modal');
        if (modal) modal.remove(); 
        
        if (typeof window.render_exam_management === 'function') window.render_exam_management();
        
    } catch(err) { 
        window.show_toast("❌ Lỗi: " + err.message, true); 
        // Trả lại nút để bấm thử lại
        if (btn) { 
            btn.innerHTML = originalText; 
            btn.classList.remove('disabled'); 
        } 
    }
};

window.save_edit_exam = async function(code) {
    let btn = document.getElementById('btn_save_edit_exam');
    let ori = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`; btn.disabled = true;

    let selectedRoles = [];
    document.querySelectorAll('.edit_ex-user-chk:checked').forEach(chk => selectedRoles.push(chk.value));
    let specificStr = document.getElementById('edit_ex_specific_users').value.trim();
    if (specificStr) selectedRoles.push(specificStr);

    let payload = {
        exam_name: document.getElementById('edit_ex_name').value.trim(),
        status: document.getElementById('edit_ex_status').value, 
        time_limit: parseInt(document.getElementById('edit_ex_time').value),
        password: document.getElementById('edit_ex_pass').value.trim(),
        allowed_users: selectedRoles.join(", "),
        auto_open: window.dtlocal_to_iso(document.getElementById('edit_ex_open').value),
        auto_close: window.dtlocal_to_iso(document.getElementById('edit_ex_close').value)
    };

    try {
        const { error } = await db.from('online_exams').update(payload).eq('exam_code', code);
        if (error) throw error;
        window.show_toast("✅ Đã cập nhật đề thi!");
        document.getElementById('edit_exam_modal').remove(); window.render_exam_management(); 
    } catch(err) { window.show_toast("❌ Lỗi: " + err.message, true); btn.innerHTML = ori; btn.disabled = false; }
};

window.toggle_exam_status = async function(code, newStatus) {
    window.show_toast("⏳ Đang xử lý...");
    try {
        const { error } = await db.from('online_exams').update({ status: newStatus }).eq('exam_code', code);
        if (error) throw error; window.show_toast("✅ Đã đổi trạng thái phòng thi!"); window.render_exam_management();
    } catch(err) { window.show_toast("❌ Lỗi: " + err.message, true); }
};

window.delete_online_exam = function(code, name) {
    window.show_alert("CẢNH BÁO XÓA", `Xóa vĩnh viễn đề thi: <br><b class="text-danger">${name}</b>?`, async function(ans) {
        if (!ans) return;
        try {
            const { error } = await db.from('online_exams').delete().eq('exam_code', code);
            if (error) throw error; window.show_toast("✅ Đã xóa!"); window.render_exam_management();
        } catch(err) { window.show_toast("❌ Lỗi: " + err.message, true); }
    });
};

window.fetch_and_render_active_exams = async function() {
    let container = document.getElementById('dash_subject_cards_container'); if (!container) return;
    try {
        const { data: exams, error } = await db.from('online_exams').select('*').in('status', ['MỞ', '🟢 MỞ (Thi ngay)']).order('created_at', { ascending: false });
        if (error) throw error;
        let oldWrap = document.getElementById('active_exams_wrapper'); if (oldWrap) oldWrap.remove(); 
        if (!exams || exams.length === 0) return;

        let validExams = []; 
        let now = new Date(); 
        let currentRole = window.current_user_role || "";
        let sId = (window.current_student_id || "").toLowerCase();
        let sClass = (window.current_class_code || currentRole).toLowerCase(); // Đã thêm nhận diện Lớp

        exams.forEach(ex => {
            // Chỉ ẩn đi nếu đã quá hạn ĐÓNG
            if (ex.auto_close && new Date(ex.auto_close) < now) return; 
            
            // Admin và Giáo viên thấy mọi đề
            if (currentRole === 'all' || currentRole === 'admin' || currentRole === 'teacher') { 
                validExams.push(ex); return; 
            }
            
            // Lọc theo danh sách được phép
            let allowedArr = (ex.allowed_users || "").split(',').map(s => s.trim().toLowerCase()).filter(s => s !== "");
            if (allowedArr.length === 0) return;
            if (allowedArr.includes('all') || allowedArr.includes(sId) || (sClass && allowedArr.includes(sClass))) {
                validExams.push(ex);
            }
        });

        if (validExams.length === 0) return;

        let html = `<div id="active_exams_wrapper" class="col-12 px-1 mb-2 animate__animated animate__fadeInDown"><div class="glass-panel p-3" style="border: 2px dashed #ef4444; background: rgba(239, 68, 68, 0.15); border-radius: 16px;"><h6 class="fw-bold text-danger mb-3 text-uppercase"><i class="bi bi-fire me-2"></i>KỲ THI TRỰC TUYẾN</h6><div class="d-flex flex-column gap-2">`;
        
        validExams.forEach(ex => {
            let safeEx = encodeURIComponent(JSON.stringify({ examCode: ex.exam_code, subjectKey: ex.subject_key, examName: ex.exam_name, timeLimit: ex.time_limit, hasPassword: ex.password && ex.password !== "", password: ex.password, questionsJSON: ex.questions_json }));
            let subjectDisplayName = window.subjectConfig[ex.subject_key] ? window.subjectConfig[ex.subject_key].name : ex.subject_key;
            
            // KIỂM TRA XEM ĐÃ TỚI GIỜ MỞ CHƯA
            let isFuture = ex.auto_open && new Date(ex.auto_open) > now;
            let actionBtn = "";
            
            if (isFuture) {
                // Đề thi trong tương lai -> Khóa nút, báo thời gian
                let openTime = new Date(ex.auto_open).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric'});
                actionBtn = `<button class="btn btn-secondary fw-bold rounded-pill px-3 py-2 shadow-sm text-white-50" disabled style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);"><i class="bi bi-clock-history me-1"></i> Mở lúc: ${openTime}</button>`;
            } else {
                // Đã tới giờ -> Mở nút THI NGAY
                actionBtn = `<button class="btn btn-danger fw-bold rounded-pill px-4 py-2 shadow-lg" onclick="window.join_online_exam('${safeEx}')">THI NGAY <i class="bi bi-arrow-right-circle-fill"></i></button>`;
            }

            html += `<div class="p-3 rounded-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center shadow-sm gap-2" style="background: rgba(0,0,0,0.5); border-left: 5px solid ${isFuture ? '#6c757d' : '#ef4444'};">
                <div>
                    <div class="fw-bold ${isFuture ? 'text-white-50' : 'text-white'} mb-1" style="font-size: 1rem;">${ex.exam_name}</div>
                    <div class="text-white-50 d-flex align-items-center gap-2 flex-wrap" style="font-size: 0.75rem;">
                        <span class="badge ${isFuture ? 'bg-secondary' : 'bg-danger'} shadow-sm">Mã: ${ex.exam_code}</span>
                        <span>Môn: <b class="text-info">${subjectDisplayName}</b></span>
                        <span class="text-secondary">|</span>
                        <span><b>${ex.time_limit}</b> phút</span>
                        ${ex.password ? `<span class="text-warning ms-2"><i class="bi bi-lock-fill"></i> Có mật khẩu</span>` : ''}
                    </div>
                </div>
                ${actionBtn}
            </div>`;
        });
        html += `</div></div></div>`;
        
        let firstCard = container.querySelector('.animate__fadeInUp');
        if (firstCard) firstCard.insertAdjacentHTML('beforebegin', html); 
        else container.insertAdjacentHTML('beforeend', html);
    } catch(err) { console.error("Lỗi kéo đề thi:", err); }
};

window.join_online_exam = async function(encodedEx) {
    let ex = JSON.parse(decodeURIComponent(encodedEx));
    let originalBtn = event ? event.currentTarget : null; let oldHtml = "";
    if (originalBtn) { oldHtml = originalBtn.innerHTML; originalBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> ĐANG QUÉT...`; originalBtn.disabled = true; }
    try {
        if (originalBtn) { originalBtn.innerHTML = oldHtml; originalBtn.disabled = false; }
        if (ex.hasPassword) {
            window.show_prompt("MẬT KHẨU PHÒNG THI", `Vui lòng nhập mật khẩu để vào thi: <br><b class="text-info">${ex.examName}</b>`, function(pwd) {
                if (pwd === ex.password) window.start_online_exam(ex); else window.show_toast("❌ Mật khẩu phòng thi không chính xác!", true);
            });
        } else window.start_online_exam(ex);
    } catch(err) { if (originalBtn) { originalBtn.innerHTML = oldHtml; originalBtn.disabled = false; } window.show_toast("Lỗi xác thực: " + err.message, true); }
};


window.save_new_score = async function(studentIdLower) {
    let examCode = window.current_troubleshoot_exam;
    let newScore = parseFloat(document.getElementById('new_score_input').value.replace(',', '.'));
    if (isNaN(newScore)) return window.show_toast("⚠️ Vui lòng nhập số hợp lệ!", true);

    try {
        const { error } = await db.from('exam_results').upsert({ exam_code: examCode, student_id: studentIdLower, score: newScore, is_submitted: true }, { onConflict: 'exam_code,student_id' });
        if (error) throw error;
        window.current_troubleshoot_submitted[studentIdLower] = newScore;
        window.render_troubleshoot_list(document.getElementById('ctrl_search_student').value);
        document.getElementById('edit_score_modal').remove();
        window.show_toast("✅ Cập nhật điểm thành công!");
    } catch(e) { window.show_toast("❌ Lỗi: " + e.message, true); }
};

window.execute_delete_score = async function(examCode, studentId) {
    try {
        const { error } = await db.from('exam_results').delete().match({ exam_code: examCode, student_id: studentId });
        if (error) throw error;
        document.getElementById('custom_confirm_overlay').remove();
        window.fetch_troubleshoot_data(examCode);
        window.show_toast("✅ Đã dọn sạch bài làm!");
    } catch(err) { window.show_toast("❌ Lỗi: " + err.message, true); }
};

window.admin_toggle_absence = async function(examCode, isAbsent) {
    let chkIds = Array.from(document.querySelectorAll('.troubleshoot-chk:checked')).map(chk => chk.value.toLowerCase());
    if(chkIds.length === 0) return window.show_toast("⚠️ Vui lòng tick chọn ít nhất 1 sinh viên!", true);
    
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        // Chạy song song lệnh để phản hồi nhanh như chớp
        let promises = chkIds.map(id => 
            clientDb.from('exam_results').upsert(
                { exam_code: examCode, student_id: id, is_absent: isAbsent }, 
                { onConflict: 'exam_code,student_id' }
            )
        );
        await Promise.all(promises);

        window.show_toast("✅ Cập nhật trạng thái thành công!");
        window.fetch_troubleshoot_data(examCode); // Làm mới danh sách ngay lập tức, KHÔNG TẮT MODAL NỮA
    } catch(e) { window.show_toast("❌ Lỗi: " + e.message, true); }
};

window.admin_unlock_device = async function(examCode) {
    let chkIds = Array.from(document.querySelectorAll('.troubleshoot-chk:checked')).map(chk => chk.value.toLowerCase());
    if(chkIds.length === 0) return window.show_toast("⚠️ Vui lòng tick chọn sinh viên!", true);
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        let promises = chkIds.map(id => 
            clientDb.from('exam_results').upsert(
                { exam_code: examCode, student_id: id, is_locked: false }, 
                { onConflict: 'exam_code,student_id' }
            )
        );
        await Promise.all(promises);

        window.show_toast("✅ Đã mở khóa thiết bị!");
        window.fetch_troubleshoot_data(examCode); // KHÔNG TẮT MODAL
    } catch(e) { window.show_toast("❌ Lỗi: " + e.message, true); }
};

// =========================================================================
// 🛠️ HỆ THỐNG POPUP XÁC NHẬN (CHUẨN SUPER APP TRÀN VIỀN - FULLSCREEN)
// =========================================================================

window.show_alert = function(title, message, callback) {
    let modal = document.getElementById('custom_confirm'); 
    
    // 1. ÉP XÓA DOM CŨ ĐỂ KHÔNG BỊ KẸT LỖI CSS
    if (modal) {
        modal.remove();
    }
    
    // 2. TẠO DOM MỚI (Đã gỡ bỏ class d-flex để hàm close_confirm của thầy có thể ẩn được)
    let mHtml = `
    <style>
        @media (max-width: 767.98px) {
            .mobile-px-half { padding-left: 0.5px !important; padding-right: 0.5px !important; }
            .mobile-margin-0 { margin-left: 0 !important; margin-right: 0 !important; }
        }
    </style>

    <div id="custom_confirm" class="position-fixed top-0 start-0 w-100 h-100 flex-column animate__animated animate__fadeInUp" style="display:none; background: #212529; z-index: 9999999; overflow: hidden;">
        
        <!-- HEADER: Chỉ giữ Tiêu đề canh giữa tuyệt đối -->
        <div class="d-flex p-3 border-bottom border-secondary bg-dark flex-shrink-0 align-items-center">
            <h6 class="fw-bold mb-0 text-truncate w-100 text-center text-white modal-title-txt" style="letter-spacing: 0.5px; font-size: 1.1rem;"></h6>
        </div>

        <!-- BODY: Trượt tự do -->
        <div class="flex-grow-1 overflow-auto custom-scrollbar p-0 p-md-3 d-flex flex-column justify-content-center">
            <div class="mobile-px-half mobile-margin-0">
                <div class="rounded-4 p-4 text-center mx-auto" style="background: rgba(0,0,0,0.15); max-width: 400px; border: 1px solid rgba(255,255,255,0.05);">
                    <div class="mb-4 icon-container"></div>
                    <div class="text-white px-2 modal-msg-txt" style="font-size: 1.05rem; line-height: 1.6;"></div>
                </div>
            </div>
        </div>

        <!-- FOOTER: Chốt đáy, nút to tràn viền -->
        <div class="mt-auto d-flex w-100 footer-btn border-top border-secondary"></div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', mHtml);
    modal = document.getElementById('custom_confirm');
    
    // 3. NHẬN DIỆN NGỮ CẢNH ĐỂ ĐỔI MÀU & ICON
    let isExit = title.toLowerCase().includes('thoát') || message.toLowerCase().includes('thoát');
    let isSubmit = title.toLowerCase().includes('nộp');
    
    let confirmBtnColor = "linear-gradient(135deg, #0ea5e9, #2563eb)";
    let confirmText = "XÁC NHẬN";
    let iconHtml = '<i class="bi bi-exclamation-triangle-fill" style="font-size: 4.5rem; color: #f59e0b; filter: drop-shadow(0 0 15px rgba(245,158,11,0.4));"></i>';

    if (isExit) {
        confirmBtnColor = "linear-gradient(135deg, #f43f5e, #e11d48)";
        confirmText = "THOÁT"; 
        iconHtml = '<i class="bi bi-box-arrow-left" style="font-size: 4.5rem; color: #f43f5e; filter: drop-shadow(0 0 15px rgba(244,63,94,0.4));"></i>';
    } else if (isSubmit) {
        confirmBtnColor = "linear-gradient(135deg, #10b981, #059669)";
        confirmText = "NỘP BÀI";
        iconHtml = '<i class="bi bi-cloud-arrow-up-fill" style="font-size: 4.5rem; color: #10b981; filter: drop-shadow(0 0 15px rgba(16,185,129,0.4));"></i>';
    }

    // 4. ĐIỀN DỮ LIỆU
    modal.querySelector('.modal-title-txt').innerText = title; 
    modal.querySelector('.modal-msg-txt').innerHTML = message; 
    modal.querySelector('.icon-container').innerHTML = iconHtml;
    
    const footer = modal.querySelector('.footer-btn');
    if (callback) { 
        // Đã đổi chữ HỦY BỎ -> HỦY và THOÁT HẲN -> THOÁT
        footer.innerHTML = `
            <button class="btn btn-secondary fw-bold py-3 flex-grow-1" onclick="window.close_confirm(false)" style="border-radius: 0; font-size: 1.05rem;">HỦY</button>
            <button class="btn text-white fw-bold shadow-none py-3 flex-grow-1" onclick="window.close_confirm(true)" style="border-radius: 0; background: ${confirmBtnColor}; border: none; font-size: 1.05rem;">${confirmText}</button>`; 
        window.confirmCallback = callback; 
    } else { 
        footer.innerHTML = `
            <button class="btn text-white fw-bold w-100 py-3 shadow-none" onclick="window.close_confirm(false)" style="border-radius: 0; background: ${confirmBtnColor}; border: none; font-size: 1.05rem;">ĐÃ HIỂU</button>`; 
        window.confirmCallback = null; 
    }
    
    // 5. HIỂN THỊ (Sẽ áp dụng display: flex đè lên display: none gốc)
    modal.style.display = 'flex';
};
window.close_confirm = function(ans) {
    let modal = document.getElementById('custom_confirm');
    if(modal) modal.style.display = 'none';
    if (window.confirmCallback) { 
        let cb = window.confirmCallback;
        window.confirmCallback = null; // Xóa callback ngay để tránh dội lệnh
        cb(ans); 
    }
};

window.show_prompt = function(title, message, callback) {
    let modal = document.getElementById('custom_prompt_modal'); 
    
    // TỰ ĐỘNG SINH DOM NẾU BỊ THIẾU
    if (!modal) {
        let mHtml = `
        <div id="custom_prompt_modal" class="custom-modal animate__animated animate__fadeIn" style="display:none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 999999; justify-content: center; align-items: center; backdrop-filter: blur(5px);">
          <div class="glass-panel p-4 text-center shadow-lg" style="max-width: 350px; width: 90%; border-radius: 20px; background: rgba(15, 23, 42, 0.95); border: 1px solid #0ea5e9;">
            <h5 class="fw-bold text-info mt-2 mb-3 prompt-title"></h5>
            <div class="text-white-50 px-2 mb-3 prompt-msg" style="font-size: 0.9rem; line-height: 1.5;"></div>
            <input type="password" id="admin_pass_input" class="form-control text-center fw-bold text-warning glass-input-style mb-4" placeholder="****" style="letter-spacing: 2px;">
            <div class="d-flex gap-3 footer-btn">
                <button class="btn btn-secondary fw-bold" onclick="document.getElementById('custom_prompt_modal').style.display='none'" style="flex:1; border-radius: 12px;">HỦY</button>
                <button class="btn btn-info text-white fw-bold shadow-sm" id="confirm_pass_btn" style="flex:1; border-radius: 12px;">XÁC NHẬN</button>
            </div>
          </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', mHtml);
        modal = document.getElementById('custom_prompt_modal');
    }
    
    modal.querySelector('.prompt-title').innerText = title;
    modal.querySelector('.prompt-msg').innerHTML = message;
    
    let inputEl = document.getElementById('admin_pass_input');
    inputEl.value = ''; // Reset rỗng mật khẩu
    
    document.getElementById('confirm_pass_btn').onclick = () => { 
        modal.style.display = 'none'; 
        callback(inputEl.value); 
    };
    
    modal.style.display = 'flex';
    setTimeout(() => inputEl.focus(), 100);
};
// =========================================================================
// 🛠️ KHÔI PHỤC: HÀM MỞ GIAO DIỆN CHỈNH SỬA BÀI HỌC VÀ CÂU HỎI (ADMIN)
// =========================================================================

window.show_edit_lesson_list = function(subKey) {
    window.current_subject = subKey;
    let quizArea = document.getElementById('quiz_area');
    if (!quizArea) return;

    quizArea.style.height = 'auto'; 
    quizArea.style.display = 'block'; 
    quizArea.style.overscrollBehavior = 'auto';
    
    if(document.getElementById('step_1')) document.getElementById('step_1').style.display = 'none';
    if(document.getElementById('step_3')) document.getElementById('step_3').style.display = 'block';

    let qHeader = document.querySelector('#step_3 .fixed-top') || document.querySelector('#step_3 .header-fixed-wrapper');
    if(qHeader) qHeader.style.display = 'none';
    if(quizArea.parentElement) quizArea.parentElement.style.marginTop = '15px';

    let uniqueLessons = [];
    if (window.full_data[subKey]) {
        let lessonsMap = {};
        window.full_data[subKey].forEach(q => {
            if (q && q.lesson) {
                let L = String(q.lesson).trim();
                if (!lessonsMap[L]) { lessonsMap[L] = true; uniqueLessons.push(L); }
            }
        });
    }

    let displayName = (window.subjectConfig && window.subjectConfig[subKey]) ? window.subjectConfig[subKey].name : subKey.toUpperCase();
    let html = `
    <div class="p-3 glass-panel m-2 animate__animated animate__fadeIn">
        <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2" style="border-color: #2a2a2a !important;">
            <h5 class="text-info fw-bold mb-0"><i class="bi bi-folder2-open me-2"></i> Chọn bài để sửa: <span class="text-warning">${displayName}</span></h5>
            <button class="btn btn-sm btn-outline-light rounded-pill px-3 shadow-sm" onclick="window.back_to_subject_select()"><i class="bi bi-x-circle"></i> Thoát</button>
        </div>
        <div class="list-group rounded-3 shadow-sm mb-3">
            ${uniqueLessons.length > 0 ? uniqueLessons.map(lessonId => `
                <div class="list-group-item d-flex justify-content-between align-items-center p-3" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
                    <span class="fw-bold text-white fs-6"><i class="bi bi-book text-info me-2"></i> Bài ${lessonId}</span>
                    <button class="btn btn-sm btn-warning rounded-pill px-4 fw-bold shadow-sm" onclick="window.open_admin_lesson_panel('${subKey}', '${lessonId}')"><i class="bi bi-pencil-square me-1"></i> Sửa câu hỏi</button>
                </div>
            `).join('') : '<div class="p-3 text-center text-white-50">Chưa có dữ liệu bài học nào.</div>'}
        </div>
    </div>`;
    quizArea.innerHTML = html;
};

window.open_admin_lesson_panel = function(subKey, lessonId) {
    window.current_subject = subKey;
    window.selected_lessons_text = lessonId;

    if(document.getElementById('step_1')) document.getElementById('step_1').style.display = 'none';
    if(document.getElementById('step_3')) document.getElementById('step_3').style.display = 'block';
    
    let quizArea = document.getElementById('quiz_area');
    if (quizArea) {
        let qHeader = document.querySelector('#step_3 .header-fixed-wrapper') || document.querySelector('#step_3 .fixed-top');
        if(qHeader) qHeader.style.display = 'none'; 

        if(quizArea.parentElement) quizArea.parentElement.style.marginTop = '15px';
        quizArea.style.height = 'auto'; 
        quizArea.style.display = 'block'; 
        quizArea.style.overscrollBehavior = 'auto';
    }

    let currentData = (window.full_data && window.full_data[subKey]) ? window.full_data[subKey] : [];
    
    // Lọc lấy các câu hỏi thuộc bài đang chọn
    window.questions = currentData.filter(q => {
        if (!q || q.lesson == null) return false;
        return String(q.lesson).trim().toLowerCase() === String(lessonId).trim().toLowerCase();
    });

    window.questions.forEach((q, index) => { 
        q.id = q.id || q.old_uuid || (index + 1); 
        if (!q.original_q) q.original_q = q.q; 
    });

    // Gọi hàm vẽ 5 nút và danh sách câu hỏi
    if (typeof window.render_admin_panel === 'function') {
        window.render_admin_panel();
    } else {
        alert("LỖI: Trình duyệt không tìm thấy hàm vẽ giao diện! Vui lòng ấn Ctrl + F5 để tải lại.");
    }
};

// =========================================================================
// 🗂️ MENU CHỌN TAB XƯỞNG TƯƠNG TÁC (ẢNH / VIDEO)
// =========================================================================
window.open_interaction_selector = function() {
    let modalHtml = `
    <div id="interaction_selector_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.8); z-index: 27000; ">
        <div class="glass-panel p-4 shadow-lg mx-2 text-center" style="width: 100%; max-width: 400px; border-radius: 20px; border: 1px solid #f43f5e; background: rgba(15, 23, 42, 0.95);">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="fw-bold text-white mb-0"><i class="bi bi-layers-half text-danger me-2"></i>CHỌN LOẠI TƯƠNG TÁC</h6>
                <button class="btn-close btn-close-white" onclick="document.getElementById('interaction_selector_modal').remove()"></button>
            </div>
            
            <!-- TAB 1: HOTSPOT ẢNH -->
            <button class="btn w-100 mb-3 d-flex align-items-center p-3 stat-card-hover" style="background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.4); border-radius: 12px; color: #fff; text-align: left;" onclick="document.getElementById('interaction_selector_modal').remove(); window.open_hotspot_creator_modal()">
                <div class="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 45px; height: 45px; background: rgba(14, 165, 233, 0.3);">
                    <i class="bi bi-image text-info fs-4"></i>
                </div>
                <div>
                    <div class="fw-bold text-info" style="font-size: 1rem;">HOTSPOT ẢNH</div>
                    <div class="text-white-50" style="font-size: 0.75rem;">Đánh dấu vị trí trên Hình ảnh</div>
                </div>
            </button>

            <!-- TAB 2: CLIP VIDEO -->
            <button class="btn w-100 d-flex align-items-center p-3 stat-card-hover" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 12px; color: #fff; text-align: left;" onclick="document.getElementById('interaction_selector_modal').remove(); window.open_clip_creator_modal()">
                <div class="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" style="width: 45px; height: 45px; background: rgba(239, 68, 68, 0.3);">
                    <i class="bi bi-camera-reels text-danger fs-4"></i>
                </div>
                <div>
                    <div class="fw-bold text-danger" style="font-size: 1rem;">CLIP TƯƠNG TÁC</div>
                    <div class="text-white-50" style="font-size: 0.75rem;">Khoanh vùng trên Video (MP4)</div>
                </div>
            </button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// =========================================================================
// 🚀 CÔNG CỤ MIGRATION: CHUYỂN DỮ LIỆU TỪ EXCEL LÊN SUPABASE (BẢN CHỐT)
// =========================================================================

window.open_migration_tool = function() {
    let oldModal = document.getElementById('migration_modal');
    if (oldModal) oldModal.remove();

    let modalHtml = `
    <div id="migration_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.9); z-index: 99999; ">
        <div class="glass-panel p-4 shadow-lg text-center" style="width: 100%; max-width: 450px; border-radius: 20px; border: 1px solid #10b981; background: rgba(15, 23, 42, 0.95);">
            <div class="mb-3"><i class="bi bi-database-up text-success" style="font-size: 3.5rem; filter: drop-shadow(0 0 15px rgba(16,185,129,0.5));"></i></div>
            <h5 class="fw-bold text-white mb-2 text-uppercase">NẠP LỊCH SỬ TỪ EXCEL</h5>
            <p class="text-white-50 small mb-4">Hệ thống sẽ đọc file Excel (bất chấp tiếng Việt hay Anh) và bơm thẳng lên Supabase.</p>
            
            <input type="file" id="migration_file_input" accept=".xlsx, .xls" class="form-control bg-dark text-white mb-3" style="border: 1px dashed #10b981;">
            <div id="migration_status" class="text-info fw-bold mb-3 small" style="display: none;"></div>

            <div class="d-flex justify-content-center gap-2">
                <button class="btn btn-secondary px-4 rounded-pill fw-bold" onclick="document.getElementById('migration_modal').remove()">HỦY BỎ</button>
                <button class="btn btn-success px-4 rounded-pill fw-bold shadow-sm" onclick="window.execute_excel_migration()"><i class="bi bi-cloud-upload-fill me-1"></i> BƠM DỮ LIỆU</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.execute_excel_migration = function() {
    let fileInput = document.getElementById('migration_file_input');
    let file = fileInput.files[0];
    let statusEl = document.getElementById('migration_status');
    
    if (!file) {
        alert("⚠️ Vui lòng chọn file Excel trước!");
        return;
    }

    statusEl.style.display = 'block';
    statusEl.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Đang tải thư viện đọc Excel...`;

    // Tự động tải thư viện XLSX nếu chưa có
    if (typeof XLSX === 'undefined') {
        let script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        script.onload = () => window.process_excel_file(file, statusEl);
        document.head.appendChild(script);
    } else {
        window.process_excel_file(file, statusEl);
    }
};

window.process_excel_file = function(file, statusEl) {
    // 🔍 TỰ ĐỘNG DÒ TÌM BIẾN KẾT NỐI SUPABASE
    let dbClient = window.db || window.supabase || window.supabaseClient || (typeof supabase !== 'undefined' ? supabase : null);
    
    if (!dbClient) {
        statusEl.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle-fill"></i> Lỗi: Không tìm thấy kết nối Supabase!</span>`;
        alert("⚠️ Không tìm thấy biến kết nối Supabase. Thầy kiểm tra lại xem trong index.html thầy khởi tạo biến tên là gì nhé (db hay supabase).");
        return;
    }

    statusEl.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Đang phân tích file Excel...`;
    let reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            let data = new Uint8Array(e.target.result);
            let workbook = XLSX.read(data, {type: 'array', raw: false}); 
            
            const parseDate = (dStr) => {
                if (!dStr) return null;
                let s = String(dStr).trim();
                let timeMatch = s.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/); 
                let dateMatch = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); 
                if (dateMatch) {
                    let y = parseInt(dateMatch[3]), m = parseInt(dateMatch[2]) - 1, d = parseInt(dateMatch[1]);
                    let h = 0, min = 0, sec = 0;
                    if (timeMatch) { h = parseInt(timeMatch[1]); min = parseInt(timeMatch[2]); sec = parseInt(timeMatch[3]); }
                    let dt = new Date(y, m, d, h, min, sec);
                    return new Date(dt.getTime() - (dt.getTimezoneOffset() * 60000)).toISOString();
                }
                return new Date().toISOString(); 
            };

            let examCount = 0, logCount = 0;

            // BƠM BẢNG ĐIỂM THI
            if (workbook.Sheets['KetQuaTongHop']) {
                statusEl.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Đang bơm bảng Điểm Thi...`;
                let rawExams = XLSX.utils.sheet_to_json(workbook.Sheets['KetQuaTongHop']);
                let payloadExam = rawExams.map(r => ({
                    exam_code: String(r['Mã Đề'] || r['exam_code'] || 'CU_EXAM'),
                    student_id: String(r['Mã SV'] || r['student_id'] || '').trim().toLowerCase(),
                    fullname: String(r['Họ Tên'] || r['fullname'] || ''),
                    class: String(r['Lớp'] || r['class'] || ''),
                    subject: String(r['Môn thi'] || r['subject'] || ''),
                    start_time: parseDate(r['Bắt đầu'] || r['start_time']),
                    end_time: parseDate(r['Kết thúc'] || r['end_time']),
                    correct: parseInt(r['Đúng'] || r['correct']) || 0,
                    total: parseInt(r['Tổng'] || r['total']) || 0,
                    score: parseFloat(r['Điểm 10'] || r['score']) || 0,
                    offense_count: parseInt(r['Số lần Vi phạm'] || r['offense_count']) || 0,
                    away_time: parseInt(r['Tổng TG rời (giây)'] || r['away_time']) || 0,
                    wrong_qs: String(r['Câu SAI'] || r['wrong_qs'] || ''),
                    device_id: String(r['Mã Thiết Bị (Device ID)'] || r['device_id'] || ''),
                    browser: String(r['Trình duyệt/Hệ điều hành'] || r['browser'] || ''),
                    is_submitted: true
                })).filter(r => r.student_id !== '');

                for (let i = 0; i < payloadExam.length; i += 500) {
                    await dbClient.from('exam_results').upsert(payloadExam.slice(i, i + 500), {onConflict: 'exam_code,student_id'});
                }
                examCount = payloadExam.length;
            }

            // BƠM NHẬT KÝ ÔN TẬP
            if (workbook.Sheets['LOG_ONTAP']) {
                statusEl.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Đang bơm bảng Nhật Ký...`;
                let rawLogs = XLSX.utils.sheet_to_json(workbook.Sheets['LOG_ONTAP']);
                let payloadLogs = [];
                let progressDict = {}; 

                rawLogs.forEach(r => {
                    let stuId = String(r['Mã SV'] || r['student_id'] || '').trim().toLowerCase();
                    if (!stuId) return;
                    let subj = String(r['Môn'] || r['subject_key'] || '');
                    let lesson = String(r['Bài'] || r['lesson_name'] || '');
                    let pScore = parseFloat(r['Điểm'] || r['score']) || 0;
                    let pTotal = parseInt(r['Tổng'] || r['total']) || 0;
                    let pStartTime = parseDate(r['Bắt đầu làm'] || r['start_time'] || r['login_time']);
                    let pEndTime = parseDate(r['Kết thúc làm'] || r['Thoát phần mềm'] || r['time'] || r['logout_time']);

                    payloadLogs.push({
                        student_id: stuId, subject_key: subj, lesson_name: lesson,
                        score: pScore, total: pTotal, mode: r['Chế độ'] || r['mode'] || 'quiz',
                        device: r['Thiết bị'] || r['device'] || '', start_time: pStartTime, time: pEndTime,
                        offense_count: parseInt(r['Số lần rời Tab'] || r['offense_count']) || 0, 
                        away_time: parseInt(r['Tổng TG rời (s)'] || r['away_time']) || 0
                    });

                    let pKey = `${stuId}_${subj}_${lesson}`;
                    if (!progressDict[pKey] || progressDict[pKey].score < pScore) {
                        progressDict[pKey] = {
                            student_id: stuId, subject_key: subj, lesson_id: lesson,
                            score: pScore, total: pTotal, time: pEndTime
                        };
                    }
                });

                for (let i = 0; i < payloadLogs.length; i += 500) {
                    await dbClient.from('study_logs').insert(payloadLogs.slice(i, i + 500));
                }
                let payloadProgress = Object.values(progressDict);
                for (let i = 0; i < payloadProgress.length; i += 500) {
                    await dbClient.from('student_progress').upsert(payloadProgress.slice(i, i + 500), {onConflict: 'student_id,subject_key,lesson_id'});
                }
                logCount = payloadLogs.length;
            }

            statusEl.innerHTML = `<i class="bi bi-check-circle-fill text-success"></i> Đã nạp: <b>${examCount}</b> Điểm thi & <b>${logCount}</b> Lượt ôn!`;
            alert(`🎉 Bơm dữ liệu thành công! (${examCount} điểm thi, ${logCount} lượt ôn)`);
            setTimeout(() => { document.getElementById('migration_modal').remove(); }, 4000);

        } catch (err) {
            console.error(err);
            statusEl.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle-fill"></i> Lỗi Database: ${err.message}</span>`;
        }
    };
    reader.readAsArrayBuffer(file);
};

// Gọi tự động bảng công cụ ra giữa màn hình sau 1.5 giây
//setTimeout(window.open_migration_tool, 1500);

// =========================================================================
// 🚀 GIAO DIỆN GIÁM SÁT PHÒNG THI TRỰC TIẾP (REALTIME SUPABASE)
// =========================================================================
window.live_exam_subscription = null; // Biến toàn cục để lưu kênh kết nối

window.open_live_monitor = async function(examCode) {
    let existingModal = document.getElementById('live_monitor_modal');
    if (existingModal) existingModal.remove();

    // 1. Tạo Giao diện Bảng theo dõi
    let modalHtml = `
    <div class="modal fade show" id="live_monitor_modal" tabindex="-1" style="display: block; background: rgba(0,0,0,0.8); z-index: 40000;">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content text-white shadow-lg" style="background: #1e293b; border: 1px solid #10b981; border-radius: 12px; height: 80vh;">
                <div class="modal-header border-bottom p-3" style="border-color: rgba(255,255,255,0.1) !important;">
                    <h6 class="modal-title fw-bold text-success mb-0">
                        <span class="spinner-grow spinner-grow-sm text-danger me-2" role="status" aria-hidden="true"></span>
                        LIVE MONITOR: PHÒNG THI <span class="text-warning">${examCode}</span>
                    </h6>
                    <button type="button" class="btn-close btn-close-white" onclick="window.close_live_monitor()"></button>
                </div>
                <div class="modal-body p-0 custom-scrollbar" style="background: #0f172a;">
                    <table class="table table-dark table-hover table-borderless mb-0 align-middle">
                        <thead style="position: sticky; top: 0; background: #1e293b; z-index: 1;">
                            <tr>
                                <th class="text-white-50 small" style="width: 5%;">#</th>
                                <th class="text-white-50 small" style="width: 20%;">Mã SV</th>
                                <th class="text-white-50 small" style="width: 40%;">Tình trạng</th>
                                <th class="text-white-50 small text-center" style="width: 15%;">Thời gian</th>
                                <th class="text-white-50 small text-center" style="width: 20%;">Điểm số</th>
                            </tr>
                        </thead>
                        <tbody id="live_exam_tbody">
                            <tr><td colspan="5" class="text-center py-4 text-white-50"><div class="spinner-border spinner-border-sm me-2"></div> Đang tải dữ liệu ban đầu...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer p-2 border-top d-flex justify-content-between" style="border-color: rgba(255,255,255,0.1) !important;">
                    <small class="text-info"><i class="bi bi-broadcast"></i> Đang kết nối Realtime...</small>
                    <button type="button" class="btn btn-secondary btn-sm px-4" onclick="window.close_live_monitor()">Đóng Giám Sát</button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const clientDb = typeof db !== 'undefined' ? db : window._supabase;
    const tbody = document.getElementById('live_exam_tbody');

    // 2. Hàm vẽ/cập nhật 1 dòng sinh viên
    const renderRow = (record) => {
        let isSub = record.is_submitted;
        let statusHtml = isSub ? `<span class="badge bg-success">Đã nộp bài</span>` : `<span class="badge bg-warning text-dark animate__animated animate__pulse animate__infinite">Đang làm bài...</span>`;
        let timeStr = record.submitted_at ? new Date(record.submitted_at).toLocaleTimeString('vi-VN') : '--:--';
        let scoreHtml = isSub ? `<strong class="text-warning fs-5">${record.score}</strong>` : `-`;
        
        // Hiệu ứng chớp sáng khi có cập nhật mới
        let rowClass = isSub ? 'animate__animated animate__flash' : 'animate__animated animate__fadeInLeft';

        return `
        <tr id="live_row_${record.student_id}" class="${rowClass}" style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td class="text-white-50"><i class="bi bi-person-circle"></i></td>
            <td class="fw-bold text-info">${record.student_id}</td>
            <td>${statusHtml}</td>
            <td class="text-center text-white-50 small">${timeStr}</td>
            <td class="text-center">${scoreHtml}</td>
        </tr>`;
    };

    // 3. Tải danh sách những em đã/đang thi trước đó
    try {
        const { data: initialData } = await clientDb.from('exam_results').select('*').eq('exam_code', examCode).order('submitted_at', { ascending: false });
        if (initialData && initialData.length > 0) {
            tbody.innerHTML = initialData.map(r => renderRow(r)).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-white-50">Phòng thi chưa có ai truy cập. Vui lòng chờ...</td></tr>`;
        }
    } catch (err) { tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">Lỗi tải dữ liệu.</td></tr>`; }

    // 4. KÍCH HOẠT SUPABASE REALTIME (PHÉP THUẬT NẰM Ở ĐÂY)
    if (window.live_exam_subscription) clientDb.removeChannel(window.live_exam_subscription);

    window.live_exam_subscription = clientDb.channel('custom-exam-channel')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'exam_results', filter: `exam_code=eq.${examCode}` },
            (payload) => {
                console.log("Realtime bắt được:", payload);
                const record = payload.new;
                
                // Nếu là Insert (Sinh viên mới vào thi) hoặc Update (Sinh viên nộp bài)
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    let existingRow = document.getElementById(`live_row_${record.student_id}`);
                    
                    if (existingRow) {
                        // Cập nhật dòng cũ
                        existingRow.outerHTML = renderRow(record);
                    } else {
                        // Xóa dòng "Chưa có ai" nếu có
                        if(tbody.innerHTML.includes('chưa có ai truy cập')) tbody.innerHTML = '';
                        // Chèn dòng mới lên đầu bảng
                        tbody.insertAdjacentHTML('afterbegin', renderRow(record));
                    }
                }
            }
        )
        .subscribe();
};

window.close_live_monitor = function() {
    let modalEl = document.getElementById('live_monitor_modal');
    if (modalEl) modalEl.remove();
    
    // Hủy lắng nghe để tiết kiệm tài nguyên mạng khi đóng Modal
    if (window.live_exam_subscription) {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        clientDb.removeChannel(window.live_exam_subscription);
        window.live_exam_subscription = null;
    }
};
// =========================================================================
// 🚀 TẢI VÀ HIỂN THỊ PHÒNG THI ONLINE (TÀNG HÌNH & HIỆN TRƯỚC 5 PHÚT BẰNG JS)
// =========================================================================
window.exam_future_timeouts = window.exam_future_timeouts || [];
window.exam_dom_countdown = null;

window.fetch_and_render_active_exams = async function() {
    let container = document.getElementById('dash_subject_cards_container'); 
    if (!container) return;
    
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        // Lấy các phòng thi đang ở trạng thái MỞ
        const { data: exams, error } = await clientDb.from('online_exams')
                                       .select('*')
                                       .in('status', ['MỞ', '🟢 MỞ (Thi ngay)'])
                                       .order('created_at', { ascending: false });
        if (error) throw error;
        
        let oldWrap = document.getElementById('active_exams_wrapper'); 
        if (oldWrap) oldWrap.remove(); 

        // 1. Dọn dẹp các đồng hồ báo thức cũ để tránh đụng độ
        window.exam_future_timeouts.forEach(t => clearTimeout(t));
        window.exam_future_timeouts = [];
        if (window.exam_dom_countdown) clearInterval(window.exam_dom_countdown);

        if (!exams || exams.length === 0) return;

        let validExams = []; 
        let now = new Date(); 
        let currentRole = window.current_user_role || "";
        let sId = (window.current_student_id || "").toLowerCase();
        let sClass = (window.current_class_code || currentRole).toLowerCase();

        exams.forEach(ex => {
            if (ex.auto_close && new Date(ex.auto_close) < now) return; 
            
            let allowedArr = (ex.allowed_users || "").split(',').map(s => s.trim().toLowerCase()).filter(s => s !== "");
            if (allowedArr.length === 0) return;
            
            let isAllowed = (currentRole === 'all' || currentRole === 'admin' || currentRole === 'teacher') ||
                            allowedArr.includes('all') || allowedArr.includes(sId) || (sClass && allowedArr.includes(sClass));
            
            if (!isAllowed) return;

            // 2. TÍNH TOÁN THỜI GIAN ĐỂ XÁC ĐỊNH TÀNG HÌNH HAY HIỂN THỊ
            let openTime = ex.auto_open ? new Date(ex.auto_open) : null;
            let diffSec = openTime ? Math.floor((openTime - now) / 1000) : -1;

            if (diffSec > 300) {
                // 🛑 Lớn hơn 5 phút (300 giây): Tàng hình.
                // Cài đồng hồ báo thức: Khi nào thời gian tụt xuống đúng 300 giây thì tự động vẽ lại giao diện!
                let timeUntil5Mins = (diffSec - 300) * 1000;
                let t = setTimeout(() => { window.fetch_and_render_active_exams(); }, timeUntil5Mins);
                window.exam_future_timeouts.push(t);
            } else {
                // 🟢 Đang trong phạm vi 5 phút hoặc đã mở thi: Đưa vào danh sách vẽ lên màn hình
                validExams.push({ ...ex, diffSec });
            }
        });

        if (validExams.length === 0) return;

        let html = `<div id="active_exams_wrapper" class="col-12 px-1 mb-2 animate__animated animate__fadeInDown">
            <div class="glass-panel p-3" style="border: 2px dashed #ef4444; background: rgba(239, 68, 68, 0.15); border-radius: 16px;">
                <h6 class="fw-bold text-danger mb-3 text-uppercase"><i class="bi bi-fire me-2"></i>KỲ THI TRỰC TUYẾN</h6>
                <div class="d-flex flex-column gap-2">`;
        
        let hasCountdown = false;

        validExams.forEach(ex => {
            let safeEx = encodeURIComponent(JSON.stringify({ 
                examCode: ex.exam_code, subjectKey: ex.subject_key, examName: ex.exam_name, 
                timeLimit: ex.time_limit, hasPassword: ex.password && ex.password !== "", 
                password: ex.password, questionsJSON: ex.questions_json 
            }));
            let subjectDisplayName = window.subjectConfig[ex.subject_key] ? window.subjectConfig[ex.subject_key].name : ex.subject_key;
            
            let actionBtn = "";
            let timeNotice = "";

            if (ex.diffSec > 0 && ex.diffSec <= 300) {
                // Đang trong 5 phút đếm ngược (Trạng thái vàng chớp nháy)
                hasCountdown = true;
                actionBtn = `<button id="btn_ex_${ex.exam_code}" class="btn btn-warning fw-bold rounded-pill px-4 py-2 shadow-lg animate__animated animate__pulse animate__infinite live-exam-btn" data-ex="${safeEx}" data-open="${ex.auto_open}" style="background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; border: 2px solid #fff;">
                    SẴN SÀNG (--) <i class="bi bi-arrow-right-circle-fill"></i>
                </button>`;
                timeNotice = `<span id="notice_ex_${ex.exam_code}" class="text-warning fw-bold"><i class="bi bi-stopwatch-fill me-1"></i> Sắp mở!</span>`;
            } else {
                // Đã mở (Trạng thái đỏ)
                actionBtn = `<button class="btn btn-danger fw-bold rounded-pill px-4 py-2 shadow-lg" onclick="window.join_online_exam('${safeEx}')">
                    THI NGAY <i class="bi bi-arrow-right-circle-fill"></i>
                </button>`;
                timeNotice = `<span class="text-success fw-bold"><i class="bi bi-broadcast me-1"></i> Đang diễn ra</span>`;
            }

            html += `<div class="p-3 rounded-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center shadow-sm gap-2" style="background: rgba(0,0,0,0.5); border-left: 5px solid ${ex.diffSec > 0 ? '#f59e0b' : '#ef4444'};">
                <div>
                    <div class="fw-bold text-white mb-1" style="font-size: 1rem;">${ex.exam_name}</div>
                    <div class="text-white-50 d-flex align-items-center gap-2 flex-wrap" style="font-size: 0.75rem;">
                        <span class="badge bg-danger shadow-sm">Mã: ${ex.exam_code}</span>
                        <span>Môn: <b class="text-info">${subjectDisplayName}</b></span>
                        <span class="text-secondary">|</span>
                        <span><b>${ex.time_limit}</b> phút</span>
                        <span class="text-secondary">|</span>
                        ${timeNotice}
                    </div>
                </div>
                ${actionBtn}
            </div>`;
        });
        html += `</div></div></div>`;
        
        let firstCard = container.querySelector('.animate__fadeInUp');
        if (firstCard) firstCard.insertAdjacentHTML('beforebegin', html); 
        else container.insertAdjacentHTML('beforeend', html);

        // 3. Nếu có phòng đang trong giai đoạn 5 phút, kích hoạt đồng hồ đếm trên giao diện
        if (hasCountdown) {
            window.start_dom_exam_countdown();
        }

    } catch(err) { console.error("Lỗi kéo đề thi:", err); }
};

// =========================================================================
// 🚀 ĐỘNG CƠ CẬP NHẬT ĐỒNG HỒ TRÊN GIAO DIỆN (KHÔNG GỌI MÁY CHỦ)
// =========================================================================
window.start_dom_exam_countdown = function() {
    if (window.exam_dom_countdown) clearInterval(window.exam_dom_countdown);
    
    // Mỗi 1 giây chỉ thay đổi chữ trên màn hình (04:59 -> 04:58), hoàn toàn nhẹ máy
    window.exam_dom_countdown = setInterval(() => {
        let btns = document.querySelectorAll('.live-exam-btn');
        if (btns.length === 0) {
            clearInterval(window.exam_dom_countdown);
            return;
        }
        
        let now = new Date();
        btns.forEach(btn => {
            let openTime = new Date(btn.getAttribute('data-open'));
            let diffSec = Math.floor((openTime - now) / 1000);
            let notice = document.getElementById(btn.id.replace('btn_', 'notice_'));
            
            if (diffSec <= 0) {
                // HẾT 5 PHÚT -> CHUYỂN NÚT THÀNH ĐỎ ĐỂ THI NGAY
                btn.classList.remove('btn-warning', 'animate__animated', 'animate__pulse', 'animate__infinite', 'live-exam-btn');
                btn.classList.add('btn-danger');
                btn.style.background = ''; // Xóa màu vàng
                btn.innerHTML = `THI NGAY <i class="bi bi-arrow-right-circle-fill"></i>`;
                
                let safeEx = btn.getAttribute('data-ex');
                btn.setAttribute('onclick', `window.join_online_exam('${safeEx}')`);
                
                if (notice) {
                    notice.innerHTML = `<i class="bi bi-broadcast me-1"></i> Đang diễn ra`;
                    notice.className = "text-success fw-bold";
                }
                btn.closest('.rounded-3').style.borderLeftColor = '#ef4444'; // Đổi viền thẻ thành đỏ
            } else {
                // CẬP NHẬT CHỮ ĐẾM NGƯỢC
                let m = Math.floor(diffSec / 60);
                let s = diffSec % 60;
                let str = (m < 10 ? '0' + m : m) + ":" + (s < 10 ? '0' + s : s);
                btn.innerHTML = `SẴN SÀNG (${str}) <i class="bi bi-arrow-right-circle-fill"></i>`;
            }
        });
    }, 1000);
};

// =========================================================================
// 📡 KÊNH REALTIME: TỰ ĐỘNG CẬP NHẬT KHI ADMIN TẠO HOẶC SỬA PHÒNG THI
// =========================================================================
window.active_student_exam_subscription = null;

window.enable_realtime_exams_for_student = function() {
    const clientDb = typeof db !== 'undefined' ? db : window._supabase;
    if (!clientDb) return;

    // Gỡ kết nối cũ nếu có để tránh trùng lặp kênh
    if (window.active_student_exam_subscription) {
        clientDb.removeChannel(window.active_student_exam_subscription);
    }

    // Mở kênh lắng nghe mọi biến động từ bảng online_exams
    window.active_student_exam_subscription = clientDb.channel('public-online-exams')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'online_exams' },
            (payload) => {
                console.log("🔥 Máy chủ vừa báo có thay đổi về phòng thi:", payload);
                
                // Chỉ làm mới danh sách nếu học sinh đang ở màn hình chính (chưa vào phòng thi)
                let isAtMenu = document.getElementById('step_1') && document.getElementById('step_1').style.display !== 'none';
                if (isAtMenu && typeof window.fetch_and_render_active_exams === 'function') {
                    window.fetch_and_render_active_exams();
                }
            }
        )
        .subscribe();
};
// =========================================================================
// 👁️ MẮT THẦN: TỰ ĐỘNG ẨN TIÊU ĐỀ GỐC KHI VÀO CÁC THẺ QUẢN TRỊ/BÀI HỌC
// =========================================================================
document.addEventListener("DOMContentLoaded", function() {
    const containerToWatch = document.getElementById('dash_subject_cards_container');
    
    if (containerToWatch) {
        const observer = new MutationObserver(() => {
            let header = document.getElementById('main_app_header');
            if (header) {
                // Quét xem trong màn hình hiện tại có nút chức năng Quay lui/Thoát không
                let innerHTML = containerToWatch.innerHTML;
                let isInsideSubMenu = innerHTML.includes('bi-chevron-left') || 
                                      innerHTML.includes('bi-arrow-left') ||
                                      innerHTML.includes('window.render_admin_hub()');
                
                // Nếu đang ở trong các Thẻ -> Giấu tiêu đề. Nếu ở Sảnh -> Hiện lại.
                if (isInsideSubMenu) {
                    header.style.setProperty('display', 'none', 'important');
                } else {
                    header.style.setProperty('display', 'block', 'important');
                }
            }
        });
        
        // Bật mắt thần giám sát mọi sự thay đổi bên trong Sảnh
        observer.observe(containerToWatch, { childList: true, subtree: true });
    }
});