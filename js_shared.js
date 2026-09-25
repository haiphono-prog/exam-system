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
window.fetch_all_questions = async function(subjectKey) {
    let all = [];
    let from = 0, pageSize = 1000;
    try {
        while (true) {
            const { data, error } = await db.from('questions').select('*')
                .eq('subject_key', subjectKey).range(from, from + pageSize - 1);
            if (error) return { data: null, error };
            all = all.concat(data || []);
            if (!data || data.length < pageSize) break;
            from += pageSize;
        }
        return { data: all, error: null };
    } catch (err) {
        return { data: null, error: err };
    }
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

window.preload_background_data = function() {
    let safe_role = String(window.current_user_role).trim().toLowerCase();
    Object.keys(subjectConfig).forEach(key => {
        let config = subjectConfig[key];
        let môn_quyền = config.role ? String(config.role).trim().toLowerCase() : "all";
        if (safe_role === "all" || môn_quyền === "all" || môn_quyền === safe_role) {
            if (!window.full_data[key]) preloadQueue.push(key);
        }
    });
    if (!window.isPreloading) window.process_preload_queue();
}

window.process_preload_queue = async function() {
    if (!window.preloadQueue || window.preloadQueue.length === 0) { 
        window.isPreloading = false; return; 
    }
    window.isPreloading = true;
    let key = window.preloadQueue.shift();

    if (window.full_data[key] || window.loading_subjects[key]) { 
        window.process_preload_queue(); return; 
    } 
    window.loading_subjects[key] = true;

    try {
        const { data, error } = await window.fetch_all_questions(key);
        window.loading_subjects[key] = false;
        if (!error && data && data.length > 0) {
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
            
            window.full_data[key] = mappedData;
            let badge = document.getElementById(`stats_badge_${key}`);
            if (badge) badge.innerText = data.length + " câu";
        }
        setTimeout(window.process_preload_queue, 400);
    } catch(err) {
        window.loading_subjects[key] = false;
        setTimeout(window.process_preload_queue, 400);
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
// 📚 PHẦN 5: CHỌN MÔN & CHẾ ĐỘ HỌC (ĐÃ ĐỒNG BỘ NÚT THOÁT VÀ HIỆN NHẬT KÝ)
// =========================================================================
window.render_student_subject_list = function(safe_role) {
    const container = document.getElementById('dash_subject_cards_container');
    if(!container) return;
    let html = "";
    
    // 🌟 ĐÃ FIX: Luôn hiển thị lại Nhật Ký khi ở giao diện ngoài
    const historyArea = document.getElementById('history_view_area');
    if (historyArea) historyArea.style.display = 'block';

    let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
    let inventoryCount = parseInt(localStorage.getItem(invKey)) || 0;
    let studentNameDisplay = window.current_student_name || window.current_student_id || "Học viên";
    
    html += `
    <div class="col-12 px-2 mb-3 animate__animated animate__fadeInDown">
        <div class="d-flex align-items-center justify-content-center gap-3 w-100" style="background: transparent; border: none; flex-wrap: wrap;">
            
            <!-- Nhóm Avatar + Lời chào (RANK HỆ THỐNG) -->
            <div class="d-flex align-items-center gap-2">
                ${window.get_user_rank_html()}
                <div class="text-white-50 fw-bold" style="font-size: 0.85rem; line-height: 1.2;">
                    <div style="font-size: 0.7rem; text-transform: uppercase;">Xin chào,</div>
                    <span class="text-white">${studentNameDisplay}</span>
                </div>
            </div>

            <!-- Vạch ngăn cách mờ -->
            <div class="text-white-50 opacity-25 d-none d-sm-block">|</div>

            <!-- Nhóm Ví Quà siêu gọn -->
            <div id="dashboard_inventory_badge" class="d-flex align-items-center gap-1 stat-card-hover" title="Bấm để mở Túi Đồ" style="cursor: pointer;" onclick="window.toggle_inventory_popover(event)">
                <span style="font-size: 1.1rem; line-height: 1;">🎁</span>
                <span class="text-warning fw-bold" style="font-size: 0.95rem;" id="dashboard_inventory_count">${inventoryCount}</span>
            </div>

            <!-- Vạch ngăn cách mờ -->
            <div class="text-white-50 opacity-25">|</div>
            
            <!-- Nút Đăng Ký Face ID -->
            <div class="d-flex align-items-center stat-card-hover text-info" title="Liên kết khuôn mặt (Face ID)" style="cursor: pointer;" onclick="window.setup_face_id()">
                <i class="bi bi-person-bounding-box fs-5"></i>
            </div>

            <!-- Vạch ngăn cách mờ -->
            <div class="text-white-50 opacity-25">|</div>

            <!-- Nút Đăng Xuất -->
            <div class="d-flex align-items-center stat-card-hover text-danger" title="Đăng xuất" style="cursor: pointer;" onclick="window.logout_user()">
                <i class="bi bi-box-arrow-right fs-5"></i>
            </div>

        </div>
    </div>`;

    if (safe_role === 'all') {
        html += `
        <div class="col-12 px-2 animate__animated animate__fadeIn mb-4">
            <div class="d-flex justify-content-between align-items-center w-100" style="background: transparent; border: none;">
                <!-- 🌟 ĐÃ FIX: Đồng bộ chuẩn kích thước nút Thoát -->
                <button class="btn btn-sm fw-bold text-white-50 p-0 d-flex align-items-center" onclick="window.render_admin_hub()" style="background: transparent; border: none; font-size: 0.9rem; letter-spacing: 0.5px;"><i class="bi bi-arrow-left me-1"></i>Thoát</button>
                <h6 class="text-white fw-bold mb-0 text-center flex-grow-1 text-truncate" style="letter-spacing: 1px; font-size: 0.85rem;">QUẢN LÝ TRẮC NGHIỆM</h6>
                <div style="width: 55px;"></div>
            </div>
        </div>`;
    }

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
        <div class="col-12 px-1 animate__animated animate__fadeInUp" style="animation-delay: ${delay}s;">
            <div class="p-2 mb-2 d-flex justify-content-between align-items-center" 
                 style="cursor: pointer; background: transparent; border: none; border-bottom: 1px dashed rgba(255,255,255,0.05);"
                 onclick="let el = document.getElementById('${groupId}'); el.classList.toggle('d-none'); let icon = document.getElementById('icon_${groupId}'); if(el.classList.contains('d-none')){icon.classList.replace('bi-chevron-up', 'bi-chevron-down')}else{icon.classList.replace('bi-chevron-down', 'bi-chevron-up')}">
                <div class="d-flex align-items-center"><i class="bi bi-folder2-open text-info fs-5 me-2 opacity-75"></i><h6 class="fw-bold text-info mb-0 text-uppercase" style="letter-spacing: 0.5px; font-size:0.85rem;">${groupName}</h6></div>
                <i id="icon_${groupId}" class="bi bi-chevron-down text-white-50 fs-6"></i>
            </div>
            <div id="${groupId}" class="d-none mb-3 w-100">
                <div class="row m-0 mt-1">`;
        
        subjectKeys.forEach((key, sIndex) => {
            let config = subjectConfig[key];
            let displayName = config.name || config['Tên hiển thị'] || subjectNames[key] || key;
            let icon = config.icon || config['Icon'] || '📚';
            let canEdit = window.check_subj_perm(key, 'edit');
            
            let refreshIconHtml = ""; let adminBtnHtml = "";
            if (canEdit && safe_role === 'all') {
                refreshIconHtml = `<i class="bi bi-arrow-clockwise text-primary ms-2 opacity-75" style="cursor:pointer; font-size: 1rem;" onclick="event.stopPropagation(); window.refresh_subject_data('${key}', this)"></i>`;
                adminBtnHtml = `<button class="btn btn-sm fw-bold border-0 p-1 text-white-50 d-flex align-items-center" style="background: transparent;" onclick="event.stopPropagation(); window.admin_login_process('${key}')"><i class="bi bi-pencil-square fs-6"></i></button>`;
            }

            html += `
                <div class="col-12 px-0 mb-1 animate__animated animate__fadeInUp" style="animation-delay: ${sIndex * 0.03}s;" id="subject_card_block_${key}">
                    <div class="p-2" onclick="window.toggle_subject_map('${key}', '${displayName}')" style="cursor: pointer; background: transparent; border: none; transition: transform 0.2s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
                        <div class="d-flex align-items-center justify-content-between w-100 gap-2">
                            <div class="d-flex align-items-center gap-3 flex-grow-1" style="min-width: 0;">
                                <div class="d-flex align-items-center justify-content-center flex-shrink-0" style="width: 38px; height: 38px; background: transparent;"><span style="font-size: 1.5rem; line-height: 1;">${icon}</span></div>
                                <div class="d-flex flex-column justify-content-center" style="min-width: 0;">
                                    <div class="d-flex align-items-center"><h6 class="fw-bold text-white text-uppercase mb-0 text-truncate" style="font-size: 0.85rem; letter-spacing: 0.3px;">${displayName}</h6>${refreshIconHtml}</div>
                                </div>
                            </div>
                            <div class="flex-shrink-0">${adminBtnHtml}</div>
                        </div>
                        <div id="map_area_${key}" class="mt-1 text-start animate__animated animate__fadeIn w-100 pt-1" style="display:none; border: none !important;" onclick="event.stopPropagation();"></div>
                    </div>
                </div>`;
        });
        html += `       </div>
                </div>
            </div>`;
        delay += 0.05;
    });
    
    container.innerHTML = html;
    window.render_stats_card_above_timeline();
    
    // 🌟 GỌI HÀM LẤY ĐỀ THI TRỰC TUYẾN
    window.fetch_and_render_active_exams();
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
                let isPhanXa = String(q.type).toLowerCase() === 'phanxa';
                if (isPhanXa) {
                    let newQ = {...q};
                    newQ.q = q.vi || q.q || "Câu hỏi trống";
                    let correctAns = q.en || q.answer || q.a || "Đáp án trống";
                    
                    let fakeOpts = [correctAns];
                    for(let i = 1; i <= 3; i++) {
                        let nextQ = arr[(idx + i) % arr.length];
                        fakeOpts.push(nextQ.en || nextQ.answer || nextQ.a || ("Nhiễu " + i));
                    }
                    fakeOpts.sort(() => Math.random() - 0.5);
                    
                    newQ.opts = fakeOpts; 
                    newQ.optA = fakeOpts[0]; newQ.optB = fakeOpts[1]; newQ.optC = fakeOpts[2]; newQ.optD = fakeOpts[3];
                    let letter = ['A', 'B', 'C', 'D'][fakeOpts.indexOf(correctAns)];
                    newQ.a = letter; newQ.answer = letter; newQ.type = 'single'; 
                    return newQ;
                }
                return q;
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
            window.questions = [...pool]; 
            
            // 🌟 Đang ở GAME -> Trỏ tới SINH TỒN
            if(modeTextEl) modeTextEl.innerHTML = '<i class="bi bi-fire text-danger"></i> Sinh Tồn';
            
            window.time_left = window.questions.length * 60; window.is_exam_started = true; window.away_seconds = 0; window.start_time = new Date();
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
            
            // 🌟 Đang ở PHẢN XẠ -> Trỏ vòng lại QUIZ hoặc STORY
            if(modeTextEl) {
                if (isStoryLesson) modeTextEl.innerHTML = '<i class="bi bi-bezier2"></i> Câu Chuyện';
                else modeTextEl.innerHTML = '<i class="bi bi-ui-checks"></i> Làm Quiz';
            }
            
            if (window.timer_interval) clearInterval(window.timer_interval);

            if(quizArea) {
                quizArea.innerHTML = `
                    <div class="text-center mt-5 p-4 animate__animated animate__fadeIn">
                        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
                        <h5 class="fw-bold text-primary">Đang tải phòng luyện âm...</h5>
                        <p class="text-muted small">Đang kết nối đồng bộ dữ liệu với máy chủ</p>
                    </div>
                `;
            }

            if (typeof google !== 'undefined' && google.script) { // TODO: chuyển phòng luyện âm sang file HTML tĩnh
                google.script.run.withSuccessHandler(function() {
                    google.script.run.withSuccessHandler(function(htmlString) {
                        if(quizArea) {
                            quizArea.innerHTML = htmlString;
                            let scripts = quizArea.getElementsByTagName("script");
                            for (let i = 0; i < scripts.length; i++) {
                                let newScript = document.createElement("script");
                                newScript.text = scripts[i].innerText;
                                document.body.appendChild(newScript);
                            }
                        }
                    }).getPhanXaHtml(); 
                }).openPhanXaMode(lessonId, lessonName);
            } else if (quizArea) {
                quizArea.innerHTML = `<div class="text-center p-5"><i class="bi bi-tools text-warning" style="font-size:3rem;"></i><h5 class="fw-bold text-warning mt-3">Phòng luyện âm đang được chuyển sang Supabase</h5><p class="text-white-50 small">Tính năng này trước đây chạy bằng Google Apps Script, cần dựng lại thành trang HTML riêng.</p></div>`;
            }
        }
    }, lessonName);
};

window.show_mode_modal = function(callback, lessonName = "") {
    let isStoryMode = (lessonName.toUpperCase().includes('[STORY]') || lessonName.toUpperCase().includes('[CASE]'));
    // Tự động bật gợi ý nếu bài học chuyên về tiếng Anh/Phản xạ
    let isPhanXaMode = (lessonName.toUpperCase().includes('[ENGLISH]') || lessonName.toUpperCase().includes('[PHANXA]'));
    
    // Khóa scroll cả html và body
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const overlay = document.createElement('div');
    overlay.className = 'custom-modal position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn';
    overlay.style.cssText = 'background: rgba(0, 0, 0, 0.85); z-index: 26000;';
    
    const closeModal = () => {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        overlay.remove();
    };

    // Style nút Câu chuyện
    let storyBtnStyle = isStoryMode 
        ? 'background: linear-gradient(135deg, #0f766e, #14b8a6) !important; border: 1px solid #2dd4bf !important; color: #fff !important;' 
        : 'background: rgba(20, 184, 166, 0.15) !important; border: 1px solid rgba(20, 184, 166, 0.4) !important; color: #2dd4bf !important;';
    
    // Huy hiệu "Khuyên dùng" cho Câu chuyện
    let storyBadge = isStoryMode 
        ? `<span class="badge text-dark ms-2 animate__animated animate__pulse animate__infinite" 
                 style="font-size: 0.65rem; background-color: #fbbf24; border: 1px solid #f59e0b; box-shadow: 0 0 12px rgba(245, 158, 11, 0.9); text-transform: uppercase; letter-spacing: 0.5px;">
                 <i class="bi bi-star-fill text-danger me-1"></i> Khuyên dùng
           </span>` 
        : '';

    // ⚡ Thiết lập giao diện nút PHẢN XẠ mới cho Thầy
    let phanXaBtnStyle = isPhanXaMode 
        ? 'background: linear-gradient(135deg, #1d4ed8, #3b82f6) !important; border: 1px solid #60a5fa !important; color: #fff !important;' 
        : 'background: rgba(59, 130, 246, 0.15) !important; border: 1px solid rgba(59, 130, 246, 0.4) !important; color: #60a5fa !important;';
    
    let phanXaBadge = isPhanXaMode 
        ? `<span class="badge text-dark ms-2 animate__animated animate__pulse animate__infinite" 
                 style="font-size: 0.65rem; background-color: #fbbf24; border: 1px solid #f59e0b; box-shadow: 0 0 12px rgba(245, 158, 11, 0.9); text-transform: uppercase; letter-spacing: 0.5px;">
                 <i class="bi bi-mic-fill text-danger me-1"></i> Khuyên dùng
           </span>` 
        : '';

    let modalStyle = `
        width: 100%; max-width: 360px; border-radius: 20px; 
        background: rgba(30, 41, 59, 0.98); 
        -webkit-backdrop-filter: blur(20px); 
        backdrop-filter: blur(20px); 
        border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    overlay.innerHTML = `
        <div class="glass-panel p-4 shadow-lg mx-3 text-center position-relative" style="${modalStyle}">
            <button id="btn_close_mode" class="btn-close btn-close-white position-absolute" style="top: 15px; left: 15px; opacity: 0.7;"></button>
            <div class="mb-3 mt-3"><i class="bi bi-layers-half text-info" style="font-size: 2.5rem;"></i></div>
            <h6 class="mb-3 fw-bold text-white text-uppercase" style="letter-spacing: 1px; font-size: 0.9rem;">CHỌN CHẾ ĐỘ HỌC</h6>
            
            <div class="d-flex flex-column gap-2">
                <button class="btn glass-btn-submit w-100 fw-bold d-flex align-items-center justify-content-center" id="btn_mode_quiz" style="border-radius: 12px; height: 45px; font-size: 0.85rem;">
                    <i class="bi bi-ui-checks me-2"></i> LÀM QUIZ
                </button>
                <button class="btn w-100 fw-bold d-flex align-items-center justify-content-center" id="btn_mode_fc" style="border-radius: 12px; height: 45px; font-size: 0.85rem; background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); color: #e879f9;">
                    <i class="bi bi-card-heading me-2"></i> LẬT THẺ
                </button>
                <button class="btn w-100 fw-bold d-flex align-items-center justify-content-center" id="btn_mode_game" style="border-radius: 12px; height: 45px; font-size: 0.85rem; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.4); color: #4ade80;">
                    <i class="bi bi-controller me-2"></i> GHÉP CẶP
                </button>
                <button class="btn w-100 fw-bold d-flex align-items-center justify-content-center" id="btn_mode_story" style="border-radius: 12px; height: 45px; font-size: 0.85rem; ${storyBtnStyle}">
                    <i class="bi bi-geo-alt-fill me-2"></i> CÂU CHUYỆN ${storyBadge}
                </button>
                <!-- ⚡ NÚT CHẾ ĐỘ PHẢN XẠ MỚI TÍCH HỢP -->
                <button class="btn w-100 fw-bold d-flex align-items-center justify-content-center" id="btn_mode_phanxa" style="border-radius: 12px; height: 45px; font-size: 0.85rem; ${phanXaBtnStyle}">
                    <i class="bi bi-mic-fill me-2"></i> LUYỆN PHẢN XẠ ${phanXaBadge}
                </button>
                <!-- ⚡ NÚT CHẾ ĐỘ ĐẤU TRƯỜNG SINH TỒN -->
                <button class="btn w-100 fw-bold d-flex align-items-center justify-content-center mt-2" id="btn_mode_survival" style="border-radius: 12px; height: 45px; font-size: 0.85rem; background: linear-gradient(135deg, #991b1b, #ef4444) !important; border: 1px solid #f87171 !important; color: #fff !important; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);">
                    <i class="bi bi-fire me-2"></i> ĐẤU TRƯỜNG SINH TỒN
                </button>
            </div>
        </div>`;
    
    document.body.appendChild(overlay);
    
    // 🌟 ĐÃ FIX: Bắt buộc cắm cờ window.active_mode để đồng hồ đếm ngược hiểu
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
// 🏢 PHẦN 6: QUẢN TRỊ TRUNG TÂM (ADMIN HUB)
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

    const iconStyle = "font-size: 1.2rem; opacity: 0.8;";
    let hoverEffect = "onmouseover=\"this.style.transform='translateX(4px)'\" onmouseout=\"this.style.transform='translateX(0)'\"";
    
    let html = "";
    if (isSuper) {
        let invKey = 'mcq_inventory_' + (window.current_student_id || 'guest');
        let inventoryCount = parseInt(localStorage.getItem(invKey)) || 0;
        let studentNameDisplay = window.current_student_name || window.current_student_id || "Admin";

        html += `
        <div class="col-12 px-2 mb-3 animate__animated animate__fadeInDown">
            <div class="d-flex align-items-center justify-content-center gap-3 w-100" style="background: transparent; border: none; flex-wrap: wrap;">
                <div class="d-flex align-items-center gap-2">
                    ${window.get_user_rank_html()}
                    <div class="text-white-50 fw-bold" style="font-size: 0.85rem; line-height: 1.2;">
                        <div style="font-size: 0.7rem; text-transform: uppercase;">Xin chào,</div>
                        <span class="text-danger">${studentNameDisplay}</span>
                    </div>
                </div>
                <div class="text-white-50 opacity-25 d-none d-sm-block">|</div>
                <div id="dashboard_inventory_badge" class="d-flex align-items-center gap-1 stat-card-hover" title="Bấm để mở Túi Đồ" style="cursor: pointer;" onclick="window.toggle_inventory_popover(event)">
                    <span style="font-size: 1.1rem; line-height: 1;">🎁</span>
                    <span class="text-warning fw-bold" style="font-size: 0.95rem;" id="dashboard_inventory_count">${inventoryCount}</span>
                </div>
                <div class="text-white-50 opacity-25">|</div>
                <div class="d-flex align-items-center stat-card-hover text-info" title="Liên kết khuôn mặt (Face ID)" style="cursor: pointer;" onclick="window.setup_face_id()">
                    <i class="bi bi-person-bounding-box fs-5"></i>
                </div>
                <div class="text-white-50 opacity-25">|</div>
                <div class="d-flex align-items-center stat-card-hover text-danger" title="Đăng xuất" style="cursor: pointer;" onclick="window.logout_user()">
                    <i class="bi bi-box-arrow-right fs-5"></i>
                </div>
            </div>
        </div>`;
    } else {
        html += `
        <div class="col-12 px-2 mb-3">
            <div class="d-flex justify-content-between align-items-center w-100" style="background: transparent; border: none;">
                <button class="btn btn-sm fw-bold text-white-50 p-0 d-flex align-items-center" onclick="window.render_student_subject_list(window.current_user_role)" style="background: transparent; border: none; font-size: 0.9rem; letter-spacing: 0.5px;"><i class="bi bi-arrow-left me-1"></i>Quay lại</button>
            </div>
        </div>`;
    }

    if (canManageBanks) html += `<div class="col-12 mb-1 animate__animated animate__fadeInUp" style="animation-delay: 0.05s;"><div class="p-2 d-flex align-items-center gap-3" style="cursor:pointer; border: none; transition: transform 0.2s; background: transparent;" ${hoverEffect} onclick="window.render_student_subject_list('all')"><div style="width: 35px; text-align: center;"><i class="bi bi-card-checklist text-info" style="${iconStyle}"></i></div><h6 class="fw-bold text-white mb-0" style="font-size: 0.85rem;">QUẢN LÝ TRẮC NGHIỆM</h6></div></div>`;
    if (canManageBanks) html += `<div class="col-12 mb-1 animate__animated animate__fadeInUp" style="animation-delay: 0.08s;"><div class="p-2 d-flex align-items-center gap-3" style="cursor:pointer; border: none; transition: transform 0.2s; background: transparent;" ${hoverEffect} onclick="window.render_exam_management()"><div style="width: 35px; text-align: center;"><i class="bi bi-laptop text-warning" style="${iconStyle}"></i></div><h6 class="fw-bold text-white mb-0" style="font-size: 0.85rem;">QUẢN LÝ PHÒNG THI ONLINE</h6></div></div>`;
    if (canManageSubjects) html += `<div class="col-12 mb-1 animate__animated animate__fadeInUp" style="animation-delay: 0.1s;"><div class="p-2 d-flex align-items-center gap-3" style="cursor:pointer; border: none; transition: transform 0.2s; background: transparent;" ${hoverEffect} onclick="window.render_subject_management()"><div style="width: 35px; text-align: center;"><i class="bi bi-collection-fill" style="${iconStyle} color: #c084fc;"></i></div><h6 class="fw-bold text-white mb-0" style="font-size: 0.85rem;">DANH MỤC MÔN HỌC</h6></div></div>`;
    if (canManageUsers) html += `<div class="col-12 mb-1 animate__animated animate__fadeInUp" style="animation-delay: 0.15s;"><div class="p-2 d-flex align-items-center gap-3" style="cursor:pointer; border: none; transition: transform 0.2s; background: transparent;" ${hoverEffect} onclick="window.render_user_management()"><div style="width: 35px; text-align: center;"><i class="bi bi-people-fill text-success" style="${iconStyle}"></i></div><h6 class="fw-bold text-white mb-0" style="font-size: 0.85rem;">QUẢN LÝ NGƯỜI DÙNG</h6></div></div>`;
    if (canManageAdmissions) html += `<div class="col-12 mb-1 animate__animated animate__fadeInUp" style="animation-delay: 0.2s;"><div class="p-2 d-flex align-items-center gap-3" style="cursor:pointer; border: none; transition: transform 0.2s; background: transparent;" ${hoverEffect} onclick="window.render_admission_analytics()"><div style="width: 35px; text-align: center;"><i class="bi bi-person-plus-fill" style="${iconStyle} color: #f472b6;"></i></div><h6 class="fw-bold text-white mb-0" style="font-size: 0.85rem;">QL TUYỂN SINH</h6></div></div>`;
    
    // 🌟 ĐÃ THÊM: Nút mở Nhật Ký Hệ Thống ngay trên menu Thống kê
    if (typeof window.check_stats_perm === 'function' && window.check_stats_perm()) {
        html += `<div class="col-12 mb-1 animate__animated animate__fadeInUp" style="animation-delay: 0.23s;"><div class="p-2 d-flex align-items-center gap-3" style="cursor:pointer; border: none; transition: transform 0.2s; background: transparent;" ${hoverEffect} onclick="window.open_admin_history_modal()"><div style="width: 35px; text-align: center;"><i class="bi bi-journal-text text-success" style="${iconStyle}"></i></div><h6 class="fw-bold text-white mb-0" style="font-size: 0.85rem;">NHẬT KÝ HỆ THỐNG</h6></div></div>`;
        html += `<div class="col-12 mb-1 animate__animated animate__fadeInUp" style="animation-delay: 0.25s;"><div class="p-2 d-flex align-items-center gap-3" style="cursor:pointer; border: none; transition: transform 0.2s; background: transparent;" ${hoverEffect} onclick="window.render_result_management()"><div style="width: 35px; text-align: center;"><i class="bi bi-bar-chart-line-fill text-danger" style="${iconStyle}"></i></div><h6 class="fw-bold text-white mb-0" style="font-size: 0.85rem;">THỐNG KÊ (BIỂU ĐỒ)</h6></div></div>`;
    }

    container.innerHTML = html;
};

// =========================================================================
// 📝 ADMIN: TRA CỨU NHẬT KÝ ÔN TẬP TOÀN HỆ THỐNG TỪ SUPABASE
// =========================================================================
window.open_admin_history_modal = function() {
    let modalId = 'admin_history_modal';
    let existing = document.getElementById(modalId);
    if(existing) existing.remove();

    let html = `
    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 99999; backdrop-filter: blur(10px); padding: 10px;">
        <div class="glass-panel p-3 shadow-lg d-flex flex-column w-100 animate__animated animate__zoomIn" style="max-width: 650px; height: 85vh; border-radius: 20px; background: rgba(15, 23, 42, 0.95) !important; border: 1px solid #10b981;">
            
            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style="border-color: rgba(255,255,255,0.1) !important;">
                <h6 class="fw-bold text-success mb-0"><i class="bi bi-journal-check me-2"></i>NHẬT KÝ ÔN TẬP HỆ THỐNG</h6>
                <button class="btn-close btn-close-white" onclick="document.getElementById('${modalId}').remove()"></button>
            </div>
            
            <div class="d-flex gap-2 mb-3">
                <input type="text" id="admin_search_history" class="form-control bg-dark text-white glass-input-style flex-grow-1" placeholder="🔍 Nhập Mã SV hoặc Bài học để lọc..." oninput="window.filter_admin_history(this.value)">
                <button class="btn btn-success fw-bold text-white shadow-sm px-3 rounded-3" onclick="window.fetch_admin_history()" title="Làm mới dữ liệu"><i class="bi bi-arrow-clockwise"></i></button>
            </div>
            
            <div id="admin_history_list" class="custom-scrollbar flex-grow-1 p-2 rounded" style="overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
                <div class="text-center p-5"><span class="spinner-border text-success"></span></div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
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

window.render_bloom_matrix_standard = function() {
    const tbody = document.getElementById('lesson_config_body'); 
    if (!tbody) return;
    let data_source = window.full_data[window.current_subject] || [];
    
    // Lấy danh sách bài và sắp xếp chuẩn theo số (1, 2, 3... 10) thay vì (1, 10, 2)
    const lessons = [...new Set(data_source.map(q => q.lesson))]
                    .filter(l => l !== undefined && l !== null && l !== "")
                    .sort((a, b) => parseInt(a) - parseInt(b));
    
    tbody.innerHTML = lessons.map(l => {
        const lesson_qs = data_source.filter(q => String(q.lesson) === String(l));
        
        // 🌟 KÍNH LÚP NHẬN DIỆN MỌI LOẠI DỮ LIỆU CŨ & MỚI
        const c = (targetType, targetLevel) => { 
            return lesson_qs.filter(q => { 
                // Chuẩn hóa loại câu hỏi
                let qType = q.type ? String(q.type).toLowerCase().trim() : 'single';
                if (qType === 'quiz' || qType === 'mcq' || qType === '') qType = 'single';
                if (qType === 'tf' || qType === 'đúng sai') qType = 'true_false';
                
                if (qType !== targetType) return false; 
                
                // Chuẩn hóa mức độ
                let qLevel = q.level ? String(q.level).trim() : "1"; 
                if (qLevel === "null" || qLevel === "undefined" || qLevel === "0" || qLevel === "") qLevel = "1";
                
                return qLevel === String(targetLevel); 
            }).length; 
        };
        
        const inputStyle = `style="width: 100%; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px; text-align: center; font-size: 0.8rem; background: rgba(0,0,0,0.2); color: #fff;"`;
        let row = `<tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td class="ps-2 fw-bold" style="font-size: 0.7rem; color: #e2e8f0;">BÀI ${l}</td>`;
        for(let i=1; i<=4; i++) row += `<td><input type="number" class="bloom-input" ${inputStyle} placeholder="${c('single',i)}" min="0" max="${c('single',i)}" data-lesson="${l}" data-type="single" data-level="${i}" oninput="window.update_bloom_count()"></td>`;
        for(let i=1; i<=4; i++) row += `<td><input type="number" class="bloom-input" ${inputStyle} placeholder="${c('true_false',i)}" min="0" max="${c('true_false',i)}" data-lesson="${l}" data-type="true_false" data-level="${i}" oninput="window.update_bloom_count()"></td>`;
        for(let i=1; i<=4; i++) row += `<td><input type="number" class="bloom-input" ${inputStyle} placeholder="${c('fill',i)}" min="0" max="${c('fill',i)}" data-lesson="${l}" data-type="fill" data-level="${i}" oninput="window.update_bloom_count()"></td>`;
        row += `</tr>`; 
        return row;
    }).join('');
};

window.update_bloom_count = function() {
    let total = 0, single = 0, tf = 0, fill = 0;
    document.querySelectorAll('.bloom-input').forEach(input => {
        let val = parseInt(input.value) || 0; let max = parseInt(input.placeholder) || 0;
        if (val > max) { input.value = max; val = max; }
        total += val;
        const type = input.getAttribute('data-type');
        if (type === 'single') single += val; else if (type === 'true_false') tf += val; else if (type === 'fill') fill += val;
    });
    document.getElementById('total_selected_count').innerText = total;
    document.getElementById('count_single').innerText = single;
    document.getElementById('count_true_false').innerText = tf;
    document.getElementById('count_fill').innerText = fill;
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
                
                // Đồng bộ chuẩn hóa giống hàm đếm ở trên
                let qType = q.type ? String(q.type).toLowerCase().trim() : 'single';
                if (qType === 'quiz' || qType === 'mcq' || qType === '') qType = 'single';
                if (qType === 'tf' || qType === 'đúng sai') qType = 'true_false';
                if (qType !== type) return false;

                let qLevel = q.level ? String(q.level).trim() : "1";
                if (qLevel === "null" || qLevel === "undefined" || qLevel === "0" || qLevel === "") qLevel = "1";
                
                return qLevel === String(level);
            });
            if (pool.length > 0) { let shuffled = pool.sort(() => 0.5 - Math.random()); exam_list.push(...shuffled.slice(0, val)); }
        }
    });

    if (exam_list.length === 0) return window.show_alert("Thông báo", "Vui lòng chọn số câu hỏi!", false);

    window.questions = exam_list.sort((a, b) => { const order = { 'single': 1, 'true_false': 2, 'fill': 3 }; return order[a.type] - order[b.type]; });
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
    document.getElementById('admin_export_section').style.display = 'block';
};

// [ĐÃ GỠ BẢN TRÙNG] window.exportExamPackage (dòng cũ 1726-1726) - bản dùng thật nằm ở phía dưới file
// [ĐÃ GỠ] run_health_check bản Google Apps Script -> xem bản Supabase/offline ở đầu file

// =========================================================================
// 📝 HÀM MỚI: XỬ LÝ LƯU ĐỀ THI TRỰC TUYẾN TỪ MA TRẬN BLOOM (CÓ REVIEW)
// =========================================================================
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
                
                // Đồng bộ chuẩn hóa giống hàm đếm
                let qType = q.type ? String(q.type).toLowerCase().trim() : 'single';
                if (qType === 'quiz' || qType === 'mcq' || qType === '') qType = 'single';
                if (qType === 'tf' || qType === 'đúng sai') qType = 'true_false';
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
        const order = { 'single': 1, 'true_false': 2, 'fill': 3 }; 
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
        <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2" style="border-color: rgba(255,255,255,0.1) !important;">
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
        
        <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom" style="border-color: rgba(255,255,255,0.1) !important;">
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
            <div class="mb-3 p-2 rounded border" style="background: rgba(0,0,0,0.25); border-color: rgba(255,255,255,0.1) !important; font-size: 0.85rem; color: rgba(255,255,255,0.9);">
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

                <div class="d-flex justify-content-end gap-2 border-top pt-3 mt-3" style="border-color: rgba(255,255,255,0.1) !important;">
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
// 📂 PHẦN 7: DANH MỤC MÔN HỌC (SUBJECT MANAGEMENT)
// =========================================================================
window.render_subject_management = function() {
    const container = document.getElementById('dash_subject_cards_container');
    
    let html = `
    <div class="col-12 px-1 animate__animated animate__fadeIn mb-3">
        <div class="d-flex justify-content-between align-items-center bg-dark p-3 rounded-4 shadow-sm w-100" style="background: transparent !important; border: 1px solid rgba(255,255,255,0.1);">
            <div style="flex: 1;"><button class="btn btn-sm glass-action-btn fw-bold px-3" onclick="window.render_admin_hub()">Thoát</button></div>
            <h6 class="fw-bold text-white mb-0 px-2 text-center flex-grow-1 text-truncate" style="font-size: 0.9rem; letter-spacing: 1px;">DANH MỤC MÔN HỌC</h6>
            <div style="flex: 1;" class="text-end"><button class="btn btn-sm btn-info fw-bold px-3" onclick="window.open_subject_modal()">Tạo mới</button></div>
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
        
        // 🌟 BẢNG ÉP THỨ TỰ MÔN HỌC ADMIN
        const subjectOrder = { 'toan': 1, 'van': 2, 'tienganh': 3, 'khtn': 4, 'congnghe': 5, 'tinhoc': 6, 'lichsu': 7, 'dialy': 8, 'gdcd': 9 };
        
        // Tiến hành xếp hàng các thẻ môn học
        subjects.sort((a, b) => {
            let rankA = subjectOrder[a.key] || 999;
            let rankB = subjectOrder[b.key] || 999;
            if (rankA !== rankB) return rankA - rankB;
            return a.key.localeCompare(b.key);
        });

        html += `
        <div class="col-12 px-1 animate__animated animate__fadeInUp" style="animation-delay: ${delay}s;">
            <div class="glass-panel p-3 mb-2 d-flex justify-content-between align-items-center shadow-sm" 
                 style="cursor: pointer; border: none !important; background: linear-gradient(90deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.05) 100%); border-radius: 12px;"
                 onclick="let el = document.getElementById('${groupId}'); el.classList.toggle('d-none'); let icon = document.getElementById('icon_${groupId}'); if(el.classList.contains('d-none')){icon.classList.replace('bi-chevron-up', 'bi-chevron-down')}else{icon.classList.replace('bi-chevron-down', 'bi-chevron-up')}">
                <div class="d-flex align-items-center"><i class="bi bi-folder-fill" style="color: #c084fc; font-size: 1.5rem; margin-right: 15px;"></i><div><h6 class="fw-bold text-white mb-0 text-uppercase" style="letter-spacing: 0.5px;">${groupName}</h6><small style="color: #c084fc;">${subjects.length} môn học</small></div></div>
                <i id="icon_${groupId}" class="bi bi-chevron-down text-white fs-5"></i>
            </div>
            
            <div id="${groupId}" class="d-none mb-3 w-100">
                <div class="row m-0 mt-2">`;
        
        subjects.forEach((c) => {
            let safeId = String(c.id || c.fileId || c['ID File'] || c[1] || '').trim();
            let safeSheet = String(c.sheetName || c.sheet || c['Tên Sheet'] || c[2] || '').trim();
            let safeRole = String(c.role || c.quyen || c['Quyền'] || c[3] || 'all').trim();
            let safeIcon = String(c.icon || c['Icon'] || c[4] || '📚').trim();
            let safeName = String(c.name || c['Tên hiển thị'] || c[5] || c.key || 'Chưa có tên').trim();
            let safeUI = String(c.ui_template || c['Mẫu Giao Diện'] || c[6] || '1').trim();

            let uiText = safeUI === "2" ? "UI2" : safeUI === "3" ? "UI3" : "UI1";
            let displayId = safeId ? safeId.substring(0, 15) + '...' : '<span class="text-danger fw-bold">Trống/Lỗi</span>';
            let displaySheet = safeSheet ? safeSheet : '<span class="text-danger fw-bold">Trống/Lỗi</span>';

            html += `
                    <div class="col-12 px-0 mb-2">
                        <div class="card glass-panel p-3 d-flex flex-row align-items-center">
                            <div class="rounded-circle d-flex align-items-center justify-content-center bg-dark text-white fw-bold shadow-inner flex-shrink-0" style="width: 45px; height: 45px; font-size: 1.2rem;">${safeIcon}</div>
                            <div class="flex-grow-1 px-3 overflow-hidden">
                                <div class="fw-bold text-white mb-1" style="font-size: 0.95rem;">${safeName}</div>
                                <div class="text-white-50" style="font-size: 0.75rem; line-height: 1.5;">
                                    <div class="text-truncate">Mã: <span class="text-info fw-bold">${c.key}</span> | Nhóm: ${safeRole}</div>
                                    <div class="text-truncate">ID: <span class="text-warning font-monospace">${displayId}</span></div>
                                    <div class="text-truncate">Sheet: <span class="text-success font-monospace">${displaySheet}</span> | UI: <span class="text-light">${uiText}</span></div>
                                </div>
                            </div>
                            <div class="d-flex flex-column gap-1 flex-shrink-0">
                                <button class="btn btn-sm glass-action-btn text-warning py-1 px-3" onclick="window.open_subject_modal('${c.key}')"><i class="bi bi-pencil-square"></i> Sửa</button>
                                <button class="btn btn-sm glass-action-btn text-danger py-1 px-3" onclick="window.remove_subject('${c.key}')"><i class="bi bi-trash3"></i> Xóa</button>
                            </div>
                        </div>
                    </div>`;
        });
        html += `       </div>
            </div>
        </div>`;
        delay += 0.05;
    });
    container.innerHTML = html;
};

window.open_subject_modal = function(subjectKey = '') {
    let c = subjectKey ? subjectConfig[subjectKey] : {};
    if (!c) c = {};

    let code = subjectKey;
    let fileId = c.id || c.fileId || c.file_id || c['ID File'] || '';
    let sheetName = c.sheetName || c.sheet || c.sheet_name || c['Tên Sheet'] || '';
    let role = c.role || c.quyen || c['Quyền'] || '';
    let icon = c.icon || c['Icon'] || '';
    let name = c.name || c.ten_hien_thi || c['Tên hiển thị'] || '';
    let ui_template = c.ui_template || c.mau_giao_dien || c['Mẫu Giao Diện'] || '1';

    let modalHtml = `
    <div id="subject_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 28000; backdrop-filter: blur(10px); padding: 10px;">
        <div class="glass-panel p-3 shadow-lg w-100 d-flex flex-column" style="max-width: 550px; border-radius: 16px; background: rgba(15, 23, 42, 0.95) !important;">
            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2" style="border-color: rgba(255,255,255,0.1) !important;">
                <h6 class="fw-bold text-info mb-0"><i class="bi bi-journal-plus me-2"></i>${code ? 'SỬA THÔNG TIN MÔN' : 'TẠO MÔN MỚI'}</h6>
                <button class="btn-close btn-close-white" onclick="document.getElementById('subject_modal').remove()"></button>
            </div>
            <div class="overflow-auto custom-scrollbar pe-2">
                <div class="row g-2 mb-2">
                    <div class="col-4"><label class="text-white-50 small fw-bold mb-1" style="font-size: 0.7rem;">Mã môn <span class="text-danger">*</span></label><input type="text" id="modal_s_code" class="form-control form-control-sm text-white glass-input-style text-center" value="${code}" ${code ? 'readonly style="opacity:0.6"' : 'placeholder="vd: toan9"'}></div>
                    <div class="col-6"><label class="text-white-50 small fw-bold mb-1" style="font-size: 0.7rem;">Tên hiển thị <span class="text-danger">*</span></label><input type="text" id="modal_s_name" class="form-control form-control-sm text-white glass-input-style fw-bold text-info" value="${name}" placeholder="vd: Toán lớp 9"></div>
                    <div class="col-2"><label class="text-white-50 small fw-bold mb-1" style="font-size: 0.7rem;">Icon</label><input type="text" id="modal_s_icon" class="form-control form-control-sm text-white glass-input-style text-center" value="${icon}" placeholder="📚"></div>
                </div>
                <div class="mb-2"><label class="text-white-50 small fw-bold mb-1" style="font-size: 0.7rem;">ID File Google Sheets <span class="text-danger">*</span></label><input type="text" id="modal_s_fileid" class="form-control form-control-sm text-warning glass-input-style font-monospace" value="${fileId}" placeholder="Nhập ID file..."></div>
                <div class="row g-2 mb-3">
                    <div class="col-6"><label class="text-white-50 small fw-bold mb-1" style="font-size: 0.7rem;">Tên Sheet <span class="text-danger">*</span></label><input type="text" id="modal_s_sheetname" class="form-control form-control-sm text-success glass-input-style font-monospace" value="${sheetName}" placeholder="vd: Trang tính 1"></div>
                    <div class="col-6"><label class="text-white-50 small fw-bold mb-1" style="font-size: 0.7rem;">Nhóm (vd: k12)</label><input type="text" id="modal_s_role" class="form-control form-control-sm text-white glass-input-style" value="${role}" placeholder="all"></div>
                </div>
                <div class="mb-3">
                    <label class="text-white-50 small fw-bold mb-2">MẪU GIAO DIỆN (UI)</label>
                    <div class="d-flex gap-2 w-100">
                        <input type="radio" class="btn-check" name="ui_template_opt" id="ui_opt_1" value="1" ${ui_template === '1' ? 'checked' : ''}><label class="btn btn-outline-info flex-grow-1 py-2 fw-bold" for="ui_opt_1" style="border-radius: 10px; font-size: 0.7rem;">MẶC ĐỊNH</label>
                        <input type="radio" class="btn-check" name="ui_template_opt" id="ui_opt_2" value="2" ${ui_template === '2' ? 'checked' : ''}><label class="btn btn-outline-success flex-grow-1 py-2 fw-bold" for="ui_opt_2" style="border-radius: 10px; font-size: 0.7rem;">CHUYÊN SÂU</label>
                        <input type="radio" class="btn-check" name="ui_template_opt" id="ui_opt_3" value="3" ${ui_template === '3' ? 'checked' : ''}><label class="btn btn-outline-warning flex-grow-1 py-2 fw-bold" for="ui_opt_3" style="border-radius: 10px; font-size: 0.7rem;">THỰC HÀNH</label>
                    </div>
                </div>
            </div>
            <div class="d-flex justify-content-end gap-2 pt-2 border-top" style="border-color: rgba(255,255,255,0.1) !important;">
                <button class="btn btn-sm glass-action-btn px-4" onclick="document.getElementById('subject_modal').remove()">HỦY</button>
                <button class="btn btn-sm btn-info fw-bold px-4 shadow-sm" onclick="window.save_subject_to_sheet(this)"><i class="bi bi-save2-fill me-1"></i> LƯU MÔN HỌC</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// =========================================================================
// 👥 PHẦN 8: QUẢN TRỊ THEO LỚP & NGƯỜI DÙNG (CLASS-BASED MANAGEMENT)
// =========================================================================

window.render_user_management = async function() {
    const container = document.getElementById('dash_subject_cards_container');
    container.innerHTML = `<div class="col-12 text-center p-5"><div class="spinner-border text-success"></div><div class="mt-2 text-white-50">Đang tải dữ liệu lớp học...</div></div>`;
    
    try {
        // Tải song song danh sách Lớp và User
        const [{ data: classes, error: errC }, { data: users, error: errU }] = await Promise.all([
            db.from('classes').select('*').order('class_code', { ascending: true }),
            db.from('users').select('student_id, password, full_name, role, permissions, inventory, class_code')
        ]);
        if (errC) throw errC;
        if (errU) throw errU;

        // Header và Nút chức năng
        let html = `
        <div class="col-12 px-1 animate__animated animate__fadeIn mb-3">
            <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center bg-dark p-3 rounded-4 shadow-sm w-100" style="background: transparent !important; border: 1px solid rgba(255,255,255,0.1);">
                <button class="btn btn-sm glass-action-btn fw-bold px-3" onclick="window.render_admin_hub()">Thoát</button>
                <h6 class="text-white fw-bold mb-0 text-center m-0 text-uppercase flex-grow-1" style="letter-spacing: 1px; font-size: 0.9rem;">QUẢN LÝ LỚP & HỌC VIÊN</h6>
                <div class="d-flex gap-2 flex-wrap justify-content-end">
    <button class="btn btn-sm btn-primary fw-bold px-4 shadow-sm text-white" style="background: linear-gradient(45deg, #3b82f6, #8b5cf6); border: none;" onclick="window.open_data_manager('tab_user')">
        <i class="bi bi-grid-1x2-fill me-2"></i> TRUNG TÂM NHẬP DỮ LIỆU
    </button>
</div>
            </div>
        </div>`;

        let delay = 0;
        let usersWithoutClass = [];
        let admins = [];

        // Gom nhóm user theo class_code, admin, và tự do
        let classGroups = {};
        classes.forEach(c => classGroups[c.class_code] = { info: c, users: [] });

        users.forEach(u => {
            if (u.role === 'admin' || u.role === 'all') {
                admins.push(u);
            } else if (u.class_code && classGroups[u.class_code]) {
                classGroups[u.class_code].users.push(u);
            } else {
                usersWithoutClass.push(u);
            }
        });

        // Hàm render card sinh viên (dùng chung)
        const renderUserCard = (u) => {
            let uid = u.student_id; let pwd = u.password; let role = u.role; let fname = u.full_name || 'Chưa cập nhật'; let perms = u.permissions || ''; let cCode = u.class_code || '';
            let roleBadge = (role === 'all' || role === 'admin') ? `<span class="badge bg-danger shadow-sm">ADMIN</span>` : `<span class="badge bg-primary shadow-sm">USER</span>`;
            return `
            <div class="col-12 px-0 mb-2">
                <div class="card glass-panel p-2 p-md-3" style="border-left: 3px solid ${(role === 'all' || role === 'admin') ? '#ef4444' : '#38bdf8'} !important;">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                        <div class="d-flex align-items-center gap-3" style="min-width: 250px;">
                            <div class="rounded-circle d-flex align-items-center justify-content-center bg-dark text-white fw-bold shadow-inner flex-shrink-0" style="width: 45px; height: 45px; font-size: 1.2rem;">${fname.charAt(0).toUpperCase()}</div>
                            <div>
                                <div class="fw-bold text-white fs-6 lh-1 mb-1">${fname} ${roleBadge}</div>
                                <div class="text-info small fw-bold">ID: ${uid} <span class="text-white-50 mx-1">|</span> Pass: <span class="text-white">${pwd}</span></div>
                            </div>
                        </div>
                        <div class="d-flex flex-row flex-md-column gap-2 flex-shrink-0" style="min-width: 90px;">
                            <button class="btn btn-sm glass-action-btn w-100 text-warning" onclick="window.open_data_manager('tab_user', '${uid}', '${pwd}', '${role}', '${fname}', '${perms}', '${cCode}')"><i class="bi bi-pencil-square"></i> SỬA</button>
                            <button class="btn btn-sm glass-action-btn w-100 text-danger" onclick="window.remove_user('${uid}')"><i class="bi bi-trash3"></i> XÓA</button>
                        </div>
                    </div>
                </div>
            </div>`;
        };

        // Render các lớp học
        Object.keys(classGroups).forEach((classCode, gIndex) => {
            let cls = classGroups[classCode];
            let groupId = 'class_mng_group_' + gIndex;
            html += `
            <div class="col-12 px-1 animate__animated animate__fadeInUp" style="animation-delay: ${delay}s;">
                <div class="glass-panel p-3 mb-2 d-flex justify-content-between align-items-center shadow-sm" style="cursor: pointer; border: none !important; background: linear-gradient(90deg, rgba(14, 165, 233, 0.2) 0%, rgba(14, 165, 233, 0.05) 100%); border-radius: 12px;" onclick="document.getElementById('${groupId}').classList.toggle('d-none');">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-journal-bookmark-fill text-info fs-4 me-3"></i>
                        <div>
                            <h6 class="fw-bold text-white mb-0 text-uppercase" style="letter-spacing: 0.5px;">LỚP ${classCode} <span class="text-white-50 ms-2" style="font-size:0.8rem; text-transform:none;">${cls.info.class_name || ''}</span></h6>
                            <small class="text-info">${cls.users.length} sinh viên</small>
                        </div>
                    </div>
                    <i class="bi bi-chevron-down text-white fs-5"></i>
                </div>
                <div id="${groupId}" class="d-none mb-3 w-100">
                    <div class="row m-0 mt-2">
                        ${cls.users.map(u => renderUserCard(u)).join('')}
                        ${cls.users.length === 0 ? '<div class="text-white-50 small mb-2">Lớp này chưa có sinh viên nào.</div>' : ''}
                    </div>
                </div>
            </div>`;
            delay += 0.05;
        });

        // Render Admin & Sinh viên tự do
        const renderExtraGroup = (title, list, icon, color, gid) => {
            if(list.length === 0) return '';
            html += `
            <div class="col-12 px-1 animate__animated animate__fadeInUp" style="animation-delay: ${delay}s;">
                <div class="glass-panel p-3 mb-2 d-flex justify-content-between align-items-center shadow-sm" style="cursor: pointer; border: none !important; background: linear-gradient(90deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%); border-radius: 12px;" onclick="document.getElementById('${gid}').classList.toggle('d-none');">
                    <div class="d-flex align-items-center">
                        <i class="${icon} text-${color} fs-4 me-3"></i>
                        <div><h6 class="fw-bold text-white mb-0 text-uppercase">${title}</h6><small class="text-${color}">${list.length} tài khoản</small></div>
                    </div>
                    <i class="bi bi-chevron-down text-white fs-5"></i>
                </div>
                <div id="${gid}" class="d-none mb-3 w-100"><div class="row m-0 mt-2">${list.map(u => renderUserCard(u)).join('')}</div></div>
            </div>`;
            delay += 0.05;
        };

        renderExtraGroup('QUẢN TRỊ VIÊN (ADMIN)', admins, 'bi-shield-lock-fill', 'danger', 'group_admins');
        renderExtraGroup('SINH VIÊN TỰ DO (CHƯA CÓ LỚP)', usersWithoutClass, 'bi-person-lines-fill', 'warning', 'group_free_users');

        container.innerHTML = html;
    } catch(err) { container.innerHTML = `<div class="col-12 text-center p-5 text-danger">Lỗi tải dữ liệu: ${err.message}</div>`; }
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

window.open_data_manager = function(activeTab = 'tab_user', uname='', pwd='', role='k12', fname='', perms='', classCode='') {
    let existingModal = document.getElementById('data_manager_modal');
    if (existingModal) existingModal.remove();

    let pList = perms === 'all' ? ['all'] : perms.split(',').map(s => s.trim().toLowerCase());
    let hasP = (key, act) => { if (pList.includes('all')) return true; if (act === 'system') return pList.includes(`system_${key}`); if (act === 'stats') return pList.includes(`${key}_stats`) || pList.includes('stats_view') || pList.includes('stats_all') || pList.includes('stats'); if (act === 'edit') return pList.includes(`${key}_edit`); if (act === 'view') return pList.includes(`${key}_view`) || pList.includes(`${key}_edit`) || pList.includes(key); return false; };
    let groupedSubjects = {};
    Object.keys(window.subjectConfig || {}).forEach(k => { let grp = window.subjectConfig[k].role || 'Khác'; if(!groupedSubjects[grp]) groupedSubjects[grp] = []; groupedSubjects[grp].push(k); });

    let subjectsCheckboxes = "";
    Object.keys(groupedSubjects).forEach(grp => {
        let grpLower = grp.toLowerCase();
        subjectsCheckboxes += `<div class="mb-3 p-2 rounded shadow-sm" style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.05);"><div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2" style="border-color: rgba(255,255,255,0.1) !important;"><div class="text-warning fw-bold text-uppercase" style="font-size: 0.75rem;"><i class="bi bi-folder-fill me-1"></i> NHÓM: ${grp}</div><div class="d-flex gap-2 text-center"><div style="width: 45px;"><label class="text-white-50 fw-bold m-0 d-block" style="font-size: 0.6rem;">XEM</label><input type="checkbox" class="form-check-input chk-view chk-group custom-switch-view m-0" data-base="${grpLower}" ${hasP(grpLower, 'view')?'checked':''} onchange="window.handle_perm_change(this)" style="cursor:pointer;"></div><div style="width: 45px;"><label class="text-white-50 fw-bold m-0 d-block" style="font-size: 0.6rem;">SỬA</label><input type="checkbox" class="form-check-input chk-edit chk-group custom-switch-edit m-0" data-base="${grpLower}" ${hasP(grpLower, 'edit')?'checked':''} onchange="window.handle_perm_change(this)" style="cursor:pointer;"></div><div style="width: 45px;"><label class="text-white-50 fw-bold m-0 d-block" style="font-size: 0.6rem; color: #c084fc !important;">T.KÊ</label><input type="checkbox" class="form-check-input chk-stats chk-group custom-switch-stats m-0" data-base="${grpLower}" ${hasP(grpLower, 'stats')?'checked':''} onchange="window.handle_perm_change(this)" style="cursor:pointer;"></div></div></div>`;
        groupedSubjects[grp].forEach(subjKey => {
            subjectsCheckboxes += `<div class="d-flex justify-content-between align-items-center px-1 py-1 mb-1 rounded" style="background: rgba(255,255,255,0.02);"><div class="text-white text-truncate pe-2" style="font-size: 0.8rem;"><i class="bi bi-dot text-info"></i> ${window.subjectNames ? window.subjectNames[subjKey] : subjKey}</div><div class="d-flex gap-2 text-center flex-shrink-0"><div style="width: 45px;"><input type="checkbox" class="form-check-input chk-view custom-switch-view m-0" data-base="${subjKey.toLowerCase()}" data-group="${grpLower}" ${hasP(subjKey.toLowerCase(), 'view')?'checked':''} onchange="window.handle_perm_change(this)" style="cursor:pointer;"></div><div style="width: 45px;"><input type="checkbox" class="form-check-input chk-edit custom-switch-edit m-0" data-base="${subjKey.toLowerCase()}" data-group="${grpLower}" ${hasP(subjKey.toLowerCase(), 'edit')?'checked':''} onchange="window.handle_perm_change(this)" style="cursor:pointer;"></div><div style="width: 45px;"><input type="checkbox" class="form-check-input chk-stats custom-switch-stats m-0" data-base="${subjKey.toLowerCase()}" data-group="${grpLower}" ${hasP(subjKey.toLowerCase(), 'stats')?'checked':''} onchange="window.handle_perm_change(this)" style="cursor:pointer;"></div></div></div>`;
        });
        subjectsCheckboxes += `</div>`;
    });

    let modalHtml = `
    <div id="data_manager_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 28000; backdrop-filter: blur(10px); padding: 10px;">
        <style>.form-check-input { width: 2rem; height: 1.1rem; } .custom-switch-view:checked { background-color: #10b981 !important; border-color: #10b981 !important; } .custom-switch-edit:checked { background-color: #f59e0b !important; border-color: #f59e0b !important; } .custom-switch-stats:checked { background-color: #a855f7 !important; border-color: #a855f7 !important; } .custom-switch-admin:checked { background-color: #ef4444 !important; border-color: #ef4444 !important; } .chk-system:checked { background-color: #0ea5e9 !important; border-color: #0ea5e9 !important; }</style>
        
        <div class="glass-panel shadow-lg w-100 d-flex flex-column p-0" style="max-width: 650px; max-height: 95vh; border-radius: 16px; background: rgba(15, 23, 42, 0.95) !important; overflow: hidden;">
            <div class="d-flex justify-content-between align-items-center p-3 border-bottom" style="border-color: rgba(255,255,255,0.1) !important; background: rgba(0,0,0,0.2);">
                <h6 class="fw-bold text-white mb-0"><i class="bi bi-database-fill me-2 text-primary"></i>TRUNG TÂM DỮ LIỆU</h6>
                <button class="btn-close btn-close-white" onclick="document.getElementById('data_manager_modal').remove()"></button>
            </div>

            <div class="d-flex border-bottom" style="border-color: rgba(255,255,255,0.1) !important; background: rgba(255,255,255,0.02);">
                <button class="flex-fill btn rounded-0 border-0 p-2 dm-tab-btn" data-target="tab_user" onclick="window.switch_dm_tab('tab_user')"><i class="bi bi-person-vcard me-1"></i> USER & QUYỀN</button>
                <button class="flex-fill btn rounded-0 border-0 p-2 dm-tab-btn" data-target="tab_class" onclick="window.switch_dm_tab('tab_class')"><i class="bi bi-folder-plus me-1"></i> TẠO LỚP</button>
                <button class="flex-fill btn rounded-0 border-0 p-2 dm-tab-btn" data-target="tab_import" onclick="window.switch_dm_tab('tab_import')"><i class="bi bi-file-earmark-spreadsheet me-1"></i> IMPORT EXCEL</button>
            </div>

            <div class="p-3 overflow-auto custom-scrollbar flex-grow-1">
                
                <div id="tab_user" class="dm-tab-pane animate__animated animate__fadeIn">
                    <div class="row g-2 mb-2">
                        <div class="col-6"><label class="text-white-50 small fw-bold mb-1">ID <span class="text-danger">*</span></label><input type="text" id="modal_u_id" class="form-control form-control-sm text-white glass-input-style" value="${uname}" ${uname ? 'readonly style="opacity:0.6"' : 'placeholder="VD: SV01"'}></div>
                        <div class="col-6"><label class="text-white-50 small fw-bold mb-1">Mật khẩu <span class="text-danger">*</span></label><input type="text" id="modal_u_pass" class="form-control form-control-sm text-white glass-input-style" value="${pwd}" placeholder="Mật khẩu"></div>
                    </div>
                    <div class="row g-2 mb-3">
                        <div class="col-7"><label class="text-white-50 small fw-bold mb-1">Họ và Tên</label><input type="text" id="modal_u_name" class="form-control form-control-sm text-white glass-input-style fw-bold text-info" value="${fname}" placeholder="Nhập họ tên..."></div>
                        <div class="col-5"><label class="text-white-50 small fw-bold mb-1">Mã Lớp</label><input type="text" id="modal_u_class" class="form-control form-control-sm text-white glass-input-style fw-bold text-warning" value="${classCode}" placeholder="VD: DD21F"></div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center p-2 mb-3 rounded shadow-sm" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);">
                        <div class="text-danger fw-bold" style="font-size: 0.8rem;"><i class="bi bi-star-fill me-1"></i> QUYỀN ADMIN TỐI CAO</div>
                        <div class="form-check form-switch m-0 p-0"><input class="form-check-input custom-switch-admin ms-0 mt-0" type="checkbox" id="modal_u_isadmin" ${role==='all'||role==='admin'?'checked':''} onchange="document.getElementById('matrix_wrapper').style.display = this.checked ? 'none' : 'block'" style="cursor: pointer;"></div>
                    </div>
                    <div id="matrix_wrapper" style="display: ${role==='all'||role==='admin'?'none':'block'};">
                        <div class="text-success fw-bold mb-2 text-uppercase" style="font-size: 0.8rem;"><i class="bi bi-ui-checks-grid me-1"></i> Phân quyền theo Môn học</div>
                        ${subjectsCheckboxes}
                    </div>
                    <div class="d-flex justify-content-end pt-2 border-top mt-3" style="border-color: rgba(255,255,255,0.1) !important;">
                        <button class="btn btn-sm btn-success fw-bold px-4 shadow-sm" onclick="window.save_user_to_sheet(this)"><i class="bi bi-save2-fill me-1"></i> LƯU USER NÀY</button>
                    </div>
                </div>

                <div id="tab_class" class="dm-tab-pane animate__animated animate__fadeIn" style="display:none;">
                    <div class="p-4 text-center mb-3">
                        <i class="bi bi-folder-plus text-info mb-2" style="font-size: 3rem;"></i>
                        <h6 class="text-white fw-bold">KHỞI TẠO LỚP RỖNG</h6>
                        <small class="text-white-50">Tạo lớp học trước, sau đó thêm Sinh viên hoặc Import danh sách vào lớp này.</small>
                    </div>
                    <div class="mb-3">
                        <label class="text-white-50 small fw-bold mb-1">Mã Lớp (Bắt buộc) <span class="text-danger">*</span></label>
                        <input type="text" id="modal_c_code" class="form-control text-white glass-input-style fw-bold text-warning form-control-lg" placeholder="VD: DD21F (Viết liền, không dấu)">
                    </div>
                    <div class="mb-4">
                        <label class="text-white-50 small fw-bold mb-1">Tên Lớp (Không bắt buộc)</label>
                        <input type="text" id="modal_c_name" class="form-control text-white glass-input-style fw-bold text-info form-control-lg" placeholder="VD: Điều dưỡng 21F">
                    </div>
                    <div class="d-flex justify-content-end pt-2 border-top" style="border-color: rgba(255,255,255,0.1) !important;">
                        <button class="btn btn-info fw-bold px-4 shadow-sm text-dark w-100" onclick="window.save_new_class()"><i class="bi bi-plus-circle-fill me-1"></i> TẠO LỚP MỚI</button>
                    </div>
                </div>

                <div id="tab_import" class="dm-tab-pane animate__animated animate__fadeIn" style="display:none;">
                    <div class="p-4 text-center">
                        <i class="bi bi-file-earmark-excel-fill text-success mb-2" style="font-size: 3.5rem;"></i>
                        <h5 class="text-white fw-bold">IMPORT DỮ LIỆU HÀNG LOẠT</h5>
                        <p class="text-white-50 small mb-4">Nhập tự động sinh viên và lớp học cùng lúc thông qua file Excel. Hệ thống sẽ tự động tạo Lớp nếu mã lớp chưa tồn tại.</p>
                        <div class="d-grid gap-3">
                            <button class="btn btn-outline-info fw-bold py-2" onclick="window.download_excel_template()">
                                <i class="bi bi-cloud-arrow-down-fill me-2"></i> 1. TẢI FILE EXCEL MẪU
                            </button>
                            <button class="btn btn-success fw-bold py-2" onclick="document.getElementById('excel_upload_input').click()">
                                <i class="bi bi-cloud-arrow-up-fill me-2"></i> 2. CHỌN FILE ĐỂ IMPORT
                            </button>
                            <input type="file" id="excel_upload_input" accept=".xlsx, .xls" class="d-none" onchange="window.import_excel_students(event)">
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.switch_dm_tab(activeTab);
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
    modal.style.cssText = "background: rgba(0,0,0,0.85); z-index: 99999; backdrop-filter: blur(10px);";
    
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
    modal.style.cssText = "background: rgba(0,0,0,0.85); z-index: 99999; backdrop-filter: blur(10px);";
    
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
    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 99999; backdrop-filter: blur(10px); padding: 15px;">
        
        <div class="glass-panel p-0 shadow-lg d-flex flex-column w-100 h-100 animate__animated animate__zoomIn" style="max-width: 1200px; border-radius: 16px; background: rgba(15, 23, 42, 0.95) !important; border: 1px solid rgba(56, 189, 248, 0.5); overflow: hidden;">
            
            <!-- 🌟 HEADER -->
            <div class="d-flex justify-content-between align-items-center p-3 border-bottom flex-shrink-0" style="border-color: rgba(255,255,255,0.1) !important; background: rgba(0,0,0,0.2);">
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
                    
                    <div class="mt-auto w-100 pt-1 border-top d-flex align-items-center justify-content-center gap-1" style="border-color: rgba(255,255,255,0.1) !important; color: ${cfg.color};">
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
        <div class="p-2 d-flex justify-content-between align-items-center border-bottom" style="border-color: rgba(255,255,255,0.1) !important;">
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
            
            <div class="mb-3 border-top pt-3" style="border-color: rgba(255,255,255,0.1) !important;">
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
    <div id="${overlayId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style="background: rgba(15, 23, 42, 0.95); z-index: 9999999; backdrop-filter: blur(10px);">
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
    <div id="${toastId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 9999999;">
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
    <div id="esport_hub_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style="background: rgba(0,0,0,0.85); z-index: 9999999; backdrop-filter: blur(5px);">
        <div class="glass-panel p-3 animate__animated animate__zoomIn shadow-lg" style="width: 300px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(15, 23, 42, 0.95);">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <h6 class="fw-bold text-info mb-0" style="font-size: 0.9rem;"><i class="bi bi-shield-shaded"></i> KỸ NĂNG & NHIỆM VỤ</h6>
                <button class="btn-close btn-close-white" style="font-size: 0.7rem;" onclick="document.getElementById('esport_hub_modal').remove()"></button>
            </div>
            ${radarHtml}
            <div class="mt-3 border-top pt-2" style="border-color: rgba(255,255,255,0.1) !important;">
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


window.show_online_exam_modal = async function(defaultTime) {
    // --- NẠP DANH SÁCH LỚP TỪ DATABASE TRƯỚC KHI MỞ ---
    try {
        const { data: classData, error: classErr } = await db.from('classes').select('class_code').order('class_code', { ascending: true });
        window.available_classes = (!classErr && classData) ? classData.map(c => c.class_code) : [];
    } catch (err) {
        console.error("Lỗi tải danh sách lớp:", err);
        window.available_classes = [];
    }
    // ------------------------------------------------

    let oldModal = document.getElementById('online_exam_modal'); if (oldModal) oldModal.remove();
    let examCount = window.temp_online_exam_questions.length;
    let autoCode = "DE_" + Math.floor(Date.now() / 1000).toString().slice(-6);
    
    let tz = (new Date()).getTimezoneOffset() * 60000;
    let localISOTimeOpen = (new Date(Date.now() - tz)).toISOString().slice(0,16);
    let localISOTimeClose = (new Date(Date.now() - tz + defaultTime*60000)).toISOString().slice(0,16);

    let modalHtml = `
    <div id="online_exam_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 30000; backdrop-filter: blur(10px); padding: 10px;">
        <div class="glass-panel p-3 shadow-lg w-100 d-flex flex-column" style="max-width: 600px; border-radius: 16px; background: rgba(15, 23, 42, 0.95) !important; border: 1px solid #f59e0b;">
            <div class="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2" style="border-color: rgba(255,255,255,0.1) !important;">
                <h6 class="fw-bold text-warning mb-0"><i class="bi bi-cloud-arrow-up-fill me-2"></i>TẠO PHÒNG THI ONLINE (Gom ${examCount} câu)</h6>
                <button class="btn-close btn-close-white" onclick="document.getElementById('online_exam_modal').remove()"></button>
            </div>
            
            <div class="row g-2 mb-2">
                <div class="col-3"><label class="text-white-50 fw-bold mb-0" style="font-size: 0.65rem;">Mã Đề *</label><input type="text" id="create_ex_code" class="form-control form-control-sm text-warning fw-bold glass-input-style text-center font-monospace" value="${autoCode}"></div>
                <div class="col-5"><label class="text-white-50 fw-bold mb-0" style="font-size: 0.65rem;">Tên Kỳ Thi *</label><input type="text" id="create_ex_name" class="form-control form-control-sm text-info glass-input-style fw-bold" placeholder="VD: Thi giữa kỳ..."></div>
                <div class="col-2"><label class="text-white-50 fw-bold mb-0" style="font-size: 0.65rem;">Phút *</label><input type="number" id="create_ex_time" class="form-control form-control-sm text-white glass-input-style text-center fw-bold" value="${defaultTime}" onchange="window.update_modal_close_time('create_ex')"></div>
                <div class="col-2"><label class="text-white-50 fw-bold mb-0" style="font-size: 0.65rem;">Trạng thái</label><select id="create_ex_status" class="form-select form-select-sm text-white fw-bold glass-input-style px-1" style="background-color: rgba(0,0,0,0.5);"><option value="MỞ">🟢 MỞ</option><option value="ĐÓNG">🔴 ĐÓNG</option></select></div>
            </div>

            <div class="row g-2 mb-2">
                <div class="col-3"><label class="text-white-50 fw-bold mb-0" style="font-size: 0.65rem;">Pass (Tùy chọn)</label><input type="text" id="create_ex_pass" class="form-control form-control-sm text-danger glass-input-style text-center fw-bold" placeholder="Tắt"></div>
                <div class="col-4"><label class="text-white-50 fw-bold mb-0" style="font-size: 0.65rem;">Hẹn giờ MỞ</label><input type="datetime-local" id="create_ex_open" class="form-control form-control-sm text-white glass-input-style px-1" value="${localISOTimeOpen}" onchange="window.update_modal_close_time('create_ex')"></div>
                <div class="col-5"><label class="text-white-50 fw-bold mb-0" style="font-size: 0.65rem;">Hẹn giờ ĐÓNG (Cộng tự động)</label><input type="datetime-local" id="create_ex_close" class="form-control form-control-sm text-white glass-input-style px-1" value="${localISOTimeClose}"></div>
            </div>

            ${window.get_smart_user_selection_html("", "create_ex")}

            <div class="d-flex justify-content-end gap-2 pt-2 border-top" style="border-color: rgba(255,255,255,0.1) !important;">
                <button class="btn btn-sm glass-action-btn px-4 fw-bold" onclick="document.getElementById('online_exam_modal').remove()">HỦY</button>
                <button id="btn_submit_online_exam" class="btn btn-sm btn-warning fw-bold px-4 shadow-sm" onclick="window.submit_online_exam_to_server()"><i class="bi bi-save2-fill me-1"></i> LƯU ĐỀ THI</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// [ĐÃ GỠ BẢN TRÙNG] window.submit_online_exam_to_server (dòng cũ 3540-3574) - bản dùng thật nằm ở phía dưới file


window.open_edit_exam_modal = async function(encodedEx) {
    // --- NẠP DANH SÁCH LỚP TỪ DATABASE TRƯỚC KHI MỞ ---
    try {
        const { data: classData, error: classErr } = await db.from('classes').select('class_code').order('class_code', { ascending: true });
        window.available_classes = (!classErr && classData) ? classData.map(c => c.class_code) : [];
    } catch (err) {
        console.error("Lỗi tải danh sách lớp:", err);
        window.available_classes = [];
    }
    // ------------------------------------------------

    let ex = JSON.parse(decodeURIComponent(encodedEx));
    let isMo = ex.status === "MỞ" || ex.status.includes("MỞ");

    // 🌟 BỘ LỌC CHUYỂN ĐỔI NGÀY GIỜ CHUẨN HTML5
    let formatTime = function(dateStr) {
        if (!dateStr) return "";
        let d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        let tz = d.getTimezoneOffset() * 60000;
        return (new Date(d.getTime() - tz)).toISOString().slice(0,16);
    };

    let safeOpen = formatTime(ex.auto_open);
    let safeClose = formatTime(ex.auto_close);

    let modalHtml = `
    <div id="edit_exam_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 30000; backdrop-filter: blur(10px); padding: 10px;">
        <div class="glass-panel p-3 shadow-lg w-100 d-flex flex-column" style="max-width: 600px; border-radius: 16px; background: rgba(15, 23, 42, 0.95) !important; border: 1px solid #0ea5e9;">
            <div class="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2" style="border-color: rgba(255,255,255,0.1) !important;">
                <h6 class="fw-bold text-info mb-0"><i class="bi bi-gear-fill me-2"></i>CẬP NHẬT ĐỀ THI: ${ex.code}</h6>
                <button class="btn-close btn-close-white" onclick="document.getElementById('edit_exam_modal').remove()"></button>
            </div>
            
            <div class="row g-2 mb-2">
                <div class="col-7"><label class="text-white-50 fw-bold mb-0" style="font-size: 0.65rem;">Tên Kỳ Thi *</label><input type="text" id="edit_ex_name" class="form-control form-control-sm text-info fw-bold glass-input-style" value="${ex.name}"></div>
                <div class="col-2"><label class="text-white-50 fw-bold mb-0" style="font-size: 0.65rem;">Phút *</label><input type="number" id="edit_ex_time" class="form-control form-control-sm text-white glass-input-style text-center fw-bold" value="${ex.time}" onchange="window.update_modal_close_time('edit_ex')"></div>
                <div class="col-3"><label class="text-white-50 fw-bold mb-0" style="font-size: 0.65rem;">Trạng thái</label><select id="edit_ex_status" class="form-select form-select-sm text-white fw-bold glass-input-style px-1" style="background-color: rgba(0,0,0,0.5);"><option value="ĐÓNG" class="text-danger" ${!isMo ? 'selected' : ''}>🔴 ĐÓNG</option><option value="MỞ" class="text-success" ${isMo ? 'selected' : ''}>🟢 MỞ</option></select></div>
            </div>

            <div class="row g-2 mb-2">
                <div class="col-3"><label class="text-white-50 fw-bold mb-0" style="font-size: 0.65rem;">Pass (Tùy chọn)</label><input type="text" id="edit_ex_pass" class="form-control form-control-sm text-danger glass-input-style text-center fw-bold" value="${ex.pass}" placeholder="Tắt"></div>
                <div class="col-4"><label class="text-white-50 fw-bold mb-0" style="font-size: 0.65rem;">Hẹn giờ MỞ</label><input type="datetime-local" id="edit_ex_open" class="form-control form-control-sm text-white glass-input-style px-1" value="${safeOpen}" onchange="window.update_modal_close_time('edit_ex')"></div>
                <div class="col-5"><label class="text-white-50 fw-bold mb-0" style="font-size: 0.65rem;">Hẹn giờ ĐÓNG (Cộng tự động)</label><input type="datetime-local" id="edit_ex_close" class="form-control form-control-sm text-white glass-input-style px-1" value="${safeClose}"></div>
            </div>

            ${window.get_smart_user_selection_html(ex.users, "edit_ex")}

            <div class="d-flex justify-content-end gap-2 pt-2 border-top" style="border-color: rgba(255,255,255,0.1) !important;">
                <button class="btn btn-sm glass-action-btn px-4 fw-bold" onclick="document.getElementById('edit_exam_modal').remove()">HỦY</button>
                <button id="btn_save_edit_exam" class="btn btn-sm btn-info fw-bold px-4 shadow-sm" onclick="window.save_edit_exam('${ex.code}')"><i class="bi bi-save2-fill me-1"></i> CẬP NHẬT NGAY</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// [ĐÃ GỠ BẢN TRÙNG] window.save_edit_exam (dòng cũ 3590-3620) - bản dùng thật nằm ở phía dưới file


window.start_online_exam = function(ex) {
    let qs = [];
    // Cột jsonb của Supabase trả về MẢNG sẵn, chỉ parse khi là chuỗi
    try {
        let raw = ex.questionsJSON;
        qs = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : (raw ? [].concat(raw) : []));
    } catch(e) { return window.show_toast("❌ Lỗi dữ liệu đề thi từ máy chủ!", true); }
    if (!qs || qs.length === 0) return window.show_toast("❌ Đề thi này chưa có câu hỏi nào!", true);

    // THIẾT LẬP MÔI TRƯỜNG THI THẬT
    window.current_subject = ex.subjectKey;
    window.selected_lessons_text = ex.examName; 
    window.is_study_mode = false; 
    window.is_eligible_for_reward = false; 
    window.current_attempt_count = 1;

    // ========================================================
    // 🌟 XÁO TRỘN ĐÁP ÁN VÀ CÂU HỎI MỖI LẦN VÀO THI
    // ========================================================
    qs.forEach((q, index) => {
        q.id = q.id || (index + 1);
        q.visited = false;
        q.done = false;
        q.ans_user = (q.type === 'fill' || q.type === 'short') ? [] : "";

        let cType = q.type ? String(q.type).toLowerCase().trim() : '';
        // 1. Chỉ xáo trộn đáp án nếu là câu hỏi Trắc nghiệm ABCD
        if ((cType === 'single' || cType === 'mcq') && q.opts && q.opts.length > 0) {
            
            // Xác định chính xác "Nội dung chữ" của đáp án đúng trước khi xáo trộn
            let rawAns = String(q.a || q.answer || "").trim();
            let isLetter = /^[A-D]$/i.test(rawAns);
            let correctText = "";

            if (isLetter) {
                let idx = rawAns.toUpperCase().charCodeAt(0) - 65; // A=0, B=1...
                if (q.opts[idx]) correctText = q.opts[idx];
            } else {
                correctText = rawAns;
            }

            // Thực hiện xáo trộn mảng các lựa chọn (A, B, C, D)
            q.opts = q.opts.sort(() => Math.random() - 0.5);

            // Gán lại phao đáp án đúng (A, B, C hoặc D) theo vị trí mới
            if (correctText) {
                let newIdx = q.opts.findIndex(o => o === correctText);
                if (newIdx !== -1 && isLetter) {
                    q.a = String.fromCharCode(65 + newIdx); 
                    q.answer = q.a;
                }
            }
        }
    });

    // 2. Xáo trộn vị trí tất cả các câu hỏi trong đề
    window.questions = qs.sort(() => Math.random() - 0.5);

    // Mở giao diện phòng thi
    document.getElementById('step_1').style.display = 'none';
    document.getElementById('step_3').style.display = 'block';

    let qHeader = document.querySelector('.sticky-quiz-header') || document.querySelector('#step_3 .header-fixed-wrapper');
    if(qHeader) qHeader.style.display = '';

    // KHÓA GIAN LẬN: Tàng hình nút kỹ năng
    let skill5050 = document.querySelector('button[onclick="window.use_skill_5050()"]');
    let skillTime = document.querySelector('button[onclick="window.use_skill_time()"]');
    let invBadge = document.getElementById('mini_inventory_badge');
    let modeToggle = document.getElementById('mode_text');

    if(skill5050) skill5050.style.display = 'none';
    if(skillTime) skillTime.style.display = 'none';
    if(invBadge) invBadge.style.display = 'none';
    if(modeToggle && modeToggle.parentElement) modeToggle.parentElement.style.display = 'none';

    // ẨN NÚT CỨU SAI BẰNG CSS ĐỘNG
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

    // KÍCH HOẠT PROCTORING: BẢO MẬT & LƯU NHÁP HỒI SINH
    window.proctoring_state = window.proctoring_state || {};
    window.proctoring_state.is_active = true;
    window.proctoring_state.exam_code = ex.examCode;

    window.is_exam_started = true;
    window.away_seconds = 0;
    window.offense_count = 0; 
    window.start_time = new Date();

    // 🌟 ĐÃ FIX: Ghi nhận trạng thái "Đang thi" lên Supabase ngay lập tức để Admin thấy
    try {
        db.from('exam_results').upsert({
            exam_code: ex.examCode,
            student_id: window.current_student_id,
            is_started: true
        }, { onConflict: 'exam_code,student_id' });
    } catch(e) {}

    // 🌟 KHỞI ĐỘNG NHỊP TIM GIÁM SÁT THỜI GIAN THỰC (GIÃN CÁCH 60S CHỐNG SẬP NGUỒN)
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
    }, 60000); // Đã đổi thành 60000 (1 phút/lần) để tối ưu hiệu năng

    // KIỂM TRA BẢN NHÁP CŨ
    let isResumed = false;
    if (typeof window.restore_exam_draft === 'function') {
        isResumed = window.restore_exam_draft(ex.examCode);
    }

    if (!isResumed) {
        window.time_left = ex.timeLimit * 60;
    }

    if(typeof window.render_quiz === 'function') window.render_quiz();
    
    // TÔ LẠI MÀU VÀ GIAO DIỆN CHO CÁC ĐÁP ÁN TỪ BẢN NHÁP CŨ
    if (isResumed && typeof window.re_apply_visual_answers === 'function') {
        window.re_apply_visual_answers();
    }
    
    // ÉP TOÀN MÀN HÌNH CHỐNG GIAN LẬN
    if (typeof window.enable_fullscreen === 'function') window.enable_fullscreen();
    
    if(typeof window.start_countdown === 'function') {
        window.start_countdown();
        if (!isResumed) window.time_left = ex.timeLimit * 60; 
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
    
    if (isResumed) {
        window.show_toast(`♻️ ĐÃ KHÔI PHỤC BÀI THI: Hệ thống đã tải lại các đáp án bạn đang chọn dang dở!`);
    } else {
        window.show_toast(`🚀 BẮT ĐẦU THI: ${ex.examName} (${ex.timeLimit} phút)`);
    }
};

// =========================================================================
// 🛠️ GIAO DIỆN RÀ SOÁT CÂU HỎI TRƯỚC KHI XUẤT ĐỀ THI ONLINE
// =========================================================================
window.show_exam_review_modal = function(questionList, onConfirmCallback) {
    let modalId = 'exam_review_modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    let html = `
    <div id="${modalId}" class="animate__animated animate__fadeIn" style="position: fixed; inset: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 100000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);">
        <div class="glass-panel d-flex flex-column" style="width: 95%; max-width: 900px; height: 90vh; background: rgba(15, 23, 42, 0.95); border-radius: 16px; border: 1px solid #38bdf8; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.5);">
            
            <div class="p-3 border-bottom d-flex justify-content-between align-items-center" style="border-color: rgba(56, 189, 248, 0.3) !important; background: rgba(56, 189, 248, 0.1);">
                <h5 class="text-info fw-bold m-0"><i class="bi bi-ui-checks-grid me-2"></i>RÀ SOÁT & CHỐT DANH SÁCH CÂU HỎI</h5>
                <button class="btn-close btn-close-white" onclick="document.getElementById('${modalId}').remove()"></button>
            </div>
            
            <div class="p-3 flex-grow-1 custom-scrollbar" style="overflow-y: auto;" id="review_q_list"></div>
            
            <div class="p-3 border-top d-flex justify-content-between align-items-center" style="background: rgba(0,0,0,0.5); border-color: rgba(255,255,255,0.1) !important;">
                <div class="text-white">
                    Đang chọn: <strong id="review_selected_count" class="text-warning fs-4">${questionList.length}</strong> / ${questionList.length} câu
                </div>
                <div>
                    <button class="btn btn-outline-light me-2 fw-bold" onclick="document.getElementById('${modalId}').remove()">HỦY BỎ</button>
                    <button class="btn btn-warning fw-bold shadow-lg" onclick="window.confirm_review_exam()" style="background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; border: none;">
                        ✅ CHỐT ĐỀ & TẠO PHÒNG
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);

    let listContainer = document.getElementById('review_q_list');
    questionList.forEach((q, idx) => {
        let qText = (q.q || q.vi || "Câu hỏi trống").replace(/<[^>]*>?/gm, '');
        let qType = String(q.type || 'MCQ').toUpperCase();
        let qAns = (q.a || q.answer || q.en || "N/A").replace(/<[^>]*>?/gm, '');
        
        let itemHtml = `
        <div class="p-3 mb-2 rounded shadow-sm d-flex gap-3 align-items-start" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); transition: 0.2s;">
            <div class="form-check" style="font-size: 1.5rem; margin-top: -2px;">
                <input class="form-check-input review-q-checkbox" type="checkbox" value="${idx}" checked onchange="window.update_review_count()" style="cursor:pointer; border-color: #38bdf8; background-color: #0f172a;">
            </div>
            <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-secondary text-uppercase">${qType}</span>
                    <span class="text-white-50 small fw-bold">Câu ${idx + 1}</span>
                </div>
                <div class="text-white mb-2" style="font-size: 0.95rem; line-height: 1.5;">${qText}</div>
                <div class="text-success small fw-bold bg-dark p-2 rounded border border-success border-opacity-25">
                    <i class="bi bi-check2-circle me-1"></i> Đáp án: ${qAns}
                </div>
            </div>
        </div>`;
        listContainer.insertAdjacentHTML('beforeend', itemHtml);
    });

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
// 🧹 BỘ DỌN RÁC V3: TỰ ĐỘNG LÀM SẠCH KHI RA MÀN HÌNH CHÍNH (TRIỆT ĐỂ 100%)
// =========================================================================
(function auto_clean_state() {
    // Lắng nghe sự thay đổi của màn hình Menu chính (step_1)
    const step1 = document.getElementById('step_1');
    if (step1) {
        const observer = new MutationObserver(function() {
            // Mỗi khi màn hình Menu hiện lên (Thầy thoát bài, nộp bài, hoặc tải lại trang)
            if (step1.style.display !== 'none') {
                
                // 1. Ép hệ thống về chế độ Ôn tập bình thường
                window.is_study_mode = true; 
                window.is_exam_started = false;
                
                // 2. Tắt radar giám sát chống gian lận
                if (window.proctoring_state) {
                    window.proctoring_state.is_active = false;
                    window.proctoring_state.exam_code = null;
                }
                
                // 3. Xóa sạch tên Đề thi cũ bị kẹt trên giao diện
                window.selected_lessons_text = ""; 
            }
        });
        // Bật camera giám sát màn hình Menu
        observer.observe(step1, { attributes: true, attributeFilter: ['style'] });
    }
})();

// =========================================================================
// 🛠️ ADMIN MODAL: XỬ LÝ SỰ CỐ (V8 - LỌC SẠCH LỚP TỪ ĐẦU, BỘ ĐẾM CHUẨN)
// =========================================================================
window.open_student_control_modal = function(examCode) {
    let modalId = 'student_control_modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    window.current_troubleshoot_filter = 'all';

    let html = `
    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 99999; backdrop-filter: blur(10px); padding: 10px;">
        <div class="glass-panel p-3 shadow-lg d-flex flex-column w-100 animate__animated animate__zoomIn" style="max-width: 550px; border-radius: 20px; background: rgba(15, 23, 42, 0.95) !important; border: 1px solid #0ea5e9;">
            
            <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom" style="border-color: rgba(255,255,255,0.1) !important;">
                <h6 class="fw-bold text-info mb-0" style="font-size: 1.1rem;"><i class="bi bi-shield-lock-fill me-2"></i> QL PHÒNG THI</h6>
                
                <!-- 🌟 NÚT REFRESH ĐƯỢC LÀM TO ĐÙNG, MÀU VÀNG NỔI BẬT -->
                <div class="d-flex gap-3 align-items-center">
                    <button class="btn btn-warning rounded-pill px-4 py-1 fw-bold shadow-lg d-flex align-items-center gap-1" style="border: 2px solid #fff;" onclick="window.fetch_troubleshoot_data('${examCode}')" title="Cập nhật số liệu mới nhất">
                        <i class="bi bi-arrow-clockwise fs-5"></i> LÀM MỚI
                    </button>
                    <button class="btn-close btn-close-white" onclick="document.getElementById('${modalId}').remove()"></button>
                </div>
            </div>

            <div class="d-flex gap-2 mb-2">
                <input type="text" id="ctrl_search_student" class="form-control form-control-sm bg-dark text-white glass-input-style flex-grow-1" placeholder="🔍 Tìm Mã SV, Tên..." onkeyup="window.filter_troubleshoot_students(this.value)">
            </div>
            
            <div class="row g-1 mb-2 p-1 rounded" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); margin: 0;">
                <div class="col-4"><button id="ts_filter_all" class="btn btn-sm w-100 fw-bold text-white shadow-sm py-1" style="font-size: 0.75rem; background: rgba(255,255,255,0.2);" onclick="window.set_troubleshoot_filter('all')">Tất cả (0)</button></div>
                <div class="col-4"><button id="ts_filter_submitted" class="btn btn-sm w-100 fw-bold text-info py-1" style="font-size: 0.75rem; background: transparent;" onclick="window.set_troubleshoot_filter('submitted')">Đã nộp (0)</button></div>
                <div class="col-4"><button id="ts_filter_absent" class="btn btn-sm w-100 fw-bold text-danger py-1" style="font-size: 0.75rem; background: transparent;" onclick="window.set_troubleshoot_filter('absent')">Vắng (0)</button></div>
            </div>

            <div id="troubleshoot_student_list" class="custom-scrollbar mb-3 shadow-inner flex-grow-1" style="height: 400px; overflow-y: auto; overflow-x: hidden; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 5px;">
                <div class="text-center p-3"><span class="spinner-border spinner-border-sm text-info"></span> Đang kết nối rada...</div>
            </div>

            <div class="d-flex align-items-stretch gap-2 mb-1 flex-shrink-0">
                <button class="btn btn-sm btn-outline-success fw-bold flex-fill py-1" onclick="window.admin_unlock_device('${examCode}')" style="font-size: 0.8rem; border-width: 2px;"><i class="bi bi-unlock-fill me-1"></i> Mở Khóa</button>
                <button class="btn btn-sm btn-outline-danger fw-bold flex-fill py-1" onclick="window.admin_toggle_absence('${examCode}', true)" style="font-size: 0.8rem; border-width: 2px;"><i class="bi bi-person-x-fill me-1"></i> Vắng</button>
                <button class="btn btn-sm btn-outline-warning fw-bold flex-fill py-1" onclick="window.admin_toggle_absence('${examCode}', false)" style="font-size: 0.8rem; border-width: 2px;"><i class="bi bi-person-check-fill me-1"></i> Hủy</button>
                <button class="btn btn-sm btn-success fw-bold shadow-sm px-3 flex-shrink-0" onclick="window.export_exam_scores_excel('${examCode}')" title="Xuất Excel theo bộ lọc" style="border-radius: 8px;"><i class="bi bi-file-earmark-excel-fill fs-5"></i></button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    window.fetch_troubleshoot_data(examCode);
};

// [ĐÃ GỠ BẢN TRÙNG] window.fetch_troubleshoot_data (dòng cũ 3914-3958) - bản dùng thật nằm ở phía dưới file

window.render_troubleshoot_list = function(searchQuery) {
    let listContainer = document.getElementById('troubleshoot_student_list');
    if(!listContainer || !window.current_troubleshoot_users) return;

    let q = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let filterType = window.current_troubleshoot_filter || 'all';

    let countAll = window.current_troubleshoot_users.length;
    let countSubmitted = 0, countAbsent = 0;

    window.current_troubleshoot_users.forEach(u => {
        let isAbs = window.current_troubleshoot_absent.includes(u.id);
        let score = window.current_troubleshoot_submitted[u.id];
        if(isAbs) countAbsent++;
        else if(score !== undefined) countSubmitted++;
    });

    let btnAll = document.getElementById('ts_filter_all'); if(btnAll) btnAll.innerText = `Tất cả (${countAll})`;
    let btnSub = document.getElementById('ts_filter_submitted'); if(btnSub) btnSub.innerText = `Đã nộp (${countSubmitted})`;
    let btnAbs = document.getElementById('ts_filter_absent'); if(btnAbs) btnAbs.innerText = `Vắng (${countAbsent})`;

    let filteredUsers = [];
    window.current_troubleshoot_users.forEach(u => {
        let matchStr = (u.rawId + " " + u.name + " " + u.cls).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let isAbs = window.current_troubleshoot_absent.includes(u.id);
        let score = window.current_troubleshoot_submitted[u.id];
        let isSub = (score !== undefined);
        let isStarted = window.current_troubleshoot_started && window.current_troubleshoot_started.includes(u.id);

        let passFilter = true;
        if (filterType === 'absent' && !isAbs) passFilter = false;
        if (filterType === 'submitted' && !isSub) passFilter = false; 

        if (passFilter && (q === "" || matchStr.includes(q))) {
            filteredUsers.push({ ...u, isAbsent: isAbs, isSubmitted: isSub, score: score, isStarted: isStarted });
        }
    });

    filteredUsers.sort((a, b) => a.stt - b.stt);

    let html = '';
    let displayIndex = 1;

    filteredUsers.forEach(u => {
        let statusText = '';
        let warningText = '';
        let bg = 'background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);';
        let safeName = u.name.replace(/'/g, "\\'");
        
        let giftHtml = u.inv > 0 ? `<span class="badge bg-warning text-dark shadow-sm" style="font-size: 0.65rem;"><i class="bi bi-gift-fill"></i> x${u.inv} Quà</span>` : "";
        
        let sync = window.current_troubleshoot_sync[u.id];
        let alertMsg = window.current_troubleshoot_alerts[u.id];

        // 🌟 XỬ LÝ CẢNH BÁO (Tách riêng để đưa xuống dòng 2)
        if (alertMsg && !u.isSubmitted && !u.isAbsent) {
            warningText = `<span class="badge bg-danger text-white shadow-sm animate__animated animate__flash" style="font-size: 0.7rem;"><i class="bi bi-phone-vibrate-fill"></i> Cố tình đổi máy</span>`;
            bg = 'background: rgba(239, 68, 68, 0.2); border: 1px dashed #ef4444;';
        }
        else if (sync && sync.offenses > 0 && !u.isSubmitted && !u.isAbsent) {
            warningText = `<span class="badge bg-danger text-white shadow-sm animate__animated animate__flash" style="font-size: 0.7rem;" title="Tổng thời gian rời: ${sync.away}s"><i class="bi bi-exclamation-triangle-fill"></i> Rời Tab: ${sync.offenses} lần</span>`;
            bg = 'background: rgba(239, 68, 68, 0.2); border: 1px dashed #ef4444;';
        }

        // 🌟 XỬ LÝ TRẠNG THÁI (Đưa xuống dòng 2)
        if (u.isAbsent) {
            statusText = `<span class="text-danger fw-bold" style="font-size: 0.8rem;">[Vắng]</span>`;
            bg = 'background: rgba(239, 68, 68, 0.15); border: 1px dashed #ef4444;';
        } else if (u.isSubmitted) {
            // SỬ DỤNG BIẾN TOÀN CỤC CHUẨN XÁC, KHÔNG QUÉT DOM TEXT NỮA
            let safeExamCode = window.current_troubleshoot_exam || ''; 
            statusText = `<div class="d-flex align-items-center gap-2">
                            <span class="badge" style="background: #0ea5e9; border: 1px solid #38bdf8; font-size: 0.8rem; cursor: pointer; box-shadow: 0 0 10px rgba(14,165,233,0.5);" onclick="event.preventDefault(); window.edit_student_score('${u.id}', '${u.rawId}', '${safeName}', ${u.score}, ${u.inv})">
                                Điểm: ${u.score}đ <i class="bi bi-pencil-square ms-1"></i>
                            </span>
                            <span class="badge bg-danger shadow-sm" style="font-size: 0.8rem; cursor: pointer; border: 1px solid #ef4444;" onclick="event.preventDefault(); window.delete_student_score('${safeExamCode}', '${u.id}', '${safeName}')" title="Xóa điểm cho thi lại">
                                <i class="bi bi-trash3-fill"></i> Xóa
                            </span>
                          </div>`;
            bg = 'background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.3);';
        } else if (u.isStarted) {
            let safeExamCode = window.current_troubleshoot_exam || ''; 
            let statusLabel = '';
            
            if (sync && sync.active === false) {
                 if (sync.disconnected) {
                     statusLabel = `<span class="text-warning fw-bold animate__animated animate__pulse animate__infinite" style="font-size: 0.8rem;"><i class="bi bi-wifi-off me-1"></i> [Tắt tab / Rớt mạng]</span>`;
                 } else {
                     statusLabel = `<span class="text-warning fw-bold animate__animated animate__pulse animate__infinite" style="font-size: 0.8rem;"><i class="bi bi-door-open-fill me-1"></i> [Đã vào nhưng bấm thoát ra]</span>`;
                 }
            } else {
                 statusLabel = `<span class="text-success fw-bold" style="font-size: 0.8rem;"><i class="bi bi-record-circle-fill text-success animate__animated animate__flash animate__infinite animate__slower me-1"></i> [Đang thi]</span>`;
            }
            
            // 🌟 TÍCH HỢP NÚT RESET NGAY CẠNH TRẠNG THÁI (Dùng chung hàm Xóa điểm)
            statusText = `<div class="d-flex align-items-center gap-2">
                            ${statusLabel}
                            <span class="badge bg-secondary shadow-sm" style="font-size: 0.75rem; cursor: pointer; border: 1px solid #64748b;" onclick="event.preventDefault(); window.delete_student_score('${safeExamCode}', '${u.id}', '${safeName}')" title="Reset trạng thái để làm lại từ đầu">
                                <i class="bi bi-arrow-counterclockwise"></i> Reset
                            </span>
                          </div>`;
        } else {
            statusText = `<span class="text-secondary fw-bold" style="font-size: 0.8rem; opacity: 0.7;">[Chưa vào phòng thi]</span>`;
        }

        let displayStt = (filterType === 'submitted' || filterType === 'absent') ? displayIndex++ : u.stt;

        html += `
        <label class="d-flex align-items-start p-2 mb-2 rounded" style="${bg} cursor: pointer; transition: 0.2s;">
            <div class="d-flex align-items-center me-2 flex-shrink-0" style="margin-top: 0.1rem;">
                <span class="text-white-50 fw-bold me-2" style="font-size: 0.8rem; width: 22px; text-align: right;">${displayStt}.</span>
                <input type="checkbox" class="form-check-input troubleshoot-chk" value="${u.rawId}" style="width: 1.1rem; height: 1.1rem; cursor: pointer; margin: 0;">
            </div>
            
            <div class="flex-grow-1" style="line-height: 1.4;">
                <!-- DÒNG 1: THÔNG TIN CÁ NHÂN VÀ LỚP -->
                <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
                    <span class="fw-bold text-white" style="font-size: 0.95rem;">${u.rawId} - ${u.name}</span>
                    <span class="text-warning small fw-bold" style="font-size: 0.75rem;">(Lớp: ${u.cls || 'Chưa phân lớp'})</span>
                    ${giftHtml}
                </div>
                
                <!-- DÒNG 2: TRẠNG THÁI VÀ CẢNH BÁO -->
                <div class="d-flex align-items-center flex-wrap gap-2">
                    ${statusText}
                    ${warningText}
                </div>
            </div>
        </label>`;
    });

    if (html === '') html = `<div class="text-center p-3 text-white-50 small">Không tìm thấy sinh viên trong bộ lọc này.</div>`;
    listContainer.innerHTML = html;
};

window.set_troubleshoot_filter = function(filterType) {
    window.current_troubleshoot_filter = filterType;
    ['all', 'submitted', 'absent'].forEach(f => {
        let btn = document.getElementById('ts_filter_' + f);
        if (btn) {
            if (f === filterType) { btn.style.background = 'rgba(255,255,255,0.2)'; btn.classList.add('text-white', 'shadow-sm'); } 
            else { btn.style.background = 'transparent'; btn.classList.remove('text-white', 'shadow-sm'); }
        }
    });
    window.render_troubleshoot_list(document.getElementById('ctrl_search_student').value);
};

window.edit_student_score = function(studentIdLower, rawId, name, currentScore, invCount) {
    let modalId = 'edit_score_modal';
    let existing = document.getElementById(modalId);
    if(existing) existing.remove();

    let html = `
    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 100000; backdrop-filter: blur(5px);">
        <div class="glass-panel p-4 shadow-lg d-flex flex-column animate__animated animate__zoomIn" style="width: 90%; max-width: 350px; border-radius: 20px; background: rgba(15, 23, 42, 0.95) !important; border: 1px solid #38bdf8;">
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
                <button class="btn btn-secondary flex-fill fw-bold rounded-pill" onclick="document.getElementById('${modalId}').remove()">HỦY</button>
                <button class="btn btn-info flex-fill fw-bold rounded-pill text-white shadow-sm" onclick="window.save_new_score('${studentIdLower}')"><i class="bi bi-check-circle me-1"></i> LƯU ĐIỂM</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    let inputEl = document.getElementById('new_score_input');
    inputEl.focus(); inputEl.select();
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
// 🕷️ TRẠM GÁC REAL-TIME (CÓ CHỨC NĂNG PHỤC HỒI ÁN TÍCH KHI F5 / VÀO LẠI)
// =========================================================================
// =========================================================================
// 🕷️ TRẠM GÁC REAL-TIME BẰNG SUPABASE (CHỐNG GIAN LẬN)
// =========================================================================
(function setup_realtime_proctoring() {
    let is_recovered = false; 
    setInterval(async () => {
        if (window.is_exam_started && window.proctoring_state && window.proctoring_state.exam_code) {
            let storageKey = "CHEAT_LOG_" + window.proctoring_state.exam_code + "_" + window.current_student_id;
            if (!is_recovered) {
                let saved = localStorage.getItem(storageKey);
                if (saved) { try { let p = JSON.parse(saved); window.offense_count = Math.max(window.offense_count || 0, p.offenses); window.away_time_total = Math.max(window.away_time_total || 0, p.away); } catch(e){} }
                is_recovered = true;
            }
            localStorage.setItem(storageKey, JSON.stringify({ offenses: window.offense_count || 0, away: window.away_time_total || 0 }));
            try { 
                await db.from('exam_results').upsert({ exam_code: window.proctoring_state.exam_code, student_id: window.current_student_id, offense_count: window.offense_count || 0, away_time: window.away_time_total || 0 }, { onConflict: 'exam_code,student_id' }); 
            } catch(e) {}
        } else { is_recovered = false; }
    }, 15000); 

    let old_back = window.back_to_subject_select;
    window.back_to_subject_select = async function() {
        if (window.proctoring_state && window.proctoring_state.exam_code && window.is_exam_started) {
            try { 
                await db.from('exam_results').upsert({ exam_code: window.proctoring_state.exam_code, student_id: window.current_student_id, offense_count: window.offense_count || 0, away_time: window.away_time_total || 0 }, { onConflict: 'exam_code,student_id' }); 
            } catch(e) {}
        }
        if (old_back) old_back();
    };

    let old_warn = window.show_cheat_warning_ui;
    window.show_cheat_warning_ui = async function(duration, isExempt) {
        if (old_warn) old_warn(duration, isExempt); 
        if (window.proctoring_state && window.proctoring_state.exam_code && window.is_exam_started) {
            let storageKey = "CHEAT_LOG_" + window.proctoring_state.exam_code + "_" + window.current_student_id;
            localStorage.setItem(storageKey, JSON.stringify({ offenses: window.offense_count || 0, away: window.away_time_total || 0 }));
            try { 
                await db.from('exam_results').upsert({ exam_code: window.proctoring_state.exam_code, student_id: window.current_student_id, offense_count: window.offense_count || 0, away_time: window.away_time_total || 0 }, { onConflict: 'exam_code,student_id' }); 
            } catch(e) {}
        }
    };
})();

// =========================================================================
// 🗑️ HÀM GỌI MÁY CHỦ ĐỂ XÓA ĐIỂM HOẶC RESET TRẠNG THÁI ĐANG THI
// =========================================================================
window.delete_student_score = function(examCode, studentId, studentName) {
    if (!examCode) return window.show_toast("Lỗi: Không tìm thấy Mã Đề!", true);
    
    let modal = document.getElementById('student_control_modal');
    if (!modal) return;
    
    // Tạo Giao diện Confirm tuyệt đẹp, mượt mà (Overlay)
    let confirmHtml = `
    <div id="custom_confirm_overlay" class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.85); z-index: 99999; border-radius: 20px; backdrop-filter: blur(5px);">
        <div class="glass-panel p-4 shadow-lg text-center animate__animated animate__zoomIn" style="max-width: 90%; width: 340px; background: rgba(15, 23, 42, 0.95) !important; border: 1px solid #ef4444; border-radius: 15px;">
            <i class="bi bi-exclamation-triangle-fill text-danger mb-2" style="font-size: 3.5rem;"></i>
            <h6 class="text-white fw-bold">XÁC NHẬN RESET / XÓA BÀI</h6>
            <p class="text-white-50 small mb-4" style="line-height: 1.4;">Hệ thống sẽ dọn sạch trạng thái thi và bài nộp (nếu có) của <b>${studentName}</b>.<br>Sinh viên sẽ được làm lại từ đầu.</p>
            <div class="d-flex gap-2 justify-content-center">
                <button class="btn btn-sm btn-secondary px-4 fw-bold rounded-pill" onclick="document.getElementById('custom_confirm_overlay').remove()">HỦY BỎ</button>
                <button class="btn btn-sm btn-danger px-4 fw-bold rounded-pill" onclick="window.execute_delete_score('${examCode}', '${studentId}')">ĐỒNG Ý</button>
            </div>
        </div>
    </div>`;
    
    let existing = document.getElementById('custom_confirm_overlay');
    if (existing) existing.remove();
    
    let panel = modal.querySelector('.glass-panel');
    panel.style.position = 'relative';
    panel.insertAdjacentHTML('beforeend', confirmHtml);
};

// [ĐÃ GỠ BẢN TRÙNG] window.execute_delete_score (dòng cũ 4280-4314) - bản dùng thật nằm ở phía dưới file

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
// 🚀 SUPABASE ADMIN BACKEND: QUẢN LÝ MÔN HỌC, NGƯỜI DÙNG & ĐỀ THI ONLINE
// =========================================================================

// --- 1. QUẢN LÝ MÔN HỌC ---
window.save_subject_to_sheet = async function(btn) {
    let selectedUI = document.querySelector('input[name="ui_template_opt"]:checked');
    let uiVal = selectedUI ? selectedUI.value : '1'; 
    let data = {
        subject_key: document.getElementById('modal_s_code').value.trim(),
        name: document.getElementById('modal_s_name').value.trim(),
        icon: document.getElementById('modal_s_icon').value.trim() || '📚',
        file_id: document.getElementById('modal_s_fileid').value.trim(),
        sheet_name: document.getElementById('modal_s_sheetname').value.trim(),
        role_access: document.getElementById('modal_s_role').value.trim() || 'all',
        ui_template: uiVal
    };
    if(!data.subject_key || !data.name || !data.file_id || !data.sheet_name) return window.show_toast("⚠️ Vui lòng nhập đủ thông tin!", true);
    
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>...`; btn.classList.add('disabled');
    
    try {
        const { error } = await db.from('subjects').upsert([data], { onConflict: 'subject_key' });
        if (error) throw error;
        window.show_toast("✅ Lưu môn học thành công!");
        window.subjectConfig[data.subject_key] = { id: data.file_id, sheetName: data.sheet_name, role: data.role_access, icon: data.icon, name: data.name, ui_template: data.ui_template };
        document.getElementById('subject_modal').remove(); 
        window.render_subject_management(); 
    } catch (err) {
        window.show_toast("❌ Lỗi: " + err.message, true);
        btn.innerHTML = `<i class="bi bi-save2-fill me-1"></i> LƯU MÔN HỌC`; btn.classList.remove('disabled');
    }
};

window.remove_subject = function(code) {
    window.show_alert("CẢNH BÁO", `Xóa môn học <b class="text-danger">${code}</b> khỏi hệ thống?`, async function(ans) {
        if (!ans) return;
        try {
            const { error } = await db.from('subjects').delete().eq('subject_key', code);
            if (error) throw error;
            window.show_toast("✅ Đã xóa!"); 
            delete window.subjectConfig[code]; 
            window.render_subject_management();
        } catch (err) { window.show_toast("❌ Lỗi: " + err.message, true); }
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
// 🚀 QUẢN LÝ PHÒNG THI ONLINE (TẠO/SỬA/XÓA/LẤY DANH SÁCH) -> KẾT NỐI BẢNG online_exams
// =========================================================================
window.render_exam_management = async function() {
    const container = document.getElementById('dash_subject_cards_container');
    container.innerHTML = `<div class="col-12 text-center p-5"><div class="spinner-border text-warning"></div><div class="mt-2 text-warning fw-bold">Đang tải đề thi Supabase...</div></div>`;
    try {
        const { data: exams, error } = await db.from('online_exams').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        let html = `<div class="col-12 px-1 animate__animated animate__fadeIn mb-3"><div class="d-flex justify-content-between align-items-center bg-dark p-3 rounded-4 shadow-sm w-100" style="background: transparent !important; border: 1px solid rgba(255,255,255,0.1);"><div style="flex: 1;"><button class="btn btn-sm glass-action-btn fw-bold px-3" onclick="window.render_admin_hub()">Thoát</button></div><h6 class="text-white fw-bold mb-0 text-center m-0 text-uppercase flex-grow-1 text-truncate" style="font-size: 0.9rem;">PHÒNG THI TRỰC TUYẾN</h6><div style="flex: 1;"></div></div></div>`;
        if (!exams || exams.length === 0) { html += `<div class="col-12 text-center p-5 mt-4 glass-panel"><i class="bi bi-inbox text-white-50" style="font-size: 3rem;"></i><div class="text-white-50 mt-2 fw-bold">Chưa có đề thi nào.</div></div>`; } 
        else {
            exams.forEach((ex, idx) => {
                let isMo = ex.status === "MỞ" || ex.status === "🟢 MỞ (Thi ngay)";
                let statusBadge = isMo ? `<span class="badge bg-success shadow-sm px-3 py-2"><i class="bi bi-broadcast me-1"></i> ĐANG MỞ</span>` : `<span class="badge bg-secondary shadow-sm px-3 py-2"><i class="bi bi-lock-fill me-1"></i> ĐÃ KHÓA</span>`;
                let statusToggleBtn = isMo ? `<button class="btn btn-sm fw-bold w-100 mb-2 shadow-sm" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444;" onclick="window.toggle_exam_status('${ex.exam_code}', 'ĐÓNG')"><i class="bi bi-x-octagon-fill me-1"></i> KHÓA NGAY</button>` : `<button class="btn btn-sm fw-bold w-100 mb-2 shadow-sm" style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981;" onclick="window.toggle_exam_status('${ex.exam_code}', 'MỞ')"><i class="bi bi-unlock-fill me-1"></i> MỞ PHÒNG</button>`;
                let subjectDisplayName = window.subjectConfig[ex.subject_key] ? window.subjectConfig[ex.subject_key].name : ex.subject_key;
                let safeExStr = encodeURIComponent(JSON.stringify({ 
                    code: ex.exam_code, 
                    name: ex.exam_name, 
                    time: ex.time_limit, 
                    status: ex.status, 
                    pass: ex.password, 
                    users: ex.allowed_users,
                    auto_open: ex.auto_open, 
                    auto_close: ex.auto_close 
                }));

                html += `<div class="col-12 px-1 mb-3 animate__animated animate__fadeInUp" style="animation-delay: ${idx * 0.05}s;"><div class="card glass-panel p-3 shadow-sm border-start border-3 ${isMo ? 'border-success' : 'border-secondary'}"><div class="d-flex flex-column flex-md-row justify-content-between gap-3"><div class="flex-grow-1"><div class="d-flex align-items-center gap-3 mb-2"><span class="badge bg-dark border font-monospace text-warning shadow-sm" style="font-size: 0.85rem;">${ex.exam_code}</span>${statusBadge}</div><h6 class="fw-bold text-white mb-1" style="font-size: 1.05rem;">${ex.exam_name}</h6><div class="text-white-50 small d-flex flex-wrap gap-3 mb-1" style="font-size: 0.8rem;"><span><i class="bi bi-book"></i> Môn: <b class="text-light">${subjectDisplayName}</b></span><span><i class="bi bi-clock-history text-warning"></i> Thời gian: <b>${ex.time_limit} phút</b></span></div></div><div class="d-flex flex-row flex-md-column gap-2 flex-shrink-0" style="min-width: 150px;">${statusToggleBtn}<button class="btn btn-sm fw-bold w-100 mb-1 shadow-sm" style="background: rgba(14, 165, 233, 0.2); border: 1px solid #0ea5e9; color: #38bdf8;" onclick="window.open_student_control_modal('${ex.exam_code}')"><i class="bi bi-person-gear me-1"></i> XỬ LÝ SỰ CỐ</button><div class="d-flex gap-2"><button class="btn btn-sm glass-action-btn text-warning w-100 fw-bold shadow-sm" onclick="window.open_edit_exam_modal('${safeExStr}')"><i class="bi bi-pencil-square"></i> SỬA</button><button class="btn btn-sm glass-action-btn text-danger w-100 fw-bold shadow-sm" onclick="window.delete_online_exam('${ex.exam_code}', '${ex.exam_name}')"><i class="bi bi-trash3"></i> XÓA</button></div></div></div></div></div>`;
            });
        }
        container.innerHTML = html;
    } catch(err) { container.innerHTML = `<div class="text-danger p-5 text-center">Lỗi tải đề: ${err.message}</div>`; }
};
// 🌟 Đổi giá trị <input type="datetime-local"> (giờ máy, không offset) sang ISO UTC
// chuẩn để lưu vào cột timestamptz — tránh lệch múi giờ khi so sánh auto_open/auto_close.
window.dtlocal_to_iso = function(v) {
    if (!v) return null;
    let d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
};

window.submit_online_exam_to_server = async function() {
    let code = document.getElementById('create_ex_code').value.trim();
    let time = document.getElementById('create_ex_time').value.trim();
    let name = document.getElementById('create_ex_name').value.trim();
    let btn = document.getElementById('btn_submit_online_exam');

    if (!code || !time || !name) return window.show_toast("⚠️ Vui lòng nhập đủ: Mã đề, Tên kỳ thi và Thời gian!", true);
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ĐANG LƯU...`; btn.classList.add('disabled');

    // Gom dữ liệu Tích Chọn Lớp
    let selectedRoles = [];
    document.querySelectorAll('.create_ex-user-chk:checked').forEach(chk => selectedRoles.push(chk.value));
    let specificStr = document.getElementById('create_ex_specific_users').value.trim();
    if (specificStr) selectedRoles.push(specificStr);

    // Xử lý jsonb
    let cleanQuestions = window.temp_online_exam_questions.map(q => ({
        id: q.id, type: q.type, q: q.q, opts: q.opts ? q.opts : [q.opta, q.optb, q.optc, q.optd], a: q.a || q.answer, image: q.image || "", hint: q.hint || ""
    }));

    let payload = {
        exam_code: code, subject_key: window.current_subject, exam_name: name,
        time_limit: parseInt(time), status: document.getElementById('create_ex_status').value, 
        password: document.getElementById('create_ex_pass').value.trim(),
        questions_json: cleanQuestions, // Dạng mảng chuẩn cho cột jsonb
        allowed_users: selectedRoles.join(", "),
        auto_open: window.dtlocal_to_iso(document.getElementById('create_ex_open').value),
        auto_close: window.dtlocal_to_iso(document.getElementById('create_ex_close').value)
    };

    try {
        const { error } = await db.from('online_exams').insert([payload]);
        if (error) throw error;
        window.show_toast("🎉 Đã phát hành Đề thi lên Supabase!"); 
        document.getElementById('online_exam_modal').remove(); window.render_exam_management();
    } catch(err) { window.show_toast("❌ Lỗi: " + err.message, true); btn.innerHTML = `LƯU ĐỀ THI`; btn.classList.remove('disabled'); }
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
// ─── 3. QUẢN LÝ ĐIỂM THI VÀ SỰ CỐ (TROUBLESHOOT) -> KẾT NỐI BẢNG exam_results ───
window.fetch_troubleshoot_data = async function(examCode) {
    window.current_troubleshoot_exam = examCode; 
    let listContainer = document.getElementById('troubleshoot_student_list');
    if(listContainer) listContainer.innerHTML = `<div class="text-center p-3 mt-4"><span class="spinner-border text-info"></span><div class="text-info fw-bold mt-2">Đang tải dữ liệu phòng thi từ Supabase...</div></div>`;

    try {
        // 🌟 1. LẤY THÔNG TIN ĐỀ THI TỪ BẢNG 'online_exams' (Bốc lớp được thi và danh sách vắng)
        const { data: examData, error: errExam } = await db.from('online_exams')
            .select('allowed_users, absent_list')
            .eq('exam_code', examCode)
            .single();
        if (errExam) throw errExam;

        // Xử lý bộ lọc "Ai được thi"
        let allowedStr = examData ? (examData.allowed_users || "") : ""; 
        let allowedArr = allowedStr.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== "");
        let isAllAllowed = allowedArr.includes('all'); // Nếu có 'all' thì mới hiện toàn trường

        // Xử lý danh sách vắng (lưu dạng chuỗi text trong Supabase)
        let absentStr = examData ? (examData.absent_list || "") : "";
        window.current_troubleshoot_absent = absentStr.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== "");

        // 🌟 2. LẤY DANH SÁCH USER TỪ BẢNG 'users'
        const { data: allUsers, error: errUsers } = await db.from('users')
            .select('student_id, full_name, role, class_code, inventory');
        if (errUsers) throw errUsers;

        // 🌟 3. LẤY KẾT QUẢ ĐÃ NỘP TỪ BẢNG 'exam_results'
        const { data: results, error: errResults } = await db.from('exam_results')
            .select('student_id, score, is_submitted')
            .eq('exam_code', examCode);
        if (errResults) throw errResults;

        // 🌟 4. LẤY ÁN TÍCH GIAN LẬN TỪ BẢNG 'study_logs' (Chế độ thi thật)
        const { data: logs, error: errLogs } = await db.from('study_logs')
            .select('student_id, offense_count, away_time, logout_time')
            .eq('lesson_name', examCode)
            .eq('mode', 'THI THẬT');
        if (errLogs) throw errLogs;

        let filteredClassUsers = [];
        let sttCounter = 1; 

        // 🌟 5. BỘ LỌC CỐT LÕI: Lọc người dùng hợp lệ
        allUsers.forEach(u => {
            let uCls = (u.class_code || u.role || '').toLowerCase();
            let uId = u.student_id.toLowerCase();

            // Ráp điều kiện: Trùng chữ 'all' HOẶC trùng Lớp HOẶC trùng Mã SV
            if (isAllAllowed || allowedArr.includes(uCls) || allowedArr.includes(uId)) {
                filteredClassUsers.push({ 
                    rawId: u.student_id, 
                    id: u.student_id.toLowerCase(), 
                    name: u.full_name || 'Chưa cập nhật', 
                    cls: u.class_code || u.role || '', 
                    inv: u.inventory || 0, 
                    stt: sttCounter++ 
                });
            }
        });

        // 🌟 6. ĐỔ DỮ LIỆU VÀO CÁC BIẾN CỦA GIAO DIỆN
        window.current_troubleshoot_users = filteredClassUsers; 
        
        window.current_troubleshoot_submitted = {};
        window.current_troubleshoot_started = [];
        
        // Quét những em đã nộp bài
        if (results) {
            results.forEach(r => {
                let sId = r.student_id.toLowerCase();
                window.current_troubleshoot_started.push(sId);
                if (r.is_submitted) {
                    window.current_troubleshoot_submitted[sId] = r.score;
                }
            });
        }
        
        window.current_troubleshoot_sync = {}; 
        window.current_troubleshoot_alerts = {};
        
        // Quét những em vi phạm, rời tab (lấy từ study_logs)
        if (logs) {
            logs.forEach(log => {
                let sId = log.student_id.toLowerCase();
                window.current_troubleshoot_sync[sId] = {
                    offenses: log.offense_count || 0,
                    away: log.away_time || 0,
                    active: !log.logout_time // Nếu chưa có giờ logout thì tính là đang online làm bài
                };
            });
        }
        
        // 🌟 7. RENDER RA MÀN HÌNH CHÍNH THỨC
        let searchInput = document.getElementById('ctrl_search_student');
        window.render_troubleshoot_list(searchInput ? searchInput.value : ""); 
        
    } catch(err) {
        if(listContainer) listContainer.innerHTML = `<div class="text-danger p-3 text-center fw-bold">LỖI SUPABASE: ${err.message}</div>`;
        console.error(err);
    }
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
        for (let id of chkIds) {
            await db.from('exam_results').upsert({ exam_code: examCode, student_id: id, is_absent: isAbsent }, { onConflict: 'exam_code,student_id' });
        }
        window.show_toast("✅ Cập nhật trạng thái thành công!");
        document.getElementById('student_control_modal').remove();
    } catch(e) { window.show_toast("❌ Lỗi: " + e.message, true); }
};

