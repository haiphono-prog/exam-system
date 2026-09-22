// =========================================================================
// 🎬 MODULE LUYỆN NGHE REELS - ĐÓNG GÓI ĐỘC LẬP
// =========================================================================
window.currentReelsList = []; 
window.currentReelIndex = -1; 
window.ytPlayerInstance = null;
window.isYtApiReady = false;

window.onYouTubeIframeAPIReady = function() { window.isYtApiReady = true; };

(function loadYTApi() {
    if (window.YT && window.YT.Player) { window.isYtApiReady = true; return; }
    let tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api";
    let firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    else document.head.appendChild(tag);
})();

// 1. GỌI GIAO DIỆN REELS
window.openReelsModule = function() {
    if (typeof closePhanXaModule === 'function') closePhanXaModule(); // Cắt âm thanh phản xạ
    let wrapper = document.getElementById('reels_module_wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'reels_module_wrapper';
        wrapper.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 100005; overflow-y: auto; background-color: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px);';
        
        wrapper.innerHTML = `
        <style>
            .reels-container { max-width: 1000px; margin: 30px auto; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 20px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); overflow: hidden; color: #f8fafc; position: relative; }
            .reels-video-section { padding: 25px 20px 20px 20px; background: rgba(0, 0, 0, 0.3); border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center; }
            .reels-player-wrapper { width: 100%; max-width: 350px; height: 620px; margin: 0 auto 15px auto; background-color: #020617; border-radius: 16px; overflow: hidden; position: relative; display: flex; justify-content: center; align-items: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(56, 189, 248, 0.2); border: 1px solid rgba(255, 255, 255, 0.15); transform: translateZ(0); }
            .reels-nav-controls { display: flex; justify-content: center; align-items: center; gap: 15px; }
            .btn-reel-nav-text { background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 8px 22px; border-radius: 50px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.95rem; transition: 0.2s; }
            .btn-reel-nav-text:hover { background: rgba(56, 189, 248, 0.2); border-color: #38bdf8; color: #38bdf8; transform: translateY(-2px); }
            .reels-control-bar { display: flex; gap: 10px; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: nowrap; width: 100%; }
            .reels-control-bar select, .reels-control-bar input { padding: 10px; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 10px; background: rgba(0, 0, 0, 0.4); color: #fff; outline: none; }
            .reels-control-bar input { flex-grow: 1; }
            .btn-reel-icon { padding: 10px 16px; border-radius: 10px; color: white; border: none; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
            .btn-reel-icon:hover { transform: scale(1.05); }
            .reels-grid-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
            .reel-thumb-card { position: relative; aspect-ratio: 9/16; border-radius: 12px; overflow: hidden; background: #020617; border: 1px solid rgba(255, 255, 255, 0.1); cursor: pointer; transition: 0.2s; }
            .reel-thumb-card:hover { transform: translateY(-4px); border-color: #38bdf8; }
            .reel-thumb-card.active { border: 2px solid #38bdf8 !important; box-shadow: 0 0 15px rgba(56, 189, 248, 0.6); }
            .reel-thumb-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.85; transition: opacity 0.2s; }
            .reel-thumb-card:hover .reel-thumb-img { opacity: 1; }
            .reel-thumb-overlay { position: absolute; bottom: 0; left: 0; right: 0; top: 0; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 100%); display: flex; flex-direction: column; justify-content: space-between; padding: 8px; }
            .reel-platform-icon { font-size: 1.1rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)); }
            .reel-thumb-title { font-size: 0.78rem; font-weight: 600; color: #fff; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            .reel-play-btn-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 36px; height: 36px; border-radius: 50%; background: rgba(56, 189, 248, 0.85); color: #fff; display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.2s; }
            .reel-thumb-card:hover .reel-play-btn-overlay { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
            @media (max-width: 600px) { .reels-control-bar { flex-wrap: wrap; } .reels-control-bar select, .reels-control-bar input { width: 100%; } }
        </style>
        <div class="position-absolute" style="top: 15px; right: 20px; z-index: 100000;">
            <button class="btn-close btn-close-white shadow-none" style="background-color: rgba(255,255,255,0.2); border-radius: 50%; padding: 10px;" onclick="closeReelsModule()"></button>
        </div>
        <div class="reels-container">
            <div class="reels-video-section">
                <div class="reels-player-wrapper" id="playerWrapper">
                    <div id="videoContainer" style="width:100%; height:100%;"><div id="ytPlayerTarget" class="text-white-50 text-center p-4 w-100 h-100 d-flex flex-column justify-content-center align-items-center"><i class="bi bi-play-circle fs-1 text-info mb-2"></i><br>Đang khởi tạo Player...</div></div>
                </div>
                <div class="reels-nav-controls">
                    <button class="btn-reel-nav-text" onclick="window.playPrevReel()"><i class="bi bi-skip-backward-fill"></i> Trước</button>
                    <button class="btn-reel-nav-text" onclick="window.playNextReel()">Sau <i class="bi bi-skip-forward-fill"></i></button>
                </div>
            </div>
            <div class="mt-2 px-4 pb-4">
                <div class="reels-control-bar">
                    <select id="librarySelector" onchange="window.loadSavedReels()"><option value="reelscongdong">📚 Thư viện Cộng đồng</option></select>
                    <input type="text" id="reelUrl" placeholder="Dán link Youtube / TikTok / FB Reels..." onclick="this.select()">
                    <button class="btn-reel-icon" style="background: linear-gradient(135deg, #0284c7, #38bdf8);" onclick="window.loadReelVideo()"><i class="bi bi-play-fill fs-5"></i></button>
                    <button class="btn-reel-icon" style="background: linear-gradient(135deg, #d97706, #f59e0b);" onclick="window.openReelsModal()"><i class="bi bi-bookmark-star-fill"></i></button>
                </div>
                <div class="d-flex justify-content-between mb-2 px-1"><span class="text-white-50 fw-bold small text-uppercase"><i class="bi bi-grid-3x3-gap-fill text-info me-1"></i> Danh sách Clip</span><span id="reelTotalCount" class="badge bg-info bg-opacity-25 text-info border border-info border-opacity-25">0 clip</span></div>
                <div id="reelsListContainer" style="max-height: 280px; overflow-y: auto;" class="custom-scrollbar pr-1"></div>
            </div>
        </div>
        
        <div id="reelsSaveModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); z-index: 100005; justify-content: center; align-items: center;">
            <div style="background: rgba(30, 41, 59, 0.95); border: 1px solid #38bdf8; border-radius: 20px; padding: 25px; width: 90%; max-width: 400px; color: #fff;">
                <h5 style="color: #38bdf8; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;" class="fw-bold"><i class="bi bi-bookmark-plus me-2"></i>Lưu Clip Học Tập</h5>
                <div style="margin: 15px 0;"><label style="font-size: 13px; color: #cbd5e1; margin-bottom: 5px;">Tên clip mô tả:</label><input type="text" id="reelCustomName" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white;" placeholder="Nhập tên mô tả cho clip..."></div>
                <div id="reelsTargetList" style="margin: 15px 0;"></div>
                <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                    <button class="btn btn-info fw-bold text-white px-4" id="btnSubmitSave" onclick="window.submitSaveReels()">Xác nhận</button>
                    <button class="btn btn-outline-danger px-4" onclick="document.getElementById('reelsSaveModal').style.display='none'">Hủy</button>
                </div>
            </div>
        </div>`;
        document.body.appendChild(wrapper);
    }
    
    wrapper.style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('fab_menu_items').classList.add('d-none');
    window.loadSavedReels();
};

