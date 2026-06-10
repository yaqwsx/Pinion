import React from 'react';
import { createRoot } from 'react-dom/client';
import { PinionWidget } from './pinion-widget';

const roots = new WeakMap();

function createController() {
    let api = null;
    let pending = [];

    let invoke = (name, args) => {
        if (api) {
            return api[name](...args);
        }
        pending.push({name, args});
        return undefined;
    };

    let controller = {
        highlightGroup: (group, options = {}) => invoke("highlightGroup", [group, options]),
        setGroupVisibility: (groups, visible = true, options = {}) =>
            invoke("setGroupVisibility", [groups, visible, options]),
        clearHighlights: () => invoke("clearHighlights", []),
        setSide: side => invoke("setSide", [side])
    };

    let attach = newApi => {
        api = newApi;
        if (!api) {
            return;
        }
        let calls = pending;
        pending = [];
        calls.forEach(call => api[call.name](...call.args));
    };

    return {controller, attach};
}

export const setup = (element, config) => {
    let mount = roots.get(element);
    if (!mount) {
        mount = {
            root: createRoot(element),
            ...createController()
        };
        roots.set(element, mount);
    }
    mount.root.render(<PinionWidget {...config} onApi={mount.attach} />);
    return mount.controller;
};

export const teardown = (element) => {
    const mount = roots.get(element);
    if (mount) {
        mount.root.unmount();
        roots.delete(element);
    }
};

export const applyHash = (controller, hash = window.location.hash) => {
    if (!hash || hash === "#") {
        return;
    }

    let value = hash.replace(/^#/, "");
    let params = new URLSearchParams(value);
    let group = params.get("group");
    let side = params.get("side");

    if (!group && !side) {
        group = decodeURIComponent(value);
    }

    if (side) {
        controller.setSide(side);
    }
    if (group) {
        controller.highlightGroup(group);
    }
};

export const setupHashHandler = (controller, options = {}) => {
    let target = options.target || window;
    let apply = () => applyHash(controller, target.location.hash);
    target.addEventListener("hashchange", apply);
    apply();
    return () => target.removeEventListener("hashchange", apply);
};