window.admin_unlock_device = async function(examCode) {
    let chkIds = Array.from(document.querySelectorAll('.troubleshoot-chk:checked')).map(chk => chk.value.toLowerCase());
    if(chkIds.length === 0) return window.show_toast("⚠️ Vui lòng tick chọn sinh viên!", true);
    try {
        for (let id of chkIds) {
            await db.from('exam_results').upsert({ exam_code: examCode, student_id: id, is_locked: false }, { onConflict: 'exam_code,student_id' });
        }
        window.show_toast("✅ Đã mở khóa thiết bị!");
        document.getElementById('student_control_modal').remove();
    } catch(e) { window.show_toast("❌ Lỗi: " + e.message, true); }
};

// =========================================================================
// 🛠️ HỆ THỐNG POPUP XÁC NHẬN (TỰ ĐỘNG TẠO DOM NẾU CHƯA CÓ)
// =========================================================================

window.show_alert = function(title, message, callback) {
    let modal = document.getElementById('custom_confirm'); 
    
    // TỰ ĐỘNG SINH DOM NẾU BỊ THIẾU
    if (!modal) {
        let mHtml = `
        <div id="custom_confirm" class="custom-modal animate__animated animate__fadeIn" style="display:none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 999999; justify-content: center; align-items: center; backdrop-filter: blur(5px);">
          <div class="glass-panel p-4 text-center shadow-lg" style="max-width: 350px; width: 90%; border-radius: 20px; background: rgba(15, 23, 42, 0.95); border: 1px solid #38bdf8;">
            <div class="mb-3"><i class="bi bi-exclamation-triangle-fill" style="font-size: 3.5rem; color: #f59e0b; filter: drop-shadow(0 0 10px rgba(245,158,11,0.5));"></i></div>
            <h5 class="fw-bold text-white mt-2 modal-title-txt"></h5>
            <div class="text-white-50 px-2 mb-4 modal-msg-txt" style="font-size: 0.9rem; line-height: 1.5;"></div>
            <div class="d-flex gap-3 mt-2 footer-btn"></div>
          </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', mHtml);
        modal = document.getElementById('custom_confirm');
    }
    
    // ĐIỀN DỮ LIỆU
    modal.querySelector('.modal-title-txt').innerText = title; 
    modal.querySelector('.modal-msg-txt').innerHTML = message; // Dùng innerHTML để hỗ trợ thẻ <br>, <b>
    
    const footer = modal.querySelector('.footer-btn');
    if (callback) { 
        footer.innerHTML = `
            <button class="btn btn-secondary fw-bold" onclick="window.close_confirm(false)" style="flex:1; border-radius: 12px;">HỦY BỎ</button>
            <button class="btn btn-info text-white fw-bold shadow-sm" onclick="window.close_confirm(true)" style="flex:1; border-radius: 12px;">XÁC NHẬN</button>`; 
        window.confirmCallback = callback; 
    } else { 
        footer.innerHTML = `
            <button class="btn btn-info text-white fw-bold w-100 shadow-sm" onclick="window.close_confirm(false)" style="border-radius: 12px;">ĐÃ HIỂU</button>`; 
        window.confirmCallback = null; 
    }
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
        <div id="custom_prompt_modal" class="custom-modal animate__animated animate__fadeIn" style="display:none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 999999; justify-content: center; align-items: center; backdrop-filter: blur(5px);">
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
        <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2" style="border-color: rgba(255,255,255,0.1) !important;">
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
    <div id="interaction_selector_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.8); z-index: 27000; backdrop-filter: blur(10px);">
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
    <div id="migration_modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style="background: rgba(0,0,0,0.9); z-index: 99999; backdrop-filter: blur(10px);">
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