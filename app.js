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
  return s.replace(/^(Bước|BƯỚC|bước|step)\s*\d+[\s:\.\-\_]*\s*/i, "").trim();
};

function updateStepBoxes(inputId, containerId, prefix, isEdit = false) {
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
      let deleteBtnHTML = isEdit
        ? `<button type="button" class="btn-outline" style="color: var(--danger); border: 1px solid var(--danger-light); padding: 6px 12px; border-radius: 6px; cursor: pointer; background: white;" onclick="deleteSpecificImage(${i})" title="Xóa ảnh hiện tại của Bước này"><i class="ph ph-trash" style="font-size: 16px;"></i></button>`
        : "";
      d.innerHTML = `<label style="font-size:11px; font-weight:700; color:var(--primary); text-transform:uppercase;">Ảnh Bước ${i}</label>
                     <div style="display: flex; gap: 8px; margin: 4px 0 10px;">
                        <input type="file" id="${prefix}_${i}" accept="image/*" style="padding:6px; margin:0; font-size: 12px; flex: 1;"/>
                        ${deleteBtnHTML}
                     </div>`;
      container.appendChild(d);
    }
  } else if (lines.length < currentCount) {
    for (let i = currentCount; i > lines.length; i--)
      container.lastChild.remove();
  }
}

document.getElementById("addSteps").oninput = () =>
  updateStepBoxes("addSteps", "dynamicAddSteps", "addStepImg", false);
document.getElementById("insStepsInput").oninput = () =>
  updateStepBoxes("insStepsInput", "dynamicEditSteps", "editStepImg", true);

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

      if (p.role !== "student") {
        document.getElementById("btnShowAddModal").classList.remove("hidden");
        document
          .getElementById("managerMenuSection")
          .classList.remove("hidden");
      }
      if (p.role === "admin")
        document.getElementById("adminMenuSection").classList.remove("hidden");

      loadNotifications();
      nav("systemView");

      // AUTO-OPEN DEVICE IF SCANNED FROM QR
      const urlParams = new URLSearchParams(window.location.search);
      const scanId = urlParams.get("device");
      await render("vat-ly-tu", scanId);
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

async function render(cat, forceOpenId = null) {
  document.getElementById("deviceGrid").innerHTML =
    "<p style='text-align:center; width:100%; grid-column:1/-1; padding:50px; color:var(--text-muted);'>Đang tải hệ thống dữ liệu...</p>";

  const { data } = await supabase.from("devices").select("*");
  allDevices = data || [];

  if (forceOpenId) {
    const scannedDevice = allDevices.find((x) => x.id === forceOpenId);
    if (scannedDevice) {
      if (scannedDevice.name.toLowerCase().includes("ptn"))
        window.openPtnWikiModal(scannedDevice);
      else window.openDeviceModal(scannedDevice);
    }
    window.history.pushState({}, document.title, window.location.pathname);
  }
  filterAndDisplayByCat(cat);
}

function filterAndDisplayByCat(cat) {
  let list = [];
  if (cat === "ptn")
    list = allDevices.filter((d) => d.name.toLowerCase().includes("ptn"));
  else
    list = allDevices.filter(
      (d) => d.cat === cat && !d.name.toLowerCase().includes("ptn"),
    );

  displayDevices(list);
}

