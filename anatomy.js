export const ORGANS = [
  { key: "eye", label: "눈", svgId: "organ-eye" },
  { key: "arm", label: "팔", svgId: "organ-arm" },
  { key: "kidney", label: "신장", svgId: "organ-kidney" },
  { key: "bean", label: "콩팥", svgId: "organ-bean" },
  { key: "heart", label: "심장", svgId: "organ-heart" },
  { key: "liver", label: "간", svgId: "organ-liver" }
];

export class AnatomyOverlay {
  constructor(objectEl) {
    this.objectEl = objectEl;
    this.doc = null;
    this.ready = false;
    this._wait = this._bind();
  }

  async _bind() {
    const el = this.objectEl;
    if (!el) return;
    if (el.contentDocument) {
      this.doc = el.contentDocument;
      this.ready = true;
      return;
    }
    await new Promise((resolve) => {
      el.addEventListener("load", resolve, { once: true });
    });
    this.doc = el.contentDocument;
    this.ready = true;
  }

  async whenReady() {
    await this._wait;
  }

  setTaken(organKey, taken) {
    if (!this.doc) return;
    const meta = ORGANS.find(o => o.key === organKey);
    if (!meta) return;
    const g = this.doc.getElementById(meta.svgId);
    if (!g) return;
    g.classList.toggle("taken", !!taken);
  }

  sync(stateOrgans) {
    if (!this.doc) return;
    for (const o of ORGANS) {
      this.setTaken(o.key, !stateOrgans[o.key]);
    }
  }
}
