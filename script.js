if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (window.location.hash) history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
window.scrollTo({ top: 0, behavior: "auto" });

const REMOTE_API_ROOT = window.SUBZERO_API_ROOT || "https://subzero-website-api.onrender.com";
const IS_FILE_PREVIEW = window.location.protocol === "file:";
const IS_LOCAL_HOST = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
const IS_GITHUB_PAGES = window.location.hostname === "hongsewugui-cloud.github.io";
const API_ROOT = IS_FILE_PREVIEW ? "http://127.0.0.1:8765" : IS_GITHUB_PAGES ? REMOTE_API_ROOT : "";
const HAS_API = IS_FILE_PREVIEW || IS_LOCAL_HOST || IS_GITHUB_PAGES || window.location.protocol.startsWith("http");
const CONTENT_ENDPOINT = `${API_ROOT}/api/content`;
const intro = document.querySelector("#intro");
const skipIntro = document.querySelector("#skip-intro");
const replayIntro = document.querySelector("#replay-intro");
const menuPanel = document.querySelector("#menu-panel");
const menuTrigger = document.querySelector("#menu-trigger");
const menuClose = document.querySelector("#menu-close");
const backgroundMusic = document.querySelector("#background-music");
const musicToggle = document.querySelector("#music-toggle");
const menuLinks = document.querySelectorAll(".menu-links a");
const revealItems = document.querySelectorAll(".reveal");
const introAnimations = document.querySelectorAll(".launch-letter");
const reactiveGlyphs = document.querySelectorAll(".audio-word span");
const reactiveBars = document.querySelectorAll(".audio-field i");
const visualStage = document.querySelector("#visual-stage");
const waveButtons = document.querySelectorAll(".wave-button");
const interactiveControls = document.querySelectorAll(
  "button, .round-link, .wordmark, .menu-links a, .label-intro-link, .hero-button, .contact-card, .admin-button, .submit-button, .hub-tab"
);
const modal = document.querySelector("#contact-modal");
const modalOpeners = document.querySelectorAll("[data-open-modal='contact-modal']");
const modalClosers = document.querySelectorAll("[data-close-modal]");
const tabButtons = document.querySelectorAll(".hub-tab");
const tabPanels = document.querySelectorAll(".hub-panel");
const applyForm = document.querySelector("#member-apply-form");
const applyStatus = document.querySelector("#apply-status");
const releaseForm = document.querySelector("#release-submit-form");
const releaseStatus = document.querySelector("#release-status");
const focusSelect = document.querySelector("#focus-select");
const focusOtherWrap = document.querySelector("#focus-other-wrap");
const focusOtherInput = document.querySelector("#focus-other-input");
const releaseList = document.querySelector("#release-list");
const musicReleaseList = document.querySelector("#music-release-list");
const visualReleaseList = document.querySelector("#visual-release-list");
const memberList = document.querySelector("#member-list");
const eventList = document.querySelector("#event-list");
const archiveList = document.querySelector("#archive-list");
const archiveMemberList = document.querySelector("#archive-member-list");
const adminAccess = document.querySelector("#admin-access");
const adminLock = document.querySelector("#admin-lock");
const adminPanel = document.querySelector("#admin-panel");
const adminStatus = document.querySelector("#admin-status");
const releaseSubmissionList = document.querySelector("#release-submission-list");
const releaseHistoryList = document.querySelector("#release-history-list");
const releaseHistoryPagination = document.querySelector("#release-history-pagination");
const releasePrev = document.querySelector("#release-prev");
const releaseNext = document.querySelector("#release-next");
const releasePageStatus = document.querySelector("#release-page-status");
const submissionList = document.querySelector("#submission-list");
const reviewHistoryList = document.querySelector("#review-history-list");
const reviewHistoryPagination = document.querySelector("#review-history-pagination");
const reviewPrev = document.querySelector("#review-prev");
const reviewNext = document.querySelector("#review-next");
const reviewPageStatus = document.querySelector("#review-page-status");
const publishedMemberList = document.querySelector("#published-member-list");
const adminShell = document.querySelector(".admin-shell");
const motionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let introDismissTimer;
let introHideTimer;
let waveResetTimer;
let musicEnabled = false;
let adminKey = sessionStorage.getItem("subzero-admin-key") || "";
let reviewHistoryPage = 0;
const REVIEW_HISTORY_PAGE_SIZE = 4;
let releaseHistoryPage = 0;
const RELEASE_HISTORY_PAGE_SIZE = 4;

