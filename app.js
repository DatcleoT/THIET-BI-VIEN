import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://iddadoxyxtgutjhaxloc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZGFkb3h5eHRndXRqaGF4bG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjI3NzgsImV4cCI6MjA4NTIzODc3OH0.7Hdzr0byvX-BXGsQkDpV46fzjXs7wSa2Fv4lz4GcGDA",
);

let currentProfile = null,
  selectedDevice = null,
  allDevices = [],
  allUsers = [];

const toast = (m, s = false) =>
  alert(`${s ? "Thành công:" : "Thông báo:"} ${m}`);
const toSafe = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase();

const cleanText = (str) => {
  if (!str) return "";
  return str
    .replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      "",
    )
    .trim();
};
const cleanStepLine = (str) => {
  let s = cleanText(str);
  s = s.replace(/^(Bước|BƯỚC|bước|step)\s*\d+[\s:\.\-\_]*\s*/i, "");
  return s.trim();
};

function updateStepBoxes(inputId, containerId, prefix) {
  const text = document.getElementById(inputId).value;
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  const container = document.getElementById(containerId);
  const currentCount = container.querySelectorAll(".step-up-box").length;

  if (lines.length === 0) {
    container.innerHTML =
      '<p style="font-size:12px; color:var(--text-muted); font-style:italic;">* Nhập quy trình vận hành để hệ thống cấp ô tải ảnh.</p>';
    return;
  }
  if (container.querySelector("p")) container.innerHTML = "";

  if (lines.length > currentCount) {
    for (let i = currentCount + 1; i <= lines.length; i++) {
      const d = document.createElement("div");
      d.className = "step-up-box";
      d.innerHTML = `<label style="font-size:11px; font-weight:700; color:var(--p); text-transform:uppercase;">Ảnh Bước ${i}</label>
                           <input type="file" id="${prefix}_${i}" accept="image/*" style="padding:6px; margin:4px 0 10px; font-size: 12px;"/>`;
      container.appendChild(d);
    }
  } else if (lines.length < currentCount) {
    for (let i = currentCount; i > lines.length; i--)
      container.lastChild.remove();
  }
}
document.getElementById("addSteps").oninput = () =>
  updateStepBoxes("addSteps", "dynamicAddSteps", "addStepImg");
document.getElementById("insStepsInput").oninput = () =>
  updateStepBoxes("insStepsInput", "dynamicEditSteps", "editStepImg");

async function initApp() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    try {
      let { data: p, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (!p || error) {
        p = {
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || "Thành viên",
          role: session.user.user_metadata?.role || "student",
        };
        await supabase.from("profiles").upsert([p]);
      }
      currentProfile = p;

      const safeName = p.full_name || "Khách";
      document.getElementById("userAvatarHeader").innerText = safeName
        .trim()
        .charAt(0)
        .toUpperCase();
      document.getElementById("userShortLabel").innerText = safeName
        .split(" ")
        .pop();
      document.getElementById("userNameFull").innerText = safeName;

      let roleText = "Sinh viên";
      if (p.role === "instructor") roleText = "Phụ trách Lab";
      if (p.role === "admin") roleText = "Quản trị viên";
      document.getElementById("userRoleBadge").innerText = roleText;

      if (p.role !== "student")
        document.getElementById("btnShowAddModal").classList.remove("hidden");
      if (p.role === "admin")
        document.getElementById("adminMenuSection").classList.remove("hidden");

      loadNotifications();

      nav("systemView");
      render("analyze");
    } catch (err) {
      await supabase.auth.signOut();
      nav("loginView");
    }
  } else nav("loginView");
}
initApp();

supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY")
    document.getElementById("changePassModal").classList.remove("hidden");
});

async function render(cat) {
  document.getElementById("deviceGrid").innerHTML =
    "<p style='text-align:center; width:100%; grid-column:1/-1; padding:50px; color:var(--text-muted);'>Đang tải hệ thống dữ liệu...</p>";
  const { data } = await supabase.from("devices").select("*").eq("cat", cat);
  allDevices = data || [];
  displayDevices(allDevices);
}