function displayDevices(list) {
  const grid = document.getElementById("deviceGrid");
  grid.innerHTML = list.length
    ? ""
    : "<p style='grid-column:1/-1; text-align:center; color: var(--text-muted); padding:50px;'>Chưa có dữ liệu thiết bị/phòng lab trong nhóm này.</p>";

  window.triggerModal = (deviceId) => {
    const d = allDevices.find((x) => x.id == deviceId);
    if (!d) return;
    const isLab = d.name.toLowerCase().includes("ptn");
    if (isLab) window.openPtnWikiModal(d);
    else window.openDeviceModal(d);
  };

  list.forEach((d) => {
    const safe = toSafe(d.name);
    const img = `https://iddadoxyxtgutjhaxloc.supabase.co/storage/v1/object/public/device-photos/${safe}.jpg?t=${Date.now()}`;
    const isLab = d.name.toLowerCase().includes("ptn");

    let stHtml = "";
    let tagClass = "tag-normal";

    if (isLab) {
      stHtml =
        '<i class="ph ph-buildings" style="margin-right:4px;"></i> Cơ sở vật chất';
      tagClass = "tag-lab";
    } else {
      if (d.status === "normal") {
        stHtml =
          '<i class="ph ph-check-circle" style="margin-right:4px;"></i> Sẵn sàng';
        tagClass = "tag-normal";
      } else if (d.status === "maintenance") {
        stHtml =
          '<i class="ph ph-wrench" style="margin-right:4px;"></i> Đang bảo trì';
        tagClass = "tag-maintenance";
      } else {
        stHtml =
          '<i class="ph ph-warning-circle" style="margin-right:4px;"></i> Sự cố kỹ thuật';
        tagClass = "tag-broken";
      }
    }

    const div = document.createElement("div");
    div.className = "device-card";
    div.setAttribute("onclick", `triggerModal('${d.id}')`);

    div.innerHTML = `
  <img src="${img}" class="device-card-img" onerror="this.onerror=null; this.src='https://placehold.co/400x200/e2e8f0/64748b?text=Chua+co+anh'"/>
  <div class="device-card-body">
        <div>
          <div style="margin-bottom: 12px;">
             <span class="tag ${tagClass}">${stHtml}</span>
          </div>
          <h3 style="margin: 0 0 8px; font-size: 16px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${d.name}</h3>
        </div>
        <div class="card-action-text">
            TÌM HIỂU THÊM <i class="ph ph-arrow-right"></i>
        </div>
      </div>
    `;
    grid.appendChild(div);
  });
}

window.filterDevices = () => {
  const term = document.getElementById("searchDevice").value.toLowerCase();
  const currentCat = document.querySelector(".nav-btn.active").dataset.cat;

  let baseList = [];
  if (currentCat === "ptn")
    baseList = allDevices.filter((d) => d.name.toLowerCase().includes("ptn"));
  else
    baseList = allDevices.filter(
      (d) => d.cat === currentCat && !d.name.toLowerCase().includes("ptn"),
    );

  displayDevices(baseList.filter((d) => d.name.toLowerCase().includes(term)));
};

// MỞ WIKI PTN
window.openPtnWikiModal = (d) => {
  selectedDevice = d;
  document.getElementById("wTitle").innerText = d.name;

  let descText = cleanText(d.description) || "";
  let infoHtml = "";
  let introHtml = "";

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
  let stepsArray = (d.steps || "").split("\n").filter((l) => l.trim() !== "");
  document.getElementById("wList").innerHTML = stepsArray
    .map((s) => `<li style="margin-bottom: 8px;">${cleanStepLine(s)}</li>`)
    .join("");

  const safe = toSafe(d.name);
  const imgEl = document.getElementById("wImage");
  imgEl.src = `https://iddadoxyxtgutjhaxloc.supabase.co/storage/v1/object/public/device-photos/${safe}.jpg?t=${Date.now()}`;
  imgEl.style.display = "inline-block";
  imgEl.onerror = () => (imgEl.style.display = "none");

  document.getElementById("detailModal").classList.add("hidden");
  document.getElementById("ptnWikiModal").classList.remove("hidden");
};