const fallbackContent = {
  releases: [
    {
      title: "地下频段 / 发布筹备",
      summary: "整理首批公开页面内容，包含音乐、视觉和项目文案。",
      meta: ["音乐", "视觉", "进行中"],
      section: "music",
    },
    {
      title: "冰层之下 / 项目推进",
      summary: "以音乐、插画、海报设计和概念设定同步构建虚拟世界。",
      meta: ["项目", "世界观", "持续更新"],
      section: "visual",
    },
  ],
  members: [
    {
      name: "SUBZERO 主理窗口",
      role: "联络 / 审核 / 发布",
      bio: "负责查看申请、沟通合作并决定哪些成员信息公开到网站。",
      contact: "微信 CH_576",
    },
  ],
  events: [
    {
      title: "线下碰头 / 预备中",
      summary: "优先从交流学习、小范围讨论和共创练习开始。",
      meta: ["社群", "线下", "筹备中"],
    },
  ],
  archives: [
    {
      title: "资料归档 / 新人友好",
      summary: "把视觉板、学习笔记、制作记录和参考链接集中整理。",
      meta: ["学习", "归档", "持续更新"],
    },
  ],
};

function dismissIntro() {
  if (intro.classList.contains("is-impact-transition") || intro.classList.contains("is-dismissed")) return;
  window.clearTimeout(introDismissTimer);
  intro.classList.add("is-impact-transition");
  document.body.classList.remove("intro-active");
  introHideTimer = window.setTimeout(() => intro.classList.add("is-dismissed"), 520);
}

function playIntro() {
  window.clearTimeout(introDismissTimer);
  window.clearTimeout(introHideTimer);
  document.body.classList.add("intro-active");
  intro.classList.remove("is-dismissed", "is-impact-transition");
  introAnimations.forEach((item) => {
    item.style.animation = "none";
    void item.offsetWidth;
    item.style.animation = "";
  });
  introDismissTimer = window.setTimeout(dismissIntro, 980);
}

introDismissTimer = window.setTimeout(dismissIntro, 980);
skipIntro.addEventListener("click", dismissIntro);
replayIntro.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.setTimeout(playIntro, 350);
});

function setMenu(open) {
  menuPanel.classList.toggle("is-open", open);
  menuPanel.setAttribute("aria-hidden", String(!open));
  menuTrigger.classList.toggle("is-menu-open", open);
  document.body.style.overflow = open ? "hidden" : "";
}

menuTrigger.addEventListener("click", () => setMenu(true));
menuClose.addEventListener("click", () => setMenu(false));
menuLinks.forEach((link) => link.addEventListener("click", () => setMenu(false)));

if (backgroundMusic && musicToggle) {
  backgroundMusic.volume = 0.34;
  musicToggle.addEventListener("click", async () => {
    if (musicEnabled) {
      backgroundMusic.pause();
      musicEnabled = false;
      musicToggle.textContent = "MUSIC OFF";
      musicToggle.setAttribute("aria-pressed", "false");
      musicToggle.classList.remove("is-playing");
      return;
    }
    try {
      await backgroundMusic.play();
      musicEnabled = true;
      musicToggle.textContent = "MUSIC ON";
      musicToggle.setAttribute("aria-pressed", "true");
      musicToggle.classList.add("is-playing");
    } catch (error) {
      musicEnabled = false;
      musicToggle.textContent = "CLICK AGAIN";
      musicToggle.setAttribute("aria-pressed", "false");
      musicToggle.classList.remove("is-playing");
      window.setTimeout(() => {
        if (!musicEnabled) musicToggle.textContent = "MUSIC OFF";
      }, 1400);
    }
  });
}

function triggerWave(kind) {
  window.clearTimeout(waveResetTimer);
  visualStage.classList.remove("wave-bass", "wave-kick", "wave-noise");
  void visualStage.offsetWidth;
  visualStage.classList.add(`wave-${kind}`);
  waveButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.wave === kind));
  waveResetTimer = window.setTimeout(() => {
    visualStage.classList.remove("wave-bass", "wave-kick", "wave-noise");
    waveButtons.forEach((button) => button.classList.remove("is-active"));
  }, 1100);
}

waveButtons.forEach((button) => {
  button.addEventListener("click", () => triggerWave(button.dataset.wave));
});

function animateControl(control) {
  if (motionReduced) return;
  control.classList.remove("is-clicked");
  void control.offsetWidth;
  control.classList.add("is-clicked");
  window.setTimeout(() => control.classList.remove("is-clicked"), 440);
}

