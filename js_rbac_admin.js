// =========================================================================
// 🛡️ TRUNG TÂM QUẢN TRỊ & PHÂN QUYỀN CHI TIẾT (RBAC STUDIO V3 - KIẾN TRÚC 2 TẦNG)
// 1. Tầng Role (Role Templates): Thiết lập quyền gốc cho từng Role & Tạo Role mới.
// 2. Tầng Cá nhân (User Overrides): Kế thừa quyền từ Role gốc + Tinh chỉnh riêng từng người.
// 3. UI Siêu gọn: Bộ lọc tầng 1 hàng kiểu Nhật ký, Lưới quyền 2 cột, Ẩn 100% thanh kéo.
// =========================================================================

window._rbacUsersCache = [];
window._rbacSelectedUser = null;
window._rbacStudioMode = 'users'; // 'users' (Tinh chỉnh cá nhân) | 'roles' (Cấu hình Role gốc)
window._rbacSelectedRoleKey = 'teacher';

// 1. DANH MỤC 24 QUYỀN HẠN CHI TIẾT (TÊN NGẮN GỌN, KHOA HỌC)
window.RBAC_PERMISSION_DEFINITIONS = {
    bank_group: {
        title: '📚 1. Ngân hàng Câu hỏi & Học phần',
        colorClass: 'text-info',
        forRoles: ['admin', 'teacher', 'custom'],
        items: [
            { key: 'bank_view_questions', icon: 'bi-eye-fill text-info', title: 'Xem kho câu hỏi & Đáp án', desc: 'Xem toàn bộ câu hỏi, đáp án đúng và lời giải' },
            { key: 'bank_add_edit_questions', icon: 'bi-pencil-square text-warning', title: 'Soạn & Sửa câu hỏi', desc: 'Thêm mới, sửa câu hỏi, MathJax, Magic Vocab' },
            { key: 'bank_import_export_tsv', icon: 'bi-file-earmark-spreadsheet-fill text-success', title: 'Nhập / Xuất lô TSV-Excel', desc: 'Nạp hàng loạt câu hỏi từ Excel/Sheets' },
            { key: 'bank_delete_questions', icon: 'bi-trash3-fill text-danger', title: 'Xóa câu hỏi & Bài học', desc: 'Xóa câu hỏi hoặc dọn dẹp bài học trong môn' },
            { key: 'bank_config_bloom', icon: 'bi-diagram-3-fill text-primary', title: 'Cài đặt Ma trận Bloom', desc: 'Thiết lập tỷ lệ Nhớ - Hiểu - Vận dụng' }
        ]
    },
    exam_group: {
        title: '📡 2. Tổ chức Thi, Radar & Xuất Đề Giấy',
        colorClass: 'text-warning',
        forRoles: ['admin', 'teacher', 'proctor', 'custom'],
        items: [
            { key: 'exam_create_and_config', icon: 'bi-plus-circle-dotted text-info', title: 'Tạo & Cấu hình Phòng thi', desc: 'Tạo mã đề, đặt giờ, mật khẩu, đối tượng thi' },
            { key: 'exam_toggle_open_close', icon: 'bi-power text-danger', title: 'Đóng / Mở khóa Phòng thi', desc: 'Mở khóa hoặc đóng khẩn cấp phòng thi' },
            { key: 'exam_monitor_live_radar', icon: 'bi-radar text-warning', title: 'Giám sát Radar & Điểm danh', desc: 'Theo dõi rời tab, mất mạng, tiến độ làm bài' },
            { key: 'exam_force_submit_reset', icon: 'bi-shield-exclamation text-danger', title: 'Thu nháp / Cho thi lại / Cộng giờ', desc: 'Thu bài từ xa, mở khóa vi phạm, reset lượt' },
            { key: 'exam_export_word_pdf', icon: 'bi-file-earmark-word-fill text-primary', title: 'Xuất Đề & Tờ Bài Làm (DOC/PDF)', desc: 'Trộn mã đề, xuất phách kép & phiếu OMR' },
            { key: 'exam_quick_grade_paper', icon: 'bi-lightning-charge-fill text-warning', title: 'Chấm nhanh bài giấy & Sửa điểm', desc: 'Chấm phiếu giấy siêu tốc & cập nhật điểm' },
            { key: 'exam_export_score_excel', icon: 'bi-file-earmark-excel-fill text-success', title: 'Xem & Xuất Bảng điểm Excel', desc: 'Tải bảng điểm và xem thống kê phổ điểm' }
        ]
    },
    system_group: {
        title: '⚙️ 3. Quản trị Hệ thống & Tuyển sinh',
        colorClass: 'text-danger',
        forRoles: ['admin', 'teacher', 'custom'],
        items: [
            { key: 'sys_manage_subjects', icon: 'bi-collection-fill text-info', title: 'Quản lý Danh mục Môn & Sheets', desc: 'Cấu hình mã môn, ID Google Sheets, giao diện' },
            { key: 'sys_manage_users_classes', icon: 'bi-people-fill text-success', title: 'Quản lý Danh bạ & Lớp học', desc: 'Thêm/sửa/xóa SV từ Excel, gán mã lớp' },
            { key: 'sys_manage_rbac', icon: 'bi-person-lock text-danger', title: 'Quản trị Phân quyền (RBAC)', desc: 'Thay đổi Role và cấp quyền cho tài khoản khác' },
            { key: 'sys_manage_admissions', icon: 'bi-person-plus-fill text-warning', title: 'Quản lý & Phân tích Tuyển sinh', desc: 'Theo dõi nguồn thí sinh và báo cáo tuyển sinh' },
            { key: 'sys_view_server_logs', icon: 'bi-journal-text text-info', title: 'Tra cứu Nhật ký Hệ thống (Log IP)', desc: 'Xem lịch sử đăng nhập, IP và thiết bị' },
            { key: 'sys_manage_inventory_gifts', icon: 'bi-gift-fill text-danger', title: 'Cấp / Thu hồi Quà tặng (🎁)', desc: 'Điều chỉnh hộp quà chăm chỉ (inventory)' }
        ]
    },
    student_group: {
        title: '🎓 4. Quyền Học tập & Dự thi (Sinh viên)',
        colorClass: 'text-success',
        forRoles: ['k12', 'custom'],
        items: [
            { key: 'student_can_practice', icon: 'bi-journal-check text-info', title: 'Ôn tập tự do (Luôn hiện điểm & giải thích)', desc: 'Truy cập kho bài học tự luyện tập và xem ngay điểm + lời giải khi ôn tập' },
            { key: 'student_can_take_exam', icon: 'bi-pencil-square text-warning', title: 'Tham gia Kỳ thi chính thức (Phòng thi)', desc: 'Đăng nhập mã đề và làm bài trong các phòng thi Online đang mở' },
            { key: 'student_view_exam_score', icon: 'bi-eye-slash-fill text-danger', title: 'Xem điểm ngay khi nộp bài THI THẬT', desc: 'MẶC ĐỊNH TẮT: Khi tắt, nộp bài thi thật chỉ báo Đã nộp, bảo mật điểm số' },
            { key: 'student_view_exam_explain', icon: 'bi-shield-lock-fill text-danger', title: 'Xem đáp án đúng/sai đề THI THẬT', desc: 'MẶC ĐỊNH TẮT: Chặn sinh viên xem lại câu hỏi và đáp án của đề thi chính thức' },
            { key: 'student_use_gift_shop', icon: 'bi-gift-fill text-warning', title: 'Nhận Quà chăm chỉ & Túi đồ (🎁)', desc: 'Tích lũy hộp quà khi ôn tập vượt mốc điểm và mở vật phẩm sưu tầm' },
            { key: 'student_view_leaderboard', icon: 'bi-trophy-fill text-success', title: 'Xem Bảng xếp hạng chuyên cần', desc: 'Theo dõi thứ hạng ôn tập và lịch sử tiến bộ của bản thân' }
        ]
    }
};