window.closeReelsModule = function() {
    let wrapper = document.getElementById('reels_module_wrapper');
    if (wrapper) wrapper.style.display = 'none';
    document.body.style.overflow = ''; 
    let container = document.getElementById('videoContainer');
    if (container) container.innerHTML = '';
    if (window.ytPlayerInstance) { try { window.ytPlayerInstance.destroy(); } catch(e){} window.ytPlayerInstance = null; }
};

// 2. LOGIC TẢI / PHÁT REELS (SUPABASE INTEGRATION)
window.loadSavedReels = async function() {
    let listContainer = document.getElementById('reelsListContainer');
    let countBadge = document.getElementById('reelTotalCount');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="text-center text-white-50 p-4"><span class="spinner-border spinner-border-sm me-2"></span>Đang tải danh sách clip...</div>';

    let fallbackData = [
        { title: "Cách tự học Tiếng Anh cực nhanh", url: "https://www.youtube.com/shorts/q2E9BqB1pS8" },
        { title: "Luyện nghe Tiếng Anh qua TED Talks", url: "https://www.youtube.com/watch?v=R2jZpYn7eJ8" }
    ];

    try {
        // 🌟 Đọc từ bảng questions thay vì bảng reels, lọc đúng type = 'reels'
        const { data, error } = await db.from('questions')
                                        .select('*')
                                        .eq('type', 'reels')
                                        .order('created_at', { ascending: false });
        if (error) throw error;
        
        // 🌟 Ánh xạ: lấy cột 'q' làm tên clip, cột 'multimedia' làm link clip
        let formattedData = (data && data.length > 0) ? data.map(item => ({
            title: item.q || "Clip Luyện Nghe",
            url: item.multimedia || ""
        })) : fallbackData;

        window.currentReelsList = formattedData; 
        if (countBadge) countBadge.innerText = window.currentReelsList.length + ' clip';

        if (window.currentReelsList.length === 0) {
            listContainer.innerHTML = '<div class="text-white-50 text-center p-4">Chưa có clip nào trong kho này.</div>';
            return;
        }

        let html = '<div class="reels-grid-list">';
        window.currentReelsList.forEach((reel, index) => {
            let displayTitle = reel.title.trim();
            let safeUrl = encodeURIComponent(reel.url);
            
            let thumbImg = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=300&auto=format&fit=crop';
            if(reel.url.includes('youtube') || reel.url.includes('youtu.be')) {
                let m = reel.url.match(/(?:v=|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                if(m) thumbImg = 'https://img.youtube.com/vi/' + m[1] + '/hqdefault.jpg';
            }

            html += `<div class="reel-thumb-card" onclick="window.playSavedReel('${safeUrl}', ${index})">
                        <img src="${thumbImg}" class="reel-thumb-img" alt="clip">
                        <div class="reel-thumb-overlay">
                            <div class="d-flex justify-content-between align-items-center"><i class="bi bi-play-circle text-info reel-platform-icon"></i></div>
                            <div class="reel-thumb-title">${displayTitle}</div>
                        </div>
                        <div class="reel-play-btn-overlay"><i class="bi bi-play-fill"></i></div>
                    </div>`;
        });
        listContainer.innerHTML = html + '</div>';
        setTimeout(() => window.playSavedReel(encodeURIComponent(window.currentReelsList[0].url), 0), 300);

    } catch (err) {
        listContainer.innerHTML = `<div class="text-danger text-center p-3">❌ Lỗi tải dữ liệu: ${err.message}</div>`;
    }
};

window.playSavedReel = function(encodedUrl, index) {
    if (typeof index === 'undefined') index = -1;
    window.currentReelIndex = index;
    
    let rawUrl = encodedUrl;
    try { rawUrl = decodeURIComponent(encodedUrl); } catch(e){}
    
    let inputEl = document.getElementById('reelUrl');
    if (inputEl) inputEl.value = rawUrl;

    // Active hiệu ứng card
    let allCards = document.querySelectorAll('.reel-thumb-card');
    allCards.forEach((card, idx) => {
        if (idx === index) card.classList.add('active');
        else card.classList.remove('active');
    });

    let container = document.getElementById('videoContainer');
    if (!container) return;
    
    // Dọn dẹp YouTube API thừa
    if (window.ytPlayerInstance) {
        try { if (typeof window.ytPlayerInstance.destroy === 'function') window.ytPlayerInstance.destroy(); } catch(err) {}
        window.ytPlayerInstance = null;
    }

    container.innerHTML = `<div class="text-white-50 text-center p-5 mt-5"><span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý link...</div>`;
    void container.offsetHeight;

    setTimeout(() => {
        let embedHtml = "";
        let fallbackHtml = `
            <div class="mt-3 text-center position-absolute bottom-0 w-100" style="z-index: 10;">
                <p class="small text-white-50 mb-1" style="text-shadow: 1px 1px 2px #000;">Nếu video đen/lỗi bản quyền:</p>
                <a href="${rawUrl}" target="_blank" class="btn btn-sm btn-outline-info rounded-pill px-3 shadow-lg" style="background: rgba(0,0,0,0.5);">
                    <i class="bi bi-box-arrow-up-right me-1"></i> Mở video gốc
                </a>
            </div>
        `;

        // 1. NHẬN DIỆN VÀ PLAY YOUTUBE (Dùng nocookie và origin chống lỗi Vercel)
        let ytMatch = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        if (!ytMatch) {
            let directMatch = rawUrl.match(/^([a-zA-Z0-9_-]{11})$/);
            if (directMatch) ytMatch = directMatch;
        }

        // 2. NHẬN DIỆN FACEBOOK REELS & VIDEO THƯỜNG
        let isFbReel = /facebook\.com\/reel\//i.test(rawUrl) || /facebook\.com\/[^/]+\/reels\//i.test(rawUrl);
        let isFbVideo = rawUrl.includes('facebook.com') || rawUrl.includes('fb.watch');

        // 3. NHẬN DIỆN TIKTOK (Chuyển sang chuẩn player/v1 mới nhất)
        let tkMatch = rawUrl.match(/tiktok\.com\/.*video\/(\d+)/);


        // --- BẮT ĐẦU RENDER IFRAME ---
        let domainOrigin = window.location.origin || "https://vercel.com";

        if (ytMatch) {
            embedHtml = `<iframe src="https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(domainOrigin)}" style="width:100%;height:100%;border:none;border-radius:12px;" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        
        } else if (isFbReel) {
            // FB Reel dùng thẻ post.php
            let fbUrl = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(rawUrl)}&show_text=false&width=315`;
            embedHtml = `<iframe src="${fbUrl}" style="width:100%;height:100%;border:none;overflow:hidden;border-radius:12px;" scrolling="no" frameborder="0" allowfullscreen="true" allow="clipboard-write; encrypted-media; picture-in-picture"></iframe>`;
            
        } else if (isFbVideo) {
            // FB Video thường
            let fbUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(rawUrl)}&show_text=false&width=315`;
            embedHtml = `<iframe src="${fbUrl}" style="width:100%;height:100%;border:none;overflow:hidden;border-radius:12px;" scrolling="no" frameborder="0" allowfullscreen="true" allow="clipboard-write; encrypted-media; picture-in-picture"></iframe>`;
            
        } else if (tkMatch) {
            // TIKTOK (Sửa lỗi sai url của bản GAS, bắt buộc dùng player/v1)
            embedHtml = `<iframe src="https://www.tiktok.com/player/v1/${tkMatch[1]}?controls=1&description=0&music_info=0" style="width:100%;height:100%;border:none;border-radius:12px;" allow="fullscreen" allowfullscreen title="TikTok video"></iframe>`;
        
        } else if (rawUrl.includes('instagram.com')) {
            // Bổ sung hỗ trợ instagram từ GAS cũ
            let igMatch = rawUrl.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
            if(igMatch) embedHtml = `<iframe src="https://www.instagram.com/reel/${igMatch[1]}/embed/" style="width:100%;height:100%;border:none;overflow:hidden;border-radius:12px;" scrolling="no" frameborder="0" allowfullscreen="true" allow="clipboard-write; encrypted-media; picture-in-picture"></iframe>`;
            else embedHtml = `<div class="text-white-50 text-center p-5 mt-5">Link Instagram không đúng định dạng.</div>`;
        } else {
            embedHtml = `<div class="text-white-50 text-center p-5 mt-5">Định dạng link chưa được hỗ trợ.</div>`;
        }

        container.innerHTML = embedHtml + fallbackHtml;

    }, 50); // Timeout ngắn tạo trải nghiệm mượt mà
};

window.playNextReel = function() {
    if (window.currentReelsList.length === 0) return;
    window.currentReelIndex = (window.currentReelIndex + 1) % window.currentReelsList.length; 
    window.playSavedReel(encodeURIComponent(window.currentReelsList[window.currentReelIndex].url), window.currentReelIndex);
};
window.playPrevReel = function() {
    if (window.currentReelsList.length === 0) return;
    window.currentReelIndex = (window.currentReelIndex - 1 + window.currentReelsList.length) % window.currentReelsList.length; 
    window.playSavedReel(encodeURIComponent(window.currentReelsList[window.currentReelIndex].url), window.currentReelIndex);
};

window.openReelsModal = function() {
    if (!window.current_student_id) return window.show_toast("⚠️ Bạn cần đăng nhập để lưu clip!", true);
    
    let urlInput = document.getElementById('reelUrl');
    if (!urlInput || !urlInput.value.trim()) return window.show_toast("⚠️ Dán link vào ô trước khi lưu nhé!", true);

    let targetList = document.getElementById("reelsTargetList");
    targetList.innerHTML = `<label style="display:block; margin: 10px 0;"><input type="checkbox" class="reels-target-cb" value="reels" checked> 📚 Thư viện Hệ thống (Supabase)</label>`;
    
    document.getElementById("reelsSaveModal").style.display = "flex";
};

window.submitSaveReels = async function() {
    let btnSubmit = document.getElementById("btnSubmitSave");
    btnSubmit.innerText = "Đang lưu..."; btnSubmit.disabled = true;

    let title = document.getElementById('reelCustomName').value.trim() || "Clip Luyện Nghe";
    let url = document.getElementById('reelUrl').value.trim();

    try {
        // 🌟 Lưu thẳng vào bảng questions với type = 'reels'
        const { error } = await db.from('questions').insert([{ 
            type: 'reels',
            q: title,              // Tên clip lưu vào cột q
            multimedia: url,       // Link clip lưu vào cột multimedia
            subject_key: window.current_subject || 'tienganh', // Thêm subject nếu có
            level: '1'
        }]);
        if (error) throw error;
        
        window.show_toast("✅ Lưu Clip thành công!");
        document.getElementById("reelsSaveModal").style.display = "none";
        window.loadSavedReels();
    } catch(err) {
        window.show_toast("❌ Lỗi khi lưu: " + err.message, true);
    } finally {
        btnSubmit.innerText = "Xác nhận"; btnSubmit.disabled = false;
    }
};