function displayDevices(list) {
  const grid = document.getElementById("deviceGrid");
  grid.innerHTML = list.length
    ? ""
    : "<p style='grid-column:1/-1; text-align:center; color: var(--text-muted); padding:50px;'>Chưa có dữ liệu thiết bị/phòng lab trong nhóm này.</p>";

  list.forEach((d) => {
    const safe = toSafe(d.name);
    const img = `https://iddadoxyxtgutjhaxloc.supabase.co/storage/v1/object/public/device-photos/${safe}.jpg?t=${Date.now()}`;

    let stHtml = "";
    if (d.cat === "ptn") {
      stHtml =
        '<i class="ph ph-buildings" style="margin-right:4px;"></i> Cơ sở vật chất';
    } else {
      if (d.status === "normal")
        stHtml = '<span class="status-dot dot-green"></span> Sẵn sàng';
      else if (d.status === "maintenance")
        stHtml = '<span class="status-dot dot-yellow"></span> Đang bảo trì';
      else stHtml = '<span class="status-dot dot-red"></span> Sự cố kỹ thuật';
    }

    const div = document.createElement("div");
    div.className = "device-card";

    // TRÁI TIM CỦA VIỆC PHÂN LUỒNG: Bấm vào PTN thì mở Wiki, bấm vào máy thì mở Timeline
    div.onclick = () => {
      if (d.cat === "ptn") {
        openPtnWikiModal(d);
      } else {
        openModal(d);
      }
    };

    div.innerHTML = `
          <img src="${img}" class="device-card-img" onerror="this.src='https://via.placeholder.com/150?text=NO+IMAGE'"/>
          <div class="device-card-body">
            <div style="margin-bottom: 12px;"><span class="tag">${stHtml}</span></div>
            <h3 style="margin: 0 0 8px; font-size: 16px;">${d.name}</h3>
            <p style="margin: 0 0 10px; font-size: 13px; color: var(--text-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${cleanText(d.description) || "Thông tin mô tả đang được cập nhật..."}</p>
            <div class="hust-card-footer">Truy cập dữ liệu <i class="ph ph-arrow-right" style="margin-left: 4px;"></i></div>
          </div>`;
    grid.appendChild(div);
  });
}

window.filterDevices = () => {
  const term = document.getElementById("searchDevice").value.toLowerCase();
  displayDevices(allDevices.filter((d) => d.name.toLowerCase().includes(term)));
};

// ==============================================================
// 1. HÀM MỞ BẢNG WIKI DÀNH CHO PHÒNG THÍ NGHIỆM (Y HỆT ẢNH WEB)
// ==============================================================
window.openPtnWikiModal = (d) => {
  selectedDevice = d; // Lưu lại để Edit/Delete nếu có quyền Admin
  document.getElementById("wTitle").innerText = d.name;

  let descText = cleanText(d.description) || "";
  let infoHtml = "";
  let introHtml = "";

  // Tách phần Vị trí và Giới thiệu dựa trên chữ GIỚI THIỆU CHUNG
  if (descText.includes("GIỚI THIỆU CHUNG:")) {
    let parts = descText.split("GIỚI THIỆU CHUNG:");
    let infoPart = parts[0].replace("VỊ TRÍ:", "").trim();

    let infoLines = infoPart.split("\n").filter((l) => l.trim() !== "");
    infoHtml = infoLines
      .map((l) => {
        let cleanL = l.replace(/^- /, "").trim();
        let splitIdx = cleanL.indexOf(":");
        if (splitIdx > -1) {
          let label = cleanL.substring(0, splitIdx + 1);
          let val = cleanL.substring(splitIdx + 1);
          return `<li><span style="color: var(--text-muted); margin-right: 5px;">•</span> <strong style="color: var(--text-main);">${label}</strong>${val}</li>`;
        } else {
          return `<li><span style="color: var(--text-muted); margin-right: 5px;">•</span> ${cleanL}</li>`;
        }
      })
      .join("");

    introHtml = parts[1].trim().replace(/\n/g, "<br/><br/>");
  } else {
    infoHtml = `<li><span style="color: var(--text-muted); margin-right: 5px;">•</span> <strong style="color: var(--text-main);">Tên phòng:</strong> ${d.name}</li>`;
    introHtml = descText.replace(/\n/g, "<br/><br/>");
  }

  document.getElementById("wInfo").innerHTML = infoHtml;
  document.getElementById("wIntro").innerHTML = introHtml;

  // Đổ danh sách bộ thí nghiệm ra gạch đầu dòng
  let stepsArray = (d.steps || "").split("\n").filter((l) => l.trim() !== "");
  document.getElementById("wList").innerHTML = stepsArray
    .map((s) => `<li style="margin-bottom: 8px;">${cleanStepLine(s)}</li>`)
    .join("");

  // Xử lý ảnh Cover cho PTN
  const safe = toSafe(d.name);
  const imgEl = document.getElementById("wImage");
  imgEl.src = `https://iddadoxyxtgutjhaxloc.supabase.co/storage/v1/object/public/device-photos/${safe}.jpg?t=${Date.now()}`;
  imgEl.style.display = "inline-block";
  imgEl.onerror = () => (imgEl.style.display = "none");

  // Mở đúng Modal của PTN, ẩn Modal máy móc
  document.getElementById("detailModal").classList.add("hidden");
  document.getElementById("ptnWikiModal").classList.remove("hidden");
};