// CÁC TAB CỦA MÁY MÓC
window.switchModalTab = (tabId) => {
  ["btnTabInfo", "btnTabBooking", "btnTabLog", "btnTabEdit"].forEach((id) =>
    document.getElementById(id).classList.remove("active"),
  );
  ["mTabInfo", "mTabBooking", "mTabLog", "mTabEdit"].forEach((id) =>
    document.getElementById(id).classList.add("hidden"),
  );

  if (tabId === "info") {
    document.getElementById("btnTabInfo").classList.add("active");
    document.getElementById("mTabInfo").classList.remove("hidden");
  } else if (tabId === "booking") {
    document.getElementById("btnTabBooking").classList.add("active");
    document.getElementById("mTabBooking").classList.remove("hidden");
    loadBookings();
    document.getElementById("bookDate").valueAsDate = new Date();
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

window.openDeviceModal = (d) => {
  selectedDevice = d;
  document.getElementById("mTitle").innerText = d.name;

  const qrBaseUrl = window.location.origin + window.location.pathname;
  const qrTarget = `${qrBaseUrl}?device=${d.id}`;
  document.getElementById("qrCodeImg").src =
    `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrTarget)}`;

  const formatDesc = cleanText(d.description).replace(/\n/g, "<br/>");
  document.getElementById("mDesc").innerHTML =
    formatDesc || "Dữ liệu đang được cập nhật...";

  let stHtml = "";
  let tagClass = "tag-normal";
  if (d.status === "normal") {
    stHtml =
      '<i class="ph ph-check-circle" style="margin-right:4px;"></i> Sẵn sàng hoạt động';
    tagClass = "tag-normal";
  } else if (d.status === "maintenance") {
    stHtml =
      '<i class="ph ph-wrench" style="margin-right:4px;"></i> Đang bảo trì / Kiểm định';
    tagClass = "tag-maintenance";
  } else {
    stHtml =
      '<i class="ph ph-warning-circle" style="margin-right:4px;"></i> Tạm dừng do sự cố';
    tagClass = "tag-broken";
  }

  document.getElementById("mStatusBadge").className = `tag ${tagClass}`;
  document.getElementById("mStatusBadge").innerHTML = stHtml;

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
    img.style.cursor = "zoom-in";
    img.style.border = "1px solid var(--border-color)";
    img.onerror = () => img.remove();
    gallery.appendChild(img);
  }

  const canEdit = currentProfile && currentProfile.role !== "student";
  document.getElementById("btnTabEdit").classList.toggle("hidden", !canEdit);

  if (canEdit) {
    document.getElementById("insInput").value = d.description || "";
    document.getElementById("insStepsInput").value = d.steps || "";
    document.getElementById("insStatus").value = d.status || "normal";
    const catInput = document.getElementById("insCat");
    if (catInput) catInput.value = d.cat || "vat-ly-tu";
    updateStepBoxes("insStepsInput", "dynamicEditSteps", "editStepImg", true);
  }

  switchModalTab("info");
  document.getElementById("ptnWikiModal").classList.add("hidden");
  document.getElementById("detailModal").classList.remove("hidden");
};

window.closeModal = () =>
  document.getElementById("detailModal").classList.add("hidden");

// ================= LỊCH ĐẶT MÁY (CÁ NHÂN) ===================
window.loadBookings = async () => {
  const container = document.getElementById("bookingListContainer");
  container.innerHTML =
    "<p style='text-align:center; color:var(--text-muted); padding: 20px 0;'><i class='ph ph-spinner-gap ph-spin'></i> Đang tải lịch đăng ký...</p>";

  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("device_bookings")
    .select("*")
    .eq("device_id", selectedDevice.id)
    .gte("booking_date", today)
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error || !data || !data.length)
    return (container.innerHTML =
      "<div style='text-align:center; padding: 30px; color:var(--text-muted); font-size: 13px;'><i class='ph ph-calendar-blank' style='font-size: 24px; display: block; margin-bottom: 10px;'></i> Chưa có ai đặt lịch sắp tới. Máy đang rảnh!</div>");

  container.innerHTML = "";
  data.forEach((b) => {
    const div = document.createElement("div");
    div.className = "log-item";
    div.style.borderLeft = "3px solid var(--primary)";
    const dateStr = new Date(b.booking_date).toLocaleDateString("vi-VN");
    const timeStr = `${b.start_time ? b.start_time.substring(0, 5) : "--"} đến ${b.end_time ? b.end_time.substring(0, 5) : "--"}`;
    div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <strong style="color: var(--primary); font-size: 14px;"><i class="ph ph-calendar-check" style="margin-right: 4px; vertical-align: middle;"></i> Ngày: ${dateStr} | ${timeStr}</strong>
                    <div style="font-size: 13px; color: var(--text-main); margin-top: 6px; font-weight: 600;"><i class="ph ph-user" style="color: #9ca3af; margin-right: 4px; vertical-align: middle;"></i> Người đặt: ${b.user_name}</div>
                </div>
            </div>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 10px; background: var(--bg-body); padding: 10px; border-radius: 6px; border: 1px dashed var(--border-color);">
                <span style="color: #9ca3af; font-size: 11px; text-transform: uppercase;">Mục đích: </span> ${b.purpose || "Nghiên cứu"}
            </div>`;
    container.appendChild(div);
  });
};

document.getElementById("btnSubmitBooking").onclick = async () => {
  const date = document.getElementById("bookDate").value,
    start = document.getElementById("bookStart").value,
    end = document.getElementById("bookEnd").value,
    purpose = document.getElementById("bookPurpose").value;
  if (!date || !start || !end || !purpose)
    return toast("Vui lòng điền đủ thông tin đặt lịch!");

  const btn = document.getElementById("btnSubmitBooking");
  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> ĐANG ĐĂNG KÝ...';
  const { error } = await supabase.from("device_bookings").insert([
    {
      device_id: selectedDevice.id,
      user_id: currentProfile.id,
      user_name: currentProfile.full_name,
      booking_date: date,
      start_time: start,
      end_time: end,
      purpose: purpose,
    },
  ]);
  btn.disabled = false;
  btn.innerText = "XÁC NHẬN ĐẶT LỊCH";

  if (error) toast(error.message);
  else {
    toast("Đăng ký giữ chỗ thành công!", true);
    document.getElementById("bookPurpose").value = "";
    loadBookings();
  }
};

window.loadAllBookings = async () => {
  const container = document.getElementById("allBookingsList");
  container.innerHTML =
    "<p style='color:var(--text-muted);'>Đang tải dữ liệu lịch đặt...</p>";

  const filterDate = document.getElementById("filterBookingDate").value;
  let query = supabase
    .from("device_bookings")
    .select("*, devices(name)")
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (filterDate) query = query.eq("booking_date", filterDate);
  else {
    const today = new Date().toISOString().split("T")[0];
    query = query.gte("booking_date", today);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0)
    return (container.innerHTML =
      "<div style='background: var(--bg-surface); padding: 30px; text-align: center; border-radius: var(--radius-lg); border: 1px solid var(--border-color); color: var(--text-muted);'><p>Hệ thống hiện không có lịch đặt chỗ nào sắp tới.</p></div>");

  container.innerHTML = "";
  const todayStr = new Date().toISOString().split("T")[0];

  data.forEach((b) => {
    const isPast = new Date(b.booking_date) < new Date(todayStr);
    const div = document.createElement("div");
    div.style = `background: var(--bg-surface); padding: 20px; border-radius: var(--radius-sm); border: 1px solid ${isPast ? "var(--border-color)" : "var(--primary-light)"}; opacity: ${isPast ? "0.7" : "1"}; display: flex; justify-content: space-between; align-items: flex-start; transition: var(--transition);`;
    const deviceName = b.devices ? b.devices.name : "Thiết bị đã gỡ bỏ";
    const dateStr = new Date(b.booking_date).toLocaleDateString("vi-VN");

    div.innerHTML = `
          <div>
              <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
                  <span class="tag tag-lab">${deviceName}</span>
                  <span style="font-size: 13px; font-weight: bold; color: ${isPast ? "var(--text-muted)" : "var(--success)"};">${dateStr} | ${b.start_time.substring(0, 5)} - ${b.end_time.substring(0, 5)}</span>
              </div>
              <h5 style="margin: 0 0 5px 0; font-size: 15px; color: var(--text-main);"><i class="ph ph-user" style="color: var(--text-muted); margin-right: 5px;"></i>${b.user_name}</h5>
              <p style="margin: 0; font-size: 13px; color: var(--text-muted);"><strong style="text-transform: uppercase; font-size: 11px;">Mục đích:</strong> ${b.purpose}</p>
          </div>
          <button onclick="cancelBooking('${b.id}')" class="btn-outline" style="color: var(--danger); border-color: var(--danger-light); padding: 8px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: bold;">
              <i class="ph ph-x-circle" style="font-size: 16px;"></i> HỦY LỊCH
          </button>
      `;
    container.appendChild(div);
  });
};

window.cancelBooking = async (id) => {
  if (confirm("Xác nhận hủy lịch đăng ký này khỏi hệ thống?")) {
    const { error } = await supabase
      .from("device_bookings")
      .delete()
      .eq("id", id);
    if (error) toast(error.message);
    else {
      toast("Đã hủy lịch thành công!", true);
      loadAllBookings();
    }
  }
};

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
    div.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: flex-start;"><div><strong style="color: var(--text-main); font-size: 14px;"><i class="ph ph-user" style="color: #9ca3af; margin-right: 4px; vertical-align: middle;"></i> ${log.user_name || "Học viên"}</strong><div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;"><i class="ph ph-clock" style="color: #9ca3af; margin-right: 4px; vertical-align: middle;"></i> Thời gian: ${dateStr} (${timeStr})</div></div></div><div style="font-size: 13px; color: var(--text-muted); margin-top: 10px; background: var(--bg-body); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);"><span style="font-weight: 700; color: #6b7280; font-size: 11px; text-transform: uppercase; margin-right: 5px;">Nội dung: </span> ${log.purpose || "Không có ghi chú bổ sung"}</div>`;
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
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> ĐANG LƯU...';
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
  btn.innerText = "GHI SỔ TAY";
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
    div.style =
      "margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);";
    div.innerHTML = `<div style="font-weight: 800; color: var(--primary); font-size: 14px; text-transform: uppercase; margin-bottom: 8px;">BƯỚC ${step}</div><p style="margin-bottom: 15px; line-height: 1.6; color: var(--text-main); font-size: 15px;">${cleanStepLine(t)}</p><img src="https://iddadoxyxtgutjhaxloc.supabase.co/storage/v1/object/public/device-photos/${safeName}/step_${step}.jpg?t=${Date.now()}" style="max-width: 100%; border-radius: 8px; cursor: zoom-in; box-shadow: var(--shadow-sm);" onerror="this.style.display='none'"/>`;
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
    return (container.innerHTML =
      "<div style='padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;'>Bạn đã đọc hết thông báo.</div>");
  }
  document.getElementById("notiBadge").classList.remove("hidden");
  data.forEach((n) => {
    const div = document.createElement("div");
    div.className = "noti-item";
    div.style =
      "padding: 12px 20px; border-bottom: 1px solid var(--border-color);";
    div.innerHTML = `<div style="font-weight: 700; color: var(--text-main); font-size: 13px; margin-bottom: 4px;">${n.title}</div><div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">${n.message}</div><div style="font-size: 10px; color: #9ca3af; margin-top: 6px;"><i class="ph ph-clock"></i> ${new Date(n.created_at).toLocaleDateString("vi-VN")}</div>`;
    container.appendChild(div);
  });
};

document.getElementById("btnSubmitFeedback").onclick = async () => {
  const subject = document.getElementById("fbSubject").value,
    content = document.getElementById("fbContent").value;
  if (!content.trim()) return toast("Vui lòng nhập nội dung chi tiết!");
  const btn = document.getElementById("btnSubmitFeedback");
  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> ĐANG GỬI...';
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
      "<div style='padding: 40px; text-align: center; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); color: var(--text-muted);'><i class='ph ph-check-circle' style='font-size: 30px; color: var(--success); margin-bottom: 10px; display: block;'></i> Hòm thư hiện tại không có tin nhắn mới.</div>");
  container.innerHTML = "";
  data.forEach((fb) => {
    const div = document.createElement("div");
    div.className = "feedback-card";
    div.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 5px;"><div><span class="tag tag-normal" style="margin-bottom: 8px;">${fb.subject}</span><strong style="display: block; color: var(--text-main); font-size: 15px;">${fb.user_name}</strong></div><div style="font-size: 12px; color: var(--text-muted);"><i class="ph ph-clock"></i> ${new Date(fb.created_at).toLocaleString("vi-VN")}</div></div><p style="margin: 0; font-size: 14px; color: var(--text-muted); line-height: 1.6; white-space: pre-wrap; margin-top: 10px;">${fb.content}</p>`;
    container.appendChild(div);
  });
};