interactiveControls.forEach((control) => {
  control.addEventListener("pointerdown", () => control.classList.add("is-pressed"));
  control.addEventListener("pointerup", () => control.classList.remove("is-pressed"));
  control.addEventListener("pointerleave", () => control.classList.remove("is-pressed"));
  control.addEventListener("click", () => animateControl(control));
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  },
  { threshold: 0.2 }
);

revealItems.forEach((item) => observer.observe(item));

function animateTypography(time) {
  const downbeat = Math.pow(Math.max(0, Math.sin(time * 0.0046)), 7);
  reactiveGlyphs.forEach((glyph, index) => {
    const wave = Math.sin(time * 0.003 + index * 1.31);
    const lift = Math.round(wave * (7 + downbeat * 19));
    const stretch = 1 + Math.max(0, wave) * 0.1 + downbeat * (index % 2 ? 0.16 : 0.08);
    glyph.style.setProperty("--lift", `${lift}px`);
    glyph.style.setProperty("--stretch", stretch.toFixed(3));
  });
  reactiveBars.forEach((bar, index) => {
    const wave = (Math.sin(time * 0.005 + index * 0.82) + 1) / 2;
    const height = Math.round(5 + wave * 18 + downbeat * (index % 3 === 0 ? 18 : 8));
    bar.style.setProperty("--bar-height", `${height}px`);
  });
  window.requestAnimationFrame(animateTypography);
}

if (!motionReduced) window.requestAnimationFrame(animateTypography);

function openModal() {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

modalOpeners.forEach((button) => button.addEventListener("click", openModal));
modalClosers.forEach((button) => button.addEventListener("click", closeModal));

function setActivePanel(panelName) {
  tabButtons.forEach((button) => {
    const active = button.dataset.panel === panelName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  tabPanels.forEach((panel) => {
    const active = panel.id === `panel-${panelName}`;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => setActivePanel(button.dataset.panel));
});

function renderCards(target, items, renderer) {
  target.innerHTML = "";
  if (!items.length) {
    target.innerHTML = "<div class='item-card'><strong>暂无内容</strong><p>这里会在整理后继续补充。</p></div>";
    return;
  }
  items.forEach((item) => target.appendChild(renderer(item)));
}

function createItemCard(item) {
  const card = document.createElement("article");
  card.className = "item-card";
  card.innerHTML = `
    <strong>${item.title}</strong>
    <p>${item.summary}</p>
    <div class="item-meta">${(item.meta || []).map((entry) => `<span>${entry}</span>`).join("")}</div>
    ${item.contact ? `<p>${item.contact}</p>` : ""}
  `;
  return card;
}

function createMemberCard(member) {
  const card = document.createElement("article");
  card.className = "member-card";
  card.innerHTML = `
    <strong>${member.name}</strong>
    <p>${member.role}</p>
    <p>${member.bio}</p>
    <div class="member-meta"><span>${member.contact}</span></div>
  `;
  return card;
}

function renderContent(content) {
  const releases = content.releases || [];
  const musicReleases = releases.filter((item) => item.section === "music");
  const visualReleases = releases.filter((item) => item.section === "visual");
  renderCards(releaseList, releases, createItemCard);
  renderCards(musicReleaseList, musicReleases, createItemCard);
  renderCards(visualReleaseList, visualReleases, createItemCard);
  renderCards(memberList, content.members || [], createMemberCard);
  renderCards(eventList, content.events || [], createItemCard);
  renderCards(archiveList, content.archives || [], createItemCard);
  renderCards(archiveMemberList, content.members || [], createMemberCard);
}

function syncFocusOther() {
  const isOther = focusSelect.value === "其他";
  focusOtherWrap.hidden = !isOther;
  focusOtherInput.required = isOther;
  if (!isOther) focusOtherInput.value = "";
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "request failed");
  }
  return response.json();
}

async function loadPublicContent() {
  try {
    const response = await fetch(CONTENT_ENDPOINT);
    if (!response.ok) throw new Error("request failed");
    const payload = await response.json();
    renderContent(payload);
  } catch (error) {
    renderContent(fallbackContent);
  }
}

applyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(applyForm);
  const payload = Object.fromEntries(formData.entries());
  payload.focus = payload.focus === "其他" ? String(payload.focus_other || "").trim() : payload.focus;
  delete payload.focus_other;
  applyStatus.textContent = "正在提交申请…";
  try {
    await fetchJson("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    applyForm.reset();
    applyStatus.textContent = "申请已提交。现在只有主理人能在管理台看见，审核通过后才会公开到网站。";
  } catch (error) {
    applyStatus.textContent = HAS_API ? "提交失败。请稍后重试，或直接联系主理人微信 CH_576。" : "提交失败。当前页面还没有连接到申请服务。";
  }
});

releaseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(releaseForm).entries());
  releaseStatus.textContent = "正在上传作品…";
  try {
    await fetchJson("/api/releases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    releaseForm.reset();
    releaseStatus.textContent = "作品已提交，正在等待管理员审核。审核通过后会自动进入音乐档案或视觉档案。";
    if (adminKey) await loadSubmissions();
  } catch (error) {
    releaseStatus.textContent = HAS_API ? "上传失败，请稍后再试。" : "上传失败。当前页面还没有连接到作品服务。";
  }
});

focusSelect.addEventListener("change", syncFocusOther);
syncFocusOther();

function createSubmissionCard(entry) {
  const card = document.createElement("article");
  card.className = "submission-card";
  const reviewedText = entry.status === "rejected"
    ? "已拒绝，不会公开到网站。"
    : entry.status === "approved"
      ? entry.published_member_id
        ? "已批准并公开。"
        : "已批准，尚未公开。"
      : "待审核。";
  card.innerHTML = `
    <strong>${entry.name}</strong>
    <p>${entry.focus}</p>
    <p>${entry.bio}</p>
    <div class="submission-meta">
      <span>${entry.contact}</span>
      <span>${entry.status}</span>
      <span>${new Date(entry.created_at).toLocaleString("zh-CN")}</span>
    </div>
    <p class="review-note">${reviewedText}</p>
  `;
  const actions = document.createElement("div");
  actions.className = "submission-actions";

  if (entry.status === "rejected") {
    const rejectedBadge = document.createElement("button");
    rejectedBadge.type = "button";
    rejectedBadge.textContent = "已拒绝";
    rejectedBadge.disabled = true;
    actions.appendChild(rejectedBadge);
    card.appendChild(actions);
    return card;
  }

  const canRepublish = !entry.published_member_id && (entry.status === "approved" || entry.status === "removed");

  const publishButton = document.createElement("button");
  publishButton.type = "button";
  publishButton.textContent = entry.published_member_id ? "已公开" : canRepublish ? "恢复公开" : "批准并公开";
  publishButton.disabled = Boolean(entry.published_member_id);
  publishButton.addEventListener("click", () => reviewSubmission(entry.id, "approved", true));

  const approveButton = document.createElement("button");
  approveButton.type = "button";
  approveButton.textContent = canRepublish ? "仅保留批准" : "仅批准";
  approveButton.addEventListener("click", () => reviewSubmission(entry.id, "approved", false));

  const rejectButton = document.createElement("button");
  rejectButton.type = "button";
  rejectButton.textContent = "拒绝";
  rejectButton.addEventListener("click", () => reviewSubmission(entry.id, "rejected", false));

  actions.append(publishButton, approveButton, rejectButton);
  card.appendChild(actions);
  return card;
}

function createPublishedMemberCard(entry) {
  const card = document.createElement("article");
  card.className = "submission-card";
  card.innerHTML = `
    <strong>${entry.name}</strong>
    <p>${entry.role}</p>
    <p>${entry.bio}</p>
    <div class="submission-meta"><span>${entry.contact}</span></div>
  `;
  const actions = document.createElement("div");
  actions.className = "submission-actions";
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "下架成员";
  removeButton.addEventListener("click", () => removePublishedMember(entry.id));
  actions.appendChild(removeButton);
  card.appendChild(actions);
  return card;
}