// ==============================================================
// 2. HÀM MỞ BẢNG TIMELINE DÀNH CHO MÁY MÓC THIẾT BỊ
// ==============================================================
window.switchModalTab = (tabId) => {
  ["btnTabInfo", "btnTabLog", "btnTabEdit"].forEach((id) =>
    document.getElementById(id).classList.remove("active"),
  );
  ["mTabInfo", "mTabLog", "mTabEdit"].forEach((id) =>
    document.getElementById(id).classList.add("hidden"),
  );

  if (tabId === "info") {
    document.getElementById("btnTabInfo").classList.add("active");
    document.getElementById("mTabInfo").classList.remove("hidden");
  } else if (tabId === "log") {
    document.getElementById("btnTabLog").classList.add("active");
    document.getElementById("mTabLog").classList.remove("hidden");
    loadLogs();
    document.getElementById("logDate").valueAsDate = new Date();
  } else if (tabId === "edit") {
    document.getElementById("btnTabEdit").classList.add("active");
    document.getElementById("mTabEdit").classList.remove("hidden");
  }
};

window.openModal = (d) => {
  selectedDevice = d;
  document.getElementById("mTitle").innerText = d.name;

  const formatDesc = cleanText(d.description).replace(/\n/g, "<br/>");
  document.getElementById("mDesc").innerHTML =
    formatDesc || "Dữ liệu đang được cập nhật...";

  let stHtml = "";
  if (d.status === "normal")
    stHtml = '<span class="status-dot dot-green"></span> Sẵn sàng hoạt động';
  else if (d.status === "maintenance")
    stHtml =
      '<span class="status-dot dot-yellow"></span> Đang bảo trì / Kiểm định';
  else stHtml = '<span class="status-dot dot-red"></span> Tạm dừng do sự cố';
  document.getElementById("mStatusBadge").innerHTML = stHtml;

  // Vẽ Timeline dọc cho Máy
  const stepsArray = (d.steps || "").split("\n").filter((l) => l.trim() !== "");
  const stepsContainer = document.getElementById("mStepsContainer");
  stepsContainer.innerHTML = "";
  const ul = document.createElement("ul");
  ul.className = "premium-timeline";
  stepsArray.forEach((step, idx) => {
    const li = document.createElement("li");
    li.className = "premium-timeline-item";
    li.innerHTML = `<strong>Bước ${idx + 1}:</strong> ${cleanStepLine(step)}`;
    ul.appendChild(li);
  });
  stepsContainer.appendChild(ul);

  const safe = toSafe(d.name);
  document.getElementById("mImage").src =
    `https://iddadoxyxtgutjhaxloc.supabase.co/storage/v1/object/public/device-photos/${safe}.jpg?t=${Date.now()}`;

  const gallery = document.getElementById("mStepGallery");
  gallery.innerHTML = "";
  for (let i = 1; i <= 8; i++) {
    const img = document.createElement("img");
    img.src = `https://iddadoxyxtgutjhaxloc.supabase.co/storage/v1/object/public/device-photos/${safe}/step_${i}.jpg?t=${Date.now()}`;
    img.style.height = "60px";
    img.style.borderRadius = "6px";
    img.style.cursor = "pointer";
    img.style.border = "1px solid #e5e5e5";
    img.onerror = () => img.remove();
    img.onclick = () => window.open(img.src);
    gallery.appendChild(img);
  }

  const canEdit = currentProfile.role !== "student";
  document.getElementById("btnTabEdit").classList.toggle("hidden", !canEdit);

  if (canEdit) {
    document.getElementById("insInput").value = d.description || "";
    document.getElementById("insStepsInput").value = d.steps || "";
    document.getElementById("insStatus").value = d.status || "normal";
    updateStepBoxes("insStepsInput", "dynamicEditSteps", "editStepImg");
  }

  switchModalTab("info");
  // Mở đúng Modal Máy, ẩn Modal PTN
  document.getElementById("ptnWikiModal").classList.add("hidden");
  document.getElementById("detailModal").classList.remove("hidden");
};

