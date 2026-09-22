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

    // 🌟 DỮ LIỆU MẪU (CHẠY KHI BẢNG SUPABASE TRỐNG HOẶC CHƯA TẠO)
    let fallbackData = [
        { title: "Cách tự học Tiếng Anh cực nhanh", url: "https://www.youtube.com/shorts/q2E9BqB1pS8" },
        { title: "Luyện nghe Tiếng Anh qua TED Talks", url: "https://www.youtube.com/watch?v=R2jZpYn7eJ8" }
    ];

    try {
        // Mặc định lấy từ bảng 'reels' trên Supabase
        const { data, error } = await db.from('reels').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        window.currentReelsList = (data && data.length > 0) ? data : fallbackData; 
        if (countBadge) countBadge.innerText = window.currentReelsList.length + ' clip';

        if (window.currentReelsList.length === 0) {
            listContainer.innerHTML = '<div class="text-white-50 text-center p-4">Chưa có clip nào trong kho này.</div>';
            return;
        }

        let html = '<div class="reels-grid-list">';
        window.currentReelsList.forEach((reel, index) => {
            let displayTitle = (reel.title || "Clip Luyện Nghe").trim();
            let safeUrl = encodeURIComponent(reel.url || "");
            
            // Xử lý Thumbnail giả lập tạm thời (Do file gốc quá dài, ta dùng Unsplash placeholder cho mượt)
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
        listContainer.innerHTML = `<div class="text-danger text-center p-3">❌ Lỗi tải dữ liệu từ Supabase</div>`;
    }
};

window.playSavedReel = function(encodedUrl, index) {
    window.currentReelIndex = index;
    let rawUrl = decodeURIComponent(encodedUrl);
    
    let inputEl = document.getElementById('reelUrl');
    if (inputEl) inputEl.value = rawUrl;

    document.querySelectorAll('.reel-thumb-card').forEach((card, idx) => {
        if (idx === index) card.classList.add('active'); else card.classList.remove('active');
    });

    let container = document.getElementById('videoContainer');
    if (window.ytPlayerInstance) { try { window.ytPlayerInstance.destroy(); } catch(err) {} window.ytPlayerInstance = null; }
    container.innerHTML = ''; void container.offsetHeight; 

    // Chèn iframe trực tiếp
    let ytMatch = rawUrl.match(/(?:v=|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
        container.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&playsinline=1" style="width:100%;height:100%;border:none;" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    } else if (rawUrl.includes('tiktok.com')) {
        let tkMatch = rawUrl.match(/video\/(\d+)/);
        if(tkMatch) container.innerHTML = `<iframe src="https://www.tiktok.com/embed/v2/${tkMatch[1]}" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>`;
    } else {
        container.innerHTML = `<div class="text-white-50 text-center p-5 mt-5">Link này chưa hỗ trợ nhúng trực tiếp.</div>`;
    }
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
        const { error } = await db.from('reels').insert([{ 
            title: title, url: url, 
            owner_id: window.current_student_id, 
            created_at: new Date().toISOString() 
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