function createReleaseSubmissionCard(entry) {
  const card = document.createElement("article");
  card.className = "submission-card";
  const creator = entry.meta?.[0] || "未知作者";
  const category = entry.meta?.[1] || "未分类";
  const statusText = entry.status === "approved" ? "已公开到作品档案。" : entry.status === "rejected" ? "已拒绝，不会进入公开作品区。" : "待审核。";
  card.innerHTML = `
    <strong>${entry.title}</strong>
    <p>${entry.summary}</p>
    <div class="submission-meta">
      <span>${creator}</span>
      <span>${category}</span>
      <span>${entry.section === "music" ? "音乐档案" : "视觉档案"}</span>
      <span>${entry.status || "pending"}</span>
    </div>
    <p>${entry.contact}</p>
    <p class="review-note">${statusText}</p>
  `;
  const actions = document.createElement("div");
  actions.className = "submission-actions";
  if (entry.status === "approved") {
    const approvedBadge = document.createElement("button");
    approvedBadge.type = "button";
    approvedBadge.textContent = "已发布";
    approvedBadge.disabled = true;
    actions.appendChild(approvedBadge);
    card.appendChild(actions);
    return card;
  }
  if (entry.status === "rejected") {
    const rejectedBadge = document.createElement("button");
    rejectedBadge.type = "button";
    rejectedBadge.textContent = "已拒绝";
    rejectedBadge.disabled = true;
    actions.appendChild(rejectedBadge);
    card.appendChild(actions);
    return card;
  }
  const approveButton = document.createElement("button");
  approveButton.type = "button";
  approveButton.textContent = "批准发布";
  approveButton.addEventListener("click", () => reviewRelease(entry.id, "approved"));
  const rejectButton = document.createElement("button");
  rejectButton.type = "button";
  rejectButton.textContent = "拒绝";
  rejectButton.addEventListener("click", () => reviewRelease(entry.id, "rejected"));
  actions.append(approveButton, rejectButton);
  card.appendChild(actions);
  return card;
}

async function loadSubmissions() {
  if (!adminKey) return;
  adminStatus.textContent = "正在读取申请列表…";
  try {
    const payload = await fetchJson("/api/admin/submissions", {
      headers: { "X-Admin-Key": adminKey },
    });
    const pendingReleaseSubmissions = payload.release_submissions.filter((entry) => (entry.status || "pending") === "pending");
    const reviewedReleases = payload.release_submissions.filter((entry) => (entry.status || "pending") !== "pending");
    releaseSubmissionList.innerHTML = "";
    if (!pendingReleaseSubmissions.length) {
      releaseSubmissionList.innerHTML = "<div class='submission-card'><strong>暂无作品投稿</strong><p>成员提交作品后，这里会显示待审核内容。</p></div>";
    } else {
      pendingReleaseSubmissions.forEach((entry) => releaseSubmissionList.appendChild(createReleaseSubmissionCard(entry)));
    }
    releaseHistoryList.innerHTML = "";
    const releaseTotalPages = Math.max(1, Math.ceil(reviewedReleases.length / RELEASE_HISTORY_PAGE_SIZE));
    releaseHistoryPage = Math.min(releaseHistoryPage, releaseTotalPages - 1);
    const releasePageItems = reviewedReleases.slice(
      releaseHistoryPage * RELEASE_HISTORY_PAGE_SIZE,
      releaseHistoryPage * RELEASE_HISTORY_PAGE_SIZE + RELEASE_HISTORY_PAGE_SIZE
    );
    if (!reviewedReleases.length) {
      releaseHistoryList.innerHTML = "<div class='submission-card'><strong>暂无作品审核记录</strong><p>批准或拒绝后的作品记录会显示在这里。</p></div>";
      releaseHistoryPagination.hidden = true;
    } else {
      releasePageItems.forEach((entry) => releaseHistoryList.appendChild(createReleaseSubmissionCard(entry)));
      releaseHistoryPagination.hidden = false;
      releasePrev.disabled = releaseHistoryPage === 0;
      releaseNext.disabled = releaseHistoryPage >= releaseTotalPages - 1;
      releasePageStatus.textContent = `第 ${releaseHistoryPage + 1} 页 / 共 ${releaseTotalPages} 页`;
    }
    const pendingSubmissions = payload.submissions.filter((entry) => entry.status === "pending");
    const reviewHistory = payload.submissions.filter((entry) => entry.status !== "pending");
    submissionList.innerHTML = "";
    if (!pendingSubmissions.length) {
      submissionList.innerHTML = "<div class='submission-card'><strong>暂无申请</strong><p>等有人提交后，这里会显示待审核内容。</p></div>";
    } else {
      pendingSubmissions.forEach((entry) => submissionList.appendChild(createSubmissionCard(entry)));
    }
    reviewHistoryList.innerHTML = "";
    const totalPages = Math.max(1, Math.ceil(reviewHistory.length / REVIEW_HISTORY_PAGE_SIZE));
    reviewHistoryPage = Math.min(reviewHistoryPage, totalPages - 1);
    const pageItems = reviewHistory.slice(
      reviewHistoryPage * REVIEW_HISTORY_PAGE_SIZE,
      reviewHistoryPage * REVIEW_HISTORY_PAGE_SIZE + REVIEW_HISTORY_PAGE_SIZE
    );
    if (!reviewHistory.length) {
      reviewHistoryList.innerHTML = "<div class='submission-card'><strong>暂无审核记录</strong><p>批准、拒绝或下架后的记录会翻页显示在这里。</p></div>";
      reviewHistoryPagination.hidden = true;
    } else {
      pageItems.forEach((entry) => reviewHistoryList.appendChild(createSubmissionCard(entry)));
      reviewHistoryPagination.hidden = false;
      reviewPrev.disabled = reviewHistoryPage === 0;
      reviewNext.disabled = reviewHistoryPage >= totalPages - 1;
      reviewPageStatus.textContent = `第 ${reviewHistoryPage + 1} 页 / 共 ${totalPages} 页`;
    }
    publishedMemberList.innerHTML = "";
    if (!payload.published_members.length) {
      publishedMemberList.innerHTML = "<div class='submission-card'><strong>暂无公开成员</strong><p>批准并公开后，成员会显示在这里。</p></div>";
    } else {
      payload.published_members.forEach((entry) => publishedMemberList.appendChild(createPublishedMemberCard(entry)));
    }
    adminStatus.textContent = "你现在看到的是申请列表。待审核内容不会出现在公开页面。";
  } catch (error) {
    adminStatus.textContent = "管理员口令不正确，或本地服务还没有启动。";
    adminPanel.hidden = false;
  }
}