document.getElementById("btnBroadcastNoti").onclick = async () => {
  const title = document.getElementById("newNotiTitle").value,
    msg = document.getElementById("newNotiMsg").value;
  if (!title || !msg) return toast("Vui lòng điền đủ Tiêu đề và Nội dung!");
  const btn = document.getElementById("btnBroadcastNoti");
  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> ĐANG PHÁT...';
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
      div.innerHTML = `<div style="display: flex; gap:15px; align-items:center; justify-content: space-between;"><div style="display: flex; gap:15px; align-items:center;"><div class="user-avatar">${u.full_name.trim().charAt(0).toUpperCase()}</div><div><b style="font-size: 15px; color: var(--text-main);">${u.full_name}</b><br/><small style="color:var(--text-muted); font-family: monospace;">ID: ${u.id.substring(0, 8)}</small></div></div>${!isMe ? `<button onclick="deleteUserProfile('${u.id}')" title="Xóa người dùng" class="btn-outline" style="color: var(--danger); border-color: var(--danger-light); padding: 8px 12px; border-radius: 6px;"><i class="ph ph-trash" style="font-size: 16px;"></i></button>` : ""}</div><div style="border-top: 1px solid var(--border-color); padding-top: 15px; margin-top: 15px;"><label style="font-size: 11px; color: #9ca3af; text-transform: uppercase;">Cấp quyền hệ thống</label><select onchange="updateRole('${u.id}', this.value)" ${isMe ? "disabled" : ""} style="margin: 5px 0 0 0; background: var(--bg-body);"><option value="student" ${u.role === "student" ? "selected" : ""}>Sinh viên</option><option value="instructor" ${u.role === "instructor" ? "selected" : ""}>Phụ trách Lab</option><option value="admin" ${u.role === "admin" ? "selected" : ""}>Quản trị viên</option></select></div>`;
      container.appendChild(div);
    });
};