// 2. KHỞI TẠO KHUNG QUYỀN GỐC CHO TỪNG ROLE (MẶC ĐỊNH TẮT XEM ĐIỂM & ĐÁP ÁN KHI THI THẬT ĐỐI VỚI SINH VIÊN)
window.DEFAULT_RBAC_ROLE_TEMPLATES = {
    admin: {
        roleKey: 'admin',
        label: '👑 Quản trị viên (Admin)',
        badgeClass: 'bg-danger text-white',
        groupType: 'staff',
        legacyPermText: 'all',
        permissions: {
            bank_view_questions: true, bank_add_edit_questions: true, bank_import_export_tsv: true, bank_delete_questions: true, bank_config_bloom: true,
            exam_create_and_config: true, exam_toggle_open_close: true, exam_monitor_live_radar: true, exam_force_submit_reset: true, exam_export_word_pdf: true, exam_quick_grade_paper: true, exam_export_score_excel: true,
            sys_manage_subjects: true, sys_manage_users_classes: true, sys_manage_rbac: true, sys_manage_admissions: true, sys_view_server_logs: true, sys_manage_inventory_gifts: true,
            student_can_practice: true, student_can_take_exam: true, student_view_exam_score: true, student_view_exam_explain: true, student_use_gift_shop: true, student_view_leaderboard: true
        }
    },
    teacher: {
        roleKey: 'teacher',
        label: '👨‍🏫 Giảng viên (Teacher)',
        badgeClass: 'bg-info text-dark',
        groupType: 'staff',
        legacyPermText: 'banks,exams,stats',
        permissions: {
            bank_view_questions: true, bank_add_edit_questions: true, bank_import_export_tsv: true, bank_delete_questions: false, bank_config_bloom: true,
            exam_create_and_config: true, exam_toggle_open_close: true, exam_monitor_live_radar: true, exam_force_submit_reset: true, exam_export_word_pdf: true, exam_quick_grade_paper: true, exam_export_score_excel: true,
            sys_manage_subjects: false, sys_manage_users_classes: false, sys_manage_rbac: false, sys_manage_admissions: false, sys_view_server_logs: true, sys_manage_inventory_gifts: false,
            student_can_practice: true, student_can_take_exam: true, student_view_exam_score: true, student_view_exam_explain: true, student_use_gift_shop: true, student_view_leaderboard: true
        }
    },
    proctor: {
        roleKey: 'proctor',
        label: '🛡️ Cán bộ coi thi (Proctor)',
        badgeClass: 'bg-warning text-dark',
        groupType: 'proctor',
        legacyPermText: 'exams',
        permissions: {
            bank_view_questions: false, bank_add_edit_questions: false, bank_import_export_tsv: false, bank_delete_questions: false, bank_config_bloom: false,
            exam_create_and_config: false, exam_toggle_open_close: true, exam_monitor_live_radar: true, exam_force_submit_reset: true, exam_export_word_pdf: false, exam_quick_grade_paper: true, exam_export_score_excel: true,
            sys_manage_subjects: false, sys_manage_users_classes: false, sys_manage_rbac: false, sys_manage_admissions: false, sys_view_server_logs: true, sys_manage_inventory_gifts: false,
            student_can_practice: false, student_can_take_exam: false, student_view_exam_score: false, student_view_exam_explain: false, student_use_gift_shop: false, student_view_leaderboard: false
        }
    },
    k12: {
        roleKey: 'k12',
        label: '🎓 Sinh viên (k12)',
        badgeClass: 'bg-success text-white',
        groupType: 'student',
        legacyPermText: '',
        permissions: {
            bank_view_questions: false, bank_add_edit_questions: false, bank_import_export_tsv: false, bank_delete_questions: false, bank_config_bloom: false,
            exam_create_and_config: false, exam_toggle_open_close: false, exam_monitor_live_radar: false, exam_force_submit_reset: false, exam_export_word_pdf: false, exam_quick_grade_paper: false, exam_export_score_excel: false,
            sys_manage_subjects: false, sys_manage_users_classes: false, sys_manage_rbac: false, sys_manage_admissions: false, sys_view_server_logs: false, sys_manage_inventory_gifts: false,
            // CHUẨN AN TOÀN KHẢO THÍ: Ôn tập = true, Dự thi = true, nhưng Xem điểm Thi thật = false & Xem đáp án Thi thật = false
            student_can_practice: true,
            student_can_take_exam: true,
            student_view_exam_score: false,
            student_view_exam_explain: false,
            student_use_gift_shop: true,
            student_view_leaderboard: true
        }
    }
};

// Hàm nạp cấu hình Role Templates (Hợp nhất sâu với DEFAULT_RBAC_ROLE_TEMPLATES để tránh kẹt khóa cũ)
window.load_rbac_role_templates = function() {
    let baseDefaults = JSON.parse(JSON.stringify(window.DEFAULT_RBAC_ROLE_TEMPLATES));
    let saved = {};
    try {
        let raw = localStorage.getItem('app_rbac_role_templates_v4');
        if (raw) saved = JSON.parse(raw);
    } catch (e) {}

    window.RBAC_ROLE_PRESETS = {};
    // Gộp cả các Role gốc và các Role mới do người dùng tự tạo
    let allRoleKeys = new Set([...Object.keys(baseDefaults), ...Object.keys(saved)]);
    allRoleKeys.forEach(rKey => {
        if (baseDefaults[rKey] && saved[rKey]) {
            window.RBAC_ROLE_PRESETS[rKey] = Object.assign({}, baseDefaults[rKey], saved[rKey], {
                permissions: Object.assign({}, baseDefaults[rKey].permissions, saved[rKey].permissions || {})
            });
        } else {
            window.RBAC_ROLE_PRESETS[rKey] = saved[rKey] || baseDefaults[rKey];
        }
    });
    return window.RBAC_ROLE_PRESETS;
};
window.load_rbac_role_templates();

window.save_rbac_role_templates_to_storage = function() {
    try {
        localStorage.setItem('app_rbac_role_templates_v4', JSON.stringify(window.RBAC_ROLE_PRESETS));
    } catch (e) {}
};

// Tự động tính chuỗi legacyPermText ('all' hoặc 'banks,exams,stats...') từ bộ công tắc quyền
window.compute_legacy_perm_string = function(roleKey, permsObj) {
    if (roleKey === 'k12') return '';
    if (roleKey === 'admin') return 'all';
    let p = permsObj || {};
    let tags = [];
    if (p.bank_view_questions || p.bank_add_edit_questions || p.bank_import_export_tsv) tags.push('banks');
    if (p.exam_create_and_config || p.exam_monitor_live_radar || p.exam_export_word_pdf) tags.push('exams');
    if (p.sys_manage_subjects) tags.push('subjects');
    if (p.sys_manage_users_classes || p.sys_manage_rbac) tags.push('users');
    if (p.sys_manage_admissions) tags.push('admissions');
    if (p.exam_export_score_excel || p.sys_view_server_logs) tags.push('stats');
    return tags.join(',');
};

// 3. NHẬN DIỆN VAI TRÒ CHÍNH XÁC TỪ DÒNG DỮ LIỆU BẢNG public.users
window.detect_accurate_user_role = function(row) {
    if (!row) return 'k12';
    let r = String(row.role || '').trim();
    let rLow = r.toLowerCase();
    let p = String(row.permissions || '').trim().toLowerCase();
    let sid = String(row.student_id || '').trim().toLowerCase();

    let rbacRole = '';
    if (row.rbac_config && typeof row.rbac_config === 'object' && row.rbac_config.role) {
        rbacRole = String(row.rbac_config.role).trim();
    }

    if (rbacRole && window.RBAC_ROLE_PRESETS[rbacRole]) return rbacRole;
    if (r && window.RBAC_ROLE_PRESETS[r] && rLow !== 'k12') return r;
    if (rLow && window.RBAC_ROLE_PRESETS[rLow] && rLow !== 'k12') return rLow;

    if (
        rLow.includes('admin') || rLow === 'super_admin' || rLow === 'quan_tri' || rLow === 'root' ||
        sid === 'admin' || sid.startsWith('admin_') ||
        p === 'all' || p.includes('all') || (p.includes('users') && p.includes('subjects'))
    ) {
        return 'admin';
    }

    if (rLow.includes('proctor') || rLow.includes('coithi') || rLow.includes('coi_thi') || rLow.includes('tro_giang')) {
        return 'proctor';
    }

    if (
        rLow.includes('teacher') || rLow.includes('gv') || rLow.includes('giang') || rLow.includes('lecturer') || rLow.includes('mod') || rLow.includes('sub') ||
        sid.startsWith('gv') ||
        (p !== '' && p !== 'none' && !p.startsWith('{') && (p.includes('bank') || p.includes('exam') || p.includes('stat') || p.includes('admission')))
    ) {
        return 'teacher';
    }

    return 'k12';
};

// Chuẩn hóa dòng user: Lọc lấy ĐÚNG những quyền khác với Role cơ bản để đưa vào overrides
window.normalize_user_row_for_rbac = function(row) {
    if (!row) return null;
    let normRole = window.detect_accurate_user_role(row);
    let preset = window.RBAC_ROLE_PRESETS[normRole] || window.RBAC_ROLE_PRESETS.k12;
    let baseRolePerms = preset.permissions || {};

    let parsedRbac = {};
    if (row.rbac_config && typeof row.rbac_config === 'object') {
        parsedRbac = row.rbac_config;
    } else if (typeof row.rbac_config === 'string' && row.rbac_config.trim().startsWith('{')) {
        try { parsedRbac = JSON.parse(row.rbac_config); } catch (e) {}
    }

    // CHỈ giữ lại những khóa trong overrides thực sự tồn tại trong hệ thống và KHÁC với quyền gốc của Role
    let rawOverrides = (parsedRbac.overrides && typeof parsedRbac.overrides === 'object') ? parsedRbac.overrides : {};
    let cleanOverrides = {};
    Object.keys(rawOverrides).forEach(k => {
        if (k in baseRolePerms && Boolean(rawOverrides[k]) !== Boolean(baseRolePerms[k])) {
            cleanOverrides[k] = Boolean(rawOverrides[k]);
        }
    });

    let hasCustomOverrides = Object.keys(cleanOverrides).length > 0;
    let finalPerms = Object.assign({}, baseRolePerms, cleanOverrides);

    let defaultSubjs = (normRole === 'admin') ? ['ALL'] : [];
    let rawSubjs = Array.isArray(row.assigned_subjects)
        ? row.assigned_subjects
        : (Array.isArray(parsedRbac.assigned_subjects) ? parsedRbac.assigned_subjects : defaultSubjs);

    if (normRole === 'k12' && rawSubjs.length === 1 && rawSubjs[0] === 'ALL' && !parsedRbac.explicit_student_all) {
        rawSubjs = [];
    }

    return {
        student_id: String(row.student_id || '').trim(),
        password: row.password || '123',
        full_name: row.full_name || '',
        role: normRole,
        class_code: row.class_code || '',
        nganh_hoc: row.nganh_hoc || '',
        khoa_hoc: row.khoa_hoc || '',
        inventory: row.inventory || 0,
        status: row.status || parsedRbac.status || 'active',
        permissions_text: (row.permissions && !String(row.permissions).trim().startsWith('{')) ? row.permissions : (preset.legacyPermText || ''),
        assigned_subjects: rawSubjs,
        overrides: cleanOverrides,
        hasCustomOverrides: hasCustomOverrides,
        permissions: finalPerms
    };
};

