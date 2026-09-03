(function () {
  const S = window.Survivor;
  const els = {
    ladder: document.getElementById("ladder"),
    weeksList: document.getElementById("weeks-list"),
  };
  init();
  async function init() {
    let weeksData = [];
    try {
      weeksData = await S.loadData();
    } catch (err) {
      console.error("Failed to load pick data", err);
    }
    if (!weeksData.length) {
      els.ladder.innerHTML = '<p class="state-msg">No history yet — check back once Week 1 is recorded.</p>';
      els.weeksList.innerHTML = "";
      return;
    }
    renderLadder(weeksData);
    renderWeeksList(weeksData);
  }
  function renderLadder(weeksData) {
    const cfg = S.cfg;
    let cumulativeEliminated = 0;
    const rows = weeksData.map((w) => {
      const total = w.entries.length || 1;
      const survived = w.entries.filter((e) => e.result === "Survived").length;
      const eliminated = w.entries.filter((e) => e.result === "Eliminated").length;
      const pending = total - survived - eliminated;
      const pct = (n) => (n / total) * 100;
      let countLabel;
      if (cfg.TOTAL_MVPS) {
        cumulativeEliminated += eliminated;
        const alive = cfg.TOTAL_MVPS - cumulativeEliminated;
        countLabel = `<strong>${alive}</strong> / ${cfg.TOTAL_MVPS} alive`;
      } else {
        countLabel = `<strong>${survived + pending}</strong> / ${total} alive`;
      }
      return `
        <div class="ladder-rung">
          <div class="ladder-week-label">Wk ${w.week}</div>
          <div class="ladder-track">
            <div class="ladder-segment survived" style="width:${pct(survived)}%"></div>
            <div class="ladder-segment pending" style="width:${pct(pending)}%"></div>
            <div class="ladder-segment eliminated" style="width:${pct(eliminated)}%"></div>
          </div>
          <div class="ladder-count">${countLabel}</div>
        </div>`;
    }).join("");
    els.ladder.innerHTML = rows;
  }
  function renderWeeksList(weeksData) {
    // Most recent week first, scroll down for earlier weeks.
    const ordered = [...weeksData].reverse();
    els.weeksList.innerHTML = ordered.map((w) => {
      const agg = S.aggregatePicks(w.entries);
      const total = w.entries.length;
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
      return `
        <article class="week-block" id="week-${w.week}">
          <div class="picks-meta">
            <h3>Week ${w.week}</h3>
            <span class="total"><strong>${total}</strong> entries</span>
          </div>
          <div class="picks-panel">${rows}</div>
        </article>`;
    }).join("");
  }
})();