window.updateRole = async (uid, r) => {
  await supabase.from("profiles").update({ role: r }).eq("id", uid);
  toast("Cập nhật quyền thành công", true);
};

window.deleteUserProfile = async (uid) => {
  if (
    confirm("Bạn có chắc chắn muốn xóa hồ sơ người dùng này khỏi hệ thống?")
  ) {
    const { error } = await supabase.from("profiles").delete().eq("id", uid);
    if (error) toast(error.message);
    else {
      toast("Đã xóa người dùng thành công!", true);
      loadAdminUsers();
    }
  }
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
  document.getElementById("btnSubmitAdd").innerHTML =
    '<i class="ph ph-spinner-gap ph-spin"></i> ĐANG TẢI LÊN...';
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
  document.getElementById("btnSaveUpdate").innerHTML =
    '<i class="ph ph-spinner-gap ph-spin"></i> ĐANG XỬ LÝ...';
  const newSteps = document.getElementById("insStepsInput").value;
  const catInput = document.getElementById("insCat");
  const updateData = {
    description: document.getElementById("insInput").value,
    steps: newSteps,
    status: document.getElementById("insStatus").value,
  };
  if (catInput) updateData.cat = catInput.value;
  await supabase.from("devices").update(updateData).eq("id", selectedDevice.id);
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
  if (confirm("Xóa vĩnh viễn thiết bị khỏi cơ sở dữ liệu?")) {
    await supabase.from("devices").delete().eq("id", selectedDevice.id);
    location.reload();
  }
};