// 4. HÀM KIỂM TRA QUYỀN TOÀN CỤC & HÀM BẢO VỆ ĐIỂM THI THẬT
window.has_permission = function(permKey, subjectKey = null) {
    let curUser = window.current_rbac_profile || null;
    if (!curUser) return true;
    if (curUser.status === 'locked') {
        window.show_toast("🔒 Tài khoản của bạn đang tạm khóa!", true);
        return false;
    }
    if (curUser.role === 'admin') return true;

    if (subjectKey && Array.isArray(curUser.assigned_subjects) && curUser.assigned_subjects.length > 0) {
        if (!curUser.assigned_subjects.includes('ALL') && !curUser.assigned_subjects.includes(subjectKey)) {
            window.show_toast(`⛔ Bạn không được phân quyền phụ trách học phần "${subjectKey}"!`, true);
            return false;
        }
    }

    // Luôn lấy Quyền gốc của Role + Quyền tinh chỉnh riêng (clean overrides)
    let rolePreset = window.RBAC_ROLE_PRESETS[curUser.role] || window.RBAC_ROLE_PRESETS.k12;
    let effectivePerms = Object.assign({}, rolePreset.permissions, curUser.overrides || {});

    if (effectivePerms[permKey] === false) {
        window.show_toast("⛔ Tài khoản của bạn chưa được cấp quyền thực hiện thao tác này!", true);
        return false;
    }
    return true;
};

// Hàm chuyên dụng kiểm tra xem Sinh viên có được thấy Điểm & Đáp án sau khi nộp bài hay không
// - Khi Ôn tập (isOfficialExam = false): LUÔN TRẢ VỀ TRUE để sinh viên tự học.
// - Khi Thi thật (isOfficialExam = true): MẶC ĐỊNH TRẢ VỀ FALSE (Trừ khi Role hoặc Phòng thi bật rõ ràng).
window.can_student_view_result_after_submit = function(isOfficialExam = false, examRoomConfig = null) {
    if (!isOfficialExam) {
        return { showScore: true, showExplain: true };
    }

    let curUser = window.current_rbac_profile || null;
    if (curUser && (curUser.role === 'admin' || curUser.role === 'teacher')) {
        return { showScore: true, showExplain: true };
    }

    let rolePreset = window.RBAC_ROLE_PRESETS[curUser?.role || 'k12'] || window.RBAC_ROLE_PRESETS.k12;
    let effectivePerms = Object.assign({}, rolePreset.permissions, curUser?.overrides || {});

    let roomAllowScore = examRoomConfig && (examRoomConfig.show_score === true || examRoomConfig.allow_view_score === true);
    let roomAllowExplain = examRoomConfig && (examRoomConfig.show_explain === true || examRoomConfig.allow_review === true);

    return {
        showScore: Boolean(roomAllowScore || effectivePerms.student_view_exam_score === true),
        showExplain: Boolean(roomAllowExplain || effectivePerms.student_view_exam_explain === true)
    };
};