window.closeModal = () => {
  document.getElementById("detailModal").classList.add("hidden");
};

// ==============================================================
// CHỨC NĂNG NHẬT KÝ, CẨM NANG, XÓA ẢNH VÀ QUẢN LÝ (GIỮ NGUYÊN)
// ==============================================================
window.loadLogs = async () => {
  const container = document.getElementById("logListContainer");
  container.innerHTML =
    "<p style='text-align:center; color:var(--text-muted); padding: 20px 0;'><i class='ph ph-spinner-gap ph-spin'></i> Đang kết nối sổ tay...</p>";
  const { data, error } = await supabase
    .from("device_logs")
    .select("*")
    .eq("device_id", selectedDevice.id)
    .order("usage_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error || !data || !data.length)
    return (container.innerHTML =
      "<div style='text-align:center; padding: 30px; color:var(--text-muted); font-size: 13px;'><i class='ph ph-file-dashed' style='font-size: 24px; display: block; margin-bottom: 10px;'></i> Chưa có dữ liệu ghi chép cho thiết bị này.</div>");
  container.innerHTML = "";
  data.forEach((log) => {
    const div = document.createElement("div");
    div.className = "log-item";
    const dateStr = log.usage_date
      ? new Date(log.usage_date).toLocaleDateString("vi-VN")
      : "N/A";
    const timeStr = `${log.start_time ? log.start_time.substring(0, 5) : "--"} đến ${log.end_time ? log.end_time.substring(0, 5) : "--"}`;
    div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <strong style="color: var(--text-main); font-size: 14px;"><i class="ph ph-user" style="color: #9ca3af; margin-right: 4px; vertical-align: middle;"></i> ${log.user_name || "Học viên"}</strong>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;"><i class="ph ph-clock" style="color: #9ca3af; margin-right: 4px; vertical-align: middle;"></i> Thời gian: ${dateStr} (${timeStr})</div>
                </div>
            </div>
            <div style="font-size: 13px; color: #374151; margin-top: 10px; background: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #f3f4f6;">
                <span style="font-weight: 700; color: #6b7280; font-size: 11px; text-transform: uppercase; margin-right: 5px;">Nội dung: </span> ${log.purpose || "Không có ghi chú bổ sung"}
            </div>`;
    container.appendChild(div);
  });
};

document.getElementById("btnSubmitLog").onclick = async () => {
  const date = document.getElementById("logDate").value,
    start = document.getElementById("logStart").value,
    end = document.getElementById("logEnd").value,
    purpose = document.getElementById("logPurpose").value;
  if (!date || !start || !end || !purpose)
    return toast("Vui lòng hoàn thiện biểu mẫu!");
  const btn = document.getElementById("btnSubmitLog");
  btn.disabled = true;
  btn.innerText = "ĐANG LƯU DỮ LIỆU...";
  const { error } = await supabase.from("device_logs").insert([
    {
      device_id: selectedDevice.id,
      user_id: currentProfile.id,
      user_name: currentProfile.full_name,
      usage_date: date,
      start_time: start,
      end_time: end,
      purpose: purpose,
    },
  ]);
  btn.disabled = false;
  btn.innerText = "LƯU VÀO SỔ TAY";
  if (error) toast(error.message);
  else {
    toast("Ghi nhận thành công!", true);
    document.getElementById("logPurpose").value = "";
    loadLogs();
  }
};

document.getElementById("btnViewSOP").onclick = () => {
  const content = document.getElementById("sopContent");
  content.innerHTML = "";
  document.getElementById("sopModal").classList.remove("hidden");
  if (!selectedDevice || !selectedDevice.steps)
    return (content.innerHTML =
      "<div style='text-align:center; padding: 50px 20px; color: var(--text-muted);'>Cẩm nang đang được soạn thảo.</div>");
  const lines = selectedDevice.steps.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0)
    return (content.innerHTML =
      "<div style='text-align:center; padding: 50px 20px; color: var(--text-muted);'>Cẩm nang đang được soạn thảo.</div>");

  const safeName = toSafe(selectedDevice.name);
  lines.forEach((t, i) => {
    const step = i + 1,
      div = document.createElement("div");
    div.className = "sop-step";
    div.innerHTML = `<div class="sop-step-num">${step}</div><div style="flex:1;"><b style="font-size: 15px;">Thao tác ${step}</b><p style="margin-top: 6px; line-height: 1.6; color: #374151;">${cleanStepLine(t)}</p></div><img src="https://iddadoxyxtgutjhaxloc.supabase.co/storage/v1/object/public/device-photos/${safeName}/step_${step}.jpg?t=${Date.now()}" class="sop-step-img" onerror="this.style.display='none'"/>`;
    content.appendChild(div);
  });
};

window.loadNotifications = async () => {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  const container = document.getElementById("notiList");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    document.getElementById("notiBadge").classList.add("hidden");
    container.innerHTML =
      "<div style='padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;'>Bạn đã đọc hết thông báo.</div>";
    return;
  }

  document.getElementById("notiBadge").classList.remove("hidden");
  data.forEach((n) => {
    const div = document.createElement("div");
    div.className = "noti-item";
    div.innerHTML = `
            <div style="font-weight: 700; color: var(--text-main); font-size: 13px; margin-bottom: 4px;">${n.title}</div>
            <div style="font-size: 12px; color: #4b5563; line-height: 1.4;">${n.message}</div>
            <div style="font-size: 10px; color: #9ca3af; margin-top: 6px;"><i class="ph ph-clock"></i> ${new Date(n.created_at).toLocaleDateString("vi-VN")}</div>
        `;
    container.appendChild(div);
  });
};

document.getElementById("btnSubmitFeedback").onclick = async () => {
  const subject = document.getElementById("fbSubject").value,
    content = document.getElementById("fbContent").value;
  if (!content.trim()) return toast("Vui lòng nhập nội dung chi tiết!");
  const btn = document.getElementById("btnSubmitFeedback");
  btn.disabled = true;
  btn.innerText = "ĐANG GỬI...";
  const { error } = await supabase.from("feedbacks").insert([
    {
      user_id: currentProfile.id,
      user_name: currentProfile.full_name,
      subject: subject,
      content: content,
    },
  ]);
  btn.disabled = false;
  btn.innerHTML =
    '<i class="ph ph-paper-plane-right" style="margin-right: 6px;"></i> GỬI PHẢN HỒI';
  if (error) toast(error.message);
  else {
    toast("Cảm ơn bạn! Góp ý đã được gửi đến Ban quản trị.", true);
    document.getElementById("fbContent").value = "";
    document.getElementById("feedbackModal").classList.add("hidden");
  }
};

window.loadAdminFeedbacks = async () => {
  const container = document.getElementById("feedbacksList");
  container.innerHTML =
    "<p style='color:var(--text-muted); padding: 20px;'><i class='ph ph-spinner-gap ph-spin'></i> Đang tải hòm thư...</p>";
  const { data, error } = await supabase
    .from("feedbacks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data || data.length === 0)
    return (container.innerHTML =
      "<div style='padding: 40px; text-align: center; background: white; border: 1px solid var(--border-color); border-radius: var(--radius); color: var(--text-muted);'><i class='ph ph-check-circle' style='font-size: 30px; color: #10b981; margin-bottom: 10px; display: block;'></i> Hòm thư hiện tại không có tin nhắn mới.</div>");
  container.innerHTML = "";
  data.forEach((fb) => {
    const div = document.createElement("div");
    div.className = "feedback-card";
    div.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f3f4f6; padding-bottom: 10px; margin-bottom: 5px;"><div><span class="tag" style="background: var(--p-light); color: var(--p); margin-bottom: 8px; display: inline-block;">${fb.subject}</span><strong style="display: block; color: var(--text-main); font-size: 15px;">${fb.user_name}</strong></div><div style="font-size: 12px; color: var(--text-muted);"><i class="ph ph-clock"></i> ${new Date(fb.created_at).toLocaleString("vi-VN")}</div></div><p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${fb.content}</p>`;
    container.appendChild(div);
  });
};

document.getElementById("btnBroadcastNoti").onclick = async () => {
  const title = document.getElementById("newNotiTitle").value,
    msg = document.getElementById("newNotiMsg").value;
  if (!title || !msg) return toast("Vui lòng điền đủ Tiêu đề và Nội dung!");
  const btn = document.getElementById("btnBroadcastNoti");
  btn.disabled = true;
  btn.innerText = "ĐANG PHÁT...";
  const { error } = await supabase
    .from("notifications")
    .insert([{ title: title, message: msg }]);
  btn.disabled = false;
  btn.innerHTML =
    '<i class="ph ph-paper-plane-tilt" style="margin-right: 6px;"></i> PHÁT TÍN HIỆU NGAY';
  if (error) toast(error.message);
  else {
    toast("Đã phát thông báo tới toàn hệ thống!", true);
    document.getElementById("newNotiTitle").value = "";
    document.getElementById("newNotiMsg").value = "";
    loadNotifications();
  }
};

window.loadAdminUsers = async () => {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");
  allUsers = data || [];
  document.getElementById("statTotal").innerText = allUsers.length;
  document.getElementById("statInstructor").innerText = allUsers.filter(
    (u) => u.role === "instructor",
  ).length;
  document.getElementById("statAdmin").innerText = allUsers.filter(
    (u) => u.role === "admin",
  ).length;
  window.filterUsers();
};
window.filterUsers = () => {
  const s = document.getElementById("searchUser").value.toLowerCase(),
    r = document.getElementById("filterRole").value,
    container = document.getElementById("adminUserList");
  container.innerHTML = "";
  allUsers
    .filter(
      (u) =>
        u.full_name.toLowerCase().includes(s) && (r === "all" || u.role === r),
    )
    .forEach((u) => {
      const isMe = u.id === currentProfile.id,
        div = document.createElement("div");
      div.className = "user-card";
      div.innerHTML = `
            <div style="display: flex; gap:15px; align-items:center;">
                <div class="user-avatar">${u.full_name.trim().charAt(0).toUpperCase()}</div>
                <div style="flex:1;">
                    <b style="font-size: 15px; color: var(--text-main);">${u.full_name}</b><br/>
                    <small style="color:var(--text-muted); font-family: monospace;">ID: ${u.id.substring(0, 8)}</small>
                </div>
            </div>
            <div style="border-top: 1px solid var(--border-color); padding-top: 15px;">
                <label style="font-size: 11px; color: #9ca3af; text-transform: uppercase;">Cấp quyền hệ thống</label>
                <select onchange="updateRole('${u.id}', this.value)" ${isMe ? "disabled" : ""} style="margin: 5px 0 0 0; background: #f9fafb;">
                    <option value="student" ${u.role === "student" ? "selected" : ""}>Sinh viên</option>
                    <option value="instructor" ${u.role === "instructor" ? "selected" : ""}>Phụ trách Lab</option>
                    <option value="admin" ${u.role === "admin" ? "selected" : ""}>Quản trị viên</option>
                </select>
            </div>`;
      container.appendChild(div);
    });
};
window.updateRole = async (uid, r) => {
  await supabase.from("profiles").update({ role: r }).eq("id", uid);
  toast("Cập nhật quyền thành công", true);
};

async function uploadFiles(namePrefix, textLines, filePrefix) {
  for (let i = 1; i <= textLines; i++) {
    const f = document.getElementById(`${filePrefix}_${i}`)?.files[0];
    if (f)
      await supabase.storage
        .from("device-photos")
        .upload(`${namePrefix}/step_${i}.jpg`, f, { upsert: true });
  }
}
document.getElementById("btnSubmitAdd").onclick = async () => {
  const name = document.getElementById("addName").value,
    cat = document.getElementById("addCat").value,
    steps = document.getElementById("addSteps").value;
  if (!name) return toast("Vui lòng nhập tên thiết bị.");
  document.getElementById("btnSubmitAdd").disabled = true;
  document.getElementById("btnSubmitAdd").innerText = "ĐANG TẢI LÊN...";
  await supabase.from("devices").insert([
    {
      name,
      cat,
      status: "normal",
      description: document.getElementById("addDesc").value,
      steps,
      created_by: currentProfile.id,
    },
  ]);
  const mainF = document.getElementById("addImgFile").files[0];
  if (mainF)
    await supabase.storage
      .from("device-photos")
      .upload(`${toSafe(name)}.jpg`, mainF, { upsert: true });
  await uploadFiles(
    toSafe(name),
    steps.split("\n").filter((l) => l.trim() !== "").length,
    "addStepImg",
  );
  alert("Khởi tạo thiết bị thành công!");
  location.reload();
};

document.getElementById("btnSaveUpdate").onclick = async () => {
  document.getElementById("btnSaveUpdate").disabled = true;
  document.getElementById("btnSaveUpdate").innerText = "ĐANG XỬ LÝ...";
  const newSteps = document.getElementById("insStepsInput").value;
  await supabase
    .from("devices")
    .update({
      description: document.getElementById("insInput").value,
      steps: newSteps,
      status: document.getElementById("insStatus").value,
    })
    .eq("id", selectedDevice.id);
  const mainF = document.getElementById("updateImgFile").files[0];
  if (mainF)
    await supabase.storage
      .from("device-photos")
      .upload(`${toSafe(selectedDevice.name)}.jpg`, mainF, { upsert: true });
  await uploadFiles(
    toSafe(selectedDevice.name),
    newSteps.split("\n").filter((l) => l.trim() !== "").length,
    "editStepImg",
  );
  alert("Dữ liệu đã được lưu trữ!");
  location.reload();
};

document.getElementById("btnDeleteDevice").onclick = async () => {
  if (
    confirm(
      "Hành động này sẽ xóa vĩnh viễn thiết bị khỏi cơ sở dữ liệu. Bạn xác nhận?",
    )
  ) {
    await supabase.from("devices").delete().eq("id", selectedDevice.id);
    location.reload();
  }
};

// HÀM XÓA ẢNH TRONG CHỈNH SỬA
if (document.getElementById("btnDeleteMainImg")) {
  document.getElementById("btnDeleteMainImg").onclick = async () => {
    if (!selectedDevice) return;
    if (
      confirm(
        "Bạn có chắc chắn muốn gỡ bỏ ảnh đại diện của thiết bị/phòng lab này khỏi hệ thống?",
      )
    ) {
      const btn = document.getElementById("btnDeleteMainImg");
      btn.disabled = true;
      btn.innerText = "ĐANG XÓA...";
      const safeName = toSafe(selectedDevice.name);
      const { error } = await supabase.storage
        .from("device-photos")
        .remove([`${safeName}.jpg`]);
      btn.disabled = false;
      btn.innerHTML =
        '<i class="ph ph-trash" style="margin-right: 6px; vertical-align: middle;"></i> Gỡ ảnh hiện tại';
      if (error) {
        toast(error.message);
      } else {
        toast("Đã xóa ảnh thành công!", true);
        document.getElementById("mImage").src =
          "https://via.placeholder.com/150?text=NO+IMAGE";
        document.getElementById("updateImgFile").value = "";
        render(selectedDevice.cat);
      }
    }
  };
}

document.getElementById("btnSignIn").onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: lEmail.value,
    password: lPass.value,
  });
  if (error) toast("Thông tin đăng nhập không chính xác.");
  else initApp();
};
document.getElementById("btnSignUp").onclick = async () => {
  const role = rRole.value,
    code = rSecurityCode.value;
  if (role !== "student" && code !== "SEP2026")
    return toast("Mã xác thực nội bộ không hợp lệ.");
  document.getElementById("btnSignUp").innerText = "ĐANG KIẾN TẠO...";
  const { data, error } = await supabase.auth.signUp({
    email: rEmail.value,
    password: rPass.value,
    options: { data: { full_name: rName.value, role: role } },
  });
  if (error) {
    toast(error.message);
    document.getElementById("btnSignUp").innerText = "ĐĂNG KÝ NGAY";
  } else {
    if (data?.user)
      await supabase
        .from("profiles")
        .upsert([{ id: data.user.id, full_name: rName.value, role: role }]);
    alert("Khởi tạo tài khoản thành công. Vui lòng đăng nhập.");
    nav("loginView");
  }
};
document.getElementById("btnLogOut").onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};
document.getElementById("btnReset").onclick = async () => {
  await supabase.auth.resetPasswordForEmail(
    document.getElementById("fEmail").value,
    { redirectTo: window.location.origin + window.location.pathname },
  );
  toast("Yêu cầu đã được gửi đến email.", true);
};
document.getElementById("btnSubmitSysPass").onclick = async () => {
  if (
    document.getElementById("sysNewPass").value !==
    document.getElementById("sysConfirmPass").value
  )
    return toast("Xác nhận mật khẩu không khớp.");
  await supabase.auth.updateUser({
    password: document.getElementById("sysNewPass").value,
  });
  toast("Thiết lập thành công.", true);
  location.reload();
};