if (document.getElementById("btnDeleteMainImg")) {
  document.getElementById("btnDeleteMainImg").onclick = async () => {
    if (!selectedDevice) return;
    if (confirm("Gỡ bỏ ảnh đại diện này?")) {
      const btn = document.getElementById("btnDeleteMainImg");
      btn.disabled = true;
      btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> ĐANG XÓA...';
      const { error } = await supabase.storage
        .from("device-photos")
        .remove([`${toSafe(selectedDevice.name)}.jpg`]);
      btn.disabled = false;
      btn.innerHTML =
        '<i class="ph ph-trash" style="margin-right: 6px; vertical-align: middle;"></i> Gỡ ảnh hiện tại';
      if (error) toast(error.message);
      else {
        toast("Đã xóa ảnh!", true);
        document.getElementById("mImage").src =
          "https://via.placeholder.com/150?text=NO+IMAGE";
        document.getElementById("updateImgFile").value = "";
        const isLab = selectedDevice.name.toLowerCase().includes("ptn");
        if (isLab) openPtnWikiModal(selectedDevice);
        else openDeviceModal(selectedDevice);
      }
    }
  };
}

window.deleteSpecificImage = async (stepIndex) => {
  if (!selectedDevice) return;
  if (confirm(`Gỡ bỏ ảnh Bước ${stepIndex}?`)) {
    const { error } = await supabase.storage
      .from("device-photos")
      .remove([`${toSafe(selectedDevice.name)}/step_${stepIndex}.jpg`]);
    if (error) toast("Lỗi: " + error.message);
    else {
      toast(`Đã xóa ảnh Bước ${stepIndex}!`, true);
      const fileInput = document.getElementById(`editStepImg_${stepIndex}`);
      if (fileInput) fileInput.value = "";
      const isLab = selectedDevice.name.toLowerCase().includes("ptn");
      if (isLab) openPtnWikiModal(selectedDevice);
      else openDeviceModal(selectedDevice);
    }
  }
};

document.getElementById("btnSignIn").onclick = async () => {
  const emailVal = document.getElementById("lEmail").value;
  const passVal = document.getElementById("lPass").value;
  if (!emailVal || !passVal) return toast("Vui lòng nhập Email và Mật khẩu!");
  const btn = document.getElementById("btnSignIn");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> ĐANG XỬ LÝ...';
  btn.disabled = true;
  const { error } = await supabase.auth.signInWithPassword({
    email: emailVal,
    password: passVal,
  });
  btn.innerHTML = originalText;
  btn.disabled = false;
  if (error) toast("Thông tin đăng nhập không chính xác.");
  else initApp();
};