// 5. MỞ GIAO DIỆN TRUNG TÂM PHÂN QUYỀN (RBAC STUDIO V3 - ẨN TẤT CẢ THANH KÉO)
window.open_rbac_permission_studio = async function() {
    window.load_rbac_role_templates();
    let modalId = 'rbac_permission_studio_modal';
    let old = document.getElementById(modalId);
    if (old) old.remove();

    let html = `
    <style>
        /* ẨN TUYỆT ĐỐI 100% THANH KÉO (SCROLLBAR) TRONG TOÀN BỘ RBAC STUDIO */
        #${modalId}, #${modalId} * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
        }
        #${modalId}::-webkit-scrollbar, #${modalId} *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
        .rbac-card {
            background: #181b1f;
            border: 1px solid #2b3035;
            border-radius: 12px;
            padding: 10px 12px;
        }
        .rbac-mode-btn {
            border-radius: 8px;
            padding: 5px 12px;
            font-size: 0.78rem;
            font-weight: 700;
            border: 1px solid #2b3035;
            background: #121417;
            color: #94a3b8;
            cursor: pointer;
            transition: 0.15s;
            white-space: nowrap;
        }
        .rbac-mode-btn.active {
            background: #38bdf8;
            color: #0f172a;
            border-color: #38bdf8;
        }
        .rbac-input-sm {
            background: #101214 !important;
            border: 1px solid #2b3035 !important;
            color: #f8fafc !important;
            border-radius: 8px !important;
            font-size: 0.8rem !important;
            font-weight: 600 !important;
            padding: 5px 9px !important;
            height: 32px !important;
        }
        .rbac-input-sm:focus {
            border-color: #38bdf8 !important;
            box-shadow: none !important;
        }
        .rbac-user-row {
            background: #121417;
            border: 1px solid #24292e;
            border-radius: 9px;
            padding: 7px 10px;
            margin-bottom: 6px;
            cursor: pointer;
            transition: 0.15s;
        }
        .rbac-user-row:hover {
            border-color: #475569;
            background: #1a1d22;
        }
        .rbac-user-row.active {
            border-color: #38bdf8;
            background: rgba(56, 189, 248, 0.1);
        }
        /* Thiết kế ô quyền dạng Lưới 2 cột Siêu Gọn (Compact Grid) */
        .rbac-perm-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(255px, 1fr));
            gap: 6px;
        }
        .rbac-perm-compact-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 10px;
            border-radius: 8px;
            background: #101214;
            border: 1px solid #22262b;
            transition: 0.15s;
        }
        .rbac-perm-compact-card:hover {
            border-color: #38bdf8;
        }
        .rbac-perm-compact-card.is-overridden {
            border-color: rgba(245, 158, 11, 0.55);
            background: rgba(245, 158, 11, 0.06);
        }
        /* Ô chọn môn học dạng lưới nhỏ gọn chống tràn chữ */
        .rbac-subj-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
            gap: 5px;
            max-height: 115px;
            overflow-y: auto;
        }
        .rbac-subj-pill {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            border-radius: 7px;
            background: #101214;
            border: 1px solid #262b31;
            color: #cbd5e1;
            font-size: 0.74rem;
            font-weight: 600;
            cursor: pointer;
            user-select: none;
            overflow: hidden;
        }
        .rbac-subj-pill input:checked + span {
            color: #38bdf8;
            font-weight: 700;
        }
    </style>

    <div id="${modalId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column animate__animated animate__fadeInUp" style="background: #212529; z-index: 9999999; height: 100dvh; max-height: 100dvh; overflow: hidden;">
        
        <!-- HEADER TRÀN VIỀN KÈM CHUYỂN CHẾ ĐỘ: [1. CẤU HÌNH ROLE GỐC] <-> [2. TINH CHỈNH CÁ NHÂN] -->
        <div class="d-flex justify-content-between align-items-center py-2 px-3 border-bottom border-secondary bg-dark flex-shrink-0 flex-wrap gap-2" style="margin-left: -0.5px; margin-right: -0.5px;">
            <button type="button" class="btn btn-sm text-light fw-bold d-flex align-items-center p-1 shadow-none bg-transparent border-0" onclick="document.getElementById('${modalId}').remove()">
                <i class="bi bi-chevron-left fs-5"></i><span class="ms-1">Thoát</span>
            </button>

            <!-- Cụm nút chuyển tầng quản lý (Mặc định mở Tab 1: Quyền theo Role trước) -->
            <div class="d-flex align-items-center gap-1 bg-black bg-opacity-50 p-1 rounded-3 border border-secondary border-opacity-50">
                <button type="button" id="btn_rbac_mode_roles" class="rbac-mode-btn active" onclick="window.switch_rbac_studio_mode('roles')">
                    <i class="bi bi-sliders2-vertical me-1"></i> 1. Quyền theo Vai trò
                </button>
                <button type="button" id="btn_rbac_mode_users" class="rbac-mode-btn" onclick="window.switch_rbac_studio_mode('users')">
                    <i class="bi bi-person-gear me-1"></i> 2. Tinh chỉnh từng Người (<span id="hdr_cnt_users">0</span>)
                </button>
            </div>

            <button type="button" id="btn_rbac_top_bulk_excel" class="btn btn-sm btn-outline-info fw-bold rounded-pill px-3 py-1 d-none" style="font-size: 0.76rem;" onclick="window.open_rbac_bulk_import_modal()">
                <i class="bi bi-file-earmark-spreadsheet-fill me-1"></i> Nhập lô Excel
            </button>
        </div>

        <!-- BODY CHÍNH (TÁCH BIỆT TUYỆT ĐỐI 2 MÀN HÌNH BẰNG D-NONE) -->
        <div class="flex-grow-1 overflow-auto p-2" style="min-height: 0;">
            
            <!-- ========================================================================= -->
            <!-- MÀN HÌNH 1: CHỈ HIỂN THỊ CÁC ROLE HỆ THỐNG (KHÔNG CÓ DANH SÁCH SINH VIÊN) -->
            <!-- ========================================================================= -->
            <div id="rbac_view_roles_container" class="h-100 mx-auto" style="max-width: 1380px;">
                <div class="row g-2 h-100">
                    <!-- Cột trái: CHỈ chứa Danh mục các Role (Admin, Giảng viên, Coi thi, Sinh viên) -->
                    <div class="col-12 col-lg-4 d-flex flex-column">
                        <div class="rbac-card d-flex flex-column flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom border-secondary border-opacity-25">
                                <span class="fw-bold text-warning small text-uppercase"><i class="bi bi-layers-fill me-1"></i> Danh mục Role hệ thống</span>
                                <button class="btn btn-sm btn-info fw-bold text-dark py-0 px-2" style="font-size: 0.74rem;" onclick="window.prompt_create_new_role_template()">
                                    <i class="bi bi-plus-lg"></i> Thêm Role mới
                                </button>
                            </div>
                            <div class="small text-white-50 mb-2" style="font-size: 0.73rem;">
                                💡 Chọn một Role bên dưới để thiết lập <b>khung quyền cơ bản</b>. Toàn bộ tài khoản thuộc Role đó sẽ tự động áp dụng theo khung này.
                            </div>
                            <div id="rbac_role_templates_list_box" class="flex-grow-1 overflow-auto"></div>
                        </div>
                    </div>

                    <!-- Cột phải: Bảng công tắc quyền cơ bản của Role đang chọn -->
                    <div class="col-12 col-lg-8 d-flex flex-column">
                        <div id="rbac_role_template_editor_box" class="rbac-card flex-grow-1 overflow-auto" style="max-height: 81dvh;"></div>
                    </div>
                </div>
            </div>

            <!-- ========================================================================= -->
            <!-- MÀN HÌNH 2: DANH SÁCH TỪNG NGƯỜI (MẶC ĐỊNH ẨN BẰNG d-none, CHỈ HIỆN Ở TAB 2) -->
            <!-- ========================================================================= -->
            <div id="rbac_view_users_container" class="h-100 mx-auto d-none flex-column gap-2" style="max-width: 1380px;">
                
                <!-- THANH BỘ LỌC THEO TẦNG TRÊN CÙNG 1 HÀNG NGANG -->
                <div class="rbac-card py-2 px-2 flex-shrink-0">
                    <div class="row g-1 align-items-center">
                        <!-- Tầng 1: Chọn Vai trò (Role) -->
                        <div class="col-6 col-md-2">
                            <select id="rbac_filter_role_select" class="form-select rbac-input-sm text-warning" onchange="window.on_change_tier1_role_filter()">
                                <option value="all">⚡ Tất cả Role (0)</option>
                            </select>
                        </div>
                        <!-- Tầng 2: Chọn Lớp / Đơn vị (Tự động lọc theo Tầng 1) -->
                        <div class="col-6 col-md-2">
                            <select id="rbac_filter_dept_select" class="form-select rbac-input-sm text-info" onchange="window.render_rbac_user_list()">
                                <option value="all">🏢 Tất cả Lớp/Đơn vị</option>
                            </select>
                        </div>
                        <!-- Tầng 3: Lọc Trạng thái / Tinh chỉnh riêng -->
                        <div class="col-6 col-md-2">
                            <select id="rbac_filter_status_select" class="form-select rbac-input-sm" onchange="window.render_rbac_user_list()">
                                <option value="all">🟢 Mọi trạng thái</option>
                                <option value="custom_only">✨ Có quyền riêng</option>
                                <option value="locked">🔒 Đang bị khóa</option>
                            </select>
                        </div>
                        <!-- Ô tìm kiếm nhanh -->
                        <div class="col-6 col-md-4">
                            <div class="position-relative">
                                <input type="text" id="rbac_search_input" class="form-control rbac-input-sm ps-4" placeholder="Tìm nhanh Mã ID, Họ tên, Ngành..." oninput="window.render_rbac_user_list()">
                                <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-2 text-white-50" style="font-size: 0.75rem;"></i>
                            </div>
                        </div>
                        <!-- Nút thêm tài khoản mới trên cùng hàng -->
                        <div class="col-12 col-md-2 text-end">
                            <button class="btn btn-info fw-bold text-dark w-100 py-1 rounded-2" style="font-size: 0.78rem; height: 32px;" onclick="window.create_new_rbac_user_draft()">
                                <i class="bi bi-person-plus-fill me-1"></i> Thêm Tài Khoản
                            </button>
                        </div>
                    </div>
                </div>

                <!-- KHUNG 2 CỘT: DANH SÁCH NGƯỜI DÙNG (TRÁI) & BẢNG QUYỀN GỌN (PHẢI) -->
                <div class="row g-2 flex-grow-1" style="min-height: 0;">
                    <div class="col-12 col-lg-4 d-flex flex-column" style="min-height: 0;">
                        <div class="rbac-card d-flex flex-column flex-grow-1 p-2" style="min-height: 0;">
                            <div id="rbac_users_list_box" class="flex-grow-1 overflow-auto" style="max-height: 71dvh;">
                                <div class="text-center text-white-50 py-5 small">⏳ Đang tải danh sách tài khoản...</div>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-lg-8 d-flex flex-column" style="min-height: 0;">
                        <div id="rbac_detail_editor_box" class="rbac-card flex-grow-1 overflow-auto p-2 px-3" style="max-height: 71dvh;"></div>
                    </div>
                </div>

            </div>

        </div>

        <!-- FOOTER NEO ĐÁY TRÀN VIỀN -->
        <div class="border-top border-secondary bg-dark flex-shrink-0 d-flex w-100 mt-auto" style="margin-left: -0.5px; margin-right: -0.5px;">
            <button type="button" class="btn fw-bold py-2 flex-grow-1 d-flex justify-content-center align-items-center text-white-50 bg-transparent border-0 border-end border-secondary" style="border-radius: 0; font-size: 0.85rem;" onclick="document.getElementById('${modalId}').remove()">
                <i class="bi bi-x-lg me-2"></i><span>ĐÓNG</span>
            </button>
            <button type="button" class="btn fw-bold py-2 flex-grow-1 d-flex justify-content-center align-items-center text-warning bg-transparent border-0 border-end border-secondary" style="border-radius: 0; font-size: 0.85rem;" onclick="window.load_rbac_users_from_db()">
                <i class="bi bi-arrow-clockwise me-2"></i><span>LÀM MỚI</span>
            </button>
            <button type="button" id="btn_rbac_primary_save" class="btn fw-bold py-2 flex-grow-1 d-flex justify-content-center align-items-center text-info bg-transparent border-0" style="border-radius: 0; font-size: 0.85rem;" onclick="window.handle_rbac_footer_save()">
                <i class="bi bi-layers-fill me-2"></i><span>LƯU QUYỀN GỐC CHO ROLE &amp; ÁP DỤNG ĐỒNG BỘ</span>
            </button>
        </div>

    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    await window.load_rbac_users_from_db();
    window.switch_rbac_studio_mode('roles');
};

// Chuyển đổi dứt khoát giữa Tab 1 (Chỉ hiện Role) và Tab 2 (Chỉ hiện Danh sách từng người) bằng class d-none / d-flex
window.switch_rbac_studio_mode = function(mode) {
    window._rbacStudioMode = mode;
    document.getElementById('btn_rbac_mode_roles')?.classList.toggle('active', mode === 'roles');
    document.getElementById('btn_rbac_mode_users')?.classList.toggle('active', mode === 'users');

    let rolesView = document.getElementById('rbac_view_roles_container');
    let usersView = document.getElementById('rbac_view_users_container');
    let bulkBtn = document.getElementById('btn_rbac_top_bulk_excel');
    let saveBtn = document.getElementById('btn_rbac_primary_save');

    if (mode === 'roles') {
        if (rolesView) {
            rolesView.classList.remove('d-none');
            rolesView.style.display = 'block';
        }
        if (usersView) {
            usersView.classList.remove('d-flex');
            usersView.classList.add('d-none');
            usersView.style.display = 'none';
        }
        if (bulkBtn) bulkBtn.classList.add('d-none');
        if (saveBtn) saveBtn.innerHTML = `<i class="bi bi-layers-fill me-2"></i><span>LƯU QUYỀN GỐC CHO ROLE &amp; ÁP DỤNG ĐỒNG BỘ</span>`;
        window.render_rbac_role_templates_list();
        window.render_rbac_role_template_editor(window._rbacSelectedRoleKey || 'teacher');
    } else {
        if (rolesView) {
            rolesView.classList.add('d-none');
            rolesView.style.display = 'none';
        }
        if (usersView) {
            usersView.classList.remove('d-none');
            usersView.classList.add('d-flex');
            usersView.style.display = 'flex';
        }
        if (bulkBtn) bulkBtn.classList.remove('d-none');
        if (saveBtn) saveBtn.innerHTML = `<i class="bi bi-floppy-fill me-2"></i><span>LƯU PHÂN QUYỀN CÁ NHÂN VÀO BẢNG USERS</span>`;
        window.populate_tier_filter_dropdowns();
        window.render_rbac_user_list();
        window.render_rbac_detail_editor();
    }
};

window.handle_rbac_footer_save = function() {
    if (window._rbacStudioMode === 'roles') {
        window.save_current_role_template();
    } else {
        window.save_current_rbac_user();
    }
};

// =========================================================================
// PHẦN A: QUẢN LÝ QUYỀN GỐC CHO ROLE (ROLE TEMPLATES) & TẠO ROLE MỚI
// =========================================================================
window.render_rbac_role_templates_list = function() {
    let box = document.getElementById('rbac_role_templates_list_box');
    if (!box) return;

    let rolesObj = window.RBAC_ROLE_PRESETS || {};
    let keys = Object.keys(rolesObj);

    box.innerHTML = keys.map(rKey => {
        let r = rolesObj[rKey];
        let countUsers = (window._rbacUsersCache || []).filter(u => u.role === rKey).length;
        let isActive = (window._rbacSelectedRoleKey === rKey) ? 'active' : '';
        let enabledCount = Object.values(r.permissions || {}).filter(Boolean).length;

        return `
        <div class="rbac-user-row ${isActive}" onclick="window.render_rbac_role_template_editor('${rKey}')">
            <div class="d-flex justify-content-between align-items-center">
                <span class="badge ${r.badgeClass || 'bg-info text-dark'} fw-bold" style="font-size: 0.75rem;">${r.label}</span>
                <span class="text-white-50 small font-monospace" style="font-size: 0.72rem;">Mã: <b>${rKey}</b></span>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-1 small" style="font-size: 0.73rem;">
                <span class="text-info"><i class="bi bi-people-fill me-1"></i><b>${countUsers}</b> tài khoản đang dùng</span>
                <span class="text-warning"><i class="bi bi-check2-circle me-1"></i>Bật <b>${enabledCount}/24</b> quyền</span>
            </div>
        </div>`;
    }).join('');
};

window.render_rbac_role_template_editor = function(roleKey) {
    window._rbacSelectedRoleKey = roleKey;
    window.render_rbac_role_templates_list();

    let box = document.getElementById('rbac_role_template_editor_box');
    let roleData = window.RBAC_ROLE_PRESETS[roleKey];
    if (!box || !roleData) return;

    let isCoreRole = ['admin', 'teacher', 'proctor', 'k12'].includes(roleKey);
    let perms = roleData.permissions || {};

    // Hiển thị các phân hệ quyền phù hợp với Role
    const buildRoleGroupHtml = (groupKey) => {
        let grp = window.RBAC_PERMISSION_DEFINITIONS[groupKey];
        if (!grp) return '';
        if (roleKey === 'k12' && groupKey !== 'student_group') return '';
        if (roleKey !== 'k12' && groupKey === 'student_group' && roleData.groupType !== 'student') return '';

        let cardsHtml = grp.items.map(item => {
            let checked = Boolean(perms[item.key]);
            return `
            <div class="rbac-perm-compact-card" title="${item.desc}">
                <div class="text-truncate pe-2">
                    <div class="fw-bold text-white text-truncate" style="font-size: 0.78rem;">
                        <i class="bi ${item.icon} me-1"></i>${item.title}
                    </div>
                    <div class="text-white-50 text-truncate" style="font-size: 0.67rem;">${item.desc}</div>
                </div>
                <div class="form-check form-switch m-0 flex-shrink-0">
                    <input class="form-check-input role-tpl-perm-switch" type="checkbox" data-group="${groupKey}" data-perm-key="${item.key}" style="width: 36px; height: 18px; cursor: pointer;" ${checked ? 'checked' : ''}>
                </div>
            </div>`;
        }).join('');

        return `
        <div class="mb-2 p-2 rounded-3" style="background: #121417; border: 1px solid #262b31;">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-bold ${grp.colorClass} small text-uppercase" style="font-size: 0.75rem;">${grp.title}</span>
                <div class="d-flex gap-1">
                    <button type="button" class="btn btn-sm py-0 px-2 btn-outline-info fw-bold" style="font-size: 0.65rem;" onclick="document.querySelectorAll('.role-tpl-perm-switch[data-group=\\'${groupKey}\\']').forEach(el=>el.checked=true)">Bật hết</button>
                    <button type="button" class="btn btn-sm py-0 px-2 btn-outline-secondary fw-bold" style="font-size: 0.65rem;" onclick="document.querySelectorAll('.role-tpl-perm-switch[data-group=\\'${groupKey}\\']').forEach(el=>el.checked=false)">Tắt hết</button>
                </div>
            </div>
            <div class="rbac-perm-grid">${cardsHtml}</div>
        </div>`;
    };

    box.innerHTML = `
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pb-2 mb-2 border-bottom border-secondary">
            <div class="d-flex align-items-center gap-2">
                <span class="badge ${roleData.badgeClass || 'bg-info text-dark'} fs-6">${roleData.label}</span>
                <span class="text-white-50 small">(Mã Role: <code>${roleKey}</code>)</span>
            </div>
            <div class="d-flex gap-2">
                ${!isCoreRole ? `<button class="btn btn-sm btn-outline-danger fw-bold py-1 px-2" style="font-size: 0.74rem;" onclick="window.delete_custom_role_template('${roleKey}')"><i class="bi bi-trash3 me-1"></i>Xóa Role này</button>` : ''}
                <button class="btn btn-sm btn-info fw-bold text-dark py-1 px-3" style="font-size: 0.76rem;" onclick="window.save_current_role_template()">
                    <i class="bi bi-check2-circle me-1"></i> Lưu Khung Quyền Role "${roleKey}"
                </button>
            </div>
        </div>

        <div class="row g-2 mb-2">
            <div class="col-6 col-md-5">
                <label class="text-white-50 small fw-bold" style="font-size: 0.7rem;">Tên hiển thị của Role</label>
                <input type="text" id="tpl_role_label" class="form-control rbac-input-sm" value="${roleData.label}">
            </div>
            <div class="col-6 col-md-4">
                <label class="text-white-50 small fw-bold" style="font-size: 0.7rem;">Nhóm giao diện quyền</label>
                <select id="tpl_role_group_type" class="form-select rbac-input-sm text-warning" onchange="window.RBAC_ROLE_PRESETS['${roleKey}'].groupType = this.value; window.render_rbac_role_template_editor('${roleKey}')">
                    <option value="staff" ${roleData.groupType !== 'student' ? 'selected' : ''}>👨‍🏫 Nhóm Cán bộ / Giảng viên / Coi thi</option>
                    <option value="student" ${roleData.groupType === 'student' ? 'selected' : ''}>🎓 Nhóm Sinh viên / Học viên</option>
                </select>
            </div>
            <div class="col-12 col-md-3">
                <label class="text-white-50 small fw-bold" style="font-size: 0.7rem;">Màu huy hiệu (Badge)</label>
                <select id="tpl_role_badge" class="form-select rbac-input-sm">
                    <option value="bg-danger text-white" ${roleData.badgeClass?.includes('bg-danger') ? 'selected' : ''}>Đỏ (Quản trị)</option>
                    <option value="bg-info text-dark" ${roleData.badgeClass?.includes('bg-info') ? 'selected' : ''}>Xanh dương (Giảng viên)</option>
                    <option value="bg-warning text-dark" ${roleData.badgeClass?.includes('bg-warning') ? 'selected' : ''}>Vàng (Coi thi / Giáo vụ)</option>
                    <option value="bg-primary text-white" ${roleData.badgeClass?.includes('bg-primary') ? 'selected' : ''}>Xanh đậm (Trưởng BM)</option>
                    <option value="bg-success text-white" ${roleData.badgeClass?.includes('bg-success') ? 'selected' : ''}>Xanh lá (Sinh viên)</option>
                </select>
            </div>
        </div>

        ${buildRoleGroupHtml('bank_group')}
        ${buildRoleGroupHtml('exam_group')}
        ${buildRoleGroupHtml('system_group')}
        ${buildRoleGroupHtml('student_group')}
    `;
};

window.save_current_role_template = async function() {
    let roleKey = window._rbacSelectedRoleKey;
    if (!roleKey || !window.RBAC_ROLE_PRESETS[roleKey]) return;

    let r = window.RBAC_ROLE_PRESETS[roleKey];
    r.label = document.getElementById('tpl_role_label')?.value?.trim() || r.label;
    r.groupType = document.getElementById('tpl_role_group_type')?.value || r.groupType;
    r.badgeClass = document.getElementById('tpl_role_badge')?.value || r.badgeClass;

    document.querySelectorAll('.role-tpl-perm-switch').forEach(sw => {
        r.permissions[sw.getAttribute('data-perm-key')] = sw.checked;
    });
    r.legacyPermText = window.compute_legacy_perm_string(roleKey, r.permissions);

    window.save_rbac_role_templates_to_storage();

    // Cập nhật lại quyền kế thừa cho toàn bộ user thuộc Role này trong Cache (Giữ nguyên overrides riêng nếu có)
    let affectedCount = 0;
    (window._rbacUsersCache || []).forEach(u => {
        if (u.role === roleKey) {
            affectedCount++;
            // Lọc lại overrides xem có quyền nào vừa trùng khớp với quyền mới của Role không
            let updatedOverrides = {};
            Object.keys(u.overrides || {}).forEach(k => {
                if (Boolean(u.overrides[k]) !== Boolean(r.permissions[k])) {
                    updatedOverrides[k] = Boolean(u.overrides[k]);
                }
            });
            u.overrides = updatedOverrides;
            u.hasCustomOverrides = Object.keys(updatedOverrides).length > 0;
            u.permissions = Object.assign({}, r.permissions, updatedOverrides);
            if (!u.hasCustomOverrides) {
                u.permissions_text = r.legacyPermText;
            }
        }
    });

    // Nếu tài khoản đang chọn ở Tab 2 cũng thuộc Role này thì cập nhật luôn
    if (window._rbacSelectedUser && window._rbacSelectedUser.role === roleKey) {
        let found = window._rbacUsersCache.find(u => u.student_id === window._rbacSelectedUser.student_id);
        if (found) window._rbacSelectedUser = JSON.parse(JSON.stringify(found));
    }

    window.render_rbac_role_templates_list();
    window.show_toast(`✅ Đã lưu chuẩn Role "${r.label}" và đồng bộ tức thì cho ${affectedCount} tài khoản!`);
};

window.prompt_create_new_role_template = function() {
    let rawCode = prompt("Nhập mã Role mới viết liền không dấu (VD: truong_bm, giao_vu, co_van):", "truong_bm");
    if (!rawCode) return;
    let roleKey = rawCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (window.RBAC_ROLE_PRESETS[roleKey]) {
        return window.show_toast("⚠️ Mã Role này đã tồn tại!", true);
    }
    let roleLabel = prompt("Nhập tên hiển thị cho Role mới:", "🏛️ Trưởng Bộ Môn");
    if (!roleLabel) return;

    window.RBAC_ROLE_PRESETS[roleKey] = {
        roleKey: roleKey,
        label: roleLabel.trim(),
        badgeClass: 'bg-primary text-white',
        groupType: 'staff',
        legacyPermText: 'banks,exams,stats',
        permissions: { ...window.DEFAULT_RBAC_ROLE_TEMPLATES.teacher.permissions }
    };
    window.save_rbac_role_templates_to_storage();
    window.render_rbac_role_template_editor(roleKey);
    window.show_toast(`🎉 Đã tạo Role mới: ${roleLabel} (${roleKey})!`);
};

window.delete_custom_role_template = function(roleKey) {
    if (['admin', 'teacher', 'proctor', 'k12'].includes(roleKey)) return;
    if (!confirm(`Xóa Role "${roleKey}"? Các tài khoản đang giữ Role này sẽ chuyển về Giảng viên.`)) return;
    delete window.RBAC_ROLE_PRESETS[roleKey];
    window.save_rbac_role_templates_to_storage();
    window.render_rbac_role_template_editor('teacher');
};

// =========================================================================
// PHẦN B: BỘ LỌC TẦNG 1 HÀNG (KIỂU NHẬT KÝ) & TINH CHỈNH TỪNG NGƯỜI
// =========================================================================
window.load_rbac_users_from_db = async function() {
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        const { data, error } = await clientDb.from('users').select('*').limit(3000);
        if (error) throw error;

        const rolePriority = { admin: 1, teacher: 2, proctor: 3, k12: 9 };
        window._rbacUsersCache = (data || [])
            .map(row => window.normalize_user_row_for_rbac(row))
            .sort((a, b) => {
                let pa = rolePriority[a.role] || 5;
                let pb = rolePriority[b.role] || 5;
                if (pa !== pb) return pa - pb;
                return String(a.student_id).localeCompare(String(b.student_id));
            });
    } catch (e) {
        console.error("Lỗi đọc bảng public.users:", e);
        window._rbacUsersCache = [];
    }

    let hdrCnt = document.getElementById('hdr_cnt_users');
    if (hdrCnt) hdrCnt.innerText = window._rbacUsersCache.length;

    window.populate_tier_filter_dropdowns();
    window.render_rbac_user_list();
    if (window._rbacUsersCache.length > 0 && !window._rbacSelectedUser) {
        window.select_rbac_user_for_edit(window._rbacUsersCache[0].student_id);
    }
};

// Dựng Dropdown lọc theo Tầng: Chọn Tầng 1 (Role) -> Tự động nạp danh sách Lớp/Đơn vị tương ứng vào Tầng 2
window.populate_tier_filter_dropdowns = function() {
    let list = window._rbacUsersCache || [];
    let roleSelect = document.getElementById('rbac_filter_role_select');
    if (!roleSelect) return;

    let curRoleVal = roleSelect.value || 'all';
    let roleOptsHtml = `<option value="all">⚡ Tất cả Role (${list.length})</option>`;

    Object.keys(window.RBAC_ROLE_PRESETS).forEach(rKey => {
        let cnt = list.filter(u => u.role === rKey).length;
        let rInfo = window.RBAC_ROLE_PRESETS[rKey];
        roleOptsHtml += `<option value="${rKey}" ${curRoleVal === rKey ? 'selected' : ''}>${rInfo.label} (${cnt})</option>`;
    });
    roleSelect.innerHTML = roleOptsHtml;
    window.populate_tier2_dept_dropdown();
};

window.on_change_tier1_role_filter = function() {
    window.populate_tier2_dept_dropdown();
    window.render_rbac_user_list();
};

window.populate_tier2_dept_dropdown = function() {
    let list = window._rbacUsersCache || [];
    let roleVal = document.getElementById('rbac_filter_role_select')?.value || 'all';
    let deptSelect = document.getElementById('rbac_filter_dept_select');
    if (!deptSelect) return;

    let subset = roleVal === 'all' ? list : list.filter(u => u.role === roleVal);
    let deptCounts = {};
    subset.forEach(u => {
        let d = (u.class_code || u.nganh_hoc || '').trim();
        if (d) deptCounts[d] = (deptCounts[d] || 0) + 1;
    });

    let sortedDepts = Object.keys(deptCounts).sort();
    let html = `<option value="all">🏢 Tất cả Lớp/Đơn vị (${ sortedDepts.length })</option>`;
    sortedDepts.forEach(d => {
        html += `<option value="${d}">${d} (${deptCounts[d]})</option>`;
    });
    deptSelect.innerHTML = html;
};

window.render_rbac_user_list = function() {
    let list = window._rbacUsersCache || [];
    let roleFilter = document.getElementById('rbac_filter_role_select')?.value || 'all';
    let deptFilter = document.getElementById('rbac_filter_dept_select')?.value || 'all';
    let statusFilter = document.getElementById('rbac_filter_status_select')?.value || 'all';
    let q = (document.getElementById('rbac_search_input')?.value || '').trim().toLowerCase();

    let filtered = list.filter(u => {
        if (roleFilter !== 'all' && u.role !== roleFilter) return false;
        if (deptFilter !== 'all') {
            let d = (u.class_code || u.nganh_hoc || '').trim();
            if (d !== deptFilter) return false;
        }
        if (statusFilter === 'locked' && u.status !== 'locked') return false;
        if (statusFilter === 'custom_only' && !u.hasCustomOverrides) return false;

        if (q) {
            let hay = `${u.student_id || ''} ${u.full_name || ''} ${u.class_code || ''} ${u.nganh_hoc || ''}`.toLowerCase();
            return hay.includes(q);
        }
        return true;
    });

    let box = document.getElementById('rbac_users_list_box');
    if (!box) return;

    if (filtered.length === 0) {
        box.innerHTML = `<div class="text-center text-white-50 py-4 small">Không có tài khoản nào khớp bộ lọc.</div>`;
        return;
    }

    let selectedId = window._rbacSelectedUser ? window._rbacSelectedUser.student_id : null;
    let displaySlice = filtered.slice(0, 150);

    box.innerHTML = displaySlice.map(u => {
        let preset = window.RBAC_ROLE_PRESETS[u.role] || window.RBAC_ROLE_PRESETS.k12;
        let isLocked = u.status === 'locked';
        let isActiveCard = (u.student_id === selectedId) ? 'active' : '';
        let metaInfo = [u.class_code, u.nganh_hoc].filter(Boolean).join(' • ') || (u.role === 'admin' ? 'Ban Quản Trị' : 'Chưa gán đơn vị');

        let modeBadge = u.hasCustomOverrides
            ? `<span class="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50" style="font-size: 0.62rem;">✨ Tinh chỉnh riêng</span>`
            : `<span class="text-white-50" style="font-size: 0.66rem;">Theo Role gốc</span>`;

        return `
        <div class="rbac-user-row ${isActiveCard}" onclick="window.select_rbac_user_for_edit('${u.student_id.replace(/'/g, "\\'")}')">
            <div class="d-flex justify-content-between align-items-center">
                <div class="text-truncate pe-2">
                    <span class="fw-bold text-info" style="font-size: 0.82rem;">${u.student_id}</span>
                    <span class="text-white fw-bold ms-1" style="font-size: 0.82rem;">— ${u.full_name || 'Chưa có tên'}</span>
                </div>
                <span class="badge ${isLocked ? 'bg-secondary text-light' : preset.badgeClass} flex-shrink-0" style="font-size: 0.64rem;">
                    ${isLocked ? '🔒 Khóa' : preset.label}
                </span>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-1" style="font-size: 0.7rem;">
                <span class="text-white-50 text-truncate pe-2"><i class="bi bi-building me-1"></i>${metaInfo}</span>
                ${modeBadge}
            </div>
        </div>`;
    }).join('');
};

// 6. HIỂN THỊ BẢNG QUYỀN CHI TIẾT CỦA CÁ NHÂN (SIÊU GỌN, NHÌN THẤY NGAY QUYỀN CHI TIẾT)
window.select_rbac_user_for_edit = function(studentId) {
    let found = (window._rbacUsersCache || []).find(u => u.student_id === studentId);
    if (!found) return;

    window._rbacSelectedUser = JSON.parse(JSON.stringify(found));
    window.render_rbac_user_list();
    window.render_rbac_detail_editor();
};

window.create_new_rbac_user_draft = function() {
    let filterRole = document.getElementById('rbac_filter_role_select')?.value;
    let defaultRole = (filterRole && filterRole !== 'all') ? filterRole : 'teacher';
    let preset = window.RBAC_ROLE_PRESETS[defaultRole] || window.RBAC_ROLE_PRESETS.teacher;

    window._rbacSelectedUser = {
        student_id: '',
        password: '123',
        full_name: '',
        role: defaultRole,
        class_code: '',
        nganh_hoc: defaultRole === 'k12' ? 'KTXN' : 'BM KTXN',
        status: 'active',
        permissions_text: preset.legacyPermText || '',
        assigned_subjects: defaultRole === 'admin' ? ['ALL'] : [],
        overrides: {},
        hasCustomOverrides: false,
        permissions: { ...preset.permissions },
        _isNew: true
    };
    window.render_rbac_detail_editor();
    setTimeout(() => { document.getElementById('edit_rbac_student_id')?.focus(); }, 80);
};

window.render_rbac_detail_editor = function() {
    let u = window._rbacSelectedUser;
    let box = document.getElementById('rbac_detail_editor_box');
    if (!box || !u) return;

    let currentRole = u.role || 'k12';
    let rolePreset = window.RBAC_ROLE_PRESETS[currentRole] || window.RBAC_ROLE_PRESETS.k12;
    let baseRolePerms = rolePreset.permissions || {};
    let perms = u.permissions || {};
    let assignedSubjs = Array.isArray(u.assigned_subjects) ? u.assigned_subjects : [];
    let isAllSubjects = assignedSubjs.includes('ALL');

    // Tạo danh sách các lựa chọn Role (bao gồm cả Role tự tạo)
    let roleOptionsHtml = Object.keys(window.RBAC_ROLE_PRESETS).map(rKey => {
        let rInfo = window.RBAC_ROLE_PRESETS[rKey];
        return `<option value="${rKey}" ${currentRole === rKey ? 'selected' : ''}>${rInfo.label}</option>`;
    }).join('');

    // Danh sách môn học dạng Lưới Compact (Cắt chữ thông minh tránh làm dài trang)
    let subjectSectionHtml = '';
    if (rolePreset.groupType !== 'student' && currentRole !== 'k12') {
        let subjectList = [];
        if (window.subjectConfig && typeof window.subjectConfig === 'object') {
            Object.keys(window.subjectConfig).forEach(k => {
                subjectList.push({ key: k, name: window.subjectConfig[k].name || k });
            });
        }

        let subjPills = `
            <label class="rbac-subj-pill" title="Quản lý tất cả các học phần">
                <input type="checkbox" class="form-check-input m-0 flex-shrink-0" id="chk_subj_ALL" ${isAllSubjects ? 'checked' : ''} onchange="window.toggle_rbac_subject_chip('ALL', this.checked)">
                <span class="text-truncate">🌟 Tất cả môn (ALL)</span>
            </label>
            ${subjectList.map(s => `
            <label class="rbac-subj-pill" title="${s.name} (${s.key})">
                <input type="checkbox" class="form-check-input m-0 flex-shrink-0 rbac-subj-item-chk" value="${s.key}" ${(!isAllSubjects && assignedSubjs.includes(s.key)) ? 'checked' : ''} onchange="window.toggle_rbac_subject_chip('${s.key}', this.checked)">
                <span class="text-truncate">${s.name}</span>
            </label>`).join('')}
        `;

        subjectSectionHtml = `
        <div class="mb-2 p-2 rounded-3" style="background: #121417; border: 1px solid #262b31;">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold text-warning" style="font-size: 0.74rem;"><i class="bi bi-journal-bookmark-fill me-1"></i>PHÂN CÔNG HỌC PHẦN PHỤ TRÁCH (${isAllSubjects ? 'Tất cả' : assignedSubjs.length + ' môn'}):</span>
                <span class="text-white-50" style="font-size: 0.66rem;">Di chuột vào tên môn để xem đầy đủ</span>
            </div>
            <div class="rbac-subj-grid">${subjPills}</div>
        </div>`;
    }

    // Dựng lưới Quyền Chi Tiết 2 cột (Đánh dấu màu vàng cho những quyền được tinh chỉnh khác với Role gốc)
    const buildCompactGroupHtml = (groupKey) => {
        let grp = window.RBAC_PERMISSION_DEFINITIONS[groupKey];
        if (!grp) return '';
        let isStudentRole = (currentRole === 'k12' || rolePreset.groupType === 'student');
        if (isStudentRole && groupKey !== 'student_group') return '';
        if (!isStudentRole && groupKey === 'student_group') return '';
        if (currentRole === 'proctor' && groupKey !== 'exam_group') return '';

        let cardsHtml = grp.items.map(item => {
            let checked = Boolean(perms[item.key]);
            let baseVal = Boolean(baseRolePerms[item.key]);
            let isDiffFromRole = (checked !== baseVal);

            return `
            <div class="rbac-perm-compact-card ${isDiffFromRole ? 'is-overridden' : ''}" title="${item.desc}">
                <div class="text-truncate pe-2">
                    <div class="fw-bold text-white text-truncate" style="font-size: 0.78rem;">
                        <i class="bi ${item.icon} me-1"></i>${item.title}
                        ${isDiffFromRole ? `<span class="badge bg-warning text-dark ms-1" style="font-size:0.58rem;">Riêng</span>` : ''}
                    </div>
                    <div class="text-white-50 text-truncate" style="font-size: 0.67rem;">${item.desc}</div>
                </div>
                <div class="form-check form-switch m-0 flex-shrink-0">
                    <input class="form-check-input rbac-perm-switch" type="checkbox" role="switch" data-group="${groupKey}" data-perm-key="${item.key}" style="width: 36px; height: 18px; cursor: pointer;" ${checked ? 'checked' : ''} onchange="window.sync_legacy_perm_from_switches()">
                </div>
            </div>`;
        }).join('');

        return `
        <div class="mb-2 p-2 rounded-3" style="background: #121417; border: 1px solid #262b31;">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold ${grp.colorClass} text-uppercase" style="font-size: 0.74rem;">${grp.title}</span>
                <div class="d-flex gap-1">
                    <button type="button" class="btn btn-sm py-0 px-2 btn-outline-info fw-bold" style="font-size: 0.65rem;" onclick="window.toggle_all_group_switches('${groupKey}', true)">Bật hết</button>
                    <button type="button" class="btn btn-sm py-0 px-2 btn-outline-secondary fw-bold" style="font-size: 0.65rem;" onclick="window.toggle_all_group_switches('${groupKey}', false)">Tắt hết</button>
                </div>
            </div>
            <div class="rbac-perm-grid">${cardsHtml}</div>
        </div>`;
    };

    box.innerHTML = `
        <!-- THANH HEADER CÁ NHÂN SIÊU GỌN -->
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-1 pb-2 mb-2 border-bottom border-secondary">
            <div class="d-flex align-items-center gap-2">
                <span class="badge ${rolePreset.badgeClass || 'bg-info text-dark'} fw-bold">${rolePreset.label}</span>
                <span class="fw-bold text-white" style="font-size: 0.92rem;">${u.full_name || u.student_id || 'Tài khoản mới'}</span>
                ${u.hasCustomOverrides ? `<span class="badge bg-warning text-dark" style="font-size:0.65rem;">✨ Đang có quyền tinh chỉnh riêng</span>` : `<span class="badge bg-dark border border-secondary text-white-50" style="font-size:0.65rem;">Đang kế thừa chuẩn Role</span>`}
            </div>
            <div class="d-flex gap-1">
                <button class="btn btn-sm btn-outline-warning py-0 px-2 fw-bold" style="font-size: 0.7rem;" onclick="window.reset_user_to_role_default()" title="Xóa các tinh chỉnh riêng, đưa người này về đúng quyền chuẩn của Role">
                    <i class="bi bi-arrow-counterclockwise me-1"></i>Đưa về chuẩn Role
                </button>
                ${!u._isNew ? `
                <button class="btn btn-sm btn-outline-danger py-0 px-2 fw-bold" style="font-size: 0.7rem;" onclick="window.delete_rbac_user('${u.student_id.replace(/'/g, "\\'")}')">
                    <i class="bi bi-trash3"></i>
                </button>` : ''}
            </div>
        </div>

        <!-- HÀNG THÔNG TIN ĐỊNH DANH GỘP GỌN TRÊN 1 KHỐI MỎNG -->
        <div class="row g-1 mb-2">
            <div class="col-4 col-md-2">
                <label class="text-white-50 fw-bold" style="font-size: 0.66rem;">Mã ID *</label>
                <input type="text" id="edit_rbac_student_id" class="form-control rbac-input-sm text-info" value="${u.student_id || ''}" ${!u._isNew ? 'readonly' : ''}>
            </div>
            <div class="col-4 col-md-2">
                <label class="text-white-50 fw-bold" style="font-size: 0.66rem;">Mật khẩu *</label>
                <input type="text" id="edit_rbac_password" class="form-control rbac-input-sm text-warning" value="${u.password || '123'}">
            </div>
            <div class="col-4 col-md-3">
                <label class="text-white-50 fw-bold" style="font-size: 0.66rem;">Họ và tên *</label>
                <input type="text" id="edit_rbac_full_name" class="form-control rbac-input-sm" value="${u.full_name || ''}">
            </div>
            <div class="col-4 col-md-2">
                <label class="text-white-50 fw-bold" style="font-size: 0.66rem;">Vai trò (Role)</label>
                <select id="edit_rbac_role" class="form-select rbac-input-sm text-warning" onchange="window.on_change_rbac_role_dropdown(this.value)">
                    ${roleOptionsHtml}
                </select>
            </div>
            <div class="col-4 col-md-2">
                <label class="text-white-50 fw-bold" style="font-size: 0.66rem;">Lớp / Bộ môn</label>
                <input type="text" id="edit_rbac_nganh_hoc" class="form-control rbac-input-sm" value="${u.nganh_hoc || u.class_code || ''}">
            </div>
            <div class="col-4 col-md-1">
                <label class="text-white-50 fw-bold" style="font-size: 0.66rem;">TT</label>
                <select id="edit_rbac_status" class="form-select rbac-input-sm ${u.status === 'locked' ? 'text-danger' : 'text-success'} px-1">
                    <option value="active" ${u.status !== 'locked' ? 'selected' : ''}>Mở</option>
                    <option value="locked" ${u.status === 'locked' ? 'selected' : ''}>Khóa</option>
                </select>
            </div>
            <input type="hidden" id="edit_rbac_class_code" value="${u.class_code || ''}">
            <input type="hidden" id="edit_rbac_legacy_perm" value="${u.permissions_text || ''}">
        </div>

        <!-- LƯỚI QUYỀN CHI TIẾT ĐƯA LÊN NGAY ĐẦU ĐỂ THAO TÁC TỨC THÌ -->
        ${buildCompactGroupHtml('bank_group')}
        ${buildCompactGroupHtml('exam_group')}
        ${buildCompactGroupHtml('system_group')}
        ${buildCompactGroupHtml('student_group')}

        <!-- PHÂN CÔNG HỌC PHẦN NẰM GỌN BÊN DƯỚI -->
        ${subjectSectionHtml}
    `;
};

window.reset_user_to_role_default = function() {
    if (!window._rbacSelectedUser) return;
    let roleKey = document.getElementById('edit_rbac_role')?.value || window._rbacSelectedUser.role || 'k12';
    let preset = window.RBAC_ROLE_PRESETS[roleKey] || window.RBAC_ROLE_PRESETS.k12;
    window._rbacSelectedUser.overrides = {};
    window._rbacSelectedUser.hasCustomOverrides = false;
    window._rbacSelectedUser.permissions = { ...preset.permissions };
    window._rbacSelectedUser.permissions_text = preset.legacyPermText || '';
    window.render_rbac_detail_editor();
    window.show_toast(`🔄 Đã đưa quyền của tài khoản về chuẩn gốc của Role "${preset.label}"!`);
};

window.on_change_rbac_role_dropdown = function(newRoleKey) {
    if (!window._rbacSelectedUser) return;
    let u = window._rbacSelectedUser;
    u.student_id = document.getElementById('edit_rbac_student_id')?.value?.trim() || u.student_id;
    u.password = document.getElementById('edit_rbac_password')?.value?.trim() || u.password;
    u.full_name = document.getElementById('edit_rbac_full_name')?.value?.trim() || u.full_name;
    u.nganh_hoc = document.getElementById('edit_rbac_nganh_hoc')?.value?.trim() || u.nganh_hoc;
    u.status = document.getElementById('edit_rbac_status')?.value || u.status;

    let preset = window.RBAC_ROLE_PRESETS[newRoleKey] || window.RBAC_ROLE_PRESETS.k12;
    u.role = newRoleKey;
    u.overrides = {};
    u.hasCustomOverrides = false;
    u.permissions = { ...preset.permissions };
    u.permissions_text = preset.legacyPermText || '';
    if (newRoleKey === 'admin') u.assigned_subjects = ['ALL'];
    else if (newRoleKey === 'k12') u.assigned_subjects = [];

    window.render_rbac_detail_editor();
};

window.toggle_all_group_switches = function(groupKey, state) {
    document.querySelectorAll(`.rbac-perm-switch[data-group="${groupKey}"]`).forEach(sw => {
        sw.checked = Boolean(state);
    });
    window.sync_legacy_perm_from_switches();
};

window.sync_legacy_perm_from_switches = function() {
    let role = document.getElementById('edit_rbac_role')?.value || 'k12';
    let legacyInput = document.getElementById('edit_rbac_legacy_perm');
    if (!legacyInput) return;

    let currentPerms = {};
    document.querySelectorAll('.rbac-perm-switch').forEach(sw => {
        currentPerms[sw.getAttribute('data-perm-key')] = sw.checked;
    });
    legacyInput.value = window.compute_legacy_perm_string(role, currentPerms);
};

window.toggle_rbac_subject_chip = function(key, isChecked) {
    if (key === 'ALL' && isChecked) {
        document.querySelectorAll('.rbac-subj-item-chk').forEach(chk => { chk.checked = false; });
    } else if (key !== 'ALL' && isChecked) {
        let allChk = document.getElementById('chk_subj_ALL');
        if (allChk) allChk.checked = false;
    }
};

// 7. LƯU TÀI KHOẢN CÁ NHÂN (CHỈ LƯU NHỮNG QUYỀN KHÁC VỚI ROLE GỐC VÀO OVERRIDES)
window.save_current_rbac_user = async function() {
    if (!window._rbacSelectedUser) return;

    let studentId = document.getElementById('edit_rbac_student_id')?.value?.trim();
    let password = document.getElementById('edit_rbac_password')?.value?.trim() || '123';
    let fullName = document.getElementById('edit_rbac_full_name')?.value?.trim();
    let role = document.getElementById('edit_rbac_role')?.value || 'k12';
    let nganhHoc = document.getElementById('edit_rbac_nganh_hoc')?.value?.trim() || null;
    let status = document.getElementById('edit_rbac_status')?.value || 'active';

    if (!studentId) return window.show_toast("⚠️ Vui lòng nhập Mã ID!", true);
    if (!fullName) return window.show_toast("⚠️ Vui lòng nhập Họ và tên!", true);

    let assignedSubjects = [];
    if (role !== 'k12') {
        if (document.getElementById('chk_subj_ALL')?.checked) {
            assignedSubjects = ['ALL'];
        } else {
            document.querySelectorAll('.rbac-subj-item-chk:checked').forEach(chk => {
                assignedSubjects.push(chk.value);
            });
        }
    }

    let rolePreset = window.RBAC_ROLE_PRESETS[role] || window.RBAC_ROLE_PRESETS.k12;
    let basePerms = rolePreset.permissions || {};
    let fullPermsObj = { ...basePerms };
    let overridesObj = {};

    // So sánh từng công tắc với quyền gốc của Role: chỉ những quyền chỉnh khác đi mới ghi vào overridesObj
    document.querySelectorAll('.rbac-perm-switch').forEach(sw => {
        let k = sw.getAttribute('data-perm-key');
        let val = sw.checked;
        fullPermsObj[k] = val;
        if (Boolean(basePerms[k]) !== val) {
            overridesObj[k] = val;
        }
    });

    let legacyPerm = window.compute_legacy_perm_string(role, fullPermsObj);

    let dbRowPayload = {
        student_id: studentId,
        password: password,
        full_name: fullName,
        role: role,
        nganh_hoc: nganhHoc,
        permissions: role === 'k12' ? '' : legacyPerm,
        status: status,
        assigned_subjects: assignedSubjects,
        rbac_config: {
            role: role,
            status: status,
            assigned_subjects: assignedSubjects,
            overrides: overridesObj,
            permissions: fullPermsObj,
            updated_at: new Date().toISOString()
        }
    };

    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        let { error } = await clientDb.from('users').upsert(dbRowPayload, { onConflict: 'student_id' });

        if (error) {
            let safePayload = {
                student_id: studentId,
                password: password,
                full_name: fullName,
                role: role,
                nganh_hoc: nganhHoc,
                permissions: role === 'k12' ? '' : legacyPerm
            };
            let retry = await clientDb.from('users').upsert(safePayload, { onConflict: 'student_id' });
            if (retry.error) throw retry.error;
        }

        let normalized = window.normalize_user_row_for_rbac(dbRowPayload);
        let idx = window._rbacUsersCache.findIndex(u => u.student_id === studentId);
        if (idx !== -1) window._rbacUsersCache[idx] = normalized;
        else window._rbacUsersCache.unshift(normalized);

        window._rbacSelectedUser = normalized;
        window.populate_tier_filter_dropdowns();
        window.render_rbac_user_list();
        window.render_rbac_detail_editor();
        window.show_toast(`✅ Đã lưu phân quyền cho ${fullName} (${studentId})!`);
    } catch (err) {
        window.show_toast("❌ Lỗi lưu vào bảng users: " + err.message, true);
    }
};

window.delete_rbac_user = async function(studentId) {
    if (!studentId || !confirm(`Xóa tài khoản "${studentId}" khỏi bảng users?`)) return;
    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        const { error } = await clientDb.from('users').delete().eq('student_id', studentId);
        if (error) throw error;

        window._rbacUsersCache = (window._rbacUsersCache || []).filter(u => u.student_id !== studentId);
        window._rbacSelectedUser = window._rbacUsersCache[0] || null;
        window.populate_tier_filter_dropdowns();
        window.render_rbac_user_list();
        window.render_rbac_detail_editor();
        window.show_toast(`🗑️ Đã xóa tài khoản ${studentId}`);
    } catch (e) {
        window.show_toast("❌ Lỗi xóa tài khoản: " + e.message, true);
    }
};

// 8. NHẬP LÔ EXCEL / TSV THEO CHUẨN ROLE GỐC
window.open_rbac_bulk_import_modal = function() {
    let subId = 'rbac_bulk_import_submodal';
    let old = document.getElementById(subId);
    if (old) old.remove();

    let roleOptionsHtml = Object.keys(window.RBAC_ROLE_PRESETS).map(rKey => {
        return `<option value="${rKey}">${window.RBAC_ROLE_PRESETS[rKey].label}</option>`;
    }).join('');

    let html = `
    <div id="${subId}" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style="background: rgba(0,0,0,0.82); z-index: 99999999;">
        <div class="rbac-card w-100" style="max-width: 650px; background: #1a1d20; border: 1px solid #38bdf8;">
            <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-secondary">
                <h6 class="fw-bold text-info mb-0"><i class="bi bi-file-earmark-spreadsheet-fill me-1"></i> NHẬP LÔ TÀI KHOẢN THEO ROLE GỐC</h6>
                <button class="btn-close btn-close-white" onclick="document.getElementById('${subId}').remove()"></button>
            </div>
            <div class="row g-2 mb-2">
                <div class="col-4">
                    <label class="text-white-50 small fw-bold">Gán vào Role</label>
                    <select id="bulk_rbac_role" class="form-select rbac-input-sm text-warning">${roleOptionsHtml}</select>
                </div>
                <div class="col-4">
                    <label class="text-white-50 small fw-bold">Mật khẩu mặc định</label>
                    <input type="text" id="bulk_rbac_default_pass" class="form-control rbac-input-sm" value="123">
                </div>
                <div class="col-4">
                    <label class="text-white-50 small fw-bold">Lớp / Bộ môn mặc định</label>
                    <input type="text" id="bulk_rbac_default_dept" class="form-control rbac-input-sm" placeholder="VD: KTXN, Dược...">
                </div>
            </div>
            <textarea id="bulk_rbac_tsv_text" class="form-control rbac-input-sm font-monospace" style="height: 150px !important;" placeholder="GV_MINH\tThS. Nguyễn Văn Minh\tBM Vi Sinh\n231001\tTrần Thị Ngọc\tKTXN"></textarea>
            <div class="d-flex justify-content-end gap-2 mt-2">
                <button class="btn btn-sm btn-secondary fw-bold px-3" onclick="document.getElementById('${subId}').remove()">Hủy</button>
                <button class="btn btn-sm btn-info fw-bold text-dark px-4" onclick="window.execute_rbac_bulk_import()">
                    <i class="bi bi-check2-all me-1"></i> Lưu hàng loạt
                </button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
};

