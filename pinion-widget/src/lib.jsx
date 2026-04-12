import React from 'react';
import { createRoot } from 'react-dom/client';
import { PinionWidget } from './pinion-widget';

const roots = new WeakMap();

export const setup = (element, config) => {
    let root = roots.get(element);
    if (!root) {
        root = createRoot(element);
        roots.set(element, root);
    }
    root.render(<PinionWidget {...config} />);
};

export const teardown = (element) => {
    const root = roots.get(element);
    if (root) {
        root.unmount();
        roots.delete(element);
    }
};