async function reviewSubmission(id, decision, publish) {
  adminStatus.textContent = decision === "rejected" ? "正在拒绝这条申请…" : publish ? "正在批准并公开…" : "正在批准申请…";
  try {
    await fetchJson("/api/admin/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({ id, decision, publish }),
    });
    await Promise.all([loadSubmissions(), loadPublicContent()]);
    adminStatus.textContent = decision === "rejected" ? "已拒绝，这条申请不会公开到网站。" : publish ? "已批准并公开，公开成员列表已更新。" : "已批准，暂未公开。";
  } catch (error) {
    adminStatus.textContent = "操作失败，请确认本地服务和管理员口令是否正确。";
  }
}

async function reviewRelease(id, decision) {
  adminStatus.textContent = decision === "rejected" ? "正在拒绝这条作品投稿…" : "正在批准并发布作品…";
  try {
    await fetchJson("/api/admin/review-release", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({ id, decision }),
    });
    await Promise.all([loadSubmissions(), loadPublicContent()]);
    adminStatus.textContent = decision === "rejected" ? "作品已拒绝，不会公开显示。" : "作品已批准，并已发布到对应档案区。";
  } catch (error) {
    adminStatus.textContent = "作品审核失败，请确认后台服务和管理员口令是否正确。";
  }
}

reviewPrev.addEventListener("click", async () => {
  if (reviewHistoryPage === 0) return;
  reviewHistoryPage -= 1;
  await loadSubmissions();
});

reviewNext.addEventListener("click", async () => {
  reviewHistoryPage += 1;
  await loadSubmissions();
});

releasePrev.addEventListener("click", async () => {
  if (releaseHistoryPage === 0) return;
  releaseHistoryPage -= 1;
  await loadSubmissions();
});

releaseNext.addEventListener("click", async () => {
  releaseHistoryPage += 1;
  await loadSubmissions();
});

async function removePublishedMember(id) {
  try {
    await fetchJson("/api/admin/remove-member", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({ id }),
    });
    await Promise.all([loadSubmissions(), loadPublicContent()]);
  } catch (error) {
    adminStatus.textContent = "移除成员失败，请确认本地服务和管理员口令是否正确。";
  }
}

adminAccess.addEventListener("click", async () => {
  const input = window.prompt("输入管理员口令后查看待审核申请。");
  if (!input) return;
  adminKey = input.trim();
  sessionStorage.setItem("subzero-admin-key", adminKey);
  adminPanel.hidden = false;
  adminLock.hidden = false;
  await loadSubmissions();
});

adminLock.addEventListener("click", () => {
  adminKey = "";
  sessionStorage.removeItem("subzero-admin-key");
  adminPanel.hidden = true;
  adminLock.hidden = true;
  adminStatus.textContent = "管理台已关闭。";
});

if (adminKey) {
  adminPanel.hidden = false;
  adminLock.hidden = false;
  loadSubmissions();
}

loadPublicContent();

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenu(false);
    closeModal();
  }
});
