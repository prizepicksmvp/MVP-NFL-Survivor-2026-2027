(function () {
  const S = window.Survivor;
  const cfg = S.cfg;
  const els = {
    picksPanel: document.getElementById("picks-panel"),
    lockCountdown: document.getElementById("lock-countdown"),
    currentWeekStat: document.getElementById("current-week-stat"),
    remainingStat: document.getElementById("remaining-stat"),
    thresholdText: document.querySelectorAll("[data-threshold]"),
    weekHeading: document.getElementById("this-week-heading"),
  };
  init();
  async function init() {
    renderThreshold();
    renderCountdown();
    let weeksData = [];
    try {
      weeksData = await S.loadData();
    } catch (err) {
      console.error("Failed to load pick data", err);
    }
    if (!weeksData.length) {
      els.picksPanel.innerHTML = '<p class="state-msg">No pick data yet. Connect a Google Sheet in config.js, or check back once Week 1 picks are in.</p>';
      return;
    }
    const latest = S.resolveCurrentWeek(weeksData);
    renderTopStats(latest, weeksData);
    renderPicksPanel(latest);
  }
  function renderThreshold() {
    const t = cfg.TD_THRESHOLD ?? 1.5;
    els.thresholdText.forEach((el) => { el.textContent = t; });
  }
  function renderCountdown() {
    if (!cfg.NEXT_LOCK_ISO) {
      els.lockCountdown.textContent = "TBD";
      return;
    }
    const target = new Date(cfg.NEXT_LOCK_ISO).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        els.lockCountdown.textContent = "Locked";
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      els.lockCountdown.textContent = `${d}d ${h}h ${m}m`;
    };
    tick();
    setInterval(tick, 60000);
  }
  function renderTopStats(latest, weeksData) {
    els.currentWeekStat.textContent = "Week " + latest.week;

    // SHOW_REMAINING is the on/off switch in config.js. Set it to false to keep
    // the "Still Alive" stat blank without disturbing TOTAL_MVPS.
    if (cfg.SHOW_REMAINING === false) {
      els.remainingStat.textContent = "—";
    } else if (cfg.TOTAL_MVPS) {
      const eliminated = S.cumulativeEliminated(weeksData);
      const remaining = cfg.TOTAL_MVPS - eliminated;
      els.remainingStat.textContent = remaining + " of " + cfg.TOTAL_MVPS;
    } else {
      const remaining = latest.entries.filter((e) => e.result !== "Eliminated").length;
      els.remainingStat.textContent = remaining + " of " + latest.entries.length;
    }
    if (els.weekHeading) els.weekHeading.textContent = "Week " + latest.week + " pick breakdown";
  }
  function renderPicksPanel(weekObj) {
    const agg = S.aggregatePicks(weekObj.entries);
    const total = weekObj.entries.length;
    const rows = agg.map((c) => {
      const res = S.dominantResult(c);
      const tagClass = res.toLowerCase();
      return `
        <div class="pick-row">
          <div class="pick-name">${S.escapeHTML(c.qb)}</div>
          <div class="pick-status"><span class="result-tag ${tagClass}">${res}</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${c.pct.toFixed(1)}%"></div></div>
          <div class="pick-pct">${c.pct.toFixed(0)}%</div>
        </div>`;
    }).join("");
    els.picksPanel.innerHTML = `
      <div class="picks-meta">
        <span class="total"><strong>${total}</strong> entries this week</span>
      </div>
      ${rows}
      <div class="privacy-note">Aggregate view only — individual picks are never shown.</div>
    `;
  }
})();