window.execute_rbac_bulk_import = async function() {
    let raw = document.getElementById('bulk_rbac_tsv_text')?.value || '';
    let role = document.getElementById('bulk_rbac_role')?.value || 'k12';
    let defaultPass = document.getElementById('bulk_rbac_default_pass')?.value?.trim() || '123';
    let defaultDept = document.getElementById('bulk_rbac_default_dept')?.value?.trim() || '';
    let lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');

    if (lines.length === 0) return window.show_toast("⚠️ Vui lòng dán dữ liệu từ Excel!", true);

    let preset = window.RBAC_ROLE_PRESETS[role] || window.RBAC_ROLE_PRESETS.k12;
    let records = [];

    lines.forEach(line => {
        let parts = line.includes('\t') ? line.split('\t') : line.split(',');
        let uid = (parts[0] || '').trim();
        let name = (parts[1] || '').trim() || uid;
        let dept = (parts[2] || '').trim() || defaultDept;
        if (!uid) return;

        records.push({
            student_id: uid,
            password: defaultPass,
            full_name: name,
            role: role,
            nganh_hoc: dept,
            permissions: preset.legacyPermText || '',
            status: 'active',
            assigned_subjects: role === 'admin' ? ['ALL'] : [],
            rbac_config: {
                role: role,
                status: 'active',
                assigned_subjects: role === 'admin' ? ['ALL'] : [],
                overrides: {},
                permissions: { ...preset.permissions }
            }
        });
    });

    try {
        const clientDb = typeof db !== 'undefined' ? db : window._supabase;
        let { error } = await clientDb.from('users').upsert(records, { onConflict: 'student_id' });
        if (error) {
            let safeRecords = records.map(r => ({
                student_id: r.student_id, password: r.password, full_name: r.full_name,
                role: r.role, nganh_hoc: r.nganh_hoc, permissions: r.permissions
            }));
            let retry = await clientDb.from('users').upsert(safeRecords, { onConflict: 'student_id' });
            if (retry.error) throw retry.error;
        }
        document.getElementById('rbac_bulk_import_submodal')?.remove();
        await window.load_rbac_users_from_db();
        window.show_toast(`✅ Đã nhập ${records.length} tài khoản theo chuẩn Role "${preset.label}"!`);
    } catch (e) {
        window.show_toast("❌ Lỗi nhập hàng loạt: " + e.message, true);
    }
};