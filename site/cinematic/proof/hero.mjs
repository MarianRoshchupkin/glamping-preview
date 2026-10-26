export function mountHero(owner) {
  const cover = document.querySelector(".photo-cover");
  const frames = [...cover.querySelectorAll(".slide")];
  const controls = cover.querySelector(".cover-controls");
  const pause = controls.querySelector("[data-pause]");
  const heading = cover.querySelector("#cover-title");
  const editorial =
    new URL(location.href).searchParams.get("hero-type") === "h2";
  const titles = editorial
    ? [
        ["ДВОЙНОЙ", "СИЛУЭТ."],
        ["РИТМ", "ФАСАДА."],
        ["ЛИНИЯ", "КРОВЛИ."],
      ]
    : [["ЧУМ."], ["АМБА."], ["ЛИНИЯ", "КРОВЛИ."]];
  function setHeading(index) {
    heading.replaceChildren(
      ...titles[index].map((word) => {
        const line = document.createElement("span");
        line.className = "hero-title-line";
        const glyphs = document.createElement("span");
        glyphs.textContent = word;
        line.append(glyphs);
        return line;
      }),
    );
    heading.dataset.lines = String(titles[index].length);
    heading.setAttribute("aria-label", titles[index].join(" "));
  }
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  const sources = [
    "/glamping-preview/cinematic/assets/phase26-1r/client/chum-exterior-9165965406acdebe-1600.webp",
    "/glamping-preview/cinematic/assets/phase26-1r/client/amba-exterior-f39afb84347024ce-1600.webp",
    "/glamping-preview/cinematic/assets/phase26-1r/client/amba-exterior-8bf2c9c82d407ddf-1600.webp",
  ];
  let active = Number(cover.dataset.active || 0),
    timer,
    request = 0,
    explicitlyPaused = cover.dataset.userPaused === "true",
    playing =
      cover.dataset.userPaused !== "true" && !reduced.matches && scrollY <= 2;
  function sync() {
    clearTimeout(timer);
    cover.dataset.playing = String(playing);
    pause.setAttribute("aria-disabled", String(!playing));
    pause.setAttribute(
      "aria-label",
      playing
        ? "Приостановить смену кадров"
        : "Автоматическая смена кадров остановлена",
    );
    if (playing && !document.hidden && owner.alive)
      timer = setTimeout(() => show((active + 1) % 3), 6500);
  }
  function stop() {
    explicitlyPaused = true;
    cover.dataset.userPaused = "true";
    suspend();
  }
  function suspend() {
    playing = false;
    request++;
    sync();
  }
  function resume() {
    if (
      playing ||
      explicitlyPaused ||
      reduced.matches ||
      document.hidden ||
      scrollY > 2
    )
      return;
    playing = true;
    sync();
  }
  async function show(index, manual = false) {
    if (manual) stop();
    const token = ++request;
    clearTimeout(timer);
    let source = sources[index];
    if (index === 1 && matchMedia("(max-width:900px)").matches)
      source =
        "/glamping-preview/cinematic/assets/phase26-1r/client/amba-exterior-8290f0b9f8ff267b-1600.webp";
    try {
      frames[index].src = source;
      await frames[index].decode();
      if (
        !owner.alive ||
        token !== request ||
        (!manual && (!playing || document.hidden || scrollY > 2))
      )
        return;
      frames.forEach((frame, i) =>
        frame.classList.toggle("is-current", i === index),
      );
      active = index;
      setHeading(index);
      cover.dataset.active = String(index);
      controls.querySelector("[data-counter]").textContent = String(
        index + 1,
      ).padStart(2, "0");
      const status = cover.querySelector("[data-frame-description]");
      status.setAttribute("aria-live", manual ? "polite" : "off");
      status.textContent =
        index === 0
          ? "Чум · экстерьер у воды, лес и отражение"
          : "Амба · экстерьер в лесу";
    } catch {
      stop();
    }
    sync();
  }
  owner.listen(controls.querySelector("[data-next]"), "click", () =>
    show((active + 1) % 3, true),
  );
  owner.listen(controls.querySelector("[data-previous]"), "click", () =>
    show((active + 2) % 3, true),
  );
  owner.listen(pause, "click", stop);
  for (const type of ["pointerdown", "focusin"])
    owner.listen(controls, type, stop, { passive: true });
  owner.listen(
    window,
    "scroll",
    () => {
      if (scrollY > 2 && playing) suspend();
      else if (scrollY <= 2) resume();
    },
    { passive: true },
  );
  owner.listen(document, "visibilitychange", () => {
    request++;
    if (document.hidden) suspend();
    else resume();
  });
  owner.listen(reduced, "change", () => {
    if (reduced.matches) suspend();
    else resume();
  });
  owner.cleanup(() => {
    clearTimeout(timer);
    request++;
    controls.hidden = true;
  });
  setHeading(active);
  controls.hidden = false;
  sync();
  return {
    stop,
    suspend,
    resume,
    show,
    get frame() {
      return frames[active];
    },
    get active() {
      return active;
    },
    get playing() {
      return playing;
    },
  };
}