document.getElementById("rRole").onchange = (e) =>
  document
    .getElementById("securityCodeWrapper")
    .classList.toggle("hidden", e.target.value === "student");

document.getElementById("userTrigger").onclick = (e) => {
  e.stopPropagation();
  document.getElementById("notiDropdown").classList.remove("show");
  document.getElementById("userDropdown").classList.toggle("show");
};
document.getElementById("notiTrigger").onclick = (e) => {
  e.stopPropagation();
  document.getElementById("userDropdown").classList.remove("show");
  document.getElementById("notiDropdown").classList.toggle("show");
  document.getElementById("notiBadge").classList.add("hidden");
};
window.onclick = () => {
  document.getElementById("userDropdown").classList.remove("show");
  document.getElementById("notiDropdown").classList.remove("show");
};

// ==============================================================
// KHẮC PHỤC LỖI TRẮNG MÀN HÌNH KHI BẤM "HỆ THỐNG 10 PHÒNG LAB"
// ==============================================================
document.querySelectorAll(".nav-btn").forEach((b) => {
  if (!b.dataset.cat) return;
  b.onclick = () => {
    document
      .querySelectorAll(".nav-btn[data-cat]")
      .forEach((x) => x.classList.remove("active"));
    b.classList.add("active");

    // Ẩn tất cả các Grid đi
    ["deviceGrid", "usersGrid", "feedbacksGrid", "broadcastGrid"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
      },
    );

    // Hiện lưới tương ứng
    if (b.dataset.cat === "users") {
      document.getElementById("usersGrid").classList.remove("hidden");
      loadAdminUsers();
    } else if (b.dataset.cat === "feedbacks") {
      document.getElementById("feedbacksGrid").classList.remove("hidden");
      loadAdminFeedbacks();
    } else if (b.dataset.cat === "broadcast") {
      document.getElementById("broadcastGrid").classList.remove("hidden");
    }
    // Tất cả các Menu còn lại (Nano, Analyze, PTN...) đều gọi render() để lấy từ SQL hiển thị ra Grid!
    else {
      document.getElementById("deviceGrid").classList.remove("hidden");
      render(b.dataset.cat);
    }
  };
});

window.nav = (id) => {
  ["loginView", "regView", "forgotView", "systemView", "authWrapper"].forEach(
    (v) => {
      const el = document.getElementById(v);
      if (el) el.classList.add("hidden");
    },
  );
  if (id === "loginView" || id === "regView" || id === "forgotView") {
    document.getElementById("authWrapper").classList.remove("hidden");
    document.getElementById(id).classList.remove("hidden");
  } else {
    document.getElementById(id).classList.remove("hidden");
  }
};