document.getElementById("btnSignUp").onclick = async () => {
  const roleVal = document.getElementById("rRole").value,
    codeVal = document.getElementById("rSecurityCode").value;
  const emailVal = document.getElementById("rEmail").value,
    passVal = document.getElementById("rPass").value,
    nameVal = document.getElementById("rName").value;
  if (roleVal !== "student" && codeVal !== "SEP2026")
    return toast("Mã xác thực nội bộ không hợp lệ.");
  if (!emailVal || !passVal || !nameVal)
    return toast("Vui lòng điền đầy đủ thông tin!");
  const btn = document.getElementById("btnSignUp");
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> ĐANG KIẾN TẠO...';
  btn.disabled = true;
  const { data, error } = await supabase.auth.signUp({
    email: emailVal,
    password: passVal,
    options: { data: { full_name: nameVal, role: roleVal } },
  });
  btn.disabled = false;
  btn.innerText = "XÁC NHẬN ĐĂNG KÝ";
  if (error) toast(error.message);
  else {
    if (data?.user)
      await supabase
        .from("profiles")
        .upsert([{ id: data.user.id, full_name: nameVal, role: roleVal }]);
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

document.querySelectorAll(".nav-btn").forEach((b) => {
  if (!b.dataset.cat) return;
  b.onclick = () => {
    document
      .querySelectorAll(".nav-btn[data-cat]")
      .forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    [
      "deviceGrid",
      "usersGrid",
      "feedbacksGrid",
      "broadcastGrid",
      "bookingsGrid",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
    if (b.dataset.cat === "users") {
      document.getElementById("usersGrid").classList.remove("hidden");
      loadAdminUsers();
    } else if (b.dataset.cat === "feedbacks") {
      document.getElementById("feedbacksGrid").classList.remove("hidden");
      loadAdminFeedbacks();
    } else if (b.dataset.cat === "broadcast") {
      document.getElementById("broadcastGrid").classList.remove("hidden");
    } else if (b.dataset.cat === "bookings") {
      document.getElementById("bookingsGrid").classList.remove("hidden");
      loadAllBookings();
    } else {
      document.getElementById("deviceGrid").classList.remove("hidden");
      filterAndDisplayByCat(b.dataset.cat);
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
  } else document.getElementById(id).classList.remove("hidden");
};

// ================= LIGHTBOX (PHÓNG TO ẢNH TOÀN CỤC) ===================
document.addEventListener("click", function (e) {
  if (e.target.tagName === "IMG") {
    // Không phóng to ảnh logo, qr code hoặc ảnh bìa của thẻ thiết bị
    if (
      e.target.classList.contains("logo") ||
      e.target.id === "qrCodeImg" ||
      e.target.classList.contains("device-card-img")
    )
      return;

    const lightbox = document.getElementById("imageLightbox");
    const lightboxImg = document.getElementById("lightboxImg");

    if (lightbox && lightboxImg) {
      lightboxImg.src = e.target.src;
      lightbox.classList.remove("hidden");
    }
  }
});

const lb = document.getElementById("imageLightbox");
if (lb) {
  lb.addEventListener("click", function (e) {
    if (e.target.id === "imageLightbox") {
      this.classList.add("hidden");
    }
  });
}

// ================= ĐIỀU KHIỂN MENU TRÊN ĐIỆN THOẠI ===================
const mobileMenuBtnEl = document.getElementById("mobileMenuBtn");
const sidebarEl = document.querySelector(".sidebar");
const contentAreaEl = document.querySelector(".content-area");

if (mobileMenuBtnEl && sidebarEl) {
  // Bấm nút để trượt Sidebar ra
  mobileMenuBtnEl.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebarEl.classList.toggle("show-mobile");
  });

  // Bấm ra vùng nội dung sẽ tự động đóng Sidebar
  contentAreaEl.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      sidebarEl.classList.remove("show-mobile");
    }
  });

  // Bấm chọn một bộ môn xong cũng tự động đóng Sidebar
  document.querySelectorAll(".nav-btn[data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        sidebarEl.classList.remove("show-mobile");
      }
    });
  });
}
